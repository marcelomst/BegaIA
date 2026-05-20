
import { AIMessage } from "@langchain/core/messages";
import { runAvailabilityCheck } from "@/lib/handlers/pipeline/availability";
import { buildAskGuestName } from "@/lib/handlers/pipeline/availability";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { getConvState, upsertConvState } from "@/lib/db/convState";
import { fillSlotsWithLLM, confirmAndCreate } from "@/lib/agents/reservations";
import type { FillSlotsResult } from "@/lib/agents/reservations";
import { retrievalBased } from "@/lib/agents/retrieval_based";
import { canonicalizeRoomType, type CanonicalRoomType } from "@/lib/schemas/reservation";
import { debugLog } from "@/lib/utils/debugLog";
import {
    hasCreateExecutionContext,
    isExplicitCreateCommitSignal,
} from "@/lib/agents/confirmationGovernance";
import { extractGuests, clampGuests, normalizeSlotsToStrings, sanitizePartial, normalizeSlots, extractSlotsFromText, localizeRoomType, chronoExtractDateRange, inferExpectedSlotFromHistory, buildSingleSlotQuestion, buildAggregatedQuestion, looksLikeName, normalizeNameCase, stripLocaleRequests, mentionsLocale, firstNameOf, extractDateRangeFromText, isConfirmIntentLight, isSafeGuestName } from "../helpers";
import type { RequiredSlot, SlotMap } from "@/types/audit";
import type { GraphState } from "../graphState";

const REQUIRED_SLOTS: RequiredSlot[] = [
    "guestName",
    "roomType",
    "checkIn",
    "checkOut",
    "numGuests",
];
const QUOTE_REQUIRED_SLOTS: RequiredSlot[] = [
    "roomType",
    "checkIn",
    "checkOut",
    "numGuests",
];
const FORCE_CANONICAL_QUESTION = (process.env.FORCE_CANONICAL_QUESTION || "0") === "1";
const ONE_QUESTION_PER_TURN = (process.env.ONE_QUESTION_PER_TURN || "1") === "1";

function buildReservationConfirmLine(lang2: "es" | "en" | "pt") {
    return lang2 === "es"
        ? "\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”."
        : lang2 === "pt"
            ? "\n\nConfirma a reserva respondendo “CONFIRMAR”."
            : "\n\nDo you confirm the booking? Reply “CONFIRMAR” (confirm).";
}

function shouldAppendReservationConfirm(snapshot: { guestName?: unknown }) {
    return isSafeGuestName(String(snapshot.guestName || ""));
}

function isoToEsDate(iso?: string) {
    if (!iso) return "";
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return String(iso);
    return `${m[3]}/${m[2]}/${m[1]}`;
}

function getStayNights(checkIn?: string, checkOut?: string) {
    if (!checkIn || !checkOut) return 0;
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    const diff = co.getTime() - ci.getTime();
    if (!Number.isFinite(diff) || diff <= 0) return 0;
    return Math.round(diff / (24 * 60 * 60 * 1000));
}

function isPastCheckInDate(checkIn: string, hotelTz: string) {
    const inDate = new Date(checkIn).getTime();
    const nowTz = new Date(new Date().toLocaleString("en-US", { timeZone: hotelTz }));
    const todayLocal = new Date(
        nowTz.getFullYear(),
        nowTz.getMonth(),
        nowTz.getDate()
    ).getTime();
    return inDate < todayLocal;
}

function buildPastCheckInQuestion(lang2: "es" | "en" | "pt", checkIn?: string) {
    const ci = isoToEsDate(checkIn);
    if (lang2 === "pt") {
        return `A data de check-in ${ci} já passou. Qual seria a nova data de check-in? (dd/mm/aaaa)`;
    }
    if (lang2 === "en") {
        return `The check-in date ${ci} is in the past. What would be the new check-in date? (dd/mm/yyyy)`;
    }
    return `La fecha de check-in ${ci} ya pasó. ¿Cuál sería la nueva fecha de check-in? (dd/mm/aaaa)`;
}

function hasShortStayContext(messages: unknown[]) {
    const shortStayCue =
        /\b(fin de semana|este fin de semana|finde|weekend|this weekend|una noche|two nights|dos noches|one night|overnight)\b/i;
    return messages.some((m: any) => typeof m?.content === "string" && shortStayCue.test(String(m.content)));
}

function lastAiAskedDateCoherenceConfirmation(messages: unknown[]) {
    return [...messages]
        .reverse()
        .some((m: any) => {
            const txt = String((m as any)?.content || "");
            return /cotice igualmente ese rango|quote that range anyway|cote esse período assim mesmo/i.test(txt);
        });
}

function buildDateCoherenceQuestion(
    lang2: "es" | "en" | "pt",
    snapshot: { checkIn?: string; checkOut?: string },
    reasons: string[]
) {
    const ci = isoToEsDate(snapshot.checkIn);
    const co = isoToEsDate(snapshot.checkOut);
    const reasonsEs = reasons.join(", ");
    if (lang2 === "pt") {
        return `As datas informadas ficaram ${ci} → ${co} e parecem diferentes do contexto anterior (${reasonsEs}). Quer que eu cote esse período assim mesmo? Responda “sí” para continuar ou envie novas datas.`;
    }
    if (lang2 === "en") {
        return `The dates you provided are ${ci} → ${co} and they seem different from the earlier context (${reasonsEs}). Do you want me to quote that range anyway? Reply “yes” to continue or send new dates.`;
    }
    return `Las fechas que indicaste quedaron ${ci} → ${co} y parecen distintas del contexto anterior (${reasonsEs}). ¿Querés que cotice igualmente ese rango? Respondé “sí” para continuar o enviame nuevas fechas.`;
}

function getDateCoherenceInterruption(
    lang2: "es" | "en" | "pt",
    normalizedMessage: string,
    convState: any,
    messages: unknown[],
    snapshot: { checkIn?: string; checkOut?: string }
) {
    const hasPendingCoherence = !!convState?.dateCoherencePending;
    if (isConfirmIntentLight(normalizedMessage) && (hasPendingCoherence || lastAiAskedDateCoherenceConfirmation(messages))) {
        return null;
    }
    if (!hasShortStayContext(messages)) return null;
    const nights = getStayNights(snapshot.checkIn, snapshot.checkOut);
    const ci = snapshot.checkIn ? new Date(snapshot.checkIn) : null;
    const co = snapshot.checkOut ? new Date(snapshot.checkOut) : null;
    const crossedMonth = !!(ci && co && (ci.getUTCMonth() !== co.getUTCMonth() || ci.getUTCFullYear() !== co.getUTCFullYear()));
    const reasons: string[] = [];
    if (nights > 7) reasons.push(lang2 === "pt" ? `${nights} noites` : lang2 === "en" ? `${nights} nights` : `${nights} noches`);
    if (crossedMonth) reasons.push(lang2 === "pt" ? "mudança de mês" : lang2 === "en" ? "month change" : "cambio de mes");
    if (reasons.length === 0) return null;
    return buildDateCoherenceQuestion(lang2, snapshot, reasons);
}

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
    const askGuestNameAndPersist = async (snapshot: SlotMap) => {
        await upsertConvState(hotelId, conversationId || "", {
            reservationSlots: {
                ...snapshot,
                numGuests: toInt((snapshot as any).numGuests),
            },
            salesStage: "qualify",
            updatedBy: "ai",
        });
        return {
            messages: [new AIMessage(buildAskGuestName(lang2))],
            reservationSlots: snapshot,
            category: "reservation",
            salesStage: "qualify" as const,
        };
    };
    const interruptForDateCoherenceIfNeeded = async (snapshot: SlotMap) => {
        const coherenceQuestion = getDateCoherenceInterruption(
            lang2,
            normalizedMessage,
            st,
            state.messages as any,
            snapshot
        );
        if (!coherenceQuestion) return null;
        await upsertConvState(hotelId, conversationId || "", {
            reservationSlots: {
                ...snapshot,
                numGuests: toInt((snapshot as any).numGuests),
            },
            dateCoherencePending: {
                checkIn: snapshot.checkIn!,
                checkOut: snapshot.checkOut!,
            },
            salesStage: "qualify",
            updatedBy: "ai",
        });
        return {
            messages: [new AIMessage(coherenceQuestion)],
            reservationSlots: snapshot,
            category: "reservation",
            salesStage: "qualify" as const,
        };
    };

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
    let merged: SlotMap = { ...persistedStr, ...turnStr };
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
    if (expectedSlot === "checkIn" && signals.checkIn && isPastCheckInDate(signals.checkIn, hotelTz)) {
        const cleanedSnapshot = { ...merged };
        delete (cleanedSnapshot as Record<string, unknown>).checkIn;
        await upsertConvState(hotelId, conversationId || "", {
            reservationSlots: {
                ...cleanedSnapshot,
                numGuests: toInt((cleanedSnapshot as any).numGuests),
            },
            salesStage: "qualify",
            updatedBy: "ai",
        });
        return {
            messages: [new AIMessage(buildPastCheckInQuestion(lang2, signals.checkIn))],
            reservationSlots: cleanedSnapshot,
            category: "reservation",
            salesStage: "qualify",
        };
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
            roomType: canonicalizeRoomType(merged.roomType),
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
        const missing = QUOTE_REQUIRED_SLOTS.filter((k) => !merged[k]);
        if (missing.length === 0) {
            const completeSnapshot = { ...merged, locale };
            if (!isSafeGuestName(String(completeSnapshot.guestName || ""))) {
                return askGuestNameAndPersist(completeSnapshot);
            }
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
                const confirmLine = buildReservationConfirmLine(lang2);
                return {
                    messages: [
                        new AIMessage(
                            res.finalText + ((res.needsHandoff || res.finalText.includes("CONFIRMAR") || !shouldAppendReservationConfirm(completeSnapshot)) ? "" : confirmLine)
                        ),
                    ],
                    reservationSlots: completeSnapshot,
                    category: "reservation",
                    salesStage: "quote",
                };
            } catch {
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
    if (filled && filled.need === "question" && filled.partial?.guestName && !merged.guestName) {
        merged = {
            ...merged,
            guestName: normalizeNameCase(String(filled.partial.guestName)),
        };
    }
    if (filled && filled.need === "none" && (filled.slots as any)?.guestName && !merged.guestName) {
        merged = {
            ...merged,
            guestName: normalizeNameCase(String((filled.slots as any).guestName)),
        };
    }
    // Si la reserva ya está confirmada (salesStage === 'close'), derivar cualquier consulta general al retrieval (RAG)
    if (state.salesStage === "close") {
        return await retrievalBased({ ...state, forceVectorSearch: true });
    }
    const hasCreateQuoteContext = hasCreateExecutionContext({
        salesStage,
        conversationStage: st?.conversationStage,
        lastProposal: st?.lastProposal,
        quotePromptActive: st?.salesStage === "quote",
        hasCompleteReservationSnapshot: REQUIRED_SLOTS.every((k) => !!merged[k]),
    });
    // Solo permitimos commit final con confirmación explícita, nunca con afirmativos livianos como "sí".
    if (isExplicitCreateCommitSignal(normalizedMessage) && hasCreateQuoteContext) {
        const haveAllNow = REQUIRED_SLOTS.every((k) => !!merged[k]);
        if (haveAllNow) {
            // Normalizar checkIn y checkOut a ISO datetime (YYYY-MM-DDT00:00:00Z)
            const toISODateTime = (d: string) => (d && d.length === 10 ? `${d}T00:00:00Z` : d);
            const completeSnapshot = {
                ...merged,
                roomType: canonicalizeRoomType(merged.roomType),
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
    const haveAllNow = QUOTE_REQUIRED_SLOTS.every((k) => !!merged[k]);
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
        const coherenceInterruption = await interruptForDateCoherenceIfNeeded(completeSnapshot);
        if (coherenceInterruption) return coherenceInterruption;
        if (!isSafeGuestName(String(merged.guestName || ""))) {
            return askGuestNameAndPersist({ ...merged, locale });
        }
        await upsertConvState(hotelId, conversationId || "", {
                reservationSlots: {
                    ...completeSnapshot,
                    numGuests: toInt((completeSnapshot as any).numGuests),
                },
                dateCoherencePending: null,
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
            const confirmLine = buildReservationConfirmLine(lang2);
            return {
                messages: [
                    new AIMessage(
                        res.finalText + ((res.needsHandoff || res.finalText.includes("CONFIRMAR") || !shouldAppendReservationConfirm(completeSnapshot)) ? "" : confirmLine)
                    ),
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
        if (partial.checkIn && isPastCheckInDate(String(partial.checkIn), hotelTz)) {
            const correctedSnapshot = { ...nextSnapshot };
            delete correctedSnapshot.checkIn;
            await upsertConvState(hotelId, conversationId || "", {
                reservationSlots: {
                    ...correctedSnapshot,
                    numGuests: toInt((correctedSnapshot as any).numGuests),
                },
                salesStage: "qualify",
                updatedBy: "ai",
            });
            return {
                messages: [new AIMessage(buildPastCheckInQuestion(lang2, String(partial.checkIn)))],
                reservationSlots: correctedSnapshot,
                category: "reservation",
                salesStage: "qualify",
            };
        }
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
        const missingOrder: RequiredSlot[] = QUOTE_REQUIRED_SLOTS;
        const missing = missingOrder.filter((k) => !nextSnapshot[k]);
        const rawQ = (filled.question || "").trim();
        let questionText = stripLocaleRequests(rawQ);
        if (mentionsLocale(rawQ) || questionText.length < 8) questionText = "";
        if (missing.length === 0) {
            // Todos los datos presentes: persistir y consultar disponibilidad como en el camino de slots completos
            const completeSnapshot = { ...nextSnapshot };
            const coherenceInterruption = await interruptForDateCoherenceIfNeeded(completeSnapshot);
            if (coherenceInterruption) return coherenceInterruption;
            if (!isSafeGuestName(String(completeSnapshot.guestName || ""))) {
                return askGuestNameAndPersist(completeSnapshot);
            }
            await upsertConvState(hotelId, conversationId || "", {
                reservationSlots: completeSnapshot,
                dateCoherencePending: null,
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
                const confirmLine = buildReservationConfirmLine(lang2);
                return {
                    messages: [
                        new AIMessage(
                            res.finalText + ((res.needsHandoff || res.finalText.includes("CONFIRMAR") || !shouldAppendReservationConfirm(completeSnapshot)) ? "" : confirmLine)
                        ),
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
                const single = buildSingleSlotQuestion(k, lang2);
                // En etapa de cotización priorizamos una sola pregunta canónica por slot transaccional.
                // Esto evita asks combinados pobres del LLM antes de consultar disponibilidad.
                questionText = single;
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
    if (isPastCheckInDate(completed.checkIn, hotelTz)) {
        const correctedMerged = { ...merged };
        delete (correctedMerged as Record<string, unknown>).checkIn;
        await upsertConvState(hotelId, conversationId || "", {
            reservationSlots: {
                ...correctedMerged,
                numGuests: toInt((correctedMerged as any).numGuests),
            },
            salesStage: "qualify",
            updatedBy: "ai",
        });
        return {
            messages: [new AIMessage(buildPastCheckInQuestion(lang2, completed.checkIn))],
            reservationSlots: correctedMerged,
            category: "reservation",
            salesStage: "qualify",
        };
    }
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
        roomType?: CanonicalRoomType;
        checkIn: string;
        checkOut: string;
        numGuests?: number;
        locale: string;
    } = {
        ...merged,
        guestName: completed.guestName,
        roomType: canonicalizeRoomType(completed.roomType),
        checkIn: completed.checkIn,
        checkOut: completed.checkOut,
        numGuests: toInt((completed as any).guests ?? (completed as any).numGuests),
        locale: completed.locale || locale,
    };
    const coherenceInterruption = await interruptForDateCoherenceIfNeeded(completeSnapshot as unknown as SlotMap);
    if (coherenceInterruption) return coherenceInterruption;
    if (!isSafeGuestName(String(completeSnapshot.guestName || ""))) {
        return askGuestNameAndPersist(completeSnapshot as unknown as SlotMap);
    }
    await upsertConvState(hotelId, conversationId || "", {
        reservationSlots: completeSnapshot,
        dateCoherencePending: null,
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
        const confirmLine = buildReservationConfirmLine(lang2);
        return {
            messages: [
                new AIMessage(
                    res.finalText + ((res.needsHandoff || res.finalText.includes("CONFIRMAR") || !shouldAppendReservationConfirm(completeSnapshot)) ? "" : confirmLine)
                ),
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
