import { debugLog } from "@/lib/utils/debugLog";
import { formatReservationSnapshot } from "@/lib/format/reservationSnapshot";
import { Annotation, StateGraph } from "@langchain/langgraph";
import { BaseMessage, AIMessage, HumanMessage, SystemMessage, } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { getSystemPlaybooks } from "@/lib/astra/systemPlaybook";
import { searchFromAstra } from "@/lib/retrieval";
import { getHotelNativeLanguage } from "@/lib/config/hotelLanguage";
import { translateIfNeeded } from "@/lib/i18n/translateIfNeeded";
import { defaultPrompt, curatedPrompts } from "@/lib/prompts";
import { getConvState, upsertConvState } from "@/lib/db/convState";
import { retrievalBased } from "@/lib/agents/retrieval_based";
import { classifyQuery } from "@/lib/classifier";
import {
  fillSlotsWithLLM,
  askAvailability,
  confirmAndCreate,
  type FillSlotsResult, // tipado de respuesta de fillSlotsWithLLM
} from "@/lib/agents/reservations";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import type {
  IntentCategory,
  DesiredAction,
  RequiredSlot,
  SlotMap,
} from "@/types/audit";
import { looksLikeName, normalizeNameCase, heuristicClassify, firstNameOf } from "./helpers";
import {
  extractDateRangeFromText,
  extractGuests, isConfirmIntentLight, labelSlot, buildAggregatedQuestion, mentionsLocale, stripLocaleRequests, normalizeSlotsToStrings, clampGuests, sanitizePartial, looksRoomInfo, normalizeSlots, extractSlotsFromText, chronoExtractDateRange, localizeRoomType,
} from "./helpers";
import { runAvailabilityCheck } from "@/lib/handlers/pipeline/availability";

/* ========================= * CONST / LABELS * ========================= */
const REQUIRED_SLOTS: RequiredSlot[] = [
  "guestName",
  "roomType",
  "checkIn",
  "checkOut",
  "numGuests",
];
const FORCE_CANONICAL_QUESTION = (process.env.FORCE_CANONICAL_QUESTION || "0") === "1";
const ONE_QUESTION_PER_TURN = (process.env.ONE_QUESTION_PER_TURN || "1") === "1"; // Unused label map retained in docs previously; can be reintroduced when needed /* 
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

// === NODOS EXPLÍCITOS PARA MODIFICACIÓN DE RESERVA ===
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
  const base = formatReservationSnapshot({
    slots,
    code: (state as any)?.lastReservation?.reservationId,
    lang,
    confirmed: !!(state as any)?.lastReservation?.reservationId,
    addConfirmHint: false,
  });
  let suffix: string;
  if (lang === 'es') suffix = '\n¿Quieres modificar otro dato o finalizar?';
  else if (lang === 'pt') suffix = '\nDeseja alterar outro dado ou finalizar?';
  else suffix = '\nWould you like to modify another detail or finish?';
  const msg = base + suffix;
  const result = {
    messages: [new AIMessage(msg)],
    category: "modify_reservation_confirm",
    desiredAction: "modify",
  };
  debugLog('[Graph] Exit confirmModificationNode', { result });
  return result;
}
// Heurística: detectar consultas de horario de check-in / check-out para derivar a RAG
function detectCheckinCheckoutTimeQuery(text: string): "checkin" | "checkout" | null {
  const t = (text || "").toLowerCase();
  // Indicadores de pedir hora/horario
  const asksTime = /(\bhorario\b|\bhora\b|a qué hora|a que hora|what time|time is|which time|que horas|qual horário|qual horario)/i.test(t);
  if (!asksTime) return null;
  const mentionsCheckin = /(check\s*-?\s*in|\bentrada\b|\bingreso\b)/i.test(t);
  const mentionsCheckout = /(check\s*-?\s*out|\bsalida\b|\begreso\b|\bsaída\b|\bsaida\b)/i.test(t);
  if (mentionsCheckin && !mentionsCheckout) return "checkin";
  if (mentionsCheckout && !mentionsCheckin) return "checkout";
  // Si menciona ambos o es ambiguo, priorizamos retrieval igualmente
  return mentionsCheckin || mentionsCheckout ? "checkin" : null;
}
// Local helpers for single-slot questioning
function buildSingleSlotQuestion(slot: RequiredSlot, lang2: "es" | "en" | "pt") {
  const L = labelSlot(slot, lang2);
  // Elegir artículo correcto por idioma/slot
  if (lang2 === "en") return `What is the ${L}?`;
  if (lang2 === "pt") {
    const artPt: Record<RequiredSlot, "o" | "a"> = {
      guestName: "o", // o nome
      roomType: "o", // o tipo
      checkIn: "a", // a data
      checkOut: "a", // a data
      numGuests: "o", // o número
    };
    return `Qual é ${artPt[slot]} ${L}?`;
  }
  // es
  const artEs: Record<RequiredSlot, "el" | "la"> = {
    guestName: "el", // el nombre completo
    roomType: "el", // el tipo de habitación
    checkIn: "la", // la fecha
    checkOut: "la", // la fecha
    numGuests: "el", // el número
  };
  return `¿Cuál es ${artEs[slot]} ${L}?`;
}
function questionMentionsSlot(q: string, slot: RequiredSlot, lang2: "es" | "en" | "pt") {
  const t = (q || "").toLowerCase();
  const map: Record<RequiredSlot, string[]> = {
    guestName:
      lang2 === "pt"
        ? ["nome", "hóspede"]
        : lang2 === "en"
          ? ["guest name", "name"]
          : ["nombre", "huésped"],
    roomType:
      lang2 === "pt"
        ? ["quarto", "tipo"]
        : lang2 === "en"
          ? ["room", "room type"]
          : ["habitación", "tipo"],
    checkIn: ["check-in", "check in"],
    checkOut: ["check-out", "check out"],
    numGuests:
      lang2 === "pt"
        ? ["hóspede", "hóspedes", "pessoas"]
        : lang2 === "en"
          ? ["guests", "people"]
          : ["huésped", "huéspedes", "personas"],
  };
  return (map[slot] || []).some((kw) => t.includes(kw));
}

// Infers the slot the assistant asked for in the last AI message
function inferExpectedSlotFromHistory(
  messages: BaseMessage[],
  lang2: "es" | "en" | "pt"
): RequiredSlot | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m instanceof AIMessage) {
      const txt = String((m as unknown as { content?: unknown })?.content || "");
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

/* ========================= * STATE * ========================= */
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
  meta: Annotation<Record<string, unknown>>({
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
/* ========================= * NODES * ========================= */
// Nodo para mostrar snapshot de reserva confirmada
async function handleReservationSnapshotNode(state: typeof GraphState.State) {
  const lang = (state.detectedLanguage || "es").slice(0, 2);
  // Leer del estado persistido para evitar depender solo del turn state
  let persistedSlots = state.reservationSlots || {};
  let code = (state as unknown as { lastReservation?: { reservationId?: string } })?.lastReservation?.reservationId || "";
  let persistedStage: string | undefined = state.salesStage;
  try {
    const st = await getConvState(state.hotelId, state.conversationId || "");
    if ((st as unknown as { reservationSlots?: typeof state.reservationSlots })?.reservationSlots) {
      persistedSlots = (st as { reservationSlots?: typeof state.reservationSlots }).reservationSlots || {};
    }
    const maybe = st as unknown as {
      lastReservation?: { reservationId?: string };
      salesStage?: string;
    };
    if (maybe?.lastReservation?.reservationId) code = maybe.lastReservation.reservationId || "";
    if (maybe?.salesStage) persistedStage = maybe.salesStage;
  } catch {
    // si falla, seguimos con lo que haya en memoria
  }
  const slots = persistedSlots || {};
  const hasCore = !!(slots.checkIn && slots.checkOut && slots.roomType);
  const confirmed = !!code;
  const msg = formatReservationSnapshot({
    slots,
    code,
    lang,
    confirmed,
    addConfirmHint: !confirmed,
  });
  // Si el mensaje original era de modificación, dejar desiredAction: 'modify' para que el siguiente turno avance
  const t = (state.normalizedMessage || "").toLowerCase();
  const isModify = /\b(modificar|cambiar|modification|change|alterar|alteração|alterar|change)\b/.test(t);
  return {
    messages: [new AIMessage(msg)],
    reservationSlots: slots,
    category: "reservation_snapshot",
    salesStage: persistedStage || state.salesStage,
    desiredAction: isModify ? "modify" : undefined,
  };
}
// Nodo para pedir datos para verificar una reserva existente (cuando no hay lastReservation persistida)
async function handleReservationVerifyNode(state: typeof GraphState.State) {
  const lang = (state.detectedLanguage || "es").slice(0, 2);
  let msg = "";
  if (lang === "es") {
    msg =
      "Puedo corroborar tu reserva. ¿Me compartís el CÓDIGO de reserva? Si no lo tenés a mano, decime nombre completo y fechas aproximadas (check-in/check-out) para buscarla.";
  } else if (lang === "pt") {
    msg =
      "Posso verificar sua reserva. Você pode me informar o CÓDIGO da reserva? Se não tiver, diga o nome completo e as datas aproximadas (check-in/check-out) para eu localizar.";
  } else {
    msg =
      "I can check your booking. Please share the booking CODE. If you don't have it, tell me the full name and approximate dates (check-in/check-out) to look it up.";
  }
  return {
    messages: [new AIMessage(msg)],
    category: "reservation_verify",
    desiredAction: undefined,
  };
}
export async function classifyNode(state: typeof GraphState.State) {
  debugLog('[Graph] Enter classifyNode', { state });
  // Si la reserva está cerrada, manejar casos especiales
  if (state.salesStage === "close") {
    const t = (state.normalizedMessage || "").toLowerCase();
    // Si pregunta por horario de check-in/out, derivar a RAG
    if (detectCheckinCheckoutTimeQuery(t)) {
      return {
        category: "retrieval_based",
        desiredAction: undefined,
        intentConfidence: 0.98,
        intentSource: "heuristic",
        promptKey: undefined,
        messages: [],
      };
    }
    // Si el usuario explícitamente quiere modificar/cancelar, seguir en reservation
    if (
      /\b(modificar|cambiar|cancelar|anular|cancela|cambio|modifico|modification|change|cancel)\b/.test(t)
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
      /(ver|mostrar|consultar|verificar|corroborar|comprobar|tengo|confirmar|confirmada|detalhes|detalhes|detalles|see|show|check|confirm|details|reservation|reserva|booking)/i.test(t) &&
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
  // Si no está cerrada, pero pide ver/corroborar una reserva y existe una confirmada persistida, ir a snapshot
  try {
    const t = (state.normalizedMessage || "").toLowerCase();
    // Desvío temprano: preguntas de horario de check-in/out deben ir a RAG, no al flujo de reserva
    const whichTime = detectCheckinCheckoutTimeQuery(t);
    if (whichTime) {
      return {
        category: "retrieval_based",
        desiredAction: undefined,
        intentConfidence: 0.98,
        intentSource: "heuristic",
        // promptKey puede ser afinado si hay playbook específico; por ahora dejamos undefined
        promptKey: undefined,
        messages: [],
      };
    }
    // Si el usuario explícitamente quiere modificar/cancelar, seguir en reservation
    const asksSnapshot =
      /(ver|mostrar|consultar|verificar|corroborar|comprobar|averiguar|confirmada|check|confirm|details)/i.test(t) &&
      /(reserva|booking|reservation)/i.test(t);
    if (asksSnapshot) {
      const st = await getConvState(state.hotelId, state.conversationId || "");
      const hasConfirmed = !!(st as unknown as { lastReservation?: { reservationId?: string } })?.lastReservation?.reservationId;
      if (hasConfirmed) {
        return {
          category: "reservation_snapshot",
          desiredAction: undefined,
          intentConfidence: 0.99,
          intentSource: "heuristic",
          promptKey: "reservation_snapshot",
          messages: [],
        };
      } else {
        // Si hay datos de reserva en progreso, mostrar snapshot de borrador; si no, pedir datos para verificar
        const slots = (st as unknown as { reservationSlots?: Record<string, string> })?.reservationSlots || {};
        const hasProgress = !!(
          slots?.guestName ||
          slots?.checkIn ||
          slots?.checkOut ||
          slots?.roomType ||
          slots?.numGuests
        );
        if (hasProgress) {
          return {
            category: "reservation_snapshot",
            desiredAction: undefined,
            intentConfidence: 0.98,
            intentSource: "heuristic",
            promptKey: "reservation_snapshot",
            messages: [],
          };
        }
        return {
          category: "reservation_verify",
          desiredAction: undefined,
          intentConfidence: 0.95,
          intentSource: "heuristic",
          promptKey: "reservation_verify",
          messages: [],
        };
      }
    }
  } catch {
    // ignorar errores de lectura
  }
  const { normalizedMessage, reservationSlots, meta } = state;
  // Reglas tempranas: desvíos determinísticos por palabra clave
  try {
    const t = (normalizedMessage || "").toLowerCase();
    // Transporte / aeropuertos: ruta específica a arrivals_transport
    const looksTransport =
      /(aeroporto|aeropuerto|airport|traslados?|transfer|taxi|remis|bus|ônibus|omnibus|colectivo|metro|subte)/i.test(t);
    if (looksTransport) {
      return {
        category: "amenities",
        desiredAction: undefined,
        intentConfidence: 0.97,
        intentSource: "heuristic",
        promptKey: "arrivals_transport",
        messages: [],
      };
    }
    // Billing / pagos: ruta específica a payments_and_billing
    const looksBilling =
      /(pago|pagos|pagar|pagamento|meio(?:s)? de pagamento|tarjeta|tarjetas|cartão|cartões|d[eé]bito|cr[eé]dito|facturaci[oó]n|factura|fatura|invoice|billing|cobro|cobrar)/i.test(t);
    if (looksBilling) {
      return {
        category: "billing",
        desiredAction: undefined,
        intentConfidence: 0.98,
        intentSource: "heuristic",
        promptKey: "payments_and_billing",
        messages: [],
      };
    }
    // Soporte / contacto: ruta específica a contact_support
    const looksSupport =
      /(whats?app|contacto|cont[aá]ctar|contato|tel[eé]fono|telefone|telefono|llamar|ligar|email|correo|soporte|suporte|support)/i.test(t);
    if (looksSupport) {
      return {
        category: "support",
        desiredAction: undefined,
        intentConfidence: 0.98,
        intentSource: "heuristic",
        promptKey: "contact_support",
        messages: [],
      };
    }
    // Desayuno / breakfast: ruta específica a breakfast_bar
    const looksBreakfast =
      /(\bdesayuno\b|breakfast|desayunar|café da manhã|caf[ée] da manh[ãa])/i.test(t);
    if (looksBreakfast) {
      return {
        category: "amenities",
        desiredAction: undefined,
        intentConfidence: 0.97,
        intentSource: "heuristic",
        promptKey: "breakfast_bar",
        messages: [],
      };
    }
  } catch { }
  // Regla temprana: si el texto claramente es de info general (mascotas, ubicación, servicios), forzar retrieval kb_general
  try {
    const t = (normalizedMessage || "").toLowerCase();
    // Detección de keywords de info general
    const looksGeneralInfo =
      /\b(mascotas?|pet(s)?|animal(es)?|animais?)\b/.test(t) ||
      /\b(ubicaci[oó]n|direccion|direcci[oó]n|address|ubicados?|location|localiza[cç][aã]o|endere[cç]o)\b/.test(t) ||
      /\b(piscina|desayuno|breakfast|café da manhã|caf[ée] da manh[ãa]|parking|estacionamento|spa|gym|gimnasio|gin[aá]sio|amenities|servicios(\s+principales)?|servi[cç]os?)\b/.test(t);
    if (looksGeneralInfo) {
      return {
        category: "retrieval_based",
        desiredAction: undefined,
        intentConfidence: 0.97,
        intentSource: "heuristic",
        promptKey: "kb_general",
        messages: [],
      };
    }
  } catch { }
  // Refuerzo: si el mensaje contiene un dato parcial de slot, forzar reservation
  const hasAnySlot = (
    ["guestName", "roomType", "checkIn", "checkOut", "numGuests"] as const
  ).some((k) => !!(reservationSlots as Record<string, unknown> | undefined)?.[k] || looksLikeName(normalizedMessage));
  const prev = (meta as Record<string, unknown>)?.prevCategory || state.category;
  if (prev === "reservation" || hasAnySlot) {
    const t = (normalizedMessage || "").toLowerCase();
    // Escape: si pregunta por horario de check-in/out, NO forzar flujo de reserva
    if (detectCheckinCheckoutTimeQuery(t)) {
      return {
        category: "retrieval_based",
        desiredAction: undefined,
        intentConfidence: 0.98,
        intentSource: "heuristic",
        promptKey: undefined,
        messages: [],
      };
    }
    // Desvío específico con prioridad: transporte, billing, soporte, desayuno deben evitar kb_general aquí
    if (/(aeropuerto|airport|traslados?|transfer|taxi|remis|bus|[óo]mnibus|colectivo|metro|subte)/i.test(t)) {
      return {
        category: "amenities",
        desiredAction: undefined,
        intentConfidence: 0.97,
        intentSource: "heuristic",
        promptKey: "arrivals_transport",
        messages: [],
      };
    }
    if (/(pago|pagos|pagar|medio(?:s)? de pago|tarjeta|tarjetas|d[eé]bito|cr[eé]dito|facturaci[oó]n|factura|invoice|billing|cobro|cobrar)/i.test(t)) {
      return {
        category: "billing",
        desiredAction: undefined,
        intentConfidence: 0.98,
        intentSource: "heuristic",
        promptKey: "payments_and_billing",
        messages: [],
      };
    }
    if (/(whats?app|contacto|cont[aá]ctar|tel[eé]fono|telefono|llamar|email|correo|soporte|support)/i.test(t)) {
      return {
        category: "support",
        desiredAction: undefined,
        intentConfidence: 0.98,
        intentSource: "heuristic",
        promptKey: "contact_support",
        messages: [],
      };
    }
    if (/(\bdesayuno\b|breakfast|desayunar)/i.test(t)) {
      return {
        category: "amenities",
        desiredAction: undefined,
        intentConfidence: 0.97,
        intentSource: "heuristic",
        promptKey: "breakfast_bar",
        messages: [],
      };
    }
    // Desvío fuerte solo para info general: mascotas/pets, ubicación/dirección/location, servicios/amenities
    const isGeneralInfoSwitch =
      /\b(piscina|desayuno|parking|estacionamiento|spa|gym|gimnasio|amenities|servicios(\s+principales)?)\b/.test(t) ||
      /\b(mascotas?|pet(s)?|animal(es)?)\b/.test(t) ||
      /\b(ubicaci[oó]n|direccion|direcci[oó]n|address|ubicados?|location)\b/.test(t);
    // Otros desvíos (cancel, billing, soporte) no deben ir a kb_general; se dejan caer para recomputar categoría más abajo
    const isOtherHardSwitch =
      /\b(cancel|cancelar|anular)\b/.test(t) ||
      /\b(factura|invoice|cobro|billing)\b/.test(t) ||
      /\b(soporte|ayuda|problema|support)\b/.test(t);
    if (isGeneralInfoSwitch) {
      return {
        category: "retrieval_based",
        desiredAction: undefined,
        intentConfidence: 0.96,
        intentSource: "heuristic",
        promptKey: "kb_general",
        messages: [],
      };
    }
    if (!isOtherHardSwitch) {
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
      const forcedPK = llmC.promptKey ?? (looksRoomInfo(normalizedMessage) ? "room_info" : undefined);
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

/* ========================= * HANDLERS * ========================= */
// Handler genérico para reservas: crea/actualiza según datos y contexto
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
  // Snapshot persistido + turn
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
      numGuests: merged.numGuests ? parseInt(String(merged.numGuests), 10) : undefined,
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
      reservationSlots: completeSnapshot,
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
    numGuests: String((completed as unknown as { guests?: number }).guests ?? completed.numGuests ?? ""),
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
// Multilenguaje + RAG: cancelar se apoya en docs de reserva (ej: políticas de cancelación)
async function handleCancelReservationNode(state: typeof GraphState.State) {
  const originalLang = state.detectedLanguage ?? "es";
  const hotelLang = await getHotelNativeLanguage(state.hotelId);
  const norm = (v: string) => (v || "").slice(0, 2).toLowerCase();
  const orig2 = norm(originalLang) as "es" | "en" | "pt" | string;
  const hotel2 = norm(hotelLang) as "es" | "en" | "pt" | string;
  const retrievalLang: "es" | "en" | "pt" = (["es", "en", "pt"] as const).includes(orig2 as any)
    ? (orig2 as any)
    : ((["es", "en", "pt"].includes(hotel2) ? (hotel2 as any) : "es"));
  const userQuery = state.normalizedMessage || "";
  const hotelId = state.hotelId || "hotel999";
  // Usar la categoría del grafo 'cancel_reservation' para recuperar políticas/detalles
  const filters = {
    category: "cancel_reservation",
    promptKey: state.promptKey ?? undefined,
  } as const;
  debugLog("[cancel_reservation] langs", {
    lang_in: originalLang,
    lang_retrieval: retrievalLang,
    lang_out: originalLang,
  });
  let text = "";
  try {
    const docs = await searchFromAstra(userQuery, hotelId, filters, retrievalLang);
    const retrieved = (docs || []).join("\n\n");
    if (!retrieved) {
      // Fallback a playbooks del sistema si no hay RAG
      const lang = (originalLang || "es").slice(0, 2);
      const map = await getSystemPlaybooks(["ambiguity_policy"], lang);
      const sys = [
        "Eres un recepcionista de hotel. Política: nunca cancela sin confirmación explícita del huésped.",
        map["ambiguity_policy"]?.text ? `\n[ambiguity_policy]\n${map["ambiguity_policy"].text}\n` : "",
        `Responde en ${lang}, breve y amable.`,
      ].join("\n");
      const out = await new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 }).invoke([
        new SystemMessage(sys),
        new HumanMessage(`Usuario: """${userQuery}"""`),
      ]);
      text = typeof out.content === "string" ? out.content.trim() : String(out.content);
    } else {
      const key = state.promptKey ?? undefined;
      const prompt = (key && curatedPrompts[key]) || defaultPrompt;
      const finalPrompt = prompt
        .replace("{{retrieved}}", retrieved)
        .replace("{{query}}", userQuery);
      const out = await new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 }).invoke([
        new SystemMessage(finalPrompt),
        new HumanMessage(userQuery),
      ]);
      text = typeof out.content === "string" ? out.content.trim() : String(out.content);
    }
  } catch (e) {
    console.warn("[cancel_reservation] RAG error:", (e as any)?.message || e);
    text =
      orig2 === "pt"
        ? "Posso ajudar com o cancelamento. Preciso do código da reserva, nome completo e datas. Confirma?"
        : orig2 === "en"
          ? "I can help with cancellation. I need your booking code, full name, and dates. Can you confirm?"
          : "Puedo ayudarte con la cancelación. Necesito el código de reserva, nombre completo y fechas. ¿Me confirmás?";
  }
  const responseToUser = await translateIfNeeded(text, retrievalLang, originalLang);
  return {
    messages: [new AIMessage(responseToUser || text)],
    category: "cancel_reservation",
  };
}
// Formateo la función handleAmenitiesNode para que cada bloque, condición y return estén en líneas independientes y sea legible.
async function handleAmenitiesNode(state: typeof GraphState.State) {
  const originalLang = state.detectedLanguage ?? "es";
  const hotelLang = await getHotelNativeLanguage(state.hotelId);
  const norm = (v: string) => (v || "").slice(0, 2).toLowerCase();
  const orig2 = norm(originalLang) as "es" | "en" | "pt" | string;
  const hotel2 = norm(hotelLang) as "es" | "en" | "pt" | string;
  const retrievalLang: "es" | "en" | "pt" = (["es", "en", "pt"] as const).includes(orig2 as any)
    ? (orig2 as any)
    : ((["es", "en", "pt"].includes(hotel2) ? (hotel2 as any) : "es"));
  const userQuery = state.normalizedMessage || "";
  const hotelId = state.hotelId || "hotel999";
  const filters = {
    category: "amenities",
    promptKey: state.promptKey ?? undefined,
  } as const;
  debugLog("[amenities] langs", {
    lang_in: originalLang,
    lang_retrieval: retrievalLang,
    lang_out: originalLang,
  });
  let text = "";
  try {
    const docs = await searchFromAstra(userQuery, hotelId, filters, retrievalLang);
    const retrieved = (docs || []).join("\n\n");
    if (!retrieved) {
      text =
        orig2 === "pt"
          ? "Claro! Diga qual serviço você precisa (piscina, café da manhã, estacionamento, etc.) e eu compartilho os detalhes."
          : orig2 === "en"
            ? "Sure! Tell me which amenity you need (pool, breakfast, parking, etc.) and I’ll share the details."
            : "¡Claro! Contame qué servicio querés consultar (piscina, desayuno, cocheras, etc.) y te paso la info.";
    } else {
      const key = state.promptKey ?? undefined;
      const prompt = (key && curatedPrompts[key]) || defaultPrompt;
      const finalPrompt = prompt
        .replace("{{retrieved}}", retrieved)
        .replace("{{query}}", userQuery);
      const out = await new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 }).invoke([
        new SystemMessage(finalPrompt),
        new HumanMessage(userQuery),
      ]);
      text = typeof out.content === "string" ? out.content.trim() : String(out.content);
    }
  } catch (e) {
    console.warn("[amenities] RAG error:", (e as any)?.message || e);
    text =
      orig2 === "pt"
        ? "Conte-me qual amenidade precisa e eu ajudo."
        : orig2 === "en"
          ? "Tell me the amenity you need and I’ll help."
          : "Decime qué servicio querés consultar y te ayudo.";
  }
  const responseToUser = await translateIfNeeded(text, retrievalLang, originalLang);
  return {
    messages: [new AIMessage(responseToUser || text)],
    category: "amenities",
  };
}

async function handleBillingNode(state: typeof GraphState.State) {
  const originalLang = state.detectedLanguage ?? "es";
  const hotelLang = await getHotelNativeLanguage(state.hotelId);
  const norm = (v: string) => (v || "").slice(0, 2).toLowerCase();
  const orig2 = norm(originalLang) as "es" | "en" | "pt" | string;
  const hotel2 = norm(hotelLang) as "es" | "en" | "pt" | string;
  const retrievalLang: "es" | "en" | "pt" = (["es", "en", "pt"] as const).includes(orig2 as any)
    ? (orig2 as any)
    : ((["es", "en", "pt"].includes(hotel2) ? (hotel2 as any) : "es"));
  const userQuery = state.normalizedMessage || "";
  const hotelId = state.hotelId || "hotel999";
  const filters = {
    category: "billing",
    promptKey: state.promptKey ?? undefined,
  } as const;
  debugLog("[billing] langs", {
    lang_in: originalLang,
    lang_retrieval: retrievalLang,
    lang_out: originalLang,
  });
  let text = "";
  try {
    const docs = await searchFromAstra(userQuery, hotelId, filters, retrievalLang);
    const retrieved = (docs || []).join("\n\n");
    if (!retrieved) {
      text =
        orig2 === "pt"
          ? "Posso ajudar com faturamento. É sobre uma reserva existente ou futura?"
          : orig2 === "en"
            ? "Happy to help with billing. Is it about an existing or a future booking?"
            : "Con gusto. ¿Tu consulta de facturación es por una reserva existente o por una futura?";
    } else {
      const key = state.promptKey ?? undefined;
      const prompt = (key && curatedPrompts[key]) || defaultPrompt;
      const finalPrompt = prompt
        .replace("{{retrieved}}", retrieved)
        .replace("{{query}}", userQuery);
      const out = await new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 }).invoke([
        new SystemMessage(finalPrompt),
        new HumanMessage(userQuery),
      ]);
      text = typeof out.content === "string" ? out.content.trim() : String(out.content);
    }
  } catch (e) {
    console.warn("[billing] RAG error:", (e as any)?.message || e);
    text =
      orig2 === "pt"
        ? "Me diga sua dúvida de faturamento e eu ajudo."
        : orig2 === "en"
          ? "Tell me your billing question and I’ll help."
          : "Contame tu duda de facturación y te ayudo.";
  }
  const responseToUser = await translateIfNeeded(text, retrievalLang, originalLang);
  return {
    messages: [new AIMessage(responseToUser || text)],
    category: "billing",
  };
}

async function handleSupportNode(state: typeof GraphState.State) {
  const originalLang = state.detectedLanguage ?? "es";
  const hotelLang = await getHotelNativeLanguage(state.hotelId);
  const norm = (v: string) => (v || "").slice(0, 2).toLowerCase();
  const orig2 = norm(originalLang) as "es" | "en" | "pt" | string;
  const hotel2 = norm(hotelLang) as "es" | "en" | "pt" | string;
  const retrievalLang: "es" | "en" | "pt" = (["es", "en", "pt"] as const).includes(orig2 as any)
    ? (orig2 as any)
    : ((["es", "en", "pt"].includes(hotel2) ? (hotel2 as any) : "es"));
  const userQuery = state.normalizedMessage || "";
  const hotelId = state.hotelId || "hotel999";
  const filters = {
    category: "support",
    promptKey: state.promptKey ?? undefined,
  } as const;
  debugLog("[support] langs", {
    lang_in: originalLang,
    lang_retrieval: retrievalLang,
    lang_out: originalLang,
  });
  let text = "";
  try {
    const docs = await searchFromAstra(userQuery, hotelId, filters, retrievalLang);
    const retrieved = (docs || []).join("\n\n");
    if (!retrieved) {
      text =
        orig2 === "pt"
          ? "Estou aqui para ajudar. Pode descrever brevemente o problema?"
          : orig2 === "en"
            ? "I’m here to help. Could you briefly describe the issue?"
            : "Estoy para ayudarte. ¿Podés contarme brevemente el problema?";
    } else {
      const key = state.promptKey ?? undefined;
      const prompt = (key && curatedPrompts[key]) || defaultPrompt;
      const finalPrompt = prompt
        .replace("{{retrieved}}", retrieved)
        .replace("{{query}}", userQuery);
      const out = await new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 }).invoke([
        new SystemMessage(finalPrompt),
        new HumanMessage(userQuery),
      ]);
      text = typeof out.content === "string" ? out.content.trim() : String(out.content);
    }
  } catch (e) {
    console.warn("[support] RAG error:", (e as any)?.message || e);
    text =
      orig2 === "pt"
        ? "Descreva o problema e eu ajudo."
        : orig2 === "en"
          ? "Describe the issue and I’ll help."
          : "Contame el problema y te ayudo.";
  }
  const responseToUser = await translateIfNeeded(text, retrievalLang, originalLang);
  return {
    messages: [new AIMessage(responseToUser || text)],
    category: "support",
  };
}

async function retrievalBasedNode(state: typeof GraphState.State) {
  return await retrievalBased(state);
}

/* ========================= * GRAPH * ========================= */
const g = new StateGraph(GraphState)
  .addNode("classify", classifyNode)
  .addNode("handle_reservation", handleReservationNode)
  .addNode("handle_reservation_snapshot", handleReservationSnapshotNode)
  .addNode("handle_reservation_verify", handleReservationVerifyNode)
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
    reservation_verify: "handle_reservation_verify",
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
  .addConditionalEdges(
    "confirm_modification",
    (state) => {
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
    },
    {
      modify_reservation_field: "ask_modify_field",
      handle_reservation_snapshot: "handle_reservation_snapshot",
    }
  )
  .addEdge("handle_reservation", "__end__")
  .addEdge("handle_reservation_verify", "__end__")
  .addEdge("handle_cancel_reservation", "__end__")
  .addEdge("handle_amenities", "__end__")
  .addEdge("handle_billing", "__end__")
  .addEdge("handle_support", "__end__")
  .addEdge("handle_retrieval_based", "__end__");

export const agentGraph = g.compile();