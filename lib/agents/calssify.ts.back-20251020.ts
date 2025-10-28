// Path: /root/begasist/lib/agents/classify.ts
import { GraphState } from "@/lib/agents/index.ts";
import { AIMessage, HumanMessage, BaseMessage } from "@langchain/core/messages";
import { getHotelNativeLanguage } from "@/lib/config/hotelLanguage";
import { debugLog } from "../utils/debugLog";
import { translateIfNeeded } from "@/lib/i18n/translateIfNeeded";
import { classifyQuery } from "../classifier";
import { promptMetadata } from "@/lib/prompts";

/* -------- Heurísticas útiles -------- */
function reservationSlotsIncomplete(s?: typeof GraphState.State["reservationSlots"]) {
    if (!s) return true;
    return !(s.guestName && s.roomType && s.checkIn && s.checkOut);
}

const GREETING_RE = /^(hola|buenas( tardes| noches)?|buenos dias|buenos días|hello|hi|hey|olá|ola|oi|qué tal|que tal|como va|cómo va)\b/i;

const RESERVATION_INTENT = new RegExp(
    String.raw`\b(?:reserv(ar|a|as|e|o)?|reserva|booking|book|quiero\s+reservar|deseo\s+reservar|hacer\s+una\s+reserva|quero\s+reservar|gostaria\s+de\s+reservar|fazer\s+uma?\s+reserva|preciso\s+de\s+uma?\s+reserva|gostaria\s+de\s+fazer\s+uma?\s+reserva|gostaria\s+de\s+uma?\s+reserva|preciso\s+reservar|I\s+want\s+to\s+book|I\s+would\s+like\s+to\s+book|I\s+need\s+a\s+reservation|I\s+want\s+a\s+reservation|I\s+would\s+like\s+a\s+reservation|make\s+a\s+reservation|need\s+to\s+book|need\s+a\s+reservation)\b`,
    'i'
);

const DATE_ISO = /\b\d{4}-\d{2}-\d{2}\b/;
const ROOM_RE = /suite|matrimonial|doble|triple|individual|single|double|twin|queen|king|deluxe|standard|hab(itación)?/i;

// ¿El último(s) mensaje(s) del asistente pidió datos de RESERVA?
function recentAssistantAskedReservation(messages: BaseMessage[], lookback = 3) {
    const tail = messages.slice(-lookback).reverse();
    const HIT = /(reserva|reservation|book)/i;
    for (const m of tail) {
        if (m instanceof AIMessage) {
            const txt = typeof m.content === "string" ? m.content : "";
            if (HIT.test(txt)) return true;
        }
    }
    return false;
}

// ¿Parece un nombre personal (y no incluye palabras obvias de intención)?
function looksLikeName(s: string) {
    const t = (s || "").trim();
    const tl = t.toLowerCase();
    if (/[?¿]/.test(tl)) return false;
    if (/(check\s*-?\s*in|check\s*-?\s*out|reserva|reservar|hora|precio|tarifa)/.test(tl)) return false;
    if (/^(hola|buenas|hello|hi|hey)\b/.test(tl)) return false;
    const words = tl.split(/\s+/);
    if (words.length < 2 || words.length > 4) return false;
    return /^[\p{L} .'-]+$/u.test(t) && !/\d/.test(t);
}

export async function handleClassify(state: typeof GraphState.State) {
    const lastUserMessage = (state.messages as BaseMessage[])
        .findLast((m: BaseMessage) => m instanceof HumanMessage) as HumanMessage | undefined;
    const userLang = state.detectedLanguage ?? "es";
    const hotelLang = await getHotelNativeLanguage(state.hotelId);
    const question = typeof lastUserMessage?.content === "string" ? lastUserMessage.content.trim() : "";
    debugLog("❓Pregunta:", question);

    // Normalización de idioma SOLO si difiere del nativo del hotel
    let normalizedQuestion = question;
    if (userLang !== hotelLang) {
        try {
            normalizedQuestion = await translateIfNeeded(question, userLang, hotelLang);
        } catch (e) {
            console.warn("⚠️ translateIfNeeded falló; uso texto original", e);
            normalizedQuestion = question;
        }
    }
    debugLog("❓Pregunta normalizada:", normalizedQuestion);

    // --- STICKINESS: si faltan slots y hay indicios, forzar 'reservation'
    if (reservationSlotsIncomplete(state.reservationSlots) && !GREETING_RE.test(question)) {
        const aiPromptedReservation = recentAssistantAskedReservation(state.messages);
        const hintName = !RESERVATION_INTENT.test(normalizedQuestion) && looksLikeName(normalizedQuestion);
        const hintDatesOrRoom = DATE_ISO.test(normalizedQuestion) || ROOM_RE.test(normalizedQuestion) || RESERVATION_INTENT.test(normalizedQuestion);
        if (aiPromptedReservation || hintName || hintDatesOrRoom) {
            debugLog("🧲 Sticky → forzando categoría 'reservation' (faltan slots).");
            const salesStageHint = (DATE_ISO.test(normalizedQuestion) || ROOM_RE.test(normalizedQuestion)) ? ("quote" as const) : ("qualify" as const);
            return {
                ...state,
                category: "reservation",
                promptKey: null,
                normalizedMessage: normalizedQuestion,
                salesStage: salesStageHint,
            };
        }
    }

    // --- Clasificación normal
    let classification: { category: string; promptKey?: string | null };
    try {
        classification = await classifyQuery(normalizedQuestion, state.hotelId);
        debugLog("🔀 Clasificación detectada:", classification);
    } catch (e) {
        console.error("❌ Error clasificando la consulta:", e);
        classification = { category: "retrieval_based", promptKey: null };
    }

    const { category, promptKey } = classification;
    const validPromptKeys = promptMetadata[category] || [];
    const finalPromptKey = validPromptKeys.includes(promptKey || "") ? promptKey : null;
    debugLog("🧠 Clasificación final:", { category, promptKey: finalPromptKey });

    const salesStageHint = (DATE_ISO.test(normalizedQuestion) || ROOM_RE.test(normalizedQuestion)) ? ("quote" as const) : ("qualify" as const);
    return {
        ...state,
        category,
        promptKey: finalPromptKey,
        normalizedMessage: normalizedQuestion,
        salesStage: salesStageHint,
    };
}
