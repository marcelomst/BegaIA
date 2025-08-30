// Path: /root/begasist/lib/agents/classify.ts
import { GraphState } from "/root/begasist/lib/agents/index.ts";
import { AIMessage, HumanMessage, BaseMessage } from "@langchain/core/messages";
import { getHotelNativeLanguage } from "@/lib/config/hotelLanguage";
import { debugLog } from "../utils/debugLog";
import { translateIfNeeded } from "@/lib/i18n/translateIfNeeded";
import { classifyQuery } from "../classifier";
import { promptMetadata } from "../prompts/promptMetadata";

/* -------- Heurísticas útiles -------- */
function reservationSlotsIncomplete(s?: typeof GraphState.State["reservationSlots"]) {
  if (!s) return true;
  return !(s.guestName && s.roomType && s.checkIn && s.checkOut);
}

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

// ¿Parece un nombre personal?
function looksLikeName(s: string) {
  const t = (s || "").trim();
  if (t.length < 2 || t.length > 60) return false;
  return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/u.test(t);
}

// Fechas / tipos de habitación que insinúan flujo de reserva
const DATE_ISO = /\b\d{4}-\d{2}-\d{2}\b/;
const ROOM_RE = /suite|matrimonial|doble|triple|individual|single|double|twin|queen|king|deluxe|standard/i;

export async function handleClassify(state: typeof GraphState.State) {
  const lastUserMessage = state.messages.findLast((m) => m instanceof HumanMessage);
  const userLang = state.detectedLanguage ?? "es";
  const hotelLang = await getHotelNativeLanguage(state.hotelId);

  let question = typeof lastUserMessage?.content === "string" ? lastUserMessage.content.trim() : "";
  debugLog("❓Pregunta:", question);

  // Normalización de idioma SOLO si difiere del nativo del hotel
  let normalizedQuestion = question;
  if (userLang !== hotelLang) {
    normalizedQuestion = await translateIfNeeded(question, userLang, hotelLang);
  }
  debugLog("❓Pregunta normalizada:", normalizedQuestion);

  // --- STICKINESS: si faltan slots de reserva y hay indicios, forzar categoría 'reservation'
  if (reservationSlotsIncomplete(state.reservationSlots)) {
    const aiPromptedReservation = recentAssistantAskedReservation(state.messages);
    const hintName = looksLikeName(normalizedQuestion);
    const hintDatesOrRoom = DATE_ISO.test(normalizedQuestion) || ROOM_RE.test(normalizedQuestion);

    if (aiPromptedReservation || hintName || hintDatesOrRoom) {
      debugLog("🧲 Sticky → forzando categoría 'reservation' (faltan slots).");
      const salesStageHint = (DATE_ISO.test(normalizedQuestion) || ROOM_RE.test(normalizedQuestion))
        ? ("quote" as const)
        : ("qualify" as const);

      return {
        ...state,
        category: "reservation",
        promptKey: null,
        normalizedMessage: normalizedQuestion,
        salesStage: salesStageHint,
        // No añadimos mensaje del sistema; mantenemos la conversación limpia
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

  const salesStageHint = (DATE_ISO.test(normalizedQuestion) || ROOM_RE.test(normalizedQuestion))
    ? ("quote" as const)
    : ("qualify" as const);

  return {
    ...state,
    category,
    promptKey: finalPromptKey,
    normalizedMessage: normalizedQuestion,
    salesStage: salesStageHint,
  };
}
