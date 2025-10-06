
// Path: /root/begasist/lib/handlers/messageHandler.ts
import type { ChannelMessage, ChannelMode } from "@/types/channel";
import {
  getMessagesByConversation,
  type MessageDoc,
  saveChannelMessageToAstra,
} from "@/lib/db/messages";
import { agentGraph } from "@/lib/agents";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { channelMemory } from "@/lib/services/channelMemory";
import { getOrCreateConversation } from "@/lib/db/conversations";
import { getGuest, createGuest, updateGuest } from "@/lib/db/guests";
import { getConvState, upsertConvState, CONVSTATE_VERSION } from "@/lib/db/convState";
import type { ReservationSlots as DbReservationSlots } from "@/lib/db/convState";
import crypto from "crypto";

// === NEW: Structured Prompt (enriquecedor + fallback) ===
import { ChatOpenAI } from "@langchain/openai";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";

// Playbooks de sistema
import {
  buildSystemInstruction,
  choosePlaybookKey,
  type ConversationState,
} from "@/lib/agents/systemInstructions";

// Auditoría (preLLM / postLLM)
import { preLLMInterpret } from "@/lib/audit/preLLM";
import { verdict as auditVerdict } from "@/lib/audit/compare";
import { intentConfidenceByRules, slotsConfidenceByRules } from "@/lib/audit/confidence";
import type { Interpretation, SlotMap } from "@/types/audit";
import { extractSlotsFromText, isSafeGuestName, extractDateRangeFromText, localizeRoomType } from "@/lib/agents/helpers";
import { debugLog } from "@/lib/utils/debugLog";
import { askAvailability } from "@/lib/agents/reservations";
type ReservationSlotsStrict = SlotMap;

// ----------------------
const CONFIG = {
  GRAPH_TIMEOUT_MS: 400000,
  HISTORY_LIMIT: 8,
  SUPERVISE_LOW_CONF_INTENT: 0.35,
  SENSITIVE_CATEGORIES: new Set([
    "cancel_reservation",
    "modify_reservation",
    "payment_required",
    "collect_sensitive_data",
  ]),
  // Categorías consideradas "seguras" para no forzar supervisión por handoff estructurado
  SAFE_AUTOSEND_CATEGORIES: new Set([
    "reservation_snapshot",
    "reservation_verify",
    "retrieval_based",
    "checkin_info",
    "checkout_info",
    "amenities_info",
    "directions_info",
  ]),
  // NEW: modelo liviano para structured fallback
  STRUCTURED_MODEL: process.env.STRUCTURED_MODEL || "gpt-4o-mini",
  STRUCTURED_ENABLED: process.env.STRUCTURED_ENABLED !== "false",

};
// ----------------------

const IS_TEST = false;
export const MH_VERSION = "mh-2025-09-23-structured-01";
console.log("[messageHandler] loaded:", MH_VERSION);
console.log("[messageHandler] using convState:", CONVSTATE_VERSION);
// Combina modos de canal y guest: si alguno es supervised → supervised
function combineModes(a?: ChannelMode, b?: ChannelMode): ChannelMode {
  return (a === "supervised" || b === "supervised") ? "supervised" : "automatic";
}

function isSafeAutosendCategory(cat?: string | null): boolean {
  if (!cat) return false;
  return CONFIG.SAFE_AUTOSEND_CATEGORIES.has(cat as any);
}


// ---------- helpers locales ----------

// Toggle global para controlar si se usan preLLM/posLLM o solo bodyLLM
export let USE_PRELLM_POSLLM = true;
export function setUsePrePosLLM(val: boolean) { USE_PRELLM_POSLLM = val; }
// Inicializa contexto objetivo para bodyLLM directo (sin heurística)
async function getObjectiveContext(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }) {
  const now = safeNowISO();
  msg.messageId ||= crypto.randomUUID();
  msg.role ||= "user";
  msg.timestamp ||= now;
  msg.direction ||= "in";

  // --- Guest
  const guestId = msg.guestId ?? msg.sender ?? "guest";
  let guest = await getGuest(msg.hotelId, guestId);
  if (!guest) {
    guest = { guestId, hotelId: msg.hotelId, name: "", mode: options?.mode ?? "automatic", createdAt: now, updatedAt: now };
    await createGuest(guest);
  } else {
    await updateGuest(msg.hotelId, guestId, { updatedAt: now });
  }
  msg.guestId = guestId;

  // --- Conversation
  const conversationId = msg.conversationId || `${msg.hotelId}-${msg.channel}-${guestId}`;
  await getOrCreateConversation({ conversationId, hotelId: msg.hotelId, guestId, channel: msg.channel, startedAt: now, lastUpdatedAt: now, status: "active", subject: "" });
  msg.conversationId = conversationId;

  // Idempotencia entrante por sourceMsgId
  if (msg.direction === "in" && msg.sourceMsgId) {
    const existing = await getMessagesByConversation({ hotelId: msg.hotelId, conversationId, limit: 50 })
      .then(arr => arr.find(d => (d as any).direction === "in" && (d as any).sourceMsgId === msg.sourceMsgId));
    if (existing) { console.log("🔁 [idempotency] ya existe ese sourceMsgId → corto"); throw new Error("idempotent"); }
  }

  // Persist incoming
  if (!options?.skipPersistIncoming) await saveChannelMessageToAstra(msg);
  channelMemory.addMessage(msg);

  // === Estado previo de la conversación
  const st = await getConvState(msg.hotelId, conversationId);
  const prevCategory = st?.lastCategory ?? null;
  const prevSlotsStrict = toStrictSlots(st?.reservationSlots);
  console.log("🧷 [conv-state] loaded:", { conv: conversationId, prevCategory, prevSlots: prevSlotsStrict });

  // === Contexto para el LLM (historial reciente)
  const rawLang = (msg.detectedLanguage || "es").toLowerCase();
  const lang = (["es", "en", "pt"].includes(rawLang) ? rawLang : "es") as "es" | "en" | "pt";
  const recent = await getRecentHistorySafe(msg.hotelId, msg.channel, conversationId, CONFIG.HISTORY_LIMIT);
  const lcHistory = recent.map(toLC).filter(Boolean) as (HumanMessage | AIMessage)[];
  // --- Novedad: slots del turno actual (pre-LLM) → evitar re-preguntas
  const turnSlots = extractSlotsFromText(String(msg.content || ""), lang);
  const currSlots: ReservationSlotsStrict = { ...(prevSlotsStrict || {}), ...(turnSlots || {}) };
  console.log('[DEBUG-numGuests] currSlots:', JSON.stringify(currSlots));
  return { guest, conversationId, st, prevCategory, prevSlotsStrict, lang, lcHistory, currSlots };
}
function safeNowISO() { return new Date().toISOString(); }

function computeInModifyMode(
  st: any,
  currSlots: ReservationSlotsStrict,
  userText: string
): boolean {
  const prevWasModify = st?.lastCategory === "modify_reservation" || st?.lastCategory === "modify";
  const mentionsModify = /(modific|cambi|alter|mudar|change|update|editar|edit|corrig|fechas|fecha|dates|date)/i.test(userText || "");
  const hasDraft = Boolean(currSlots?.guestName || currSlots?.roomType || currSlots?.checkIn || currSlots?.checkOut || currSlots?.numGuests);
  const hasConfirmed = st?.salesStage === "close";
  const hasDraftOrConfirmed = hasDraft || hasConfirmed;
  return Boolean(prevWasModify || (hasDraftOrConfirmed && mentionsModify));
}

/** Extrae texto de content (LangChain puede devolver string o array de bloques) */
function extractTextFromLCContent(content: any): string {
  if (!content) return "";
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content.map((b) => (typeof b === "string" ? b : b?.text || b?.content || ""))
      .filter(Boolean).join("\n").trim();
  }
  if (typeof content?.text === "string") return content.text.trim();
  return "";
}

async function getRecentHistorySafe(
  hotelId: string,
  channel: ChannelMessage["channel"],
  conversationId: string,
  limit = CONFIG.HISTORY_LIMIT
): Promise<ChannelMessage[]> {
  try { return await getRecentHistory(hotelId, channel, conversationId, limit); }
  catch (err) { console.error("⚠️ getRecentHistory fallback [] por error:", err); return []; }
}

function toStrictSlots(slots?: DbReservationSlots | null): ReservationSlotsStrict {
  return {
    guestName: slots?.guestName,
    roomType: slots?.roomType,
    checkIn: slots?.checkIn,
    checkOut: slots?.checkOut,
    numGuests: slots?.numGuests != null ? String(slots?.numGuests) : undefined,
  };
}

function toLC(msg: ChannelMessage) {
  const txt = String(msg.content || msg.suggestion || "").trim();
  if (!txt) return null;
  if (msg.role === "ai" || msg.sender === "assistant") return new AIMessage(txt);
  return new HumanMessage(txt);
}

function sortAscByTimestamp<T extends { timestamp?: string }>(a: T, b: T) {
  const ta = new Date(a.timestamp || 0).getTime();
  const tb = new Date(b.timestamp || 0).getTime();
  return ta - tb;
}

async function getRecentHistory(
  hotelId: string,
  channel: ChannelMessage["channel"],
  conversationId: string,
  limit = CONFIG.HISTORY_LIMIT
): Promise<ChannelMessage[]> {
  const arr: MessageDoc[] = await getMessagesByConversation({
    hotelId, conversationId, limit: Math.max(limit * 3, 24),
  });

  const normalized: ChannelMessage[] = arr.map((d) => ({
    messageId: d.messageId,
    hotelId: d.hotelId,
    channel: d.channel as ChannelMessage["channel"],
    sender: (d as any).sender ?? "Usuario",
    content: d.content ?? "",
    suggestion: d.suggestion ?? "",
    approvedResponse: d.approvedResponse,
    respondedBy: d.respondedBy,
    status: d.status as ChannelMessage["status"],
    timestamp: d.timestamp ?? "",
    time: (d as any).time,
    role: (d as any).role,
    conversationId: d.conversationId ?? undefined,
    guestId: (d as any).guestId,
    detectedLanguage: (d as any).detectedLanguage,
  }));

  return normalized.filter((m) => m.channel === channel)
    .sort(sortAscByTimestamp).slice(-limit);
}

/** Timeout defensivo para el grafo */
async function withTimeout<T>(p: Promise<T>, ms: number, label = "graph"): Promise<T> {
  let t: any;
  const timeout = new Promise<never>((_, rej) => {
    t = setTimeout(() => rej(new Error(`[${label}] timeout ${ms}ms`)), ms);
  });
  try { return await Promise.race([p, timeout]); }
  finally { clearTimeout(t); }
}

/** Emite por adapter si está; si no, por SSE directo */
async function emitReply(conversationId: string, text: string, sendReply?: (reply: string) => Promise<void>) {
  if (sendReply) { await sendReply(text); }
  else {
    const { emitToConversation } = await import("@/lib/web/eventBus");
    emitToConversation(conversationId, { type: "message", sender: "assistant", text, timestamp: safeNowISO() });
    console.log("📡 [reply] fallback SSE directo (sin adapter)");
  }
}

/** Fallback determinista muy simple si el grafo falla o no devuelve texto */
function ruleBasedFallback(lang: string, userText: string): string {
  const t = (userText || "").toLowerCase();
  const es = lang.startsWith("es"), pt = lang.startsWith("pt");
  const wantsReservation = /reserv|book|quero reservar|quiero reservar/.test(t);
  if (wantsReservation) {
    return es
      ? "Para avanzar con tu reserva necesito: nombre del huésped, tipo de habitación, fecha de check-in y fecha de check-out. ¿Me lo compartís?"
      : pt
        ? "Para prosseguir com a sua reserva preciso: nome do hóspede, tipo de quarto, data de check-in e check-out. Pode me enviar?"
        : "To proceed with your booking I need: guest name, room type, check-in date and check-out date. Could you share them?";
  }
  return es ? "¿En qué puedo ayudarte?"
    : pt ? "Em que posso ajudar?"
      : "How can I help you?";
}

/** NLU mínima para elegir playbook */
function detectIntent(
  userText: string,
  state: Pick<ConversationState, "draft" | "confirmedBooking">
): "reservation" | "modify" | "ambiguous" {
  const t = (userText || "").toLowerCase();
  const asksModify = /(modific|cambi|alter|mudar|change|update|editar|edit|corrig)/.test(t) || /(cancel|anul|dar de baja)/.test(t);
  const asksReserve = /(reserv|book|quero reservar|quiero reservar|hacer una reserva|fazer uma reserva)/.test(t);
  if (asksModify) return "modify";
  if (asksReserve) return "reservation";
  if (state?.draft && /(esa|mi|minha)\s+reserva|that booking/.test(t)) return "modify";
  return "ambiguous";
}

// === NEW: mapping structured intent → category (coherencia interna)
function mapStructuredIntentToCategory(
  intent:
    | "general_question"
    | "reservation_inquiry"
    | "checkin_info"
    | "checkout_info"
    | "amenities_info"
    | "pricing_request"
    | "cancellation_policy"
    | "location_directions"
    | "out_of_scope"
): string {
  switch (intent) {
    case "reservation_inquiry": return "reservation";
    case "cancellation_policy": return "cancel_reservation";
    case "pricing_request": return "pricing_info";
    case "checkin_info": return "checkin_info";
    case "checkout_info": return "checkout_info";
    case "amenities_info": return "amenities_info";
    case "location_directions": return "directions_info";
    case "general_question": return "retrieval_based";
    case "out_of_scope": return "out_of_scope";
    default: return "retrieval_based";
  }
}

// === NEW: intentar structured prompt (enriquecedor/fallback)
async function tryStructuredAnalyze(params: {
  hotelId: string;
  lang: "es" | "en" | "pt";
  channel: string;
  userQuery: string;
}): Promise<null | {
  answer: string;
  intent:
  | "general_question"
  | "reservation_inquiry"
  | "checkin_info"
  | "checkout_info"
  | "amenities_info"
  | "pricing_request"
  | "cancellation_policy"
  | "location_directions"
  | "out_of_scope";
  entities?: { checkin_date?: string; checkout_date?: string; guests?: number; room_type?: string; channel?: string; };
  actions?: { type: string; detail: string }[];
  handoff?: boolean;
  missing_fields?: Array<"checkin_date" | "checkout_date" | "guests" | "room_type" | "contact">;
  language?: "es" | "en" | "pt";
}> {
  try {
    const hotel = await getHotelConfig(params.hotelId).catch(() => null);
    const model = new ChatOpenAI({
      model: CONFIG.STRUCTURED_MODEL,
      temperature: 0.2,
    });

    const servicesText =
      (hotel?.reservations?.forceCanonicalQuestion ? "- Pregunta canónica activa\n" : "") +
      (hotel?.hotelName ? `- Nombre: ${hotel.hotelName}\n` : "") +
      (hotel?.country ? `- País: ${hotel.country}\n` : "");

    // Construyo prompt como string plano (puedes ajustar si quieres usar ChatPromptTemplate)
    const formatInstructions = `Responde solo en JSON válido con la siguiente estructura: { answer: string, intent: string, entities: object, actions: array, handoff: boolean, missing_fields: array, language: string }`;
    const prompt = `Eres un asistente virtual de un hotel.\nDebes responder SIEMPRE en el idioma: ${params.lang}.\nSé cordial, breve y profesional. No inventes datos.\n\nContexto del hotel:\n- Nombre: ${hotel?.hotelName || "Hotel"}\n- Dirección: ${hotel?.address || hotel?.city || ""}\n- Servicios: ${servicesText || "- "}\n\nReglas del dominio:\n- Si el usuario consulta por reservas, solicita (si faltan): fechas (check-in y check-out), cantidad de huéspedes y tipo de habitación.\n- En check-in/check-out, informa horarios y requisitos conocidos.\n- En amenities/servicios, responde con lo disponible en el contexto.\n- Si no hay información suficiente o es un caso operacional (precio final, políticas personalizadas, gestión compleja), marca \"handoff\": true y sugiere \"notify_reception\".\n- Si la consulta está fuera del dominio hotelero, clasifica \"intent\": \"out_of_scope\", responde con cortesía y no inventes.\n\nFormato de salida: ${formatInstructions}\n\nCanal: ${params.channel}\nUsuario: ${params.userQuery}`;

    // Usa .withStructuredOutput() para obtener la respuesta validada por Zod
    // Convierte el Zod schema a JSON Schema puro para evitar el error de response_format
    // JSON Schema plano para el output estructurado (evita bug de zod-to-json-schema)
    const hotelAssistantJsonSchema = {
      type: "object",
      properties: {
        answer: { type: "string", description: "Respuesta final al usuario en lenguaje natural." },
        intent: {
          type: "string",
          enum: [
            "general_question",
            "reservation_inquiry",
            "checkin_info",
            "checkout_info",
            "amenities_info",
            "pricing_request",
            "cancellation_policy",
            "location_directions",
            "out_of_scope"
          ],
          description: "Intención principal inferida."
        },
        entities: {
          type: "object",
          properties: {
            checkin_date: { type: "string", description: "Fecha de check-in en ISO-8601 si se menciona.", nullable: true },
            checkout_date: { type: "string", description: "Fecha de check-out en ISO-8601 si se menciona.", nullable: true },
            guests: { type: "number", description: "Cantidad de huéspedes si se menciona.", nullable: true },
            room_type: { type: "string", description: "Tipo de habitación si se menciona.", nullable: true },
            channel: { type: "string", description: "Canal de origen (web, whatsapp, email) si aplica.", nullable: true }
          },
          additionalProperties: false,
          description: "Entidades relevantes detectadas."
        },
        actions: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: [
                  "collect_missing_info",
                  "create_reservation_draft",
                  "send_policy_info",
                  "notify_reception",
                  "no_action"
                ],
                description: "Tipo de acción sugerida."
              },
              detail: { type: "string", description: "Detalle textual para logs / operator." }
            },
            required: ["type", "detail"],
            additionalProperties: false
          },
          description: "Acciones recomendadas tras analizar la consulta."
        },
        handoff: { type: "boolean", description: "true si debe intervenir un humano." },
        missing_fields: {
          type: "array",
          items: {
            type: "string",
            enum: ["checkin_date", "checkout_date", "guests", "room_type", "contact"]
          },
          description: "Campos que faltan para completar la gestión."
        },
        language: {
          type: "string",
          enum: ["es", "en", "pt"],
          description: "Idioma usado en la respuesta."
        }
      },
      required: ["answer", "intent", "entities", "actions", "handoff", "missing_fields", "language"],
      additionalProperties: false
    };
    const structuredLlm = model.withStructuredOutput(hotelAssistantJsonSchema);
    const result = await structuredLlm.invoke(prompt);
    return result as any;
  } catch (e) {
    console.warn("[structured] fallback/analysis error:", (e as any)?.message || e);
    return null;
  }
}


// *************************************************
const convQueues = new Map<string, Promise<any>>();
function runQueued<T>(convId: string, fn: () => Promise<T>): Promise<T> {
  const prev = convQueues.get(convId) || Promise.resolve();
  const next = prev.then(fn, fn);
  // Store a handled promise to avoid unhandled rejection warnings while preserving propagation to the caller
  const handled = next.then(
    (val) => {
      if (convQueues.get(convId) === handled || convQueues.get(convId) === next) {
        convQueues.delete(convId);
      }
      return val;
    },
    (err) => {
      if (convQueues.get(convId) === handled || convQueues.get(convId) === next) {
        convQueues.delete(convId);
      }
      // Swallow rejection for the stored promise to prevent global unhandled rejection,
      // but let the original `next` (returned) carry the rejection to the caller.
      return undefined as any;
    }
  );
  convQueues.set(convId, handled);
  return next;
}
// *************************************************

// === División en preLLM, bodyLLM, posLLM ===
type PreLLMResult = {
  lang: "es" | "en" | "pt";
  currSlots: ReservationSlotsStrict;
  prevCategory: string | null;
  prevSlotsStrict: ReservationSlotsStrict;
  st: any;
  stateForPlaybook: ConversationState;
  intent: string;
  inModifyMode: boolean;
  hasDraftOrConfirmed: boolean;
  promptKey: string;
  systemInstruction: string;
  lcHistory: (HumanMessage | AIMessage)[];
  hints: string[];
  draftExists: boolean;
  guest: any;
  conversationId: string;
  msg: ChannelMessage;
  options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; };
};

async function preLLM(msg: ChannelMessage, options?: { sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean; }): Promise<PreLLMResult> {
  const now = safeNowISO();
  debugLog("[preLLM] IN", { msg, options });
  msg.messageId ||= crypto.randomUUID();
  msg.role ||= "user";
  msg.timestamp ||= now;
  msg.direction ||= "in";

  // --- Guest
  const guestId = msg.guestId ?? msg.sender ?? "guest";
  let guest = await getGuest(msg.hotelId, guestId);
  if (!guest) {
    guest = { guestId, hotelId: msg.hotelId, name: "", mode: options?.mode ?? "automatic", createdAt: now, updatedAt: now };
    await createGuest(guest);
  } else {
    await updateGuest(msg.hotelId, guestId, { updatedAt: now });
  }
  msg.guestId = guestId;

  // --- Conversation
  const conversationId = msg.conversationId || `${msg.hotelId}-${msg.channel}-${guestId}`;
  await getOrCreateConversation({ conversationId, hotelId: msg.hotelId, guestId, channel: msg.channel, startedAt: now, lastUpdatedAt: now, status: "active", subject: "" });
  msg.conversationId = conversationId;

  // Idempotencia entrante por sourceMsgId
  if (msg.direction === "in" && msg.sourceMsgId) {
    const existing = await getMessagesByConversation({ hotelId: msg.hotelId, conversationId, limit: 50 })
      .then(arr => arr.find(d => (d as any).direction === "in" && (d as any).sourceMsgId === msg.sourceMsgId));
    if (existing) { console.log("🔁 [idempotency] ya existe ese sourceMsgId → corto"); return Promise.reject("idempotent"); }
  }

  // Persist incoming
  if (!options?.skipPersistIncoming) await saveChannelMessageToAstra(msg);
  channelMemory.addMessage(msg);

  // === Estado previo de la conversación
  const st = await getConvState(msg.hotelId, conversationId);
  const prevCategory = st?.lastCategory ?? null;
  const prevSlotsStrict: ReservationSlotsStrict = toStrictSlots(st?.reservationSlots);
  console.log("🧷 [conv-state] loaded:", { conv: conversationId, prevCategory, prevSlots: prevSlotsStrict });

  // === Contexto para el LLM (historial reciente)
  const rawLang = (msg.detectedLanguage || "es").toLowerCase();
  const lang = (["es", "en", "pt"].includes(rawLang) ? rawLang : "es") as "es" | "en" | "pt";
  const recent = await getRecentHistorySafe(msg.hotelId, msg.channel, conversationId, CONFIG.HISTORY_LIMIT);
  const lcHistory = recent.map(toLC).filter(Boolean) as (HumanMessage | AIMessage)[];

  // --- Novedad: slots del turno actual (pre-LLM) → evitar re-preguntas
  const turnSlots = extractSlotsFromText(String(msg.content || ""), lang);
  // fusionamos: lo nuevo del turno tiene prioridad (si el usuario corrigió algo)
  const currSlots: ReservationSlotsStrict = { ...(prevSlotsStrict || {}), ...(turnSlots || {}) };
  console.log('[DEBUG-numGuests] currSlots:', JSON.stringify(currSlots));

  // Estado compacto para playbook
  const draftExists = !!currSlots.guestName || !!currSlots.roomType || !!currSlots.checkIn || !!currSlots.checkOut || !!currSlots.numGuests;
  // Detecta si hay reserva confirmada en el contexto (usando salesStage === 'close')
  const hasConfirmed = !!(st?.reservationSlots && st?.salesStage === "close");
  // confirmedBooking solo acepta { code?: string }
  const confirmedBooking = hasConfirmed ? { code: "-" } : null;
  const stateForPlaybook: ConversationState = { draft: draftExists ? { ...currSlots } : null, confirmedBooking, locale: lang };
  const intent = detectIntent(String(msg.content || ""), stateForPlaybook);

  // --- NUEVO: modo modificación persistente reforzado ---
  const prevWasModify = st?.lastCategory === "modify_reservation" || st?.lastCategory === "modify";
  const mentionsModify = /(modific|cambi|alter|mudar|change|update|editar|edit|corrig|fechas|fecha|dates|date)/i.test(String(msg.content || ""));
  const hasDraftOrConfirmed = !!(stateForPlaybook.draft || stateForPlaybook.confirmedBooking);
  let inModifyMode = intent === "modify" || prevWasModify;
  if (!inModifyMode && hasDraftOrConfirmed && mentionsModify) {
    inModifyMode = true;
  }

  // Fuerza el playbook de modificación si estamos en modo modificación
  let promptKey = "default";
  if (inModifyMode && hasDraftOrConfirmed) {
    promptKey = "modify_reservation";
  } else {
    try { promptKey = choosePlaybookKey(intent); } catch (e) { console.warn("[playbook] choosePlaybookKey error; using default", e); }
  }
  debugLog("[preLLM] intent detected", { intent, inModifyMode, promptKey });
  let systemInstruction = "";
  try {
    systemInstruction = await buildSystemInstruction({ promptKey, lang, state: stateForPlaybook, hotelId: msg.hotelId });
  } catch (e) {
    console.warn("[playbook] buildSystemInstruction error; using safe fallback", e);
    systemInstruction = lang.startsWith("es")
      ? "Eres un asistente de reservas de hotel. Pide solo lo que falte (check-in, check-out, huéspedes) y no inventes precios ni disponibilidad."
      : lang.startsWith("pt")
        ? "Você é um assistente de reservas de hotel. Peça apenas o que falta (check-in, check-out, hóspedes) e não invente preços nem disponibilidade."
        : "You are a hotel booking assistant. Ask only for missing data (check-in, check-out, guests) and never fabricate prices or availability.";
  }
  debugLog("[preLLM] systemInstruction", systemInstruction);
  // Hints concretos para no volver a pedir datos ya presentes
  const hints: string[] = [];
  if (lang) hints.push(`- No pidas el código de idioma/locale; ya está definido como "${lang}".`);
  if (currSlots.checkIn && currSlots.checkOut) hints.push(`- Ya tenemos fechas: check-in ${currSlots.checkIn} y check-out ${currSlots.checkOut}; no vuelvas a pedirlas, solo reconfirma si hiciera falta.`);
  if (currSlots.roomType) hints.push(`- Ya hay tipo de habitación: ${currSlots.roomType}; no vuelvas a pedir ese dato salvo conflicto.`);
  if (currSlots.numGuests) hints.push(`- Ya hay número de huéspedes: ${currSlots.numGuests}.`);
  if (isSafeGuestName(currSlots.guestName)) hints.push(`- Ya tenemos el nombre del huésped: ${currSlots.guestName}; no lo vuelvas a pedir salvo que el usuario lo corrija.`);

  // Refuerzo: Si estamos en modo modificación, guiar a NO derivar al hotel y a continuar el flujo de modificación
  if (inModifyMode) {
    if (stateForPlaybook.confirmedBooking) {
      const cb = stateForPlaybook.confirmedBooking as any;
      hints.push(
        "- El usuario está modificando una reserva confirmada. Antes de modificar, solicita el CÓDIGO de reserva si no lo tienes. No derives al hotel, sigue el flujo de modificación: pide el código, luego el cambio solicitado, verifica penalidades/diferencias, recapitula y pide confirmación."
      );
      if (String(msg.content || "").toLowerCase().includes("fecha")) {
        hints.push(`- El usuario quiere modificar las fechas de su reserva actual: check-in ${cb.checkIn ?? "(sin dato)"}, check-out ${cb.checkOut ?? "(sin dato)"}. Pregunta por las nuevas fechas.`);
      }
      if (String(msg.content || "").toLowerCase().includes("habitación")) {
        hints.push(`- El usuario quiere modificar el tipo de habitación de su reserva actual: ${cb.roomType ?? "(sin dato)"}. Pregunta por el nuevo tipo de habitación.`);
      }
      if (String(msg.content || "").toLowerCase().includes("nombre")) {
        hints.push(`- El usuario quiere modificar el nombre del huésped de su reserva actual: ${cb.guestName ?? "(sin dato)"}. Pregunta por el nuevo nombre.`);
      }
      if (String(msg.content || "").toLowerCase().includes("huésped")) {
        hints.push(`- El usuario quiere modificar la cantidad de huéspedes de su reserva actual: ${cb.numGuests ?? "(sin dato)"}. Pregunta por la nueva cantidad.`);
      }
      if (["las fechas", "fechas", "cambiar fechas", "modificar fechas"].includes(String(msg.content || "").toLowerCase().trim())) {
        hints.push("- El usuario quiere cambiar las fechas. Pregunta: '¿Cuáles serían las nuevas fechas de check-in y check-out que deseas?' y espera la respuesta.");
      }
    } else if (stateForPlaybook.draft) {
      hints.push(
        "- El usuario está modificando un borrador de reserva. Modifica directamente los campos pedidos, recapitula los cambios y pregunta si confirma. No pidas código ni derives al hotel."
      );
    }
  }
  // Nota: quick intents se manejan en bodyLLM, no en preLLM

  if (hints.length) systemInstruction += `\n\nInstrucciones adicionales para este turno:\n${hints.join("\n")}`;

  return {
    lang,
    currSlots,
    prevCategory,
    prevSlotsStrict,
    st,
    stateForPlaybook,
    intent,
    inModifyMode,
    hasDraftOrConfirmed,
    promptKey,
    systemInstruction,
    lcHistory,
    hints,
    draftExists,
    guest,
    conversationId,
    msg,
    options,
  };
}

// Helper: detectar si recientemente se mostró/confirmó una reserva (para activar detecciones "light")
function hasRecentReservationMention(pre: PreLLMResult): boolean {
  if (pre.st?.lastReservation) return true;
  try {
    const lastAis = [...pre.lcHistory].reverse().filter(m => (m as any)._getType?.() === 'ai').slice(0, 4);
    return lastAis.some(m => /reserva\s+confirmada|booking\s+confirmed|tienes\s+una\s+reserva|you\s+have\s+a\s+confirmed\s+booking/i.test(String((m as any).content || '')));
  } catch { /* noop */ }
  return false;
}
function buildStateSummary(slots: ReservationSlotsStrict, st: any) {
  return [
    "Estado actual de la reserva:",
    slots.guestName ? `- Nombre: ${slots.guestName}` : "",
    slots.roomType ? `- Habitación: ${slots.roomType}` : "",
    slots.checkIn && slots.checkOut ? `- Fechas: ${slots.checkIn} → ${slots.checkOut}` : "",
    slots.numGuests ? `- Huéspedes: ${slots.numGuests}` : "",
    st?.salesStage ? `- Estado: ${st.salesStage === 'close' ? 'confirmada' : st.salesStage}` : "",
  ].filter(Boolean).join("\n");
}

// Ejecuta la verificación de disponibilidad y devuelve un texto listo para enviar
async function runAvailabilityCheck(
  pre: PreLLMResult,
  slots: ReservationSlotsStrict,
  ciISO: string,
  coISO: string
): Promise<{ finalText: string; nextSlots: ReservationSlotsStrict; needsHandoff: boolean }> {
  const snapshot: any = {
    guestName: slots.guestName || pre.st?.reservationSlots?.guestName,
    roomType: slots.roomType || pre.st?.reservationSlots?.roomType,
    numGuests: slots.numGuests || pre.st?.reservationSlots?.numGuests,
    checkIn: ciISO,
    checkOut: coISO,
    locale: pre.lang,
  };
  const availability = await askAvailability(pre.msg.hotelId, snapshot);
  try {
    await upsertConvState(pre.msg.hotelId, pre.conversationId, {
      reservationSlots: snapshot,
      lastProposal: {
        text:
          availability.proposal ||
          (((availability as any).ok === false)
            ? (pre.lang === "es" ? "Problema al consultar disponibilidad." : pre.lang === "pt" ? "Problema ao verificar disponibilidade." : "Issue checking availability.")
            : (availability.available
              ? (pre.lang === "es" ? "Hay disponibilidad." : pre.lang === "pt" ? "Há disponibilidade." : "Availability found.")
              : (pre.lang === "es" ? "Sin disponibilidad." : pre.lang === "pt" ? "Sem disponibilidade." : "No availability."))),
        available: !!availability.available,
        options: availability.options,
        // NEW: persist suggested fields to reuse next turn
        suggestedRoomType: availability?.options?.[0]?.roomType,
        suggestedPricePerNight: typeof availability?.options?.[0]?.pricePerNight === "number" ? availability.options![0]!.pricePerNight : undefined,
        toolCall: {
          name: "checkAvailability",
          input: {
            hotelId: pre.msg.hotelId,
            roomType: snapshot.roomType,
            numGuests: snapshot.numGuests ? parseInt(String(snapshot.numGuests), 10) || 1 : undefined,
            checkIn: snapshot.checkIn,
            checkOut: snapshot.checkOut,
          },
          outputSummary: availability.available ? "available:true" : "available:false",
          at: safeNowISO(),
        },
      },
      salesStage: availability.available ? "quote" : "followup",
      // Derivar a recepción cuando no hay disponibilidad o fallo técnico
      desiredAction: ((availability as any).ok === false || availability.available === false) ? "notify_reception" : (pre.st?.desiredAction),
      updatedBy: "ai",
    } as any);
  } catch (e) {
    console.warn("[runAvailabilityCheck] upsertConvState warn:", (e as any)?.message || e);
  }
  // Si hay opción, armamos propuesta enriquecida con total estimado
  const isError = (availability as any).ok === false;
  let base = availability.proposal ||
    (isError
      ? (pre.lang === "es" ? "Tuve un problema al consultar la disponibilidad." : pre.lang === "pt" ? "Tive um problema ao verificar a disponibilidade." : "I had an issue checking availability.")
      : (availability.available
        ? (pre.lang === "es" ? "Tengo disponibilidad." : pre.lang === "pt" ? "Tenho disponibilidade." : "I have availability.")
        : (pre.lang === "es" ? "No tengo disponibilidad en esas fechas." : pre.lang === "pt" ? "Não tenho disponibilidade nessas datas." : "No availability on those dates.")));

  if (availability.available && Array.isArray(availability.options) && availability.options.length > 0) {
    const opt: any = availability.options[0];
    const nights = Math.max(1, Math.round((new Date(coISO).getTime() - new Date(ciISO).getTime()) / (24 * 60 * 60 * 1000)));
    const perNight = typeof opt.pricePerNight === "number" ? opt.pricePerNight : undefined;
    const currency = String(opt.currency || "").toUpperCase();
    const total = perNight != null ? perNight * nights : undefined;
    const rtLocalized = localizeRoomType(opt.roomType || snapshot.roomType, pre.lang as any);
    if (perNight != null) {
      base = pre.lang === "es"
        ? `Tengo ${rtLocalized} disponible. Tarifa por noche: ${perNight} ${currency}. Total ${nights} noches: ${total} ${currency}.`
        : pre.lang === "pt"
          ? `Tenho ${rtLocalized} disponível. Tarifa por noite: ${perNight} ${currency}. Total ${nights} noites: ${total} ${currency}.`
          : `I have a ${rtLocalized} available. Rate per night: ${perNight} ${currency}. Total ${nights} nights: ${total} ${currency}.`;
    } else {
      base = pre.lang === "es"
        ? `Hay disponibilidad para ${rtLocalized}.`
        : pre.lang === "pt"
          ? `Há disponibilidade para ${rtLocalized}.`
          : `Availability for ${rtLocalized}.`;
    }
  }
  // Si aún no tenemos cantidad de huéspedes o nombre, pedirlos antes de solicitar confirmación
  const needsGuests = !snapshot.numGuests;
  const needsName = !isSafeGuestName(snapshot.guestName || "");
  const actionLine = availability.available
    ? (needsGuests
      ? `\n\n${buildAskGuests(pre.lang)}`
      : (needsName
        ? `\n\n${buildAskGuestName(pre.lang)}`
        : (pre.lang === "es"
          ? "\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”."
          : pre.lang === "pt"
            ? "\n\nConfirma a reserva respondendo “CONFIRMAR”."
            : "\n\nDo you confirm the booking? Reply “CONFIRMAR” (confirm).")))
    : "";
  // Debounce de handoff: evitar duplicado inmediato si ya se dijo en el último mensaje AI
  let handoffLine = "";
  if (availability.available === false || isError) {
    const lastAi = [...pre.lcHistory].reverse().find((m) => m instanceof AIMessage) as AIMessage | undefined;
    const lastText = String(lastAi?.content || "").toLowerCase();
    const alreadyHandoff = /recepcion|receptionist|humano|human|contato|contacto/.test(lastText);
    if (!alreadyHandoff) {
      handoffLine = pre.lang === "es"
        ? "\n\nUn recepcionista se pondrá en contacto con usted a la brevedad."
        : pre.lang === "pt"
          ? "\n\nUm recepcionista entrará em contato com você em breve."
          : "\n\nA receptionist will contact you shortly.";
    }
  }
  const finalText = `${base}${actionLine}${handoffLine}`.trim();
  const nextSlots = { ...slots, checkIn: ciISO, checkOut: coISO } as ReservationSlotsStrict;
  return { finalText, nextSlots, needsHandoff: (availability.available === false || isError) };
}

async function bodyLLM(pre: PreLLMResult): Promise<any> {
  debugLog("[bodyLLM] IN", { pre });
  let finalText = "";
  let nextCategory: string | null = pre.prevCategory;
  let nextSlots: ReservationSlotsStrict = pre.currSlots;
  let needsSupervision = false;
  let graphResult: any = null;
  // Detección rápida: pedido de enviar copia por email
  const userTxtRaw = String(pre.msg.content || "");
  // Pedido de enviar copia por email (soporta 'enviá', 'enviame', 'mandame', etc.)
  const emailAskRE = /((envi|mand)(?:ar|a|á|ame|áme)?\b[^\n]*\b(copia|copy)[^\n]*\b(correo|e-?mail|email))|send\b[^\n]*copy[^\n]*email/i;
  const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
  if (emailAskRE.test(userTxtRaw)) {
    const explicitEmail = userTxtRaw.match(emailRegex)?.[0];
    const email = explicitEmail || undefined;
    if (!email) {
      finalText = pre.lang === "es"
        ? "¿A qué correo te la envío?"
        : pre.lang === "pt"
          ? "Para qual e-mail devo enviar?"
          : "Which email should I send it to?";
      return { finalText, nextCategory: "send_email_copy", nextSlots, needsSupervision, graphResult };
    }
    try {
      const { sendReservationCopy } = await import("@/lib/email/sendReservationCopy");
      const summary = {
        guestName: pre.st?.reservationSlots?.guestName || nextSlots.guestName,
        roomType: pre.st?.reservationSlots?.roomType || nextSlots.roomType,
        checkIn: pre.st?.reservationSlots?.checkIn || nextSlots.checkIn,
        checkOut: pre.st?.reservationSlots?.checkOut || nextSlots.checkOut,
        numGuests: pre.st?.reservationSlots?.numGuests || nextSlots.numGuests,
        reservationId: pre.st?.lastReservation && 'reservationId' in pre.st.lastReservation ? pre.st.lastReservation.reservationId : undefined,
        locale: pre.lang,
      } as any;
      await sendReservationCopy({ hotelId: pre.msg.hotelId, to: email, summary, conversationId: pre.conversationId, channel: pre.msg.channel });
      finalText = pre.lang === "es"
        ? `Listo, te envié una copia por email a ${email}.`
        : pre.lang === "pt"
          ? `Pronto, enviei uma cópia por e-mail para ${email}.`
          : `Done, I sent a copy by email to ${email}.`;
      return { finalText, nextCategory: "send_email_copy", nextSlots, needsSupervision, graphResult };
    } catch (e) {
      console.warn("[email-copy] error:", (e as any)?.message || e);
      needsSupervision = true;
      finalText = pre.lang === "es"
        ? "No pude enviar el correo ahora. Un recepcionista lo hará a la brevedad."
        : pre.lang === "pt"
          ? "Não consegui enviar o e-mail agora. Um recepcionista fará em breve."
          : "I couldn't send the email now. A receptionist will handle it shortly.";
      return { finalText, nextCategory: "send_email_copy", nextSlots, needsSupervision, graphResult };
    }
  }

  // Detección ligera de pedido de envío por email SIN la palabra 'copia',
  // siempre que haya una reserva reciente y el usuario provea un email o lo pida claramente.
  {
    const emailLightRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
    const hasEmailAddr = emailLightRegex.test(userTxtRaw);
    // Verbos comunes de pedir envío + mención a correo/email aunque sin 'copia'
    const lightVerb = /(envi|mand|pas|compart)[a-záéíóú]*|send|mail\s*me/i.test(userTxtRaw);
    const mentionsEmailWord = /correo|e-?mail|email|mail/i.test(userTxtRaw);
    const recentReservationMention = hasRecentReservationMention(pre);
    // Condición: no coincidió el regex estricto anterior, pero hay email en el texto (o se menciona email) + verbo de envío + contexto de reserva
    if (!emailAskRE.test(userTxtRaw) && recentReservationMention && lightVerb && (hasEmailAddr || mentionsEmailWord)) {
      const explicitEmail = userTxtRaw.match(emailLightRegex)?.[0];
      if (!explicitEmail) {
        const ask = pre.lang === 'es'
          ? '¿A qué correo te la envío?'
          : pre.lang === 'pt'
            ? 'Para qual e-mail devo enviar?'
            : 'Which email should I send it to?';
        return { finalText: ask, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };
      }
      try {
        const { sendReservationCopy } = await import('@/lib/email/sendReservationCopy');
        const summary = {
          guestName: pre.st?.reservationSlots?.guestName || nextSlots.guestName,
          roomType: pre.st?.reservationSlots?.roomType || nextSlots.roomType,
          checkIn: pre.st?.reservationSlots?.checkIn || nextSlots.checkIn,
          checkOut: pre.st?.reservationSlots?.checkOut || nextSlots.checkOut,
          numGuests: pre.st?.reservationSlots?.numGuests || nextSlots.numGuests,
          reservationId: pre.st?.lastReservation && 'reservationId' in pre.st.lastReservation ? pre.st.lastReservation.reservationId : undefined,
          locale: pre.lang,
        } as any;
        await sendReservationCopy({ hotelId: pre.msg.hotelId, to: explicitEmail, summary, conversationId: pre.conversationId, channel: pre.msg.channel });
        const ok = pre.lang === 'es'
          ? `Listo, te envié una copia por email a ${explicitEmail}.`
          : pre.lang === 'pt'
            ? `Pronto, enviei uma cópia por e-mail para ${explicitEmail}.`
            : `Done, I sent a copy by email to ${explicitEmail}.`;
        return { finalText: ok, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };
      } catch (e) {
        console.warn('[email-copy-light] error:', (e as any)?.message || e);
        const fail = pre.lang === 'es'
          ? 'No pude enviar el correo ahora. Un recepcionista lo hará a la brevedad.'
          : pre.lang === 'pt'
            ? 'Não consegui enviar o e-mail agora. Um recepcionista fará em breve.'
            : "I couldn't send the email now. A receptionist will handle it shortly.";
        return { finalText: fail, nextCategory: 'send_email_copy', nextSlots, needsSupervision: true, graphResult };
      }
    }
  }

  // Pedido de enviar copia por WhatsApp (cuando el usuario lo pide explícitamente)
  // Regex principal (requiere mención de 'copia' o 'copy')
  const waAskRE = /((envi|mand)[a-záéíóú]*\b[^\n]*\b(copia|copy)[^\n]*\b(whats?app|whas?tapp|wasap|wpp)|pued(?:es|e|o|en|an|ís|es)?\s+enviar\b[^\n]*\b(copia|copy)[^\n]*\b(whats?app|whas?tapp|wasap|wpp)|send\b[^\n]*copy[^\n]*(whats?app|whas?tapp))/i;
  // Soporta más conjugaciones: "enviás", "envias", "mandás", "mandas", y variantes con "podés/podes/puedes enviar"
  // NEW: Detección ligera de "compartir/pasar/mandar" SIN la palabra "copia" cuando el contexto previo tiene una reserva confirmada
  {
    const waLightAskRE = /(compart(?:i(?:r|rla|rme|ime|ila|ila)?|e(?:s|la)?)|pasa(?:la|mela)?|manda(?:la|mela)?|envia(?:la|mela)?|send|share)[^\n]{0,80}?\b(?:por|via|en|no|on)?\s*(whats?app|whas?tapp|wasap|wpp)\b/i;
    const recentReservationMention = hasRecentReservationMention(pre);
    if (!waAskRE.test(userTxtRaw) && waLightAskRE.test(userTxtRaw) && (pre.st?.lastReservation || recentReservationMention)) {
      // Reutilizamos la misma lógica de envío que el bloque principal (duplicada para aislar cambios mínimos)
      const jidFromGuest = (pre.msg.guestId || '').includes('@s.whatsapp.net') ? pre.msg.guestId : undefined;
      const jidFromConv = (pre.conversationId || '').split('whatsapp-')[1];
      const jid = jidFromGuest || (jidFromConv && /@s\.whatsapp\.net$/.test(jidFromConv) ? jidFromConv : undefined);
      if (!jid) {
        const phoneInline = userTxtRaw.match(/(\+?\d[\d\s\-().]{6,}\d)/);
        if (phoneInline) {
          const digitsInline = phoneInline[1].replace(/\D/g, '');
          if (digitsInline.length >= 6) {
            const jidInline = `${digitsInline}@s.whatsapp.net`;
            try {
              const { sendReservationCopyWA } = await import('@/lib/whatsapp/sendReservationCopyWA');
              const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');
              const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');
              const summary = {
                guestName: pre.st?.reservationSlots?.guestName || nextSlots.guestName,
                roomType: pre.st?.reservationSlots?.roomType || nextSlots.roomType,
                checkIn: pre.st?.reservationSlots?.checkIn || nextSlots.checkIn,
                checkOut: pre.st?.reservationSlots?.checkOut || nextSlots.checkOut,
                numGuests: pre.st?.reservationSlots?.numGuests || nextSlots.numGuests,
                reservationId: pre.st?.lastReservation && 'reservationId' in pre.st.lastReservation ? pre.st.lastReservation.reservationId : undefined,
                locale: pre.lang,
              } as any;
              if (isWhatsAppReady()) {
                await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jidInline, summary, conversationId: pre.conversationId, channel: pre.msg.channel });
              } else {
                const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jidInline, conversationId: pre.conversationId, channel: pre.msg.channel, summary });
                if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });
                // Esperar ACK breve (optimista)
                if (requestId) {
                  const { redis } = await import('@/lib/services/redis');
                  const started = Date.now();
                  while (Date.now() - started < 1200) {
                    const ack = await redis.get(`wa:ack:${requestId}`);
                    if (ack) break;
                    await new Promise(r => setTimeout(r, 120));
                  }
                }
              }
              const display = `+${digitsInline}`;
              finalText = pre.lang === 'es'
                ? `Listo, te envié la reserva por WhatsApp al ${display}.`
                : pre.lang === 'pt'
                  ? `Pronto, enviei a reserva pelo WhatsApp para ${display}.`
                  : `Done, I sent the booking via WhatsApp to ${display}.`;
              return { finalText, nextCategory: 'send_whatsapp_copy', nextSlots, needsSupervision, graphResult };
            } catch (e) {
              const code = (e as any)?.code;
              console.warn('[wa-copy-light] inline error:', (e as any)?.message || e, code ? { code } : '');
              if (code !== 'WA_NOT_READY') {
                needsSupervision = true;
              }
              finalText = pre.lang === 'es'
                ? (code === 'WA_NOT_READY' ? 'Aún estoy inicializando WhatsApp. Probá de nuevo en unos segundos.' : 'No pude enviar por WhatsApp ahora. Un recepcionista te contactará.')
                : pre.lang === 'pt'
                  ? (code === 'WA_NOT_READY' ? 'Ainda estou inicializando o WhatsApp. Tente novamente em alguns segundos.' : 'Não consegui enviar pelo WhatsApp agora. Um recepcionista vai te contatar.')
                  : (code === 'WA_NOT_READY' ? 'WhatsApp is still initializing. Please try again in a few seconds.' : 'I couldn\'t send via WhatsApp now. A receptionist will reach out.');
              return { finalText, nextCategory: 'send_whatsapp_copy', nextSlots, needsSupervision, graphResult };
            }
          }
        }
        finalText = pre.lang === 'es'
          ? '¿A qué número de WhatsApp te la envío? (solo dígitos con código de país)'
          : pre.lang === 'pt'
            ? 'Para qual número do WhatsApp devo enviar? (somente dígitos com código do país)'
            : 'Which WhatsApp number should I send it to? (digits with country code)';
        return { finalText, nextCategory: 'send_whatsapp_copy', nextSlots, needsSupervision, graphResult };
      }
      try {
        const { sendReservationCopyWA } = await import('@/lib/whatsapp/sendReservationCopyWA');
        const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');
        const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');
        const summary = {
          guestName: pre.st?.reservationSlots?.guestName || nextSlots.guestName,
          roomType: pre.st?.reservationSlots?.roomType || nextSlots.roomType,
          checkIn: pre.st?.reservationSlots?.checkIn || nextSlots.checkIn,
          checkOut: pre.st?.reservationSlots?.checkOut || nextSlots.checkOut,
          numGuests: pre.st?.reservationSlots?.numGuests || nextSlots.numGuests,
          reservationId: pre.st?.lastReservation && 'reservationId' in pre.st.lastReservation ? pre.st.lastReservation.reservationId : undefined,
          locale: pre.lang,
        } as any;
        if (isWhatsAppReady()) {
          await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jid, summary, conversationId: pre.conversationId, channel: pre.msg.channel });
        } else {
          const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jid, conversationId: pre.conversationId, channel: pre.msg.channel, summary });
          if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });
          if (requestId) {
            const { redis } = await import('@/lib/services/redis');
            const started = Date.now();
            while (Date.now() - started < 1200) {
              const ack = await redis.get(`wa:ack:${requestId}`);
              if (ack) break;
              await new Promise(r => setTimeout(r, 120));
            }
          }
        }
        finalText = pre.lang === 'es'
          ? 'Listo, te envié la reserva por WhatsApp.'
          : pre.lang === 'pt'
            ? 'Pronto, enviei a reserva pelo WhatsApp.'
            : 'Done, I sent the booking via WhatsApp.';
        return { finalText, nextCategory: 'send_whatsapp_copy', nextSlots, needsSupervision, graphResult };
      } catch (e) {
        const code = (e as any)?.code;
        console.warn('[wa-copy-light] error:', (e as any)?.message || e, code ? { code } : '');
        if (code !== 'WA_NOT_READY') {
          needsSupervision = true;
        }
        finalText = pre.lang === 'es'
          ? (code === 'WA_NOT_READY' ? 'Aún estoy inicializando WhatsApp. Probá de nuevo en unos segundos.' : 'No pude enviar por WhatsApp ahora. Un recepcionista te contactará.')
          : pre.lang === 'pt'
            ? (code === 'WA_NOT_READY' ? 'Ainda estou inicializando o WhatsApp. Tente novamente em alguns segundos.' : 'Não consegui enviar pelo WhatsApp agora. Um recepcionista vai te contatar.')
            : (code === 'WA_NOT_READY' ? 'WhatsApp is still initializing. Please try again in a few seconds.' : 'I couldn\'t send via WhatsApp now. A receptionist will reach out.');
        return { finalText, nextCategory: 'send_whatsapp_copy', nextSlots, needsSupervision, graphResult };
      }
    }
  }
  // (waAskRE ya definido arriba)
  if (waAskRE.test(userTxtRaw)) {
    // Derivar JID desde guestId (formato normalizado) o del conversationId
    // Esperamos algo como "<phone>@s.whatsapp.net" en guestId para conversaciones de WA
    const jidFromGuest = (pre.msg.guestId || "").includes("@s.whatsapp.net") ? pre.msg.guestId : undefined;
    const jidFromConv = (pre.conversationId || "").split("whatsapp-")[1];
    const jid = jidFromGuest || (jidFromConv && /@s\.whatsapp\.net$/.test(jidFromConv) ? jidFromConv : undefined);
    if (!jid) {
      // Si el usuario incluyó el número en el mismo mensaje, úsalo directamente
      const phoneInline = userTxtRaw.match(/(\+?\d[\d\s\-().]{6,}\d)/);
      if (phoneInline) {
        const digitsInline = phoneInline[1].replace(/\D/g, "");
        if (digitsInline.length >= 6) {
          const jidInline = `${digitsInline}@s.whatsapp.net`;
          try {
            const { sendReservationCopyWA } = await import("@/lib/whatsapp/sendReservationCopyWA");
            const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');
            const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');
            const summary = {
              guestName: pre.st?.reservationSlots?.guestName || nextSlots.guestName,
              roomType: pre.st?.reservationSlots?.roomType || nextSlots.roomType,
              checkIn: pre.st?.reservationSlots?.checkIn || nextSlots.checkIn,
              checkOut: pre.st?.reservationSlots?.checkOut || nextSlots.checkOut,
              numGuests: pre.st?.reservationSlots?.numGuests || nextSlots.numGuests,
              reservationId: pre.st?.lastReservation && 'reservationId' in pre.st.lastReservation ? pre.st.lastReservation.reservationId : undefined,
              locale: pre.lang,
            } as any;
            if (isWhatsAppReady()) {
              await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jidInline, summary, conversationId: pre.conversationId, channel: pre.msg.channel });
            } else {
              const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jidInline, conversationId: pre.conversationId, channel: pre.msg.channel, summary });
              if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });
              if (requestId) {
                const { redis } = await import('@/lib/services/redis');
                const started = Date.now();
                while (Date.now() - started < 1200) {
                  const ack = await redis.get(`wa:ack:${requestId}`);
                  if (ack) break;
                  await new Promise(r => setTimeout(r, 120));
                }
              }
            }
            const display = `+${digitsInline}`;
            finalText = pre.lang === "es"
              ? `Listo, te envié una copia por WhatsApp al ${display}.`
              : pre.lang === "pt"
                ? `Pronto, enviei uma cópia pelo WhatsApp para ${display}.`
                : `Done, I sent a copy via WhatsApp to ${display}.`;
            return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };
          } catch (e) {
            const code = (e as any)?.code;
            console.warn('[wa-copy] inline error:', (e as any)?.message || e, code ? { code } : "");
            if (code !== 'WA_NOT_READY') {
              needsSupervision = true;
            }
            finalText = pre.lang === "es"
              ? (code === "WA_NOT_READY" ? "Aún estoy inicializando WhatsApp. Probá de nuevo en unos segundos." : "No pude enviar por WhatsApp ahora. Un recepcionista te contactará.")
              : pre.lang === "pt"
                ? (code === "WA_NOT_READY" ? "Ainda estou inicializando o WhatsApp. Tente novamente em alguns segundos." : "Não consegui enviar pelo WhatsApp agora. Um recepcionista vai te contatar.")
                : (code === "WA_NOT_READY" ? "WhatsApp is still initializing. Please try again in a few seconds." : "I couldn't send via WhatsApp now. A receptionist will reach out.");
            return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };
          }
        }
      }
      // Si no hay JID ni teléfono inline válido, pedir el número
      finalText = pre.lang === "es"
        ? "¿A qué número de WhatsApp te la envío? (solo dígitos con código de país)"
        : pre.lang === "pt"
          ? "Para qual número do WhatsApp devo enviar? (somente dígitos com código do país)"
          : "Which WhatsApp number should I send it to? (digits with country code)";
      return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };
    }
    try {
      const { sendReservationCopyWA } = await import("@/lib/whatsapp/sendReservationCopyWA");
      const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');
      const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');
      const summary = {
        guestName: pre.st?.reservationSlots?.guestName || nextSlots.guestName,
        roomType: pre.st?.reservationSlots?.roomType || nextSlots.roomType,
        checkIn: pre.st?.reservationSlots?.checkIn || nextSlots.checkIn,
        checkOut: pre.st?.reservationSlots?.checkOut || nextSlots.checkOut,
        numGuests: pre.st?.reservationSlots?.numGuests || nextSlots.numGuests,
        reservationId: pre.st?.lastReservation && 'reservationId' in pre.st.lastReservation ? pre.st.lastReservation.reservationId : undefined,
        locale: pre.lang,
      } as any;
      if (isWhatsAppReady()) {
        await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jid, summary, conversationId: pre.conversationId, channel: pre.msg.channel });
      } else {
        const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jid, conversationId: pre.conversationId, channel: pre.msg.channel, summary });
        if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });
        if (requestId) {
          const { redis } = await import('@/lib/services/redis');
          const started = Date.now();
          while (Date.now() - started < 1200) {
            const ack = await redis.get(`wa:ack:${requestId}`);
            if (ack) break;
            await new Promise(r => setTimeout(r, 120));
          }
        }
      }
      finalText = pre.lang === "es"
        ? "Listo, te envié una copia por WhatsApp."
        : pre.lang === "pt"
          ? "Pronto, enviei uma cópia pelo WhatsApp."
          : "Done, I sent a copy via WhatsApp.";
      return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };
    } catch (e) {
      const code = (e as any)?.code;
      console.warn("[wa-copy] error:", (e as any)?.message || e, code ? { code } : "");
      if (code !== 'WA_NOT_READY') {
        needsSupervision = true;
      }
      finalText = pre.lang === "es"
        ? (code === "WA_NOT_READY" ? "Aún estoy inicializando WhatsApp. Probá de nuevo en unos segundos." : "No pude enviar por WhatsApp ahora. Un recepcionista te contactará.")
        : pre.lang === "pt"
          ? (code === "WA_NOT_READY" ? "Ainda estou inicializando o WhatsApp. Tente novamente em alguns segundos." : "Não consegui enviar pelo WhatsApp agora. Um recepcionista vai te contatar.")
          : (code === "WA_NOT_READY" ? "WhatsApp is still initializing. Please try again in a few seconds." : "I couldn't send via WhatsApp now. A receptionist will reach out.");
      return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };
    }
  }

  // Follow-up: turno siguiente a "¿a qué número?" → detectar teléfono y enviar por WhatsApp
  if (pre.prevCategory === "send_whatsapp_copy") {
    const phoneMatch = userTxtRaw.match(/(\+?\d[\d\s\-().]{6,}\d)/);
    if (phoneMatch) {
      const digits = phoneMatch[1].replace(/\D/g, "");
      if (digits.length >= 6) {
        const jid = `${digits}@s.whatsapp.net`;
        try {
          const { sendReservationCopyWA } = await import("@/lib/whatsapp/sendReservationCopyWA");
          const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');
          const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');
          const summary = {
            guestName: pre.st?.reservationSlots?.guestName || nextSlots.guestName,
            roomType: pre.st?.reservationSlots?.roomType || nextSlots.roomType,
            checkIn: pre.st?.reservationSlots?.checkIn || nextSlots.checkIn,
            checkOut: pre.st?.reservationSlots?.checkOut || nextSlots.checkOut,
            numGuests: pre.st?.reservationSlots?.numGuests || nextSlots.numGuests,
            reservationId: pre.st?.lastReservation && 'reservationId' in pre.st.lastReservation ? pre.st.lastReservation.reservationId : undefined,
            locale: pre.lang,
          } as any;
          if (isWhatsAppReady()) {
            await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jid, summary, conversationId: pre.conversationId, channel: pre.msg.channel });
          } else {
            const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jid, conversationId: pre.conversationId, channel: pre.msg.channel, summary });
            if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });
            if (requestId) {
              const { redis } = await import('@/lib/services/redis');
              const started = Date.now();
              while (Date.now() - started < 1200) {
                const ack = await redis.get(`wa:ack:${requestId}`);
                if (ack) break;
                await new Promise(r => setTimeout(r, 120));
              }
            }
          }
          const display = digits.startsWith("+") ? digits : `+${digits}`;
          finalText = pre.lang === "es"
            ? `Listo, te envié una copia por WhatsApp al ${display}.`
            : pre.lang === "pt"
              ? `Pronto, enviei uma cópia pelo WhatsApp para ${display}.`
              : `Done, I sent a copy via WhatsApp to ${display}.`;
          return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };
        } catch (e) {
          const code = (e as any)?.code;
          console.warn("[wa-copy] follow-up error:", (e as any)?.message || e, code ? { code } : "");
          if (code !== 'WA_NOT_READY') {
            needsSupervision = true;
          }
          finalText = pre.lang === "es"
            ? (code === "WA_NOT_READY" ? "Aún estoy inicializando WhatsApp. Probá de nuevo en unos segundos." : "No pude enviar por WhatsApp ahora. Un recepcionista te contactará.")
            : pre.lang === "pt"
              ? (code === "WA_NOT_READY" ? "Ainda estou inicializando o WhatsApp. Tente novamente em alguns segundos." : "Não consegui enviar pelo WhatsApp agora. Um recepcionista vai te contatar.")
              : (code === "WA_NOT_READY" ? "WhatsApp is still initializing. Please try again in a few seconds." : "I couldn't send via WhatsApp now. A receptionist will reach out.");
          return { finalText, nextCategory: "send_whatsapp_copy", nextSlots, needsSupervision, graphResult };
        }
      }
    }
  }

  // Guarda temprana: si el usuario envía un "CONFIRMAR" puro sin haber indicado huéspedes o nombre, pedirlos primero
  const hasGuests = Boolean(pre.currSlots?.numGuests || pre.st?.reservationSlots?.numGuests);
  const hasGuestName = isSafeGuestName(pre.currSlots?.guestName || pre.st?.reservationSlots?.guestName || "");

  // === Sprint 3: cancelar reserva ===
  const wantsCancel = /\b(cancel(ar|la|o)|anular|dar de baja)\b/i.test(userTxtRaw);
  if (wantsCancel) {
    const code = parseReservationCode(userTxtRaw);
    if (!code) {
      finalText = buildAskReservationCode(pre.lang);
      return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };
    }
    if (!isPureConfirm(userTxtRaw)) {
      finalText = pre.lang === "es" ? "Para cancelar, respondé **CONFIRMAR**."
        : pre.lang === "pt" ? "Para cancelar, responda **CONFIRMAR**."
          : "To cancel, reply **CONFIRMAR**.";
      return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };
    }
    try {
      const { cancelReservation } = await import("@/lib/agents/reservations");
      const r = await cancelReservation(pre.msg.hotelId, code);
      await upsertConvState(pre.msg.hotelId, pre.conversationId, {
        lastReservation: {
          reservationId: code,
          status: r.ok ? "cancelled" : "error",
          createdAt: new Date().toISOString(),
          channel: (pre.msg.channel as any) || "web",
        },
        updatedBy: "ai",
      } as any);
      finalText = r.message;
      return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };
    } catch (e) {
      needsSupervision = true;
      await upsertConvState(pre.msg.hotelId, pre.conversationId, {
        supervised: true,
        desiredAction: "notify_reception",
        updatedBy: "ai",
      } as any);
      finalText = pre.lang === "es"
        ? "No pude cancelar ahora. Un recepcionista te contactará."
        : pre.lang === "pt"
          ? "Não consegui cancelar agora. Um recepcionista vai te contatar."
          : "I couldn’t cancel now. A receptionist will contact you.";
      return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };
    }
  }
  // Early follow-up: si el mensaje previo ofreció confirmar el horario exacto de check-in/out y el usuario responde "sí"
  const offeredTimeSide = askedToConfirmCheckTime(pre.lcHistory, pre.lang);
  if (offeredTimeSide && isPureAffirmative(userTxtRaw, pre.lang)) {
    // Intentar leer horario exacto desde la configuración del hotel; si no existe, responder sin inventar
    try {
      const hotel = await getHotelConfig(pre.msg.hotelId).catch(() => null);
      const confCheckIn = (hotel as any)?.policies?.checkInTime || (hotel as any)?.checkInTime || undefined;
      const confCheckOut = (hotel as any)?.policies?.checkOutTime || (hotel as any)?.checkOutTime || undefined;
      const time = offeredTimeSide === "checkin" ? confCheckIn : confCheckOut;
      if (time && typeof time === "string") {
        finalText = pre.lang === "es"
          ? (offeredTimeSide === "checkin" ? `El check-in comienza a las ${time}.` : `El check-out es hasta las ${time}.`)
          : pre.lang === "pt"
            ? (offeredTimeSide === "checkin" ? `O check-in começa às ${time}.` : `O check-out vai até ${time}.`)
            : (offeredTimeSide === "checkin" ? `Check-in starts at ${time}.` : `Check-out is until ${time}.`);
        nextCategory = offeredTimeSide === "checkin" ? "checkin_info" : "checkout_info";
      } else {
        // No hay horario exacto configurado → no inventar; ofrecer confirmación con recepción
        finalText = pre.lang === "es"
          ? "Perfecto, consulto recepción para confirmar el horario exacto para tus fechas y te aviso a la brevedad."
          : pre.lang === "pt"
            ? "Perfeito, vou consultar a recepção para confirmar o horário exato para suas datas e te aviso em breve."
            : "Perfect, I’ll check with reception to confirm the exact time for your dates and get back to you shortly.";
        nextCategory = offeredTimeSide === "checkin" ? "checkin_info" : "checkout_info";
      }
      return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
    } catch {
      finalText = pre.lang === "es"
        ? "Perfecto, lo consulto y te confirmo en unos minutos."
        : pre.lang === "pt"
          ? "Perfeito, vou verificar e te confirmo em alguns minutos."
          : "Great, I’ll check and confirm shortly.";
      nextCategory = offeredTimeSide === "checkin" ? "checkin_info" : "checkout_info";
      return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
    }
  }
  if (isPureConfirm(userTxtRaw)) {
    if (!hasGuests) {
      finalText = buildAskGuests(pre.lang);
      return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
    }
    if (!hasGuestName) {
      finalText = buildAskGuestName(pre.lang);
      return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
    }
    // === Sprint 3: confirmar modificación de reserva ===
    if (pre.inModifyMode) {
      const codeFromUser = parseReservationCode(userTxtRaw) || parseReservationCode(String(pre.msg.content || ""));
      const ci = nextSlots.checkIn || pre.st?.reservationSlots?.checkIn;
      const co = nextSlots.checkOut || pre.st?.reservationSlots?.checkOut;
      const rt = nextSlots.roomType || pre.st?.reservationSlots?.roomType;
      const ng = nextSlots.numGuests || pre.st?.reservationSlots?.numGuests;
      const hasChanges = Boolean(ci || co || rt || ng);
      if (!codeFromUser) {
        finalText = buildAskReservationCode(pre.lang);
        return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };
      }
      if (!hasChanges) {
        finalText = pre.lang === "es" ? "¿Qué cambio aplico? (fechas, tipo de habitación o huéspedes)"
          : pre.lang === "pt" ? "Qual alteração aplico? (datas, tipo de quarto ou hóspedes)"
            : "What should I change? (dates, room type or guests)";
        return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };
      }
      try {
        const { modifyReservation } = await import("@/lib/agents/reservations");
        const snapshot: any = {
          guestName: pre.st?.reservationSlots?.guestName,
          roomType: rt, numGuests: ng, checkIn: ci, checkOut: co, locale: pre.lang,
        };
        const mod = await modifyReservation(pre.msg.hotelId, codeFromUser, snapshot, pre.msg.channel);
        await upsertConvState(pre.msg.hotelId, pre.conversationId, {
          reservationSlots: snapshot,
          lastReservation: {
            reservationId: codeFromUser,
            status: mod.ok ? "updated" : "error",
            createdAt: new Date().toISOString(),
            channel: (pre.msg.channel as any) || "web",
          },
          updatedBy: "ai",
        } as any);
        finalText = mod.message;
        return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };
      } catch (e) {
        needsSupervision = true;
        await upsertConvState(pre.msg.hotelId, pre.conversationId, {
          supervised: true,
          desiredAction: "notify_reception",
          updatedBy: "ai",
        } as any);
        finalText = pre.lang === "es"
          ? "Tuve un problema al aplicar la modificación. Un recepcionista te contactará."
          : pre.lang === "pt"
            ? "Tive um problema ao aplicar a modificação. Um recepcionista entrará em contato."
            : "I had an issue applying the change. A receptionist will reach out.";
        return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };
      }
    }
  }

  if (IS_TEST) {
    finalText = "Estoy para ayudarte. ¿Podés contarme brevemente el problema?";
    nextCategory = "support";
  } else {
    const started = Date.now();
    try {
      // Enriquecer el SystemMessage con el estado de slots y reserva
      const systemInstruction = pre.systemInstruction + "\n" + buildStateSummary(pre.currSlots, pre.st);
      debugLog("[bodyLLM] systemInstruction", systemInstruction)
      const lcMessages = [new SystemMessage(systemInstruction), ...pre.lcHistory, new HumanMessage(String(pre.msg.content || ""))];
      graphResult = await withTimeout(
        agentGraph.invoke({
          hotelId: pre.msg.hotelId,
          conversationId: pre.conversationId,
          detectedLanguage: pre.msg.detectedLanguage,
          normalizedMessage: String(pre.msg.content || ""),
          messages: lcMessages,
          reservationSlots: pre.currSlots,
          meta: { channel: pre.msg.channel, prevCategory: pre.prevCategory },
          salesStage: pre.st?.salesStage ?? undefined,
          desiredAction: pre.st?.desiredAction ?? undefined,
        }),
        CONFIG.GRAPH_TIMEOUT_MS,
        "agentGraph.invoke"
      );
      debugLog("[bodyLLM] graphResult", graphResult);
      const last = (graphResult as any)?.messages?.at?.(-1);
      const lastText = extractTextFromLCContent(last?.content);
      finalText = (lastText || "").trim();
      nextCategory = (graphResult as any).category ?? pre.prevCategory ?? null;
      const merged: ReservationSlotsStrict = { ...(pre.currSlots || {}), ...((graphResult as any).reservationSlots || {}) };
      if (typeof merged.numGuests !== "undefined" && typeof merged.numGuests !== "string") {
        merged.numGuests = String((merged as any).numGuests);
      }
      nextSlots = merged;

      // === NEW: enriquecer con structured si aporta algo útil (no bloqueante)
      try {
        if (CONFIG.STRUCTURED_ENABLED) {
          const structured = await tryStructuredAnalyze({
            hotelId: pre.msg.hotelId,
            lang: pre.lang,
            channel: pre.msg.channel,
            userQuery: String(pre.msg.content || ""),
          });
          debugLog("[bodyLLM] structured", structured);
          if (structured) {
            const s = structured.entities || {};
            const merged2: ReservationSlotsStrict = {
              ...nextSlots,
              checkIn: nextSlots.checkIn || s.checkin_date || undefined,
              checkOut: nextSlots.checkOut || s.checkout_date || undefined,
              roomType: nextSlots.roomType || s.room_type || undefined,
              numGuests: nextSlots.numGuests || (typeof s.guests === "number" ? String(s.guests) : undefined),
            };
            nextSlots = merged2;
            // No marcar supervisión si la intención es "segura"
            const structuredCat = structured.intent ? mapStructuredIntentToCategory(structured.intent) : undefined;
            const candidateCat = graphResult?.category || structuredCat;
            const safeCat = isSafeAutosendCategory(candidateCat);
            if (structured.handoff === true && !safeCat) {
              needsSupervision = true;
            }
            if (!finalText && structured.answer) {
              // Evita derivar al hotel cuando estamos en flujo de modificación: guía al usuario
              if (structured.handoff === true && pre.inModifyMode) {
                finalText = buildModifyGuidance(pre.lang, nextSlots);
              } else {
                finalText = structured.answer;
              }
            }
            if (!nextCategory && structured.intent) {
              nextCategory = mapStructuredIntentToCategory(structured.intent);
            }
          }
        }
      } catch (e) {
        console.warn("[structured] enrich warn:", (e as any)?.message || e);
      }
    } catch (err: any) {
      console.error("❌ [messageHandler] agentGraph error:", { errMsg: err?.message || String(err) });
      // === NEW: structured fallback si el grafo falla
      debugLog("[bodyLLM] agentGraph error", err);
      try {
        if (CONFIG.STRUCTURED_ENABLED) {
          const structured = await tryStructuredAnalyze({
            hotelId: pre.msg.hotelId,
            lang: pre.lang,
            channel: pre.msg.channel,
            userQuery: String(pre.msg.content || ""),
          });
          debugLog("[bodyLLM] structured fallback", structured);
          if (structured?.answer) {
            // En fallback structured, también evitar derivar en modo modificación
            if (structured.handoff === true && pre.inModifyMode) {
              finalText = buildModifyGuidance(pre.lang, pre.currSlots);
            } else {
              finalText = structured.answer;
            }
            nextCategory = mapStructuredIntentToCategory(structured.intent || "general_question");
            const s = structured.entities || {};
            nextSlots = {
              ...pre.currSlots,
              checkIn: pre.currSlots.checkIn || s.checkin_date || undefined,
              checkOut: pre.currSlots.checkOut || s.checkout_date || undefined,
              roomType: pre.currSlots.roomType || s.room_type || undefined,
              numGuests: pre.currSlots.numGuests || (typeof s.guests === "number" ? String(s.guests) : undefined),
            };
            if (structured.handoff === true) needsSupervision = true;
          }
        }
      } catch (e) {
        console.warn("[structured] fallback error:", (e as any)?.message || e);
      }
      if (!finalText) {
        finalText = ruleBasedFallback(pre.lang, String(pre.msg.content || ""));
        console.warn("⚠️ [graph] finalText vacío → fallback determinista");
      }
    }
  }
  // Post-procesamiento: si seguimos en modo modificación y la respuesta sugiere "contactar al hotel", reorientar a guía de modificación
  if (pre.inModifyMode) {
    // 1) Si el modelo intenta derivar al hotel, forzamos guía de modificación
    if (isContactHotelText(finalText, pre.lang)) {
      finalText = buildModifyGuidance(pre.lang, nextSlots);
    } else {
      // 1.b) Si el modelo respondió con una cotización o pide confirmación sin que el usuario
      //      haya aportado nuevos datos de cambio en este turno, redirigimos a la guía.
      const currText = String(pre.msg.content || "");
      const userDatesNow = extractDateRangeFromText(currText);
      const userMentionedSide = !!detectDateSideFromText(currText);
      const userAffirmAfterVerify = askedToVerifyAvailability(pre.lcHistory, pre.lang) && isPureAffirmative(currText, pre.lang);
      const ackedVerifyInThisReply = /verifico\s+disponibilidad|vou\s+verificar\s+a\s+disponibilidade|check\s+availability/i.test(finalText || "");
      const noNewChangeData = !userDatesNow.checkIn && !userDatesNow.checkOut && !userMentionedSide && !userAffirmAfterVerify;
      if (!ackedVerifyInThisReply && noNewChangeData && isQuoteOrConfirmText(finalText, pre.lang)) {
        finalText = buildModifyGuidance(pre.lang, nextSlots);
      }
    }
  }
  // Activar menú de modificar inmediatamente si detectamos quick intents del usuario
  {
    const userTxt = String(pre.msg.content || "");
    if (RE_CHANGE_DATES.test(userTxt) || RE_CHANGE_ROOM.test(userTxt) || RE_CHANGE_GUESTS.test(userTxt)) {
      const knownSlots = { ...(pre.st?.reservationSlots || {}), ...(nextSlots || {}) } as ReservationSlotsStrict;
      finalText = buildModifyOptionsMenu(pre.lang, knownSlots);
      nextSlots = knownSlots;
    }
  }
  // 2) Manejo robusto de fechas: consolidar y confirmar cuando se aportan fechas,
  //    incluso si el estado no está marcado como "confirmada". Usa historial para follow-up.
  {
    // Si el usuario provee o cambia la cantidad de huéspedes y ya tenemos fechas, recalcular de inmediato
    const msgLower = String(pre.msg.content || "").toLowerCase();
    const guestsFromText = extractSlotsFromText(String(pre.msg.content || ""), pre.lang).numGuests;
    const guestsParsed = guestsFromText ? parseInt(String(guestsFromText), 10) : NaN;
    // Importante: comparar contra los "huéspedes" previos al turno (prevSlotsStrict/estado),
    // no contra nextSlots que ya fusiona el turno actual; así detectamos correctamente el cambio nuevo.
    const prevGuestsVal = pre.prevSlotsStrict?.numGuests || pre.st?.reservationSlots?.numGuests || "";
    const hasNewGuests = Number.isFinite(guestsParsed) && guestsParsed > 0 && String(guestsParsed) !== prevGuestsVal;
    const haveDatesNow = Boolean((nextSlots.checkIn || pre.st?.reservationSlots?.checkIn) && (nextSlots.checkOut || pre.st?.reservationSlots?.checkOut));
    if (hasNewGuests && haveDatesNow) {
      const finalGuests = String(guestsParsed);
      // Ajuste de tipo de habitación si la capacidad no alcanza
      const currentType = nextSlots.roomType || pre.st?.reservationSlots?.roomType;
      const { target, changed } = chooseRoomTypeForGuests(currentType, parseInt(finalGuests, 10));
      nextSlots = { ...nextSlots, numGuests: finalGuests, roomType: target };
      try {
        const ciISO = (nextSlots.checkIn || pre.st?.reservationSlots?.checkIn)!;
        const coISO = (nextSlots.checkOut || pre.st?.reservationSlots?.checkOut)!;
        const res = await runAvailabilityCheck(pre, nextSlots, ciISO, coISO);
        // Prependemos un ACK de reajuste si cambió el tipo de habitación
        const ack = changed
          ? (pre.lang === "es"
            ? `Actualicé la capacidad a ${finalGuests} huésped(es) y ajusté el tipo a ${localizeRoomType(target, pre.lang)}.`
            : pre.lang === "pt"
              ? `Atualizei a capacidade para ${finalGuests} hóspede(s) e ajustei o tipo para ${localizeRoomType(target, pre.lang)}.`
              : `I updated capacity to ${finalGuests} guest(s) and adjusted the room type to ${localizeRoomType(target, pre.lang)}.`)
          : (pre.lang === "es"
            ? `Actualicé la capacidad a ${finalGuests} huésped(es).`
            : pre.lang === "pt"
              ? `Atualizei a capacidade para ${finalGuests} hóspede(s).`
              : `I updated capacity to ${finalGuests} guest(s).`);
        finalText = `${ack}\n\n${res.finalText}`.trim();
        nextSlots = res.nextSlots;
        if (res.needsHandoff) needsSupervision = true;
        return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
      } catch (e) {
        // Si falla el tool, al menos confirmamos el cambio y pedimos reintentar
        finalText = pre.lang === "es"
          ? `Actualicé la capacidad a ${finalGuests} huésped(es). Tuve un problema al recalcular disponibilidad; ¿querés que lo intente de nuevo?`
          : pre.lang === "pt"
            ? `Atualizei a capacidade para ${finalGuests} hóspede(s). Tive um problema ao recalcular a disponibilidade; deseja que eu tente novamente?`
            : `I updated capacity to ${finalGuests} guest(s). I had an issue recalculating availability; would you like me to try again?`;
        return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
      }
    }

    // Oferta de menú compacto de modificación cuando el usuario dice "quiero modificar" y ya hay fechas conocidas
    if (pre.inModifyMode && wantsGenericModify(String(pre.msg.content || ""), pre.lang) && (nextSlots.checkIn || pre.st?.reservationSlots?.checkIn) && (nextSlots.checkOut || pre.st?.reservationSlots?.checkOut)) {
      // Preferimos los slots actuales fusionados, con fallback al estado
      const knownSlots = {
        ...pre.st?.reservationSlots,
        ...nextSlots,
      } as ReservationSlotsStrict;
      finalText = buildModifyOptionsMenu(pre.lang, knownSlots);
      debugLog("[modify-menu] emitted options", { knownSlots });
      // No interrumpimos: permitimos que el resto del flujo siga si añade más detalles
    }

    const userDates = extractDateRangeFromText(String(pre.msg.content || ""));
    const tLower = String(pre.msg.content || "").toLowerCase();
    const mentionsDates = /(fecha|fechas|date|dates|data|datas|check\s*-?in|check\s*-?out|ingres(?:o|ar|amos)|inreso|entrada|llegada|arribo|salida|egreso|retirada|partida|sa[ií]da|departure|arrival)/i.test(tLower);
    const datePhrases = [
      // ES
      "nuevas fechas", "fechas nuevas", "cambio de fechas", "cambiar fechas", "modificar fechas", "cambiar fecha", "modificar fecha", "otra fecha", "otras fechas",
      // EN
      "new date", "new dates", "change date", "change the date", "change the dates", "modify date", "modify the date", "modify dates", "update date", "update dates", "booking date", "booking dates",
      // PT
      "data nova", "datas novas", "trocar as datas", "mudar as datas", "alterar as datas", "alterar data"
    ];
    const mentionsNewDates = datePhrases.some((p) => tLower.includes(p));
    // Guard: si es una pregunta de horario de check-in/out, no dispares el flujo de cambio de fechas
    const timeQ = detectCheckinOrCheckoutTimeQuestion(String(pre.msg.content || ""), pre.lang);
    const triggerDateFlow = !timeQ && (pre.inModifyMode || mentionsDates || Boolean(userDates.checkIn || userDates.checkOut));

    if (timeQ) {
      // No sobrescribimos la respuesta aquí: dejamos que el grafo clasifique a retrieval_based
      // y responda desde la base de conocimiento. Solo evitamos disparar el flujo de fechas.
      if (!nextCategory) nextCategory = "retrieval_based";
      // finalText queda como lo devolvió el grafo (idealmente RAG tras la corrección en graph.ts)
    } else if (triggerDateFlow) {
      // Caso: el usuario menciona fechas/"check-in/out" pero no incluyó fechas aún → preguntar
      if (!userDates.checkIn && !userDates.checkOut) {
        const sideIntent = detectDateSideFromText(String(pre.msg.content || ""));
        if (sideIntent) {
          // Pidió modificar check-in/out sin dar fecha → pedir la fecha correspondiente
          finalText = buildAskMissingDate(pre.lang, sideIntent);
        } else if (mentionsNewDates || mentionsDates) {
          // Dijo "fechas" o frases equivalentes sin darlas → pedir ambos valores
          finalText = buildAskNewDates(pre.lang);
        }
      }

      const gaveOneDate = Boolean(userDates.checkIn) !== Boolean(userDates.checkOut);
      if (gaveOneDate) {
        // Importante: al buscar la última fecha del USUARIO en el historial,
        // ignoramos el mensaje actual (último elemento) para no pisar el check-in
        // previo con la fecha recién dada (p. ej. "05/10/2025").
        const historyExcludingCurrent = pre.lcHistory.slice(0, -1);
        const lastUser = getLastUserDatesFromHistory(historyExcludingCurrent as any);
        const expected = getExpectedMissingDateFromHistory(pre.lcHistory, pre.lang);
        const userSide = detectDateSideFromText(String(pre.msg.content || ""));
        let ciRaw = userDates.checkIn;
        let coRaw = userDates.checkOut;
        if (!userSide) {
          if (expected === "checkOut" && ciRaw && !coRaw) {
            coRaw = ciRaw; ciRaw = undefined;
          } else if (expected === "checkIn" && coRaw && !ciRaw) {
            ciRaw = coRaw; coRaw = undefined;
          }
        }
        let ci = ciRaw || lastUser.checkIn;
        let co = coRaw || lastUser.checkOut;
        if (ci && co && new Date(ci) > new Date(co)) { const tmp = ci; ci = co; co = tmp; }

        if (ci && co && ci !== co) {
          nextSlots = { ...nextSlots, checkIn: ci, checkOut: co };
          const ciTxt = isoToDDMMYYYY(ci) || ci;
          const coTxt = isoToDDMMYYYY(co) || co;
          finalText = pre.lang === "es"
            ? `Anoté nuevas fechas: ${ciTxt} → ${coTxt}. ¿Deseás que verifique disponibilidad y posibles diferencias?`
            : pre.lang === "pt"
              ? `Anotei as novas datas: ${ciTxt} → ${coTxt}. Deseja que eu verifique a disponibilidade e possíveis diferenças?`
              : `Noted the new dates: ${ciTxt} → ${coTxt}. Do you want me to check availability and any differences?`;
        } else {
          const missing = !ci && (co ? "checkIn" : undefined) || (!co && (ci ? "checkOut" : undefined));
          if (ci && !co) { nextSlots = { ...nextSlots, checkIn: ci }; }
          else if (co && !ci) { nextSlots = { ...nextSlots, checkOut: co }; }
          if (missing) finalText = buildAskMissingDate(pre.lang, missing);
        }
      } else if (userDates.checkIn && userDates.checkOut) {
        nextSlots = { ...nextSlots, checkIn: userDates.checkIn, checkOut: userDates.checkOut };
        const ci = isoToDDMMYYYY(userDates.checkIn) || userDates.checkIn;
        const co = isoToDDMMYYYY(userDates.checkOut) || userDates.checkOut;
        finalText = pre.lang === "es"
          ? `Anoté nuevas fechas: ${ci} → ${co}. ¿Deseás que verifique disponibilidad y posibles diferencias?`
          : pre.lang === "pt"
            ? `Anotei as novas datas: ${ci} → ${co}. Deseja que eu verifique a disponibilidade e possíveis diferenças?`
            : `Noted the new dates: ${ci} → ${co}. Do you want me to check availability and any differences?`;
      }
    }
  }

  // 3) Si el turno anterior fue una pregunta de verificación de disponibilidad y el usuario
  //    responde afirmativamente ("sí", "ok", "por favor", etc.), siempre confirmamos la acción
  //    usando el rango de fechas más reciente propuesto (historial) antes que slots antiguos del estado.
  //    Importante: sobreescribimos cualquier salida previa para garantizar el ACK explícito
  //    con "verifico disponibilidad" y las fechas en formato dd/mm/aaaa (requisito de test).
  if (askedToVerifyAvailability(pre.lcHistory, pre.lang) && isPureAffirmative(String(pre.msg.content || ""), pre.lang)) {
    const proposed = getProposedAvailabilityRange(pre.lcHistory);
    const ciISO = proposed.checkIn || nextSlots.checkIn;
    const coISO = proposed.checkOut || nextSlots.checkOut;
    const ci = ciISO ? (isoToDDMMYYYY(ciISO) || ciISO) : undefined;
    const co = coISO ? (isoToDDMMYYYY(coISO) || coISO) : undefined;
    if (ci && co) {
      try {
        // Línea de acuse explícito con "verifico" y fechas en dd/mm/aaaa
        const ackLine = pre.lang === "es"
          ? `Perfecto, verifico disponibilidad para ${ci} → ${co}.`
          : pre.lang === "pt"
            ? `Perfeito, vou verificar a disponibilidade para ${ci} → ${co}.`
            : `Great, I'll check availability for ${ci} → ${co}.`;
        const res = await runAvailabilityCheck(pre, nextSlots, ciISO!, coISO!);
        // Anteponemos el ACK para satisfacer expectativas de UX/tests y luego el resultado concreto
        finalText = `${ackLine}\n\n${res.finalText}`.trim();
        nextSlots = res.nextSlots;
        if (res.needsHandoff) {
          needsSupervision = true;
        }
      } catch (e) {
        // Fallback a simple confirmación si la herramienta falla
        finalText = pre.lang === "es"
          ? `Perfecto, verifico disponibilidad para ${ci} → ${co}. Te aviso en un momento.`
          : pre.lang === "pt"
            ? `Perfeito, vou verificar a disponibilidade para ${ci} → ${co}. Aviso você em instantes.`
            : `Great, I'll check availability for ${ci} → ${co}. I'll let you know shortly.`;
      }
    } else {
      // Si por algún motivo no tenemos ambas fechas aún, pedimos la faltante
      const missing = !ciISO ? "checkIn" : !coISO ? "checkOut" : undefined;
      if (missing) finalText = buildAskMissingDate(pre.lang, missing as any);
    }
  }

  // 4) Follow-up del usuario consultando estado de la verificación ("pudiste confirmar/verificar?")
  //    Si hay una propuesta previa o al menos un rango de fechas reciente, intentamos ejecutar
  //    la verificación ahora mismo y devolvemos el resultado (evita derivar a retrieval).
  if (isAskAvailabilityStatusQuery(String(pre.msg.content || ""), pre.lang)) {
    try {
      const proposed = getProposedAvailabilityRange(pre.lcHistory);
      const ciISO = proposed.checkIn || nextSlots.checkIn || pre.st?.reservationSlots?.checkIn;
      const coISO = proposed.checkOut || nextSlots.checkOut || pre.st?.reservationSlots?.checkOut;
      if (ciISO && coISO) {
        const snapshot: any = {
          guestName: nextSlots.guestName || pre.st?.reservationSlots?.guestName,
          roomType: nextSlots.roomType || pre.st?.reservationSlots?.roomType,
          numGuests: nextSlots.numGuests || pre.st?.reservationSlots?.numGuests,
          checkIn: ciISO,
          checkOut: coISO,
          locale: pre.lang,
        };
        // Ejecutar verificación
        const availability = await askAvailability(pre.msg.hotelId, snapshot);
        // Persistir estado mínimo útil para próximos turnos
        try {
          await upsertConvState(pre.msg.hotelId, pre.conversationId, {
            reservationSlots: snapshot,
            lastProposal: {
              text:
                availability.proposal ||
                (availability.available
                  ? (pre.lang === "es" ? "Hay disponibilidad." : pre.lang === "pt" ? "Há disponibilidade." : "Availability found.")
                  : (pre.lang === "es" ? "Sin disponibilidad." : pre.lang === "pt" ? "Sem disponibilidade." : "No availability.")),
              available: !!availability.available,
              options: availability.options,
              // NEW: persist suggested fields
              suggestedRoomType: availability?.options?.[0]?.roomType,
              suggestedPricePerNight: typeof availability?.options?.[0]?.pricePerNight === "number" ? availability.options![0]!.pricePerNight : undefined,
              toolCall: {
                name: "checkAvailability",
                input: {
                  hotelId: pre.msg.hotelId,
                  roomType: snapshot.roomType,
                  numGuests: snapshot.numGuests ? parseInt(String(snapshot.numGuests), 10) || 1 : undefined,
                  checkIn: snapshot.checkIn,
                  checkOut: snapshot.checkOut,
                },
                outputSummary: availability.available ? "available:true" : "available:false",
                at: safeNowISO(),
              },
            },
            salesStage: availability.available ? "quote" : "followup",
            desiredAction: availability.available ? pre.st?.desiredAction : "notify_reception",
            updatedBy: "ai",
          } as any);
        } catch (e) {
          console.warn("[followup-status] upsertConvState warn:", (e as any)?.message || e);
        }
        // Responder al usuario
        const isError2 = (availability as any).ok === false;
        // Enriquecer como en runAvailabilityCheck: mostrar total si hay pricePerNight
        let base = availability.proposal ||
          (isError2
            ? (pre.lang === "es" ? "Tuve un problema al consultar la disponibilidad." : pre.lang === "pt" ? "Tive um problema ao verificar a disponibilidade." : "I had an issue checking availability.")
            : (availability.available
              ? (pre.lang === "es" ? "Tengo disponibilidad." : pre.lang === "pt" ? "Tenho disponibilidade." : "I have availability.")
              : (pre.lang === "es" ? "No tengo disponibilidad en esas fechas." : pre.lang === "pt" ? "Não tenho disponibilidade nessas datas." : "No availability on those dates.")));
        if (availability.available && Array.isArray(availability.options) && availability.options.length > 0 && snapshot.checkIn && snapshot.checkOut) {
          const opt: any = availability.options[0];
          const nights = Math.max(1, Math.round((new Date(snapshot.checkOut).getTime() - new Date(snapshot.checkIn).getTime()) / (24 * 60 * 60 * 1000)));
          const perNight = typeof opt.pricePerNight === "number" ? opt.pricePerNight : undefined;
          const currency = String(opt.currency || "").toUpperCase();
          const total = perNight != null ? perNight * nights : undefined;
          const rtLocalized = localizeRoomType(opt.roomType || snapshot.roomType, pre.lang as any);
          if (perNight != null) {
            base = pre.lang === "es"
              ? `Tengo ${rtLocalized} disponible. Tarifa por noche: ${perNight} ${currency}. Total ${nights} noches: ${total} ${currency}.`
              : pre.lang === "pt"
                ? `Tenho ${rtLocalized} disponível. Tarifa por noite: ${perNight} ${currency}. Total ${nights} noites: ${total} ${currency}.`
                : `I have a ${rtLocalized} available. Rate per night: ${perNight} ${currency}. Total ${nights} nights: ${total} ${currency}.`;
          } else {
            base = pre.lang === "es"
              ? `Hay disponibilidad para ${rtLocalized}.`
              : pre.lang === "pt"
                ? `Há disponibilidade para ${rtLocalized}.`
                : `Availability for ${rtLocalized}.`;
          }
        }
        // Si faltan huéspedes, preguntar antes de pedir confirmación
        const needsGuests2 = !snapshot.numGuests;
        const needsName2 = !isSafeGuestName(snapshot.guestName || "");
        const actionLine2 = availability.available
          ? (needsGuests2
            ? `\n\n${buildAskGuests(pre.lang)}`
            : (needsName2
              ? `\n\n${buildAskGuestName(pre.lang)}`
              : (pre.lang === "es"
                ? "\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”."
                : pre.lang === "pt"
                  ? "\n\nConfirma a reserva respondendo “CONFIRMAR”."
                  : "\n\nDo you confirm the booking? Reply “CONFIRMAR” (confirm).")))
          : "";
        // Debounce de handoff para follow-up
        let handoffLine2 = "";
        if (availability.available === false || isError2) {
          const lastAi = [...pre.lcHistory].reverse().find((m) => m instanceof AIMessage) as AIMessage | undefined;
          const lastText = String(lastAi?.content || "").toLowerCase();
          const alreadyHandoff = /recepcion|receptionist|humano|human|contato|contacto/.test(lastText);
          if (!alreadyHandoff) {
            handoffLine2 = pre.lang === "es"
              ? "\n\nUn recepcionista se pondrá en contacto con usted a la brevedad."
              : pre.lang === "pt"
                ? "\n\nUm recepcionista entrará em contato com você em breve."
                : "\n\nA receptionist will contact you shortly.";
          }
        }
        finalText = `${base}${actionLine2}${handoffLine2}`.trim();
        if (availability.available === false || isError2) {
          needsSupervision = true;
        }
        // Alinear slots resultantes para próximos pasos
        nextSlots = { ...nextSlots, checkIn: ciISO, checkOut: coISO };
      } else {
        // Si faltan fechas aún, pedir explícitamente
        const missing = !ciISO ? "checkIn" : "checkOut";
        finalText = buildAskMissingDate(pre.lang, missing as any);
      }
    } catch (e) {
      console.warn("[followup-status] availability error:", (e as any)?.message || e);
      finalText = pre.lang === "es"
        ? "Tuve un problema al consultar la disponibilidad. ¿Podés intentar nuevamente?"
        : pre.lang === "pt"
          ? "Tive um problema ao verificar a disponibilidade. Pode tentar novamente?"
          : "I had an issue checking availability. Could you try again?";
    }
  }
  debugLog("[bodyLLM] OUT", { finalText, nextCategory, nextSlots, needsSupervision, graphResult });
  return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
}

function buildModifyGuidance(
  lang: "es" | "en" | "pt",
  slots: ReservationSlotsStrict
): string {
  const hasDates = Boolean(slots.checkIn && slots.checkOut);
  const es = () =>
    `Podemos modificar tu reserva confirmada. Decime qué querés cambiar: ${hasDates ? "nuevas fechas, " : "fechas (check-in y check-out), "
    }tipo de habitación o cantidad de huéspedes. Si es por fechas, indicá nuevo check-in y check-out.`;
  const en = () =>
    `We can modify your confirmed booking. Tell me what you'd like to change: ${hasDates ? "new dates, " : "check-in and check-out dates, "
    }room type, or number of guests. For dates, please provide the new check-in and check-out.`;
  const pt = () =>
    `Podemos modificar sua reserva confirmada. Diga o que você deseja alterar: ${hasDates ? "novas datas, " : "datas de check-in e check-out, "
    }tipo de quarto ou quantidade de hóspedes. Para datas, informe o novo check-in e check-out.`;
  return lang === "es" ? es() : lang === "pt" ? pt() : en();
}

function isContactHotelText(text: string, lang: "es" | "en" | "pt"): boolean {
  const t = (text || "").toLowerCase();
  if (!t) return false;
  // Palabras clave típicas de derivación al hotel por idioma
  const es = /(ponerte en contacto|ponte en contacto|pongas en contacto|póngase en contacto|ponerse en contacto|contact[oa] con el hotel|contactarse\s+(?:con|al)\s*hotel|comunicate|comunícate|whatsapp\s*(?:al|:)|tel[eé]fono\s*(?:al|:)|correo electr[oó]nico|email\s*:|hotel dem[oó])/i;
  const en = /(contact the hotel|get in touch|reach out|whatsapp\s*(?:at|:)|phone\s*(?:at|:)|email\s*:)/i;
  const pt = /(entrar em contato|contato com o hotel|fale com|whatsapp\s*(?:no|:)|telefone\s*(?:no|:)|email\s*:)/i;
  const re = lang === "es" ? es : lang === "pt" ? pt : en;
  return re.test(t);
}

// Quick intents mínimos (modo modificar)
const RE_CHANGE_DATES = /(cambiar|modificar|alterar|change)\s+(fechas?|datas?|dates?)/i;
const RE_CHANGE_ROOM = /(cambiar|modificar|alterar|change)\s+(habitaci[oó]n|habitacion|tipo|room|quarto)/i;
const RE_CHANGE_GUESTS = /(cambiar|modificar|alterar|change)\s+(hu[eé]spedes|huespedes|personas|guests|pessoas)/i;

// Detecta textos de cotización/pedido de confirmación que empujan al cierre sin cambios
function isQuoteOrConfirmText(text: string, lang: "es" | "en" | "pt"): boolean {
  const t = (text || "").toLowerCase();
  if (!t) return false;
  const reEs = /(¿confirm[aá]s\s+la\s+reserva\?|respond[eé]\s*“?confirmar|tarifa\s+por\s+noche|tengo\s+[^\n]*\s+disponible\.|hay\s+disponibilidad\.)/i;
  const rePt = /(confirma\s+a\s+reserva|responda\s*“?confirmar|tarifa\s+por\s+noite|tenho\s+[^\n]*\s+dispon[ií]vel\.|h[aá]\s+disponibilidade\.)/i;
  const reEn = /(do\s+you\s+confirm\s+the\s+booking\?|reply\s*“?confirmar|rate\s+per\s+night|i\s+have\s+[^\n]*\s+available\.|availability\s+found\.)/i;
  const re = lang === "es" ? reEs : lang === "pt" ? rePt : reEn;
  return re.test(t);
}

// Detecta pedidos genéricos de modificar sin especificar aún el cambio
function wantsGenericModify(text: string, lang: "es" | "en" | "pt"): boolean {
  const t = (text || "").toLowerCase();
  if (!t) return false;
  if (lang === "es") return /(quiero|quisiera|deseo)\s+(modificar|cambiar)(la|lo|mi|\b)/i.test(t);
  if (lang === "pt") return /(quero|gostaria de|desejo)\s+(modificar|mudar|alterar)(\s|$)/i.test(t);
  return /(i\s+want\s+to\s+)?(modify|change)(\s+it|\s+my\s+booking|\s+reservation|$)/i.test(t);
}

function buildModifyOptionsMenu(lang: "es" | "en" | "pt", slots: ReservationSlotsStrict): string {
  const hasDates = Boolean(slots.checkIn && slots.checkOut);
  if (lang === "es") {
    const header = hasDates
      ? "Podemos modificar tu reserva confirmada. ¿Qué te gustaría cambiar?"
      : "¿Qué te gustaría cambiar de tu reserva?";
    return [
      header,
      "- Fechas (check-in y check-out)",
      "- Tipo de habitación",
      "- Cantidad de huéspedes",
      "Respondé: 'cambiar fechas', 'cambiar habitación' o 'cambiar huéspedes'.",
    ].join("\n");
  }
  if (lang === "pt") {
    const header = hasDates
      ? "Podemos modificar sua reserva confirmada. O que você deseja alterar?"
      : "O que você deseja alterar na sua reserva?";
    return [
      header,
      "- Datas (check-in e check-out)",
      "- Tipo de quarto",
      "- Quantidade de hóspedes",
      "Responda: 'alterar datas', 'alterar quarto' ou 'alterar hóspedes'.",
    ].join("\n");
  }
  const header = hasDates
    ? "We can modify your confirmed booking. What would you like to change?"
    : "What would you like to change in your booking?";
  return [
    header,
    "- Dates (check-in and check-out)",
    "- Room type",
    "- Number of guests",
    "Reply: 'change dates', 'change room', or 'change guests'.",
  ].join("\n");
}

// Detecta respuestas genéricas/irrelevantes del asistente que no deberían bloquear
// una confirmación de verificación de disponibilidad
function isGenericFallbackText(text: string, lang: "es" | "en" | "pt"): boolean {
  const t = (text || "").toLowerCase();
  if (!t) return true;
  const genericEs = /(¿en qué puedo ayudarte\??|parece que tu mensaje est[aá] incompleto|mensaje incompleto|no entend[ií]|pod[eé]s reformular)/i;
  const genericEn = /(how can i help you\??|your message seems incomplete|i didn't understand|could you rephrase)/i;
  const genericPt = /(em que posso ajudar\??|sua mensagem parece incompleta|n[aã]o entendi|pode reformular)/i;
  const hotelDemo = /hotel\s+dem[oó]/i;
  const re = lang === "es" ? genericEs : lang === "pt" ? genericPt : genericEn;
  return re.test(t) || hotelDemo.test(t);
}

// === Sprint 3: helpers de código de reserva ===
function parseReservationCode(text: string): string | undefined {
  const m = (text || "").match(/\b([A-Z0-9]{5,10})\b/);
  return m?.[1];
}
function buildAskReservationCode(lang: "es" | "en" | "pt"): string {
  return lang === "es" ? "¿Me compartís el *código de reserva*?"
    : lang === "pt" ? "Pode me informar o *código da reserva*?"
      : "Could you share the *booking code*?";
}

function buildAskMissingDate(
  lang: "es" | "en" | "pt",
  missing: "checkIn" | "checkOut"
): string {
  const isOut = missing === "checkOut";
  if (lang === "es") {
    return isOut
      ? "Perfecto. ¿Podés confirmarme también la fecha de check-out? (formato dd/mm/aaaa)"
      : "Entendido. ¿Cuál sería la nueva fecha de check-in? (formato dd/mm/aaaa)";
  }
  if (lang === "pt") {
    return isOut
      ? "Perfeito. Pode me confirmar também a data de check-out? (formato dd/mm/aaaa)"
      : "Entendido. Qual seria a nova data de check-in? (formato dd/mm/aaaa)";
  }
  // en
  return isOut
    ? "Great. Could you also share the check-out date? (format dd/mm/yyyy)"
    : "Got it. What would be the new check-in date? (format dd/mm/yyyy)";
}

function buildAskNewDates(lang: "es" | "en" | "pt"): string {
  if (lang === "es") {
    return "¿Cuáles serían las nuevas fechas de check-in y check-out? Podés enviarlas como 'dd/mm/aaaa a dd/mm/aaaa'.";
  }
  if (lang === "pt") {
    return "Quais seriam as novas datas de check-in e check-out? Você pode enviar como 'dd/mm/aaaa a dd/mm/aaaa'.";
  }
  return "What are the new check-in and check-out dates? You can send them as 'dd/mm/yyyy to dd/mm/yyyy'.";
}

function buildAskGuests(lang: "es" | "en" | "pt"): string {
  if (lang === "es") {
    return "¿Cuántos huéspedes se alojarán?";
  }
  if (lang === "pt") {
    return "Quantos hóspedes ficarão?";
  }
  return "How many guests will stay?";
}

function buildAskGuestName(lang: "es" | "en" | "pt"): string {
  if (lang === "es") {
    return "¿A nombre de quién sería la reserva? (nombre y apellido)";
  }
  if (lang === "pt") {
    return "Em nome de quem será a reserva? (nome e sobrenome)";
  }
  return "Under what name should I make the booking? (first and last name)";
}

// Capacidad por tipo de habitación (heurística simple)
function capacityFor(roomType?: string): number {
  const t = (roomType || "").toLowerCase();
  if (/single|sencilla|simple|individual/.test(t)) return 1;
  if (/double|doble|matrimonial/.test(t)) return 2;
  if (/triple/.test(t)) return 3;
  if (/quad|cuadruple|cuádruple|family|familiar/.test(t)) return 4;
  if (/suite/.test(t)) return 2; // por defecto
  return 2; // fallback conservador
}

// Escoge el tipo de habitación mínimo que soporte "guests"
function chooseRoomTypeForGuests(currentType: string | undefined, guests: number): { target: string; changed: boolean } {
  const candidates = [
    { k: "single", cap: 1 },
    { k: "double", cap: 2 },
    { k: "triple", cap: 3 },
    { k: "quad", cap: 4 },
  ];
  const curCap = capacityFor(currentType);
  if (currentType && guests <= curCap) return { target: currentType, changed: false };
  const found = candidates.find((c) => guests <= c.cap);
  return { target: found ? found.k : (currentType || "double"), changed: !currentType || guests > curCap };
}

// === Helpers para envío de copia de reserva ===
function buildReservationCopySummary(pre: PreLLMResult, nextSlots: ReservationSlotsStrict) {
  return {
    guestName: pre.st?.reservationSlots?.guestName || nextSlots.guestName,
    roomType: pre.st?.reservationSlots?.roomType || nextSlots.roomType,
    checkIn: pre.st?.reservationSlots?.checkIn || nextSlots.checkIn,
    checkOut: pre.st?.reservationSlots?.checkOut || nextSlots.checkOut,
    numGuests: pre.st?.reservationSlots?.numGuests || nextSlots.numGuests,
    reservationId: pre.st?.lastReservation && 'reservationId' in pre.st.lastReservation ? pre.st.lastReservation.reservationId : undefined,
    locale: pre.lang,
  } as any;
}

function detectWhatsAppCopyRequest(pre: PreLLMResult, text: string): { matched: boolean; mode?: 'explicit' | 'light'; inlinePhone?: string } {
  const userTxtRaw = text;
  // Explicita: debe contener "copia"/"copy" y whatsapp
  const explicitRe = /((envi|mand)[a-záéíóú]*\b[^\n]*\b(copia|copy)[^\n]*\b(whats?app|whas?tapp|wasap|wpp)|pued(?:es|e|o|en|an|ís|es)?\s+enviar\b[^\n]*\b(copia|copy)[^\n]*\b(whats?app|whas?tapp|wasap|wpp)|send\b[^\n]*copy[^\n]*(whats?app|whas?tapp))/i;
  if (explicitRe.test(userTxtRaw)) {
    const phoneInline = userTxtRaw.match(/(\+?\d[\d\s\-().]{6,}\d)/);
    return { matched: true, mode: 'explicit', inlinePhone: phoneInline?.[1] };
  }
  // Light: verbos de compartir sin la palabra copia, requiriendo contexto de reserva
  const lightRe = /(compart(?:i(?:r|rla|rme|ime|ila)?|e(?:s|la)?)|pasa(?:la|mela)?|manda(?:la|mela)?|envia(?:la|mela)?|send|share)[^\n]{0,80}?\b(?:por|via|en|no|on)?\s*(whats?app|whas?tapp|wasap|wpp)\b/i;
  let recentReservationMention = false;
  try {
    const lastAis = [...pre.lcHistory].reverse().filter(m => (m as any)._getType?.() === 'ai').slice(0, 3);
    recentReservationMention = lastAis.some(m => /reserva\s+confirmada|booking\s+confirmed|tienes\s+una\s+reserva/i.test(String((m as any).content || '')));
  } catch { }
  if (lightRe.test(userTxtRaw) && (pre.st?.lastReservation || recentReservationMention)) {
    const phoneInline = userTxtRaw.match(/(\+?\d[\d\s\-().]{6,}\d)/);
    return { matched: true, mode: 'light', inlinePhone: phoneInline?.[1] };
  }
  return { matched: false };
}

function getExpectedMissingDateFromHistory(
  lcHistory: (HumanMessage | AIMessage)[],
  _lang: "es" | "en" | "pt"
): ("checkIn" | "checkOut" | undefined) {
  for (let i = lcHistory.length - 1; i >= 0; i--) {
    const m = lcHistory[i];
    if (m instanceof AIMessage) {
      const t = String((m as any).content || "").toLowerCase();
      const askedIn = /(check\s*-?in|ingreso|entrada)/i.test(t);
      const askedOut = /(check\s*-?out|salida|egreso|retirada|partida|sa[ií]da)/i.test(t);
      if (askedIn && askedOut) return undefined; // pidió ambas
      if (askedIn && !askedOut) return "checkIn";
      if (askedOut && !askedIn) return "checkOut";
    }
  }
  return undefined;
}

// Busca en el historial reciente el último rango propuesto (preferimos mensajes del asistente
// donde se pregunta si desea verificar disponibilidad con un rango; si no, tomamos la última
// contribución de fechas del usuario).
function getProposedAvailabilityRange(
  lcHistory: (HumanMessage | AIMessage)[]
): { checkIn?: string; checkOut?: string } {
  let userLast: { checkIn?: string; checkOut?: string } = {};
  for (let i = lcHistory.length - 1; i >= 0 && i >= lcHistory.length - 12; i--) {
    const m = lcHistory[i];
    const txt = String((m as any).content || "");
    const dates = extractDateRangeFromText(txt);
    if (dates.checkIn && dates.checkOut) {
      // Prefer AI message if it contains the explicit proposal wording.
      if (m instanceof AIMessage && /(anot[eé] (?:nuevas\s+)?fechas|anotei as novas datas|noted the new dates)/i.test(txt)) {
        return { checkIn: dates.checkIn, checkOut: dates.checkOut };
      }
      // store last user pair as fallback
      if (m instanceof HumanMessage && !userLast.checkIn) {
        userLast = { checkIn: dates.checkIn, checkOut: dates.checkOut };
      }
    }
  }
  return userLast;
}

// Detecta si el usuario se refirió explícitamente solo a check-in o check-out sin dar fecha.
function detectDateSideFromText(text: string): ("checkIn" | "checkOut" | undefined) {
  const t = (text || "").toLowerCase();
  // Palabras asociadas a entrada / llegada
  if (/(check\s*-?in\b|ingreso\b|inreso\b|entrada\b|arribo\b|arrival\b)/i.test(t) && !/(check\s*-?out|salida|egreso|retirada|partida|sa[ií]da|departure)/i.test(t)) {
    return "checkIn";
  }
  if (/(check\s*-?out\b|salida\b|egreso\b|retirada\b|partida\b|sa[ií]da\b|departure\b)/i.test(t) && !/(check\s*-?in|ingreso|inreso|entrada|arrival|arribo)/i.test(t)) {
    return "checkOut";
  }
  return undefined;
}

// Detección de pregunta de horario de check-in / check-out para evitar confundir con flujo de modificación de fechas
function detectCheckinOrCheckoutTimeQuestion(text: string, _lang: "es" | "en" | "pt"): boolean {
  const t = (text || "").toLowerCase();
  return /(a\s+que\s+hora|qué\s+hora|que\s+hora|what\s+time|horario|hours?)\s+(es\s+el\s+|do\s+)?(check\s*-?in|check\s*-?out)/i.test(t);
}

// Devuelve la última fecha de usuario previa (cuando sólo dio una) para poder emparejar
function getLastUserDatesFromHistory(lcHistory: (HumanMessage | AIMessage)[]): { checkIn?: string; checkOut?: string } {
  for (let i = lcHistory.length - 1; i >= 0; i--) {
    const m = lcHistory[i];
    if (m instanceof HumanMessage) {
      const txt = String((m as any).content || "");
      const range = extractDateRangeFromText(txt);
      if (range.checkIn || range.checkOut) return range;
    }
  }
  return {};
}

function isoToDDMMYYYY(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Versión estricta de asentimiento (sí/ok) para flujos de verificación de disponibilidad.
function isPureAffirmative(text: string, lang: "es" | "en" | "pt"): boolean {
  const raw = (text || "").trim().toLowerCase();
  if (!raw) return false;
  const cleaned = raw.replace(/[¡!¿?.,;:…"'`~]+/g, "").trim();
  if (/(pero|but|porém|porem|however)/i.test(raw)) return false;
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 4) return false;
  const sets = {
    es: new Set(["si", "sí", "dale", "ok", "okay", "perfecto", "claro", "por", "favor", "porfa", "de", "acuerdo"]),
    pt: new Set(["sim", "ok", "okay", "claro", "por", "favor", "manda", "ver", "pode"]),
    en: new Set(["yes", "ok", "okay", "sure", "please", "yup", "yep"]),
  } as const;
  const baseSets = sets[lang];
  const hasBase = words.some(w => baseSets.has(w.replace(/á|à|ã/g, "a").replace(/é/g, "e")) || baseSets.has(w));
  return hasBase && words.every(w => baseSets.has(w) || ["de", "acuerdo", "por", "favor"].includes(w));
}

// Confirmación explícita de acciones críticas: solo la palabra CONFIRMAR (con o sin comillas/puntuación)
function isPureConfirm(text: string): boolean {
  if (!text) return false;
  const cleaned = text.trim().toUpperCase().replace(/[“”"'`]/g, "");
  return /^CONFIRMAR$/.test(cleaned);
}

// Consultas de estado luego de ofrecer verificación de disponibilidad
function isAskAvailabilityStatusQuery(text: string, lang: "es" | "en" | "pt"): boolean {
  const t = (text || "").trim().toLowerCase();
  if (!t) return false;
  const es = /(pudiste\s+(confirmar|verificar|chequear)|ya\s+pudiste|me\s+confirmaste|resultado\s+de\s+la\s+verificaci[oó]n)/i;
  const en = /(did\s+you\s+(check|confirm)|were\s+you\s+able\s+to\s+(check|confirm)|any\s+update\s+on\s+availability)/i;
  const pt = /(conseguiu\s+(verificar|confirmar)|voc[eê]\s+conseguiu|alguma\s+novidade\s+sobre\s+a\s+disponibilidade)/i;
  return (lang === "es" ? es : lang === "pt" ? pt : en).test(t);
}

// Detecta si el asistente ofreció confirmar horario exacto de check-in/out
function askedToConfirmCheckTime(
  lcHistory: (HumanMessage | AIMessage)[],
  _lang: "es" | "en" | "pt"
): "checkin" | "checkout" | undefined {
  for (let i = lcHistory.length - 1; i >= 0 && i >= lcHistory.length - 3; i--) {
    const m = lcHistory[i];
    if (m instanceof AIMessage) {
      const txt = String((m as any).content || "").toLowerCase();
      const offered = /(puedo\s+confirmar\s+el\s+horario\s+exacto|posso\s+confirmar\s+o\s+hor[aá]rio\s+exato|i\s+can\s+confirm\s+the\s+exact\s+time)/i.test(txt);
      if (!offered) continue;
      const mentionsIn = /(check\s*-?in|ingreso|entrada|arrival)/i.test(txt);
      const mentionsOut = /(check\s*-?out|salida|egreso|retirada|partida|sa[ií]da|departure)/i.test(txt);
      if (mentionsIn && !mentionsOut) return "checkin";
      if (mentionsOut && !mentionsIn) return "checkout";
    }
  }
  return undefined;
}

function askedToVerifyAvailability(lcHistory: (HumanMessage | AIMessage)[], lang: "es" | "en" | "pt"): boolean {
  const patterns = lang === "es"
    ? /(verifi(?:car|que) disponibilidad|¿dese[aá]s que verifique disponibilidad)/i
    : lang === "pt"
      ? /(verificar a disponibilidade|deseja que eu verifique a disponibilidade)/i
      : /(check availability|do you want me to check availability)/i;
  for (let i = lcHistory.length - 1; i >= 0 && i >= lcHistory.length - 4; i--) {
    const m = lcHistory[i];
    if (m instanceof AIMessage) {
      const txt = String((m as any).content || "");
      if (patterns.test(txt)) return true;
    }
  }
  return false;
}

async function posLLM(pre: PreLLMResult, body: any): Promise<{ verdictInfo: any; llmInterp: Interpretation; needsSupervision: any }> {
  // Solo asesoramiento/auditoría: comparación pre vs LLM
  // Si se requiere, puedes exponer el resultado de esta función para logging, análisis o UI
  debugLog("[posLLM] IN", { pre, body });
  const llmSlotsForAudit: SlotMap = {
    guestName: body.nextSlots.guestName, roomType: body.nextSlots.roomType, checkIn: body.nextSlots.checkIn, checkOut: body.nextSlots.checkOut, numGuests: body.nextSlots.numGuests,
  };
  const llmIntentConf = intentConfidenceByRules(String(pre.msg.content || ""), (body.nextCategory as any) || "retrieval_based");
  const llmSlotConfs = slotsConfidenceByRules(llmSlotsForAudit);
  const llmInterp: Interpretation = {
    source: "llm",
    category: (body.nextCategory as any) ?? "retrieval_based",
    desiredAction: undefined,
    slots: llmSlotsForAudit,
    confidence: { intent: llmIntentConf, slots: llmSlotConfs },
    notes: ["llm via agentGraph/structured result"],
  };
  let verdictInfo: any = null;
  let needsSupervision = body.needsSupervision;
  try {
    const preInterp = preLLMInterpret(String(pre.msg.content || ""), {
      guestName: pre.currSlots.guestName, roomType: pre.currSlots.roomType, checkIn: pre.currSlots.checkIn, checkOut: pre.currSlots.checkOut, numGuests: pre.currSlots.numGuests,
    });
    verdictInfo = auditVerdict(preInterp, llmInterp);
    const riskyCategory = CONFIG.SENSITIVE_CATEGORIES.has(String(llmInterp.category || ""));
    const lowIntentConf = typeof llmInterp.confidence?.intent === "number" && llmInterp.confidence.intent < CONFIG.SUPERVISE_LOW_CONF_INTENT;
    needsSupervision = needsSupervision || (riskyCategory && verdictInfo?.status === "disagree") || lowIntentConf;
  } catch (e) {
    console.warn("[BP-A4W] verdict:error", (e as any)?.message || e);
  }
  // Devuelve solo asesoramiento
  debugLog("[posLLM] OUT", { llmInterp, verdictInfo, needsSupervision });
  return { verdictInfo, llmInterp, needsSupervision };
}

export async function handleIncomingMessage(
  msg: ChannelMessage,
  options?: {
    sendReply?: (reply: string) => Promise<void>;
    mode?: ChannelMode;
    skipPersistIncoming?: boolean;
    onlyBodyLLM?: boolean;
    preLLMInput?: PreLLMResult;
  }
): Promise<void> {
  debugLog("[handleIncomingMessage] IN", { msg, options });
  const lockId = msg.conversationId || `${msg.hotelId}-${msg.channel}-${(msg.sender || msg.guestId || "guest")}`;
  // Aseguramos orden serial por conversación
  return runQueued(lockId, async () => {
    // Flag runtime: si USE_PRE_POS_PIPELINE=1 activamos preLLM+posLLM (a menos que onlyBodyLLM lo fuerce)
    // Por defecto (sin la env) conservamos comportamiento actual (skip = true)
    const pipelineEnabled = process.env.USE_PRE_POS_PIPELINE === '1';
    const skipPrePos = options?.onlyBodyLLM === true ? true : !pipelineEnabled;
    if (!skipPrePos) {
      if (!(globalThis as any).__loggedPrePosOnce) {
        (globalThis as any).__loggedPrePosOnce = true;
        console.log('[pipeline] Activado preLLM/posLLM (USE_PRE_POS_PIPELINE=1)');
      }
    } else if (!(globalThis as any).__loggedSkipOnce) {
      (globalThis as any).__loggedSkipOnce = true;
      console.log('[pipeline] Modo compacto (solo bodyLLM). Set USE_PRE_POS_PIPELINE=1 para activar fases.');
    }
    let pre: PreLLMResult;
    if (skipPrePos) {
      // Inicializa contexto objetivo antes de bodyLLM
      const ctx = await getObjectiveContext(msg, options);
      const inModifyModeFallback = computeInModifyMode(ctx.st, ctx.currSlots, String(msg.content || ""));
      pre = options?.preLLMInput || {
        lang: ctx.lang,
        currSlots: ctx.currSlots,
        prevCategory: ctx.prevCategory,
        prevSlotsStrict: ctx.prevSlotsStrict,
        st: ctx.st,
        stateForPlaybook: { draft: null, confirmedBooking: null, locale: ctx.lang },
        intent: "general_question",
        inModifyMode: inModifyModeFallback,
        hasDraftOrConfirmed: false,
        promptKey: "default",
        systemInstruction: "Eres un asistente de reservas de hotel.",
        lcHistory: ctx.lcHistory,
        hints: [],
        draftExists: false,
        guest: ctx.guest,
        conversationId: ctx.conversationId,
        msg,
        options: options ?? {},
      };
      debugLog("[handleIncomingMessage] preLLM/pre", pre);
    } else {
      pre = await preLLM(msg, options);
      // Asegura que pre.options exista aunque preLLM no lo devuelva (retrocompatibilidad)
      if (!pre.options) pre.options = options ?? {};
    }
    // --- bodyLLM ---
    const body = await bodyLLM(pre);
    debugLog("[handleIncomingMessage] bodyLLM/body", body);
    // Persist minimal conv_state only for copy follow-ups so next turn can continue that flow
    const needsFollowupPersist = body?.nextCategory === "send_whatsapp_copy" || body?.nextCategory === "send_email_copy";
    if (needsFollowupPersist) {
      try {
        await upsertConvState(pre.msg.hotelId, pre.conversationId, {
          reservationSlots: body?.nextSlots || pre.currSlots,
          lastCategory: body?.nextCategory ?? pre.prevCategory ?? null,
          updatedBy: "ai",
        } as any);
      } catch (e) {
        console.warn("[handleIncomingMessage] upsertConvState warn:", (e as any)?.message || e);
      }
    }
    // --- Persistir y emitir respuesta (siempre, independientemente de posLLM) ---
    let needsSupervision = body.needsSupervision;
    let verdictInfo = undefined;
    let llmInterp = undefined;
    if (!skipPrePos) {
      // Si se usa posLLM, obtener asesoramiento
      const pos = await posLLM(pre, body);
      debugLog("[handleIncomingMessage] posLLM/pos", pos);
      verdictInfo = pos.verdictInfo;
      llmInterp = pos.llmInterp;
      needsSupervision = pos.needsSupervision;
    }
    const suggestion = body.finalText;
    debugLog("[handleIncomingMessage] suggestion", suggestion);
    // Decidir si este turno debe salir como "sent" (sin supervisión)
    // Reglas:
    // 1) Si el grafo devolvió snapshot/verify o reservation(close) → directo
    // 2) Si la categoría es "segura" y no hay needsSupervision → respeta modo combinado canal+guest
    const isSnapshotReply = !!(body?.graphResult && (
      (body.graphResult.category === "reservation_snapshot") ||
      (body.graphResult.category === "reservation_verify") ||
      (body.graphResult.category === "reservation" && body.graphResult.salesStage === "close")
    ));
    // Modo combinado: preferimos supervised si alguno lo es
    const combinedMode: ChannelMode = combineModes(pre.options?.mode, pre.guest.mode ?? "automatic");
    const autoSend = isSnapshotReply || (!needsSupervision && combinedMode === "automatic");

    const aiMsg: ChannelMessage = {
      ...pre.msg,
      messageId: crypto.randomUUID(),
      sender: "assistant",
      role: "ai",
      content: suggestion,
      suggestion,
      status: autoSend ? "sent" : "pending",
      timestamp: safeNowISO(),
      respondedBy: needsSupervision ? "assistant" : undefined,
    };
    debugLog("[handleIncomingMessage] aiMsg", aiMsg);
    (aiMsg as any).audit = verdictInfo ? { verdict: verdictInfo, llm: llmInterp } : undefined;
    await saveChannelMessageToAstra(aiMsg);
    channelMemory.addMessage(aiMsg);
    try {
      if (aiMsg.status === "sent") {
        console.log("📤 [reply] via adapter?", !!pre.options?.sendReply, { len: suggestion.length });
        await emitReply(pre.conversationId, suggestion, pre.options?.sendReply);
        debugLog("[handleIncomingMessage] emitReply sent", { conversationId: pre.conversationId, suggestion });
      } else {
        debugLog("[handleIncomingMessage] emitReply pending", { conversationId: pre.conversationId, reason: verdictInfo?.reason });
        const pending = pre.lang.startsWith("es")
          ? "🕓 Tu consulta está siendo revisada por un recepcionista."
          : pre.lang.startsWith("pt")
            ? "🕓 Sua solicitação está sendo revisada por um recepcionista."
            : "🕓 Your request is being reviewed by a receptionist.";
        await emitReply(pre.conversationId, pending, pre.options?.sendReply);
      }
    } catch (err) {
      debugLog("[handleIncomingMessage] sendReply error", err);
      console.error("❌ [messageHandler] sendReply error:", err);
    }
  });
}
