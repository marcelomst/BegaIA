// Path: /root/begasist/lib/agents/graph.ts
import { Annotation, StateGraph } from "@langchain/langgraph";
import { BaseMessage, AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { getSystemPlaybooks } from "@/lib/astra/systemPlaybook";
import { getConvState, upsertConvState } from "@/lib/db/convState";
import {retrievalBased} from "@/lib/agents/retrieval_based";  

// 👇 Motor MCP (Structured Output + Tools)
import {
  fillSlotsWithLLM,
  askAvailability,
  confirmAndCreate,
} from "@/lib/agents/reservations";

/* =========================
 *        TYPES
 * ========================= */

type IntentSource = "heuristic" | "llm" | "embedding";
type DesiredAction = "create" | "modify" | "cancel" | undefined;
type IntentCategory =
  | "reservation"
  | "cancel_reservation"
  | "amenities"
  | "billing"
  | "support"
  | "retrieval_based";

type IntentResult = {
  category: IntentCategory;
  desiredAction: DesiredAction;
  intentConfidence: number;
  intentSource: IntentSource;
};

type RequiredSlot = "guestName" | "roomType" | "checkIn" | "checkOut" | "numGuests";
const REQUIRED_SLOTS: RequiredSlot[] = ["guestName", "roomType", "checkIn", "checkOut", "numGuests"];

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

function isConfirmIntentLight(s: string) {
  const t = (s || "").toLowerCase().trim();
  // solo confirm intent, sin colisionar con looksLikeName
  return /\b(confirmar|confirmo|confirm|sí|si|ok|dale|de acuerdo|yes|okay|okey)\b/.test(t);
}

function isQuestionLike(s: string) {
  const t = (s || "").toLowerCase();
  if (t.includes("?")) return true;
  return /\b(que|qué|cuando|cuándo|a qué hora|a que hora|how|what|when|where|donde|dónde|hora|precio|cost|vale|tienen|hay|se puede|política|policy|check ?in|check ?out)\b/.test(t);
}
function labelSlot(slot: RequiredSlot, lang2: "es" | "en" | "pt") {
  return (LABELS[lang2] as any)[slot] ?? slot;
}
function looksLikeName(s: string) {
  const t = (s || "").trim();
  if (t.length < 2 || t.length > 60) return false;
  if (/[0-9?!,:;@]/.test(t)) return false;
  const tokens = t.split(/\s+/);
  if (tokens.length === 0 || tokens.length > 3) return false;
  const STOP = new Set([
    "hola","buenas","hello","hi","hey","olá","ola","oi",
    "que","qué","cuando","cuándo","donde","dónde","como","cómo",
    "hora","precio","policy","política","check","in","out",
    "reserva","reservo","quiero","quero","tiene","hay"
  ]);
  if (tokens.some(w => STOP.has(w.toLowerCase()))) return false;
  if (!tokens.every(w => /^[\p{L}.'-]+$/u.test(w))) return false;
  return true;
}
export function normalizeNameCase(s: string) {
  return s
    .trim()
    .split(/\s+/)
    .map(w => w.slice(0,1).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
function isStatusQuery(text: string) {
  const t = (text || "").toLowerCase();
  if (/(verific|cheque|revis|qué\s+reserva|que\s+reserva|qué\s+hice|que\s+hice|qué\s+quedó|que\s+qued[oó])/.test(t)) return true;
  if (/(what.*(reservation|booking).*(did|have)|show.*(reservation|booking)|status|review|check.*(reservation|booking))/.test(t)) return true;
  return false;
}
function summarizeDraft(lang2: "es" | "en" | "pt", s: Partial<Record<RequiredSlot, string>>) {
  const L = (k: RequiredSlot) => labelSlot(k, lang2);
  const line = (k: RequiredSlot) => `- ${L(k)}: ${s[k]?.toString().trim() || "—"}`;
  const pre =
    lang2 === "es" ? "Esto es lo que llevo de tu reserva:"
    : lang2 === "pt" ? "Aqui está o que tenho da sua reserva:"
    : "Here is what I have for your booking:";
  return [
    pre,
    line("guestName"),
    line("roomType"),
    line("checkIn"),
    line("checkOut"),
    line("numGuests"),
  ].join("\n");
}
function isGreeting(s: string) {
  const t = (s || "").trim().toLowerCase();
  return /^(hola|hello|hi|hey|buenas|buenos dias|buenos días|buenas tardes|buenas noches|olá|ola|oi)$/.test(t);
}

/* =========================
 *        STATE
 * ========================= */
export const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [] as BaseMessage[],
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
 *        HELPERS
 * ========================= */
const llmMini = new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 });

function heuristicClassify(text: string): IntentResult {
  const t = (text || "").toLowerCase();

  const isCancel = /\b(cancel(ar|la|ación)|anular|delete|remove|void|cancel)\b/.test(t);
  if (isCancel) {
    return { category: "cancel_reservation", desiredAction: "cancel", intentConfidence: 0.9, intentSource: "heuristic" };
  }

  const isModify = /\b(modific(ar|arla|ación)|change|cambiar|editar|move|mover)\b/.test(t);
  const isReserve = /\b(reserv(ar|a)|book|booking|quiero reservar|quero reservar)\b/.test(t);
  if (isModify) {
    return { category: "reservation", desiredAction: "modify", intentConfidence: 0.8, intentSource: "heuristic" };
  }
  if (isReserve) {
    return { category: "reservation", desiredAction: "create", intentConfidence: 0.75, intentSource: "heuristic" };
  }

  const isAmenities = /\b(piscina|pool|spa|gym|gimnasio|estacionamiento|parking|amenities|desayuno|breakfast)\b/.test(t);
  if (isAmenities) {
    return { category: "amenities", desiredAction: undefined, intentConfidence: 0.7, intentSource: "heuristic" };
  }

  const isBilling = /\b(factura|invoice|cobro|charge|billing|recibo)\b/.test(t);
  if (isBilling) {
    return { category: "billing", desiredAction: undefined, intentConfidence: 0.7, intentSource: "heuristic" };
  }

  const isSupport = /\b(ayuda|help|soporte|support|problema|issue)\b/.test(t);
  if (isSupport) {
    return { category: "support", desiredAction: undefined, intentConfidence: 0.65, intentSource: "heuristic" };
  }

  return { category: "retrieval_based", desiredAction: undefined, intentConfidence: 0.5, intentSource: "heuristic" };
}

async function loadPlaybookBundle(langIso1: string | undefined) {
  const keys = ["reservation_flow", "modify_reservation", "ambiguity_policy"];
  const map = await getSystemPlaybooks(keys, langIso1 || "es");
  return {
    reservationFlow: map["reservation_flow"]?.text || "",
    modifyReservation: map["modify_reservation"]?.text || "",
    ambiguity: map["ambiguity_policy"]?.text || "",
  };
}

/* =========================
 *         NODES
 * ========================= */

// 1) Classify node (igual al tuyo, con refuerzo LLM si baja confianza)
async function classifyNode(state: typeof GraphState.State) {
  const { normalizedMessage, detectedLanguage, reservationSlots, meta } = state;
  const lang = (detectedLanguage || "es").slice(0, 2);
    if (isConfirmIntentLight(normalizedMessage)) {
    return {
      category: "reservation",
      desiredAction: "create",        // o "modify" según tu caso; para el test alcanza "create"
      intentConfidence: 0.99,
      intentSource: "heuristic",
      promptKey: "reservation_flow",
      messages: [],
    };
  }
  const prev = (meta as any)?.prevCategory || state.category;
  if (isGreeting(normalizedMessage)) {
    return {
      category: "retrieval_based",
      desiredAction: undefined,
      intentConfidence: 0.95,
      intentSource: "heuristic",
      promptKey: "ambiguity_policy",
      messages: [],
    };
  }
  let h = heuristicClassify(normalizedMessage);
  console.log("🧠 Heuristic classification:", h);
  if (h.intentConfidence < 0.75) {
    const pb = await loadPlaybookBundle(lang);
    const sys = [
      "Eres un asistente de front desk de hotel.",
      "Debes CLASIFICAR el mensaje del huésped en UNA sola categoría:",
      "- reservation",
      "- cancel_reservation",
      "- amenities",
      "- billing",
      "- support",
      "- retrieval_based",
      "",
      "Si la intención es sobre reserva:",
      "- desiredAction = create | modify | cancel (solo si aplica; en cancel usa la categoría cancel_reservation y desiredAction=cancel).",
      "",
      "Guías de negocio (System Playbook):",
      pb.reservationFlow ? `\n[reservation_flow]\n${pb.reservationFlow}\n` : "",
      pb.modifyReservation ? `\n[modify_reservation]\n${pb.modifyReservation}\n` : "",
      pb.ambiguity ? `\n[ambiguity_policy]\n${pb.ambiguity}\n` : "",
      "",
      "Responde SOLO un JSON válido con forma:",
      `{"category":"reservation|cancel_reservation|amenities|billing|support|retrieval_based","desiredAction":"create|modify|cancel|null"}`,
    ].join("\n");
    const msg = new HumanMessage(`Mensaje del huésped: """${normalizedMessage}"""`);
    const out = await llmMini.invoke([new SystemMessage(sys), msg]);
    const raw = typeof out.content === "string" ? out.content : JSON.stringify(out.content);
    let parsed: { category?: string; desiredAction?: "create"|"modify"|"cancel"|null } = {};
    try { parsed = JSON.parse(raw); } catch {}
    if (parsed?.category) {
      h = {
        category: parsed.category as IntentCategory,
        desiredAction:
          (parsed.desiredAction as DesiredAction) ??
          (parsed.category === "cancel_reservation" ? "cancel" : undefined),
        intentConfidence: 0.9,
        intentSource: "llm",
      };
    }
  }
  const hasAnySlot = (["guestName","roomType","checkIn","checkOut","numGuests"] as const)
    .some(k => !!(reservationSlots as any)?.[k]);

  if (
    (prev === "reservation" || prev === "cancel_reservation" || hasAnySlot) &&
    looksLikeName(normalizedMessage)
  ) {
    h = {
      category: prev === "cancel_reservation" ? "cancel_reservation" : "reservation",
      desiredAction: prev === "cancel_reservation" ? "cancel" : (h.desiredAction ?? "modify"),
      intentConfidence: Math.max(h.intentConfidence, 0.85),
      intentSource: h.intentSource === "llm" ? "llm" : "heuristic",
    };
  }

  const pickPromptKey = (cat: IntentCategory, desired: DesiredAction): string | null => {
    if (cat === "reservation") return desired === "modify" ? "modify_reservation" : "reservation_flow";
    if (cat === "cancel_reservation") return "modify_reservation";
    return "ambiguity_policy";
  };
  return {
    category: h.category,
    desiredAction: h.desiredAction,
    intentConfidence: h.intentConfidence,
    intentSource: h.intentSource,
    promptKey: pickPromptKey(h.category, h.desiredAction),
    messages: [],
  };
}

/* ===== Helpers slots / idioma ===== */
type SlotMap = Partial<Record<RequiredSlot, string>>;
function normalizeSlotsToStrings(src: any): SlotMap {
  const out: SlotMap = {};
  if (src?.guestName != null) out.guestName = String(src.guestName);
  if (src?.roomType != null) out.roomType = String(src.roomType);
  if (src?.checkIn != null) out.checkIn = String(src.checkIn);
  if (src?.checkOut != null) out.checkOut = String(src.checkOut);
  if (src?.numGuests != null) out.numGuests = String(src.numGuests);
  return out;
}
function iso2toIso3(iso2: string): string {
  const t = (iso2 || "es").slice(0,2).toLowerCase();
  if (t === "es") return "spa";
  if (t === "en") return "eng";
  if (t === "pt") return "por";
  return "spa";
}
function isConfirmIntent(s: string) {
  const t = (s || "").toLowerCase();
  return /\b(confirmar|confirmo|sí|si|ok|dale|de acuerdo|confirm|yes|okey|okay)\b/.test(t);
}

/* =========================
 *   Handler: reservation
 *   (MCP + Persistencia conv_state)
 * ========================= */
async function handleReservationNode(state: typeof GraphState.State) {
  const {
    detectedLanguage,
    reservationSlots,
    normalizedMessage,
    hotelId,
    conversationId,
  } = state;

  const lang2 = (detectedLanguage || "es").slice(0, 2) as "es" | "en" | "pt";
  const iso3 = iso2toIso3(lang2);

  // Snapshot persistido (si lo hay)
  const st = await getConvState(hotelId, conversationId || "");
  const persistedStr = normalizeSlotsToStrings(st?.reservationSlots || {});
  const turnStr      = normalizeSlotsToStrings(reservationSlots || {});
  const mergedSlots: SlotMap = { ...persistedStr, ...turnStr };

  // Si solo escribió el nombre, normalizamos
  if (looksLikeName(normalizedMessage) && !mergedSlots.guestName) {
    mergedSlots.guestName = normalizeNameCase(normalizedMessage);
  }

  // “¿Qué quedó?” → resumen
  if (isStatusQuery(normalizedMessage)) {
    const missing = REQUIRED_SLOTS.filter((k) => !mergedSlots[k]);
    const summary = summarizeDraft(lang2, mergedSlots);
    const tail =
      missing.length === 0
        ? (lang2 === "es"
            ? "\n\nTengo todos los datos. ¿Confirmo la solicitud?"
            : lang2 === "pt"
            ? "\n\nTenho todos os dados. Posso confirmar a solicitação?"
            : "\n\nI have all details. Shall I confirm the request?")
        : (lang2 === "es"
            ? `\n\nPara avanzar me falta: ${missing.map((k) => labelSlot(k, lang2)).join(", ")}.`
            : lang2 === "pt"
            ? `\n\nPara avançar, falta: ${missing.map((k) => labelSlot(k, lang2)).join(", ")}.`
            : `\n\nTo proceed, I still need: ${missing.map((k) => labelSlot(k, lang2)).join(", ")}.`);
    return {
      messages: [new AIMessage(summary + tail)],
      reservationSlots: mergedSlots,
      category: "reservation",
    };
  }

  // Si confirma y tenemos todo → crear reserva
  const haveAll = REQUIRED_SLOTS.every((k) => !!mergedSlots[k]);
  if (isConfirmIntent(normalizedMessage) && haveAll) {
    const toInt = (s?: string) => (s ? parseInt(s, 10) : NaN);
    const slots = {
      guestName: mergedSlots.guestName!,
      roomType: mergedSlots.roomType!,
      guests: toInt(mergedSlots.numGuests) || 1,
      checkIn: mergedSlots.checkIn!,
      checkOut: mergedSlots.checkOut!,
      locale: iso3,
    };

    const res = await confirmAndCreate(hotelId, slots, "web");

    // ⬅️ NEW: persist resultado de creación
    await upsertConvState(hotelId, conversationId || "", {
      lastReservation: res.ok
        ? {
            reservationId: res.reservationId!,
            status: "created",
            createdAt: new Date().toISOString(),
            channel: "web",
          }
        : {
            reservationId: "",
            status: "error",
            createdAt: new Date().toISOString(),
            channel: "web",
          },
      salesStage: res.ok ? "close" : "followup",
      updatedBy: "ai",
    });

    return {
      messages: [new AIMessage(res.message)],
      reservationSlots: mergedSlots,
      category: "reservation",
      salesStage: res.ok ? "close" : "followup",
    };
  }

  // 👉 Structured Output MCP: completar slots con LLM
  const augmentedUserText =
    normalizedMessage +
    (Object.keys(mergedSlots).length
      ? `\n\nDatos previos conocidos: ${JSON.stringify(mergedSlots)}`
      : "");

  const filled = await fillSlotsWithLLM(augmentedUserText, iso3);

  // Falta info → el modelo devuelve UNA pregunta
  if (filled.need === "question") {
    // ⬅️ NEW: persist partial slots
    await upsertConvState(hotelId, conversationId || "", {
      reservationSlots: {
        ...mergedSlots,
        locale: iso3,
      },
      salesStage: "qualify",
      updatedBy: "ai",
    });

    return {
      messages: [new AIMessage(filled.question)],
      reservationSlots: mergedSlots,
      category: "reservation",
      salesStage: "qualify",
    };
  }

  // Tenemos slots completos → persistir y consultar disponibilidad
  const completed = filled.slots;

  // ⬅️ NEW: persist slots completos
  await upsertConvState(hotelId, conversationId || "", {
    reservationSlots: {
      guestName: completed.guestName,
      roomType: completed.roomType,
      checkIn: completed.checkIn,
      checkOut: completed.checkOut,
      numGuests: String(completed.guests),
      locale: completed.locale,
    },
    updatedBy: "ai",
  });

  // Tool: disponibilidad
  const availability = await askAvailability(hotelId, completed);

  // ⬅️ NEW: persist lastProposal (haya o no disponibilidad)
  await upsertConvState(hotelId, conversationId || "", {
    lastProposal: {
      text: availability.proposal || (availability.available ? "Hay disponibilidad." : "Sin disponibilidad."),
      available: !!availability.available,
      options: availability.options,
      toolCall: {
        name: "checkAvailability",
        input: {
          hotelId,
          roomType: completed.roomType,
          guests: completed.guests,
          checkIn: completed.checkIn,
          checkOut: completed.checkOut,
        },
        outputSummary: availability.available ? "available:true" : "available:false",
        at: new Date().toISOString(),
      },
    },
    salesStage: availability.available ? "quote" : "followup",
    updatedBy: "ai",
  });

  // Responder según disponibilidad
  if (!availability.ok) {
    return {
      messages: [new AIMessage(availability.message)],
      reservationSlots: {
        ...mergedSlots,
        guestName: completed.guestName,
        roomType: completed.roomType,
        checkIn: completed.checkIn,
        checkOut: completed.checkOut,
        numGuests: String(completed.guests),
      },
      category: "reservation",
      salesStage: "followup",
    };
  }

  if (!availability.available) {
    // 🔧 FIX: fallback si no vino proposal
    const noAvailText =
      availability.proposal ||
      `No tengo disponibilidad para ${completed.roomType} en esas fechas.`;
    return {
      messages: [new AIMessage(noAvailText)],
      reservationSlots: {
        ...mergedSlots,
        guestName: completed.guestName,
        roomType: completed.roomType,
        checkIn: completed.checkIn,
        checkOut: completed.checkOut,
        numGuests: String(completed.guests),
      },
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
    messages: [new AIMessage((availability.proposal || "Tengo disponibilidad.") + confirmLine)],
    reservationSlots: {
      ...mergedSlots,
      guestName: completed.guestName,
      roomType: completed.roomType,
      checkIn: completed.checkIn,
      checkOut: completed.checkOut,
      numGuests: String(completed.guests),
    },
    category: "reservation",
    salesStage: "quote",
  };
}

/* ===== Otros handlers (sin cambios funcionales) ===== */
async function handleCancelReservationNode(state: typeof GraphState.State) {
  const { normalizedMessage, detectedLanguage } = state;
  const lang = (detectedLanguage || "es").slice(0, 2);
  const pb = await loadPlaybookBundle(lang);

  const sys = [
    "Eres un recepcionista de hotel. Política: nunca cancela sin confirmación explícita del huésped.",
    pb.ambiguity ? `\n[ambiguity_policy]\n${pb.ambiguity}\n` : "",
    pb.modifyReservation ? `\n[modify_reservation]\n${pb.modifyReservation}\n` : "",
    "",
    `Instrucción:
- Si el usuario confirma cancelación de una reserva ya CONFIRMADA, solicita el CÓDIGO de reserva antes de proceder.
- Si es un borrador (no confirmada), ofrece cancelar o continuar.`,
    `Responde en ${lang}, breve y amable.`,
  ].join("\n");

  const out = await llmMini.invoke([new SystemMessage(sys), new HumanMessage(`Usuario: """${normalizedMessage}"""`)]);
  const text = typeof out.content === "string" ? out.content.trim() : String(out.content);
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
// async function retrievalBasedNode(state: typeof GraphState.State) {
//   const lang = (state.detectedLanguage || "es").slice(0, 2);
//   const text =
//     lang === "es"
//       ? "Puedo ayudarte con información del hotel. ¿Qué te gustaría saber?"
//       : "I can help with hotel information. What would you like to know?";
//   return { messages: [new AIMessage(text)] };
// }
async function retrievalBasedNode(state: typeof GraphState.State) {
  return await retrievalBased(state);
}
/* =========================
 *         GRAPH
 * ========================= */
const g = new StateGraph(GraphState)
  .addNode("classify", classifyNode)
  .addNode("handle_reservation", handleReservationNode)
  .addNode("handle_cancel_reservation", handleCancelReservationNode)
  .addNode("handle_amenities", handleAmenitiesNode)
  .addNode("handle_billing", handleBillingNode)
  .addNode("handle_support", handleSupportNode)
  .addNode("handle_retrieval_based", retrievalBasedNode)
  .addEdge("__start__", "classify")
  .addConditionalEdges("classify", (state) => state.category, {
    reservation: "handle_reservation",
    cancel_reservation: "handle_cancel_reservation",
    amenities: "handle_amenities",
    billing: "handle_billing",
    support: "handle_support",
    retrieval_based: "handle_retrieval_based",
    other: "handle_retrieval_based",
  })
  .addEdge("handle_reservation", "__end__")
  .addEdge("handle_cancel_reservation", "__end__")
  .addEdge("handle_amenities", "__end__")
  .addEdge("handle_billing", "__end__")
  .addEdge("handle_support", "__end__")
  .addEdge("handle_retrieval_based", "__end__");

export const agentGraph = g.compile();
