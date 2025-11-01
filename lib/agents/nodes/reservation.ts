
import { AIMessage } from "@langchain/core/messages";
import { runAvailabilityCheck } from "@/lib/handlers/pipeline/availability";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { getConvState, upsertConvState } from "@/lib/db/convState";
import { fillSlotsWithLLM, confirmAndCreate } from "@/lib/agents/reservations";
import type { FillSlotsResult } from "@/lib/agents/reservations";
import { retrievalBased } from "@/lib/agents/retrieval_based";
import { debugLog } from "@/lib/utils/debugLog";
import { extractGuests, clampGuests, normalizeSlotsToStrings, sanitizePartial, normalizeSlots, extractSlotsFromText, localizeRoomType, chronoExtractDateRange, inferExpectedSlotFromHistory, buildSingleSlotQuestion, buildAggregatedQuestion, looksLikeName, normalizeNameCase, stripLocaleRequests, mentionsLocale, questionMentionsSlot, firstNameOf, extractDateRangeFromText, isConfirmIntentLight } from "../helpers";
import type { RequiredSlot, SlotMap } from "@/types/audit";
import type { GraphState } from "../graphState";

const REQUIRED_SLOTS: RequiredSlot[] = [
    "guestName",
    "roomType",
    "checkIn",
    "checkOut",
    "numGuests",
];
const FORCE_CANONICAL_QUESTION = (process.env.FORCE_CANONICAL_QUESTION || "0") === "1";
const ONE_QUESTION_PER_TURN = (process.env.ONE_QUESTION_PER_TURN || "1") === "1";

export async function handleReservationNode(state: typeof GraphState.State) {
    debugLog('[Graph] Enter handleReservationNode', { state });
    const {
        detectedLanguage,
        reservationSlots,
        normalizedMessage,
        hotelId,
        conversationId,
        salesStage,
    } = state;
    type ChannelType = "web" | "email" | "whatsapp" | "channelManager";
    const metaChannel = (state.meta as Record<string, unknown> | undefined)?.channel;
    const channel: ChannelType =
        metaChannel === "email" || metaChannel === "whatsapp" || metaChannel === "channelManager"
            ? metaChannel
            : "web";
    const cfg = await getHotelConfig(hotelId).catch((err) => {
        console.error("[graph] Error en getHotelConfig:", err);
        return null;
    });
    const hotelTz =
        cfg?.timezone ||
        (await getHotelConfig(hotelId).catch((err) => {
            console.error("[graph] Error en getHotelConfig (timezone):", err);
            return null;
        }))?.timezone || "UTC";
    // Nota: Config forceCanonicalQuestion existe, pero usamos la constante FORCE_CANONICAL_QUESTION en este flujo.
    const lang2 = (detectedLanguage || "es").slice(0, 2) as "es" | "en" | "pt";
    const locale = lang2;

    // Normalizador: fuerza número válido o undefined (evita NaN)
    const toInt = (v: unknown) => {
        if (v === undefined || v === null || v === "") return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
    };
    // 🚫 Si la reserva ya está cerrada, solo permitir volver si el usuario pide modificar/cancelar
    if (salesStage === "close") {
        const t = (normalizedMessage || "").toLowerCase();
        const da = state.desiredAction;
        if (
            da === "modify" ||
            /\b(modificar|cambiar|cancelar|anular|cancela|cambio|modifico|modification|change|cancel)\b/.test(t)
        ) {
            const lang = (detectedLanguage || "es").slice(0, 2);
            const msg =
                lang === "es"
                    ? "¿Qué dato de la reserva deseas modificar? (fechas, nombre, habitación, huéspedes, etc.)"
                    : lang === "pt"
                        ? "Qual informação da reserva você deseja alterar? (datas, nome, quarto, hóspedes, etc.)"
                        : "What detail of the booking would you like to modify? (dates, name, room, guests, etc.)";
            const result = {
                messages: [new AIMessage(msg)],
                reservationSlots,
                category: "reservation",
                salesStage: "qualify",
                desiredAction: "modify",
            };
            debugLog('[Graph] Exit handleReservationNode (modify/cancel)', { result });
            return result;
        }
        // Si no pide modificar/cancelar, derivar a retrieval directamente
        const result = await retrievalBased({ ...state, forceVectorSearch: true });
        debugLog('[Graph] Exit handleReservationNode (retrievalBased)', { result });
        return result;
    }
    // Snapshot persistido  turn
    const st = await getConvState(hotelId, conversationId || "");
    const persistedStr = normalizeSlotsToStrings(normalizeSlots(st?.reservationSlots || {}));
    const turnStr = normalizeSlotsToStrings(normalizeSlots(reservationSlots || {}));
    // Forzar uso de LLM para slot-filling, sin heurística local
    const merged: SlotMap = { ...persistedStr, ...turnStr };
    // Congelar heurística local: no asignar guestName, numGuests, ni fechas aquí
    // Siempre delegar a fillSlotsWithLLM
    // ===== MCP fill-slots (forzado) =====
    // Capa 1: señales determinísticas (no se persisten; solo ayudan al LLM)
    const signals = extractSlotsFromText(normalizedMessage, lang2) as Partial<SlotMap>;
    // Enriquecer señales con Chrono si está habilitado (fechas relativas tipo “próximo viernes”)
    let chronoHint: { checkIn?: string; checkOut?: string } = {};
    try {
        chronoHint = await chronoExtractDateRange(normalizedMessage, lang2, hotelTz);
        if (chronoHint.checkIn && !signals.checkIn) signals.checkIn = chronoHint.checkIn;
        if (chronoHint.checkOut && !signals.checkOut) signals.checkOut = chronoHint.checkOut;
    } catch {
        // ignore chrono errors
    }
    // Si el último turno del asistente preguntó específicamente por un slot,
    // reinterpreta señales de fecha suelta para ese slot (evita loops "¿check-out?" tras dar 04/10/2025)
    const expectedSlot = inferExpectedSlotFromHistory(state.messages, lang2);
    if (expectedSlot === "checkOut" && !signals.checkOut) {
        // 1) Si Chrono devolvió solo checkIn para una fecha suelta, úsala como checkOut
        if (chronoHint.checkIn && !chronoHint.checkOut) {
            signals.checkOut = chronoHint.checkIn;
            // Evitar ruido: no inyectar también como checkIn
            if (signals.checkIn === chronoHint.checkIn) delete (signals as Record<string, unknown>).checkIn;
        } else if (signals.checkIn && !signals.checkOut) {
            // 2) Si la heurística básica metió la fecha en checkIn, muévela a checkOut
            signals.checkOut = signals.checkIn;
            delete (signals as Record<string, unknown>).checkIn;
        } else {
            // 3) Parseo simple de una fecha suelta
            const simpleRange = extractDateRangeFromText(normalizedMessage);
            if (simpleRange.checkIn && !simpleRange.checkOut) {
                signals.checkOut = simpleRange.checkIn;
            }
        }
    }
    // Si se preguntó por huéspedes y el usuario respondió con un número suelto, inyectarlo como señal de numGuests
    if (expectedSlot === "numGuests" && !signals.numGuests) {
        const g = extractGuests(normalizedMessage);
        if (g) {
            const n = parseInt(g, 10);
            const cl = clampGuests(n, (reservationSlots || {}).roomType);
            if (typeof cl === "number") signals.numGuests = `${cl}`;
        }
    }
    const FF_FALLBACK = (process.env.SLOT_FALLBACK_HEURISTICS || "0") === "1";
    if (FF_FALLBACK && looksLikeName(normalizedMessage) && !signals.guestName) {
        // Sólo si el mensaje entero parece un nombre, agregamos como señal
        signals.guestName = normalizeNameCase(normalizedMessage);
    }
    const signalsStr = Object.keys(signals).length
        ? `\n\nSeñales detectadas (no confirmadas): ${JSON.stringify(signals)}`
        : "";
    const augmentedUserText =
        normalizedMessage +
        (Object.keys(merged).length ? `\n\nDatos previos conocidos: ${JSON.stringify(merged)}` : "") +
        signalsStr +
        `\n\nNota: Locale conocido: ${locale}. No lo pidas; usá este valor si fuera necesario.`;

    let filled: FillSlotsResult | { need: "error"; message?: string };
    try {
        const prevSlotsForLLM = {
            guestName: merged.guestName,
            roomType: merged.roomType,
            checkIn: merged.checkIn,
            checkOut: merged.checkOut,
            numGuests: merged.numGuests ? parseInt(`${merged.numGuests}`, 10) : undefined,
            locale,
        } as const;
        filled = await fillSlotsWithLLM(augmentedUserText, locale, {
            hotelTz,
            prevSlots: prevSlotsForLLM,
        });
    } catch {
        console.timeLog("fillSlotsWithLLM");
        const missing = REQUIRED_SLOTS.filter((k) => !merged[k]);
        const q = ONE_QUESTION_PER_TURN && missing.length
            ? buildSingleSlotQuestion(missing[0], lang2)
            : buildAggregatedQuestion(missing, lang2);
        await upsertConvState(hotelId, conversationId || "", {
            reservationSlots: {
                ...merged,
                numGuests: toInt((merged as any).numGuests),
            },
            salesStage: "qualify",
            updatedBy: "ai",
        });
        return {
            messages: [new AIMessage(q)],
            reservationSlots: merged,
            category: "reservation",
            salesStage: "qualify",
        };
    }
    // Si la reserva ya está confirmada (salesStage === 'close'), derivar cualquier consulta general al retrieval (RAG)
    if (state.salesStage === "close") {
        return await retrievalBased({ ...state, forceVectorSearch: true });
    }
    // --- NUEVO: Si el usuario confirma y ya están todos los datos, crear la reserva aunque el salesStage no sea 'quote' ---
    if (isConfirmIntentLight(normalizedMessage)) {
        const haveAllNow = REQUIRED_SLOTS.every((k) => !!merged[k]);
        if (haveAllNow) {
            // Normalizar checkIn y checkOut a ISO datetime (YYYY-MM-DDT00:00:00Z)
            const toISODateTime = (d: string) => (d && d.length === 10 ? `${d}T00:00:00Z` : d);
            const completeSnapshot = {
                ...merged,
                checkIn: toISODateTime(merged.checkIn!),
                checkOut: toISODateTime(merged.checkOut!),
                locale,
            };
            await upsertConvState(hotelId, conversationId || "", {
                reservationSlots: {
                    ...completeSnapshot,
                    numGuests: toInt((completeSnapshot as any).numGuests),
                },
                updatedBy: "ai",
            });
            // Llamar a confirmAndCreate
            const result = await confirmAndCreate(
                hotelId,
                {
                    guestName: completeSnapshot.guestName!,
                    roomType: completeSnapshot.roomType!,
                    // El schema exige number → normalizamos a number
                    numGuests: toInt((completeSnapshot as any).numGuests) ?? 1,
                    checkIn: completeSnapshot.checkIn!,
                    checkOut: completeSnapshot.checkOut!,
                    locale,
                },
                channel
            );
            // Persistir lastReservation cuando result.ok
            if (result.ok) {
                await upsertConvState(hotelId, conversationId || "", {
                    lastReservation: {
                        reservationId: result.reservationId || "",
                        status: "created",
                        createdAt: new Date().toISOString(),
                        channel: typeof channel === "string" ? channel : "web",
                    },
                    salesStage: "close",
                    updatedBy: "ai",
                });
            }
            const showRt = localizeRoomType(completeSnapshot.roomType, lang2);
            const guestFirst = firstNameOf(completeSnapshot.guestName);
            const msg = result.ok
                ? lang2 === "es"
                    ? `✅ ¡Reserva confirmada! Código **${result.reservationId ?? "pendiente"}**.\nHabitación **${showRt}**, Fechas **${completeSnapshot.checkIn} → ${completeSnapshot.checkOut}**${completeSnapshot.numGuests ? ` · **${completeSnapshot.numGuests}** huésped(es)` : ""}. ¡Gracias, ${guestFirst || completeSnapshot.guestName}!`
                    : lang2 === "pt"
                        ? `✅ Reserva confirmada! Código **${result.reservationId ?? "pendente"}**.\nQuarto **${showRt}**, Datas **${completeSnapshot.checkIn} → ${completeSnapshot.checkOut}**${completeSnapshot.numGuests ? ` · **${completeSnapshot.numGuests}** hóspede(s)` : ""}. Obrigado, ${guestFirst || completeSnapshot.guestName}!`
                        : `✅ Booking confirmed! Code **${result.reservationId ?? "pending"}**.\nRoom **${showRt}**, Dates **${completeSnapshot.checkIn} → ${completeSnapshot.checkOut}**${completeSnapshot.numGuests ? ` · **${completeSnapshot.numGuests}** guest(s)` : ""}. Thank you, ${guestFirst || completeSnapshot.guestName}!`
                : result.message;
            return {
                messages: [new AIMessage(msg)],
                reservationSlots: {},
                category: "reservation",
                salesStage: "close",
            };
        }
        // Si no hay todos los datos, seguir el flujo normal (repreguntar)
    }
    // Si ya está todo, saltamos disponibilidad
    const haveAllNow = REQUIRED_SLOTS.every((k) => !!merged[k]);
    if (haveAllNow) {
        const ci = new Date(merged.checkIn!);
        const co = new Date(merged.checkOut!);
        if (
            !(ci instanceof Date && !isNaN(ci.valueOf())) ||
            !(co instanceof Date && !isNaN(co.valueOf())) ||
            ci >= co
        ) {
            const text =
                lang2 === "es"
                    ? "Las fechas parecen inválidas. ¿Podés confirmar check-in (dd/mm/aaaa) y check-out (dd/mm/aaaa)?"
                    : lang2 === "pt"
                        ? "As datas parecem inválidas. Pode confirmar check-in (dd/mm/aaaa) e check-out (dd/mm/aaaa)?"
                        : "Dates look invalid. Could you confirm check-in (dd/mm/yyyy) and check-out (dd/mm/yyyy)?";
            return {
                messages: [new AIMessage(text)],
                reservationSlots: { ...merged },
                category: "reservation",
                salesStage: "qualify",
            };
        }
        const completeSnapshot = { ...merged, locale };
        await upsertConvState(hotelId, conversationId || "", {
            reservationSlots: {
                ...completeSnapshot,
                numGuests: toInt((completeSnapshot as any).numGuests),
            },
            updatedBy: "ai",
        });
        console.log("[DEBUG] Complete snapshot:", completeSnapshot);
        try {
            const res = await runAvailabilityCheck(
                {
                    lang: lang2,
                    lcHistory: state.messages as any,
                    st: await getConvState(hotelId, conversationId || ""),
                    msg: { hotelId },
                    conversationId: conversationId || "",
                } as any,
                completeSnapshot as any,
                completeSnapshot.checkIn!,
                completeSnapshot.checkOut!
            );
            const confirmLine =
                lang2 === "es"
                    ? "\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”."
                    : lang2 === "pt"
                        ? "\n\nConfirma a reserva respondendo “CONFIRMAR”."
                        : "\n\nDo you confirm the booking? Reply “CONFIRMAR” (confirm).";
            return {
                messages: [
                    new AIMessage(res.finalText + (res.finalText.includes("CONFIRMAR") ? "" : confirmLine)),
                ],
                reservationSlots: completeSnapshot,
                category: "reservation",
                salesStage: "quote",
            };
        } catch (err) {
            console.error("[graph] runAvailabilityCheck error", err);
            return {
                messages: [
                    new AIMessage(
                        lang2 === "es"
                            ? "Tuve un problema al consultar la disponibilidad. ¿Podés intentar nuevamente?"
                            : lang2 === "pt"
                                ? "Tive um problema ao verificar a disponibilidade. Pode tentar novamente?"
                                : "I had an issue checking availability. Could you try again?"
                    ),
                ],
                reservationSlots: completeSnapshot,
                category: "reservation",
                salesStage: "followup",
            };
        }
    }
    // (removido: duplicado por forzar LLM arriba)
    // Nota: fillSlotsWithLLM no retorna "error"; errores se manejan por catch arriba o por disponibilidad más abajo.
    if (filled.need === "question") {
        const partialRaw = filled.partial ?? {};
        const partial = sanitizePartial(normalizeSlots(partialRaw), merged, normalizedMessage);
        const nextSnapshot: Record<string, any> = {
            ...merged,
            ...(partial.guestName ? { guestName: partial.guestName } : {}),
            ...(partial.roomType ? { roomType: partial.roomType } : {}),
            ...(partial.numGuests ? { numGuests: toInt((partial as any).numGuests) } : {}),
            ...(partial.checkIn ? { checkIn: partial.checkIn } : {}),
            ...(partial.checkOut ? { checkOut: partial.checkOut } : {}),
            locale,
        };
        // Si el bot acaba de preguntar huéspedes y el usuario mandó solo "2", inferir y fijar numGuests aquí
        if (!nextSnapshot.numGuests && expectedSlot === "numGuests") {
            const g = extractGuests(normalizedMessage);
            if (g) {
                const n = parseInt(g, 10);
                const cl = clampGuests(n, nextSnapshot.roomType);
                if (typeof cl === "number") {
                    nextSnapshot.numGuests = `${cl}`;
                }
                if (typeof cl === "number") nextSnapshot.numGuests = cl;
            }
        }
        const missingOrder: RequiredSlot[] = [
            "guestName",
            "roomType",
            "checkIn",
            "checkOut",
            "numGuests",
        ];
        const missing = missingOrder.filter((k) => !nextSnapshot[k]);
        const rawQ = (filled.question || "").trim();
        let questionText = stripLocaleRequests(rawQ);
        if (mentionsLocale(rawQ) || questionText.length < 8) questionText = "";
        if (missing.length === 0) {
            // Todos los datos presentes: persistir y consultar disponibilidad como en el camino de slots completos
            const completeSnapshot = { ...nextSnapshot };
            await upsertConvState(hotelId, conversationId || "", {
                reservationSlots: completeSnapshot,
                updatedBy: "ai",
            });
            try {
                const res = await runAvailabilityCheck(
                    {
                        lang: lang2,
                        lcHistory: state.messages as any,
                        st: await getConvState(hotelId, conversationId || ""),
                        msg: { hotelId },
                        conversationId: conversationId || "",
                    } as any,
                    completeSnapshot as any,
                    completeSnapshot.checkIn!,
                    completeSnapshot.checkOut!
                );
                const confirmLine =
                    lang2 === "es"
                        ? "\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”."
                        : lang2 === "pt"
                            ? "\n\nConfirma a reserva respondendo “CONFIRMAR”."
                            : "\n\nDo you confirm the booking? Reply “CONFIRMAR” (confirm).";
                return {
                    messages: [
                        new AIMessage(res.finalText + (res.finalText.includes("CONFIRMAR") ? "" : confirmLine)),
                    ],
                    reservationSlots: completeSnapshot,
                    category: "reservation",
                    salesStage: "quote",
                };
            } catch (err) {
                return {
                    messages: [
                        new AIMessage(
                            lang2 === "es"
                                ? "Perdón, tuve un problema al consultar la disponibilidad. ¿Podés intentar nuevamente?"
                                : lang2 === "pt"
                                    ? "Desculpe, tive um problema ao verificar a disponibilidade. Pode tentar novamente?"
                                    : "Sorry, I had a problem checking availability. Could you try again?"
                        ),
                    ],
                    reservationSlots: completeSnapshot,
                    category: "reservation",
                    salesStage: "followup",
                };
            }
        } else {
            const k = missing[0];
            if (ONE_QUESTION_PER_TURN) {
                // Preferir la pregunta del LLM solo si apunta al slot esperado; si no, usar la canónica
                const single = buildSingleSlotQuestion(k, lang2);
                if (FORCE_CANONICAL_QUESTION || !questionMentionsSlot(rawQ, k, lang2)) {
                    questionText = single;
                } else if (!questionText) {
                    questionText = single;
                }
            } else if (missing.length === 1) {
                const single = buildSingleSlotQuestion(k, lang2);
                if (FORCE_CANONICAL_QUESTION || !questionText) questionText = single;
            } else {
                questionText = buildAggregatedQuestion(missing, lang2);
            }
        }
        await upsertConvState(hotelId, conversationId || "", {
            reservationSlots: {
                ...nextSnapshot,
                numGuests: toInt((nextSnapshot as any).numGuests),
            },
            salesStage: missing.length ? "qualify" : "quote",
            updatedBy: "ai",
        });
        return {
            messages: [new AIMessage(questionText)],
            reservationSlots: nextSnapshot,
            category: "reservation",
            salesStage: missing.length ? "qualify" : "quote",
        };
    }
    // LLM devolvió slots completos
    const completed = filled.slots;
    const ci = new Date(completed.checkIn);
    const co = new Date(completed.checkOut);
    if (
        !(ci instanceof Date && !isNaN(ci.valueOf())) ||
        !(co instanceof Date && !isNaN(co.valueOf())) ||
        ci >= co
    ) {
        const text =
            lang2 === "es"
                ? "Las fechas parecen inválidas. ¿Podés confirmar check-in (dd/mm/aaaa) y check-out (dd/mm/aaaa)?"
                : lang2 === "pt"
                    ? "As datas parecem inválidas. Pode confirmar check-in (dd/mm/aaaa) e check-out (dd/mm/aaaa)?"
                    : "Dates look invalid. Could you confirm check-in (dd/mm/yyyy) and check-out (dd/mm/yyyy)?";
        return {
            messages: [new AIMessage(text)],
            reservationSlots: { ...merged },
            category: "reservation",
            salesStage: "qualify",
        };
    }
    const completeSnapshot: {
        guestName: string;
        roomType: string;
        checkIn: string;
        checkOut: string;
        numGuests?: number;
        locale: string;
    } = {
        ...merged,
        guestName: completed.guestName,
        roomType: completed.roomType,
        checkIn: completed.checkIn,
        checkOut: completed.checkOut,
        numGuests: toInt((completed as any).guests ?? (completed as any).numGuests),
        locale: completed.locale || locale,
    };
    await upsertConvState(hotelId, conversationId || "", {
        reservationSlots: completeSnapshot,
        updatedBy: "ai",
    });
    try {
        const res = await runAvailabilityCheck(
            {
                lang: lang2,
                lcHistory: state.messages as any,
                st: await getConvState(hotelId, conversationId || ""),
                msg: { hotelId },
                conversationId: conversationId || "",
            } as any,
            completeSnapshot as any,
            completeSnapshot.checkIn!,
            completeSnapshot.checkOut!
        );
        const confirmLine =
            lang2 === "es"
                ? "\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”."
                : lang2 === "pt"
                    ? "\n\nConfirma a reserva respondendo “CONFIRMAR”."
                    : "\n\nDo you confirm the booking? Reply “CONFIRMAR” (confirm).";
        return {
            messages: [
                new AIMessage(res.finalText + (res.finalText.includes("CONFIRMAR") ? "" : confirmLine)),
            ],
            reservationSlots: completeSnapshot,
            category: "reservation",
            salesStage: "quote",
        };
    } catch (err) {
        return {
            messages: [
                new AIMessage(
                    lang2 === "es"
                        ? "Perdón, tuve un problema al consultar la disponibilidad. ¿Podés intentar nuevamente?"
                        : lang2 === "pt"
                            ? "Desculpe, tive um problema ao verificar a disponibilidade. Pode tentar novamente?"
                            : "Sorry, I had a problem checking availability. Could you try again?"
                ),
            ],
            reservationSlots: completeSnapshot,
            category: "reservation",
            salesStage: "followup",
        };
    }
}
