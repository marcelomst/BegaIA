// Path: /root/begasist/lib/agents/classify.ts
import { GraphState } from "@/lib/agents/index.ts";
import { AIMessage, HumanMessage, BaseMessage } from "@langchain/core/messages";
import { getHotelNativeLanguage } from "@/lib/config/hotelLanguage";
import { debugLog } from "../utils/debugLog";
import { translateIfNeeded } from "@/lib/i18n/translateIfNeeded";
import { classifyQuery } from "../classifier";
import { promptMetadata } from "@/lib/prompts";

/* =========================
 *  Heurísticas y utilidades
 * ========================= */

// Consulta explícita por horario de check-in / check-out
export function detectCheckinCheckoutTimeQuery(text: string): "checkin" | "checkout" | null {
  const t = (text || "").toLowerCase();
  const asksTime = /(\bhorario\b|\bhora\b|a qué hora|a que hora|what time|time is|which time|que horas|qual horário|qual horario)/i.test(t);
  if (!asksTime) return null;
  const mentionsCheckin = /(check\s*-?\s*in|\bentrada\b|\bingreso\b)/i.test(t);
  const mentionsCheckout = /(check\s*-?\s*out|\bsalida\b|\begreso\b|\bsaída\b|\bsaida\b)/i.test(t);
  if (mentionsCheckin && !mentionsCheckout) return "checkin";
  if (mentionsCheckout && !mentionsCheckin) return "checkout";
  return mentionsCheckin || mentionsCheckout ? "checkin" : null;
}

function reservationSlotsIncomplete(s?: typeof GraphState.State["reservationSlots"]) {
  if (!s) return true;
  return !(s.guestName && s.roomType && s.checkIn && s.checkOut);
}

const GREETING_RE =
  /^(hola|buenas( tardes| noches)?|buenos dias|buenos días|hello|hi|hey|olá|ola|oi|qué tal|que tal|como va|cómo va)\b/i;

const RESERVATION_INTENT = new RegExp(
  String.raw`\b(?:reserv(ar|a|as|e|o)?|reserva|booking|book|quiero\s+reservar|deseo\s+reservar|hacer\s+una\s+reserva|quero\s+reservar|gostaria\s+de\s+reservar|fazer\s+uma?\s+reserva|preciso\s+de\s+uma?\s+reserva|gostaria\s+de\s+fazer\s+uma?\s+reserva|gostaria\s+de\s+uma?\s+reserva|preciso\s+reservar|I\s+want\s+to\s+book|I\s+would\s+like\s+to\s+book|I\s+need\s+a\s+reservation|I\s+want\s+a\s+reservation|I\s+would\s+like\s+a\s+reservation|make\s+a\s+reservation|need\s+to\s+book|need\s+a\s+reservation)\b`,
  "i"
);

const DATE_ISO = /\b\d{4}-\d{2}-\d{2}\b/;
const ROOM_RE = /suite|matrimonial|doble|triple|individual|single|double|twin|queen|king|deluxe|standard|hab(itación)?/i;

// Bloques de intención (antes duplicados en graph.ts)
const RE_TRANSPORT = /(aeroporto|aeropuerto|airport|traslados?|transfer|taxi|remis|bus|ônibus|omnibus|colectivo|metro|subte)/i;
const RE_BILLING = /(pago|pagos|pagar|pagamento|meio(?:s)? de pagamento|tarjeta|tarjetas|cartão|cartões|d[eé]bito|cr[eé]dito|facturaci[oó]n|factura|fatura|invoice|billing|cobro|cobrar)/i;
const RE_SUPPORT = /(whats?app|contacto|cont[aá]ctar|contato|tel[eé]fono|telefone|telefono|llamar|ligar|email|correo|soporte|suporte|support)/i;
const RE_BREAKFAST = /(\bdesayuno\b|breakfast|desayunar|café da manhã|caf[ée] da manh[ãa])/i;

const RE_GENERAL_INFO = /\b(mascotas?|pet(s)?|animal(es)?|animais?|ubicaci[oó]n|direccion|direcci[oó]n|address|ubicados?|location|localiza[cç][aã]o|endere[cç]o|piscina|desayuno|breakfast|café da manhã|caf[ée] da manh[ãa]|parking|estacionamiento|spa|gym|gimnasio|gin[aá]sio|amenities|servicios(\s+principales)?|servi[cç]os?)\b/i;

// ¿El asistente venía pidiendo datos de reserva?
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
  const tl = t.toLowerCase();

  if (/[?¿]/.test(tl)) return false;
  if (/(check\s*-?\s*in|check\s*-?\s*out|reserva|reservar|hora|precio|tarifa)/.test(tl)) return false;
  if (/^(hola|buenas|hello|hi|hey)\b/.test(tl)) return false;

  const words = tl.split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;

  return /^[\p{L} .'-]+$/u.test(t) && !/\d/.test(t);
}

/* =========================
 *   API pública de clasif.
 * ========================= */

export type ClassifyResult = {
  category: string;
  promptKey: string | null;
  normalizedMessage: string;
  salesStage: "qualify" | "quote";
};

/**
 * Clasifica una pregunta de usuario a categorías del dominio (reserva, amenities, billing, etc.)
 * Aplica:
 *  - Normalización de idioma (user → idioma nativo hotel)
 *  - “Stickiness” cuando faltan slots o el bot venía pidiendo reserva
 *  - Heurística por keywords para desvíos tempranos
 *  - Fallback a LLM classifier
 */
export async function classifyMessage(
  state: typeof GraphState.State
): Promise<ClassifyResult> {
  const lastUserMessage = (state.messages as BaseMessage[])
    .findLast((m: BaseMessage) => m instanceof HumanMessage) as HumanMessage | undefined;

  const userLang = state.detectedLanguage ?? "es";
  const hotelLang = await getHotelNativeLanguage(state.hotelId);

  const question = typeof lastUserMessage?.content === "string" ? lastUserMessage.content.trim() : "";
  debugLog("❓Pregunta:", question);

  // Normalización a idioma del hotel (para consistencia con RAG/prompts)
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

  const t = normalizedQuestion.toLowerCase();

  // Desvíos determinísticos por keyword (evitan loops)
  if (RE_TRANSPORT.test(t)) {
    return { category: "amenities", promptKey: "arrivals_transport", normalizedMessage: normalizedQuestion, salesStage: "qualify" };
  }
  if (RE_BILLING.test(t)) {
    return { category: "billing", promptKey: "payments_and_billing", normalizedMessage: normalizedQuestion, salesStage: "qualify" };
  }
  if (RE_SUPPORT.test(t)) {
    return { category: "support", promptKey: "contact_support", normalizedMessage: normalizedQuestion, salesStage: "qualify" };
  }
  if (RE_BREAKFAST.test(t)) {
    return { category: "amenities", promptKey: "breakfast_bar", normalizedMessage: normalizedQuestion, salesStage: "qualify" };
  }

  // Stickiness hacia reservation cuando faltan slots y hay indicios
  if (reservationSlotsIncomplete(state.reservationSlots) && !GREETING_RE.test(question)) {
    const aiPromptedReservation = recentAssistantAskedReservation(state.messages);
    const hintName = !RESERVATION_INTENT.test(normalizedQuestion) && looksLikeName(normalizedQuestion);
    const hintDatesOrRoom = DATE_ISO.test(normalizedQuestion) || ROOM_RE.test(normalizedQuestion) || RESERVATION_INTENT.test(normalizedQuestion);

    if (aiPromptedReservation || hintName || hintDatesOrRoom) {
      debugLog("🧲 Sticky → forzando categoría 'reservation' (faltan slots).");
      const salesStage = (DATE_ISO.test(normalizedQuestion) || ROOM_RE.test(normalizedQuestion)) ? "quote" : "qualify";
      return {
        category: "reservation",
        promptKey: "reservation_flow",
        normalizedMessage: normalizedQuestion,
        salesStage,
      };
    }
  }

  // Clasificación por modelo (promptKey validado por metadata)
  let category = "retrieval_based";
  let promptKey: string | null = null;
  try {
    const cls = await classifyQuery(normalizedQuestion, state.hotelId);
    debugLog("🔀 Clasificación detectada:", cls);
    category = cls.category || "retrieval_based";
    const validPromptKeys = promptMetadata[category] || [];
    promptKey = validPromptKeys.includes(cls.promptKey || "") ? (cls.promptKey as string) : null;
  } catch (e) {
    console.error("❌ Error clasificando la consulta:", e);
  }

  const salesStage = (DATE_ISO.test(normalizedQuestion) || ROOM_RE.test(normalizedQuestion)) ? "quote" : "qualify";

  return {
    category,
    promptKey,
    normalizedMessage: normalizedQuestion,
    salesStage,
  };
}
