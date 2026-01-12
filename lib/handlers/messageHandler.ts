
// Path: /root/begasist/lib/handlers/messageHandler.ts
import type { ChannelMessage, ChannelMode } from "@/types/channel";
import { incAutosend } from "@/lib/telemetry/metrics";
import {
  getMessagesByConversation,
  type MessageDoc,
  saveChannelMessageToAstra,
} from "@/lib/db/messages";
import { agentGraph } from "@/lib/agents";
import { decideSupervisorStatus } from "@/lib/agents/supervisorAgent";
import { buildPendingNotice } from "@/lib/agents/outputFormatterAgent";
import { updateConversationState } from "@/lib/agents/stateUpdaterAgent";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { channelMemory } from "@/lib/services/channelMemory";
import { getOrCreateConversation } from "@/lib/db/conversations";
import { getGuest, createGuest, updateGuest } from "@/lib/db/guests";
import { getConvState, CONVSTATE_VERSION } from "@/lib/db/convState";
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
// askAvailability moved to pipeline/availability via runAvailabilityCheck
import {
  runAvailabilityCheck,
  isoToDDMMYYYY,
  getProposedAvailabilityRange,
  detectDateSideFromText,
  getLastUserDatesFromHistory,
  buildAskMissingDate,
  buildAskNewDates,
  buildAskGuests,
  buildAskGuestName,
  chooseRoomTypeForGuests,
  isAskAvailabilityStatusQuery,
  askedToVerifyAvailability,
  isPureConfirm,
  detectCheckinOrCheckoutTimeQuestion,
  isPureAffirmative,
  askedToConfirmCheckTime,
} from "./pipeline/availability";
import { answerWithKnowledge } from "@/lib/agents/knowledgeBaseAgent";

// ================================
// --- Mini mejoras: normalización y métricas de teléfonos WhatsApp ---
const waPhoneMetrics = { invalidAttempts: 0, accepted: 0 };
export function getWaPhoneMetrics() { return { ...waPhoneMetrics }; }
export function resetWaPhoneMetrics() { waPhoneMetrics.invalidAttempts = 0; waPhoneMetrics.accepted = 0; }
const STRICT_WA_NUMERIC = process.env.WHATSAPP_STRICT_NUMERIC === '1';
function normalizeWA(raw: string): { normalized?: string; reason?: string } {
  if (!raw) return { reason: 'empty' };
  const plus = raw.trim().startsWith('+');
  const cleaned = raw.replace(/[\s\-().]/g, '');
  if (/[A-Za-z]/.test(cleaned)) {
    if (STRICT_WA_NUMERIC) { waPhoneMetrics.invalidAttempts++; return { reason: 'alpha_present' }; }
  }
  const digits = cleaned.replace(/[^0-9]/g, '');
  if (digits.length < 7) { waPhoneMetrics.invalidAttempts++; return { reason: 'too_short' }; }
  waPhoneMetrics.accepted++;
  return { normalized: (plus ? '+' : '') + digits };
}

export type ReservationSlotsStrict = SlotMap;

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

const FORCE_GENERATION = process.env.FORCE_GENERATION === '1';
const USE_ORCHESTRATOR_AGENT = process.env.USE_ORCHESTRATOR_AGENT === '1' || process.env.USE_ORCHESTRATOR_AGENT === 'true';
const USE_MH_FLOW_GRAPH = process.env.USE_MH_FLOW_GRAPH === '1' || process.env.USE_MH_FLOW_GRAPH === 'true';
const ENABLE_TEST_FASTPATH = process.env.ENABLE_TEST_FASTPATH === '1' || process.env.DEBUG_FASTPATH === '1' || process.env.NODE_ENV === 'test' || Boolean((globalThis as any).vitest) || Boolean(process.env.VITEST);
const IS_TEST = ENABLE_TEST_FASTPATH;
export const MH_VERSION = "mh-2025-09-23-structured-01";
console.log("[messageHandler] loaded:", MH_VERSION);
console.log("[messageHandler] using convState:", CONVSTATE_VERSION);
try {
  const reasons: string[] = [];
  if (FORCE_GENERATION) reasons.push('FORCE_GENERATION=1');
  if (ENABLE_TEST_FASTPATH) reasons.push('ENABLE_TEST_FASTPATH');
  if (!process.env.OPENAI_API_KEY) reasons.push('NO_OPENAI_API_KEY');
  const hasKey = Boolean(process.env.OPENAI_API_KEY);
  console.warn(`[messageHandler] fastpath → forceGen=${FORCE_GENERATION} | testFast=${ENABLE_TEST_FASTPATH} | key=${hasKey ? 'present' : 'missing'} | reasons=${reasons.join(',') || 'none'}`);
} catch { }

// ===== Logical Agents Index =====
// Agent: InputNormalizer (preLLM) — asegura guest/conversación, idempotencia, persistencia de entrante, historial y conv_state.
// Agent: Orchestrator/Planner (bodyLLM + agentGraph) — atajos de negocio, llamada al grafo, ensamble de respuesta/categoría/slots.
// Agent: SupervisorDecision — combina modos (canal+huésped) y needsSupervision para decidir sent/pending.
// Agent: StateUpdater — actualiza conv_state con slots/categoría/flags de supervisión, etc.
// Agent: OutputFormatter — construye el mensaje AI, define avisos de revisión y emite por canal/SSE.

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
// Historial seguro con fallback silencioso
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

// Extrae texto plano desde contenido LC que puede ser string o array de partes
function extractTextFromLCContent(content: any): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map(part => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object") return String(part.text || part.content || "");
      return "";
    }).join(" ").trim();
  }
  if (typeof content === "object") {
    if (content.text) return String(content.text);
    if (content.content) return String(content.content);
  }
  return "";
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
// ===== Agent: OutputFormatter =====
// Emite la respuesta final al canal/SSE. Si existe payload enriquecido, lo adjunta.
async function emitReply(conversationId: string, text: string, sendReply?: (reply: string) => Promise<void>, rich?: { type: string; data?: any }) {
  if (sendReply) { await sendReply(text); }
  else {
    const { emitToConversation } = await import("@/lib/web/eventBus");
    emitToConversation(conversationId, { type: "message", sender: "assistant", text, timestamp: safeNowISO(), ...(rich ? { rich } : {}) });
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
    // Skip structured analysis in test/DEBUG environments or when missing API key to avoid timeouts
    const isTestEnv = ENABLE_TEST_FASTPATH;
    if (!FORCE_GENERATION && (isTestEnv || !process.env.OPENAI_API_KEY)) {
      return null;
    }
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
// ===== Agent: InputNormalizer (preLLM) =====
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
  debugLog("[FlujoCHKI][preLLM] IN", { msg, options });
  if (msg.content && /check.?in|check.?out|entrada|salida|ingreso/i.test(msg.content)) {
    console.log("[FlujoCHKI][preLLM] msg.content:", msg.content);
  }
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
  debugLog("[FlujoCHKI][preLLM] intent detected", { intent, inModifyMode, promptKey });
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

// runAvailabilityCheck moved to ./pipeline/availability

// ===== Agent: Orchestrator/Planner (bodyLLM + agentGraph) =====
async function bodyLLM(pre: PreLLMResult): Promise<any> {
  debugLog("[bodyLLM] IN", { pre });
  let finalText = "";
  let nextCategory: string | null = pre.prevCategory;
  let nextSlots: ReservationSlotsStrict = pre.currSlots;
  let needsSupervision = false;
  let graphResult: any = null;
  // Fast-path 0: if the user provides an explicit full date range in the same message, confirm immediately
  try {
    const userTxt0 = String(pre.msg.content || "");
    const dr0 = extractDateRangeFromText(userTxt0);
    if (dr0.checkIn && dr0.checkOut) {
      const ciTxt = isoToDDMMYYYY(dr0.checkIn) || dr0.checkIn;
      const coTxt = isoToDDMMYYYY(dr0.checkOut) || dr0.checkOut;
      finalText = pre.lang === 'es'
        ? `Anoté nuevas fechas: ${ciTxt} → ${coTxt}. ¿Deseás que verifique disponibilidad y posibles diferencias?`
        : pre.lang === 'pt'
          ? `Anotei as novas datas: ${ciTxt} → ${coTxt}. Deseja que eu verifique a disponibilidade e possíveis diferenças?`
          : `Noted the new dates: ${ciTxt} → ${coTxt}. Do you want me to check availability and any differences?`;
      nextSlots = { ...nextSlots, checkIn: dr0.checkIn, checkOut: dr0.checkOut } as ReservationSlotsStrict;
      return { finalText, nextCategory: 'modify_reservation', nextSlots, needsSupervision, graphResult: null };
    }
  } catch { /* noop */ }
  // Fast-path: si el usuario aporta UNA sola fecha (check-in o check-out) en modo modificación o contexto de reserva,
  // pedimos la fecha faltante inmediatamente sin invocar el grafo pesado.
  try {
    const userTxtFast = String(pre.msg.content || "");
    const drFast = extractDateRangeFromText(userTxtFast);
    const hasOneDateOnly = (drFast.checkIn && !drFast.checkOut) || (!drFast.checkIn && drFast.checkOut);
    const hasContext = pre.inModifyMode || pre.st?.salesStage === "close" || !!pre.st?.reservationSlots;
    if (hasOneDateOnly && hasContext) {
      // Si existe una fecha única previa en el historial del usuario (excluyendo el mensaje actual), emparejar y confirmar rango
      const hist = [...pre.lcHistory];
      const last = hist.at(-1);
      if (last instanceof HumanMessage) {
        const lastTxt = String((last as any).content || "");
        if (lastTxt.trim() === userTxtFast.trim()) hist.pop();
      }
      const prevSingle = getLastUserDatesFromHistory(hist);
      const prevISO = prevSingle.checkIn || prevSingle.checkOut;
      const currISO = drFast.checkIn || drFast.checkOut;
      if (prevISO && currISO) {
        const a = new Date(prevISO);
        const b = new Date(currISO);
        const ciISO = a <= b ? prevISO : currISO;
        const coISO = a <= b ? currISO : prevISO;
        const ciTxt = isoToDDMMYYYY(ciISO) || ciISO;
        const coTxt = isoToDDMMYYYY(coISO) || coISO;
        finalText = pre.lang === 'es'
          ? `Anoté nuevas fechas: ${ciTxt} → ${coTxt}. ¿Deseás que verifique disponibilidad y posibles diferencias?`
          : pre.lang === 'pt'
            ? `Anotei as novas datas: ${ciTxt} → ${coTxt}. Deseja que eu verifique a disponibilidade e possíveis diferenças?`
            : `Noted the new dates: ${ciTxt} → ${coTxt}. Do you want me to check availability and any differences?`;
        nextSlots = { ...nextSlots, checkIn: ciISO, checkOut: coISO } as ReservationSlotsStrict;
        return { finalText, nextCategory: 'modify_reservation', nextSlots, needsSupervision, graphResult: null };
      }
      // No hay fecha previa: pedir la faltante
      const missingSide = drFast.checkIn ? "checkOut" : "checkIn";
      finalText = buildAskMissingDate(pre.lang, missingSide as any);
      return { finalText, nextCategory: pre.inModifyMode ? "modify_reservation" : (pre.prevCategory ?? null), nextSlots, needsSupervision, graphResult: null };
    }
  } catch { /* noop fast-path */ }
  // Fast-path 2: contexto de reserva confirmada o intención genérica de modificar → mostrar menú sin invocar grafo
  try {
    const userTxt = String(pre.msg.content || "");
    const tLower = userTxt.toLowerCase();
    const hasConfirmed = pre.st?.salesStage === "close" || !!pre.st?.reservationSlots;
    const mentionsReservation = /(reserva|booking)/i.test(tLower);
    const looksGreeting = /^(hola|buenas|hello|hi|hey|ol[aá]|oi)\b/i.test(tLower) || /creo que tengo una reserva|tengo una reserva|i think i have a booking|acho que tenho uma reserva/i.test(tLower);
    const genericModify = wantsGenericModify(userTxt, pre.lang);
    // Evitar menú genérico si el usuario mencionó explícitamente check-in/check-out o fechas
    const sideIntentFast = detectDateSideFromText(userTxt);
    const hasAnyDateTokenFast = /\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/.test(userTxt);
    const mentionsDatesFast = /(fecha|fechas|date|dates|data|datas|check\s*-?in|check\s*-?out|ingres(?:o|ar|amos)|inreso|entrada|llegada|arribo|salida|egreso|retirada|partida|sa[ií]da|departure|arrival)/i.test(tLower);
    const isDateTopicFast = Boolean(sideIntentFast || hasAnyDateTokenFast || mentionsDatesFast);
    if (!isDateTopicFast && (genericModify || (hasConfirmed && mentionsReservation && (looksGreeting || !/precio|price|pol[ií]tica|policy|check\s*-?in|check\s*-?out|hora|horario/i.test(tLower))))) {
      const knownSlots = { ...(pre.st?.reservationSlots || {}), ...(nextSlots || {}) } as ReservationSlotsStrict;
      finalText = buildModifyOptionsMenu(pre.lang, knownSlots);
      return { finalText, nextCategory: "modify_reservation", nextSlots: knownSlots, needsSupervision, graphResult: null };
    }
  } catch { /* noop */ }
  // === Follow-up manejo de reintento/envío email tras fallo anterior ===
  if (pre.prevCategory === 'send_email_copy') {
    const msgLower = String(pre.msg.content || '').toLowerCase();
    // 🔀 Nuevo: desvío a WhatsApp si el usuario pide reenviar allí
    const wantsWhatsApp = /whats?app|wa\b/i.test(msgLower);
    if (wantsWhatsApp) {
      // detectar número en el mismo mensaje (normalización unificada)
      const phoneMatchWA = pre.msg.content.match(/(\+?\d[\d\s\-().]{6,}\d)/);
      if (phoneMatchWA) {
        const rawExtract = phoneMatchWA[1];
        const norm = normalizeWA(rawExtract);
        if (norm.normalized) {
          try {
            const digitsOnly = norm.normalized.replace(/^\+/, '');
            const jid = `${digitsOnly}@s.whatsapp.net`;
            const { sendReservationCopyWA } = await import('@/lib/whatsapp/sendReservationCopyWA');
            const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');
            const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');
            const summary = {
              guestName: pre.st?.reservationSlots?.guestName || pre.currSlots.guestName,
              roomType: pre.st?.reservationSlots?.roomType || pre.currSlots.roomType,
              checkIn: pre.st?.reservationSlots?.checkIn || pre.currSlots.checkIn,
              checkOut: pre.st?.reservationSlots?.checkOut || pre.currSlots.checkOut,
              numGuests: pre.st?.reservationSlots?.numGuests || pre.currSlots.numGuests,
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
            const display = norm.normalized.startsWith('+') ? norm.normalized : `+${norm.normalized}`; // uniforme sin separadores
            const finalTextWA = pre.lang === 'es'
              ? `Listo, te envié una copia por WhatsApp al ${display}.`
              : pre.lang === 'pt'
                ? `Pronto, enviei uma cópia pelo WhatsApp para ${display}.`
                : `Done, I sent a copy via WhatsApp to ${display}.`;
            return { finalText: finalTextWA, nextCategory: 'send_whatsapp_copy', nextSlots: pre.currSlots, needsSupervision: false, graphResult: null };
          } catch (e) {
            const code = (e as any)?.code;
            console.warn('[wa-copy][email-followup] error:', (e as any)?.message || e, code ? { code } : '');
            const failText = pre.lang === 'es'
              ? 'No pude enviarla por WhatsApp ahora. ¿Otro número o lo derivo?'
              : pre.lang === 'pt'
                ? 'Não consegui enviar pelo WhatsApp agora. Outro número ou encaminho?'
                : 'I could not send it via WhatsApp now. Another number or escalate?';
            return { finalText: failText, nextCategory: 'send_whatsapp_copy', nextSlots: pre.currSlots, needsSupervision: code && code !== 'WA_NOT_READY', graphResult: null };
          }
        } // si no se normaliza, normalizeWA ya incrementó invalidAttempts
      }
      // Pidió WhatsApp pero no hay número detectable o válido
      const askNum = pre.lang === 'es'
        ? '¿A qué número de WhatsApp te la envío? (incluí código de país)'
        : pre.lang === 'pt'
          ? 'Para qual número de WhatsApp devo enviar? (inclua o código do país)'
          : 'Which WhatsApp number should I send it to? (include country code)';
      return { finalText: askNum, nextCategory: 'send_whatsapp_copy', nextSlots: pre.currSlots, needsSupervision: false, graphResult: null };
    }
    const emailRegexFU = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
    const emailInMsg = pre.msg.content ? pre.msg.content.match(emailRegexFU)?.[0] : undefined;
    const wantsRetry = /(reintenta|reintentar|intenta|intentá|intentalo|otra vez|de nuevo|retry|reenvi(a|á)lo|reenvialo|reenviar|mandalo|envialo)/i.test(msgLower);
    const wantsEscalate = /(deriv|recepc(i|í)on|recepção|humano|persona|agente|manual)/i.test(msgLower);
    const prevAttempt = (pre.st as any)?.lastEmailCopyAttempt;
    const lastEmail = emailInMsg || prevAttempt?.to;
    if (wantsEscalate) {
      needsSupervision = true;
      await updateConversationState(pre.msg.hotelId, pre.conversationId, { supervised: true, desiredAction: 'notify_reception', updatedBy: 'ai' } as any);
      finalText = pre.lang === 'es'
        ? 'Derivo a recepción para que lo envíen manualmente.'
        : pre.lang === 'pt'
          ? 'Encaminho à recepção para que enviem manualmente.'
          : 'Escalating to reception so they can send it manually.';
      return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };
    }
    if (emailInMsg || wantsRetry) {
      if (!lastEmail) {
        finalText = pre.lang === 'es'
          ? 'Necesito el correo para reenviarla. ¿A qué correo te la envío?'
          : pre.lang === 'pt'
            ? 'Preciso do e-mail para reenviar. Para qual e-mail envio?'
            : 'I need the email address to resend it. Which email should I use?';
        return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };
      }
      // Reintento / nuevo email
      const toDDMMYYYY = (iso?: string) => { if (!iso) return iso; const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; };
      try {
        const { sendReservationCopy } = await import('@/lib/email/sendReservationCopy');
        const summary: any = {
          guestName: pre.st?.reservationSlots?.guestName || nextSlots.guestName,
          roomType: pre.st?.reservationSlots?.roomType || nextSlots.roomType,
          checkIn: pre.st?.reservationSlots?.checkIn || nextSlots.checkIn,
          checkOut: pre.st?.reservationSlots?.checkOut || nextSlots.checkOut,
          numGuests: pre.st?.reservationSlots?.numGuests || nextSlots.numGuests,
          reservationId: pre.st?.lastReservation && 'reservationId' in pre.st.lastReservation ? pre.st.lastReservation.reservationId : undefined,
          locale: pre.lang,
        };
        if (summary.checkIn) summary.displayCheckIn = toDDMMYYYY(summary.checkIn);
        if (summary.checkOut) summary.displayCheckOut = toDDMMYYYY(summary.checkOut);
        let attempt = 0; let sent = false; let err: any; let lastErrorType: string | undefined;
        while (attempt < 2 && !sent) {
          try {
            await sendReservationCopy({ hotelId: pre.msg.hotelId, to: lastEmail, summary, conversationId: pre.conversationId, channel: pre.msg.channel });
            sent = true;
          } catch (e: any) {
            err = e;
            attempt++;
            // Clasificamos inmediatamente para decidir si vale la pena reintentar
            const rawMsgLoop = e?.message || String(e || '');
            try {
              const { classifyEmailError } = await import('@/lib/email/classifyEmailError');
              const cLoop = classifyEmailError(rawMsgLoop);
              lastErrorType = cLoop.type;
              if (cLoop.isNotConfigured || cLoop.isQuota) {
                // No tiene sentido un segundo intento inmediato.
                break;
              }
            } catch { }
            if (attempt < 2 && !sent) await new Promise(r => setTimeout(r, 150));
          }
        }
        if (sent) {
          await updateConversationState(pre.msg.hotelId, pre.conversationId, { lastEmailCopyAttempt: { to: lastEmail, failures: 0, updatedAt: new Date().toISOString(), lastErrorType: undefined }, lastCategory: 'send_email_copy', updatedBy: 'ai' } as any);
          finalText = pre.lang === 'es'
            ? `Listo, te envié una copia por email a ${lastEmail}.`
            : pre.lang === 'pt'
              ? `Pronto, enviei uma cópia por e-mail para ${lastEmail}.`
              : `Done, I sent a copy by email to ${lastEmail}.`;
          return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };
        }
        const rawMsg = err?.message || String(err || '');
        const { classifyEmailError } = await import('@/lib/email/classifyEmailError');
        const classification = classifyEmailError(rawMsg);
        const isNotConfigured = classification.isNotConfigured;
        const isQuota = classification.isQuota;
        const prevFailures = (prevAttempt?.failures || 0) + 1;
        const escalationThreshold = 3;
        if (prevFailures >= escalationThreshold) {
          needsSupervision = true;
          await updateConversationState(pre.msg.hotelId, pre.conversationId, { supervised: true, desiredAction: 'notify_reception', lastEmailCopyAttempt: { to: lastEmail, failures: prevFailures, updatedAt: new Date().toISOString(), lastError: rawMsg, lastErrorType: classification.type }, updatedBy: 'ai' } as any);
          finalText = pre.lang === 'es'
            ? 'No pude enviarlo tras varios intentos. Derivo a recepción.'
            : pre.lang === 'pt'
              ? 'Não consegui enviar após várias tentativas. Encaminho à recepção.'
              : 'I couldn’t send it after several attempts. Escalating to reception.';
          return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };
        }
        await updateConversationState(pre.msg.hotelId, pre.conversationId, { lastEmailCopyAttempt: { to: lastEmail, failures: prevFailures, updatedAt: new Date().toISOString(), lastError: rawMsg, lastErrorType: classification.type }, lastCategory: 'send_email_copy', updatedBy: 'ai' } as any);
        if (isNotConfigured) {
          finalText = pre.lang === 'es'
            ? 'Aún no está configurado el envío de correos. ¿Otro email o lo derivo?'
            : pre.lang === 'pt'
              ? 'Envio de e-mails não configurado. Outro e-mail ou encaminho?'
              : 'Email sending not configured. Another email or escalate?';
        } else if (isQuota) {
          finalText = pre.lang === 'es'
            ? 'Se alcanzó el límite diario de envíos. ¿Otro email (otro dominio) o lo derivo?'
            : pre.lang === 'pt'
              ? 'Limite diário de envios atingido. Outro e-mail (outro domínio) ou encaminho?'
              : 'Daily sending limit reached. Another email (different domain) or escalate?';
        } else {
          finalText = pre.lang === 'es'
            ? 'Sigue fallando. ¿Intento otra vez, otro email o lo derivo?'
            : pre.lang === 'pt'
              ? 'Ainda falhou. Tentar de novo, outro e-mail ou encaminho?'
              : 'Still failing. Retry, another email, or escalate?';
        }
        return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };
      } catch (e) {
        // Error inesperado en el flujo mismo
        console.warn('[email-copy-followup] unexpected error', (e as any)?.message || e);
        finalText = pre.lang === 'es'
          ? 'Tuve un problema inesperado. ¿Reintento o lo derivo a recepción?'
          : pre.lang === 'pt'
            ? 'Tive um problema inesperado. Tentar novamente ou encaminho à recepção?'
            : 'Unexpected issue. Retry or escalate to reception?';
        return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };
      }
    }
    // Si el usuario simplemente repite snapshot o algo irrelevante, dejamos continuar (posibles otras detecciones)
  }
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
    const toDDMMYYYY = (iso?: string) => {
      if (!iso) return iso;
      const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
    };
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
    if (summary.checkIn) summary.displayCheckIn = toDDMMYYYY(summary.checkIn);
    if (summary.checkOut) summary.displayCheckOut = toDDMMYYYY(summary.checkOut);
    let attempt = 0; let sentOK = false; let lastErr: any;
    while (attempt < 2 && !sentOK) {
      try {
        await sendReservationCopy({ hotelId: pre.msg.hotelId, to: email, summary, conversationId: pre.conversationId, channel: pre.msg.channel });
        sentOK = true;
      } catch (err) {
        lastErr = err; attempt++; if (attempt < 2) await new Promise(r => setTimeout(r, 150));
      }
    }
    if (sentOK) {
      finalText = pre.lang === "es"
        ? `Listo, te envié una copia por email a ${email}.`
        : pre.lang === "pt"
          ? `Pronto, enviei uma cópia por e-mail para ${email}.`
          : `Done, I sent a copy by email to ${email}.`;
      return { finalText, nextCategory: "send_email_copy", nextSlots, needsSupervision, graphResult };
    }
    const rawMsg = (lastErr as any)?.message || String(lastErr || '');
    const isNotConfigured = /not configured|smtpHost/i.test(rawMsg);
    console.warn('[email-copy][retry-fail]', rawMsg, { isNotConfigured });
    finalText = isNotConfigured
      ? (pre.lang === 'es'
        ? 'Aún no está configurado el envío de correos. ¿Querés dar otro email o lo derivo a recepción?'
        : pre.lang === 'pt'
          ? 'O envio de e-mails não está configurado ainda. Quer informar outro e-mail ou encaminho à recepção?'
          : 'Email sending is not configured. Would you like another address or escalate to reception?')
      : (pre.lang === 'es'
        ? 'No pude enviarlo ahora. ¿Querés que lo intente de nuevo o lo derivo a recepción?'
        : pre.lang === 'pt'
          ? 'Não consegui enviar agora. Quer que eu tente novamente ou encaminho à recepção?'
          : "I couldn't send it now. Should I retry or escalate to reception?");
    // No escalamos todavía: el usuario decide.
    return { finalText, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };
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
      const toDDMMYYYY = (iso?: string) => {
        if (!iso) return iso; const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
      };
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
      if (summary.checkIn) summary.displayCheckIn = toDDMMYYYY(summary.checkIn);
      if (summary.checkOut) summary.displayCheckOut = toDDMMYYYY(summary.checkOut);
      let attempt = 0; let sentOK = false; let lastErr: any;
      while (attempt < 2 && !sentOK) {
        try {
          await sendReservationCopy({ hotelId: pre.msg.hotelId, to: explicitEmail, summary, conversationId: pre.conversationId, channel: pre.msg.channel });
          sentOK = true;
        } catch (err) { lastErr = err; attempt++; if (attempt < 2) await new Promise(r => setTimeout(r, 150)); }
      }
      if (sentOK) {
        const ok = pre.lang === 'es'
          ? `Listo, te envié una copia por email a ${explicitEmail}.`
          : pre.lang === 'pt'
            ? `Pronto, enviei uma cópia por e-mail para ${explicitEmail}.`
            : `Done, I sent a copy by email to ${explicitEmail}.`;
        return { finalText: ok, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };
      }
      const rawMsg = (lastErr as any)?.message || String(lastErr || '');
      const isNotConfigured = /not configured|smtpHost/i.test(rawMsg);
      console.warn('[email-copy-light][retry-fail]', rawMsg, { isNotConfigured });
      const fail = isNotConfigured
        ? (pre.lang === 'es'
          ? 'Aún no está configurado el envío de correos. ¿Querés dar otro email o lo derivo a recepción?'
          : pre.lang === 'pt'
            ? 'O envio de e-mails não está configurado ainda. Quer informar outro e-mail ou encaminho à recepção?'
            : 'Email sending is not configured. Would you like another address or escalate to reception?')
        : (pre.lang === 'es'
          ? 'No pude enviarlo ahora. ¿Querés que lo intente de nuevo o lo derivo a recepción?'
          : pre.lang === 'pt'
            ? 'Não consegui enviar agora. Quer que eu tente novamente ou encaminho à recepção?'
            : "I couldn't send it now. Should I retry or escalate to reception?");
      return { finalText: fail, nextCategory: 'send_email_copy', nextSlots, needsSupervision, graphResult };
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
          const attempt = normalizeWA(phoneInline[1]);
          if (attempt.normalized) {
            const digitsInline = attempt.normalized.replace(/\D/g, '');
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
              const display = attempt.normalized.startsWith('+') ? attempt.normalized : `+${digitsInline}`;
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
        const attempt = normalizeWA(phoneInline[1]);
        if (attempt.normalized) {
          const digitsInline = attempt.normalized.replace(/\D/g, "");
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
            const display = attempt.normalized.startsWith('+') ? attempt.normalized : `+${digitsInline}`;
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
      await updateConversationState(pre.msg.hotelId, pre.conversationId, {
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
      await updateConversationState(pre.msg.hotelId, pre.conversationId, {
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
        await updateConversationState(pre.msg.hotelId, pre.conversationId, {
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
        await updateConversationState(pre.msg.hotelId, pre.conversationId, {
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

  {
    const started = Date.now();
    try {
      // En entorno de test, evitamos invocar el grafo pesado solo para saludos triviales
      const isTestEnvBody = process.env.NODE_ENV === 'test' || Boolean((globalThis as any).vitest) || Boolean(process.env.VITEST);
      const tLowerBody = String(pre.msg.content || "").toLowerCase();
      const looksGreetingBody = /^(hola|buenas|hello|hi|hey|ol[aá]|oi)\b/.test(tLowerBody);

      if (ENABLE_TEST_FASTPATH && looksGreetingBody && !pre.inModifyMode) {
        // Camino ultra liviano para tests / saludos
        finalText = ruleBasedFallback(pre.lang, String(pre.msg.content || ""));
        nextCategory = "retrieval_based";
      } else {
        // ============================
        // NEW: Fast-path KnowledgeBase
        // ============================
        const kbUserText = String(pre.msg.content || "");

        // Consideramos "contexto de reserva" cuando hay borrador/confirmación o modo modificación activo
        const hasReservationContext =
          pre.inModifyMode ||
          !!pre.stateForPlaybook?.draft ||
          !!pre.stateForPlaybook?.confirmedBooking;

        // Sólo usamos KB para consultas informativas (sin contexto de reserva)
        if (!hasReservationContext) {
          try {
            const kb = await answerWithKnowledge({
              question: kbUserText,
              hotelId: pre.msg.hotelId,
              desiredLang: pre.lang,
            });

            const cat = kb.category;
            const safeCat = isSafeAutosendCategory(cat);
            const text = kb.answer?.trim();

            // Usamos sólo si:
            // - ok = true
            // - respuesta de texto no vacía
            // - categoría "segura" (retrieval / info hotel)
            if (kb.ok && safeCat && text) {
              finalText = text;
              nextCategory = cat || "retrieval_based";
              nextSlots = pre.currSlots; // KB no toca slots de reserva

              graphResult = {
                ...(kb.debug || {}),
                category: cat,
                source: "knowledgeBaseAgent",
                contentTitle: kb.contentTitle,
                contentBody: kb.contentBody,
                retrieved: kb.retrieved,
              };

              // Atajo: no llamamos agentGraph si el KB ya resolvió bien
              return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
            }
          } catch (e) {
            console.warn("[KB] answerWithKnowledge error, sigo con agentGraph:", (e as any)?.message || e);
          }
        }

        // Enriquecer el SystemMessage con el estado de slots y reserva
        const systemInstruction = pre.systemInstruction + "\n" + buildStateSummary(pre.currSlots, pre.st);
        debugLog("[bodyLLM] systemInstruction", systemInstruction);

        const lcMessages = [
          new SystemMessage(systemInstruction),
          ...pre.lcHistory,
          new HumanMessage(String(pre.msg.content || "")),
        ];

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

        const merged: ReservationSlotsStrict = {
          ...(pre.currSlots || {}),
          ...((graphResult as any).reservationSlots || {}),
        };
        if (typeof merged.numGuests !== "undefined" && typeof merged.numGuests !== "string") {
          merged.numGuests = String((merged as any).numGuests);
        }
        nextSlots = merged;
      }

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
              if ((pre as any).__orchestratorActive) {
                // Delega construcción del structured fallback al planner
                graphResult = graphResult || {};
                (graphResult as any).structuredFallback = structured;
              } else {
                // Evita derivar al hotel cuando estamos en flujo de modificación: guía al usuario
                if (structured.handoff === true && pre.inModifyMode) {
                  finalText = buildModifyGuidance(pre.lang, nextSlots);
                } else {
                  finalText = structured.answer;
                }
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
            if ((pre as any).__orchestratorActive) {
              graphResult = graphResult || {};
              (graphResult as any).structuredFallback = structured;
            } else {
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
        }
      } catch (e) {
        console.warn("[structured] fallback error:", (e as any)?.message || e);
      }
      if (!finalText) {
        // Si el orquestador está activo, dejamos finalText vacío para que el planner maneje el fallback determinista.
        if (!(pre as any).__orchestratorActive) {
          finalText = ruleBasedFallback(pre.lang, String(pre.msg.content || ""));
          console.warn("⚠️ [graph] finalText vacío → fallback determinista");
        } else {
          console.warn("⚠️ [graph] finalText vacío → delegando fallback determinista al OrchestratorPlanner");
        }
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
    // Legacy recotización eliminada: la recotización por cambio de huéspedes con fechas conocidas
    // es manejada exclusivamente por el OrchestratorPlanner (runOrchestratorPlanner).

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
    // Disparar flujo de fechas también si hay cualquier token de fecha corto o completo en el mensaje (dd/mm o dd/mm/yyyy)
    const hasAnyDateToken = /\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/.test(String(pre.msg.content || ''));
    const triggerDateFlow = !timeQ && (pre.inModifyMode || mentionsDates || hasAnyDateToken || Boolean(userDates.checkIn || userDates.checkOut));

    if (timeQ) {
      // No sobrescribimos la respuesta aquí: dejamos que el grafo clasifique a retrieval_based
      // y responda desde la base de conocimiento. Solo evitamos disparar el flujo de fechas.
      if (!nextCategory) nextCategory = "retrieval_based";
      // finalText queda como lo devolvió el grafo (idealmente RAG tras la corrección en graph.ts)
    } else if (triggerDateFlow) {
      // 1) Prompts iniciales si no hay fechas todavía
      const hasDateTokenInMsg = hasAnyDateToken; // reutilizamos cálculo previo
      let preserveAskCheckIn: string | null = null;
      if (!hasDateTokenInMsg) {
        const sideIntent = detectDateSideFromText(String(pre.msg.content || ""));
        if (sideIntent) {
          finalText = buildAskMissingDate(pre.lang, sideIntent);
          if (sideIntent === 'checkIn') preserveAskCheckIn = finalText; // preservar si luego se genera confirmación accidental
        } else if (mentionsNewDates || mentionsDates) {
          finalText = buildAskNewDates(pre.lang);
        }
      }
      // 2) Consolidación modular (multi-fecha, herencia de año, follow-ups)
      try {
        const cons = (await import('./pipeline/dateConsolidation')).consolidateDates({
          lang: pre.lang,
          msgText: String(pre.msg.content || ''),
          lcHistory: pre.lcHistory,
          // IMPORTANTE: usar los slots PREVIOS (estado persistido antes de este turno)
          // y NO currSlots (que ya incluye fechas del mensaje actual). Si pasamos currSlots
          // la consolidación no detecta cambios (isDifferent === false) y no genera confirmación.
          prevSlots: { checkIn: pre.prevSlotsStrict?.checkIn, checkOut: pre.prevSlotsStrict?.checkOut },
          nextSlots,
          st: pre.st,
          preserveAskCheckInPrompt: preserveAskCheckIn,
        });
        if (cons.changed) {
          const userProvidedSomeDate = /\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/.test(String(pre.msg.content || ''));
          const userModifiesCheckInWithoutDate = !userProvidedSomeDate && /modificar\s+.*check\s*-?in|change\s+.*check-?in/i.test(String(pre.msg.content || ''));
          const isEmpty = !finalText || /^(entendido\.?|ok\.?|vale\.?|perfecto\.?|claro\.?|sí\.?|si\.?|okay\.?|de acuerdo\.?|great\.?|sure\.?)$/i.test((finalText || '').trim());
          if (!userModifiesCheckInWithoutDate && (isEmpty || cons.finalText)) {
            nextSlots = cons.nextSlots as any;
            if (cons.finalText) finalText = cons.finalText;
          }
          if (cons.preservedPrompt && /anot[eé] nuevas fechas|anotei as novas datas|noted the new dates/i.test(finalText || '')) {
            finalText = cons.preservedPrompt; // restaurar prompt original
          }
        }
      } catch (e) { console.warn('[dates] consolidateDates error', (e as any)?.message || e); }

      // Salvaguarda adicional: si tras la consolidación tenemos un rango NUEVO (checkIn+checkOut)
      // distinto al rango previo y la respuesta quedó en un ack genérico ("Entendido.",
      // "Podemos modificar tu reserva confirmada...", etc.), forzamos la confirmación temprana
      // con el formato esperado por los tests ("Anoté nuevas fechas: dd/mm/aaaa → dd/mm/aaaa ...").
      try {
        const prevCI = pre.prevSlotsStrict?.checkIn;
        const prevCO = pre.prevSlotsStrict?.checkOut;
        const newCI = nextSlots.checkIn;
        const newCO = nextSlots.checkOut;
        if (newCI && newCO && (newCI !== prevCI || newCO !== prevCO)) {
          const txt = (finalText || '').trim();
          // Fechas ya presentes? si ya mencionamos dd/mm/yyyy evitamos duplicar
          const hasDatesMentioned = /\d{2}\/\d{2}\/\d{4}/.test(txt);
          const genericAck = /^(entendido\.?|perfecto\.?|ok\.?|vale\.?|claro\.?|podemos modificar tu reserva confirmada\.|dime que deseas modificar de tu reserva\.?|podemos modificar tu reserva confirmada\. dime qué quieres cambiar\.?)/i.test(txt);
          if ((!txt || genericAck || !hasDatesMentioned)) {
            const toDDMMYYYY = (iso?: string) => {
              if (!iso) return iso || '';
              const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/);
              return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
            };
            const ciTxt = toDDMMYYYY(newCI);
            const coTxt = toDDMMYYYY(newCO);
            // Sólo sobre-escribimos si no preservamos un prompt explícito de pedir fecha faltante
            if (!/¿cu[aá]l es la fecha de check\-?out|what is the check\-?out date|qual é a data de check\-?out/i.test(txt)) {
              finalText = pre.lang === 'es'
                ? `Anoté nuevas fechas: ${ciTxt} → ${coTxt}. ¿Deseás que verifique disponibilidad y posibles diferencias?`
                : pre.lang === 'pt'
                  ? `Anotei as novas datas: ${ciTxt} → ${coTxt}. Deseja que eu verifique a disponibilidade e possíveis diferenças?`
                  : `Noted the new dates: ${ciTxt} → ${coTxt}. Do you want me to check availability and any differences?`;
            }
          }
        }
      } catch (e) {
        console.warn('[dates][safeguard] error', (e as any)?.message || e);
      }

      // Reparación específica follow-up: caso "vamos a ingresar el 03/10/2025" (pregunta check-out)
      // seguido por "05/10/2025". Si la confirmación resultante duplica la segunda fecha (X → X)
      // intentamos recuperar la fecha única previa del historial y reconstruir el rango correcto.
      try {
        const hasDuplicateRange = /Anot[eé] nuevas fechas: (\d{2}\/\d{2}\/\d{4}) \u2192 \1/i.test(finalText || '');
        if (hasDuplicateRange) {
          // Buscar en el historial último mensaje de usuario con UNA sola fecha distinta a la actual
          const currentDates = (String(pre.msg.content || '').match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/g) || []).map(d => d);
          const currentDate = currentDates[0];
          let previousSingle: string | null = null;
          for (let i = pre.lcHistory.length - 1; i >= 0; i--) {
            const m = pre.lcHistory[i];
            if (m instanceof HumanMessage) {
              const txt = String(m.content || '');
              const dates = txt.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/g) || [];
              if (dates.length === 1 && dates[0] !== currentDate) { previousSingle = dates[0]; break; }
            }
          }
          if (previousSingle && currentDate) {
            // Normalizar a dd/mm/yyyy (ya lo están) y asegurar orden cronológico
            const toISO = (d: string) => {
              const [dd, mm, yyyy] = d.split(/[\/\-]/); return `${yyyy}-${mm}-${dd}`;
            };
            const d1ISO = toISO(previousSingle);
            const d2ISO = toISO(currentDate);
            const ciISO = new Date(d1ISO) <= new Date(d2ISO) ? d1ISO : d2ISO;
            const coISO = ciISO === d1ISO ? d2ISO : d1ISO;
            const toDDMMYYYY = (iso?: string) => iso ? iso.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3/$2/$1') : '';
            const ciTxt = toDDMMYYYY(ciISO);
            const coTxt = toDDMMYYYY(coISO);
            // Actualizar slots y texto de confirmación
            nextSlots.checkIn = ciISO; nextSlots.checkOut = coISO;
            finalText = pre.lang === 'es'
              ? `Anoté nuevas fechas: ${ciTxt} → ${coTxt}. ¿Deseás que verifique disponibilidad y posibles diferencias?`
              : pre.lang === 'pt'
                ? `Anotei as novas datas: ${ciTxt} → ${coTxt}. Deseja que eu verifique a disponibilidade e possíveis diferenças?`
                : `Noted the new dates: ${ciTxt} → ${coTxt}. Do you want me to check availability and any differences?`;
          }
        }
      } catch (e) { console.warn('[dates][repair-duplicate-range] error', (e as any)?.message || e); }
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
        const res = await runAvailabilityCheck(pre, { ...nextSlots }, ciISO, coISO);
        finalText = res.finalText;
        nextSlots = { ...nextSlots, ...res.nextSlots };
        if (res.needsHandoff) {
          needsSupervision = true;
        }
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
  const userTxtRaw = String(text || "");
  // Explicita: debe contener "copia"/"copy" y whatsapp
  const explicitRe = /((envi|mand)[a-záéíóú]*\b[^\n]*\b(copia|copy)[^\n]*\b(whats?app|whas?tapp|wasap|wpp)|pued(?:es|e|o|en|an|ís|es)?\s+enviar\b[^\n]*\b(copia|copy)[^\n]*\b(whats?app|whas?tapp|wasap|wpp)|send\b[^\n]*copy[^\n]*(whats?app|whas?tapp))/i;
  if (explicitRe.test(userTxtRaw)) {
    const phoneInline = userTxtRaw.match(/(\+?\d[\d\s\-().]{6,}\d)/);
    return { matched: true, mode: 'explicit', inlinePhone: phoneInline?.[1] };
  }
  // Light: verbos de compartir sin la palabra copia, requiriendo contexto de reserva
  const lightRe = /(compart(?:i(?:r|rla|rme|ime|ila)?|e(?:s|la)?)|pasa(?:la|mela)?|manda(?:la|mela)?|envia(?:la|mela)?|send|share)[^\n]{0,80}?\b(?:por|via|en|no|on)?\s*(whats?app|whas?tapp|wasap|wpp)\b/i;
  if (lightRe.test(userTxtRaw)) {
    const hasReservationContext = Boolean(pre?.st?.lastReservation || pre?.st?.reservationSlots?.checkIn || pre?.st?.reservationSlots?.reservationId);
    if (hasReservationContext) {
      const phoneInline = userTxtRaw.match(/(\+?\d[\d\s\-().]{6,}\d)/);
      return { matched: true, mode: 'light', inlinePhone: phoneInline?.[1] };
    }
  }
  return { matched: false };
}

// ===== Agent: Orchestrator/Planner › Audit Advisory (posLLM) =====
async function posLLM(pre: PreLLMResult, body: any): Promise<{ verdictInfo: any; llmInterp: Interpretation; needsSupervision: any }> {
  // Solo asesoramiento/auditoría: comparación pre vs LLM
  // Si se requiere, puedes exponer el resultado de esta función para logging, análisis o UI
  debugLog("[posLLM] IN", { pre, body });
  const llmSlotsForAudit: SlotMap = {
    guestName: body.nextSlots?.guestName,
    roomType: body.nextSlots?.roomType,
    checkIn: body.nextSlots?.checkIn,
    checkOut: body.nextSlots?.checkOut,
    numGuests: body.nextSlots?.numGuests,
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
      guestName: pre.currSlots.guestName,
      roomType: pre.currSlots.roomType,
      checkIn: pre.currSlots.checkIn,
      checkOut: pre.currSlots.checkOut,
      numGuests: pre.currSlots.numGuests,
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

// (SupervisorDecision and OutputFormatter helpers moved to /lib/agents)

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
  /**
   * Autosend policy:
   * - SENT siempre: reservation_snapshot, reservation_verify, salesStage=close
   * - SENT si modo combinado = "automatic" y category ∈ SAFE_AUTOSEND_CATEGORIES
   * - PENDING en "supervised" para el resto
   * Logs: lang_in, lang_retrieval, lang_out (cuando aplica) y autosend_reason
   */
  debugLog("[FlujoCHKI][handleIncomingMessage] IN", { msg, options });
  // Flags evaluadas en runtime (evita cacheo entre tests por module scope)
  const GRAPH_ENABLED = process.env.USE_MH_FLOW_GRAPH === '1' || process.env.USE_MH_FLOW_GRAPH === 'true';
  const ORCH_ENABLED = process.env.USE_ORCHESTRATOR_AGENT === '1' || process.env.USE_ORCHESTRATOR_AGENT === 'true';
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
    // --- bodyLLM OR grafo completo (Fase 3) ---
    let body: any;
    let auditFromGraph: { verdictInfo?: any; llmInterp?: any; needsSupervision?: boolean } | null = null;
    if (GRAPH_ENABLED) {
      try { if (IS_TEST) console.log('[mh][branch] GRAPH_ENABLED=true → invoking orchestratorProxy'); } catch { }
      // Camino nuevo: delegamos a grafo que incluye orquestación.
      const { runOrchestratorProxy } = await import("@/lib/agents/orchestratorAgent");
      const orch = await runOrchestratorProxy(pre, async () => await bodyLLM(pre));
      const { runMhFlowGraph } = await import("@/lib/agents/mhFlowGraph");
      const graphState = await runMhFlowGraph({
        rawInput: { msg, options },
        orchestrator: orch,
        meta: { featureFlags: { USE_ORCHESTRATOR_AGENT: ORCH_ENABLED, USE_MH_FLOW_GRAPH: GRAPH_ENABLED, USE_PRE_POS_PIPELINE: pipelineEnabled }, timings: {} }
      });
      body = orch; // mantener nombre local body para reutilizar lógica existente si hiciera falta
      debugLog("[handleIncomingMessage][graph] state", graphState);
      // Reemplazar variables clave desde graphState (paridad con flujo legacy)
      const gsAny: any = graphState as any;
      const orchFromGraph = gsAny?.orchestrator as any;
      if (orchFromGraph != null) {
        body.finalText = orchFromGraph.finalText;
        body.nextCategory = orchFromGraph.nextCategory;
        body.nextSlots = orchFromGraph.nextSlots;
      }
      body.needsSupervision = graphState.supervision?.needsSupervision ?? body.needsSupervision;
      // Capturamos auditoría desde el grafo si pipeline de pre/pos está activa
      if (pipelineEnabled) {
        auditFromGraph = {
          verdictInfo: graphState.audit?.verdictInfo,
          llmInterp: graphState.audit?.llmInterp,
          needsSupervision: graphState.orchestrator?.needsSupervision,
        };
      }
      // saltamos posLLM si grafo activo (Fase 3 solo pipeline principal)
      if (ORCH_ENABLED && !skipPrePos) {
        // Intencional: mantenemos posibilidad de posLLM si pre-pos pipeline activo y orquestador ON.
      }
    } else {
      try { if (IS_TEST) console.log('[mh][branch] GRAPH_ENABLED=false → legacy path'); } catch { }
      if (ORCH_ENABLED) {
        const { runOrchestratorProxy } = await import("@/lib/agents/orchestratorAgent");
        body = await runOrchestratorProxy(pre, async () => await bodyLLM(pre));
      } else {
        body = await bodyLLM(pre);
      }
    }
    debugLog("[handleIncomingMessage] bodyLLM/body", body);
    // ===== Agent: StateUpdater =====
    // Persist minimal conv_state only for copy follow-ups so next turn can continue that flow
    const needsFollowupPersist = body?.nextCategory === "send_whatsapp_copy" || body?.nextCategory === "send_email_copy";
    if (needsFollowupPersist) {
      try {
        await updateConversationState(pre.msg.hotelId, pre.conversationId, {
          reservationSlots: body?.nextSlots || pre.currSlots,
          lastCategory: body?.nextCategory ?? pre.prevCategory ?? null,
          updatedBy: "ai",
        } as any);
      } catch (e) {
        console.warn("[handleIncomingMessage] updateConversationState warn:", (e as any)?.message || e);
      }
    }
    // --- Persistir y emitir respuesta (siempre, independientemente de posLLM) ---
    let needsSupervision = body.needsSupervision;
    let verdictInfo = undefined as any;
    let llmInterp = undefined as any;
    if (!skipPrePos) {
      if (USE_MH_FLOW_GRAPH && auditFromGraph) {
        // Paridad: cuando el grafo está activo, usar su nodo de auditoría
        verdictInfo = auditFromGraph.verdictInfo;
        llmInterp = auditFromGraph.llmInterp;
        if (typeof auditFromGraph.needsSupervision === "boolean") {
          needsSupervision = auditFromGraph.needsSupervision;
        }
        debugLog("[handleIncomingMessage][graph] audit", auditFromGraph);
      } else {
        // Flujo legacy: auditoría inline (posLLM)
        const pos = await posLLM(pre, body);
        debugLog("[handleIncomingMessage] posLLM/pos", pos);
        verdictInfo = pos.verdictInfo;
        llmInterp = pos.llmInterp;
        needsSupervision = pos.needsSupervision;
      }
    }
    // Fuerza bypass de supervisión en desarrollo cuando se solicita generación forzada.
    // Esto evita el estado "pendiente" y permite validar el flujo E2E en UI.
    if (process.env.FORCE_GENERATION === "1" || process.env.FORCE_GENERATION === "true") {
      if (needsSupervision) {
        console.warn("[autosend] FORCE_GENERATION activo → override needsSupervision=false (dev)");
      }
      needsSupervision = false;
    }
    const suggestion = body.finalText;
    debugLog("[handleIncomingMessage] suggestion", suggestion);
    // Payload enriquecido opcional emitido desde el grafo (p.ej., room-info-img)
    const richPayload: { type: string; data?: any } | undefined = (body as any)?.graphResult?.meta?.rich;
    // ===== Agent: SupervisorDecision =====
    const respCategory = (body?.graphResult?.category || body?.nextCategory || pre.prevCategory) as string | undefined;
    const respSalesStage = (body?.graphResult?.salesStage || pre.st?.salesStage) as string | undefined;
    const combinedMode: ChannelMode = combineModes(pre.options?.mode, pre.guest.mode ?? "automatic");
    const safeCat = isSafeAutosendCategory(respCategory || "");
    const decision = decideSupervisorStatus({
      combinedMode,
      category: respCategory,
      salesStage: respSalesStage,
      needsSupervision,
      isSafeCategory: safeCat,
    });
    debugLog("[autosend]", { category: respCategory, salesStage: respSalesStage, mode: combinedMode, autosendReason: decision.autosendReason });

    // Construir el mensaje AI sin heredar direction/content del mensaje del huésped
    const aiMsg: ChannelMessage = {
      messageId: crypto.randomUUID(),
      hotelId: pre.msg.hotelId,
      channel: pre.msg.channel,
      conversationId: pre.conversationId,
      sender: "assistant",
      guestId: pre.msg.guestId,
      role: "ai",
      content: suggestion,
      suggestion,
      status: decision.status,
      timestamp: safeNowISO(),
      direction: 'out',
      detectedLanguage: pre.lang,
      respondedBy: needsSupervision ? "assistant" : undefined,
    } as ChannelMessage;
    if (richPayload) (aiMsg as any).rich = richPayload;

    // Telemetry: count autosend decision
    try {
      incAutosend(decision.autosendReason, respCategory ?? "unknown", aiMsg.status === "sent");
    } catch { /* metrics are best-effort */ }
    if ((pre.msg as any).sourceProvider) {
      (aiMsg as any).sourceProvider = (pre.msg as any).sourceProvider;
    }
    debugLog("[handleIncomingMessage] aiMsg", aiMsg);
    (aiMsg as any).audit = verdictInfo ? { verdict: verdictInfo, llm: llmInterp } : undefined;
    await saveChannelMessageToAstra(aiMsg);
    channelMemory.addMessage(aiMsg);
    try {
      if (aiMsg.status === "sent") {
        console.log("📤 [reply] via adapter?", !!pre.options?.sendReply, { len: suggestion.length });
        await emitReply(pre.conversationId, suggestion, pre.options?.sendReply, richPayload);
        debugLog("[handleIncomingMessage] emitReply sent", { conversationId: pre.conversationId, suggestion });
      } else {
        debugLog("[handleIncomingMessage] emitReply pending", { conversationId: pre.conversationId, reason: verdictInfo?.reason });
        const pending = buildPendingNotice(pre.lang, verdictInfo);
        await emitReply(pre.conversationId, pending, pre.options?.sendReply);
      }
    } catch (err) {
      debugLog("[handleIncomingMessage] sendReply error", err);
      console.error("❌ [messageHandler] sendReply error:", err);
    }
  });
}
