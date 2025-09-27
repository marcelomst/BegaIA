// === NODOS EXPLÍCITOS PARA MODIFICACIÓN DE RESERVA ===
import { debugLog } from "@/lib/utils/debugLog";

async function askModifyFieldNode(state: typeof GraphState.State) {
  debugLog('[Graph] Enter askModifyFieldNode', { state });
  const lang = (state.detectedLanguage || "es").slice(0, 2);
  let msg = "";
  if (lang === "es") {
    msg = "¿Qué dato de la reserva deseas modificar? (fechas, nombre, habitación, huéspedes, etc.)";
  } else if (lang === "pt") {
    msg = "Qual informação da reserva você deseja alterar? (datas, nome, quarto, hóspedes, etc.)";
  } else {
    msg = "What detail of the booking would you like to modify? (dates, name, room, guests, etc.)";
  }
  const result = {
    messages: [new AIMessage(msg)],
    category: "modify_reservation_field",
    desiredAction: "modify",
  };
  debugLog('[Graph] Exit askModifyFieldNode', { result });
  return result;
}

async function askNewValueNode(state: typeof GraphState.State) {
  debugLog('[Graph] Enter askNewValueNode', { state });
  const lang = (state.detectedLanguage || "es").slice(0, 2);
  const field = state.meta?.modField || "dato";
  let msg = "";
  if (lang === "es") {
    msg = `Por favor, dime el nuevo valor para ${field}.`;
  } else if (lang === "pt") {
    msg = `Por favor, informe o novo valor para ${field}.`;
  } else {
    msg = `Please provide the new value for ${field}.`;
  }
  const result = {
    messages: [new AIMessage(msg)],
    category: "modify_reservation_value",
    desiredAction: "modify",
  };
  debugLog('[Graph] Exit askNewValueNode', { result });
  return result;
}

async function confirmModificationNode(state: typeof GraphState.State) {
  debugLog('[Graph] Enter confirmModificationNode', { state });
  const lang = (state.detectedLanguage || "es").slice(0, 2);
  const slots = state.reservationSlots || {};
  let msg = "";
  if (lang === "es") {
    msg = `He actualizado tu reserva.\n\nResumen actual:\n- Nombre: ${slots.guestName || "-"}\n- Habitación: ${slots.roomType || "-"}\n- Fechas: ${slots.checkIn || "-"} → ${slots.checkOut || "-"}\n- Huéspedes: ${slots.numGuests || "-"}\n¿Quieres modificar otro dato o finalizar?`;
  } else if (lang === "pt") {
    msg = `Atualizei sua reserva.\n\nResumo atual:\n- Nome: ${slots.guestName || "-"}\n- Quarto: ${slots.roomType || "-"}\n- Datas: ${slots.checkIn || "-"} → ${slots.checkOut || "-"}\n- Hóspedes: ${slots.numGuests || "-"}\nDeseja alterar outro dado ou finalizar?`;
  } else {
    msg = `Your booking has been updated.\n\nCurrent summary:\n- Name: ${slots.guestName || "-"}\n- Room: ${slots.roomType || "-"}\n- Dates: ${slots.checkIn || "-"} → ${slots.checkOut || "-"}\n- Guests: ${slots.numGuests || "-"}\nWould you like to modify another detail or finish?`;
  }
  const result = {
    messages: [new AIMessage(msg)],
    category: "modify_reservation_confirm",
    desiredAction: "modify",
  };
  debugLog('[Graph] Exit confirmModificationNode', { result });
  return result;
}

// Path: /root/begasist/lib/agents/graph.ts
import { Annotation, StateGraph } from "@langchain/langgraph";
import {
  BaseMessage,
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { getSystemPlaybooks } from "@/lib/astra/systemPlaybook";
import { getConvState, upsertConvState } from "@/lib/db/convState";
import { retrievalBased } from "@/lib/agents/retrieval_based";
import { classifyQuery } from "@/lib/classifier";
import {
  fillSlotsWithLLM,
  askAvailability,
  confirmAndCreate,
  // type FillSlotsResult, // opcional si tipás la respuesta
} from "@/lib/agents/reservations";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import type {
  IntentCategory,
  DesiredAction,
  RequiredSlot,
  SlotMap,
} from "@/types/audit";
import { looksLikeName, normalizeNameCase, heuristicClassify } from "./helpers";

/* =========================
 *        CONST / LABELS
 * ========================= */
const REQUIRED_SLOTS: RequiredSlot[] = [
  "guestName",
  "roomType",
  "checkIn",
  "checkOut",
  "numGuests",
];
const FORCE_CANONICAL_QUESTION =
  (process.env.FORCE_CANONICAL_QUESTION || "0") === "1";
const ONE_QUESTION_PER_TURN =
  (process.env.ONE_QUESTION_PER_TURN || "1") === "1";

const LABELS = {
  es: {
    guestName: "nombre completo",
    roomType: "tipo de habitación",
    checkIn: "fecha de check-in",
    checkOut: "fecha de check-out",
    numGuests: "número de huéspedes",
  },
  en: {
    guestName: "guest name",
    roomType: "room type",
    checkIn: "check-in date",
    checkOut: "check-out date",
    numGuests: "number of guests",
  },
  pt: {
    guestName: "nome do hóspede",
    roomType: "tipo de quarto",
    checkIn: "data de check-in",
    checkOut: "data de check-out",
    numGuests: "número de hóspedes",
  },
} as const;

/* =========================
 *        HELPERS
 * ========================= */

import {
  ddmmyyyyToISO,
  extractDateRangeFromText,
  extractGuests,
  isConfirmIntentLight,
  isGreeting,
  labelSlot,
  summarizeDraft,
  buildAggregatedQuestion,
  mentionsLocale,
  stripLocaleRequests,
  normalizeSlotsToStrings,
  isConfirmIntent,
  looksLikeDateOnly,
  looksLikeCorrection,
  maxGuestsFor,
  clampGuests,
  sanitizePartial,
  looksRoomInfo,
  normalizeSlots,
  extractSlotsFromText,
  chronoExtractDateRange,
  localizeRoomType,
} from "./helpers";

// Local helpers for single-slot questioning
function buildSingleSlotQuestion(slot: RequiredSlot, lang2: "es" | "en" | "pt") {
  const L = labelSlot(slot, lang2);
  // Elegir artículo correcto por idioma/slot
  if (lang2 === "en") return `What is the ${L}?`;
  if (lang2 === "pt") {
    const artPt: Record<RequiredSlot, "o" | "a"> = {
      guestName: "o", // o nome
      roomType: "o",  // o tipo
      checkIn: "a",   // a data
      checkOut: "a",  // a data
      numGuests: "o", // o número
    };
    return `Qual é ${artPt[slot]} ${L}?`;
  }
  // es
  const artEs: Record<RequiredSlot, "el" | "la"> = {
    guestName: "el",   // el nombre completo
    roomType: "el",    // el tipo de habitación
    checkIn: "la",     // la fecha
    checkOut: "la",    // la fecha
    numGuests: "el",   // el número
  };
  return `¿Cuál es ${artEs[slot]} ${L}?`;
}
function questionMentionsSlot(q: string, slot: RequiredSlot, lang2: "es" | "en" | "pt") {
  const t = (q || "").toLowerCase();
  const map: Record<RequiredSlot, string[]> = {
    guestName: lang2 === "pt" ? ["nome", "hóspede"] : lang2 === "en" ? ["guest name", "name"] : ["nombre", "huésped"],
    roomType: lang2 === "pt" ? ["quarto", "tipo"] : lang2 === "en" ? ["room", "room type"] : ["habitación", "tipo"],
    checkIn: ["check-in", "check in"],
    checkOut: ["check-out", "check out"],
    numGuests: lang2 === "pt" ? ["hóspede", "hóspedes", "pessoas"] : lang2 === "en" ? ["guests", "people"] : ["huésped", "huéspedes", "personas"],
  };
  return (map[slot] || []).some((kw) => t.includes(kw));
}

// Infers the slot the assistant asked for in the last AI message
function inferExpectedSlotFromHistory(messages: BaseMessage[], lang2: "es" | "en" | "pt"): RequiredSlot | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m instanceof AIMessage) {
      const txt = String((m as any).content || "");
      // Prioritize explicit date asks in order of likelihood
      if (questionMentionsSlot(txt, "checkOut", lang2)) return "checkOut";
      if (questionMentionsSlot(txt, "checkIn", lang2)) return "checkIn";
      if (questionMentionsSlot(txt, "numGuests", lang2)) return "numGuests";
      if (questionMentionsSlot(txt, "roomType", lang2)) return "roomType";
      if (questionMentionsSlot(txt, "guestName", lang2)) return "guestName";
      return undefined;
    }
  }
  return undefined;
}

/* =========================
 *        STATE
 * ========================= */
export const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  normalizedMessage: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => "",
  }),
  category: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => "other",
  }),
  detectedLanguage: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => "es",
  }),
  sentiment: Annotation<"positive" | "neutral" | "negative">({
    reducer: (_x, y) => y,
    default: () => "neutral",
  }),
  preferredLanguage: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => "es",
  }),
  promptKey: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  hotelId: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => "hotel999",
  }),
  conversationId: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  meta: Annotation<Record<string, any>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  reservationSlots: Annotation<{
    guestName?: string;
    roomType?: string;
    checkIn?: string;
    checkOut?: string;
    numGuests?: string;
  }>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  intentConfidence: Annotation<number>({
    reducer: (_x, y) => y,
    default: () => 0.0,
  }),
  intentSource: Annotation<"heuristic" | "llm" | "embedding">({
    reducer: (_x, y) => y,
    default: () => "heuristic",
  }),
  desiredAction: Annotation<"create" | "modify" | "cancel" | undefined>({
    reducer: (_x, y) => y,
    default: () => undefined,
  }),
  salesStage: Annotation<"qualify" | "quote" | "close" | "followup">({
    reducer: (_x, y) => y,
    default: () => "qualify",
  }),
  lastOffer: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  upsellCount: Annotation<number>({
    reducer: (x, y) => (typeof y === "number" ? y : x ?? 0),
    default: () => 0,
  }),
});

/* =========================
 *         NODES
 * ========================= */
// Nodo para mostrar snapshot de reserva confirmada
async function handleReservationSnapshotNode(state: typeof GraphState.State) {
  const lang = (state.detectedLanguage || "es").slice(0, 2);
  const slots = state.reservationSlots || {};
  const code = (state as any)?.lastReservation?.reservationId || "-";
  let msg = "";
  if (lang === "es") {
    msg = `Tienes una reserva confirmada:\n\n- Nombre: ${slots.guestName || "-"}\n- Habitación: ${slots.roomType || "-"}\n- Fechas: ${slots.checkIn || "-"} → ${slots.checkOut || "-"}\n- Huéspedes: ${slots.numGuests || "-"}\n- Código: ${code}`;
  } else if (lang === "pt") {
    msg = `Você tem uma reserva confirmada:\n\n- Nome: ${slots.guestName || "-"}\n- Quarto: ${slots.roomType || "-"}\n- Datas: ${slots.checkIn || "-"} → ${slots.checkOut || "-"}\n- Hóspedes: ${slots.numGuests || "-"}\n- Código: ${code}`;
  } else {
    msg = `You have a confirmed booking:\n\n- Name: ${slots.guestName || "-"}\n- Room: ${slots.roomType || "-"}\n- Dates: ${slots.checkIn || "-"} → ${slots.checkOut || "-"}\n- Guests: ${slots.numGuests || "-"}\n- Code: ${code}`;
  }
  // Si el mensaje original era de modificación, dejar desiredAction: 'modify' para que el siguiente turno avance
  const t = (state.normalizedMessage || "").toLowerCase();
  const isModify = /\b(modificar|cambiar|modification|change|alterar|alteração|alterar|change)\b/.test(t);
  return {
    messages: [new AIMessage(msg)],
    reservationSlots: slots,
    category: "reservation",
    salesStage: "close",
    desiredAction: isModify ? "modify" : undefined,
  };
}
async function classifyNode(state: typeof GraphState.State) {
  debugLog('[Graph] Enter classifyNode', { state });
  // Si la reserva está cerrada, manejar casos especiales
  if (state.salesStage === "close") {
    const t = (state.normalizedMessage || "").toLowerCase();
    // Si el usuario explícitamente quiere modificar/cancelar, seguir en reservation
    if (
      /\b(modificar|cambiar|cancelar|anular|cancela|cambio|modifico|modification|change|cancel)\b/.test(
        t
      )
    ) {
      return {
        category: "reservation",
        desiredAction: "modify",
        intentConfidence: 0.95,
        intentSource: "heuristic",
        promptKey: "modify_reservation",
        messages: [],
      };
    }
    // Si el usuario pide ver/consultar/confirmar su reserva (es, pt, en)
    if (
      /(ver|mostrar|consultar|verificar|tengo|confirmar|confirmada|detalhes|detalhes|detalles|see|show|check|confirm|details|reservation|reserva|booking)/i.test(t) &&
      /(reserva|booking|reservation)/i.test(t)
    ) {
      // category especial para snapshot
      return {
        category: "reservation_snapshot",
        desiredAction: undefined,
        intentConfidence: 0.99,
        intentSource: "heuristic",
        promptKey: "reservation_snapshot",
        messages: [],
      };
    }
    // Si no, derivar a retrieval_based
    return {
      category: "retrieval_based",
      desiredAction: undefined,
      intentConfidence: 0.95,
      intentSource: "heuristic",
      promptKey: undefined,
      messages: [],
    };
  }
  // Nodo para mostrar snapshot de reserva confirmada
  async function handleReservationSnapshotNode(state: typeof GraphState.State) {
    const lang = (state.detectedLanguage || "es").slice(0, 2);
    const slots = state.reservationSlots || {};
    const code = (state as any)?.lastReservation?.reservationId || "-";
    let msg = "";
    if (lang === "es") {
      msg = `Tienes una reserva confirmada:\n\n- Nombre: ${slots.guestName || "-"}\n- Habitación: ${slots.roomType || "-"}\n- Fechas: ${slots.checkIn || "-"} → ${slots.checkOut || "-"}\n- Huéspedes: ${slots.numGuests || "-"}\n- Código: ${code}`;
    } else if (lang === "pt") {
      msg = `Você tem uma reserva confirmada:\n\n- Nome: ${slots.guestName || "-"}\n- Quarto: ${slots.roomType || "-"}\n- Datas: ${slots.checkIn || "-"} → ${slots.checkOut || "-"}\n- Hóspedes: ${slots.numGuests || "-"}\n- Código: ${code}`;
    } else {
      msg = `You have a confirmed booking:\n\n- Name: ${slots.guestName || "-"}\n- Room: ${slots.roomType || "-"}\n- Dates: ${slots.checkIn || "-"} → ${slots.checkOut || "-"}\n- Guests: ${slots.numGuests || "-"}\n- Code: ${code}`;
    }
    return {
      messages: [new AIMessage(msg)],
      reservationSlots: slots,
      category: "reservation",
      salesStage: "close",
    };
  }
  const { normalizedMessage, reservationSlots, meta } = state;
  // Refuerzo: si el mensaje contiene un dato parcial de slot, forzar reservation
  const hasAnySlot = (
    ["guestName", "roomType", "checkIn", "checkOut", "numGuests"] as const
  ).some((k) => !!(reservationSlots as any)?.[k] || looksLikeName(normalizedMessage));
  const prev = (meta as any)?.prevCategory || state.category;
  if (prev === "reservation" || hasAnySlot) {
    const t = (normalizedMessage || "").toLowerCase();
    const isHardSwitch =
      /\b(cancel|cancelar|anular)\b/.test(t) ||
      /\b(piscina|desayuno|parking|estacionamiento|spa|gym|gimnasio)\b/.test(
        t
      ) ||
      /\b(factura|invoice|cobro|billing)\b/.test(t) ||
      /\b(soporte|ayuda|problema|support)\b/.test(t);
    if (!isHardSwitch) {
      const result = {
        category: "reservation",
        desiredAction: "modify",
        intentConfidence: 0.95,
        intentSource: "heuristic",
        promptKey: "reservation_flow",
        messages: [],
      };
      debugLog('[Graph] Exit classifyNode (reservation/hasAnySlot refuerzo)', { result });
      return result;
    }
  }
  let h = heuristicClassify(normalizedMessage);
  if (h.intentConfidence < 0.75) {
    try {
      const llmC = await classifyQuery(normalizedMessage, state.hotelId);
      h = {
        category: llmC.category as IntentCategory,
        desiredAction: h.desiredAction,
        intentConfidence: Math.max(h.intentConfidence, 0.9),
        intentSource: "llm",
      };
      const forcedPK =
        llmC.promptKey ??
        (looksRoomInfo(normalizedMessage) ? "room_info" : undefined);
      if (forcedPK)
        return {
          category: "retrieval_based",
          desiredAction: h.desiredAction,
          intentConfidence: h.intentConfidence,
          intentSource: "llm",
          promptKey: forcedPK,
          messages: [],
        };
    } catch {
      console.log("Error classifying with LLM, falling back to heuristic");
    }
  }

  const pickPK = (cat: IntentCategory, desired: DesiredAction) =>
    cat === "reservation"
      ? desired === "modify"
        ? "modify_reservation"
        : "reservation_flow"
      : cat === "cancel_reservation"
        ? "modify_reservation"
        : looksRoomInfo(normalizedMessage)
          ? "room_info"
          : "ambiguity_policy";
  const promptKey = pickPK(h.category, h.desiredAction);
  return {
    category: h.category,
    desiredAction: h.desiredAction,
    intentConfidence: h.intentConfidence,
    intentSource: h.intentSource,
    promptKey,
    messages: [],
  };
}

async function handleReservationNode(state: typeof GraphState.State) {
  debugLog('[Graph] Enter handleReservationNode', { state });
  const {
    detectedLanguage,
    reservationSlots,
    normalizedMessage,
    hotelId,
    conversationId,
    salesStage,
  } = state;
  const channel = (state.meta as any)?.channel || "web";
  const cfg = await getHotelConfig(hotelId).catch((err) => {
    console.error("[graph] Error en getHotelConfig:", err);
    return null;
  });
  const hotelTz =
    cfg?.timezone ||
    (
      await getHotelConfig(hotelId).catch((err) => {
        console.error("[graph] Error en getHotelConfig (timezone):", err);
        return null;
      })
    )?.timezone ||
    "UTC";
  const forceCanonicalQuestion: boolean =
    (cfg as any)?.channelConfigs?.[channel]?.reservations
      ?.forceCanonicalQuestion ??
    (cfg as any)?.reservations?.forceCanonicalQuestion ??
    false;

  const lang2 = (detectedLanguage || "es").slice(0, 2) as "es" | "en" | "pt";
  const locale = lang2;

  // 🚫 Si la reserva ya está cerrada, solo permitir volver si el usuario pide modificar/cancelar
  if (salesStage === "close") {
    const t = (normalizedMessage || "").toLowerCase();
    const da = state.desiredAction;
    if (
      da === "modify" ||
      /\b(modificar|cambiar|cancelar|anular|cancela|cambio|modifico|modification|change|cancel)\b/.test(t)
    ) {
      const lang = (detectedLanguage || "es").slice(0, 2);
      let msg = "";
      if (lang === "es") {
        msg = "¿Qué dato de la reserva deseas modificar? (fechas, nombre, habitación, huéspedes, etc.)";
      } else if (lang === "pt") {
        msg = "Qual informação da reserva você deseja alterar? (datas, nome, quarto, hóspedes, etc.)";
      } else {
        msg = "What detail of the booking would you like to modify? (dates, name, room, guests, etc.)";
      }
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
    const result = await retrievalBased(state);
    debugLog('[Graph] Exit handleReservationNode (retrievalBased)', { result });
    return result;
  }

  // Snapshot persistido + turn
  const st = await getConvState(hotelId, conversationId || "");
  const persistedStr = normalizeSlotsToStrings(
    normalizeSlots(st?.reservationSlots || {})
  );
  const turnStr = normalizeSlotsToStrings(
    normalizeSlots(reservationSlots || {})
  );

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
  } catch { }

  // Si el último turno del asistente preguntó específicamente por un slot,
  // reinterpreta señales de fecha suelta para ese slot (evita loops "¿check-out?" tras dar 04/10/2025)
  const expectedSlot = inferExpectedSlotFromHistory(state.messages, lang2);
  if (expectedSlot === "checkOut" && !signals.checkOut) {
    // 1) Si Chrono devolvió solo checkIn para una fecha suelta, úsala como checkOut
    if (chronoHint.checkIn && !chronoHint.checkOut) {
      signals.checkOut = chronoHint.checkIn;
      // Evitar ruido: no inyectar también como checkIn
      if (signals.checkIn === chronoHint.checkIn) delete (signals as any).checkIn;
    } else if (signals.checkIn && !signals.checkOut) {
      // 2) Si la heurística básica metió la fecha en checkIn, muévela a checkOut
      signals.checkOut = signals.checkIn;
      delete (signals as any).checkIn;
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
      if (typeof cl === "number") signals.numGuests = String(cl);
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
    (Object.keys(merged).length
      ? `\n\nDatos previos conocidos: ${JSON.stringify(merged)}`
      : "") +
    signalsStr +
    `\n\nNota: Locale conocido: ${locale}. No lo pidas; usá este valor si fuera necesario.`;

  let filled: any;
  try {
    const prevSlotsForLLM = {
      guestName: merged.guestName,
      roomType: merged.roomType,
      checkIn: merged.checkIn,
      checkOut: merged.checkOut,
      numGuests: merged.numGuests ? parseInt(String(merged.numGuests), 10) : undefined,
      locale,
    } as const;
    filled = await fillSlotsWithLLM(augmentedUserText, locale, { hotelTz, prevSlots: prevSlotsForLLM });
  } catch {
    console.timeLog("fillSlotsWithLLM");
    const missing = REQUIRED_SLOTS.filter((k) => !merged[k]);
    const q = ONE_QUESTION_PER_TURN && missing.length
      ? buildSingleSlotQuestion(missing[0], lang2)
      : buildAggregatedQuestion(missing, lang2);
    await upsertConvState(hotelId, conversationId || "", {
      reservationSlots: merged,
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
    return await retrievalBased(state);
  }
  // --- NUEVO: Si el usuario confirma y ya están todos los datos, crear la reserva aunque el salesStage no sea 'quote' ---
  if (isConfirmIntentLight(normalizedMessage)) {
    const haveAllNow = REQUIRED_SLOTS.every((k) => !!merged[k]);
    if (haveAllNow) {
      // Normalizar checkIn y checkOut a ISO datetime (YYYY-MM-DDT00:00:00Z)
      const toISODateTime = (d: string) =>
        d && d.length === 10 ? `${d}T00:00:00Z` : d;
      const completeSnapshot = {
        ...merged,
        checkIn: toISODateTime(merged.checkIn!),
        checkOut: toISODateTime(merged.checkOut!),
        locale,
      };
      await upsertConvState(hotelId, conversationId || "", {
        reservationSlots: completeSnapshot,
        updatedBy: "ai",
      });
      // Llamar a confirmAndCreate
      const result = await confirmAndCreate(
        hotelId,
        {
          guestName: completeSnapshot.guestName!,
          roomType: completeSnapshot.roomType!,
          numGuests: parseInt(completeSnapshot.numGuests!, 10) || 1,
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
            channel: (channel as any) || "web",
          },
          salesStage: "close",
          updatedBy: "ai",
        });
      }
      const showRt = localizeRoomType(completeSnapshot.roomType, lang2);
      let msg = result.ok
        ? lang2 === "es"
          ? `✅ ¡Reserva confirmada! Código **${result.reservationId ?? "pendiente"}**.\nHabitación **${showRt}**, Fechas **${completeSnapshot.checkIn} → ${completeSnapshot.checkOut}**${completeSnapshot.numGuests ? ` · **${completeSnapshot.numGuests}** huésped(es)` : ""}. ¡Gracias, ${completeSnapshot.guestName}!`
          : lang2 === "pt"
            ? `✅ Reserva confirmada! Código **${result.reservationId ?? "pendente"}**.\nQuarto **${showRt}**, Datas **${completeSnapshot.checkIn} → ${completeSnapshot.checkOut}**${completeSnapshot.numGuests ? ` · **${completeSnapshot.numGuests}** hóspede(s)` : ""}. Obrigado, ${completeSnapshot.guestName}!`
            : `✅ Booking confirmed! Code **${result.reservationId ?? "pending"}**.\nRoom **${showRt}**, Dates **${completeSnapshot.checkIn} → ${completeSnapshot.checkOut}**${completeSnapshot.numGuests ? ` · **${completeSnapshot.numGuests}** guest(s)` : ""}. Thank you, ${completeSnapshot.guestName}!`
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
      reservationSlots: completeSnapshot,
      updatedBy: "ai",
    });
    console.log("[DEBUG] Complete snapshot:", completeSnapshot);
    let availability;
    try {
      availability = await askAvailability(hotelId, {
        guestName: completeSnapshot.guestName!,
        roomType: completeSnapshot.roomType!,
        numGuests: parseInt(completeSnapshot.numGuests!, 10) || 1,
        checkIn: completeSnapshot.checkIn!,
        checkOut: completeSnapshot.checkOut!,
        locale,
      });
    } catch (err) {
      console.error("Error en askAvailability:", err, (err as Error)?.stack);
      return {
        messages: [
          new AIMessage(
            lang2 === "es"
              ? "Perdón, vengo de linea 213 y tuve un problema al consultar la disponibilidad. ¿Podés intentar nuevamente?"
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
    console.log("[DEBUG] Availability:", availability);
    await upsertConvState(hotelId, conversationId || "", {
      lastProposal: {
        text:
          availability.proposal ||
          (availability.available
            ? "Hay disponibilidad."
            : "Sin disponibilidad."),
        available: !!availability.available,
        options: availability.options,
        toolCall: {
          name: "checkAvailability",
          input: {
            hotelId,
            roomType: completeSnapshot.roomType,
            numGuests: parseInt(completeSnapshot.numGuests!, 10) || 1,
            checkIn: completeSnapshot.checkIn,
            checkOut: completeSnapshot.checkOut,
          },
          outputSummary: availability.available
            ? "available:true"
            : "available:false",
          at: new Date().toISOString(),
        },
      },
      salesStage: availability.available ? "quote" : "followup",
      updatedBy: "ai",
    });
    console.log("[DEBUG] Updated conv state after availability");
    if (!availability.ok) {
      console.error("[graph] askAvailability returned not ok:", availability);
      return {
        messages: [new AIMessage(availability.message)],
        reservationSlots: completeSnapshot,
        category: "reservation",
        salesStage: "followup",
      };
    }
    if (!availability.available) {
      const noAvailText =
        availability.proposal ||
        (lang2 === "es"
          ? `No tengo disponibilidad para ${completeSnapshot.roomType} en esas fechas.`
          : lang2 === "pt"
            ? `Não tenho disponibilidade para ${completeSnapshot.roomType} nessas datas.`
            : `No availability for ${completeSnapshot.roomType} on those dates.`);
      return {
        messages: [new AIMessage(noAvailText)],
        reservationSlots: completeSnapshot,
        category: "reservation",
        salesStage: "quote",
      };
    }

    const confirmLine =
      lang2 === "es"
        ? "\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”."
        : lang2 === "pt"
          ? "\n\nConfirma a reserva respondendo “CONFIRMAR”."
          : "\n\nDo you confirm the booking? Reply “CONFIRMAR” (confirm).";
    return {
      messages: [
        new AIMessage((availability.proposal || "Tengo disponibilidad.") + confirmLine),
      ],
      reservationSlots: completeSnapshot,
      category: "reservation",
      salesStage: "quote",
    };
  }

  // (removido: duplicado por forzar LLM arriba)

  // ✅ NUEVO: manejar errores del MCP sin mostrar el error técnico
  if (filled?.need === "error") {
    const msg: string = String(filled?.message || "");
    const missingGuests =
      /"path"\s*:\s*\[\s*"guests"\s*\]/i.test(msg) ||
      (/guests/i.test(msg) && /expected/i.test(msg) && /number/i.test(msg));

    if (missingGuests) {
      // Intentar completar desde lo que ya tenemos o lo que dice el usuario
      const inferredRaw =
        (merged.numGuests
          ? parseInt(String(merged.numGuests), 10)
          : undefined) ?? extractGuests(normalizedMessage);
      const inferred =
        typeof inferredRaw === "string"
          ? parseInt(inferredRaw, 10)
          : inferredRaw;
      if (inferred) {
        merged.numGuests = String(clampGuests(inferred, merged.roomType));
        // con esto, re-evaluamos si ya tenemos todo
        const haveAll = REQUIRED_SLOTS.every((k) => !!merged[k]);
        if (haveAll) {
          // Igual que el fast-path de disponibilidad
          const ci = new Date(merged.checkIn!);
          const co = new Date(merged.checkOut!);
          if (
            !(ci instanceof Date && !isNaN(ci.valueOf())) ||
            !(co instanceof Date && !isNaN(co.valueOf())) ||
            ci >= co
          ) {
            const txt =
              lang2 === "es"
                ? "Las fechas parecen inválidas. ¿Podés confirmar check-in (dd/mm/aaaa) y check-out (dd/mm/aaaa)?"
                : lang2 === "pt"
                  ? "As datas parecem inválidas. Pode confirmar check-in (dd/mm/aaaa) e check-out (dd/mm/aaaa)?"
                  : "Dates look invalid. Could you confirm check-in (dd/mm/yyyy) and check-out (dd/mm/yyyy)?";
            return {
              messages: [new AIMessage(txt)],
              reservationSlots: { ...merged },
              category: "reservation",
              salesStage: "qualify",
            };
          }

          const completeSnapshot = { ...merged, locale };
          await upsertConvState(hotelId, conversationId || "", {
            reservationSlots: completeSnapshot,
            updatedBy: "ai",
          });

          const availability = await askAvailability(hotelId, {
            guestName: completeSnapshot.guestName!,
            roomType: completeSnapshot.roomType!,
            numGuests: parseInt(completeSnapshot.numGuests!, 10) || 1,
            checkIn: completeSnapshot.checkIn!,
            checkOut: completeSnapshot.checkOut!,
            locale,
          });

          await upsertConvState(hotelId, conversationId || "", {
            lastProposal: {
              text:
                availability.proposal ||
                (availability.available
                  ? "Hay disponibilidad."
                  : "Sin disponibilidad."),
              available: !!availability.available,
              options: availability.options,
              toolCall: {
                name: "checkAvailability",
                input: {
                  hotelId,
                  roomType: completeSnapshot.roomType,
                  numGuests: parseInt(completeSnapshot.numGuests!, 10) || 1,
                  checkIn: completeSnapshot.checkIn,
                  checkOut: completeSnapshot.checkOut,
                },
                outputSummary: availability.available
                  ? "available:true"
                  : "available:false",
                at: new Date().toISOString(),
              },
            },
            salesStage: availability.available ? "quote" : "followup",
            updatedBy: "ai",
          });

          if (!availability.ok) {
            return {
              messages: [new AIMessage(availability.message)],
              reservationSlots: completeSnapshot,
              category: "reservation",
              salesStage: "followup",
            };
          }
          if (!availability.available) {
            const noAvailText =
              availability.proposal ||
              (lang2 === "es"
                ? `No tengo disponibilidad para ${completeSnapshot.roomType} en esas fechas.`
                : lang2 === "pt"
                  ? `Não tenho disponibilidade para ${completeSnapshot.roomType} nessas datas.`
                  : `No availability for ${completeSnapshot.roomType} on those dates.`);
            return {
              messages: [new AIMessage(noAvailText)],
              reservationSlots: completeSnapshot,
              category: "reservation",
              salesStage: "quote",
            };
          }

          const confirmLine =
            lang2 === "es"
              ? "\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”."
              : lang2 === "pt"
                ? "\n\nConfirma a reserva respondendo “CONFIRMAR”."
                : "\n\nDo you confirm the booking? Reply “CONFIRMAR” (confirm).";
          return {
            messages: [
              new AIMessage(
                (availability.proposal || "Tengo disponibilidad.") + confirmLine
              ),
            ],
            reservationSlots: completeSnapshot,
            category: "reservation",
            salesStage: "quote",
          };
        }
      }

      // No se pudo inferir → pedirlo amable
      const ask =
        lang2 === "es"
          ? "¿Cuántos huéspedes se alojarán?"
          : lang2 === "pt"
            ? "Quantos hóspedes irão se hospedar?"
            : "How many guests will stay?";
      await upsertConvState(hotelId, conversationId || "", {
        reservationSlots: merged,
        salesStage: "qualify",
        updatedBy: "ai",
      });
      return {
        messages: [new AIMessage(ask)],
        reservationSlots: merged,
        category: "reservation",
        salesStage: "qualify",
      };
    }

    // Error genérico → preguntar faltantes sin Zod
    const missing = REQUIRED_SLOTS.filter((k) => !merged[k]);
    const q = ONE_QUESTION_PER_TURN && missing.length
      ? buildSingleSlotQuestion(missing[0], lang2)
      : buildAggregatedQuestion(missing, lang2);
    await upsertConvState(hotelId, conversationId || "", {
      reservationSlots: merged,
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

  if (filled.need === "question") {
    const partialRaw = filled.partial ?? {};
    const partial = sanitizePartial(
      normalizeSlots(partialRaw),
      merged,
      normalizedMessage
    );
    const nextSnapshot: Record<string, string> = {
      ...merged,
      ...(partial.guestName ? { guestName: partial.guestName } : {}),
      ...(partial.roomType ? { roomType: partial.roomType } : {}),
      ...(partial.numGuests ? { numGuests: String(partial.numGuests) } : {}),
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
          nextSnapshot.numGuests = String(cl);
        }
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
      const canonicalDone =
        lang2 === "es"
          ? "Tengo todos los datos. ¿Confirmo la solicitud?"
          : lang2 === "pt"
            ? "Tenho todos os dados. Posso confirmar a solicitação?"
            : "I have all details. Shall I confirm the request?";
      questionText = canonicalDone;
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
      reservationSlots: nextSnapshot,
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

  const completeSnapshot: Record<string, string> = {
    ...merged,
    guestName: completed.guestName,
    roomType: completed.roomType,
    checkIn: completed.checkIn,
    checkOut: completed.checkOut,
    numGuests: String(completed.numGuests ?? completed.guests ?? ""),
    locale: completed.locale || locale,
  };

  await upsertConvState(hotelId, conversationId || "", {
    reservationSlots: completeSnapshot,
    updatedBy: "ai",
  });

  const availability = await askAvailability(hotelId, {
    guestName: completeSnapshot.guestName!,
    roomType: completeSnapshot.roomType!,
    numGuests: parseInt(completeSnapshot.numGuests!, 10) || 1,
    checkIn: completeSnapshot.checkIn!,
    checkOut: completeSnapshot.checkOut!,
    locale,
  });

  await upsertConvState(hotelId, conversationId || "", {
    lastProposal: {
      text:
        availability.proposal ||
        (availability.available
          ? "Hay disponibilidad."
          : "Sin disponibilidad."),
      available: !!availability.available,
      options: availability.options,
      toolCall: {
        name: "checkAvailability",
        input: {
          hotelId,
          roomType: completeSnapshot.roomType,
          numGuests: parseInt(completeSnapshot.numGuests!, 10) || 1,
          checkIn: completeSnapshot.checkIn,
          checkOut: completeSnapshot.checkOut,
        },
        outputSummary: availability.available
          ? "available:true"
          : "available:false",
        at: new Date().toISOString(),
      },
    },
    salesStage: availability.available ? "quote" : "followup",
    updatedBy: "ai",
  });

  if (!availability.ok) {
    return {
      messages: [new AIMessage(availability.message)],
      reservationSlots: completeSnapshot,
      category: "reservation",
      salesStage: "followup",
    };
  }
  if (!availability.available) {
    const noAvailText =
      availability.proposal ||
      (lang2 === "es"
        ? `No tengo disponibilidad para ${completeSnapshot.roomType} en esas fechas.`
        : lang2 === "pt"
          ? `Não tenho disponibilidade para ${completeSnapshot.roomType} nessas datas.`
          : `No availability for ${completeSnapshot.roomType} on those dates.`);
    return {
      messages: [new AIMessage(noAvailText)],
      reservationSlots: completeSnapshot,
      category: "reservation",
      salesStage: "quote",
    };
  }

  const confirmLine =
    lang2 === "es"
      ? "\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”."
      : lang2 === "pt"
        ? "\n\nConfirma a reserva respondendo “CONFIRMAR”."
        : "\n\nDo you confirm the booking? Reply “CONFIRMAR” (confirm).";
  return {
    messages: [
      new AIMessage(
        (availability.proposal || "Tengo disponibilidad.") + confirmLine
      ),
    ],
    reservationSlots: completeSnapshot,
    category: "reservation",
    salesStage: "quote",
  };
}

/* ===== Otros handlers ===== */
async function handleCancelReservationNode(state: typeof GraphState.State) {
  const { normalizedMessage, detectedLanguage } = state;
  const lang = (detectedLanguage || "es").slice(0, 2);
  const map = await getSystemPlaybooks(
    ["modify_reservation", "ambiguity_policy"],
    lang
  );
  const sys = [
    "Eres un recepcionista de hotel. Política: nunca cancela sin confirmación explícita del huésped.",
    map["ambiguity_policy"]?.text
      ? `\n[ambiguity_policy]\n${map["ambiguity_policy"].text}\n`
      : "",
    map["modify_reservation"]?.text
      ? `\n[modify_reservation]\n${map["modify_reservation"].text}\n`
      : "",
    `Responde en ${lang}, breve y amable.`,
  ].join("\n");
  const out = await new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0,
  }).invoke([
    new SystemMessage(sys),
    new HumanMessage(`Usuario: """${normalizedMessage}"""`),
  ]);
  const text =
    typeof out.content === "string" ? out.content.trim() : String(out.content);
  return { messages: [new AIMessage(text)] };
}
async function handleAmenitiesNode(state: typeof GraphState.State) {
  const lang = (state.detectedLanguage || "es").slice(0, 2);
  const text =
    lang === "es"
      ? "¡Claro! Contame qué servicio querés consultar (piscina, desayuno, cocheras, etc.) y te paso la info."
      : "Sure! Tell me which amenity you need (pool, breakfast, parking, etc.) and I’ll share the details.";
  return { messages: [new AIMessage(text)] };
}
async function handleBillingNode(state: typeof GraphState.State) {
  const lang = (state.detectedLanguage || "es").slice(0, 2);
  const text =
    lang === "es"
      ? "Con gusto. ¿Tu consulta de facturación es por una reserva existente o por una futura?"
      : "Happy to help. Is your billing question about an existing booking or a future one?";
  return { messages: [new AIMessage(text)] };
}
async function handleSupportNode(state: typeof GraphState.State) {
  const lang = (state.detectedLanguage || "es").slice(0, 2);
  const text =
    lang === "es"
      ? "Estoy para ayudarte. ¿Podés contarme brevemente el problema?"
      : "I’m here to help. Could you briefly describe the issue?";
  return { messages: [new AIMessage(text)] };
}
async function retrievalBasedNode(state: typeof GraphState.State) {
  return await retrievalBased(state);
}

/* =========================
 *         GRAPH
 * ========================= */
const g = new StateGraph(GraphState)
  .addNode("classify", classifyNode)
  .addNode("handle_reservation", handleReservationNode)
  .addNode("handle_reservation_snapshot", handleReservationSnapshotNode)
  .addNode("handle_cancel_reservation", handleCancelReservationNode)
  .addNode("handle_amenities", handleAmenitiesNode)
  .addNode("handle_billing", handleBillingNode)
  .addNode("handle_support", handleSupportNode)
  .addNode("handle_retrieval_based", retrievalBasedNode)
  // Nodos para modificación de reserva
  .addNode("ask_modify_field", askModifyFieldNode)
  .addNode("ask_new_value", askNewValueNode)
  .addNode("confirm_modification", confirmModificationNode)
  .addEdge("__start__", "classify")
  .addConditionalEdges("classify", (state) => state.category, {
    reservation: "handle_reservation",
    reservation_snapshot: "handle_reservation_snapshot",
    cancel_reservation: "handle_cancel_reservation",
    amenities: "handle_amenities",
    billing: "handle_billing",
    support: "handle_support",
    retrieval_based: "handle_retrieval_based",
    other: "handle_retrieval_based",
    modify_reservation_field: "ask_modify_field",
    modify_reservation_value: "ask_new_value",
    modify_reservation_confirm: "confirm_modification",
  })
  // Flujo de modificación: campo → valor → confirmación → repetir o terminar
  .addEdge("ask_modify_field", "ask_new_value")
  .addEdge("ask_new_value", "confirm_modification")
  .addConditionalEdges("confirm_modification", (state) => {
    // Si el usuario quiere modificar otro campo, volver a preguntar campo
    const t = (state.normalizedMessage || "").toLowerCase();
    if (/otro|otra|más|mas|cambiar|modificar|alter|another|more|change|modify/.test(t)) {
      return "modify_reservation_field";
    }
    // Si dice que no, terminar
    if (/no|finalizar|terminar|listo|gracias|thanks|finish|done/.test(t)) {
      return "handle_reservation_snapshot";
    }
    // Por defecto, terminar
    return "handle_reservation_snapshot";
  }, {
    modify_reservation_field: "ask_modify_field",
    handle_reservation_snapshot: "handle_reservation_snapshot",
  })
  .addEdge("handle_reservation", "__end__")
  .addEdge("handle_cancel_reservation", "__end__")
  .addEdge("handle_amenities", "__end__")
  .addEdge("handle_billing", "__end__")
  .addEdge("handle_support", "__end__")
  .addEdge("handle_retrieval_based", "__end__");

export const agentGraph = g.compile();
