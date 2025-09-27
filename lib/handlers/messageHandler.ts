
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
import {
  hotelAssistantStructuredPrompt,
  hotelAssistantSchema,
} from "@/lib/prompts/hotelAssistantStructuredPrompt";
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
import { normalizeNameCase, extractSlotsFromText, isSafeGuestName } from "@/lib/agents/helpers";
import { debugLog } from "@/lib/utils/debugLog";
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
  // NEW: modelo liviano para structured fallback
  STRUCTURED_MODEL: process.env.STRUCTURED_MODEL || "gpt-4o-mini",
  STRUCTURED_ENABLED: process.env.STRUCTURED_ENABLED !== "false",

};
// ----------------------

const IS_TEST = false;
export const MH_VERSION = "mh-2025-09-23-structured-01";
console.log("[messageHandler] loaded:", MH_VERSION);
console.log("[messageHandler] using convState:", CONVSTATE_VERSION);

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
  try { /* @ts-ignore */ return await Promise.race([p, timeout]); }
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
  convQueues.set(convId, next.finally(() => { if (convQueues.get(convId) === next) convQueues.delete(convId); }));
  // @ts-ignore
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

async function bodyLLM(pre: PreLLMResult): Promise<any> {
  debugLog("[bodyLLM] IN", { pre });
  let finalText = "";
  let nextCategory: string | null = pre.prevCategory;
  let nextSlots: ReservationSlotsStrict = pre.currSlots;
  let needsSupervision = false;
  let graphResult: any = null;

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
            if (structured.handoff === true) {
              needsSupervision = true;
            }
            if (!finalText && structured.answer) {
              finalText = structured.answer;
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
            finalText = structured.answer;
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
  debugLog("[bodyLLM] OUT", { finalText, nextCategory, nextSlots, needsSupervision, graphResult });
  return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
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
    // const skipPrePos = options?.onlyBodyLLM === true || USE_PRELLM_POSLLM === false;
    const skipPrePos = true
    let pre: PreLLMResult;
    if (skipPrePos) {
      // Inicializa contexto objetivo antes de bodyLLM
      const ctx = await getObjectiveContext(msg, options);
      pre = options?.preLLMInput || {
        lang: ctx.lang,
        currSlots: ctx.currSlots,
        prevCategory: ctx.prevCategory,
        prevSlotsStrict: ctx.prevSlotsStrict,
        st: ctx.st,
        stateForPlaybook: { draft: null, confirmedBooking: null, locale: ctx.lang },
        intent: "general_question",
        inModifyMode: false,
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
    const aiMsg: ChannelMessage = {
      ...pre.msg,
      messageId: crypto.randomUUID(),
      sender: "assistant",
      role: "ai",
      content: suggestion,
      suggestion,
      status: needsSupervision ? "pending" : (pre.guest.mode ?? "automatic") === "automatic" ? "sent" : "pending",
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
