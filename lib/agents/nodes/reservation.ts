// Path: /root/begasist/lib/agents/nodes/reservation.ts

// Path: /root/begasist/lib/agents/nodes/reservation.ts
import { AIMessage } from "@langchain/core/messages";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { getConvState, upsertConvState } from "@/lib/db/convState";
import { fillSlotsWithLLM, askAvailability, confirmAndCreate } from "@/lib/agents/reservations";
import { retrievalBased } from "@/lib/agents/retrieval_based";
import { debugLog } from "@/lib/utils/debugLog";
import { extractGuests, clampGuests, normalizeSlotsToStrings, sanitizePartial, normalizeSlots, extractSlotsFromText, localizeRoomType, chronoExtractDateRange, inferExpectedSlotFromHistory, buildSingleSlotQuestion, buildAggregatedQuestion, looksLikeName, normalizeNameCase, stripLocaleRequests, mentionsLocale, questionMentionsSlot, firstNameOf, extractDateRangeFromText } from "../helpers";
import type { RequiredSlot, SlotMap } from "@/types/audit";

import type { GraphState } from "@/lib/agents/graphState";
export async function handleReservationNode(state: typeof GraphState.State) {
    // --- IMPLEMENTACIÓN VERBATIM DEL NODO DE RESERVA ---
    console.log('DEBUG TEST handler entry', { state });
    debugLog('[RESERVATION] handler entry', { state });

    const { hotelId, conversationId, normalizedMessage, detectedLanguage, reservationSlots } = state;

    // Extiende el tipo de reservationSlots para incluir 'locale'
    type InputSlotsType = {
        guestName?: string;
        roomType?: string;
        checkIn?: string;
        checkOut?: string;
        numGuests?: string | number;
        locale?: string;
    };
    const inputSlots: InputSlotsType = reservationSlots || {};
    const lang = (detectedLanguage || "es").slice(0, 2) as "es" | "en" | "pt";
    // 1. Extraer slots y pregunta con LLM
    // Normalizar slots y asegurar tipos correctos
    // Normalización robusta de slots
    let normalizedSlots: {
        guestName?: string;
        roomType?: string;
        checkIn?: string;
        checkOut?: string;
        numGuests?: number;
        locale?: string;
    } = {};
    if (inputSlots) {
        // guestName
        if (typeof inputSlots.guestName === "string" && inputSlots.guestName.trim()) {
            normalizedSlots.guestName = inputSlots.guestName.trim();
        }
        // roomType
        if (typeof inputSlots.roomType === "string" && inputSlots.roomType.trim()) {
            normalizedSlots.roomType = inputSlots.roomType.trim();
        }
        // checkIn
        if (typeof inputSlots.checkIn === "string" && inputSlots.checkIn.trim()) {
            normalizedSlots.checkIn = inputSlots.checkIn.trim();
        }
        // checkOut
        if (typeof inputSlots.checkOut === "string" && inputSlots.checkOut.trim()) {
            normalizedSlots.checkOut = inputSlots.checkOut.trim();
        }
        // numGuests
        if (typeof inputSlots.numGuests === "string") {
            const n = parseInt(inputSlots.numGuests, 10);
            if (Number.isFinite(n)) normalizedSlots.numGuests = n;
        } else if (typeof inputSlots.numGuests === "number") {
            normalizedSlots.numGuests = inputSlots.numGuests;
        } else if (typeof (inputSlots as any).guests === "number") {
            normalizedSlots.numGuests = (inputSlots as any).guests;
        }
        // locale
        if (typeof inputSlots.locale === "string" && inputSlots.locale.length === 2) {
            normalizedSlots.locale = inputSlots.locale;
        } else {
            normalizedSlots.locale = lang;
        }
    } else {
        normalizedSlots.locale = lang;
    }

    debugLog('[RESERVATION] before fillSlotsWithLLM', { normalizedMessage, lang, normalizedSlots });
    const fillResult = await fillSlotsWithLLM(normalizedMessage, lang, { prevSlots: normalizedSlots as any });
    debugLog('[RESERVATION] after fillSlotsWithLLM', { fillResult });
    let messages = [];
    let nextSlots = { ...normalizedSlots };
    let salesStage: "qualify" | "quote" | "close" = "qualify";
    if (!fillResult || typeof fillResult.need === 'undefined') {
        debugLog('[RESERVATION] fillResult need undefined', { fillResult });
        messages.push(new AIMessage("Error técnico al procesar los datos de reserva. Por favor, intenta nuevamente o contacta a un recepcionista."));
        await upsertConvState(hotelId, conversationId || "", {
            reservationSlots: nextSlots,
            salesStage,
            updatedBy: "ai",
        });
        return { messages, category: "reservation" };
    }
    if (fillResult.need === "question") {
        debugLog('[RESERVATION] fillResult need question', { fillResult });
        // Pregunta por slot faltante
        let question = fillResult.question;
        // SAFEGUARD ULTRA: si la pregunta es 'undefined', vacía, null, no-string, o contiene 'undefined', reemplazar por canónica
        if (
            !question ||
            typeof question !== 'string' ||
            question.trim() === '' ||
            question === 'undefined' ||
            question === null ||
            (typeof question === 'string' && question.trim().toLowerCase() === 'undefined') ||
            (typeof question === 'string' && question.includes('undefined'))
        ) {
            question = lang === 'es'
                ? "¿Cuál es el tipo de habitación que preferís?"
                : lang === 'pt'
                    ? "Qual o tipo de quarto que você prefere?"
                    : "What room type do you prefer?";
        }
        // Solo agregar el mensaje una vez, tras aplicar todos los safeguards
        messages.push(new AIMessage(String(question)));
        // Refuerzo final: limpiar cualquier mensaje 'undefined' en el array antes de devolver
        messages = messages.map(m => {
            if (typeof m.content === 'string' && (m.content.trim().toLowerCase() === 'undefined' || m.content.includes('undefined'))) {
                return new AIMessage(lang === 'es'
                    ? "¿Cuál es el tipo de habitación que preferís?"
                    : lang === 'pt'
                        ? "Qual o tipo de quarto que você prefere?"
                        : "What room type do you prefer?");
            }
            return m;
        });
        // Normalizar numGuests si viene como string
        const partial = { ...fillResult.partial };
        if (typeof partial.numGuests === "string") {
            const n = parseInt(partial.numGuests, 10);
            partial.numGuests = Number.isFinite(n) ? n : undefined;
        }
        // Asegurar que locale esté presente en el parcial
        if (!partial.locale) {
            partial.locale = lang;
        }
        // Evitar sobrescribir numGuests si ya existe y el parcial no lo trae
        if (typeof nextSlots.numGuests !== "undefined" && typeof partial.numGuests === "undefined") {
            partial.numGuests = nextSlots.numGuests;
        }
        nextSlots = { ...nextSlots, ...partial };
        nextSlots = normalizeSlots(nextSlots);
        salesStage = "qualify";
        debugLog('[RESERVATION] upsert after question', { nextSlots, salesStage });
        await upsertConvState(hotelId, conversationId || "", {
            reservationSlots: nextSlots,
            salesStage,
            updatedBy: "ai",
        });
        return { messages, category: "reservation" };
    }
    // 2. Consultar disponibilidad si slots completos
    let normalizedFullSlots = fillResult.slots;
    // Asegurar que locale esté presente
    if (!normalizedFullSlots.locale) {
        normalizedFullSlots.locale = lang;
    }
    normalizedFullSlots = normalizeSlots(normalizedFullSlots);
    // Forzar los campos requeridos para el tipo esperado por askAvailability
    const requiredSlots = {
        guestName: normalizedFullSlots.guestName || "",
        roomType: normalizedFullSlots.roomType || "",
        checkIn: normalizedFullSlots.checkIn || "",
        checkOut: normalizedFullSlots.checkOut || "",
        locale: normalizedFullSlots.locale || lang,
        numGuests: typeof normalizedFullSlots.numGuests === "number" ? normalizedFullSlots.numGuests : undefined,
    };
    debugLog('[RESERVATION] before askAvailability', { requiredSlots });
    const avail = await askAvailability(hotelId, requiredSlots);
    debugLog('[RESERVATION] after askAvailability', { avail });
    if (!avail.ok) {
        debugLog('[RESERVATION] availability not ok', { avail });
        messages.push(new AIMessage(String(avail.message ?? ""))); // SAFEGUARD
        await upsertConvState(hotelId, conversationId || "", {
            reservationSlots: normalizedFullSlots,
            salesStage,
            updatedBy: "ai",
        });
        return { messages, category: "reservation" };
    }
    // 3. Propuesta de reserva con CTA y señales
    let signalsText = "";
    const signals = state.meta?.signals;
    if (signals && typeof signals === "object" && Object.keys(signals).length > 0) {
        signalsText = `\n\nSeñales detectadas (no confirmadas): ${JSON.stringify(signals)}`;
    }
    const cta = lang === "es"
        ? "\n\nPara confirmar, respondé **CONFIRMAR**."
        : lang === "pt"
            ? "\n\nPara confirmar, responda **CONFIRMAR**."
            : "\n\nTo confirm, reply **CONFIRMAR**.";
    debugLog('[RESERVATION] proposal and persist', { proposal: avail.proposal, salesStage, normalizedFullSlots });
    messages.push(new AIMessage(String(`${avail.proposal}${signalsText}${cta}`))); // SAFEGUARD
    salesStage = avail.available ? "quote" : "qualify";
    // Persistencia robusta: incluir toolCall si existe en avail
    const persistObj: any = {
        reservationSlots: {
            ...normalizedFullSlots,
            // Normalizar numGuests como número
            numGuests: typeof normalizedFullSlots.numGuests === 'string' ? parseInt(normalizedFullSlots.numGuests, 10) : normalizedFullSlots.numGuests,
            locale: typeof normalizedFullSlots.locale === 'string' ? normalizedFullSlots.locale : lang,
        },
        lastProposal: {
            text: avail.proposal,
            available: avail.available,
            options: avail.options,
            toolCall: {
                name: 'checkAvailability',
                input: {
                    hotelId,
                    roomType: normalizedFullSlots.roomType,
                    numGuests: Number.isFinite(Number(normalizedFullSlots.numGuests)) ? Number(normalizedFullSlots.numGuests) : 1,
                    checkIn: normalizedFullSlots.checkIn,
                    checkOut: normalizedFullSlots.checkOut,
                },
                outputSummary: `available:${String(avail.available)}`,
            },
        },
        salesStage,
        updatedBy: "ai",
    };
    await upsertConvState(hotelId, conversationId || "", persistObj);
    debugLog('[RESERVATION] end handler', { messages });
    // 4. Si el usuario confirma, crear la reserva
    // (Este paso se maneja en otro nodo, aquí solo se propone)
    return { messages, category: "reservation" };
}
