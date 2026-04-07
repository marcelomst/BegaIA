
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
import { decideRiskLevel, applyRiskPolicyToSupervisorDecision } from "@/lib/pipeline/riskPolicy";
import { buildPendingNotice } from "@/lib/agents/outputFormatterAgent";
import { updateConversationState } from "@/lib/agents/stateUpdaterAgent";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { channelMemory } from "@/lib/services/channelMemory";
import { getOrCreateConversation, appendConversationReplyTrace } from "@/lib/db/conversations";
import { getGuest, createGuest, updateGuest } from "@/lib/db/guests";
import { getConvState, CONVSTATE_VERSION, resolveGuestState } from "@/lib/db/convState";
import type {
  ReservationSlots as DbReservationSlots,
  LastReservation,
  ActiveReservationContext,
  SelectedReservationTarget,
  ModifyState,
  ConversationFocus,
} from "@/lib/db/convState";
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
import { extractSlotsFromText, isSafeGuestName, extractDateRangeFromText, localizeRoomType, pickNearbyPromptKey, looksNearbyPoints, wantsNearbyImages, looksLikeName, maxGuestsFor, ddmmyyyyToISO } from "@/lib/agents/helpers";
import { debugLog } from "@/lib/utils/debugLog";
import type { RichPayload } from "@/types/richPayload";
import { retrievalBased } from "@/lib/agents/retrieval_based";
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
  normalizeReservationIntent,
  detectLateCheckoutQuestion,
  detectEarlyCheckinQuestion,
  detectCheckinOrCheckoutTimeQuestion,
  buildLateCheckoutResponse,
  buildEarlyCheckinResponse,
  isPureAffirmative,
  askedToConfirmCheckTime,
} from "./pipeline/availability";
import { runStableIntentsGuard } from "./pipeline/stableIntentsGuard";
import { isConfirmableReservationState } from "./pipeline/reservationState";
import { answerWithKnowledge } from "@/lib/agents/knowledgeBaseAgent";
import { RE_BILLING } from "@/lib/agents/classify/keywords";

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

function isPastReservationCheckInISO(iso?: string) {
  if (!iso) return false;
  const inDate = new Date(iso);
  if (Number.isNaN(inDate.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return inDate.getTime() < today.getTime();
}

function askedToConfirmReservation(lcHistory: (HumanMessage | AIMessage)[]): boolean {
  const lastAi = [...lcHistory].reverse().find((m) => m instanceof AIMessage) as AIMessage | undefined;
  const lastText = String(lastAi?.content || "").toLowerCase();
  return /confirm[aá]s la reserva|respond[eé]\s+[“"]?confirmar[”"]?|do you confirm the booking|confirma a reserva/.test(lastText);
}

function isVerifyAvailabilityPrompt(text: string): boolean {
  return /anot[eé] nuevas fechas: .*¿dese[aá]s que verifique disponibilidad|anotei as novas datas: .*deseja que eu verifique a disponibilidade|noted the new dates: .*do you want me to check availability/i.test(
    String(text || "")
  );
}

function buildPastReservationCheckInPrompt(lang: string, iso?: string) {
  const ciTxt = iso ? (isoToDDMMYYYY(iso) || iso) : "";
  if (lang === "pt") return `A data de check-in ${ciTxt} já passou. Qual seria a nova data de check-in? (dd/mm/aaaa)`;
  if (lang !== "es") return `The check-in date ${ciTxt} is in the past. What would be the new check-in date? (dd/mm/yyyy)`;
  return `La fecha de check-in ${ciTxt} ya pasó. ¿Cuál sería la nueva fecha de check-in? (dd/mm/aaaa)`;
}

function getConfiguredCheckTimes(hotel: any): { checkIn?: string; checkOut?: string } {
  return {
    checkIn:
      hotel?.schedules?.checkIn ||
      hotel?.policies?.checkInTime ||
      hotel?.checkInTime ||
      undefined,
    checkOut:
      hotel?.schedules?.checkOut ||
      hotel?.policies?.checkOutTime ||
      hotel?.checkOutTime ||
      undefined,
  };
}

type ReservationSnapshotQueryKind = "full" | "dates" | "guests" | "list";

function detectReservationSnapshotQuery(
  text: string,
  _lang: "es" | "en" | "pt"
): ReservationSnapshotQueryKind | null {
  const normalized = String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[“”"'`]/g, "")
    .replace(/[¡!¿?.,;:()]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return null;

  if (
    /\b(mis reservas|mis bookings|my bookings|my reservations|quiero ver mis reservas|quiero ver mis bookings|mostrar mis reservas|mostrar mis bookings|lista de reservas|list my bookings|list my reservations)\b/i.test(normalized)
  ) {
    return "list";
  }
  if (
    /\b(cual es mi reserva|me recordas la reserva|recordame la reserva|recorda mi reserva|recordame mi reserva|mi reserva|my booking|my reservation|booking details|reservation details)\b/i.test(normalized) ||
    /\b(mostrame|muestrame|mostrarme|mostrar|muestre|muestres|quiero\s+ver|quiero\s+que\s+me\s+muestres|ver|resumen|detalle|detalles|snapshot|captura)\b.*\b(reserva|booking|reservation|primer|primera|segunda|tercera|ultima|last)\b/i.test(normalized)
  ) {
    return "full";
  }
  if (
    /\b(que fechas reserve|que fechas tengo reservadas|que fechas reserve yo|what dates did i book|booked dates|reservation dates)\b/i.test(normalized)
  ) {
    return "dates";
  }
  if (
    /\b(cuantos huespedes puse|cuantos huespedes reserve|cuantos huespedes quedaron|how many guests did i book|how many guests are on my booking|quantos hospedes reservei)\b/i.test(normalized)
  ) {
    return "guests";
  }
  return null;
}

function buildReservationSnapshotAnswer(
  kind: ReservationSnapshotQueryKind,
  lang: "es" | "en" | "pt",
  slots: ReservationSlotsStrict,
  reservationId?: string,
  reservationStatus?: LastReservation["status"]
): string {
  const roomType = slots.roomType ? localizeRoomType(slots.roomType, lang) : undefined;
  const checkIn = isoToDDMMYYYY(slots.checkIn) || slots.checkIn;
  const checkOut = isoToDDMMYYYY(slots.checkOut) || slots.checkOut;
  const statusLabel =
    reservationStatus === "cancelled"
      ? (lang === "pt" ? "Cancelada" : lang === "en" ? "Cancelled" : "Cancelada")
      : reservationStatus === "error"
        ? (lang === "pt" ? "Com erro" : lang === "en" ? "Error" : "Con error")
        : (lang === "pt" ? "Ativa" : lang === "en" ? "Active" : "Activa");
  if (kind === "dates") {
    if (lang === "pt") return `Sua reserva está para ${checkIn ?? "(sem data)"} → ${checkOut ?? "(sem data)"}.`;
    if (lang === "en") return `Your booking is for ${checkIn ?? "(no date)"} → ${checkOut ?? "(no date)"}.`;
    return `Tu reserva es para ${checkIn ?? "(sin fecha)"} → ${checkOut ?? "(sin fecha)"}.`;
  }
  if (kind === "guests") {
    if (lang === "pt") return `Sua reserva está para ${slots.numGuests ?? "(sem dado)"} hóspede(s).`;
    if (lang === "en") return `Your booking is for ${slots.numGuests ?? "(unknown)"} guest(s).`;
    return `Tu reserva es para ${slots.numGuests ?? "(sin dato)"} huésped(es).`;
  }
  if (lang === "pt") {
    return [
      "Este é o resumo da sua reserva:",
      reservationId ? `- Código: ${reservationId}` : "",
      `- Estado: ${statusLabel}`,
      slots.guestName ? `- Nome: ${slots.guestName}` : "",
      roomType ? `- Quarto: ${roomType}` : "",
      checkIn && checkOut ? `- Datas: ${checkIn} → ${checkOut}` : "",
      slots.numGuests ? `- Hóspedes: ${slots.numGuests}` : "",
    ].filter(Boolean).join("\n");
  }
  if (lang === "en") {
    return [
      "This is your booking summary:",
      reservationId ? `- Code: ${reservationId}` : "",
      `- Status: ${statusLabel}`,
      slots.guestName ? `- Name: ${slots.guestName}` : "",
      roomType ? `- Room: ${roomType}` : "",
      checkIn && checkOut ? `- Dates: ${checkIn} → ${checkOut}` : "",
      slots.numGuests ? `- Guests: ${slots.numGuests}` : "",
    ].filter(Boolean).join("\n");
  }
  return [
    "Este es el resumen de tu reserva:",
    reservationId ? `- Código: ${reservationId}` : "",
    `- Estado: ${statusLabel}`,
    slots.guestName ? `- Nombre: ${slots.guestName}` : "",
    roomType ? `- Habitación: ${roomType}` : "",
    checkIn && checkOut ? `- Fechas: ${checkIn} → ${checkOut}` : "",
    slots.numGuests ? `- Huéspedes: ${slots.numGuests}` : "",
  ].filter(Boolean).join("\n");
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

type RoutingDecisionLog = {
  decision_layer: string;
  route_source: string;
  route_match: string | null;
  early_return: boolean;
  used_llm_classifier: boolean;
  classifier_source: "heuristic" | "llm" | "forced_llm" | "fallback";
  final_category?: string | null;
  final_prompt_key?: string | null;
};

type StableIntentRoutingLog = {
  routing_stage: "stable_intents_guard";
  routing_decision: "served" | "blocked_by_policy" | "no_match";
  matched: boolean;
  matched_intent: string | null;
  hotel_policy_applied: boolean;
  policy_enabled: boolean | null;
  policy_source: string | null;
  response_source: string | null;
};

function deriveClassifierSource(graphResult: any): RoutingDecisionLog["classifier_source"] {
  const routeSource = String(graphResult?.meta?.debug?.route_source || "");
  if (routeSource.startsWith("forced_llm_classifier")) return "forced_llm";
  if (routeSource === "llm_classifier" || graphResult?.intentSource === "llm") return "llm";
  if (routeSource.includes("fallback")) return "fallback";
  return "heuristic";
}

function emitRoutingDecision(
  msg: Pick<ChannelMessage, "conversationId" | "hotelId" | "channel">,
  decision: RoutingDecisionLog
) {
  debugLog("[routing][decision]", {
    conversationId: msg.conversationId,
    hotelId: msg.hotelId,
    channel: msg.channel,
    ...decision,
  });
}

function emitStableIntentRouting(
  msg: Pick<ChannelMessage, "conversationId" | "hotelId" | "channel">,
  detail: StableIntentRoutingLog
) {
  debugLog("[routing][stable_intents_guard]", {
    conversationId: msg.conversationId,
    hotelId: msg.hotelId,
    channel: msg.channel,
    ...detail,
  });
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
  const turnText = String(msg.content || "");
  const turnSlots = extractSlotsFromText(turnText, lang);
  const shortGuestCount = turnText.match(/^\s*(\d{1,2})\s*$/);
  if (
    !turnSlots.numGuests &&
    shortGuestCount?.[1] &&
    (st?.activeFlow === "reservation" || st?.desiredAction === "create" || prevCategory === "reservation") &&
    prevSlotsStrict?.roomType &&
    prevSlotsStrict?.checkIn &&
    prevSlotsStrict?.checkOut &&
    !prevSlotsStrict?.numGuests
  ) {
    turnSlots.numGuests = String(parseInt(shortGuestCount[1], 10));
  }
  const currSlots = mergeReservationSlots(prevSlotsStrict, turnSlots);
  console.log('[DEBUG-numGuests] currSlots:', JSON.stringify(currSlots));
  return { guest, conversationId, st, prevCategory, prevSlotsStrict, lang, lcHistory, currSlots };
}
function safeNowISO() { return new Date().toISOString(); }

function computeInModifyMode(
  st: any,
  currSlots: ReservationSlotsStrict,
  userText: string
): boolean {
  const normalizedIntent = normalizeReservationIntent(userText || "");
  const prevWasModify = st?.lastCategory === "modify_reservation" || st?.lastCategory === "modify";
  const mentionsModify = normalizedIntent.kind === "modify";
  const hasDraft = Boolean(currSlots?.guestName || currSlots?.roomType || currSlots?.checkIn || currSlots?.checkOut || currSlots?.numGuests);
  const hasConfirmed = st?.salesStage === "close";
  const hasDraftOrConfirmed = hasDraft || hasConfirmed;
  return Boolean(prevWasModify || (hasDraftOrConfirmed && mentionsModify));
}

function wantsAdditionalReservation(
  userText: string,
  state?: {
    lastReservation?: { reservationId?: string; status?: string | null } | null;
    salesStage?: string | null;
  } | null
): boolean {
  if (detectReservationSnapshotQuery(userText || "", "es")) return false;
  const normalizedIntent = normalizeReservationIntent(userText || "");
  if (normalizedIntent.kind === "modify" || normalizedIntent.kind === "cancel") return false;
  const hasConfirmedContext = Boolean(state?.lastReservation?.reservationId || state?.salesStage === "close");
  if (!hasConfirmedContext) return false;
  const t = String(userText || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  if (/\b(nueva reserva|otra reserva|otra habitacion|another booking|new booking|another room)\b/.test(t)) {
    return true;
  }
  const looksReserveCommand = /\b(reserva(r|la|lo)?|book(?:ing)?(?:\s+it)?)\b/i.test(
    normalizedIntent.normalizedText
  );
  return normalizedIntent.kind === "confirm" && looksReserveCommand;
}

function mergeReservationHistory(
  history: LastReservation[] | null | undefined,
  reservation: LastReservation | null | undefined
): LastReservation[] {
  const base = Array.isArray(history) ? history.filter((item) => item?.reservationId !== reservation?.reservationId) : [];
  if (!reservation || !reservation.reservationId) return base;
  return [...base, reservation];
}

function buildPersistedReservationRecord(
  state: any,
  reservationId: string,
  status: LastReservation["status"],
  channel: LastReservation["channel"]
): LastReservation {
  const canonicalRecord = buildReservationCanonicalState(state).byId.get(reservationId);
  const reservationSlots =
    state?.lastReservation?.reservationId === reservationId
      ? state?.reservationSlots
      : undefined;
  return {
    reservationId,
    status,
    createdAt: safeNowISO(),
    channel,
    guestName: reservationSlots?.guestName || canonicalRecord?.guestName,
    roomType: reservationSlots?.roomType || canonicalRecord?.roomType,
    checkIn: reservationSlots?.checkIn || canonicalRecord?.checkIn,
    checkOut: reservationSlots?.checkOut || canonicalRecord?.checkOut,
    numGuests: reservationSlots?.numGuests || canonicalRecord?.numGuests,
  };
}

function buildDraftReservationContext(
  phase: "collecting" | "quoted" = "collecting"
): ActiveReservationContext {
  return {
    kind: "draft",
    phase,
    updatedAt: safeNowISO(),
  };
}

function buildFocusedReservationContext(
  reservationId: string | undefined,
  phase: "confirmed" | "cancelled" = "confirmed"
): ActiveReservationContext {
  return {
    kind: "reservation",
    reservationId: reservationId || undefined,
    phase,
    updatedAt: safeNowISO(),
  };
}

function buildSelectedReservationTarget(
  reservationId: string | undefined,
  kind: SelectedReservationTarget["kind"],
  source: SelectedReservationTarget["source"],
  resolutionMode: SelectedReservationTarget["resolutionMode"]
): SelectedReservationTarget | null {
  if (!reservationId && kind !== "draft" && kind !== "unknown") return null;
  return {
    reservationId: reservationId || undefined,
    kind,
    source,
    resolutionMode,
    resolvedAt: safeNowISO(),
  };
}

function buildSelectedReservationTargetFromReference(
  reservationId: string | undefined,
  source: SelectedReservationTarget["source"],
  resolutionMode: SelectedReservationTarget["resolutionMode"] = "strong",
  kind: SelectedReservationTarget["kind"] = "confirmed"
): SelectedReservationTarget | null {
  return buildSelectedReservationTarget(reservationId, kind, source, resolutionMode);
}

function buildModifyState(activeField: ModifyState["activeField"]): ModifyState | null {
  if (!activeField) return null;
  return {
    activeField,
    updatedAt: safeNowISO(),
  };
}

function buildConversationFocus(subFlow: ConversationFocus["subFlow"]): ConversationFocus {
  return {
    domain: "reservation",
    subFlow,
    active: true,
    updatedAt: safeNowISO(),
  };
}

function getConversationFocus(state?: Partial<{
  conversationFocus?: ConversationFocus | null;
  activeFlow?: string | null;
  desiredAction?: string | null;
}> | null): ConversationFocus | null {
  const explicit = state?.conversationFocus;
  if (explicit?.domain === "reservation" && explicit.active && explicit.subFlow) {
    return explicit;
  }
  if (state?.desiredAction === "cancel" || state?.activeFlow === "cancel_reservation") {
    return buildConversationFocus("cancel");
  }
  if (state?.desiredAction === "modify" || state?.activeFlow === "modify_reservation") {
    return buildConversationFocus("modify");
  }
  if (state?.desiredAction === "create" || state?.activeFlow === "reservation") {
    return buildConversationFocus("create");
  }
  return null;
}

function shouldSwitchFlow(
  currentFocus: ConversationFocus | null,
  nextFlow: ConversationFocus["subFlow"] | null
): boolean {
  return Boolean(currentFocus?.active && nextFlow && currentFocus.subFlow !== nextFlow);
}

function buildModifyFieldPrompt(lang: "es" | "en" | "pt", activeField: ModifyState["activeField"]): string {
  if (activeField === "dates") return buildAskNewDates(lang);
  if (activeField === "guests") {
    return lang === "es"
      ? "¿Cuál sería la nueva cantidad de huéspedes?"
      : lang === "pt"
        ? "Qual seria a nova quantidade de hóspedes?"
        : "What would be the new number of guests?";
  }
  return lang === "es"
    ? "¿Qué tipo de habitación querés ahora?"
    : lang === "pt"
      ? "Qual tipo de quarto você quer agora?"
      : "Which room type would you like now?";
}

type CreateFlowMissingField = "checkIn" | "checkOut" | "numGuests" | "roomType" | "guestName" | null;
type CreateDraftConsistencyResult =
  | { valid: true; sanitizedSlots: ReservationSlotsStrict }
  | {
      valid: false;
      reason: "room_capacity" | "date_coherence";
      sanitizedSlots: ReservationSlotsStrict;
      message: string;
    };

function getNextCreateFlowMissingField(slots: ReservationSlotsStrict): CreateFlowMissingField {
  if (!slots.checkIn) return "checkIn";
  if (!slots.checkOut) return "checkOut";
  if (!slots.numGuests) return "numGuests";
  if (!slots.roomType) return "roomType";
  if (!isSafeGuestName(slots.guestName || "")) return "guestName";
  return null;
}

function buildCreateFlowPrompt(lang: "es" | "en" | "pt", missingField: CreateFlowMissingField): string {
  if (missingField === "checkIn" || missingField === "checkOut") return buildAskMissingDate(lang, missingField);
  if (missingField === "numGuests") return buildAskGuests(lang);
  if (missingField === "guestName") return buildAskGuestName(lang);
  return lang === "es"
    ? "Seguimos con tu reserva. ¿Qué tipo de habitación querés?"
    : lang === "pt"
      ? "Seguimos com a sua reserva. Que tipo de quarto você quer?"
      : "We are still working on your booking. Which room type would you like?";
}

function buildCreateDraftCapacityReply(
  lang: "es" | "en" | "pt",
  roomType: string,
  guests: number
): string {
  const localizedRoom = localizeRoomType(roomType, lang);
  const suggestions = [
    { roomType: "double", capacity: 2 },
    { roomType: "triple", capacity: 3 },
    { roomType: "quadruple", capacity: 4 },
  ]
    .filter((item) => guests <= item.capacity)
    .map((item) => localizeRoomType(item.roomType, lang))
    .slice(0, 2);

  const suggestionText =
    suggestions.length === 0
      ? lang === "pt"
        ? "mais de um quarto"
        : lang === "en"
          ? "more than one room"
          : "más de una habitación"
      : suggestions.length === 1
        ? `${suggestions[0]} ${lang === "pt" ? "ou" : lang === "en" ? "or" : "o"} ${
            lang === "pt" ? "mais de um quarto" : lang === "en" ? "more than one room" : "más de una habitación"
          }`
        : `${suggestions[0]}, ${suggestions[1]} ${
            lang === "pt" ? "ou" : lang === "en" ? "or" : "o"
          } ${lang === "pt" ? "mais de um quarto" : lang === "en" ? "more than one room" : "más de una habitación"}`;

  return lang === "pt"
    ? `Um quarto ${localizedRoom} não comporta ${guests} hóspede(s). Quer mudar para ${suggestionText}?`
    : lang === "en"
      ? `A ${localizedRoom} room does not fit ${guests} guest(s). Do you want to switch to ${suggestionText}?`
      : `Una habitación ${localizedRoom} no admite ${guests} huésped(es). ¿Querés cambiar a ${suggestionText}?`;
}

function validateCreateDraftConsistency(
  lang: "es" | "en" | "pt",
  slots: ReservationSlotsStrict
): CreateDraftConsistencyResult {
  const sanitizedSlots = { ...slots };
  const dateCoherence = assessReservationDateCoherence(slots.checkIn, slots.checkOut);
  if (dateCoherence && !dateCoherence.ok) {
    delete sanitizedSlots.checkIn;
    delete sanitizedSlots.checkOut;
    return {
      valid: false,
      reason: "date_coherence",
      sanitizedSlots,
      message: buildInvalidReservationDatesReply(lang, dateCoherence.reason),
    };
  }

  const guests = Number.parseInt(String(slots.numGuests || ""), 10);
  const hasValidGuests = Number.isFinite(guests) && guests > 0;
  if (slots.roomType && hasValidGuests) {
    const capacity = maxGuestsFor(slots.roomType);
    if (capacity > 0 && guests > capacity) {
      delete sanitizedSlots.roomType;
      return {
        valid: false,
        reason: "room_capacity",
        sanitizedSlots,
        message: buildCreateDraftCapacityReply(lang, slots.roomType, guests),
      };
    }
  }

  return { valid: true, sanitizedSlots };
}

function isCreateStateReadyForQuote(slots: ReservationSlotsStrict): boolean {
  return Boolean(
    slots.checkIn &&
    slots.checkOut &&
    slots.numGuests &&
    slots.roomType &&
    isSafeGuestName(slots.guestName || "")
  );
}

function resolveReservationFastPathSubFlow(pre: PreLLMResult, userText?: string): "create" | "modify" {
  const currentFocus = getConversationFocus(pre.st);
  if (currentFocus?.subFlow === "create") return "create";
  if (currentFocus?.subFlow === "modify") return "modify";
  if (userText && normalizeReservationIntent(userText).kind === "modify") return "modify";
  if (pre.st?.desiredAction === "create" || pre.st?.activeFlow === "reservation") return "create";
  if (pre.inModifyMode || pre.prevCategory === "modify_reservation") return "modify";
  return "create";
}

function shouldAppendFocusContinuation(
  pre: PreLLMResult,
  focus: ConversationFocus | null,
  options: {
    isLateralTurn: boolean;
    turnHasReservationData: boolean;
  }
): boolean {
  if (!options.isLateralTurn) return false;
  if (!focus?.active) return false;
  if (focus.subFlow !== "create" && focus.subFlow !== "modify") return false;
  if (options.turnHasReservationData) return false;
  return true;
}

function buildFocusContinuationPrompt(
  pre: PreLLMResult,
  focus: ConversationFocus | null,
  nextSlots: ReservationSlotsStrict
): string | null {
  if (!focus?.active) return null;
  if (focus.subFlow === "create") {
    const knownSlots = mergeReservationSlots(pre.st?.reservationSlots, pre.currSlots, nextSlots);
    const missingField = getNextCreateFlowMissingField(knownSlots);
    if (!missingField) return null;
    const prompt = buildCreateFlowPrompt(pre.lang, missingField);
    return pre.lang === "es"
      ? `Para seguir con la reserva, ${prompt.charAt(0).toLowerCase()}${prompt.slice(1)}`
      : pre.lang === "pt"
        ? `Para seguir com a reserva, ${prompt.charAt(0).toLowerCase()}${prompt.slice(1)}`
        : `To continue with the booking, ${prompt.charAt(0).toLowerCase()}${prompt.slice(1)}`;
  }
  if (focus.subFlow === "modify") {
    const activeField = pre.st?.modifyState?.activeField as ModifyState["activeField"] | undefined;
    const prompt = activeField
      ? buildModifyFieldPrompt(pre.lang, activeField)
      : buildModifyOptionsMenu(pre.lang, {
          ...(pre.st?.reservationSlots || {}),
          ...(nextSlots || {}),
        } as ReservationSlotsStrict);
    return pre.lang === "es"
      ? `Para seguir con la modificación, ${prompt.charAt(0).toLowerCase()}${prompt.slice(1)}`
      : pre.lang === "pt"
        ? `Para seguir com a alteração, ${prompt.charAt(0).toLowerCase()}${prompt.slice(1)}`
        : `To continue with the change, ${prompt.charAt(0).toLowerCase()}${prompt.slice(1)}`;
  }
  return null;
}

async function persistCreateDraft(pre: PreLLMResult, slots: ReservationSlotsStrict): Promise<void> {
  await updateConversationState(pre.msg.hotelId, pre.conversationId, {
    reservationSlots: {
      ...(pre.st?.reservationSlots || {}),
      ...slots,
      locale: pre.lang,
    },
    lastProposal: null,
    pendingAvailabilityVerification: null,
    selectedReservationTarget: null,
    modifyState: null,
    conversationFocus: buildConversationFocus("create"),
    activeReservationContext: buildDraftReservationContext("collecting"),
    activeFlow: "reservation",
    desiredAction: "create",
    salesStage: "qualify",
    lastCategory: "reservation",
    updatedBy: "ai",
  } as any);
}

async function persistCreateDraftSnapshot(pre: PreLLMResult, slots: ReservationSlotsStrict): Promise<void> {
  await updateConversationState(pre.msg.hotelId, pre.conversationId, {
    reservationSlots: {
      ...slots,
      locale: pre.lang,
    },
    lastProposal: null,
    pendingAvailabilityVerification: null,
    selectedReservationTarget: null,
    modifyState: null,
    conversationFocus: buildConversationFocus("create"),
    activeReservationContext: buildDraftReservationContext("collecting"),
    activeFlow: "reservation",
    desiredAction: "create",
    salesStage: "qualify",
    lastCategory: "reservation",
    updatedBy: "ai",
  } as any);
}

function isModifyExecutionActive(pre: PreLLMResult): boolean {
  const focus = getConversationFocus(pre.st);
  return Boolean(
    pre.inModifyMode ||
    focus?.subFlow === "modify" ||
    pre.st?.desiredAction === "modify" ||
    pre.st?.activeFlow === "modify_reservation" ||
    pre.prevCategory === "modify_reservation"
  );
}

function getModifyExecutionReservationId(
  pre: PreLLMResult,
  reservationReference?: ReservationReferenceResolution | null,
  resolvedModifyTarget?: ReservationReferenceTarget | null
): string | undefined {
  return (
    (resolvedModifyTarget?.kind === "reservation" ? resolvedModifyTarget.reservationId : undefined) ||
    (reservationReference?.status === "resolved" && reservationReference.target.kind === "reservation"
      ? reservationReference.target.reservationId
      : undefined) ||
    (pre.st?.activeReservationContext?.kind === "reservation"
      ? pre.st?.activeReservationContext?.reservationId
      : undefined) ||
    pre.st?.selectedReservationTarget?.reservationId
  );
}

async function persistModifyExecutionContext(
  pre: PreLLMResult,
  reservationId: string | undefined,
  patch: Record<string, any> = {}
): Promise<void> {
  if (!reservationId) return;
  await updateConversationState(pre.msg.hotelId, pre.conversationId, {
    conversationFocus: buildConversationFocus("modify"),
    activeReservationContext: buildFocusedReservationContext(reservationId, "confirmed"),
    selectedReservationTarget: buildSelectedReservationTargetFromReference(reservationId, "active_focus", "weak"),
    activeFlow: "modify_reservation",
    desiredAction: "modify",
    lastCategory: "modify_reservation",
    updatedBy: "ai",
    ...patch,
  } as any);
}

function shouldPersistCreateAvailabilityVerification(
  pre: PreLLMResult,
  nextCategory: string | null | undefined,
  nextSlots: ReservationSlotsStrict | null | undefined,
  finalText: string | null | undefined
): boolean {
  if (!nextSlots?.checkIn || !nextSlots?.checkOut) return false;
  if (!isVerifyAvailabilityPrompt(String(finalText || ""))) return false;
  const focus = getConversationFocus(pre.st);
  const createFlowActive =
    focus?.subFlow === "create" ||
    pre.st?.desiredAction === "create";
  if (!createFlowActive) return true;
  const mergedSlots = mergeReservationSlots(pre.st?.reservationSlots, pre.currSlots, nextSlots);
  return isCreateStateReadyForQuote(mergedSlots);
}

type ReservationReferenceTarget = {
  kind: "draft" | "reservation";
  reservationId?: string;
  reservationStatus?: LastReservation["status"];
  guestName?: string;
  roomType?: string;
  numGuests?: number | string;
  checkIn?: string;
  checkOut?: string;
  source: "active" | "history" | "lastReservation";
};

type ReservationReferenceResolution =
  | { status: "resolved"; target: ReservationReferenceTarget }
  | { status: "out_of_range"; requested: "first" | "second" | "third" | "fourth" | "last"; availableCount: number }
  | { status: "ambiguous" }
  | { status: "unresolved" };

type ReservationOrdinalReference =
  | { type: "ordinal"; value: "first" | "second" | "third" | "fourth" | "last" };

type CanonicalReservationRecord = LastReservation & {
  canonicalStatus: "active" | "cancelled" | "error";
};

function normalizeReferenceText(text: string): string {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function toISODateOffset(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getEffectiveActiveReservationContext(state: any): ActiveReservationContext | undefined {
  const explicit = state?.activeReservationContext;
  if (explicit?.kind === "draft" || explicit?.kind === "reservation") return explicit;
  if (state?.desiredAction === "create" || state?.activeFlow === "reservation") {
    return buildDraftReservationContext(
      state?.salesStage === "quote" || state?.conversationStage === "reservation_quoted" || state?.lastProposal
        ? "quoted"
        : "collecting"
    );
  }
  if (state?.salesStage === "quote" || state?.conversationStage === "reservation_quoted" || state?.lastProposal) {
    return buildDraftReservationContext("quoted");
  }
  if (state?.lastReservation?.reservationId || state?.salesStage === "close") {
    return buildFocusedReservationContext(
      state?.lastReservation?.reservationId,
      state?.lastReservation?.status === "cancelled" ? "cancelled" : "confirmed"
    );
  }
  if (state?.reservationSlots) return buildDraftReservationContext("collecting");
  return undefined;
}

function normalizeCanonicalReservationStatus(status: string | null | undefined): CanonicalReservationRecord["canonicalStatus"] {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "cancelled") return "cancelled";
  if (normalized === "error") return "error";
  return "active";
}

function hasMaterializedReservationPayload(item: any): boolean {
  if (!item || typeof item !== "object") return false;
  return Boolean(
    String(item.guestName || "").trim() ||
    String(item.roomType || "").trim() ||
    String(item.checkIn || "").trim() ||
    String(item.checkOut || "").trim() ||
    String(item.numGuests || "").trim()
  );
}

function isCanonicalReservationRecordEligible(item: any): boolean {
  if (!item?.reservationId) return false;
  const status = normalizeCanonicalReservationStatus(item.status);
  if (status === "cancelled" || status === "error") return true;
  return hasMaterializedReservationPayload(item);
}

function historyContainsReservationId(
  history: LastReservation[] | null | undefined,
  reservationId: string | undefined
): boolean {
  if (!reservationId) return false;
  return (Array.isArray(history) ? history : []).some((item) => item?.reservationId === reservationId);
}

function shouldPreserveLastReservationRecord(
  history: LastReservation[] | null | undefined,
  record: LastReservation | null | undefined
): boolean {
  if (!record?.reservationId) return false;
  return isCanonicalReservationRecordEligible(record) || historyContainsReservationId(history, record.reservationId);
}

function buildReservationCanonicalState(state: any): {
  records: CanonicalReservationRecord[];
  actionableRecords: CanonicalReservationRecord[];
  byId: Map<string, CanonicalReservationRecord>;
} {
  const history = Array.isArray(state?.reservationHistory) ? state.reservationHistory : [];
  const records = [...history];
  if (shouldPreserveLastReservationRecord(history, state?.lastReservation)) records.push(state.lastReservation);

  const byId = new Map<string, CanonicalReservationRecord>();
  for (const item of records) {
    if (!item?.reservationId) continue;
    const current: CanonicalReservationRecord = {
      ...item,
      canonicalStatus: normalizeCanonicalReservationStatus(item.status),
    };
    const prev = byId.get(item.reservationId);
    if (!prev) {
      byId.set(item.reservationId, current);
      continue;
    }
    const prevAt = String(prev.createdAt || "");
    const currAt = String(current.createdAt || "");
    if (!prevAt || currAt > prevAt || (currAt === prevAt && current.canonicalStatus !== prev.canonicalStatus)) {
      byId.set(current.reservationId, current);
    }
  }

  const canonicalRecords = Array.from(byId.values()).sort((a, b) => {
    const byCreatedAt = String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    return byCreatedAt || String(a.reservationId || "").localeCompare(String(b.reservationId || ""));
  });
  return {
    records: canonicalRecords,
    actionableRecords: canonicalRecords.filter((item) => item.canonicalStatus === "active"),
    byId,
  };
}

function buildCanonicalReservationRecords(state: any): CanonicalReservationRecord[] {
  return buildReservationCanonicalState(state).records;
}

function buildReservationListAnswer(
  lang: "es" | "en" | "pt",
  reservations: CanonicalReservationRecord[]
): string {
  const visibleReservations = reservations.filter((item) => isCanonicalReservationRecordEligible(item));
  if (!visibleReservations.length) {
    return lang === "pt"
      ? "Não encontrei reservas para mostrar nesta conversa."
      : lang === "en"
        ? "I couldn't find any bookings to show in this conversation."
        : "No encontré reservas para mostrar en esta conversación.";
  }

  const lines = visibleReservations.map((item, index) => {
    const roomType = item.roomType ? localizeRoomType(item.roomType, lang) : undefined;
    const guestName = String(item.guestName || "").trim();
    const checkIn = isoToDDMMYYYY(item.checkIn) || item.checkIn || (lang === "pt" ? "sem data" : lang === "en" ? "no date" : "sin fecha");
    const checkOut = isoToDDMMYYYY(item.checkOut) || item.checkOut || (lang === "pt" ? "sem data" : lang === "en" ? "no date" : "sin fecha");
    const status =
      item.canonicalStatus === "cancelled"
        ? (lang === "pt" ? "cancelada" : lang === "en" ? "cancelled" : "cancelada")
        : item.canonicalStatus === "error"
          ? (lang === "pt" ? "com erro" : lang === "en" ? "error" : "con error")
          : (lang === "pt" ? "ativa" : lang === "en" ? "active" : "activa");
    const owner = guestName
      ? ` · ${lang === "pt" ? "em nome de" : lang === "en" ? "under" : "a nombre de"} ${guestName}`
      : "";
    const guests = item.numGuests ? ` · ${lang === "pt" ? "hóspedes" : lang === "en" ? "guests" : "huéspedes"}: ${item.numGuests}` : "";
    const room = roomType ? ` · ${lang === "pt" ? "quarto" : lang === "en" ? "room" : "habitación"}: ${roomType}` : "";
    return `${index + 1}. ${item.reservationId} · ${status}${owner}${room} · ${checkIn} → ${checkOut}${guests}`;
  });

  const title =
    lang === "pt"
      ? "Estas são as reservas desta conversa:"
      : lang === "en"
        ? "These are the bookings on this conversation:"
        : "Estas son las reservas de esta conversación:";
  return [title, ...lines].join("\n");
}

function buildReservationReferenceCandidates(state: any): ReservationReferenceTarget[] {
  const candidates: ReservationReferenceTarget[] = [];
  const active = getEffectiveActiveReservationContext(state);
  if (active?.kind === "draft") {
    candidates.push({
      kind: "draft",
      guestName: state?.reservationSlots?.guestName,
      roomType: state?.reservationSlots?.roomType,
      numGuests: state?.reservationSlots?.numGuests,
      checkIn: state?.reservationSlots?.checkIn,
      checkOut: state?.reservationSlots?.checkOut,
      source: "active",
    });
  } else if (active?.kind === "reservation" && active.reservationId) {
    const activeRecord = buildCanonicalReservationRecords(state).find((item) => item.reservationId === active.reservationId);
    candidates.push({
      kind: "reservation",
      reservationId: active.reservationId,
      reservationStatus: activeRecord?.canonicalStatus === "active" ? "created" : activeRecord?.canonicalStatus,
      guestName: state?.lastReservation?.reservationId === active.reservationId ? state?.reservationSlots?.guestName : activeRecord?.guestName,
      roomType: state?.lastReservation?.reservationId === active.reservationId ? state?.reservationSlots?.roomType : activeRecord?.roomType,
      numGuests: state?.lastReservation?.reservationId === active.reservationId ? state?.reservationSlots?.numGuests : activeRecord?.numGuests,
      checkIn: state?.lastReservation?.reservationId === active.reservationId ? state?.reservationSlots?.checkIn : activeRecord?.checkIn,
      checkOut: state?.lastReservation?.reservationId === active.reservationId ? state?.reservationSlots?.checkOut : activeRecord?.checkOut,
      source: "active",
    });
  }

  for (const item of buildCanonicalReservationRecords(state)) {
    if (!item?.reservationId) continue;
    if (candidates.some((candidate) => candidate.reservationId === item.reservationId && candidate.kind === "reservation")) {
      continue;
    }
    candidates.push({
      kind: "reservation",
      reservationId: item.reservationId,
      reservationStatus: item.canonicalStatus === "active" ? "created" : item.canonicalStatus,
      guestName: item.guestName,
      roomType: item.roomType,
      numGuests: item.numGuests,
      checkIn: item.checkIn,
      checkOut: item.checkOut,
      source: "history",
    });
  }

  return candidates;
}

function buildOrderedReservationHistoryCandidates(state: any): ReservationReferenceTarget[] {
  return buildReservationCanonicalState(state).records
    .map((item) => ({
      kind: "reservation" as const,
      reservationId: item.reservationId,
      reservationStatus: item.canonicalStatus === "active" ? "created" : item.canonicalStatus,
      guestName: item.guestName,
      roomType: item.roomType,
      numGuests: item.numGuests,
      checkIn: item.checkIn,
      checkOut: item.checkOut,
      source: "history" as const,
    }));
}

function buildActionableReservationCandidates(state: any): ReservationReferenceTarget[] {
  return buildReservationCanonicalState(state).actionableRecords.map((item) => ({
    kind: "reservation" as const,
    reservationId: item.reservationId,
    reservationStatus: "created",
    guestName: item.guestName,
    roomType: item.roomType,
    numGuests: item.numGuests,
    checkIn: item.checkIn,
    checkOut: item.checkOut,
    source: "history" as const,
  }));
}

function resolveSingleActionableReservationTarget(state: any): ReservationReferenceTarget | null {
  const actionable = buildActionableReservationCandidates(state);
  return actionable.length === 1 ? actionable[0] : null;
}

function extractReservationOrdinalReferenceSpec(text: string): ReservationOrdinalReference | null {
  if (/\b(?:la|esa)\s+(?:primer|primera)\b|\b(?:primer|primera)\b/.test(text)) return { type: "ordinal", value: "first" };
  if (/\b(?:la|esa)\s+segunda\b|\bsegunda\b/.test(text)) return { type: "ordinal", value: "second" };
  if (/\b(?:la|esa)\s+tercera\b|\btercera\b/.test(text)) return { type: "ordinal", value: "third" };
  if (/\b(?:la|esa)\s+cuarta\b|\bcuarta\b/.test(text)) return { type: "ordinal", value: "fourth" };
  if (/\b(?:la|esa)\s+(?:ultima|última)\b|\b(?:ultima|última)\b/.test(text)) return { type: "ordinal", value: "last" };
  return null;
}

function extractReservationOrdinalReference(text: string): "first" | "second" | "third" | "fourth" | "last" | null {
  const ref = extractReservationOrdinalReferenceSpec(text);
  return ref?.value ?? null;
}

function validateOrdinalReservationReference(
  state: any,
  reference: ReservationOrdinalReference | null
): { ok: true; target: ReservationReferenceTarget } | { ok: false; requested: ReservationOrdinalReference["value"]; availableCount: number } | null {
  if (!reference) return null;
  const orderedReservationHistory = buildOrderedReservationHistoryCandidates(state);
  const availableCount = orderedReservationHistory.length;
  if (availableCount === 0) {
    return { ok: false, requested: reference.value, availableCount: 0 };
  }
  if (reference.value === "last") {
    const target = orderedReservationHistory.at(-1);
    return target?.reservationId
      ? { ok: true, target }
      : { ok: false, requested: reference.value, availableCount };
  }
  const ordinalIndexMap = { first: 0, second: 1, third: 2, fourth: 3 } as const;
  const target = orderedReservationHistory[ordinalIndexMap[reference.value]];
  return target?.reservationId
    ? { ok: true, target }
    : { ok: false, requested: reference.value, availableCount };
}

function resolveValidatedOrdinalReservationTarget(
  state: any,
  userText: string
): ReservationReferenceTarget | null {
  const validation = validateOrdinalReservationReference(state, extractReservationOrdinalReferenceSpec(normalizeReferenceText(userText)));
  return validation?.ok ? validation.target : null;
}

function buildOutOfRangeReservationReferenceReply(
  lang: "es" | "en" | "pt",
  requested: "first" | "second" | "third" | "fourth" | "last",
  availableCount: number
): string {
  const esOrdinalMap = { first: "primera", second: "segunda", third: "tercera", fourth: "cuarta", last: "última" } as const;
  const ptOrdinalMap = { first: "primeira", second: "segunda", third: "terceira", fourth: "quarta", last: "última" } as const;
  const enOrdinalMap = { first: "first", second: "second", third: "third", fourth: "fourth", last: "last" } as const;
  if (lang === "es") {
    if (availableCount <= 0) return "No encontré reservas para esa referencia. Si querés, mostrame tus reservas o pasame el código.";
    const options = availableCount === 1 ? "la primera" : availableCount === 2 ? "la primera o la segunda" : "la primera, la segunda o la tercera";
    return `No encontré una reserva ${esOrdinalMap[requested]}. Tenés ${availableCount} reserva${availableCount === 1 ? "" : "s"}. ¿Querés ver ${options}?`;
  }
  if (lang === "pt") {
    if (availableCount <= 0) return "Não encontrei reservas para essa referência. Se quiser, posso listar suas reservas ou você pode me passar o código.";
    const options = availableCount === 1 ? "a primeira" : availableCount === 2 ? "a primeira ou a segunda" : "a primeira, a segunda ou a terceira";
    return `Não encontrei uma reserva ${ptOrdinalMap[requested]}. Você tem ${availableCount} reserva${availableCount === 1 ? "" : "s"}. Quer ver ${options}?`;
  }
  if (availableCount <= 0) return "I could not find any bookings for that reference. I can list your bookings or you can share the code.";
  const options = availableCount === 1 ? "the first one" : availableCount === 2 ? "the first or second one" : "the first, second, or third one";
  return `I could not find a ${enOrdinalMap[requested]} booking. You have ${availableCount} booking${availableCount === 1 ? "" : "s"}. Do you want to view ${options}?`;
}

function buildReservationReferenceGuardReply(
  lang: "es" | "en" | "pt",
  resolution: ReservationReferenceResolution
): string {
  if (resolution.status === "out_of_range") {
    return buildOutOfRangeReservationReferenceReply(lang, resolution.requested, resolution.availableCount);
  }
  return buildReservationReferenceClarification(lang);
}

function buildAmbiguousReservationSelectionReply(
  lang: "es" | "en" | "pt",
  action: "modify" | "cancel" | "snapshot",
  availableCount: number
): string {
  const optionsEs = availableCount <= 1 ? "la primera" : availableCount === 2 ? "la primera o la segunda" : "la primera, la segunda o la tercera";
  const optionsPt = availableCount <= 1 ? "a primeira" : availableCount === 2 ? "a primeira ou a segunda" : "a primeira, a segunda ou a terceira";
  const optionsEn = availableCount <= 1 ? "the first one" : availableCount === 2 ? "the first or second one" : "the first, second, or third one";
  if (lang === "es") {
    const verb = action === "modify" ? "modificar" : action === "cancel" ? "cancelar" : "ver";
    return `Tenés varias reservas. ¿Cuál querés ${verb}? Podés decir ${optionsEs} o pasarme el código.`;
  }
  if (lang === "pt") {
    const verb = action === "modify" ? "alterar" : action === "cancel" ? "cancelar" : "ver";
    return `Você tem várias reservas. Qual quer ${verb}? Você pode dizer ${optionsPt} ou me passar o código.`;
  }
  const verb = action === "modify" ? "modify" : action === "cancel" ? "cancel" : "view";
  return `You have multiple bookings. Which one do you want to ${verb}? You can say ${optionsEn} or share the code.`;
}

function getAmbiguousReservationAction(
  pre: PreLLMResult,
  userText: string,
  options: {
    reservationReference: ReservationReferenceResolution;
    snapshotQueryKind: ReservationSnapshotQueryKind | null;
    normalizedReservationIntent: ReturnType<typeof normalizeReservationIntent>;
    hasModifyVerb: boolean;
    hasAnaphoraReference: boolean;
    explicitIdReservationTarget: ReservationReferenceTarget | null;
    explicitOrdinalReservationTarget: ReservationReferenceTarget | null;
    selectedReservationTarget: ReservationReferenceTarget | null;
  }
): "modify" | "cancel" | "snapshot" | null {
  const actionableCount = buildActionableReservationCandidates(pre.st).length;
  if (actionableCount <= 1) return null;
  if (options.reservationReference.status === "resolved") return null;
  if (options.selectedReservationTarget?.reservationId) return null;
  if (options.hasAnaphoraReference) return null;
  if (options.explicitIdReservationTarget?.reservationId || options.explicitOrdinalReservationTarget?.reservationId) return null;
  if (options.snapshotQueryKind && options.snapshotQueryKind !== "list") return "snapshot";
  if (options.normalizedReservationIntent.kind === "cancel") return "cancel";
  if (options.normalizedReservationIntent.kind === "modify" || wantsGenericModify(userText, pre.lang) || options.hasModifyVerb) return "modify";
  return null;
}

function resolveExplicitOrdinalReservationTarget(state: any, userText: string): ReservationReferenceTarget | null {
  return resolveValidatedOrdinalReservationTarget(state, userText);
}

function getReservationReferenceTargetById(state: any, reservationId?: string | null): ReservationReferenceTarget | null {
  if (!reservationId) return null;
  return buildReservationReferenceCandidates(state).find(
    (candidate) => candidate.kind === "reservation" && candidate.reservationId === reservationId
  ) || null;
}

function resolveSelectedReservationTarget(state: any): ReservationReferenceTarget | null {
  const selected = state?.selectedReservationTarget as SelectedReservationTarget | undefined;
  if (!selected?.reservationId) return null;
  return getReservationReferenceTargetById(state, selected.reservationId);
}

function resolveReservationReference(state: any, userText: string): ReservationReferenceResolution {
  const text = normalizeReferenceText(userText);
  const active = getEffectiveActiveReservationContext(state);
  const candidates = buildReservationReferenceCandidates(state);
  const reservationCandidates = candidates.filter((candidate) => candidate.kind === "reservation" && candidate.reservationId);
  const singleActionableReservation = resolveSingleActionableReservationTarget(state);
  const orderedReservationHistory = buildOrderedReservationHistoryCandidates(state);
  const activeReservationId = active?.kind === "reservation" ? active.reservationId : undefined;
  const alternateReservations = reservationCandidates.filter((candidate) => candidate.reservationId !== activeReservationId);

  const mentionsNew = /\bla nueva\b/.test(text);
  const mentionsOther = /\bla otra\b/.test(text);
  const mentionsPrevious = /\bla anterior\b/.test(text);
  const mentionsThat = /\besa\b/.test(text);
  const mentionsUnique = /\bla unica que tengo\b|\bla unica\b|\bla única que tengo\b|\bla única\b/.test(text);
  const mentionsTomorrow = /\bla de manana\b|\bde manana\b/.test(text);
  const ordinalReference = extractReservationOrdinalReferenceSpec(text);

  if (!mentionsNew && !mentionsOther && !mentionsPrevious && !mentionsThat && !mentionsUnique && !mentionsTomorrow && !ordinalReference) {
    return { status: "unresolved" };
  }

  if (mentionsNew) {
    if (active?.kind === "draft" && !ordinalReference) {
      return {
        status: "resolved",
        target: {
          kind: "draft",
          guestName: state?.reservationSlots?.guestName,
          roomType: state?.reservationSlots?.roomType,
          numGuests: state?.reservationSlots?.numGuests,
          checkIn: state?.reservationSlots?.checkIn,
          checkOut: state?.reservationSlots?.checkOut,
          source: "active",
        },
      };
    }
    const newestReservation = orderedReservationHistory.at(-1);
    if (newestReservation?.reservationId) return { status: "resolved", target: newestReservation };
  }

  if (ordinalReference) {
    const validation = validateOrdinalReservationReference(state, ordinalReference);
    if (validation?.ok) return { status: "resolved", target: validation.target };
    if (validation && !validation.ok) {
      return { status: "out_of_range", requested: validation.requested, availableCount: validation.availableCount };
    }
    return { status: "ambiguous" };
  }

  if (mentionsThat && active) {
    return {
      status: "resolved",
      target:
        active.kind === "draft"
          ? {
            kind: "draft",
            guestName: state?.reservationSlots?.guestName,
            roomType: state?.reservationSlots?.roomType,
            numGuests: state?.reservationSlots?.numGuests,
            checkIn: state?.reservationSlots?.checkIn,
            checkOut: state?.reservationSlots?.checkOut,
            source: "active",
          }
          : {
            kind: "reservation",
            reservationId: active.reservationId || undefined,
            guestName: state?.lastReservation?.reservationId === active.reservationId ? state?.reservationSlots?.guestName : undefined,
            roomType: state?.lastReservation?.reservationId === active.reservationId ? state?.reservationSlots?.roomType : undefined,
            numGuests: state?.lastReservation?.reservationId === active.reservationId ? state?.reservationSlots?.numGuests : undefined,
            checkIn: state?.lastReservation?.reservationId === active.reservationId ? state?.reservationSlots?.checkIn : undefined,
            checkOut: state?.lastReservation?.reservationId === active.reservationId ? state?.reservationSlots?.checkOut : undefined,
            source: "active",
          },
    };
  }

  if ((mentionsThat || mentionsUnique) && singleActionableReservation?.reservationId) {
    return { status: "resolved", target: singleActionableReservation };
  }

  if (mentionsUnique) {
    return reservationCandidates.length > 1 ? { status: "ambiguous" } : { status: "unresolved" };
  }

  if (mentionsTomorrow) {
    const tomorrow = toISODateOffset(1);
    const tomorrowMatches = candidates.filter((candidate) => candidate.checkIn === tomorrow);
    if (tomorrowMatches.length === 1) return { status: "resolved", target: tomorrowMatches[0] };
    if (tomorrowMatches.length > 1) return { status: "ambiguous" };
  }

  if (mentionsOther || mentionsPrevious) {
    if (alternateReservations.length === 1) {
      return { status: "resolved", target: alternateReservations[0] };
    }
    if (mentionsPrevious && active?.kind === "draft" && reservationCandidates.length === 1) {
      return { status: "resolved", target: reservationCandidates[0] };
    }
    if (alternateReservations.length > 1) return { status: "ambiguous" };
  }

  return { status: "unresolved" };
}

function buildReservationReferenceClarification(lang: "es" | "en" | "pt"): string {
  return lang === "es"
    ? "Necesito una precisión: ¿te referís a la reserva nueva, a la anterior o a la de una fecha específica? Si podés, pasame el código o la fecha."
    : lang === "pt"
      ? "Preciso de uma confirmação: você se refere à reserva nova, à anterior ou à de uma data específica? Se puder, me envie o código ou a data."
      : "I need one clarification: do you mean the new booking, the previous one, or the one for a specific date? If possible, share the booking code or date.";
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

function mergeReservationSlots(
  ...sources: Array<Partial<ReservationSlotsStrict> | DbReservationSlots | null | undefined>
): ReservationSlotsStrict {
  const merged: ReservationSlotsStrict = {};
  for (const src of sources) {
    if (!src) continue;
    if (typeof src.guestName === "string" && src.guestName.trim()) merged.guestName = src.guestName.trim();
    if (typeof src.roomType === "string" && src.roomType.trim()) merged.roomType = src.roomType.trim();
    if (typeof src.checkIn === "string" && src.checkIn.trim()) merged.checkIn = src.checkIn.trim();
    if (typeof src.checkOut === "string" && src.checkOut.trim()) merged.checkOut = src.checkOut.trim();
    if (src.numGuests != null && String(src.numGuests).trim()) merged.numGuests = String(src.numGuests).trim();
  }
  return merged;
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

function extractLastAIText(messages: any[] | undefined): string {
  if (!Array.isArray(messages) || messages.length === 0) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    const id = Array.isArray(m?.id) ? m.id : [];
    const isAI = id.includes("AIMessage") || m?.type === "ai" || m?.role === "ai";
    if (!isAI) continue;
    const text = extractTextFromLCContent(m?.content);
    if (text) return text;
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
async function emitReply(conversationId: string, text: string, sendReply?: (reply: string) => Promise<void>, rich?: RichPayload) {
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
export function detectIntent(
  userText: string,
  state: Pick<ConversationState, "draft" | "confirmedBooking">
): "reservation" | "modify" | "ambiguous" {
  const t = (userText || "").toLowerCase();
  const normalizedReservationIntent = normalizeReservationIntent(userText || "");
  if (normalizedReservationIntent.kind === "modify") return "modify";
  const asksModify = /(modific|cambi|alter|mudar|change|update|editar|edit|corrig)/.test(t) || /(cancel|anul|dar de baja)/.test(t);
  const asksReserve = /(reserv|book|quero reservar|quiero reservar|hacer una reserva|fazer uma reserva)/.test(t);
  const asksAvailabilityReservation =
    /\b(disponibil\w*|availability)\b/.test(t) &&
    /\b(tienen?|hay|have|quiero saber si tienen|quiero consultar|consultar|for|para|este|this|weekend|fin de semana)\b/.test(t);
  if (asksModify) return "modify";
  if (asksReserve) return "reservation";
  if (asksAvailabilityReservation) return "reservation";
  if (state?.draft && /(esa|mi|minha)\s+reserva|that booking/.test(t)) return "modify";
  return "ambiguous";
}

// === NEW: mapping structured intent → category (coherencia interna)
export function mapStructuredIntentToCategory(
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
    case "pricing_request": return "reservation";
    case "checkin_info": return "checkin_info";
    case "checkout_info": return "checkout_info";
    case "amenities_info": return "amenities_info";
    case "location_directions": return "directions_info";
    case "general_question": return "retrieval_based";
    case "out_of_scope": return "out_of_scope";
    default: return "retrieval_based";
  }
}

function looksTransactionalPricingIntent(text: string): boolean {
  const t = String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  const hasPriceSignal =
    /\b(precio|precios|tarifa|tarifas|rate|rates|price|prices|cotiz(?:acion|acion|ar)?|quote|quotes)\b/.test(t) ||
    /\b(cuanto|quanto|how much)\s+(sale|cuesta|cost|is)\b/.test(t);
  const hasReservationSignal = /\b(habitacion|room|rooms|single|individual|double|doble|matrimonial|twin|queen|king|triple|suite|familiar|reserva|reservar|booking)\b/.test(t);
  return hasPriceSignal && hasReservationSignal;
}

type DominantTurnDomain =
  | "reservation"
  | "pricing"
  | "policies"
  | "faq"
  | "fallback";

function detectDominantTurnDomain(
  text: string,
  lang: "es" | "en" | "pt"
): {
  dominant: DominantTurnDomain;
  hasMultiple: boolean;
  hasReservation: boolean;
  hasPricing: boolean;
  hasPolicies: boolean;
  hasFaq: boolean;
} {
  const rawText = String(text || "");
  const normalized = rawText
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  const normalizedReservationIntent = normalizeReservationIntent(rawText);
  const extracted = extractSlotsFromText(rawText, lang);
  const hasExplicitBookingVerb =
    /\b(reserv(ar|a|o)?|book(?:ing)?|booking)\b/.test(normalized);
  const hasReservationObject =
    /\b(reserva|booking|reservation)\b/.test(normalized);
  const hasReservation =
    normalizedReservationIntent.kind === "modify" ||
    normalizedReservationIntent.kind === "cancel" ||
    hasExplicitBookingVerb ||
    (hasReservationObject && Boolean(extracted.checkIn || extracted.checkOut || extracted.roomType || extracted.numGuests || extracted.guestName));
  const hasPricing = looksTransactionalPricingIntent(rawText);
  const hasPolicies =
    /\b(mascotas?|pets?|pet[- ]?friendly|aceptan mascotas|permiten mascotas|allowed pets|politicas?|policies?|policy|condiciones)\b/.test(normalized);
  const hasFaq =
    /\b(desayuno|breakfast|wifi|wi[- ]?fi|internet|pileta|piscina|pool|spa|gym|gimnasio|parking|estacionamiento|check[- ]?in|check[- ]?out)\b/.test(normalized);

  const domains = [
    hasReservation ? "reservation" : null,
    hasPricing ? "pricing" : null,
    hasPolicies ? "policies" : null,
    hasFaq ? "faq" : null,
  ].filter(Boolean) as DominantTurnDomain[];

  const dominant =
    domains.includes("reservation")
      ? "reservation"
      : domains.includes("pricing")
        ? "pricing"
        : domains.includes("policies")
          ? "policies"
          : domains.includes("faq")
            ? "faq"
            : "fallback";

  return {
    dominant,
    hasMultiple: domains.length > 1,
    hasReservation,
    hasPricing,
    hasPolicies,
    hasFaq,
  };
}


function isExplicitModifyExitTurn(text: string): boolean {
  const normalized = normalizeReferenceText(text || "");
  return Boolean(
    /\b(no\s+quiero\s+modific(ar|arla|arl[oa]?)|ya\s+no\s+quiero\s+modific(ar|arla|arl[oa]?)|no\s+la\s+quiero\s+modific(ar|ar)|olvida\s+la\s+modificaci[oó]n|dejala\s+as[ii]|dejalo\s+as[ii])\b/.test(normalized)
  );
}

function buildPricingClarificationReply(
  lang: "es" | "en" | "pt",
  slots: ReservationSlotsStrict
): string {
  const roomLabel =
    slots.roomType
      ? localizeRoomType(String(slots.roomType), lang)
      : lang === "es"
        ? "una habitación"
        : lang === "pt"
          ? "um quarto"
          : "a room";
  if (lang === "es") {
    return `Puedo cotizar ${roomLabel}. Para darte un precio exacto necesito fechas y cantidad de huéspedes.`;
  }
  if (lang === "pt") {
    return `Posso cotar ${roomLabel}. Para passar um valor exato, preciso das datas e da quantidade de hóspedes.`;
  }
  return `I can quote ${roomLabel}. To give you an exact price, I need the dates and guest count.`;
}

function isRoomTypeFollowupInReservation(
  lcHistory: (HumanMessage | AIMessage)[],
  text: string,
  lang: "es" | "en" | "pt"
): boolean {
  const trimmed = String(text || "").trim();
  if (!trimmed || trimmed.length > 24) return false;
  const slots = extractSlotsFromText(trimmed, lang);
  if (!slots.roomType || slots.checkIn || slots.checkOut || slots.numGuests || slots.guestName) return false;
  const lastAi = [...lcHistory].reverse().find((m) => m instanceof AIMessage) as AIMessage | undefined;
  const lastText = String(lastAi?.content || "").toLowerCase();
  return /\b(tipo de habitaci[oó]n|tipo de quarto|room type)\b/.test(lastText);
}

function isGuestsFollowupInReservation(
  lcHistory: (HumanMessage | AIMessage)[],
  text: string,
  lang: "es" | "en" | "pt"
): boolean {
  const trimmed = String(text || "").trim();
  if (!trimmed || trimmed.length > 24) return false;
  const slots = extractSlotsFromText(trimmed, lang);
  const normalized = trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  const isPureGuestCount =
    /^\d{1,2}$/.test(trimmed) ||
    /^(un|uno|una|dos|tres|cuatro|cinco|seis|sete|siete|ocho|nueve|diez|one|two|three|four|five|six|seven|eight|nine|ten|um|uma)$/i.test(normalized);
  if ((!slots.numGuests && !isPureGuestCount) || slots.checkIn || slots.checkOut || slots.roomType || slots.guestName) return false;
  const lastAi = [...lcHistory].reverse().find((m) => m instanceof AIMessage) as AIMessage | undefined;
  const lastText = String(lastAi?.content || "").toLowerCase();
  return /\b(cu[aá]ntos hu[eé]spedes|n[uú]mero de hu[eé]spedes|numero de hu[eé]spedes|cantidad de hu[eé]spedes|quantos h[oó]spedes|n[uú]mero de h[oó]spedes|how many guests)\b/.test(
    lastText
  );
}

function isGuestNameFollowupInReservation(
  lcHistory: (HumanMessage | AIMessage)[],
  text: string
): boolean {
  const trimmed = String(text || "").trim();
  if (!trimmed || trimmed.length < 3 || trimmed.length > 60) return false;
  if (!looksLikeName(trimmed)) return false;
  const lastAi = [...lcHistory].reverse().find((m) => m instanceof AIMessage) as AIMessage | undefined;
  const lastText = String(lastAi?.content || "").toLowerCase();
  return /\b(a nombre de qui[eé]n ser[ií]a la reserva|nombre y apellido|what name should i use for the reservation|full name|nome e sobrenome|em nome de quem seria a reserva)\b/.test(lastText);
}

function hasActiveReservationDomain(pre: PreLLMResult): boolean {
  const st = pre.st;
  const focus = getConversationFocus(st);
  const hasDraftSlots = Boolean(
    st?.reservationSlots?.roomType ||
    st?.reservationSlots?.checkIn ||
    st?.reservationSlots?.checkOut ||
    st?.reservationSlots?.numGuests ||
    st?.reservationSlots?.guestName
  );
  const hasTurnLevelSlots = Boolean(
    pre.currSlots?.roomType ||
    pre.currSlots?.checkIn ||
    pre.currSlots?.checkOut ||
    pre.currSlots?.numGuests ||
    pre.currSlots?.guestName
  );
  return Boolean(
    pre.inModifyMode ||
    st?.activeFlow === "reservation" ||
    st?.activeFlow === "modify_reservation" ||
    st?.desiredAction === "create" ||
    st?.desiredAction === "modify" ||
    pre.prevCategory === "reservation" ||
    pre.prevCategory === "modify_reservation" ||
    st?.conversationStage === "reservation_quoted" ||
    st?.salesStage === "quote" ||
    st?.activeReservationContext?.kind === "draft" ||
    st?.activeReservationContext?.kind === "reservation" ||
    hasDraftSlots ||
    hasTurnLevelSlots ||
    focus?.active
  );
}

function isReservationConfirmSignal(text: string): boolean {
  if (isPureConfirm(text)) return true;
  const compact = normalizeReferenceText(text || "").replace(/\s+/g, "");
  return /^(confirmar+|confirmo|comfirmar+|confimar+|cofirmar+|conmfirmar+|confirmame|confirma|confirmalo|confirmarla|confirmarr+)$/.test(compact);
}

function hasStrongReservationDomainExitIntent(text: string): boolean {
  const normalized = normalizeReferenceText(text || "");
  const normalizedIntent = normalizeReservationIntent(text || "");
  return Boolean(
    normalizedIntent.kind === "cancel" ||
    /\b(wifi|wi-fi|internet|pileta|piscina|pool|spa|gym|gimnasio|parking|estacionamiento|factura|invoice|pago|payment|ayuda|help|soporte|support)\b/.test(normalized)
  );
}

function isReservationSnapshotFollowupSignal(pre: PreLLMResult, text: string): boolean {
  const normalized = normalizeReferenceText(text || "");
  const trimmed = String(text || "").trim();
  if (!trimmed || trimmed.length > 48) return false;
  const hasSnapshotContext =
    pre.prevCategory === "reservation_snapshot" ||
    Boolean(pre.st?.selectedReservationTarget?.reservationId) ||
    pre.st?.activeReservationContext?.kind === "reservation";
  if (!hasSnapshotContext) return false;
  return Boolean(
    /\b(esa|la misma|el mismo)\b/.test(normalized) ||
    extractReservationOrdinalReference(normalized) ||
    /\b(mostrame|muestrame|mostrarme|mostrar|ver|detalle|detalles|resumen|snapshot|captura)\b/.test(normalized) ||
    /\b(como quedo|como quedó|como queda|como quedaria|como quedaría)\b/.test(normalized)
  );
}

function isReservationModifySubstateSignal(pre: PreLLMResult, text: string): boolean {
  const activeField = pre.st?.modifyState?.activeField as ModifyState["activeField"] | undefined;
  if (!activeField) return false;
  const normalized = normalizeReferenceText(text || "");
  const trimmed = String(text || "").trim();
  const extracted = extractSlotsFromText(text || "", pre.lang);
  if (!trimmed || trimmed.length > 48) return false;
  if (activeField === "guests") {
    return Boolean(
      extracted.numGuests ||
      /^\d{1,2}$/.test(trimmed) ||
      /\b(persona|personas|huesped|huespedes|guest|guests|hospede|hospedes)\b/.test(normalized)
    );
  }
  if (activeField === "roomType") {
    return Boolean(extracted.roomType);
  }
  if (activeField === "dates") {
    const range = extractDateRangeFromText(text || "");
    return Boolean(
      range.checkIn ||
      range.checkOut ||
      /\b\d{1,2}\s+noches?\b|\b\d{1,2}\s+nights?\b|\b\d{1,2}\s+noites?\b/.test(normalized)
    );
  }
  return false;
}

function getReservationDomainLockSignal(pre: PreLLMResult, text: string): {
  active: boolean;
  compatible: boolean;
  breaksLock: boolean;
  confirmSignal: boolean;
  snapshotFollowup: boolean;
  modifySubstate: boolean;
  roomTypeOnly: boolean;
  guestCount: boolean;
  nightCount: boolean;
  breakfastPreference: boolean;
} {
  const active = hasActiveReservationDomain(pre);
  const normalized = normalizeReferenceText(text || "");
  const trimmed = String(text || "").trim();
  const extracted = extractSlotsFromText(text || "", pre.lang);
  const roomTypeOnly = Boolean(extracted.roomType) && !extracted.checkIn && !extracted.checkOut && !extracted.numGuests;
  const guestCount = Boolean(extracted.numGuests) && !extracted.checkIn && !extracted.checkOut;
  const nightCount =
    /\b\d{1,2}\s+noches?\b|\b\d{1,2}\s+nights?\b|\b\d{1,2}\s+noites?\b/.test(normalized) ||
    /^(una|dos|tres|cuatro|cinco|one|two|three|four|five|uma|duas|tres|quatro|cinco)\s+(noche|noches|night|nights|noite|noites)\b/.test(normalized);
  const breakfastPreference =
    /^(con|sin)\s+desayuno\b/.test(normalized) ||
    /^(with|without)\s+breakfast\b/.test(normalized) ||
    /^(com|sem)\s+cafe\s+da\s+manha\b/.test(normalized);
  const confirmSignal = isReservationConfirmSignal(text || "");
  const snapshotFollowup = isReservationSnapshotFollowupSignal(pre, text || "");
  const modifySubstate = isReservationModifySubstateSignal(pre, text || "");
  const breaksLock = hasStrongReservationDomainExitIntent(text || "");
  const compatible =
    active &&
    !breaksLock &&
    trimmed.length <= 40 &&
    (roomTypeOnly || guestCount || nightCount || breakfastPreference || confirmSignal || snapshotFollowup || modifySubstate);
  return { active, compatible, breaksLock, confirmSignal, snapshotFollowup, modifySubstate, roomTypeOnly, guestCount, nightCount, breakfastPreference };
}

function buildReservationDomainLockReply(
  pre: PreLLMResult,
  signal: {
    confirmSignal: boolean;
    snapshotFollowup: boolean;
    modifySubstate: boolean;
    roomTypeOnly: boolean;
    guestCount: boolean;
    nightCount: boolean;
    breakfastPreference: boolean;
  },
  nextSlots: ReservationSlotsStrict
): string {
  const knownSlots = {
    ...(pre.st?.reservationSlots || {}),
    ...(pre.currSlots || {}),
    ...(nextSlots || {}),
  } as ReservationSlotsStrict;
  const inModifyFlow =
    pre.inModifyMode ||
    pre.st?.desiredAction === "modify" ||
    pre.st?.activeFlow === "modify_reservation" ||
    pre.prevCategory === "modify_reservation";

  if (inModifyFlow) {
    if (signal.snapshotFollowup) {
      return pre.lang === "es"
        ? "Seguimos trabajando sobre esa reserva. Decime qué cambio querés hacer."
        : pre.lang === "pt"
          ? "Seguimos trabalhando nessa reserva. Me diga qual alteração você quer fazer."
          : "We are still working on that booking. Tell me what you want to change.";
    }
    if (signal.guestCount) {
      return pre.lang === "es"
        ? "Perfecto. Tomo esa nueva cantidad de huéspedes para la modificación. ¿Querés cambiar algo más?"
        : pre.lang === "pt"
          ? "Perfeito. Considero essa nova quantidade de hóspedes na alteração. Quer mudar mais alguma coisa?"
          : "Got it. I will use that new guest count for the change. Would you like to change anything else?";
    }
    if (signal.roomTypeOnly) {
      return pre.lang === "es"
        ? "Perfecto. Tomo ese tipo de habitación para la modificación. ¿Querés cambiar algo más?"
        : pre.lang === "pt"
          ? "Perfeito. Considero esse tipo de quarto na alteração. Quer mudar mais alguma coisa?"
          : "Got it. I will use that room type for the change. Would you like to change anything else?";
    }
    if (signal.nightCount) {
      return pre.lang === "es"
        ? "Perfecto. Para cambiar la estadía necesito las fechas exactas de check-in y check-out."
        : pre.lang === "pt"
          ? "Perfeito. Para alterar a estadia, preciso das datas exatas de check-in e check-out."
          : "Got it. To change the stay length, I need the exact check-in and check-out dates.";
    }
    if (signal.breakfastPreference) {
      return pre.lang === "es"
        ? "Lo tomo en cuenta, pero para modificar la reserva necesito definir fechas, habitación o huéspedes."
        : pre.lang === "pt"
          ? "Levo isso em conta, mas para alterar a reserva preciso definir datas, quarto ou hóspedes."
          : "I will keep that in mind, but to modify the booking I need dates, room type, or guest count.";
    }
  }

  if (signal.confirmSignal) {
    return pre.lang === "es"
      ? "Perfecto, tomo eso como confirmación y sigo con la reserva."
      : pre.lang === "pt"
        ? "Perfeito, tomo isso como confirmação e sigo com a reserva."
        : "Got it, I will treat that as confirmation and continue with the booking.";
  }
  if (signal.snapshotFollowup) {
    return pre.lang === "es"
      ? "Seguimos sobre esa reserva. Decime si querés verla, modificarla o cancelarla."
      : pre.lang === "pt"
        ? "Seguimos nessa reserva. Me diga se você quer vê-la, alterá-la ou cancelá-la."
        : "We are still on that booking. Tell me if you want to view, modify, or cancel it.";
  }
  if (!knownSlots.checkIn) return buildAskMissingDate(pre.lang, "checkIn");
  if (!knownSlots.checkOut) return buildAskMissingDate(pre.lang, "checkOut");
  if (!knownSlots.numGuests) return buildAskGuests(pre.lang);
  if (!knownSlots.roomType) {
    return pre.lang === "es"
      ? "¿Qué tipo de habitación querés reservar?"
      : pre.lang === "pt"
        ? "Que tipo de quarto você quer reservar?"
        : "Which room type would you like to book?";
  }
  if (!isSafeGuestName(knownSlots.guestName || "")) return buildAskGuestName(pre.lang);
  if (signal.breakfastPreference) {
    return pre.lang === "es"
      ? "Perfecto, lo tengo en cuenta para la reserva. ¿Confirmás que seguimos con esos datos?"
      : pre.lang === "pt"
        ? "Perfeito, vou considerar isso na reserva. Você confirma que seguimos com esses dados?"
        : "Got it, I will keep that in mind for the booking. Do you want to continue with those details?";
  }
  return pre.lang === "es"
    ? "Perfecto, sigo con tu reserva."
    : pre.lang === "pt"
      ? "Perfeito, continuo com sua reserva."
      : "Perfect, I will continue with your booking.";
}

function isReservationFlowStillActive(pre: PreLLMResult): boolean {
  const focus = getConversationFocus(pre.st);
  return Boolean(
    hasActiveReservationDomain(pre) ||
    pre.prevCategory === "reservation_snapshot" ||
    pre.st?.selectedReservationTarget?.reservationId ||
    pre.st?.modifyState?.activeField ||
    askedToConfirmReservation(pre.lcHistory) ||
    focus?.active
  );
}

function shouldUseReservationLocalFallback(
  pre: PreLLMResult,
  nextCategory: string | null | undefined,
  finalText: string,
  signal: ReturnType<typeof getReservationDomainLockSignal>
): boolean {
  const dominantTurnDomain = detectDominantTurnDomain(String(pre.msg.content || ""), pre.lang);
  const shouldAllowCrossDomainOverride =
    !signal.compatible &&
    (dominantTurnDomain.dominant === "faq" || dominantTurnDomain.dominant === "policies");
  if (shouldAllowCrossDomainOverride) return false;
  if (signal.breaksLock) return false;
  if (!isReservationFlowStillActive(pre)) return false;
  if (
    ((pre.st as any)?.pendingAvailabilityVerification && isPureAffirmative(String(pre.msg.content || ""), pre.lang)) ||
    isAskAvailabilityStatusQuery(String(pre.msg.content || ""), pre.lang)
  ) {
    return false;
  }
  return Boolean(
    nextCategory === "retrieval_based" ||
    nextCategory === "out_of_scope" ||
    nextCategory === "amenities" ||
    nextCategory === "amenities_info" ||
    nextCategory === "billing" ||
    nextCategory === "support" ||
    isContactHotelText(finalText, pre.lang)
  );
}

function buildReservationLocalFallbackReply(
  pre: PreLLMResult,
  signal: ReturnType<typeof getReservationDomainLockSignal>,
  nextSlots: ReservationSlotsStrict
): { nextCategory: "reservation" | "modify_reservation" | "reservation_snapshot"; finalText: string } {
  const knownSlots = {
    ...(pre.st?.reservationSlots || {}),
    ...(pre.currSlots || {}),
    ...(nextSlots || {}),
  } as ReservationSlotsStrict;
  const activeModifyField = pre.st?.modifyState?.activeField as ModifyState["activeField"] | undefined;
  const inModifyFlow =
    pre.inModifyMode ||
    pre.st?.desiredAction === "modify" ||
    pre.st?.activeFlow === "modify_reservation" ||
    pre.prevCategory === "modify_reservation";
  const inSnapshotFlow =
    pre.prevCategory === "reservation_snapshot" ||
    Boolean(pre.st?.selectedReservationTarget?.reservationId);
  const inConfirmFlow =
    (!inModifyFlow && askedToConfirmReservation(pre.lcHistory)) ||
    pre.st?.salesStage === "quote" ||
    pre.st?.conversationStage === "reservation_quoted";

  if (inModifyFlow) {
    if (activeModifyField === "guests") {
      return {
        nextCategory: "modify_reservation",
        finalText:
          pre.lang === "es"
            ? "Seguimos modificando huéspedes. Decime la nueva cantidad de huéspedes."
            : pre.lang === "pt"
              ? "Seguimos alterando os hóspedes. Me diga a nova quantidade de hóspedes."
              : "We are still changing guests. Tell me the new guest count.",
      };
    }
    if (activeModifyField === "dates") {
      return {
        nextCategory: "modify_reservation",
        finalText:
          pre.lang === "es"
            ? "Seguimos modificando fechas. Decime el nuevo check-in y check-out."
            : pre.lang === "pt"
              ? "Seguimos alterando as datas. Me diga o novo check-in e check-out."
              : "We are still changing dates. Tell me the new check-in and check-out.",
      };
    }
    if (activeModifyField === "roomType") {
      return {
        nextCategory: "modify_reservation",
        finalText:
          pre.lang === "es"
            ? "Seguimos modificando la habitación. Decime el nuevo tipo de habitación."
            : pre.lang === "pt"
              ? "Seguimos alterando o quarto. Me diga o novo tipo de quarto."
              : "We are still changing the room. Tell me the new room type.",
      };
    }
    return {
      nextCategory: "modify_reservation",
      finalText: buildModifyGuidance(pre.lang, nextSlots),
    };
  }

  if (inSnapshotFlow && !signal.confirmSignal) {
    return {
      nextCategory: "reservation_snapshot",
      finalText:
        pre.lang === "es"
          ? "Decime qué reserva querés ver o gestionar: la primera, la segunda, la última, o pasame el código."
          : pre.lang === "pt"
            ? "Me diga qual reserva você quer ver ou gerir: a primeira, a segunda, a última, ou me passe o código."
            : "Tell me which booking you want to view or manage: the first, second, last, or share the booking code.",
    };
  }

  if (inConfirmFlow) {
    return {
      nextCategory: "reservation",
      finalText:
        pre.lang === "es"
          ? "Seguimos en el cierre de la reserva. Si querés confirmarla, respondé \"confirmar\". Si querés cambiar algo, decímelo."
          : pre.lang === "pt"
            ? "Seguimos no fechamento da reserva. Se quiser confirmá-la, responda \"confirmar\". Se quiser mudar algo, me diga."
            : "We are still closing the booking. If you want to confirm it, reply \"confirmar\". If you want to change something, tell me.",
    };
  }

  if (!knownSlots.checkIn) return { nextCategory: "reservation", finalText: buildAskMissingDate(pre.lang, "checkIn") };
  if (!knownSlots.checkOut) return { nextCategory: "reservation", finalText: buildAskMissingDate(pre.lang, "checkOut") };
  if (!knownSlots.roomType) {
    return {
      nextCategory: "reservation",
      finalText:
        pre.lang === "es"
          ? "Seguimos con tu reserva. ¿Qué tipo de habitación querés?"
          : pre.lang === "pt"
            ? "Seguimos com a sua reserva. Que tipo de quarto você quer?"
            : "We are still working on your booking. Which room type do you want?",
    };
  }
  if (!knownSlots.numGuests) return { nextCategory: "reservation", finalText: buildAskGuests(pre.lang) };
  if (!isSafeGuestName(knownSlots.guestName || "")) return { nextCategory: "reservation", finalText: buildAskGuestName(pre.lang) };
  return {
    nextCategory: "reservation",
    finalText: buildReservationDomainLockReply(pre, signal, nextSlots),
  };
}

function assessReservationDateCoherence(
  checkIn?: string,
  checkOut?: string,
  maxNights = 90
): { ok: true; nights: number } | { ok: false; reason: "check_order" | "range_too_long" } | null {
  if (!checkIn || !checkOut) return null;
  const ci = /^\d{4}-\d{2}-\d{2}$/.test(checkIn) ? new Date(`${checkIn}T00:00:00Z`) : new Date(checkIn);
  const co = /^\d{4}-\d{2}-\d{2}$/.test(checkOut) ? new Date(`${checkOut}T00:00:00Z`) : new Date(checkOut);
  if (Number.isNaN(ci.getTime()) || Number.isNaN(co.getTime())) return { ok: false, reason: "check_order" };
  const nights = Math.round((co.getTime() - ci.getTime()) / 86400000);
  if (nights <= 0) return { ok: false, reason: "check_order" };
  if (nights > maxNights) return { ok: false, reason: "range_too_long" };
  return { ok: true, nights };
}

function extractRawOrderedDateRange(text: string): { checkIn?: string; checkOut?: string } | null {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const numeric = raw.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s*(?:al|hasta|a|-|→|->|—)\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
  if (numeric) {
    const toIso = (token: string) => {
      const parts = token.split(/[/-]/).map((part) => part.trim());
      if (parts.length !== 3) return undefined;
      const [dd, mm, yyyyRaw] = parts;
      const yyyy = yyyyRaw.length === 2 ? `20${yyyyRaw}` : yyyyRaw;
      return `${yyyy.padStart(4, "0")}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    };
    return { checkIn: toIso(numeric[1]), checkOut: toIso(numeric[2]) };
  }
  const months: Record<string, number> = {
    enero: 1, ene: 1, january: 1, jan: 1,
    febrero: 2, feb: 2, february: 2,
    marzo: 3, mar: 3, march: 3,
    abril: 4, abr: 4, apr: 4, april: 4,
    mayo: 5, may: 5,
    junio: 6, jun: 6, june: 6,
    julio: 7, jul: 7, july: 7,
    agosto: 8, ago: 8, aug: 8, august: 8,
    septiembre: 9, setiembre: 9, sept: 9, sep: 9, september: 9,
    octubre: 10, oct: 10, october: 10,
    noviembre: 11, nov: 11, november: 11,
    diciembre: 12, dic: 12, dec: 12, december: 12,
  };
  const monthRange = raw
    .toLowerCase()
    .match(/(\d{1,2})\s*(?:de\s+)?([a-záéíóúñ]+)(?:\s+de\s+(\d{4}))?\s*(?:al|hasta|a)\s*(\d{1,2})\s*(?:de\s+)?([a-záéíóúñ]+)?(?:\s+de\s+(\d{4}))?/i);
  if (!monthRange) return null;
  const nowYear = new Date().getFullYear();
  const month1 = months[monthRange[2]];
  const month2 = months[monthRange[5]] || month1;
  if (!month1 || !month2) return null;
  const year1 = monthRange[3] ? parseInt(monthRange[3], 10) : nowYear;
  const year2 = monthRange[6] ? parseInt(monthRange[6], 10) : year1;
  return {
    checkIn: `${String(year1).padStart(4, "0")}-${String(month1).padStart(2, "0")}-${String(parseInt(monthRange[1], 10)).padStart(2, "0")}`,
    checkOut: `${String(year2).padStart(4, "0")}-${String(month2).padStart(2, "0")}-${String(parseInt(monthRange[4], 10)).padStart(2, "0")}`,
  };
}

function buildInvalidReservationDatesReply(lang: "es" | "en" | "pt", reason: "check_order" | "range_too_long" | "invalid_format"): string {
  if (reason === "invalid_format") {
    return lang === "es"
      ? "La fecha ingresada no es válida. ¿Podés corregirla?"
      : lang === "pt"
        ? "A data informada não é válida. Pode corrigi-la?"
        : "That date is not valid. Can you correct it?";
  }
  if (reason === "range_too_long") {
    return lang === "es"
      ? "Las fechas no son válidas para una reserva estándar. La estadía quedó demasiado larga. ¿Querés que las corrijamos?"
      : lang === "pt"
        ? "As datas não são válidas para uma reserva padrão. A estadia ficou longa demais. Quer corrigi-las?"
        : "Those dates are not valid for a standard booking. The stay became too long. Do you want to correct them?";
  }
  return lang === "es"
    ? "Las fechas parecen inconsistentes. El check-out debe ser posterior al check-in. ¿Podés confirmarlas?"
    : lang === "pt"
      ? "As datas parecem inconsistentes. O check-out deve ser posterior ao check-in. Pode confirmá-las?"
      : "Those dates look inconsistent. Check-out must be after check-in. Can you confirm them?";
}

function detectRawReservationDateIssue(text: string): { reason: "check_order" | "range_too_long" | "invalid_format" } | null {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const broadNumericTokens = Array.from(raw.matchAll(/\b(\d{1,4}[/-]\d{1,4}[/-]\d{2,4})\b/g)).map((match) => match[1]);
  if (!broadNumericTokens.length) return null;

  const strictNumericTokens: string[] = [];
  for (const token of broadNumericTokens) {
    if (!/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(token)) {
      return { reason: "invalid_format" };
    }
    const iso = ddmmyyyyToISO(token);
    if (!iso) return { reason: "invalid_format" };
    strictNumericTokens.push(iso);
  }

  if (strictNumericTokens.length >= 2) {
    const rawCoherence = assessReservationDateCoherence(strictNumericTokens[0], strictNumericTokens[1]);
    if (rawCoherence && !rawCoherence.ok) return { reason: rawCoherence.reason };
  }

  return null;
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
  const turnText = String(msg.content || "");
  const turnSlots = extractSlotsFromText(turnText, lang);
  const shortGuestCount = turnText.match(/^\s*(\d{1,2})\s*$/);
  if (
    !turnSlots.numGuests &&
    shortGuestCount?.[1] &&
    (st?.activeFlow === "reservation" || st?.desiredAction === "create" || prevCategory === "reservation") &&
    prevSlotsStrict?.roomType &&
    prevSlotsStrict?.checkIn &&
    prevSlotsStrict?.checkOut &&
    !prevSlotsStrict?.numGuests
  ) {
    turnSlots.numGuests = String(parseInt(shortGuestCount[1], 10));
  }
  // fusionamos: lo nuevo del turno tiene prioridad (si el usuario corrigió algo)
  const currSlots = mergeReservationSlots(prevSlotsStrict, turnSlots);
  console.log('[DEBUG-numGuests] currSlots:', JSON.stringify(currSlots));

  // Estado compacto para playbook
  const draftExists = !!currSlots.guestName || !!currSlots.roomType || !!currSlots.checkIn || !!currSlots.checkOut || !!currSlots.numGuests;
  // Detecta si hay reserva confirmada en el contexto (usando salesStage === 'close')
  const hasConfirmed = !!(st?.reservationSlots && st?.salesStage === "close");
  // confirmedBooking solo acepta { code?: string }
  const confirmedBooking = hasConfirmed ? { code: "-" } : null;
  const stateForPlaybook: ConversationState = { draft: draftExists ? { ...currSlots } : null, confirmedBooking, locale: lang };
  const intent = detectIntent(String(msg.content || ""), stateForPlaybook);
  const hotelConfig = await getHotelConfig(msg.hotelId).catch(() => null);

  // --- NUEVO: modo modificación persistente reforzado ---
  const normalizedReservationIntent = normalizeReservationIntent(String(msg.content || ""));
  const prevWasModify = st?.lastCategory === "modify_reservation" || st?.lastCategory === "modify";
  const mentionsModify = normalizedReservationIntent.kind === "modify";
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
  // DEBUG: trazas de detección nearby en preLLM
  const rawContent = String(msg.content || "");
  if (process.env.DEBUG_NEARBY_POINTS === "1") {
    console.warn("[nearby_points] preLLM check", { content: rawContent, looksNearby: looksNearbyPoints(rawContent), nearbyPK: pickNearbyPromptKey(rawContent) });
  }
  // Si parece consulta de puntos cercanos, forzar promptKey (web -> carrusel)
  const nearbyPK = pickNearbyPromptKey(rawContent);
  if (promptKey === "default" && nearbyPK) {
    const pref = (hotelConfig as any)?.nearbyPointsMode;
    if (pref === "text") {
      promptKey = "nearby_points";
    } else if (pref === "always" || pref === "carousel") {
      promptKey = "nearby_points_img";
    } else {
      // auto/undefined: usa imágenes solo si el mensaje las pide
      promptKey = wantsNearbyImages(rawContent) ? "nearby_points_img" : "nearby_points";
    }
    if (process.env.DEBUG_NEARBY_POINTS === "1") {
      console.warn("[nearby_points] preLLM override", { promptKey, channel: msg.channel, pref, hotelId: msg.hotelId });
    }
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

function shouldClearSelectedReservationTargetForCategory(
  nextCategory: string | null | undefined,
  promptKeyUsed: string | null | undefined
): boolean {
  if (!nextCategory && !promptKeyUsed) return false;
  if (nextCategory === "amenities" || nextCategory === "amenities_info") return true;
  if (nextCategory === "billing" || nextCategory === "support") return true;
  if (nextCategory === "retrieval_based" || nextCategory === "out_of_scope") return true;
  if (
    [
      "amenities_list",
      "pool_gym_spa",
      "breakfast_bar",
      "parking",
      "payments_and_billing",
      "invoice_receipts",
      "contact_support",
    ].includes(promptKeyUsed || "")
  ) {
    return true;
  }
  return false;
}
function looksLikeEventsQuery(text: string): boolean {
  const t = String(text || "").toLowerCase();
  return /\b(evento|eventos|agenda|calendario|festival|festivales|concierto|conciertos|recital|recitales|feria|ferias|show|shows|teatro|exposicion|exposición|exposiciones|carnaval)\b/.test(t);
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

type BodyLLMState = {
  finalText: string;
  nextCategory: string | null;
  nextSlots: ReservationSlotsStrict;
  needsSupervision: boolean;
  graphResult: any;
  explicitRich?: RichPayload;
};

function initBodyLLMState(pre: PreLLMResult): BodyLLMState {
  return {
    finalText: "",
    nextCategory: pre.prevCategory,
    nextSlots: pre.currSlots,
    needsSupervision: false,
    graphResult: null,
    explicitRich: undefined,
  };
}

function toBodyLLMResult(state: BodyLLMState) {
  return {
    finalText: state.finalText,
    nextCategory: state.nextCategory,
    nextSlots: state.nextSlots,
    needsSupervision: state.needsSupervision,
    graphResult: state.graphResult,
    rich: state.explicitRich,
  };
}

function tryBodyLLMTestGreetingFastpath(pre: PreLLMResult, state: BodyLLMState): boolean {
  const tLowerBody = String(pre.msg.content || "").toLowerCase();
  const looksGreetingBody = /^(hola|buenas|hello|hi|hey|ol[aá]|oi)\b/.test(tLowerBody);
  if (!(ENABLE_TEST_FASTPATH && looksGreetingBody && !pre.inModifyMode)) return false;
  state.finalText = ruleBasedFallback(pre.lang, String(pre.msg.content || ""));
  state.nextCategory = "retrieval_based";
  emitRoutingDecision(pre.msg, {
    decision_layer: "bodyLLM",
    route_source: "test_greeting_fastpath",
    route_match: "ENABLE_TEST_FASTPATH:greeting",
    early_return: true,
    used_llm_classifier: false,
    classifier_source: "heuristic",
    final_category: state.nextCategory,
    final_prompt_key: null,
  });
  return true;
}

async function tryBodyLLMKnowledgeShortcuts(pre: PreLLMResult, state: BodyLLMState): Promise<boolean> {
  const kbUserText = String(pre.msg.content || "");
  const kbLower = kbUserText.toLowerCase();
  const reservationDomainLock = getReservationDomainLockSignal(pre, kbUserText);
  const isRoomTypeFollowup = isRoomTypeFollowupInReservation(pre.lcHistory, kbUserText, pre.lang);
  const isGuestsFollowup = isGuestsFollowupInReservation(pre.lcHistory, kbUserText, pre.lang);
  const isGuestNameFollowup = isGuestNameFollowupInReservation(pre.lcHistory, kbUserText);
  const isAvailabilityVerifyAffirmative =
    askedToVerifyAvailability(pre.lcHistory, pre.lang) &&
    isPureAffirmative(kbUserText, pre.lang);
  const isReservationConfirmFollowup =
    askedToConfirmReservation(pre.lcHistory) &&
    (isPureConfirm(kbUserText) || isPureAffirmative(kbUserText, pre.lang));
  const hasReservationContext =
    pre.inModifyMode ||
    isRoomTypeFollowup ||
    isGuestsFollowup ||
    isGuestNameFollowup ||
    isAvailabilityVerifyAffirmative ||
    isReservationConfirmFollowup ||
    reservationDomainLock.compatible ||
    isReservationFlowStillActive(pre) ||
    !!pre.stateForPlaybook?.draft ||
    !!pre.stateForPlaybook?.confirmedBooking;
  const wantsNearby = Boolean(pickNearbyPromptKey(kbUserText));
  const looksEventIntent = (() => {
    const hay = kbUserText.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    const keys = [
      "evento", "eventos", "agenda", "que hay", "que hacer", "hoy", "manana", "esta noche",
      "fin de semana", "este fin de semana", "este mes", "mes", "mensual",
      "evento turistico", "eventos turisticos",
      "event", "events", "tourist event", "tourist events", "today", "tomorrow", "tonight",
      "weekend", "this weekend", "this month", "month", "monthly",
      "hoje", "amanha", "esta noite", "fim de semana", "este fim de semana", "este mes", "mes", "mensal",
    ];
    return keys.some((k) => hay.includes(k));
  })();
  const hasEventMemory = pre.st?.lastIntentGroup === "events";
  const isShortFollowup = kbUserText.trim().length <= 40;
  const startsWithFollowup = /^\s*(¿?\s+y\b|and\b|e\b)\b/i.test(kbUserText);
  const hasPhotoSignal = /\b(foto|fotos|imagen|imagenes|imágenes|photos|pics)\b/i.test(kbUserText);
  const skipKbFastpath = hasEventMemory && (isShortFollowup || startsWithFollowup || hasPhotoSignal);
  const looksBillingByRule = RE_BILLING.test(kbLower);
  const looksInvoiceDetail = /\b(comprobante|comprobantes|factura|facturas|recibo|recibos|invoice|invoices|billing)\b/i.test(kbLower);
  const looksTransactionalPricing = looksTransactionalPricingIntent(kbUserText);

  debugLog("[KB] fastpath check", {
    hasReservationContext,
    wantsNearby,
    isRoomTypeFollowup,
    isGuestsFollowup,
    isAvailabilityVerifyAffirmative,
  });
  if (wantsNearby) debugLog("[KB] skip fast-path for nearby_points_img", { text: kbUserText });

  if (looksBillingByRule) {
    let forcedBillingResolved = false;
    try {
      const forcedPromptKey = looksInvoiceDetail ? "invoice_receipts" : "payments_and_billing";
      const kbForced = await answerWithKnowledge({
        question: kbUserText,
        hotelId: pre.msg.hotelId,
        desiredLang: pre.lang,
        override: { category: "billing", promptKey: forcedPromptKey },
      });
      const forcedText = kbForced.answer?.trim();
      if (kbForced.ok && forcedText) {
        state.finalText = forcedText;
        state.finalText = await harmonizeBillingCurrencyAnswer(state.finalText, kbUserText, pre.msg.hotelId, pre.lang);
        state.finalText = stripOffTopicBillingTail(state.finalText, pre.lang);
        state.finalText = ensureBillingContextualFollowup(state.finalText, pre.lang);
        state.finalText = stripGlobalTailNoise(state.finalText);
        if (/(actividad|actividades|zona|lugares para visitar|restaurants? cercanos|atracciones)/i.test(state.finalText)) {
          state.finalText = await buildDeterministicBillingReply(pre.msg.hotelId, pre.lang, kbUserText);
        }
        state.nextCategory = "billing";
        state.nextSlots = pre.currSlots;
        state.graphResult = {
          ...(kbForced.debug || {}),
          category: "billing",
          promptKey: forcedPromptKey,
          source: "knowledgeBaseAgent_forced_billing",
          contentTitle: kbForced.contentTitle,
          contentBody: kbForced.contentBody,
          retrieved: kbForced.retrieved,
        };
        forcedBillingResolved = true;
        emitRoutingDecision(pre.msg, {
          decision_layer: "bodyLLM",
          route_source: "knowledgeBaseAgent_forced_billing",
          route_match: forcedPromptKey,
          early_return: true,
          used_llm_classifier: false,
          classifier_source: "heuristic",
          final_category: state.nextCategory,
          final_prompt_key: forcedPromptKey,
        });
        return true;
      }
    } catch (e) {
      console.warn("[KB] forced billing fastpath error, sigo flujo normal:", (e as any)?.message || e);
    }
    if (!forcedBillingResolved) {
      state.finalText = await buildDeterministicBillingReply(pre.msg.hotelId, pre.lang, kbUserText);
      state.nextCategory = "billing";
      state.nextSlots = pre.currSlots;
      state.graphResult = {
        ...(state.graphResult || {}),
        category: "billing",
        promptKey: "payments_and_billing",
        source: "deterministic_billing_fallback",
      };
      emitRoutingDecision(pre.msg, {
        decision_layer: "bodyLLM",
        route_source: "deterministic_billing_fallback",
        route_match: "RE_BILLING",
        early_return: true,
        used_llm_classifier: false,
        classifier_source: "fallback",
        final_category: state.nextCategory,
        final_prompt_key: "payments_and_billing",
      });
      return true;
    }
  }

  if (!hasReservationContext && !wantsNearby && !looksEventIntent && !looksTransactionalPricing) {
    if (skipKbFastpath) {
      debugLog("[KB] skip fast-path for events followup", { text: kbUserText });
    } else {
      try {
        const kb = await answerWithKnowledge({
          question: kbUserText,
          hotelId: pre.msg.hotelId,
          desiredLang: pre.lang,
        });
        const cat = kb.category;
        const safeCat = isSafeAutosendCategory(cat);
        const text = kb.answer?.trim();
        if (kb.ok && safeCat && text) {
          debugLog("[KB] fastpath return", { ok: kb.ok, safeCat, hasText: Boolean(text) });
          state.finalText = text;
          state.nextCategory = cat || "retrieval_based";
          state.nextSlots = pre.currSlots;
          state.graphResult = {
            ...(kb.debug || {}),
            category: cat,
            promptKey: kb.promptKey || null,
            source: "knowledgeBaseAgent",
            contentTitle: kb.contentTitle,
            contentBody: kb.contentBody,
            retrieved: kb.retrieved,
          };
          emitRoutingDecision(pre.msg, {
            decision_layer: "bodyLLM",
            route_source: "knowledgeBaseAgent",
            route_match: "safe_kb_fastpath",
            early_return: true,
            used_llm_classifier: false,
            classifier_source: "heuristic",
            final_category: state.nextCategory,
            final_prompt_key: kb.promptKey || null,
          });
          return true;
        }
      } catch (e) {
        console.warn("[KB] answerWithKnowledge error, sigo con agentGraph:", (e as any)?.message || e);
      }
    }
  }

  return false;
}

async function runBodyLLMGraphPath(pre: PreLLMResult, state: BodyLLMState): Promise<any[]> {
  const systemInstruction = pre.systemInstruction + "\n" + buildStateSummary(pre.currSlots, pre.st);
  debugLog("[bodyLLM] systemInstruction", systemInstruction);

  const lcMessages = [
    new SystemMessage(systemInstruction),
    ...pre.lcHistory,
    new HumanMessage(String(pre.msg.content || "")),
  ];

  state.graphResult = await withTimeout(
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

  debugLog("[bodyLLM] graphResult", state.graphResult);
  const last = (state.graphResult as any)?.messages?.at?.(-1);
  const lastText = extractTextFromLCContent(last?.content);
  const lastAiText = extractLastAIText((state.graphResult as any)?.messages);
  state.finalText = ((lastAiText || lastText) || "").trim();
  state.nextCategory = (state.graphResult as any).category ?? pre.prevCategory ?? null;
  debugLog("[messageHandler] resolved category", {
    nextCategory: state.nextCategory,
    promptKey: (state.graphResult as any)?.classified?.promptKey,
    category: (state.graphResult as any)?.category,
    userQuery: String(pre.msg.content || ""),
  });
  emitRoutingDecision(pre.msg, {
    decision_layer: "graph",
    route_source: String((state.graphResult as any)?.meta?.debug?.route_source || "graph_path"),
    route_match: String((state.graphResult as any)?.meta?.debug?.route_match || "agentGraph.invoke"),
    early_return: false,
    used_llm_classifier:
      String((state.graphResult as any)?.meta?.debug?.route_source || "").includes("llm_classifier") ||
      String((state.graphResult as any)?.meta?.debug?.route_source || "").includes("forced_llm_classifier") ||
      (state.graphResult as any)?.intentSource === "llm",
    classifier_source: deriveClassifierSource(state.graphResult),
    final_category: state.nextCategory,
    final_prompt_key:
      (state.graphResult as any)?.promptKey ||
      (state.graphResult as any)?.classified?.promptKey ||
      null,
  });

  const merged = mergeReservationSlots(pre.currSlots, (state.graphResult as any).reservationSlots);
  if (typeof merged.numGuests !== "undefined" && typeof merged.numGuests !== "string") {
    merged.numGuests = String((merged as any).numGuests);
  }
  state.nextSlots = merged;

  try {
    const resolved = (state.graphResult as any)?.resolved;
    const classified = (state.graphResult as any)?.classified;
    const noContent = resolved?.debug?.reason === "no-content";
    const pk = classified?.promptKey;
    const isNearby = pk === "nearby_points" || pk === "nearby_points_img";
    debugLog("[nearby_points] fallback check", {
      reason: resolved?.debug?.reason,
      promptKey: pk,
      noContent,
      isNearby,
    });
    if (noContent && isNearby) {
      debugLog("[nearby_points] fallback enter", { promptKey: pk });
      debugLog("[nearby_points] forcing retrievalBased fallback", { promptKey: pk });
      const rbState = await retrievalBased({
        hotelId: pre.msg.hotelId,
        conversationId: pre.conversationId,
        normalizedMessage: String(pre.msg.content || ""),
        retrievalLang: pre.lang,
        originalLang: pre.lang,
        messages: lcMessages,
        promptKey: pk,
        category: classified?.category || "retrieval_based",
      });
      const rbLast = (rbState as any)?.messages?.at?.(-1);
      const rbText = extractTextFromLCContent(rbLast?.content);
      const rbRich = (rbState as any)?.meta?.rich as RichPayload | undefined;
      if (rbRich) state.explicitRich = rbRich;
      if (rbText) {
        state.finalText = rbText.trim();
        state.graphResult = {
          ...(state.graphResult || {}),
          meta: { ...(state.graphResult as any)?.meta, ...(rbState?.meta || {}) },
        };
      }
    }
  } catch (e) {
    console.warn("[nearby_points] retrievalBased fallback error:", (e as any)?.message || e);
  }

  return lcMessages;
}

async function tryBodyLLMStructuredEnrichment(pre: PreLLMResult, state: BodyLLMState): Promise<void> {
  if (!CONFIG.STRUCTURED_ENABLED) return;
  const structured = await tryStructuredAnalyze({
    hotelId: pre.msg.hotelId,
    lang: pre.lang,
    channel: pre.msg.channel,
    userQuery: String(pre.msg.content || ""),
  });
  debugLog("[bodyLLM] structured", structured);
  if (!structured) return;
  const s = structured.entities || {};
  state.nextSlots = mergeReservationSlots(state.nextSlots, {
    checkIn: state.nextSlots.checkIn || s.checkin_date || undefined,
    checkOut: state.nextSlots.checkOut || s.checkout_date || undefined,
    roomType: state.nextSlots.roomType || s.room_type || undefined,
    numGuests: state.nextSlots.numGuests || (typeof s.guests === "number" ? String(s.guests) : undefined),
  });
  const structuredCat = structured.intent ? mapStructuredIntentToCategory(structured.intent) : undefined;
  const candidateCat = state.graphResult?.category || structuredCat;
  const safeCat = isSafeAutosendCategory(candidateCat);
  const hasRichPayload = Boolean(state.explicitRich ?? (state.graphResult as any)?.meta?.rich);
  if (structured.handoff === true && !safeCat) {
    state.needsSupervision = true;
  }
  if (!state.finalText && structured.answer && !hasRichPayload) {
    if ((pre as any).__orchestratorActive) {
      state.graphResult = state.graphResult || {};
      (state.graphResult as any).structuredFallback = structured;
    } else if (structured.handoff === true && pre.inModifyMode) {
      state.finalText = buildModifyGuidance(pre.lang, state.nextSlots);
    } else {
      state.finalText = structured.answer;
    }
  }
  if (!state.nextCategory && structured.intent) {
    state.nextCategory = mapStructuredIntentToCategory(structured.intent);
  }
}

async function tryBodyLLMStructuredFallback(pre: PreLLMResult, state: BodyLLMState): Promise<void> {
  if (!CONFIG.STRUCTURED_ENABLED) return;
  const structured = await tryStructuredAnalyze({
    hotelId: pre.msg.hotelId,
    lang: pre.lang,
    channel: pre.msg.channel,
    userQuery: String(pre.msg.content || ""),
  });
  debugLog("[bodyLLM] structured fallback", structured);
  if (!structured?.answer) return;
  if ((pre as any).__orchestratorActive) {
    state.graphResult = state.graphResult || {};
    (state.graphResult as any).structuredFallback = structured;
    return;
  }
  if (structured.handoff === true && pre.inModifyMode) {
    state.finalText = buildModifyGuidance(pre.lang, pre.currSlots);
  } else {
    state.finalText = structured.answer;
  }
  state.nextCategory = mapStructuredIntentToCategory(structured.intent || "general_question");
  const s = structured.entities || {};
  state.nextSlots = mergeReservationSlots(pre.currSlots, {
    checkIn: pre.currSlots.checkIn || s.checkin_date || undefined,
    checkOut: pre.currSlots.checkOut || s.checkout_date || undefined,
    roomType: pre.currSlots.roomType || s.room_type || undefined,
    numGuests: pre.currSlots.numGuests || (typeof s.guests === "number" ? String(s.guests) : undefined),
  });
  if (structured.handoff === true) state.needsSupervision = true;
}

// ===== Agent: Orchestrator/Planner (bodyLLM + agentGraph) =====
async function bodyLLM(pre: PreLLMResult): Promise<any> {
  debugLog("[bodyLLM] IN", { pre });
  const state = initBodyLLMState(pre);
  let finalText = state.finalText;
  let nextCategory = state.nextCategory;
  let nextSlots = state.nextSlots;
  let needsSupervision = state.needsSupervision;
  let graphResult = state.graphResult;
  let explicitRich = state.explicitRich;
  const isEventLikeMessage = looksLikeEventsQuery(String(pre.msg.content || ""));
  const guestState = resolveGuestState(pre.st);
  const rawTurnText = String(pre.msg.content || "");
  const dominantTurnDomain = detectDominantTurnDomain(rawTurnText, pre.lang);
  const stableIntent = await runStableIntentsGuard({
    rawQuery: rawTurnText,
    hotelId: pre.msg.hotelId,
    preferredLanguage: pre.lang,
    conversationId: pre.conversationId,
    guestState,
  });
  emitStableIntentRouting(pre.msg, {
    routing_stage: "stable_intents_guard",
    routing_decision: stableIntent.routingDecision,
    matched: stableIntent.matched,
    matched_intent: stableIntent.detectedIntentKey ?? null,
    hotel_policy_applied: stableIntent.hotelPolicyApplied,
    policy_enabled: typeof stableIntent.policyEnabled === "boolean" ? stableIntent.policyEnabled : null,
    policy_source: stableIntent.policySource ?? null,
    response_source: stableIntent.responseSource ?? null,
  });
  const shouldSuppressStableIntent =
    stableIntent.matched &&
    dominantTurnDomain.hasMultiple &&
    (dominantTurnDomain.dominant === "reservation" || dominantTurnDomain.dominant === "pricing");
  if (stableIntent.matched && stableIntent.response && !shouldSuppressStableIntent) {
    finalText = stableIntent.response;
    nextCategory =
      stableIntent.intentKey === "faq_check_out_time"
        ? "checkout_info"
        : stableIntent.intentKey === "faq_check_in_time"
          ? "checkin_info"
          : "amenities_info";
    const stableFocus = getConversationFocus(pre.st);
    const stableTurnSlots = extractSlotsFromText(rawTurnText, pre.lang);
    const stableTurnHasReservationData = Boolean(
      stableTurnSlots.checkIn ||
      stableTurnSlots.checkOut ||
      stableTurnSlots.roomType ||
      stableTurnSlots.numGuests ||
      looksLikeName(rawTurnText) ||
      extractRawOrderedDateRange(rawTurnText)?.checkIn
    );
    const stableLockSignal = getReservationDomainLockSignal(pre, rawTurnText);
    const shouldBlockContinuation =
      stableLockSignal.active &&
      !stableLockSignal.compatible &&
      (dominantTurnDomain.dominant === "faq" || dominantTurnDomain.dominant === "policies");
    if (
      !shouldBlockContinuation &&
      shouldAppendFocusContinuation(pre, stableFocus, {
        isLateralTurn: nextCategory === "amenities_info" || nextCategory === "checkin_info" || nextCategory === "checkout_info",
        turnHasReservationData: stableTurnHasReservationData,
      })
    ) {
      const continuation = buildFocusContinuationPrompt(pre, stableFocus, nextSlots);
      if (continuation) finalText = `${String(finalText || "").trim()} ${continuation}`.trim();
    }
    if (shouldClearSelectedReservationTargetForCategory(nextCategory, null)) {
      await updateConversationState(pre.msg.hotelId, pre.conversationId, {
        selectedReservationTarget: null,
        updatedBy: "ai",
      } as any);
    }
    debugLog("[stable-intents-guard] matched", {
      conversationId: pre.conversationId,
      intentKey: stableIntent.intentKey,
      normalizedQuery: stableIntent.normalizedQuery,
    });
    emitRoutingDecision(pre.msg, {
      decision_layer: "stable_intents_guard",
      route_source: "stable_intents_guard",
      route_match: stableIntent.intentKey ?? null,
      early_return: true,
      used_llm_classifier: false,
      classifier_source: "heuristic",
      final_category: nextCategory,
      final_prompt_key: null,
    });
    return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null };
  }
  const earlyCheckinShortcutQ = detectEarlyCheckinQuestion(rawTurnText, pre.lang);
  if (
    earlyCheckinShortcutQ &&
    !(
      dominantTurnDomain.hasMultiple &&
      (dominantTurnDomain.dominant === "reservation" || dominantTurnDomain.dominant === "pricing")
    )
  ) {
    const hotel = await getHotelConfig(pre.msg.hotelId).catch(() => null);
    const { checkIn: confCheckIn } = getConfiguredCheckTimes(hotel);
    finalText = buildEarlyCheckinResponse(pre.lang, guestState, {
      checkInTime: confCheckIn,
      asksLuggage: /\b(valijas?|equipaje|luggage|bags?|bagagem|malas?)\b/i.test(rawTurnText),
    });
    nextCategory = "checkin_info";
    emitRoutingDecision(pre.msg, {
      decision_layer: "early_checkin_heuristic",
      route_source: "early_checkin_heuristic",
      route_match: "early_checkin",
      early_return: true,
      used_llm_classifier: false,
      classifier_source: "heuristic",
      final_category: nextCategory,
      final_prompt_key: null,
    });
    return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null };
  }
  const rawCreateDateIssue = detectRawReservationDateIssue(String(pre.msg.content || ""));
  if (rawCreateDateIssue) {
    const rawCreateText = String(pre.msg.content || "");
    const rawCreateIntent = normalizeReservationIntent(rawCreateText);
    const rawCreateSubFlow = resolveReservationFastPathSubFlow(pre, rawCreateText);
    const isNonReservationFollowup =
      pre.prevCategory === "send_email_copy" ||
      pre.prevCategory === "send_whatsapp_copy";
    const hasExplicitCreateContext =
      /\b(reserv(ar|a|o)?|book(?:ing)?)\b/i.test(rawCreateText) ||
      pre.st?.desiredAction === "create" ||
      pre.st?.activeFlow === "reservation" ||
      pre.prevCategory === "reservation" ||
      getConversationFocus(pre.st)?.subFlow === "create";
    if (!isNonReservationFollowup && rawCreateSubFlow === "create" && rawCreateIntent.kind !== "modify" && rawCreateIntent.kind !== "cancel" && hasExplicitCreateContext) {
      return {
        finalText: buildInvalidReservationDatesReply(pre.lang, rawCreateDateIssue.reason),
        nextCategory: "reservation",
        nextSlots,
        needsSupervision,
        graphResult: null,
      };
    }
  }
  if (dominantTurnDomain.dominant === "pricing" && !dominantTurnDomain.hasReservation) {
    const pricingSlots = mergeReservationSlots(pre.st?.reservationSlots, pre.currSlots, extractSlotsFromText(rawTurnText, pre.lang));
    return {
      finalText: buildPricingClarificationReply(pre.lang, pricingSlots),
      nextCategory: "retrieval_based",
      nextSlots,
      needsSupervision,
      graphResult: null,
    };
  }
  // Fast-path 0: if the user provides an explicit full date range in the same message, confirm immediately
  try {
    const userTxt0 = String(pre.msg.content || "");
    const dr0 = extractDateRangeFromText(userTxt0);
    if (dr0.checkIn && dr0.checkOut && !isEventLikeMessage) {
      const fastPathSubFlow = resolveReservationFastPathSubFlow(pre, userTxt0);
      const rawDr0 = extractRawOrderedDateRange(userTxt0);
      const dr0Coherence =
        assessReservationDateCoherence(rawDr0?.checkIn, rawDr0?.checkOut) ||
        assessReservationDateCoherence(dr0.checkIn, dr0.checkOut);
      if (dr0Coherence && !dr0Coherence.ok) {
        finalText = buildInvalidReservationDatesReply(pre.lang, dr0Coherence.reason);
        nextCategory = fastPathSubFlow === "modify" ? "modify_reservation" : "reservation";
        return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null };
      }
      const fastPathTurnSlots = toStrictSlots(extractSlotsFromText(userTxt0, pre.lang));
      const fastPathSlots = mergeReservationSlots(pre.st?.reservationSlots, nextSlots, fastPathTurnSlots, {
        checkIn: dr0.checkIn,
        checkOut: dr0.checkOut,
      });
      nextSlots = { ...fastPathSlots } as ReservationSlotsStrict;
      if (fastPathSubFlow === "create") {
        const createDraftConsistency = validateCreateDraftConsistency(pre.lang, fastPathSlots);
        if (!createDraftConsistency.valid) {
          await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);
          return {
            finalText: createDraftConsistency.message,
            nextCategory: "reservation",
            nextSlots: { ...createDraftConsistency.sanitizedSlots },
            needsSupervision,
            graphResult: null,
          };
        }
        const missingField = getNextCreateFlowMissingField(fastPathSlots);
        if (missingField) {
          await persistCreateDraft(pre, fastPathSlots);
          return {
            finalText: buildCreateFlowPrompt(pre.lang, missingField),
            nextCategory: "reservation",
            nextSlots,
            needsSupervision,
            graphResult: null,
          };
        }
      }
      const ciTxt = isoToDDMMYYYY(dr0.checkIn) || dr0.checkIn;
      const coTxt = isoToDDMMYYYY(dr0.checkOut) || dr0.checkOut;
      finalText = pre.lang === 'es'
        ? `Anoté nuevas fechas: ${ciTxt} → ${coTxt}. ¿Deseás que verifique disponibilidad y posibles diferencias?`
        : pre.lang === 'pt'
          ? `Anotei as novas datas: ${ciTxt} → ${coTxt}. Deseja que eu verifique a disponibilidade e possíveis diferenças?`
          : `Noted the new dates: ${ciTxt} → ${coTxt}. Do you want me to check availability and any differences?`;
      if (fastPathSubFlow === "modify") {
        await updateConversationState(pre.msg.hotelId, pre.conversationId, {
          modifyState: buildModifyState("dates"),
          conversationFocus: buildConversationFocus("modify"),
          activeFlow: "modify_reservation",
          desiredAction: "modify",
          lastCategory: "modify_reservation",
          updatedBy: "ai",
        } as any);
      }
      return {
        finalText,
        nextCategory: fastPathSubFlow === "modify" ? "modify_reservation" : "reservation",
        nextSlots,
        needsSupervision,
        graphResult: null,
      };
    }
  } catch { /* noop */ }
  // Fast-path: si el usuario aporta UNA sola fecha (check-in o check-out) en modo modificación o contexto de reserva,
  // pedimos la fecha faltante inmediatamente sin invocar el grafo pesado.
  try {
    const userTxtFast = String(pre.msg.content || "");
    const drFast = extractDateRangeFromText(userTxtFast);
    const hasOneDateOnly = (drFast.checkIn && !drFast.checkOut) || (!drFast.checkIn && drFast.checkOut);
    const hasContext = !isEventLikeMessage && (pre.inModifyMode || pre.st?.salesStage === "close" || !!pre.st?.reservationSlots);
    if (hasOneDateOnly && hasContext) {
      const isConfirmedBooking = pre.st?.salesStage === "close";
      if (drFast.checkIn && !isConfirmedBooking && isPastReservationCheckInISO(drFast.checkIn)) {
        finalText = buildPastReservationCheckInPrompt(pre.lang, drFast.checkIn);
        const { checkIn: _dropInvalidCheckIn, ...restNextSlots } = nextSlots;
        nextSlots = restNextSlots as ReservationSlotsStrict;
        return { finalText, nextCategory: pre.inModifyMode ? "modify_reservation" : (pre.prevCategory ?? null), nextSlots, needsSupervision, graphResult: null };
      }
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
        const fastPathSubFlow = resolveReservationFastPathSubFlow(pre, userTxtFast);
        const a = new Date(prevISO);
        const b = new Date(currISO);
        const ciISO = a <= b ? prevISO : currISO;
        const coISO = a <= b ? currISO : prevISO;
        const fastPathTurnSlots = toStrictSlots(extractSlotsFromText(userTxtFast, pre.lang));
        const fastPathSlots = mergeReservationSlots(pre.st?.reservationSlots, nextSlots, fastPathTurnSlots, {
          checkIn: ciISO,
          checkOut: coISO,
        });
        nextSlots = { ...fastPathSlots } as ReservationSlotsStrict;
        if (fastPathSubFlow === "create") {
          const createDraftConsistency = validateCreateDraftConsistency(pre.lang, fastPathSlots);
          if (!createDraftConsistency.valid) {
            await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);
            return {
              finalText: createDraftConsistency.message,
              nextCategory: "reservation",
              nextSlots: { ...createDraftConsistency.sanitizedSlots },
              needsSupervision,
              graphResult: null,
            };
          }
          const missingField = getNextCreateFlowMissingField(fastPathSlots);
          if (missingField) {
            await persistCreateDraft(pre, fastPathSlots);
            return {
              finalText: buildCreateFlowPrompt(pre.lang, missingField),
              nextCategory: "reservation",
              nextSlots,
              needsSupervision,
              graphResult: null,
            };
          }
        }
        const ciTxt = isoToDDMMYYYY(ciISO) || ciISO;
        const coTxt = isoToDDMMYYYY(coISO) || coISO;
        finalText = pre.lang === 'es'
          ? `Anoté nuevas fechas: ${ciTxt} → ${coTxt}. ¿Deseás que verifique disponibilidad y posibles diferencias?`
          : pre.lang === 'pt'
            ? `Anotei as novas datas: ${ciTxt} → ${coTxt}. Deseja que eu verifique a disponibilidade e possíveis diferenças?`
            : `Noted the new dates: ${ciTxt} → ${coTxt}. Do you want me to check availability and any differences?`;
        if (fastPathSubFlow === "modify") {
          await updateConversationState(pre.msg.hotelId, pre.conversationId, {
            modifyState: buildModifyState("dates"),
            conversationFocus: buildConversationFocus("modify"),
            activeFlow: "modify_reservation",
            desiredAction: "modify",
            lastCategory: "modify_reservation",
            updatedBy: "ai",
          } as any);
        }
        return {
          finalText,
          nextCategory: fastPathSubFlow === "modify" ? "modify_reservation" : "reservation",
          nextSlots,
          needsSupervision,
          graphResult: null,
        };
      }
      // No hay fecha previa: pedir la faltante
      const missingSide = drFast.checkIn ? "checkOut" : "checkIn";
      finalText = buildAskMissingDate(pre.lang, missingSide as any);
      if (pre.inModifyMode || pre.prevCategory === "modify_reservation") {
        await updateConversationState(pre.msg.hotelId, pre.conversationId, {
          modifyState: buildModifyState("dates"),
          conversationFocus: buildConversationFocus("modify"),
          activeFlow: "modify_reservation",
          desiredAction: "modify",
          lastCategory: "modify_reservation",
          updatedBy: "ai",
        } as any);
      }
      return { finalText, nextCategory: pre.inModifyMode ? "modify_reservation" : (pre.prevCategory ?? null), nextSlots, needsSupervision, graphResult: null };
    }
  } catch { /* noop fast-path */ }
  // Fast-path 2: contexto de reserva confirmada o intención genérica de modificar → mostrar menú sin invocar grafo
  try {
    const userTxt = String(pre.msg.content || "");
    const tLower = userTxt.toLowerCase();
    const hasAnaphoraReferenceFast = /\besa\b|\bla misma\b|\bel mismo\b/.test(normalizeReferenceText(userTxt));
    const explicitReservationCodeFast = parseReservationCode(userTxt);
    const reservationReferenceFast = resolveReservationReference(pre.st, userTxt);
    const ordinalReservationTargetFast = resolveExplicitOrdinalReservationTarget(pre.st, userTxt);
    const actionableReservationCountFast = buildActionableReservationCandidates(pre.st).length;
    const hasConfirmed = pre.st?.salesStage === "close" || !!pre.st?.reservationSlots;
    const isModifyFollowupContext = pre.prevCategory === "modify_reservation" || pre.prevCategory === "modify";
    const mentionsReservation = /(reserva|booking)/i.test(tLower);
    const looksGreeting = /^(hola|buenas|hello|hi|hey|ol[aá]|oi)\b/i.test(tLower) || /creo que tengo una reserva|tengo una reserva|i think i have a booking|acho que tenho uma reserva/i.test(tLower);
    const genericModify = wantsGenericModify(userTxt, pre.lang);
    const softModifyFollowup = hasConfirmed && isModifyFollowupContext && mentionsReservation && looksGreeting;
    // Evitar menú genérico si el usuario mencionó explícitamente check-in/check-out o fechas
    const sideIntentFast = detectDateSideFromText(userTxt);
    const hasAnyDateTokenFast = /\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/.test(userTxt);
    const mentionsDatesFast = /(fecha|fechas|date|dates|data|datas|check\s*-?in|check\s*-?out|ingres(?:o|ar|amos)|inreso|entrada|llegada|arribo|salida|egreso|retirada|partida|sa[ií]da|departure|arrival)/i.test(tLower);
    const isDateTopicFast = Boolean(sideIntentFast || hasAnyDateTokenFast || mentionsDatesFast);
    const normalizedUserTxtFast = normalizeReferenceText(userTxt);
    const isExplicitFieldChangeFast =
      RE_CHANGE_DATES.test(userTxt) || RE_CHANGE_DATES.test(normalizedUserTxtFast) ||
      RE_CHANGE_ROOM.test(userTxt) || RE_CHANGE_ROOM.test(normalizedUserTxtFast) ||
      RE_CHANGE_GUESTS.test(userTxt) || RE_CHANGE_GUESTS.test(normalizedUserTxtFast);
    if (genericModify && (reservationReferenceFast.status === "ambiguous" || reservationReferenceFast.status === "out_of_range")) {
      finalText = buildReservationReferenceGuardReply(pre.lang, reservationReferenceFast);
      return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult: null };
    }
    const boundReservationTarget =
      reservationReferenceFast.status === "resolved" && reservationReferenceFast.target.kind === "reservation"
        ? reservationReferenceFast.target
        : ordinalReservationTargetFast;
    const canOpenModifyMenu =
      !isDateTopicFast &&
      !isExplicitFieldChangeFast &&
      !(genericModify && actionableReservationCountFast > 1 && reservationReferenceFast.status !== "resolved") &&
      (softModifyFollowup || (genericModify && (hasConfirmed || !!boundReservationTarget)));
    if (canOpenModifyMenu) {
      const knownSlots = {
        ...(pre.st?.reservationSlots || {}),
        ...(nextSlots || {}),
        ...(boundReservationTarget
          ? {
              guestName: boundReservationTarget.guestName,
              roomType: boundReservationTarget.roomType,
              numGuests: boundReservationTarget.numGuests,
              checkIn: boundReservationTarget.checkIn,
              checkOut: boundReservationTarget.checkOut,
            }
          : {}),
      } as ReservationSlotsStrict;
      if (boundReservationTarget?.reservationId) {
        await updateConversationState(pre.msg.hotelId, pre.conversationId, {
          reservationSlots: { ...knownSlots, locale: pre.lang },
          activeReservationContext: buildFocusedReservationContext(boundReservationTarget.reservationId, "confirmed"),
          selectedReservationTarget: buildSelectedReservationTargetFromReference(
            boundReservationTarget.reservationId,
            explicitReservationCodeFast ? "explicit_id" : ordinalReservationTargetFast ? "ordinal" : hasAnaphoraReferenceFast ? "anaphora" : "active_focus",
            explicitReservationCodeFast || ordinalReservationTargetFast ? "strong" : "weak"
          ),
          modifyState: null,
          conversationFocus: buildConversationFocus("modify"),
          activeFlow: "modify_reservation",
          desiredAction: "modify",
          lastCategory: "modify_reservation",
          updatedBy: "ai",
        } as any);
      }
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
  const reservationReference = resolveReservationReference(pre.st, userTxtRaw);
  const explicitOrdinalReservationTarget = resolveExplicitOrdinalReservationTarget(pre.st, userTxtRaw);
  const persistedSelectedReservationTarget = resolveSelectedReservationTarget(pre.st);
  const normalizedReservationIntent = normalizeReservationIntent(userTxtRaw);
  const reservationDomainLock = getReservationDomainLockSignal(pre, userTxtRaw);
  const explicitModifyExit =
    isExplicitModifyExitTurn(userTxtRaw) &&
    (pre.inModifyMode ||
      pre.st?.desiredAction === "modify" ||
      pre.st?.activeFlow === "modify_reservation" ||
      pre.prevCategory === "modify_reservation" ||
      getConversationFocus(pre.st)?.subFlow === "modify");
  const hasModifyVerb = /\b(modific|cambi|alter|mudar|change|edit|update)\w*\b/i.test(normalizeReferenceText(userTxtRaw));
  const snapshotQueryKind = detectReservationSnapshotQuery(userTxtRaw, pre.lang);
  const hasExplicitOrdinalReference = Boolean(extractReservationOrdinalReference(normalizeReferenceText(userTxtRaw)));
  const implicitOrdinalSnapshotFollowup =
    !snapshotQueryKind &&
    normalizedReservationIntent.kind === "other" &&
    hasExplicitOrdinalReference &&
    !(
      pre.inModifyMode ||
      pre.st?.desiredAction === "modify" ||
      pre.prevCategory === "modify_reservation"
    ) &&
    (pre.prevCategory === "reservation_snapshot" || !hasModifyVerb);
  const effectiveSnapshotQueryKind =
    normalizedReservationIntent.kind === "cancel"
      ? null
      : snapshotQueryKind || (implicitOrdinalSnapshotFollowup ? "full" : null);
  const looksNonReservationDomainTurn =
    normalizedReservationIntent.kind === "other" &&
    !effectiveSnapshotQueryKind &&
    !reservationDomainLock.compatible &&
    /\b(wifi|wi-fi|internet|pileta|piscina|pool|spa|gym|gimnasio|parking|estacionamiento|desayuno|breakfast|ayuda|help|soporte|support|factura|invoice|pago|payment)\b/i.test(normalizeReferenceText(userTxtRaw));
  const shouldPreserveReservationSelectionForOverride =
    looksNonReservationDomainTurn &&
    (dominantTurnDomain.dominant === "faq" || dominantTurnDomain.dominant === "policies") &&
    isReservationFlowStillActive(pre);
  if (looksNonReservationDomainTurn && pre.st?.selectedReservationTarget && !shouldPreserveReservationSelectionForOverride) {
    await updateConversationState(pre.msg.hotelId, pre.conversationId, {
      selectedReservationTarget: null,
      modifyState: null,
      updatedBy: "ai",
    } as any);
  }
  const selectedReservationTarget =
    looksNonReservationDomainTurn && !shouldPreserveReservationSelectionForOverride
      ? null
      : persistedSelectedReservationTarget;
  const hasAnaphoraReference = /\besa\b|\bla misma\b|\bel mismo\b/.test(normalizeReferenceText(userTxtRaw));
  const explicitReservationCode = parseReservationCode(userTxtRaw);
  const explicitIdReservationTarget = explicitReservationCode
    ? getReservationReferenceTargetById(pre.st, explicitReservationCode)
    : null;
  const selectedOrActiveReservationTarget =
    selectedReservationTarget ||
    (pre.st?.activeReservationContext?.kind === "reservation"
      ? getReservationReferenceTargetById(pre.st, pre.st.activeReservationContext.reservationId)
      : null);
  const activeModifyField = pre.st?.modifyState?.activeField as ModifyState["activeField"] | undefined;
  const ambiguousReservationAction = getAmbiguousReservationAction(pre, userTxtRaw, {
    reservationReference,
    snapshotQueryKind: effectiveSnapshotQueryKind,
    normalizedReservationIntent,
    hasModifyVerb,
    hasAnaphoraReference,
    explicitIdReservationTarget,
    explicitOrdinalReservationTarget,
    selectedReservationTarget,
  });
  const hasConfirmedBookingContext =
    Boolean(pre.st?.lastReservation?.reservationId) ||
    pre.st?.salesStage === "close";
  const looksExplicitNewReservation =
    /\b(reserv(ar|a|o)?|book(?:ing)?)\b/i.test(userTxtRaw) &&
    normalizedReservationIntent.kind !== "modify" &&
    normalizedReservationIntent.kind !== "cancel";
  if (explicitModifyExit) {
    await updateConversationState(pre.msg.hotelId, pre.conversationId, {
      modifyState: null,
      conversationFocus: null,
      activeFlow: null,
      desiredAction: undefined,
      selectedReservationTarget: null,
      activeReservationContext: null,
      updatedBy: "ai",
    } as any);
    finalText = pre.lang === "es"
      ? "De acuerdo, salgo de la modificación. Si querés, podemos revisar otra consulta."
      : pre.lang === "pt"
        ? "Certo, saio da alteração. Se quiser, podemos revisar outra consulta."
        : "Understood. I am leaving the modification flow. If you want, we can review something else.";
    nextCategory = "retrieval_based";
    return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
  }
  const reservationRoomType = nextSlots.roomType || pre.currSlots.roomType || pre.st?.reservationSlots?.roomType;
  const reservationCheckIn = nextSlots.checkIn || pre.currSlots.checkIn || pre.st?.reservationSlots?.checkIn;
  const reservationCheckOut = nextSlots.checkOut || pre.currSlots.checkOut || pre.st?.reservationSlots?.checkOut;
  const reservationGuests = nextSlots.numGuests || pre.currSlots.numGuests || pre.st?.reservationSlots?.numGuests;
  const rawOrderedDateRange = extractRawOrderedDateRange(userTxtRaw);
  const explicitTurnDateCoherence = assessReservationDateCoherence(rawOrderedDateRange?.checkIn, rawOrderedDateRange?.checkOut);
  const reservationDateCoherence = assessReservationDateCoherence(reservationCheckIn, reservationCheckOut);
  const dateTurnTouched =
    pre.currSlots.checkIn !== pre.prevSlotsStrict?.checkIn ||
    pre.currSlots.checkOut !== pre.prevSlotsStrict?.checkOut ||
    Boolean(extractDateRangeFromText(userTxtRaw).checkIn || extractDateRangeFromText(userTxtRaw).checkOut);
  const hasOperationalReservationFlow =
    looksExplicitNewReservation ||
    pre.inModifyMode ||
    pre.st?.activeFlow === "reservation" ||
    pre.st?.activeFlow === "modify_reservation" ||
    pre.st?.desiredAction === "create" ||
    pre.st?.desiredAction === "modify" ||
    pre.prevCategory === "reservation" ||
    pre.prevCategory === "modify_reservation";
  if (
    explicitTurnDateCoherence &&
    !explicitTurnDateCoherence.ok &&
    hasOperationalReservationFlow
  ) {
    finalText = buildInvalidReservationDatesReply(pre.lang, explicitTurnDateCoherence.reason);
    nextCategory = pre.inModifyMode || pre.st?.desiredAction === "modify" || pre.prevCategory === "modify_reservation"
      ? "modify_reservation"
      : "reservation";
    return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
  }
  if (
    reservationDateCoherence &&
    !reservationDateCoherence.ok &&
    hasOperationalReservationFlow &&
    (dateTurnTouched || isPureConfirm(userTxtRaw) || askedToVerifyAvailability(pre.lcHistory, pre.lang))
  ) {
    finalText = buildInvalidReservationDatesReply(pre.lang, reservationDateCoherence.reason);
    nextCategory = pre.inModifyMode || pre.st?.desiredAction === "modify" || pre.prevCategory === "modify_reservation"
      ? "modify_reservation"
      : "reservation";
    return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
  }
  const trimmedUserText = userTxtRaw.trim();
  if (
    !pre.inModifyMode &&
    !hasConfirmedBookingContext &&
    isSafeGuestName(trimmedUserText) &&
    (pre.st?.activeFlow === "reservation" || pre.st?.desiredAction === "create" || pre.prevCategory === "reservation") &&
    reservationRoomType &&
    reservationCheckIn &&
    reservationCheckOut &&
    reservationGuests &&
    !isSafeGuestName(String(pre.st?.reservationSlots?.guestName || pre.currSlots.guestName || nextSlots.guestName || ""))
  ) {
    nextSlots = { ...nextSlots, guestName: trimmedUserText };
    await updateConversationState(pre.msg.hotelId, pre.conversationId, {
      reservationSlots: {
        ...(pre.st?.reservationSlots || {}),
        roomType: reservationRoomType,
        checkIn: reservationCheckIn,
        checkOut: reservationCheckOut,
        numGuests: String(reservationGuests),
        guestName: trimmedUserText,
        locale: pre.lang,
      },
      conversationFocus: buildConversationFocus("create"),
      activeReservationContext: buildDraftReservationContext("collecting"),
      activeFlow: "reservation",
      desiredAction: "create",
      salesStage: "qualify",
      lastCategory: "reservation",
      updatedBy: "ai",
    } as any);
  }
  const reservationGuestName = nextSlots.guestName || pre.currSlots.guestName || pre.st?.reservationSlots?.guestName;
  if (
    (reservationReference.status === "ambiguous" || reservationReference.status === "out_of_range") &&
    (normalizedReservationIntent.kind === "modify" || normalizedReservationIntent.kind === "cancel")
  ) {
    finalText = buildReservationReferenceGuardReply(pre.lang, reservationReference);
    nextCategory = normalizedReservationIntent.kind === "cancel" ? "cancel_reservation" : "modify_reservation";
    return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
  }
  if (ambiguousReservationAction) {
    finalText = buildAmbiguousReservationSelectionReply(
      pre.lang,
      ambiguousReservationAction,
      buildActionableReservationCandidates(pre.st).length
    );
    nextCategory =
      ambiguousReservationAction === "cancel"
        ? "cancel_reservation"
        : ambiguousReservationAction === "modify"
          ? "modify_reservation"
          : "reservation_snapshot";
    return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
  }
  if (
    effectiveSnapshotQueryKind &&
    (reservationReference.status === "ambiguous" || reservationReference.status === "out_of_range") &&
    !explicitOrdinalReservationTarget
  ) {
    finalText = buildReservationReferenceGuardReply(pre.lang, reservationReference);
    nextCategory = "reservation_snapshot";
    return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
  }
  const resolvedSnapshotTarget =
    effectiveSnapshotQueryKind === "list"
      ? null
      : effectiveSnapshotQueryKind && reservationReference.status === "resolved" && reservationReference.target.kind === "reservation"
      ? reservationReference.target
      : explicitIdReservationTarget || explicitOrdinalReservationTarget || selectedOrActiveReservationTarget;
  const normalizedSnapshotInput = normalizeReferenceText(userTxtRaw);
  const hasActionIntent =
    normalizedReservationIntent.kind === "cancel" ||
    normalizedReservationIntent.kind === "modify" ||
    explicitModifyExit ||
    hasModifyVerb ||
    wantsGenericModify(userTxtRaw, pre.lang);
  const hasTargetCorrectionIntent =
    /^\s*no\b/.test(normalizedSnapshotInput) &&
    (Boolean(extractReservationOrdinalReference(normalizedSnapshotInput)) ||
      /\b(esa|la misma|el mismo)\b/.test(normalizedSnapshotInput));
  if (
    !effectiveSnapshotQueryKind &&
    reservationDomainLock.snapshotFollowup &&
    isReservationFlowStillActive(pre) &&
    normalizedReservationIntent.kind === "other" &&
    !hasActionIntent &&
    !hasExplicitOrdinalReference &&
    !hasTargetCorrectionIntent
  ) {
    const targetId =
      selectedReservationTarget?.reservationId ||
      (pre.st?.activeReservationContext?.kind === "reservation"
        ? pre.st.activeReservationContext.reservationId
        : undefined);
    const target = targetId ? getReservationReferenceTargetById(pre.st, targetId) : null;
    if (targetId && target) {
      finalText = buildReservationSnapshotAnswer(
        "full",
        pre.lang,
        {
          reservationId: target.reservationId,
          guestName: target.guestName,
          roomType: target.roomType,
          numGuests: target.numGuests,
          checkIn: target.checkIn,
          checkOut: target.checkOut,
        } as any,
        targetId,
        target.reservationStatus
      );
      await updateConversationState(pre.msg.hotelId, pre.conversationId, {
        modifyState: null,
        lastCategory: "reservation_snapshot",
        updatedBy: "ai",
      } as any);
      nextCategory = "reservation_snapshot";
      return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
    }
  }
  if (effectiveSnapshotQueryKind === "list") {
    const canonicalReservations = buildCanonicalReservationRecords(pre.st);
    finalText = buildReservationListAnswer(pre.lang, canonicalReservations);
    await updateConversationState(pre.msg.hotelId, pre.conversationId, {
      selectedReservationTarget: null,
      modifyState: null,
      conversationFocus: null,
      activeFlow: null,
      desiredAction: undefined,
      lastCategory: "reservation_snapshot",
      updatedBy: "ai",
    } as any);
    nextCategory = "reservation_snapshot";
    return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
  }
  if (effectiveSnapshotQueryKind && resolvedSnapshotTarget) {
    const target = resolvedSnapshotTarget;
    finalText = buildReservationSnapshotAnswer(effectiveSnapshotQueryKind, pre.lang, {
      reservationId: target.reservationId,
      guestName: target.guestName,
      roomType: target.roomType,
      numGuests: target.numGuests,
      checkIn: target.checkIn,
      checkOut: target.checkOut,
    } as any, target.reservationId, target.reservationStatus);
    await updateConversationState(pre.msg.hotelId, pre.conversationId, {
      activeReservationContext: buildFocusedReservationContext(target.reservationId, "confirmed"),
      selectedReservationTarget: buildSelectedReservationTargetFromReference(
        target.reservationId,
        explicitIdReservationTarget ? "explicit_id" : explicitOrdinalReservationTarget ? "ordinal" : hasAnaphoraReference ? "anaphora" : "active_focus",
        explicitIdReservationTarget || explicitOrdinalReservationTarget ? "strong" : "weak"
      ),
      modifyState: null,
      conversationFocus: null,
      activeFlow: null,
      desiredAction: undefined,
      lastCategory: "reservation_snapshot",
      updatedBy: "ai",
    } as any);
    nextCategory = "reservation_snapshot";
    return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
  }
  const resolvedModifyTarget =
    reservationReference.status === "resolved" && reservationReference.target.kind === "reservation"
      ? reservationReference.target
      : explicitIdReservationTarget || explicitOrdinalReservationTarget || selectedOrActiveReservationTarget || resolveSingleActionableReservationTarget(pre.st);
  const normalizedUserTxtForModify = normalizeReferenceText(userTxtRaw);
  const wantsChangeDates = RE_CHANGE_DATES.test(userTxtRaw) || RE_CHANGE_DATES.test(normalizedUserTxtForModify);
  const wantsChangeRoom = RE_CHANGE_ROOM.test(userTxtRaw) || RE_CHANGE_ROOM.test(normalizedUserTxtForModify);
  const wantsChangeGuests = RE_CHANGE_GUESTS.test(userTxtRaw) || RE_CHANGE_GUESTS.test(normalizedUserTxtForModify);
  const hasExplicitModifyFieldRequest = wantsChangeDates || wantsChangeRoom || wantsChangeGuests;
  if (
    (normalizedReservationIntent.kind === "modify" || wantsGenericModify(userTxtRaw, pre.lang) || hasModifyVerb) &&
    resolvedModifyTarget &&
    !(hasExplicitModifyFieldRequest && (pre.inModifyMode || pre.prevCategory === "modify_reservation"))
  ) {
    const target = resolvedModifyTarget;
    const directModifyTurnSlots = extractSlotsFromText(userTxtRaw, pre.lang);
    const hasImmediateModifyValue =
      Boolean(rawOrderedDateRange?.checkIn && rawOrderedDateRange?.checkOut) ||
      Boolean(directModifyTurnSlots.numGuests) ||
      Boolean(directModifyTurnSlots.roomType);
    await updateConversationState(pre.msg.hotelId, pre.conversationId, {
      reservationSlots: {
        ...(pre.st?.reservationSlots || {}),
        guestName: target.guestName,
        roomType: reservationRoomType || target.roomType,
        numGuests: reservationGuests || target.numGuests,
        checkIn: reservationCheckIn || target.checkIn,
        checkOut: reservationCheckOut || target.checkOut,
        locale: pre.lang,
      },
      activeReservationContext: buildFocusedReservationContext(target.reservationId, "confirmed"),
      selectedReservationTarget: buildSelectedReservationTargetFromReference(
        target.reservationId,
        explicitIdReservationTarget ? "explicit_id" : explicitOrdinalReservationTarget ? "ordinal" : hasAnaphoraReference ? "anaphora" : "active_focus",
        explicitIdReservationTarget || explicitOrdinalReservationTarget ? "strong" : "weak"
      ),
      modifyState: null,
      conversationFocus: buildConversationFocus("modify"),
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
      updatedBy: "ai",
    } as any);
    if (!hasImmediateModifyValue) {
      finalText = buildModifyOptionsMenu(pre.lang, {
        ...(pre.st?.reservationSlots || {}),
        guestName: target.guestName,
        roomType: reservationRoomType || target.roomType,
        numGuests: reservationGuests || target.numGuests,
        checkIn: reservationCheckIn || target.checkIn,
        checkOut: reservationCheckOut || target.checkOut,
      } as ReservationSlotsStrict);
      return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };
    }
  }
  if (
    !snapshotQueryKind &&
    normalizedReservationIntent.kind === "other" &&
    (pre.inModifyMode || pre.prevCategory === "modify_reservation") &&
    (explicitIdReservationTarget || explicitOrdinalReservationTarget || (hasAnaphoraReference ? selectedOrActiveReservationTarget : null))
  ) {
    const target = explicitIdReservationTarget || explicitOrdinalReservationTarget || selectedOrActiveReservationTarget;
    await updateConversationState(pre.msg.hotelId, pre.conversationId, {
      reservationSlots: {
        ...(pre.st?.reservationSlots || {}),
        guestName: target?.guestName,
        roomType: target?.roomType,
        numGuests: target?.numGuests,
        checkIn: target?.checkIn,
        checkOut: target?.checkOut,
        locale: pre.lang,
      },
      activeReservationContext: buildFocusedReservationContext(target?.reservationId, "confirmed"),
      selectedReservationTarget: buildSelectedReservationTargetFromReference(
        target?.reservationId,
        explicitIdReservationTarget ? "explicit_id" : explicitOrdinalReservationTarget ? "ordinal" : "anaphora",
        explicitIdReservationTarget || explicitOrdinalReservationTarget ? "strong" : "weak"
      ),
      modifyState: null,
      conversationFocus: buildConversationFocus("modify"),
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
      updatedBy: "ai",
    } as any);
    finalText = buildModifyOptionsMenu(pre.lang, {
      ...(pre.st?.reservationSlots || {}),
      guestName: target?.guestName,
      roomType: target?.roomType,
      numGuests: target?.numGuests,
      checkIn: target?.checkIn,
      checkOut: target?.checkOut,
    } as ReservationSlotsStrict);
    return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };
  }
  if (
    activeModifyField &&
    (pre.inModifyMode || pre.st?.desiredAction === "modify" || pre.prevCategory === "modify_reservation") &&
    !(normalizedReservationIntent.kind === "cancel" || looksExplicitNewReservation || looksNonReservationDomainTurn)
  ) {
    const baseModifyTarget =
      (resolvedModifyTarget?.kind === "reservation" ? resolvedModifyTarget : null) ||
      (selectedReservationTarget?.kind === "reservation" ? selectedReservationTarget : null) ||
      (pre.st?.activeReservationContext?.kind === "reservation"
        ? getReservationReferenceTargetById(pre.st, pre.st.activeReservationContext.reservationId)
        : null);
    const codeFromModifySubstate =
      explicitReservationCode ||
      (resolvedModifyTarget?.kind === "reservation" ? resolvedModifyTarget.reservationId : undefined) ||
      (pre.st?.activeReservationContext?.kind === "reservation"
        ? pre.st?.activeReservationContext?.reservationId
        : undefined);
    const rawGuestCount = extractSlotsFromText(userTxtRaw, pre.lang).numGuests;
    const trimmedGuestInput = String(userTxtRaw || "").trim();
    const numericGuestCount =
      activeModifyField === "guests" && /^\d{1,2}$/.test(trimmedGuestInput)
        ? trimmedGuestInput
        : undefined;
    const nextGuestCount = rawGuestCount || numericGuestCount || reservationGuests;
    const nextRoomType = nextSlots.roomType || pre.currSlots.roomType || pre.st?.reservationSlots?.roomType;
    const hasExplicitDateRange = Boolean(rawOrderedDateRange?.checkIn && rawOrderedDateRange?.checkOut);
    const baseGuestName = baseModifyTarget?.guestName || pre.st?.reservationSlots?.guestName;
    const baseRoomType = baseModifyTarget?.roomType || nextRoomType;
    const baseGuests = reservationGuests || baseModifyTarget?.numGuests;
    const baseCheckIn = baseModifyTarget?.checkIn || reservationCheckIn;
    const baseCheckOut = baseModifyTarget?.checkOut || reservationCheckOut;
    const nextCheckIn = hasExplicitDateRange ? rawOrderedDateRange?.checkIn : baseCheckIn;
    const nextCheckOut = hasExplicitDateRange ? rawOrderedDateRange?.checkOut : baseCheckOut;
    const hasTurnLevelModifyValue =
      (activeModifyField === "guests" && Boolean(rawGuestCount || numericGuestCount)) ||
      (activeModifyField === "roomType" && Boolean(nextSlots.roomType || pre.currSlots.roomType)) ||
      (activeModifyField === "dates" && hasExplicitDateRange);
    const awaitingModifyAvailabilityVerification =
      activeModifyField === "dates" &&
      Boolean((pre.st as any)?.pendingAvailabilityVerification) &&
      (
        isPureAffirmative(userTxtRaw, pre.lang) ||
        isPureConfirm(userTxtRaw) ||
        isAskAvailabilityStatusQuery(String(pre.msg.content || ""), pre.lang)
      );
    const awaitingModifyQuoteConfirmation =
      isPureConfirm(userTxtRaw) &&
      (
        askedToConfirmReservation(pre.lcHistory) ||
        Boolean(pre.st?.lastProposal) ||
        pre.st?.salesStage === "quote" ||
        pre.st?.conversationStage === "reservation_quoted"
      );
    const awaitingModifyExecutionContinuation =
      awaitingModifyAvailabilityVerification || awaitingModifyQuoteConfirmation;

    if (!hasTurnLevelModifyValue && !awaitingModifyExecutionContinuation) {
      finalText = buildReservationLocalFallbackReply(pre, reservationDomainLock, nextSlots).finalText;
      return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };
    }

    if (activeModifyField === "guests" && nextGuestCount) {
      if (!codeFromModifySubstate) {
        finalText = buildAskReservationCode(pre.lang);
        return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };
      }
      const nextGuestCountNumber = Number.parseInt(String(nextGuestCount), 10);
      const hasValidGuestCount = Number.isFinite(nextGuestCountNumber) && nextGuestCountNumber > 0;
      if (baseRoomType && hasValidGuestCount) {
        const capacity = maxGuestsFor(baseRoomType);
        if (capacity > 0 && nextGuestCountNumber > capacity) {
          await updateConversationState(pre.msg.hotelId, pre.conversationId, {
            reservationSlots: {
              ...(pre.st?.reservationSlots || {}),
              roomType: baseRoomType,
              numGuests: String(nextGuestCountNumber),
              locale: pre.lang,
            },
            modifyState: buildModifyState("roomType"),
            conversationFocus: buildConversationFocus("modify"),
            activeFlow: "modify_reservation",
            desiredAction: "modify",
            lastCategory: "modify_reservation",
            updatedBy: "ai",
          } as any);
          finalText = buildCreateDraftCapacityReply(pre.lang, String(baseRoomType), nextGuestCountNumber);
          return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };
        }
      }
      const { modifyReservation } = await import("@/lib/agents/reservations");
      const snapshot: any = {
        guestName: baseGuestName,
        roomType: baseRoomType,
        numGuests: nextGuestCount,
        checkIn: nextCheckIn,
        checkOut: nextCheckOut,
        locale: pre.lang,
      };
      const mod = await modifyReservation(pre.msg.hotelId, codeFromModifySubstate, snapshot, pre.msg.channel);
      await persistModifyExecutionContext(pre, codeFromModifySubstate, {
        reservationSlots: snapshot,
        modifyState: null,
        lastProposal: null,
        pendingAvailabilityVerification: null,
        salesStage: "close",
        conversationStage: "reservation_confirmed",
        lastReservation: {
          reservationId: codeFromModifySubstate,
          status: mod.ok ? "updated" : "error",
          createdAt: new Date().toISOString(),
          channel: (pre.msg.channel as any) || "web",
          guestName: snapshot.guestName,
          roomType: snapshot.roomType,
          checkIn: snapshot.checkIn,
          checkOut: snapshot.checkOut,
          numGuests: snapshot.numGuests,
        },
        updatedBy: "ai",
      } as any);
      finalText = mod.message;
      nextSlots = { ...nextSlots, numGuests: nextGuestCount } as ReservationSlotsStrict;
      return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };
    }

    if (activeModifyField === "roomType" && nextRoomType && String(nextRoomType) !== String(pre.st?.reservationSlots?.roomType || "")) {
      if (!codeFromModifySubstate) {
        finalText = buildAskReservationCode(pre.lang);
        return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };
      }
      const { modifyReservation } = await import("@/lib/agents/reservations");
      const snapshot: any = {
        guestName: baseGuestName,
        roomType: nextRoomType,
        numGuests: baseGuests,
        checkIn: baseCheckIn,
        checkOut: baseCheckOut,
        locale: pre.lang,
      };
      const mod = await modifyReservation(pre.msg.hotelId, codeFromModifySubstate, snapshot, pre.msg.channel);
      await persistModifyExecutionContext(pre, codeFromModifySubstate, {
        reservationSlots: snapshot,
        modifyState: null,
        lastProposal: null,
        pendingAvailabilityVerification: null,
        salesStage: "close",
        conversationStage: "reservation_confirmed",
        lastReservation: {
          reservationId: codeFromModifySubstate,
          status: mod.ok ? "updated" : "error",
          createdAt: new Date().toISOString(),
          channel: (pre.msg.channel as any) || "web",
          guestName: snapshot.guestName,
          roomType: snapshot.roomType,
          checkIn: snapshot.checkIn,
          checkOut: snapshot.checkOut,
          numGuests: snapshot.numGuests,
        },
      });
      finalText = mod.message;
      nextSlots = { ...nextSlots, roomType: nextRoomType } as ReservationSlotsStrict;
      return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };
    }

    if (activeModifyField === "dates" && hasExplicitDateRange && nextCheckIn && nextCheckOut) {
      if (!codeFromModifySubstate) {
        finalText = buildAskReservationCode(pre.lang);
        return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };
      }
      const modifyDateCoherence = assessReservationDateCoherence(nextCheckIn, nextCheckOut);
      if (modifyDateCoherence && !modifyDateCoherence.ok) {
        finalText = buildInvalidReservationDatesReply(pre.lang, modifyDateCoherence.reason);
        return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };
      }
      const { modifyReservation } = await import("@/lib/agents/reservations");
      const snapshot: any = {
        guestName: baseGuestName,
        roomType: baseRoomType,
        numGuests: baseGuests,
        checkIn: nextCheckIn,
        checkOut: nextCheckOut,
        locale: pre.lang,
      };
      const mod = await modifyReservation(pre.msg.hotelId, codeFromModifySubstate, snapshot, pre.msg.channel);
      await persistModifyExecutionContext(pre, codeFromModifySubstate, {
        reservationSlots: snapshot,
        modifyState: null,
        lastProposal: null,
        pendingAvailabilityVerification: null,
        salesStage: "close",
        conversationStage: "reservation_confirmed",
        lastReservation: {
          reservationId: codeFromModifySubstate,
          status: mod.ok ? "updated" : "error",
          createdAt: new Date().toISOString(),
          channel: (pre.msg.channel as any) || "web",
          guestName: snapshot.guestName,
          roomType: snapshot.roomType,
          checkIn: snapshot.checkIn,
          checkOut: snapshot.checkOut,
          numGuests: snapshot.numGuests,
        },
      });
      finalText = mod.message;
      nextSlots = { ...nextSlots, checkIn: nextCheckIn, checkOut: nextCheckOut } as ReservationSlotsStrict;
      return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };
    }

    if (awaitingModifyExecutionContinuation) {
      // Defer to the availability verification handlers below so the modify target
      // stays authoritative through quote/confirm instead of looping back to the field prompt.
    } else {
    finalText = buildModifyFieldPrompt(pre.lang, activeModifyField);
    return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };
    }
  }
  const createDraftSlots = mergeReservationSlots(pre.st?.reservationSlots, {
    roomType: reservationRoomType,
    checkIn: reservationCheckIn,
    checkOut: reservationCheckOut,
    numGuests: reservationGuests ? String(reservationGuests) : undefined,
    guestName: isSafeGuestName(reservationGuestName || "") ? reservationGuestName : undefined,
  });
  const currentFocus = getConversationFocus(pre.st);
  const modifyExecutionActive = isModifyExecutionActive(pre);
  const activeCreateFlow =
    !pre.inModifyMode &&
    !hasConfirmedBookingContext &&
    (looksExplicitNewReservation ||
      currentFocus?.subFlow === "create" ||
      pre.st?.activeFlow === "reservation" ||
      pre.st?.desiredAction === "create" ||
      pre.prevCategory === "reservation");
  const quoteGatedCreateFlow =
    !pre.inModifyMode &&
    !hasConfirmedBookingContext &&
    (
      looksExplicitNewReservation ||
      currentFocus?.subFlow === "create" ||
      pre.st?.desiredAction === "create"
    );
  const createDraftConsistency =
    activeCreateFlow || quoteGatedCreateFlow || looksExplicitNewReservation
      ? validateCreateDraftConsistency(pre.lang, createDraftSlots)
      : ({ valid: true, sanitizedSlots: createDraftSlots } as CreateDraftConsistencyResult);
  if (!createDraftConsistency.valid) {
    await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);
    nextCategory = "reservation";
    return {
      finalText: createDraftConsistency.message,
      nextCategory,
      nextSlots: { ...createDraftConsistency.sanitizedSlots },
      needsSupervision,
      graphResult,
    };
  }
  const nextCreateMissingField = getNextCreateFlowMissingField(createDraftConsistency.sanitizedSlots);
  if (
    looksExplicitNewReservation &&
    !hasConfirmedBookingContext &&
    !!nextCreateMissingField &&
    (
      createDraftConsistency.sanitizedSlots.checkIn ||
      createDraftConsistency.sanitizedSlots.checkOut ||
      createDraftConsistency.sanitizedSlots.numGuests ||
      createDraftConsistency.sanitizedSlots.roomType
    )
  ) {
    await persistCreateDraft(pre, createDraftConsistency.sanitizedSlots);
    nextCategory = "reservation";
    return {
      finalText: buildCreateFlowPrompt(pre.lang, nextCreateMissingField),
      nextCategory,
      nextSlots,
      needsSupervision,
      graphResult,
    };
  }
  const turnExtractedCreateSlots = extractSlotsFromText(String(pre.msg.content || ""), pre.lang);
  const turnHasNewCreateData = Boolean(
    turnExtractedCreateSlots.checkIn ||
    turnExtractedCreateSlots.checkOut ||
    turnExtractedCreateSlots.roomType ||
    turnExtractedCreateSlots.numGuests ||
    looksLikeName(String(pre.msg.content || ""))
  );
  if (
    activeCreateFlow &&
    !looksExplicitNewReservation &&
    nextCreateMissingField &&
    turnHasNewCreateData
  ) {
    await persistCreateDraft(pre, createDraftConsistency.sanitizedSlots);
    nextCategory = "reservation";
    return {
      finalText: buildCreateFlowPrompt(pre.lang, nextCreateMissingField),
      nextCategory,
      nextSlots,
      needsSupervision,
      graphResult,
    };
  }
  if (
    !pre.inModifyMode &&
    !hasConfirmedBookingContext &&
    /^\s*\d{1,2}\s*$/.test(userTxtRaw) &&
    (pre.st?.activeFlow === "reservation" || pre.st?.desiredAction === "create" || pre.prevCategory === "reservation") &&
    reservationRoomType &&
    reservationCheckIn &&
    reservationCheckOut &&
    reservationGuests &&
    !isSafeGuestName(reservationGuestName || "")
  ) {
    await updateConversationState(pre.msg.hotelId, pre.conversationId, {
      reservationSlots: {
        ...(pre.st?.reservationSlots || {}),
        roomType: reservationRoomType,
        checkIn: reservationCheckIn,
        checkOut: reservationCheckOut,
        numGuests: String(reservationGuests),
        locale: pre.lang,
      },
      conversationFocus: buildConversationFocus("create"),
      activeReservationContext: buildDraftReservationContext("collecting"),
      activeFlow: "reservation",
      desiredAction: "create",
      salesStage: "qualify",
      lastCategory: "reservation",
      updatedBy: "ai",
    } as any);
    nextCategory = "reservation";
    return { finalText: buildAskGuestName(pre.lang), nextCategory, nextSlots, needsSupervision, graphResult };
  }
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
  const hasCompleteCreateDraft = Boolean(
    !pre.inModifyMode &&
    (pre.st?.activeFlow === "reservation" || pre.st?.desiredAction === "create" || pre.prevCategory === "reservation") &&
    (pre.currSlots?.roomType || pre.st?.reservationSlots?.roomType) &&
    (pre.currSlots?.checkIn || pre.st?.reservationSlots?.checkIn) &&
    (pre.currSlots?.checkOut || pre.st?.reservationSlots?.checkOut) &&
    (pre.currSlots?.numGuests || pre.st?.reservationSlots?.numGuests) &&
    hasGuestName
  );
  const pendingAvailabilityVerification = (pre.st as any)?.pendingAvailabilityVerification as { checkIn?: string; checkOut?: string } | undefined;
  const isVerifyAvailabilityAffirmative =
    (Boolean(pendingAvailabilityVerification) || askedToVerifyAvailability(pre.lcHistory, pre.lang)) &&
    isPureAffirmative(String(pre.msg.content || ""), pre.lang);
  const { flow: reservationFlow, confirmable: isReservationConfirmable } = isConfirmableReservationState(pre.st, nextSlots);

  // === Sprint 3: cancelar reserva ===
  const cancelCodeFromUser = parseReservationCode(userTxtRaw);
  const pendingCancellation = (pre.st as any)?.pendingCancellation as { reservationId?: string; awaitingConfirmation?: boolean } | undefined;
  const inCancelFlow = pre.prevCategory === "cancel_reservation" || pre.st?.activeFlow === "cancel_reservation";
  const wantsCancel = normalizeReservationIntent(userTxtRaw).kind === "cancel";
  const hasInlineCancelConfirmation = /\bconfirm(ar|alo|ala|ame)?\b/i.test(userTxtRaw);
  const resolvedCancelCode =
    cancelCodeFromUser ||
    (wantsCancel && reservationReference.status === "resolved" && reservationReference.target.kind === "reservation"
      ? reservationReference.target.reservationId
      : undefined) ||
    explicitIdReservationTarget?.reservationId ||
    explicitOrdinalReservationTarget?.reservationId ||
    selectedReservationTarget?.reservationId ||
    (pre.st?.activeReservationContext?.kind === "reservation"
      ? pre.st?.activeReservationContext.reservationId
      : undefined);
  if (inCancelFlow && cancelCodeFromUser && !isPureConfirm(userTxtRaw)) {
      await updateConversationState(pre.msg.hotelId, pre.conversationId, {
        pendingCancellation: { reservationId: cancelCodeFromUser, awaitingConfirmation: true },
        conversationFocus: buildConversationFocus("cancel"),
        activeFlow: "cancel_reservation",
      activeReservationContext: buildFocusedReservationContext(cancelCodeFromUser, "confirmed"),
      selectedReservationTarget: buildSelectedReservationTargetFromReference(cancelCodeFromUser, explicitReservationCode ? "explicit_id" : "active_focus", explicitReservationCode ? "strong" : "weak"),
      desiredAction: "cancel",
      lastCategory: "cancel_reservation",
      updatedBy: "ai",
    } as any);
    finalText = pre.lang === "es" ? "Para cancelar esa reserva, respondé **CONFIRMAR**."
      : pre.lang === "pt" ? "Para cancelar essa reserva, responda **CONFIRMAR**."
        : "To cancel that booking, reply **CONFIRMAR**.";
    return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };
  }
  if (pendingCancellation?.reservationId && pendingCancellation.awaitingConfirmation && isPureConfirm(userTxtRaw)) {
    try {
      const { cancelReservation } = await import("@/lib/agents/reservations");
      const r = await cancelReservation(pre.msg.hotelId, pendingCancellation.reservationId);
      const cancelledReservation = buildPersistedReservationRecord(
        pre.st,
        pendingCancellation.reservationId,
        r.ok ? "cancelled" : "error",
        ((pre.msg.channel as any) || "web") as LastReservation["channel"]
      );
      await updateConversationState(pre.msg.hotelId, pre.conversationId, {
        lastReservation: cancelledReservation,
        reservationHistory: mergeReservationHistory(
          mergeReservationHistory(
            (pre.st as any)?.reservationHistory as LastReservation[] | undefined,
            (pre.st?.lastReservation as LastReservation | undefined) ?? undefined
          ),
          cancelledReservation
        ),
        pendingCancellation: null,
        activeReservationContext: buildFocusedReservationContext(
          pendingCancellation.reservationId,
          r.ok ? "cancelled" : "confirmed"
        ),
        selectedReservationTarget: buildSelectedReservationTargetFromReference(
          pendingCancellation.reservationId,
          "active_focus",
          "weak"
        ),
        conversationFocus: null,
        activeFlow: null,
        desiredAction: undefined,
        lastCategory: "cancel_reservation",
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
  if (wantsCancel) {
    if (
      reservationReference.status === "resolved" &&
      reservationReference.target.kind === "draft" &&
      !cancelCodeFromUser &&
      !selectedReservationTarget?.reservationId &&
      !(pre.st?.activeReservationContext?.kind === "reservation" && pre.st?.activeReservationContext?.reservationId) &&
      !pre.st?.lastReservation?.reservationId
    ) {
      const fallbackReservation =
        reservationReference.target.source === "active" &&
        pre.st?.lastReservation?.reservationId &&
        pre.st?.lastReservation?.status !== "cancelled"
          ? buildFocusedReservationContext(pre.st.lastReservation.reservationId, "confirmed")
          : null;
      await updateConversationState(pre.msg.hotelId, pre.conversationId, {
        reservationSlots: null,
        lastProposal: null,
        pendingAvailabilityVerification: null,
        conversationFocus: null,
        activeFlow: null,
        desiredAction: undefined,
        activeReservationContext: fallbackReservation,
        selectedReservationTarget: null,
        lastCategory: "cancel_reservation",
        updatedBy: "ai",
      } as any);
      finalText = pre.lang === "es"
        ? "Listo, descarté la nueva reserva en curso y mantuve la reserva anterior."
        : pre.lang === "pt"
          ? "Pronto, descartei a nova reserva em andamento e mantive a reserva anterior."
          : "Done, I discarded the new booking draft and kept the previous reservation.";
      return { finalText, nextCategory: "cancel_reservation", nextSlots: {}, needsSupervision, graphResult };
    }
    if (!resolvedCancelCode) {
      if (reservationReference.status === "ambiguous" || reservationReference.status === "out_of_range") {
        finalText = buildReservationReferenceGuardReply(pre.lang, reservationReference);
        return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };
      }
      await updateConversationState(pre.msg.hotelId, pre.conversationId, {
        pendingCancellation: null,
        conversationFocus: buildConversationFocus("cancel"),
        activeFlow: "cancel_reservation",
        desiredAction: "cancel",
        lastCategory: "cancel_reservation",
        updatedBy: "ai",
      } as any);
      finalText = buildAskReservationCode(pre.lang);
      return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };
    }
    if (!(isPureConfirm(userTxtRaw) || hasInlineCancelConfirmation)) {
      await updateConversationState(pre.msg.hotelId, pre.conversationId, {
        pendingCancellation: { reservationId: resolvedCancelCode, awaitingConfirmation: true },
        conversationFocus: buildConversationFocus("cancel"),
        activeFlow: "cancel_reservation",
        activeReservationContext: buildFocusedReservationContext(resolvedCancelCode, "confirmed"),
        selectedReservationTarget: buildSelectedReservationTargetFromReference(
          resolvedCancelCode,
          explicitIdReservationTarget ? "explicit_id" : explicitOrdinalReservationTarget ? "ordinal" : hasAnaphoraReference ? "anaphora" : "active_focus",
          explicitIdReservationTarget || explicitOrdinalReservationTarget ? "strong" : "weak"
        ),
        desiredAction: "cancel",
        lastCategory: "cancel_reservation",
        updatedBy: "ai",
      } as any);
      finalText = pre.lang === "es" ? "Para cancelar, respondé **CONFIRMAR**."
        : pre.lang === "pt" ? "Para cancelar, responda **CONFIRMAR**."
          : "To cancel, reply **CONFIRMAR**.";
      return { finalText, nextCategory: "cancel_reservation", nextSlots, needsSupervision, graphResult };
    }
    try {
      const { cancelReservation } = await import("@/lib/agents/reservations");
      const r = await cancelReservation(pre.msg.hotelId, resolvedCancelCode);
      const cancelledReservation = buildPersistedReservationRecord(
        pre.st,
        resolvedCancelCode,
        r.ok ? "cancelled" : "error",
        ((pre.msg.channel as any) || "web") as LastReservation["channel"]
      );
      await updateConversationState(pre.msg.hotelId, pre.conversationId, {
        lastReservation: cancelledReservation,
        reservationHistory: mergeReservationHistory(
          mergeReservationHistory(
            (pre.st as any)?.reservationHistory as LastReservation[] | undefined,
            (pre.st?.lastReservation as LastReservation | undefined) ?? undefined
          ),
          cancelledReservation
        ),
        pendingCancellation: null,
        activeReservationContext: buildFocusedReservationContext(
          resolvedCancelCode,
          r.ok ? "cancelled" : "confirmed"
        ),
        selectedReservationTarget: buildSelectedReservationTargetFromReference(
          resolvedCancelCode,
          explicitIdReservationTarget ? "explicit_id" : explicitOrdinalReservationTarget ? "ordinal" : hasAnaphoraReference ? "anaphora" : "active_focus",
          explicitIdReservationTarget || explicitOrdinalReservationTarget ? "strong" : "weak"
        ),
        conversationFocus: null,
        activeFlow: null,
        desiredAction: undefined,
        lastCategory: "cancel_reservation",
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
      const { checkIn: confCheckIn, checkOut: confCheckOut } = getConfiguredCheckTimes(hotel);
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
  if (wantsAdditionalReservation(userTxtRaw, pre.st)) {
    const freshTurnSlots = toStrictSlots(extractSlotsFromText(String(pre.msg.content || ""), pre.lang));
    nextSlots = { ...freshTurnSlots };
    const preservedHistory = mergeReservationHistory(
      (pre.st as any)?.reservationHistory as LastReservation[] | undefined,
      (pre.st?.lastReservation as LastReservation | undefined) ?? undefined
    );
    await updateConversationState(pre.msg.hotelId, pre.conversationId, {
      reservationHistory: preservedHistory,
      reservationSlots: freshTurnSlots as any,
      lastProposal: null,
      pendingAvailabilityVerification: null,
      selectedReservationTarget: null,
      modifyState: null,
      conversationFocus: buildConversationFocus("create"),
      activeReservationContext: buildDraftReservationContext("collecting"),
      activeFlow: "reservation",
      desiredAction: "create",
      salesStage: "qualify",
      lastCategory: "reservation",
      updatedBy: "ai",
    } as any);

    const hasCheckIn = Boolean(freshTurnSlots.checkIn);
    const hasCheckOut = Boolean(freshTurnSlots.checkOut);
    if (hasCheckIn && !hasCheckOut) {
      finalText = pre.lang === "es"
        ? `Perfecto, mantenemos la reserva anterior y abrimos una nueva. ${buildAskMissingDate(pre.lang, "checkOut")}`
        : pre.lang === "pt"
          ? `Perfeito, mantemos a reserva anterior e abrimos uma nova. ${buildAskMissingDate(pre.lang, "checkOut")}`
          : `Perfect, we will keep the previous booking and open a new one. ${buildAskMissingDate(pre.lang, "checkOut")}`;
      return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };
    }
    if (!hasCheckIn && hasCheckOut) {
      finalText = pre.lang === "es"
        ? `Perfecto, mantenemos la reserva anterior y abrimos una nueva. ${buildAskMissingDate(pre.lang, "checkIn")}`
        : pre.lang === "pt"
          ? `Perfeito, mantemos a reserva anterior e abrimos uma nova. ${buildAskMissingDate(pre.lang, "checkIn")}`
          : `Perfect, we will keep the previous booking and open a new one. ${buildAskMissingDate(pre.lang, "checkIn")}`;
      return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };
    }

    finalText = pre.lang === "es"
      ? "Perfecto, mantenemos la reserva actual y abrimos una nueva. Decime las fechas de check-in y check-out para esta otra reserva."
      : pre.lang === "pt"
        ? "Perfeito, mantemos a reserva atual e abrimos uma nova. Me diga as datas de check-in e check-out desta outra reserva."
        : "Perfect, we will keep the current booking and open a new one. Please share the check-in and check-out dates for this additional booking.";
    return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };
  }
  if (
    activeCreateFlow &&
    nextCreateMissingField &&
    !turnHasNewCreateData &&
    isPureAffirmative(userTxtRaw, pre.lang) &&
    !isVerifyAvailabilityAffirmative
  ) {
    await persistCreateDraft(pre, createDraftSlots);
    nextCategory = "reservation";
    return {
      finalText: buildCreateFlowPrompt(pre.lang, nextCreateMissingField),
      nextCategory,
      nextSlots,
      needsSupervision,
      graphResult,
    };
  }
  if (isPureConfirm(userTxtRaw) && !isVerifyAvailabilityAffirmative && !looksExplicitNewReservation) {
    if (!isReservationConfirmable && !modifyExecutionActive && !hasCompleteCreateDraft) {
      if (reservationFlow === "confirmed") {
        finalText = pre.lang === "es"
          ? "Ya tengo una reserva confirmada para esta conversación. Si querés modificar o cancelar, decímelo."
          : pre.lang === "pt"
            ? "Já tenho uma reserva confirmada nesta conversa. Se quiser modificar ou cancelar, me avise."
            : "There is already a confirmed booking on this conversation. Tell me if you want to modify or cancel it.";
        return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };
      }
      if (activeCreateFlow && nextCreateMissingField) {
        await persistCreateDraft(pre, createDraftSlots);
        finalText = buildCreateFlowPrompt(pre.lang, nextCreateMissingField);
      } else {
        finalText = pre.lang === "es"
          ? "Todavía no tengo una propuesta lista para confirmar. Decime fechas (check-in y check-out) y tipo de habitación para avanzar."
          : pre.lang === "pt"
            ? "Ainda não tenho uma proposta pronta para confirmar. Me diga as datas (check-in e check-out) e o tipo de quarto para avançar."
            : "I don’t have a proposal ready to confirm yet. Please share check-in/check-out dates and room type to continue.";
      }
      return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };
    }
    if (!hasGuests) {
      finalText = buildAskGuests(pre.lang);
      return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
    }
    if (!hasGuestName) {
      if (!modifyExecutionActive) {
        await updateConversationState(pre.msg.hotelId, pre.conversationId, {
          reservationSlots: {
            ...(pre.st?.reservationSlots || {}),
            ...(nextSlots || {}),
            locale: pre.lang,
          },
          conversationFocus: buildConversationFocus("create"),
          activeReservationContext: buildDraftReservationContext("collecting"),
          activeFlow: "reservation",
          desiredAction: "create",
          salesStage: "qualify",
          lastCategory: "reservation",
          updatedBy: "ai",
        } as any);
      }
      finalText = buildAskGuestName(pre.lang);
      return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
    }
    // === Sprint 3: confirmar modificación de reserva ===
    if (modifyExecutionActive) {
      const codeFromUser =
        parseReservationCode(userTxtRaw) ||
        parseReservationCode(String(pre.msg.content || "")) ||
        (reservationReference.status === "resolved" && reservationReference.target.kind === "reservation"
          ? reservationReference.target.reservationId
          : undefined) ||
        selectedReservationTarget?.reservationId ||
        (pre.st?.activeReservationContext?.kind === "reservation"
          ? pre.st?.activeReservationContext?.reservationId
          : undefined) ||
        resolveSingleActionableReservationTarget(pre.st)?.reservationId;
      const ci = nextSlots.checkIn || pre.st?.reservationSlots?.checkIn;
      const co = nextSlots.checkOut || pre.st?.reservationSlots?.checkOut;
      const rt = nextSlots.roomType || pre.st?.reservationSlots?.roomType;
      const ng = nextSlots.numGuests || pre.st?.reservationSlots?.numGuests;
      const hasChanges = Boolean(ci || co || rt || ng);
      if (
        reservationReference.status === "resolved" &&
        reservationReference.target.kind === "draft" &&
        !parseReservationCode(userTxtRaw) &&
        !parseReservationCode(String(pre.msg.content || ""))
      ) {
        if (!hasChanges) {
          finalText = pre.lang === "es"
            ? "Perfecto, trabajamos sobre la nueva reserva en curso. ¿Qué querés cambiar?"
            : pre.lang === "pt"
              ? "Perfeito, trabalhamos sobre a nova reserva em andamento. O que você quer mudar?"
              : "Perfect, we will work on the new booking draft. What would you like to change?";
          return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };
        }
        await updateConversationState(pre.msg.hotelId, pre.conversationId, {
          reservationSlots: {
            guestName: pre.st?.reservationSlots?.guestName,
            roomType: rt,
            numGuests: ng,
            checkIn: ci,
            checkOut: co,
            locale: pre.lang,
          },
          modifyState: null,
          conversationFocus: buildConversationFocus("create"),
          activeReservationContext: buildDraftReservationContext("collecting"),
          activeFlow: "reservation",
          desiredAction: "create",
          updatedBy: "ai",
        } as any);
        finalText = pre.lang === "es"
          ? "Perfecto, apliqué el cambio sobre la nueva reserva en curso."
          : pre.lang === "pt"
            ? "Perfeito, apliquei a alteração sobre a nova reserva em andamento."
            : "Perfect, I applied the change to the new booking draft.";
        return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };
      }
      if (!codeFromUser) {
        if (reservationReference.status === "ambiguous" || reservationReference.status === "out_of_range") {
          finalText = buildReservationReferenceGuardReply(pre.lang, reservationReference);
          return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };
        }
        finalText = buildAskReservationCode(pre.lang);
        return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };
      }
      if (!hasChanges) {
        finalText = pre.lang === "es" ? "¿Qué cambio aplico? (fechas, tipo de habitación o huéspedes)"
          : pre.lang === "pt" ? "Qual alteração aplico? (datas, tipo de quarto ou hóspedes)"
            : "What should I change? (dates, room type or guests)";
        return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };
      }
      const modifyDateCoherence = assessReservationDateCoherence(ci, co);
      if (modifyDateCoherence && !modifyDateCoherence.ok) {
        finalText = buildInvalidReservationDatesReply(pre.lang, modifyDateCoherence.reason);
        return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };
      }
      try {
        const { modifyReservation } = await import("@/lib/agents/reservations");
        const snapshot: any = {
          guestName: pre.st?.reservationSlots?.guestName,
          roomType: rt, numGuests: ng, checkIn: ci, checkOut: co, locale: pre.lang,
        };
        const mod = await modifyReservation(pre.msg.hotelId, codeFromUser, snapshot, pre.msg.channel);
        await persistModifyExecutionContext(pre, codeFromUser, {
          reservationSlots: snapshot,
          modifyState: null,
          lastProposal: null,
          pendingAvailabilityVerification: null,
          salesStage: "close",
          conversationStage: "reservation_confirmed",
          lastReservation: {
            reservationId: codeFromUser,
            status: mod.ok ? "updated" : "error",
            createdAt: new Date().toISOString(),
            channel: (pre.msg.channel as any) || "web",
            guestName: snapshot.guestName,
            roomType: snapshot.roomType,
            checkIn: snapshot.checkIn,
            checkOut: snapshot.checkOut,
            numGuests: snapshot.numGuests,
          },
        });
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
    if (askedToConfirmReservation(pre.lcHistory) || hasCompleteCreateDraft) {
      const snapshot = {
        guestName: pre.st?.reservationSlots?.guestName || nextSlots.guestName,
        roomType: pre.st?.reservationSlots?.roomType || nextSlots.roomType,
        checkIn: pre.st?.reservationSlots?.checkIn || nextSlots.checkIn,
        checkOut: pre.st?.reservationSlots?.checkOut || nextSlots.checkOut,
        numGuests: pre.st?.reservationSlots?.numGuests || nextSlots.numGuests,
        locale: pre.lang,
      };
      const createDraftConsistency = validateCreateDraftConsistency(pre.lang, snapshot as ReservationSlotsStrict);
      if (!createDraftConsistency.valid) {
        await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);
        finalText = createDraftConsistency.message;
        return {
          finalText,
          nextCategory: "reservation",
          nextSlots: { ...createDraftConsistency.sanitizedSlots },
          needsSupervision,
          graphResult,
        };
      }
      if (!isCreateStateReadyForQuote(snapshot as ReservationSlotsStrict)) {
        const missingField = getNextCreateFlowMissingField(snapshot as ReservationSlotsStrict);
        if (missingField) {
          await persistCreateDraft(pre, snapshot as ReservationSlotsStrict);
          finalText = buildCreateFlowPrompt(pre.lang, missingField);
          return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };
        }
      }
      if (!snapshot.roomType || !snapshot.checkIn || !snapshot.checkOut) {
        finalText = buildAskMissingDate(pre.lang, !snapshot.checkIn ? "checkIn" : "checkOut");
        return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };
      }
      const createDateCoherence = assessReservationDateCoherence(snapshot.checkIn, snapshot.checkOut);
      if (createDateCoherence && !createDateCoherence.ok) {
        finalText = buildInvalidReservationDatesReply(pre.lang, createDateCoherence.reason);
        return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };
      }
      try {
        const { confirmAndCreate } = await import("@/lib/agents/reservations");
        const result = await confirmAndCreate(pre.msg.hotelId, snapshot as any, pre.msg.channel);
        const hasReservationId = Boolean(String(result.reservationId || "").trim());
        if (result.ok && hasReservationId) {
          const createdReservation: LastReservation = {
            reservationId: result.reservationId || "",
            status: "created",
            createdAt: new Date().toISOString(),
            channel: (pre.msg.channel as any) || "web",
            guestName: snapshot.guestName,
            roomType: snapshot.roomType,
            checkIn: snapshot.checkIn,
            checkOut: snapshot.checkOut,
            numGuests: snapshot.numGuests,
          };
          const preservedHistory = mergeReservationHistory(
            mergeReservationHistory(
              (pre.st as any)?.reservationHistory as LastReservation[] | undefined,
              shouldPreserveLastReservationRecord(
                (pre.st as any)?.reservationHistory as LastReservation[] | undefined,
                (pre.st?.lastReservation as LastReservation | undefined) ?? undefined
              )
                ? ((pre.st?.lastReservation as LastReservation | undefined) ?? undefined)
                : undefined
            ),
            createdReservation
          );
          await updateConversationState(pre.msg.hotelId, pre.conversationId, {
            reservationSlots: {
              guestName: snapshot.guestName,
              roomType: snapshot.roomType,
              checkIn: snapshot.checkIn,
              checkOut: snapshot.checkOut,
              numGuests: snapshot.numGuests,
              locale: snapshot.locale,
            },
            reservationHistory: preservedHistory,
            activeReservationContext: buildFocusedReservationContext(createdReservation.reservationId, "confirmed"),
            lastReservation: createdReservation,
            salesStage: "close",
            conversationFocus: null,
            activeFlow: null,
            desiredAction: undefined,
            updatedBy: "ai",
          } as any);
        }
        finalText = result.ok && hasReservationId
          ? (pre.lang === "es"
            ? `✅ ¡Reserva confirmada! Código **${result.reservationId ?? "pendiente"}**.\nHabitación **${localizeRoomType(snapshot.roomType, pre.lang)}**, Fechas **${snapshot.checkIn} → ${snapshot.checkOut}**${snapshot.numGuests ? ` · **${snapshot.numGuests}** huésped(es)` : ""}. ¡Gracias, ${String(snapshot.guestName).trim().split(/\s+/)[0] || snapshot.guestName}!`
            : pre.lang === "pt"
              ? `✅ Reserva confirmada! Código **${result.reservationId ?? "pendente"}**.\nQuarto **${localizeRoomType(snapshot.roomType, pre.lang)}**, Datas **${snapshot.checkIn} → ${snapshot.checkOut}**${snapshot.numGuests ? ` · **${snapshot.numGuests}** hóspede(s)` : ""}. Obrigado, ${String(snapshot.guestName).trim().split(/\s+/)[0] || snapshot.guestName}!`
              : `✅ Booking confirmed! Code **${result.reservationId ?? "pending"}**.\nRoom **${localizeRoomType(snapshot.roomType, pre.lang)}**, Dates **${snapshot.checkIn} → ${snapshot.checkOut}**${snapshot.numGuests ? ` · **${snapshot.numGuests}** guest(s)` : ""}. Thank you, ${String(snapshot.guestName).trim().split(/\s+/)[0] || snapshot.guestName}!`)
          : (result.ok
            ? (pre.lang === "es"
              ? "No pude confirmar la reserva con datos incompletos. Sigamos con el dato faltante."
              : pre.lang === "pt"
                ? "Não consegui confirmar a reserva com dados incompletos. Vamos continuar com a informação que falta."
                : "I couldn't confirm the booking with incomplete data. Let's continue with the missing detail.")
            : result.message);
        return {
          finalText,
          nextCategory: "reservation",
          nextSlots: result.ok && hasReservationId ? { ...nextSlots, ...snapshot } : nextSlots,
          needsSupervision,
          graphResult
        };
      } catch (e) {
        needsSupervision = true;
        finalText = pre.lang === "es"
          ? "No pude confirmar la reserva ahora. Un recepcionista te contactará."
          : pre.lang === "pt"
            ? "Não consegui confirmar a reserva agora. Um recepcionista entrará em contato."
            : "I couldn't confirm the booking right now. A receptionist will contact you.";
        return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };
      }
    }
  }

  {
    const started = Date.now();
    void started;
    Object.assign(state, { finalText, nextCategory, nextSlots, needsSupervision, graphResult, explicitRich });
    try {
      // Frontera 1: shortcut de test aislado del razonamiento semántico
      if (!tryBodyLLMTestGreetingFastpath(pre, state)) {
        finalText = state.finalText;
        nextCategory = state.nextCategory;
        nextSlots = state.nextSlots;
        needsSupervision = state.needsSupervision;
        graphResult = state.graphResult;
        explicitRich = state.explicitRich;
        // Frontera 2: shortcuts KB / billing determinista
        // ============================
        // NEW: Fast-path KnowledgeBase
        // ============================
        const kbUserText = String(pre.msg.content || "");
        const kbLower = kbUserText.toLowerCase();
        const kbGuestState = resolveGuestState(pre.st);
        const postBookingLateCheckoutQ = detectLateCheckoutQuestion(kbUserText, pre.lang);
        const postBookingEarlyCheckinQ = detectEarlyCheckinQuestion(kbUserText, pre.lang);
        const postBookingTimeQ = detectCheckinOrCheckoutTimeQuestion(kbUserText, pre.lang);
        const postBookingSnapshotQ = detectReservationSnapshotQuery(kbUserText, pre.lang);
        const postBookingReservationIntent = normalizeReservationIntent(kbUserText);
        const hasConfirmedBookingContext = Boolean(
          pre.st?.lastReservation?.reservationId ||
          pre.st?.salesStage === "close"
        );
        const mentionsReservationObject = /\b(reserva|booking|reservation)\b/i.test(kbUserText);
        if (postBookingSnapshotQ && !hasConfirmedBookingContext) {
          finalText = pre.lang === "es"
            ? "No encuentro una reserva activa en esta conversación. Si querés revisar una reserva existente, pasame el código de reserva."
            : pre.lang === "pt"
              ? "Não encontrei uma reserva ativa nesta conversa. Se quiser revisar uma reserva existente, me envie o código da reserva."
              : "I can't find an active booking on this conversation. If you want to review an existing booking, send me the booking code.";
          nextCategory = "reservation_snapshot";
      return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };
        }
        if (
          mentionsReservationObject &&
          !hasConfirmedBookingContext &&
          (postBookingReservationIntent.kind === "modify" || postBookingReservationIntent.kind === "cancel")
        ) {
          finalText = buildAskReservationCode(pre.lang);
          nextCategory = postBookingReservationIntent.kind === "cancel" ? "cancel_reservation" : "modify_reservation";
          return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };
        }
        if (
          postBookingSnapshotQ &&
          hasConfirmedBookingContext &&
          postBookingReservationIntent.kind !== "modify" &&
          postBookingReservationIntent.kind !== "cancel"
        ) {
          if (postBookingSnapshotQ === "list") {
            finalText = buildReservationListAnswer(pre.lang, buildCanonicalReservationRecords(pre.st));
          } else {
            const snapshotSlots = {
              ...(pre.st?.reservationSlots || {}),
              ...(nextSlots || {}),
            } as ReservationSlotsStrict;
            finalText = buildReservationSnapshotAnswer(
              postBookingSnapshotQ,
              pre.lang,
              snapshotSlots,
              pre.st?.lastReservation && "reservationId" in pre.st.lastReservation
                ? pre.st.lastReservation.reservationId
                : undefined,
              pre.st?.lastReservation?.status
            );
          }
          nextCategory = "reservation_snapshot";
          return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };
        }
        if (postBookingLateCheckoutQ && hasConfirmedBookingContext) {
          finalText = buildLateCheckoutResponse(pre.lang, kbGuestState);
          nextCategory = "checkout_info";
          return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };
        }
        if (postBookingEarlyCheckinQ && hasConfirmedBookingContext) {
          const hotel = await getHotelConfig(pre.msg.hotelId).catch(() => null);
          const { checkIn: confCheckIn } = getConfiguredCheckTimes(hotel);
          finalText = buildEarlyCheckinResponse(pre.lang, kbGuestState, {
            checkInTime: confCheckIn,
            asksLuggage: /\b(valijas?|equipaje|luggage|bags?|bagagem|malas?)\b/i.test(kbUserText),
          });
          nextCategory = "checkin_info";
          return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };
        }
        if (postBookingTimeQ && hasConfirmedBookingContext) {
          try {
            const hotel = await getHotelConfig(pre.msg.hotelId).catch(() => null);
            const { checkIn: confCheckIn, checkOut: confCheckOut } = getConfiguredCheckTimes(hotel);
            const asksCheckOut = detectDateSideFromText(kbUserText) === "checkOut" || /check\s*-?out|salida|egreso|retirada|partida|sa[ií]da/i.test(kbUserText);
            const time = asksCheckOut ? confCheckOut : confCheckIn;
            finalText = time && typeof time === "string"
              ? (pre.lang === "es"
                ? (asksCheckOut ? `El check-out es hasta las ${time}.` : `El check-in comienza a las ${time}.`)
                : pre.lang === "pt"
                  ? (asksCheckOut ? `O check-out vai até ${time}.` : `O check-in começa às ${time}.`)
                  : (asksCheckOut ? `Check-out is until ${time}.` : `Check-in starts at ${time}.`))
              : (pre.lang === "es"
                ? "Puedo consultarlo con recepción y confirmarte el horario exacto de tu reserva."
                : pre.lang === "pt"
                  ? "Posso consultar a recepção e confirmar o horário exato da sua reserva."
                  : "I can check with reception and confirm the exact time for your booking.");
            nextCategory = asksCheckOut ? "checkout_info" : "checkin_info";
            return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };
          } catch {
            finalText = pre.lang === "es"
              ? "Puedo consultarlo con recepción y confirmarte el horario exacto de tu reserva."
              : pre.lang === "pt"
                ? "Posso consultar a recepção e confirmar o horário exato da sua reserva."
                : "I can check with reception and confirm the exact time for your booking.";
            nextCategory = /check\s*-?out|salida|egreso|retirada|partida|sa[ií]da/i.test(kbUserText) ? "checkout_info" : "checkin_info";
            return { finalText, nextCategory, nextSlots, needsSupervision, graphResult: null, rich: undefined };
          }
        }

        // Sólo usamos KB para consultas informativas (sin contexto transaccional de reserva)
        const wantsNearby = Boolean(pickNearbyPromptKey(kbUserText));
        const looksEventIntent = (() => {
          const hay = kbUserText
            .toLowerCase()
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "");
          const keys = [
            "evento", "eventos", "agenda", "que hay", "que hacer", "hoy", "manana", "esta noche",
            "fin de semana", "este fin de semana", "este mes", "mes", "mensual",
            "evento turistico", "eventos turisticos",
            "event", "events", "tourist event", "tourist events", "today", "tomorrow", "tonight",
            "weekend", "this weekend", "this month", "month", "monthly",
            "hoje", "amanha", "esta noite", "fim de semana", "este fim de semana", "este mes", "mes", "mensal",
          ];
          return keys.some((k) => hay.includes(k));
        })();
        const hasEventMemory = pre.st?.lastIntentGroup === "events";
        const isShortFollowup = kbUserText.trim().length <= 40;
        const startsWithFollowup = /^\s*(¿?\s*y\b|and\b|e\b)\b/i.test(kbUserText);
        const hasPhotoSignal = /\b(foto|fotos|imagen|imagenes|imágenes|photos|pics)\b/i.test(kbUserText);
        const skipKbFastpath = hasEventMemory && (isShortFollowup || startsWithFollowup || hasPhotoSignal);
        const looksBillingByRule = RE_BILLING.test(kbLower);
        const looksInvoiceDetail = /\b(comprobante|comprobantes|factura|facturas|recibo|recibos|invoice|invoices|billing)\b/i.test(kbLower);
        const looksTransactionalPricing = looksTransactionalPricingIntent(kbUserText);
        const isRoomTypeFollowup = isRoomTypeFollowupInReservation(pre.lcHistory, kbUserText, pre.lang);
        const isGuestsFollowup = isGuestsFollowupInReservation(pre.lcHistory, kbUserText, pre.lang);
        const isGuestNameFollowup = isGuestNameFollowupInReservation(pre.lcHistory, kbUserText);
        const isAvailabilityVerifyAffirmative =
          askedToVerifyAvailability(pre.lcHistory, pre.lang) &&
          isPureAffirmative(kbUserText, pre.lang);
        const isReservationConfirmFollowup =
          askedToConfirmReservation(pre.lcHistory) &&
          (isPureConfirm(kbUserText) || isPureAffirmative(kbUserText, pre.lang));
        const allowsCrossDomainFocusOverride =
          !reservationDomainLock.compatible &&
          (dominantTurnDomain.dominant === "faq" || dominantTurnDomain.dominant === "policies");
        const hasReservationContext =
          !allowsCrossDomainFocusOverride &&
          (
            pre.inModifyMode ||
            dominantTurnDomain.dominant === "reservation" ||
            dominantTurnDomain.dominant === "pricing" ||
            isRoomTypeFollowup ||
            isGuestsFollowup ||
            isGuestNameFollowup ||
            isAvailabilityVerifyAffirmative ||
            isReservationConfirmFollowup ||
            reservationDomainLock.compatible ||
            isReservationFlowStillActive(pre) ||
            !!pre.stateForPlaybook?.draft ||
            !!pre.stateForPlaybook?.confirmedBooking
          );
        debugLog("[KB] fastpath check", {
          hasReservationContext,
          wantsNearby,
          isRoomTypeFollowup,
          isGuestsFollowup,
          isGuestNameFollowup,
          isAvailabilityVerifyAffirmative,
          isReservationConfirmFollowup,
        });
        if (wantsNearby) {
          debugLog("[KB] skip fast-path for nearby_points_img", { text: kbUserText });
        }
        if (looksBillingByRule) {
          let forcedBillingResolved = false;
          try {
            const forcedPromptKey = looksInvoiceDetail ? "invoice_receipts" : "payments_and_billing";
            const kbForced = await answerWithKnowledge({
              question: kbUserText,
              hotelId: pre.msg.hotelId,
              desiredLang: pre.lang,
              override: { category: "billing", promptKey: forcedPromptKey },
            });
            const forcedText = kbForced.answer?.trim();
            if (kbForced.ok && forcedText) {
              finalText = forcedText;
              finalText = await harmonizeBillingCurrencyAnswer(finalText, kbUserText, pre.msg.hotelId, pre.lang);
              finalText = stripOffTopicBillingTail(finalText, pre.lang);
              finalText = ensureBillingContextualFollowup(finalText, pre.lang);
              finalText = stripGlobalTailNoise(finalText);
              // Guardrail: si quedó texto fuera de dominio billing, reconstruimos respuesta desde config.
              if (/(actividad|actividades|zona|lugares para visitar|restaurants? cercanos|atracciones)/i.test(finalText)) {
                finalText = await buildDeterministicBillingReply(pre.msg.hotelId, pre.lang, kbUserText);
              }
              nextCategory = "billing";
              nextSlots = pre.currSlots;
              graphResult = {
                ...(kbForced.debug || {}),
                category: "billing",
                promptKey: forcedPromptKey,
                source: "knowledgeBaseAgent_forced_billing",
                contentTitle: kbForced.contentTitle,
                contentBody: kbForced.contentBody,
                retrieved: kbForced.retrieved,
              };
              forcedBillingResolved = true;
              emitRoutingDecision(pre.msg, {
                decision_layer: "bodyLLM",
                route_source: "knowledgeBaseAgent_forced_billing",
                route_match: forcedPromptKey,
                early_return: true,
                used_llm_classifier: false,
                classifier_source: "heuristic",
                final_category: nextCategory,
                final_prompt_key: forcedPromptKey,
              });
              return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
            }
          } catch (e) {
            console.warn("[KB] forced billing fastpath error, sigo flujo normal:", (e as any)?.message || e);
          }
          if (!forcedBillingResolved) {
            finalText = await buildDeterministicBillingReply(pre.msg.hotelId, pre.lang, kbUserText);
            nextCategory = "billing";
            nextSlots = pre.currSlots;
            graphResult = {
              ...(graphResult || {}),
              category: "billing",
              promptKey: "payments_and_billing",
              source: "deterministic_billing_fallback",
            };
            emitRoutingDecision(pre.msg, {
              decision_layer: "bodyLLM",
              route_source: "deterministic_billing_fallback",
              route_match: "RE_BILLING",
              early_return: true,
              used_llm_classifier: false,
              classifier_source: "fallback",
              final_category: nextCategory,
              final_prompt_key: "payments_and_billing",
            });
            return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
          }
        }
        if (!hasReservationContext && !wantsNearby && !looksEventIntent && !looksTransactionalPricing) {
          if (skipKbFastpath) {
            debugLog("[KB] skip fast-path for events followup", { text: kbUserText });
          } else {
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
              debugLog("[KB] fastpath return", { ok: kb.ok, safeCat, hasText: Boolean(text) });
              finalText = text;
              nextCategory = cat || "retrieval_based";
              nextSlots = pre.currSlots; // KB no toca slots de reserva
              const kbFocus = getConversationFocus(pre.st);
              const kbTurnHasReservationData = Boolean(
                extractSlotsFromText(kbUserText, pre.lang).checkIn ||
                extractSlotsFromText(kbUserText, pre.lang).checkOut ||
                extractSlotsFromText(kbUserText, pre.lang).roomType ||
                extractSlotsFromText(kbUserText, pre.lang).numGuests ||
                looksLikeName(kbUserText) ||
                extractRawOrderedDateRange(kbUserText)?.checkIn
              );
              if (
                shouldAppendFocusContinuation(pre, kbFocus, {
                  isLateralTurn:
                    nextCategory === "amenities_info" ||
                    nextCategory === "checkin_info" ||
                    nextCategory === "checkout_info" ||
                    nextCategory === "billing" ||
                    nextCategory === "support",
                  turnHasReservationData: kbTurnHasReservationData,
                })
              ) {
                const continuation = buildFocusContinuationPrompt(pre, kbFocus, nextSlots);
                if (continuation) {
                  finalText = `${String(finalText || "").trim()} ${continuation}`.trim();
                }
              }

              graphResult = {
                ...(kb.debug || {}),
                category: cat,
                promptKey: kb.promptKey || null,
                source: "knowledgeBaseAgent",
                contentTitle: kb.contentTitle,
                contentBody: kb.contentBody,
                retrieved: kb.retrieved,
              };

              // Atajo: no llamamos agentGraph si el KB ya resolvió bien
              emitRoutingDecision(pre.msg, {
                decision_layer: "bodyLLM",
                route_source: "knowledgeBaseAgent",
                route_match: "safe_kb_fastpath",
                early_return: true,
                used_llm_classifier: false,
                classifier_source: "heuristic",
                final_category: nextCategory,
                final_prompt_key: kb.promptKey || null,
              });
              return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
            }
          } catch (e) {
            console.warn("[KB] answerWithKnowledge error, sigo con agentGraph:", (e as any)?.message || e);
          }
          }
        }

        // Frontera 3: graph path / razonamiento semántico principal
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
        const lastAiText = extractLastAIText((graphResult as any)?.messages);
        finalText = ((lastAiText || lastText) || "").trim();
        nextCategory = (graphResult as any).category ?? pre.prevCategory ?? null;
        debugLog("[messageHandler] resolved category", {
          nextCategory,
          promptKey: (graphResult as any)?.classified?.promptKey,
          category: (graphResult as any)?.category,
          userQuery: String(pre.msg.content || ""),
        });
        emitRoutingDecision(pre.msg, {
          decision_layer: "graph",
          route_source: String((graphResult as any)?.meta?.debug?.route_source || "graph_path"),
          route_match: String((graphResult as any)?.meta?.debug?.route_match || "agentGraph.invoke"),
          early_return: false,
          used_llm_classifier:
            String((graphResult as any)?.meta?.debug?.route_source || "").includes("llm_classifier") ||
            String((graphResult as any)?.meta?.debug?.route_source || "").includes("forced_llm_classifier") ||
            (graphResult as any)?.intentSource === "llm",
          classifier_source: deriveClassifierSource(graphResult),
          final_category: nextCategory,
          final_prompt_key:
            (graphResult as any)?.promptKey ||
            (graphResult as any)?.classified?.promptKey ||
            null,
        });

        const merged: ReservationSlotsStrict = {
          ...(pre.currSlots || {}),
          ...((graphResult as any).reservationSlots || {}),
        };
        if (typeof merged.numGuests !== "undefined" && typeof merged.numGuests !== "string") {
          merged.numGuests = String((merged as any).numGuests);
        }
        nextSlots = merged;

        // Si KB no tiene contenido para nearby_points*, forzamos retrievalBased directo para evitar fallback genérico
        try {
          const resolved = (graphResult as any)?.resolved;
          const classified = (graphResult as any)?.classified;
          const noContent = resolved?.debug?.reason === "no-content";
          const pk = classified?.promptKey;
          const isNearby = pk === "nearby_points" || pk === "nearby_points_img";
          debugLog("[nearby_points] fallback check", {
            reason: resolved?.debug?.reason,
            promptKey: pk,
            noContent,
            isNearby,
          });
          if (noContent && isNearby) {
            debugLog("[nearby_points] fallback enter", { promptKey: pk });
            debugLog("[nearby_points] forcing retrievalBased fallback", { promptKey: pk });
            const rbState = await retrievalBased({
              hotelId: pre.msg.hotelId,
              conversationId: pre.conversationId,
              normalizedMessage: String(pre.msg.content || ""),
              retrievalLang: pre.lang,
              originalLang: pre.lang,
              messages: lcMessages,
              promptKey: pk,
              category: classified?.category || "retrieval_based",
            });
            const rbLast = (rbState as any)?.messages?.at?.(-1);
            const rbText = extractTextFromLCContent(rbLast?.content);
            const rbRich = (rbState as any)?.meta?.rich as RichPayload | undefined;
            if (rbRich) explicitRich = rbRich;
            if (rbText) {
              finalText = rbText.trim();
              graphResult = {
                ...(graphResult || {}),
                meta: { ...(graphResult as any)?.meta, ...(rbState?.meta || {}) },
              };
            }
          }
        } catch (e) {
          console.warn("[nearby_points] retrievalBased fallback error:", (e as any)?.message || e);
        }
      }

      // Frontera 4: fallback / enrich estructurado post-graph
      // === NEW: enriquecer con structured si aporta algo útil (no bloqueante)
      try {
        Object.assign(state, { finalText, nextCategory, nextSlots, needsSupervision, graphResult, explicitRich });
        await tryBodyLLMStructuredEnrichment(pre, state);
        finalText = state.finalText;
        nextCategory = state.nextCategory;
        nextSlots = state.nextSlots;
        needsSupervision = state.needsSupervision;
        graphResult = state.graphResult;
        explicitRich = state.explicitRich;
      } catch (e) {
        console.warn("[structured] enrich warn:", (e as any)?.message || e);
      }
    } catch (err: any) {
      console.error("❌ [messageHandler] agentGraph error:", { errMsg: err?.message || String(err) });
      // === NEW: structured fallback si el grafo falla
      debugLog("[bodyLLM] agentGraph error", err);
      try {
        Object.assign(state, { finalText, nextCategory, nextSlots, needsSupervision, graphResult, explicitRich });
        await tryBodyLLMStructuredFallback(pre, state);
        finalText = state.finalText;
        nextCategory = state.nextCategory;
        nextSlots = state.nextSlots;
        needsSupervision = state.needsSupervision;
        graphResult = state.graphResult;
        explicitRich = state.explicitRich;
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
  const reservationLocalFallbackNeeded = shouldUseReservationLocalFallback(pre, nextCategory, finalText, reservationDomainLock);
  if (reservationLocalFallbackNeeded) {
    const localFallback = buildReservationLocalFallbackReply(pre, reservationDomainLock, nextSlots);
    nextCategory = localFallback.nextCategory;
    finalText = localFallback.finalText;
    const fallbackSlots = mergeReservationSlots(pre.st?.reservationSlots, pre.currSlots, nextSlots);
    if (Object.keys(fallbackSlots).length > 0) {
      await updateConversationState(pre.msg.hotelId, pre.conversationId, {
        reservationSlots: {
          ...(pre.st?.reservationSlots || {}),
          ...fallbackSlots,
          locale: pre.lang,
        },
        conversationFocus:
          localFallback.nextCategory === "modify_reservation"
            ? buildConversationFocus("modify")
            : localFallback.nextCategory === "reservation"
              ? buildConversationFocus("create")
              : null,
        activeReservationContext:
          localFallback.nextCategory === "modify_reservation"
            ? pre.st?.activeReservationContext
            : buildDraftReservationContext("collecting"),
        activeFlow: localFallback.nextCategory,
        desiredAction:
          localFallback.nextCategory === "modify_reservation"
            ? "modify"
            : localFallback.nextCategory === "reservation_snapshot"
              ? pre.st?.desiredAction
              : "create",
        salesStage:
          localFallback.nextCategory === "reservation"
            ? (pre.st?.salesStage || "qualify")
            : pre.st?.salesStage,
        lastCategory: localFallback.nextCategory,
        updatedBy: "ai",
      } as any);
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
    const normalizedUserTxt = normalizeReferenceText(userTxt);
    const wantsChangeDates = RE_CHANGE_DATES.test(userTxt) || RE_CHANGE_DATES.test(normalizedUserTxt);
    const wantsChangeRoom = RE_CHANGE_ROOM.test(userTxt) || RE_CHANGE_ROOM.test(normalizedUserTxt);
    const wantsChangeGuests = RE_CHANGE_GUESTS.test(userTxt) || RE_CHANGE_GUESTS.test(normalizedUserTxt);
    const immediateTurnSlots = toStrictSlots(extractSlotsFromText(userTxt, pre.lang));
    const immediateDateRange = extractRawOrderedDateRange(userTxt);
    const knownSlots = mergeReservationSlots(pre.st?.reservationSlots, nextSlots, immediateTurnSlots);
    const hasBoundReservationTarget =
      pre.st?.activeReservationContext?.kind === "reservation" &&
      Boolean(pre.st?.activeReservationContext?.reservationId);
    const hasImmediateDateValue = Boolean(immediateDateRange?.checkIn && immediateDateRange?.checkOut);
    const hasImmediateGuestValue = Boolean(immediateTurnSlots.numGuests);
    const hasImmediateRoomValue = Boolean(immediateTurnSlots.roomType);
    const hasImplicitModifyValueFollowup =
      pre.inModifyMode &&
      (hasBoundReservationTarget || Boolean(selectedReservationTarget?.reservationId) || Boolean(resolveSingleActionableReservationTarget(pre.st)?.reservationId)) &&
      (hasImmediateDateValue || hasImmediateGuestValue || hasImmediateRoomValue);
    if (wantsChangeDates || wantsChangeRoom || wantsChangeGuests || hasImplicitModifyValueFollowup) {
      if ((pre.inModifyMode || pre.prevCategory === "modify_reservation") && (hasBoundReservationTarget || pre.prevCategory === "modify_reservation")) {
        const activeField: ModifyState["activeField"] =
          wantsChangeDates || hasImmediateDateValue ? "dates" : wantsChangeGuests || hasImmediateGuestValue ? "guests" : "roomType";
        const hasImmediateFieldValue =
          (activeField === "dates" && hasImmediateDateValue) ||
          (activeField === "guests" && hasImmediateGuestValue) ||
          (activeField === "roomType" && hasImmediateRoomValue);
        if (hasImmediateFieldValue) {
          const ingestedSlots = mergeReservationSlots(knownSlots, immediateDateRange);
          await updateConversationState(pre.msg.hotelId, pre.conversationId, {
            reservationSlots: {
              ...(pre.st?.reservationSlots || {}),
              ...ingestedSlots,
              locale: pre.lang,
            },
            modifyState: buildModifyState(activeField),
            conversationFocus: buildConversationFocus("modify"),
            activeFlow: "modify_reservation",
            desiredAction: "modify",
            lastCategory: "modify_reservation",
            updatedBy: "ai",
          } as any);
          finalText = activeField === "dates"
            ? (pre.lang === "es"
              ? "Perfecto. Tomo esas nuevas fechas para la modificación. ¿Querés cambiar algo más?"
              : pre.lang === "pt"
                ? "Perfeito. Considero essas novas datas para a alteração. Quer mudar mais alguma coisa?"
                : "Got it. I will use those new dates for the change. Would you like to change anything else?")
            : activeField === "guests"
              ? (pre.lang === "es"
                ? "Perfecto. Tomo esa nueva cantidad de huéspedes para la modificación. ¿Querés cambiar algo más?"
                : pre.lang === "pt"
                  ? "Perfeito. Considero essa nova quantidade de hóspedes na alteração. Quer mudar mais alguma coisa?"
                  : "Got it. I will use that new guest count for the change. Would you like to change anything else?")
              : (pre.lang === "es"
                ? "Perfecto. Tomo ese nuevo tipo de habitación para la modificación. ¿Querés cambiar algo más?"
                : pre.lang === "pt"
                  ? "Perfeito. Considero esse novo tipo de quarto na alteração. Quer mudar mais alguma coisa?"
                  : "Got it. I will use that new room type for the change. Would you like to change anything else?");
          nextSlots = ingestedSlots;
          return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };
        }
        await updateConversationState(pre.msg.hotelId, pre.conversationId, {
          modifyState: buildModifyState(activeField),
          conversationFocus: buildConversationFocus("modify"),
          activeFlow: "modify_reservation",
          desiredAction: "modify",
          lastCategory: "modify_reservation",
          updatedBy: "ai",
        } as any);
        if (wantsChangeDates) {
          finalText = buildAskNewDates(pre.lang);
        } else if (wantsChangeGuests) {
          finalText = pre.lang === "es"
            ? "¿Cuál sería la nueva cantidad de huéspedes?"
            : pre.lang === "pt"
              ? "Qual seria a nova quantidade de hóspedes?"
              : "What would be the new number of guests?";
        } else {
          finalText = pre.lang === "es"
            ? "¿Qué tipo de habitación querés ahora?"
            : pre.lang === "pt"
              ? "Qual tipo de quarto você quer agora?"
              : "Which room type would you like now?";
        }
        nextSlots = knownSlots;
        return { finalText, nextCategory: "modify_reservation", nextSlots, needsSupervision, graphResult };
      }
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
        ...(resolvedModifyTarget
          ? {
              guestName: resolvedModifyTarget.guestName,
              roomType: resolvedModifyTarget.roomType,
              numGuests: resolvedModifyTarget.numGuests,
              checkIn: resolvedModifyTarget.checkIn,
              checkOut: resolvedModifyTarget.checkOut,
            }
          : {}),
      } as ReservationSlotsStrict;
      if (resolvedModifyTarget?.reservationId) {
        await updateConversationState(pre.msg.hotelId, pre.conversationId, {
          reservationSlots: { ...knownSlots, locale: pre.lang },
          activeReservationContext: buildFocusedReservationContext(resolvedModifyTarget.reservationId, "confirmed"),
          modifyState: null,
          conversationFocus: buildConversationFocus("modify"),
          activeFlow: "modify_reservation",
          desiredAction: "modify",
          lastCategory: "modify_reservation",
          updatedBy: "ai",
        } as any);
      }
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
    const lateCheckoutQ = detectLateCheckoutQuestion(String(pre.msg.content || ""), pre.lang);
    const earlyCheckinQ = detectEarlyCheckinQuestion(String(pre.msg.content || ""), pre.lang);
    // Guard: si es una pregunta de horario de check-in/out, no dispares el flujo de cambio de fechas
    const timeQ = detectCheckinOrCheckoutTimeQuestion(String(pre.msg.content || ""), pre.lang);
    // Disparar flujo de fechas también si hay cualquier token de fecha corto o completo en el mensaje (dd/mm o dd/mm/yyyy)
    const hasAnyDateToken = /\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/.test(String(pre.msg.content || ''));
    const awaitingAvailabilityFollowup =
      Boolean((pre.st as any)?.pendingAvailabilityVerification) &&
      (
        isPureAffirmative(String(pre.msg.content || ""), pre.lang) ||
        isPureConfirm(String(pre.msg.content || "")) ||
        isAskAvailabilityStatusQuery(String(pre.msg.content || ""), pre.lang)
      );
    const triggerDateFlow =
      !awaitingAvailabilityFollowup &&
      !timeQ &&
      !lateCheckoutQ &&
      !earlyCheckinQ &&
      (pre.inModifyMode || mentionsDates || hasAnyDateToken || Boolean(userDates.checkIn || userDates.checkOut));

    if (lateCheckoutQ) {
      finalText = buildLateCheckoutResponse(pre.lang, guestState);
      nextCategory = "checkout_info";
      return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
    } else if (earlyCheckinQ) {
      const hotel = await getHotelConfig(pre.msg.hotelId).catch(() => null);
      const { checkIn: confCheckIn } = getConfiguredCheckTimes(hotel);
      finalText = buildEarlyCheckinResponse(pre.lang, guestState, {
        checkInTime: confCheckIn,
        asksLuggage: /\b(valijas?|equipaje|luggage|bags?|bagagem|malas?)\b/i.test(String(pre.msg.content || "")),
      });
      nextCategory = "checkin_info";
      return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
    } else if (timeQ) {
      const hasConfirmedBookingContext = Boolean(
        pre.st?.lastReservation?.reservationId ||
        pre.st?.salesStage === "close"
      );
      if (hasConfirmedBookingContext) {
        try {
          const hotel = await getHotelConfig(pre.msg.hotelId).catch(() => null);
          const { checkIn: confCheckIn, checkOut: confCheckOut } = getConfiguredCheckTimes(hotel);
          const asksCheckOut = detectDateSideFromText(String(pre.msg.content || "")) === "checkOut" || /check\s*-?out|salida|egreso|retirada|partida|sa[ií]da/i.test(String(pre.msg.content || ""));
          const time = asksCheckOut ? confCheckOut : confCheckIn;
          if (time && typeof time === "string") {
            finalText = pre.lang === "es"
              ? (asksCheckOut ? `El check-out es hasta las ${time}.` : `El check-in comienza a las ${time}.`)
              : pre.lang === "pt"
                ? (asksCheckOut ? `O check-out vai até ${time}.` : `O check-in começa às ${time}.`)
                : (asksCheckOut ? `Check-out is until ${time}.` : `Check-in starts at ${time}.`);
          } else {
            finalText = pre.lang === "es"
              ? "Puedo consultarlo con recepción y confirmarte el horario exacto de tu reserva."
              : pre.lang === "pt"
                ? "Posso consultar a recepção e confirmar o horário exato da sua reserva."
                : "I can check with reception and confirm the exact time for your booking.";
          }
          nextCategory = asksCheckOut ? "checkout_info" : "checkin_info";
          return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
        } catch {
          finalText = pre.lang === "es"
            ? "Puedo consultarlo con recepción y confirmarte el horario exacto de tu reserva."
            : pre.lang === "pt"
              ? "Posso consultar a recepção e confirmar o horário exato da sua reserva."
              : "I can check with reception and confirm the exact time for your booking.";
          nextCategory = /check\s*-?out|salida|egreso|retirada|partida|sa[ií]da/i.test(String(pre.msg.content || "")) ? "checkout_info" : "checkin_info";
          return { finalText, nextCategory, nextSlots, needsSupervision, graphResult };
        }
      }
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
  if (isVerifyAvailabilityAffirmative) {
    const proposed = getProposedAvailabilityRange(pre.lcHistory);
    const ciISO = pendingAvailabilityVerification?.checkIn || proposed.checkIn || nextSlots.checkIn || pre.st?.reservationSlots?.checkIn;
    const coISO = pendingAvailabilityVerification?.checkOut || proposed.checkOut || nextSlots.checkOut || pre.st?.reservationSlots?.checkOut;
    const createQuoteSlots = mergeReservationSlots(pre.st?.reservationSlots, pre.currSlots, nextSlots, {
      checkIn: ciISO,
      checkOut: coISO,
    });
    if (quoteGatedCreateFlow) {
      const createDraftConsistency = validateCreateDraftConsistency(pre.lang, createQuoteSlots);
      if (!createDraftConsistency.valid) {
        await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);
        finalText = createDraftConsistency.message;
        return {
          finalText,
          nextCategory: "reservation",
          nextSlots: { ...createDraftConsistency.sanitizedSlots },
          needsSupervision,
          graphResult,
        };
      }
    }
    if (quoteGatedCreateFlow && !isCreateStateReadyForQuote(createQuoteSlots)) {
      const missingField = getNextCreateFlowMissingField(createQuoteSlots);
      if (missingField) {
        await persistCreateDraft(pre, createQuoteSlots);
        finalText = buildCreateFlowPrompt(pre.lang, missingField);
        return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };
      }
    }
    const ci = ciISO ? (isoToDDMMYYYY(ciISO) || ciISO) : undefined;
    const co = coISO ? (isoToDDMMYYYY(coISO) || coISO) : undefined;
    if (ci && co) {
      const availabilityDateCoherence = assessReservationDateCoherence(ciISO, coISO);
      if (availabilityDateCoherence && !availabilityDateCoherence.ok) {
        finalText = buildInvalidReservationDatesReply(pre.lang, availabilityDateCoherence.reason);
        return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };
      }
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
        if (modifyExecutionActive) {
          const modifyReservationId = getModifyExecutionReservationId(pre, reservationReference, resolvedModifyTarget);
          await persistModifyExecutionContext(pre, modifyReservationId, {
            reservationSlots: {
              ...(pre.st?.reservationSlots || {}),
              ...(res.nextSlots || {}),
              locale: pre.lang,
            },
            lastProposal: {
              text: finalText,
              available: true,
            },
            salesStage: "quote",
            conversationStage: "reservation_quoted",
            pendingAvailabilityVerification: null,
          });
          nextCategory = "modify_reservation";
        } else {
          await updateConversationState(pre.msg.hotelId, pre.conversationId, {
            pendingAvailabilityVerification: null,
            lastCategory: "reservation",
            updatedBy: "ai",
          } as any);
        }
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
      const createQuoteSlots = mergeReservationSlots(pre.st?.reservationSlots, pre.currSlots, nextSlots, {
        checkIn: ciISO,
        checkOut: coISO,
      });
      if (quoteGatedCreateFlow) {
        const createDraftConsistency = validateCreateDraftConsistency(pre.lang, createQuoteSlots);
        if (!createDraftConsistency.valid) {
          await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);
          finalText = createDraftConsistency.message;
          return {
            finalText,
            nextCategory: "reservation",
            nextSlots: { ...createDraftConsistency.sanitizedSlots },
            needsSupervision,
            graphResult,
          };
        }
      }
      if (quoteGatedCreateFlow && !isCreateStateReadyForQuote(createQuoteSlots)) {
        const missingField = getNextCreateFlowMissingField(createQuoteSlots);
        if (missingField) {
          await persistCreateDraft(pre, createQuoteSlots);
          finalText = buildCreateFlowPrompt(pre.lang, missingField);
          return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };
        }
      }
      if (ciISO && coISO) {
        const availabilityStatusDateCoherence = assessReservationDateCoherence(ciISO, coISO);
        if (availabilityStatusDateCoherence && !availabilityStatusDateCoherence.ok) {
          finalText = buildInvalidReservationDatesReply(pre.lang, availabilityStatusDateCoherence.reason);
          return { finalText, nextCategory: "reservation", nextSlots, needsSupervision, graphResult };
        }
        const res = await runAvailabilityCheck(pre, { ...nextSlots }, ciISO, coISO);
        finalText = res.finalText;
        nextSlots = { ...nextSlots, ...res.nextSlots };
        if (modifyExecutionActive) {
          const modifyReservationId = getModifyExecutionReservationId(pre, reservationReference, resolvedModifyTarget);
          await persistModifyExecutionContext(pre, modifyReservationId, {
            reservationSlots: {
              ...(pre.st?.reservationSlots || {}),
              ...(res.nextSlots || {}),
              locale: pre.lang,
            },
            lastProposal: {
              text: finalText,
              available: true,
            },
            salesStage: "quote",
            conversationStage: "reservation_quoted",
          });
          nextCategory = "modify_reservation";
        }
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
  const promptKeyUsed = String((graphResult as any)?.classified?.promptKey || "");
  const isAmenitiesTurn =
    nextCategory === "amenities" ||
    nextCategory === "amenities_info" ||
    ["amenities_list", "pool_gym_spa", "breakfast_bar", "parking"].includes(promptKeyUsed);
  const isBillingTurn =
    nextCategory === "billing" ||
    ["payments_and_billing", "invoice_receipts"].includes(promptKeyUsed);
  const isSupportTurn =
    nextCategory === "support" ||
    ["contact_support"].includes(promptKeyUsed);
  if (isAmenitiesTurn) {
    finalText = stripOffTopicAmenitiesTail(String(finalText || ""), pre.lang);
    finalText = applyCommittedHotelTone(String(finalText || ""), pre.lang);
  }
  if (isBillingTurn) {
    finalText = await harmonizeBillingCurrencyAnswer(
      String(finalText || ""),
      String(pre.msg.content || ""),
      pre.msg.hotelId,
      pre.lang
    );
    finalText = stripOffTopicBillingTail(String(finalText || ""), pre.lang);
    finalText = ensureBillingContextualFollowup(String(finalText || ""), pre.lang);
  }
  if (isSupportTurn) {
    finalText = applyCommittedHotelTone(String(finalText || ""), pre.lang);
  }
  const focusAfterTurn = getConversationFocus(pre.st);
  const focusTurnExtractedSlots = extractSlotsFromText(String(pre.msg.content || ""), pre.lang);
  const focusTurnHasReservationData = Boolean(
    focusTurnExtractedSlots.checkIn ||
    focusTurnExtractedSlots.checkOut ||
    focusTurnExtractedSlots.roomType ||
    focusTurnExtractedSlots.numGuests ||
    looksLikeName(String(pre.msg.content || "")) ||
    extractRawOrderedDateRange(String(pre.msg.content || ""))?.checkIn
  );
  if (
    shouldAppendFocusContinuation(pre, focusAfterTurn, {
      isLateralTurn: isAmenitiesTurn,
      turnHasReservationData: focusTurnHasReservationData,
    })
  ) {
    const continuation = buildFocusContinuationPrompt(pre, focusAfterTurn, nextSlots);
    if (continuation) {
      finalText = `${String(finalText || "").trim()} ${continuation}`.trim();
    }
  }
  if (shouldClearSelectedReservationTargetForCategory(nextCategory, promptKeyUsed)) {
    await updateConversationState(pre.msg.hotelId, pre.conversationId, {
      selectedReservationTarget: null,
      updatedBy: "ai",
    } as any);
  }
  const quotedReservationSnapshot = {
    guestName:
      pre.st?.reservationSlots?.guestName ||
      nextSlots.guestName ||
      (isSafeGuestName(String(pre.msg.content || "").trim()) ? String(pre.msg.content || "").trim() : undefined),
    roomType: pre.st?.reservationSlots?.roomType || nextSlots.roomType,
    checkIn: pre.st?.reservationSlots?.checkIn || nextSlots.checkIn,
    checkOut: pre.st?.reservationSlots?.checkOut || nextSlots.checkOut,
    numGuests: pre.st?.reservationSlots?.numGuests || nextSlots.numGuests,
    locale: pre.lang,
  };
  if (
    quoteGatedCreateFlow &&
    !modifyExecutionActive &&
    !hasConfirmedBookingContext &&
    (isQuoteOrConfirmText(String(finalText || ""), pre.lang) || isVerifyAvailabilityPrompt(String(finalText || "")))
  ) {
    const createDraftConsistency = validateCreateDraftConsistency(pre.lang, quotedReservationSnapshot as ReservationSlotsStrict);
    if (!createDraftConsistency.valid) {
      await persistCreateDraftSnapshot(pre, createDraftConsistency.sanitizedSlots);
      nextCategory = "reservation";
      finalText = createDraftConsistency.message;
    } else if (!isCreateStateReadyForQuote(quotedReservationSnapshot as ReservationSlotsStrict)) {
      const missingField = getNextCreateFlowMissingField(quotedReservationSnapshot as ReservationSlotsStrict);
      if (missingField) {
        await persistCreateDraft(pre, quotedReservationSnapshot as ReservationSlotsStrict);
        nextCategory = "reservation";
        finalText = buildCreateFlowPrompt(pre.lang, missingField);
      }
    }
  }
  if (
    !modifyExecutionActive &&
    isQuoteOrConfirmText(String(finalText || ""), pre.lang) &&
    quotedReservationSnapshot.roomType &&
    quotedReservationSnapshot.checkIn &&
    quotedReservationSnapshot.checkOut &&
    quotedReservationSnapshot.numGuests &&
    isSafeGuestName(quotedReservationSnapshot.guestName || "")
  ) {
    await updateConversationState(pre.msg.hotelId, pre.conversationId, {
      reservationSlots: quotedReservationSnapshot,
      lastProposal: {
        text: String(finalText || ""),
        available: true,
      },
      conversationFocus: buildConversationFocus("create"),
      activeReservationContext: buildDraftReservationContext("quoted"),
      activeFlow: "reservation",
      desiredAction: "create",
      salesStage: "quote",
      conversationStage: "reservation_quoted",
      lastCategory: "reservation",
      updatedBy: "ai",
    } as any);
  }
  finalText = stripGlobalTailNoise(String(finalText || ""));
  const rich = explicitRich ?? (graphResult as any)?.meta?.rich;
  if (!(graphResult as any)?.meta?.debug?.route_source && finalText) {
    emitRoutingDecision(pre.msg, {
      decision_layer: "bodyLLM",
      route_source: "bodyLLM_postprocess",
      route_match: "final_text_emitted",
      early_return: false,
      used_llm_classifier: false,
      classifier_source: "fallback",
      final_category: nextCategory,
      final_prompt_key:
        (graphResult as any)?.promptKey ||
        (graphResult as any)?.classified?.promptKey ||
        null,
    });
  }
  debugLog("[bodyLLM] OUT", { finalText, nextCategory, nextSlots, needsSupervision, graphResult });
  return { finalText, nextCategory, nextSlots, needsSupervision, graphResult, rich };
}

function stripOffTopicAmenitiesTail(text: string, lang: "es" | "en" | "pt"): string {
  const raw = String(text || "").trim();
  if (!raw) return raw;
  const patterns =
    lang === "es"
      ? [
        /(?:\n|\r\n){1,}si deseas explorar la zona[\s\S]*$/i,
        /(?:\n|\r\n){1,}te recomiendo visitar[\s\S]*$/i,
        /(?:\n|\r\n){1,}¿hay alguna actividad específica[\s\S]*$/i,
      ]
      : lang === "pt"
        ? [
          /(?:\n|\r\n){1,}se quiser explorar a regi[aã]o[\s\S]*$/i,
          /(?:\n|\r\n){1,}recomendo visitar[\s\S]*$/i,
        ]
        : [
          /(?:\n|\r\n){1,}if you want to explore the area[\s\S]*$/i,
          /(?:\n|\r\n){1,}i recommend visiting[\s\S]*$/i,
        ];
  let out = raw;
  for (const re of patterns) out = out.replace(re, "").trim();
  return out;
}

function stripOffTopicBillingTail(text: string, lang: "es" | "en" | "pt"): string {
  const raw = String(text || "").trim();
  if (!raw) return raw;
  const patterns =
    lang === "es"
      ? [
        /(?:\n|\r\n){1,}¿prefer[íi]s opciones tranquilas o con m[aá]s movimiento\??[\s\S]*$/i,
        /(?:\n|\r\n){1,}si deseas explorar la zona[\s\S]*$/i,
        /(?:\n|\r\n){1,}te recomiendo visitar[\s\S]*$/i,
        /(?:\n|\r\n){1,}¿le gustar[íi]a saber m[aá]s sobre alg[uú]n otro servicio o actividad en la zona\??[\s\S]*$/i,
        /(?:\n|\r\n){1,}¿te gustar[íi]a saber m[aá]s sobre las actividades en la zona\??[\s\S]*$/i,
        /(?:\n|\r\n){1,}¿hay alg[uú]n otro aspecto en el que pueda ayudarle\??[\s\S]*$/i,
      ]
      : lang === "pt"
        ? [
          /(?:\n|\r\n){1,}voc[eê] prefere op[cç][oõ]es tranquilas ou com mais movimento\??[\s\S]*$/i,
          /(?:\n|\r\n){1,}gostaria de saber mais sobre algum outro servi[cç]o ou atividade na regi[aã]o\??[\s\S]*$/i,
        ]
        : [
          /(?:\n|\r\n){1,}do you prefer quiet options or more activity\??[\s\S]*$/i,
          /(?:\n|\r\n){1,}would you like to know more about other services or activities in the area\??[\s\S]*$/i,
        ];
  let out = raw;
  for (const re of patterns) out = out.replace(re, "").trim();
  return out;
}

async function harmonizeBillingCurrencyAnswer(
  answer: string,
  userText: string,
  hotelId: string,
  lang: "es" | "en" | "pt"
): Promise<string> {
  const norm = String(userText || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const asksAcceptance = /(aceptan|acepta|pagar con|pay with|accept|aceitam|aceita|pagar com)/i.test(norm);
  if (!asksAcceptance) return answer;

  const aliases: Array<{ code: string; re: RegExp }> = [
    { code: "BTC", re: /\b(btc|bitcoin)\b/i },
    { code: "USDT", re: /\b(usdt|tether)\b/i },
    { code: "ETH", re: /\b(eth|ethereum)\b/i },
    { code: "USDC", re: /\b(usdc)\b/i },
  ];
  const hit = aliases.find((a) => a.re.test(norm));
  if (!hit) return answer;

  try {
    const cfg = await getHotelConfig(hotelId);
    const currencies = new Set<string>(
      [
        ...(Array.isArray((cfg as any)?.payments?.currencies) ? (cfg as any).payments.currencies : []),
        (cfg as any)?.payments?.currency,
      ]
        .filter(Boolean)
        .map((x: any) => String(x).trim().toUpperCase())
    );
    const accepted = currencies.has(hit.code);
    if (accepted) {
      const isNegative = new RegExp(`\\b(no\\s+aceptamos|no\\s+admitimos)\\b[\\s\\S]*\\b${hit.code}\\b`, "i").test(answer);
      if (!isNegative) return answer;
      return lang === "es"
        ? `Sí, ${hit.code} está habilitado actualmente como medio de pago.\n\n¿Querés que te detalle monedas y comprobantes disponibles?`
        : lang === "pt"
          ? `Sim, ${hit.code} está habilitado atualmente como meio de pagamento.\n\nQuer que eu detalhe moedas e comprovantes disponíveis?`
          : `Yes, ${hit.code} is currently enabled as a payment method.\n\nDo you want details on available currencies and invoices?`;
    }

    const enabledList = Array.from(currencies).join(", ") || (lang === "es" ? "sin monedas configuradas" : lang === "pt" ? "sem moedas configuradas" : "no currencies configured");
    return lang === "es"
      ? `Por el momento ${hit.code} está deshabilitado. Si querés, lo consulto con recepción y te confirmo alternativas para tu reserva.\n\nMonedas habilitadas hoy: ${enabledList}.`
      : lang === "pt"
        ? `No momento, ${hit.code} está desabilitado. Se quiser, consulto a recepção e confirmo alternativas para a sua reserva.\n\nMoedas habilitadas hoje: ${enabledList}.`
        : `At the moment, ${hit.code} is disabled. If you want, I can check with reception and confirm alternatives for your booking.\n\nEnabled currencies today: ${enabledList}.`;
  } catch {
    return answer;
  }
}

function ensureBillingContextualFollowup(text: string, lang: "es" | "en" | "pt"): string {
  const out = String(text || "").trim();
  if (!out) return out;
  const hasQuestion = /[?؟]\s*$/.test(out) || /\n\s*[-*]\s*¿/.test(out);
  if (hasQuestion) return out;
  const followup =
    lang === "es"
      ? "¿Querés que te detalle medios, monedas o comprobantes?"
      : lang === "pt"
        ? "Quer que eu detalhe meios de pagamento, moedas ou comprovantes?"
        : "Do you want details on payment methods, currencies, or invoices?";
  return `${out}\n\n${followup}`;
}

async function buildDeterministicBillingReply(
  hotelId: string,
  lang: "es" | "en" | "pt",
  userText: string
): Promise<string> {
  try {
    const cfg = await getHotelConfig(hotelId);
    const methods = Array.isArray((cfg as any)?.payments?.methods) ? (cfg as any).payments.methods : [];
    const currencies = Array.isArray((cfg as any)?.payments?.currencies)
      ? (cfg as any).payments.currencies
      : ((cfg as any)?.payments?.currency ? [(cfg as any).payments.currency] : []);
    const requiresCard = Boolean((cfg as any)?.payments?.requiresCardForBooking);
    const issuesInvoices = Boolean((cfg as any)?.billing?.issuesInvoices);
    const docs = Array.isArray((cfg as any)?.billing?.invoiceNotesTags) ? (cfg as any).billing.invoiceNotesTags : [];

    const textNorm = (userText || "").toLowerCase();
    const asksCurrency = /(moneda|monedas|currency|currencies|moeda|moedas)/i.test(textNorm);
    const asksAcceptance = /(aceptan|acepta|pagar con|pay with|accept|aceitam|aceita|pagar com)/i.test(textNorm);
    const asksInvoices = /(factura|facturas|invoice|invoices|comprobante|comprobantes|recibo|recibos)/i.test(textNorm);
    const alias: Array<{ code: string; re: RegExp }> = [
      { code: "BTC", re: /\b(btc|bitcoin)\b/i },
      { code: "USDT", re: /\b(usdt|tether)\b/i },
      { code: "ETH", re: /\b(eth|ethereum)\b/i },
      { code: "USDC", re: /\b(usdc)\b/i },
    ];
    const hit = alias.find((a) => a.re.test(textNorm));
    const accepted = hit ? currencies.map((c: any) => String(c).toUpperCase()).includes(hit.code) : false;

    if (lang === "pt") {
      if (asksAcceptance && hit) {
        return accepted
          ? `Sim, aceitamos ${hit.code} no momento.\n\nMoedas habilitadas hoje: ${currencies.join(", ") || "(a confirmar)"}.\nQuer que eu detalhe meios de pagamento e comprovantes?`
          : `No momento, ${hit.code} está desabilitado. Se quiser, consulto a recepção e confirmo alternativas para a sua reserva.\n\nMoedas habilitadas hoje: ${currencies.join(", ") || "(a confirmar)"}.`;
      }
      if (asksCurrency) return `Moedas habilitadas hoje: ${currencies.join(", ") || "(a confirmar)"}.\n\nQuer que eu detalhe meios de pagamento e comprovantes?`;
      if (asksInvoices) return `Emitimos fatura: ${issuesInvoices ? "sim" : "por enquanto não"}.\nComprovantes: ${docs.join(", ") || "(a confirmar)"}.\n\nQuer que eu detalhe meios de pagamento e moedas?`;
      return `Meios de pagamento habilitados: ${methods.join(", ") || "(a confirmar)"}.\nMoedas habilitadas: ${currencies.join(", ") || "(a confirmar)"}.\nGarantia com cartão: ${requiresCard ? "sim" : "não"}.\nFatura: ${issuesInvoices ? "sim" : "a confirmar"}.\n\nQuer que eu detalhe meios, moedas ou comprovantes?`;
    }
    if (lang === "en") {
      if (asksAcceptance && hit) {
        return accepted
          ? `Yes, ${hit.code} is currently enabled.\n\nEnabled currencies today: ${currencies.join(", ") || "(to be confirmed)"}.\nDo you want details on payment methods and invoices?`
          : `At the moment, ${hit.code} is disabled. If you want, I can check with reception and confirm alternatives for your booking.\n\nEnabled currencies today: ${currencies.join(", ") || "(to be confirmed)"}.`;
      }
      if (asksCurrency) return `Enabled currencies today: ${currencies.join(", ") || "(to be confirmed)"}.\n\nDo you want details on payment methods and invoices?`;
      if (asksInvoices) return `Invoices issued: ${issuesInvoices ? "yes" : "currently disabled"}.\nInvoice documents: ${docs.join(", ") || "(to be confirmed)"}.\n\nDo you want details on payment methods and currencies?`;
      return `Enabled payment methods: ${methods.join(", ") || "(to be confirmed)"}.\nEnabled currencies: ${currencies.join(", ") || "(to be confirmed)"}.\nCard required for guarantee: ${requiresCard ? "yes" : "no"}.\nInvoices: ${issuesInvoices ? "yes" : "to be confirmed"}.\n\nDo you want details on methods, currencies, or invoices?`;
    }

    if (asksAcceptance && hit) {
      return accepted
        ? `Sí, ${hit.code} está habilitado por el momento.\n\nMonedas habilitadas hoy: ${currencies.join(", ") || "(a confirmar)"}.\n¿Querés que te detalle medios de pago y comprobantes?`
        : `Por el momento ${hit.code} está deshabilitado. Si querés, lo consulto con recepción y te confirmo alternativas para tu reserva.\n\nMonedas habilitadas hoy: ${currencies.join(", ") || "(a confirmar)"}.`;
    }
    if (asksCurrency) return `Monedas habilitadas hoy: ${currencies.join(", ") || "(a confirmar)"}.\n\n¿Querés que te detalle medios de pago y comprobantes?`;
    if (asksInvoices) return `Emitimos factura: ${issuesInvoices ? "sí" : "por el momento no"}.\nComprobantes: ${docs.join(", ") || "(a confirmar)"}.\n\n¿Querés que te detalle medios de pago y monedas?`;
    return `Medios de pago habilitados: ${methods.join(", ") || "(a confirmar)"}.\nMonedas habilitadas: ${currencies.join(", ") || "(a confirmar)"}.\nTarjeta para garantía: ${requiresCard ? "sí" : "no"}.\nFactura: ${issuesInvoices ? "sí" : "a confirmar"}.\n\n¿Querés que te detalle medios, monedas o comprobantes?`;
  } catch {
    if (lang === "pt") return "Posso te ajudar com pagamentos e faturamento. Quer que eu detalhe meios, moedas ou comprovantes?";
    if (lang === "en") return "I can help with payments and billing. Do you want details on methods, currencies, or invoices?";
    return "Puedo ayudarte con pagos y facturación. ¿Querés que te detalle medios, monedas o comprobantes?";
  }
}

function applyCommittedHotelTone(text: string, lang: "es" | "en" | "pt"): string {
  let out = String(text || "").trim();
  if (!out) return out;

  if (lang === "es") {
    out = out
      .replace(/\blamentablemente,\s*no\b/gi, "Por el momento")
      .replace(/\blamentamos,\s*pero\s*no\b/gi, "Por el momento")
      .replace(/\bno est[aá] habilitad[oa]\b/gi, "por el momento no está habilitado")
      .replace(/\bno est[aá] disponible\b/gi, "por el momento no está disponible")
      .replace(/\bno contamos con\b/gi, "por el momento no contamos con")
      .replace(/\bno hay\b/gi, "por el momento no hay")
      .replace(/(^|\n)\s*no\s+([a-záéíóúñ])/gi, "$1Por el momento no $2");

    const hasRestriction = /(por el momento no est[aá]|por el momento no contamos|por el momento no hay)/i.test(out);
    const hasProactive = /(si quer[eé]s.*consult|te lo consulto|te confirmo alternativas|puedo consultarlo)/i.test(out);
    if (hasRestriction && !hasProactive) {
      out = `${out}\n\nSi querés, lo consulto con recepción y te confirmo alternativas para tu estadía.`;
    }
  }

  if (lang === "pt") {
    out = out
      .replace(/\bn[aã]o est[aá] habilitad[oa]\b/gi, "no momento, não está habilitado")
      .replace(/\bn[aã]o est[aá] dispon[ií]vel\b/gi, "no momento, não está disponível")
      .replace(/\bn[aã]o contamos com\b/gi, "no momento, não contamos com");
  }

  if (lang === "en") {
    out = out
      .replace(/\bis not enabled\b/gi, "is currently not enabled")
      .replace(/\bis not available\b/gi, "is currently not available");
  }

  return out;
}

function stripGlobalTailNoise(text: string): string {
  let out = String(text || "").trim();
  if (!out) return out;
  const patterns = [
    /(?:\n|\r\n){1,}¿prefer[íi]s opciones tranquilas o con m[aá]s movimiento\??[\s\S]*$/i,
    /(?:\n|\r\n){1,}preferis opciones tranquilas o con mas movimiento\??[\s\S]*$/i,
    /(?:\n|\r\n){1,}do you prefer quiet options or more activity\??[\s\S]*$/i,
    /(?:\n|\r\n){1,}voc[eê] prefere op[cç][oõ]es tranquilas ou com mais movimento\??[\s\S]*$/i,
  ];
  for (const re of patterns) out = out.replace(re, "").trim();
  return out;
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
  const normalizedReservationIntent = normalizeReservationIntent(text || "");
  if (normalizedReservationIntent.kind === "modify") return true;
  if (normalizedReservationIntent.kind !== "other") return false;
  if (/\b(modificar|cambiar|alterar|mudar|change|edit|update)\b.*\b(si|if|se)\b.*\b(hay|have|tem|availability|disponibilidad|lugar)\b/i.test(normalizedReservationIntent.normalizedText)) {
    return false;
  }
  if (lang === "es") return /((quiero|quisiera|deseo)\s+(modificar|cambiar)(la|lo|mi|\b))|\b(modifica|modificá|modificá|cambia|cambiá)\b/i.test(t);
  if (lang === "pt") return /(quero|gostaria de|desejo)\s+(modificar|mudar|alterar)(\s|$)/i.test(t);
  return /(i\s+want\s+to\s+)?(modify|change)(\s+it|\s+(?:my\s+)?booking|\s+reservation|$)/i.test(t);
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
  const candidates = String(text || "").match(/[A-Z0-9-]{5,24}/gi) || [];
  for (const candidate of candidates) {
    const normalized = candidate.toUpperCase();
    if (!/^[A-Z][A-Z0-9-]{4,23}$/.test(normalized)) continue;
    if (!/\d/.test(normalized)) continue;
    return normalized;
  }
  return undefined;
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
  if (process.env.DEBUG_ROUTING === "1") {
    debugLog("[routing] handleIncomingMessage input", {
      conversationId: msg.conversationId,
      content: msg.content,
      hotelId: msg.hotelId,
      mode: options?.mode,
    });
  }
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
    if (process.env.DEBUG_ROUTING === "1") {
      debugLog("[mh][flags]", { GRAPH_ENABLED, ORCH_ENABLED, pipelineEnabled, skipPrePos });
    }
    if (!skipPrePos) {
      if (!(globalThis as any).__loggedPrePosOnce) {
        (globalThis as any).__loggedPrePosOnce = true;
        debugLog('[pipeline] Activado preLLM/posLLM (USE_PRE_POS_PIPELINE=1)');
      }
    } else if (!(globalThis as any).__loggedSkipOnce) {
      (globalThis as any).__loggedSkipOnce = true;
      debugLog('[pipeline] Modo compacto (solo bodyLLM). Set USE_PRE_POS_PIPELINE=1 para activar fases.');
    }
    let pre: PreLLMResult;
    if (skipPrePos) {
      if (process.env.DEBUG_ROUTING === "1") {
        debugLog("[routing] before getObjectiveContext", { conversationId: msg.conversationId, content: msg.content });
      }
      // Inicializa contexto objetivo antes de bodyLLM
      const ctx = await getObjectiveContext(msg, options);
      if (process.env.DEBUG_ROUTING === "1") {
        debugLog("[routing] after getObjectiveContext", { conversationId: msg.conversationId, lang: ctx.lang, prevCategory: ctx.prevCategory });
      }
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
    if (process.env.DEBUG_ROUTING === "1") {
      debugLog("[mh][branch]", { GRAPH_ENABLED, ORCH_ENABLED, skipPrePos });
    }
    if (GRAPH_ENABLED) {
      try { if (IS_TEST) debugLog('[mh][branch] GRAPH_ENABLED=true → invoking orchestratorProxy'); } catch { }
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
      try { if (IS_TEST) debugLog('[mh][branch] GRAPH_ENABLED=false → legacy path'); } catch { }
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
    const verifyPendingSnapshot =
      shouldPersistCreateAvailabilityVerification(pre, body?.nextCategory, body?.nextSlots, body?.finalText)
      ? {
          checkIn: body.nextSlots.checkIn,
          checkOut: body.nextSlots.checkOut,
        }
      : null;
    if (verifyPendingSnapshot) {
      try {
        await updateConversationState(pre.msg.hotelId, pre.conversationId, {
          reservationSlots: body.nextSlots,
          pendingAvailabilityVerification: verifyPendingSnapshot,
          lastCategory: body?.nextCategory ?? pre.prevCategory ?? "reservation",
          updatedBy: "ai",
        } as any);
      } catch (e) {
        console.warn("[handleIncomingMessage] verify-pending persist warn:", (e as any)?.message || e);
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
      debugLog("[autosend] FORCE_GENERATION activo → override needsSupervision=false (dev)");
      }
      needsSupervision = false;
    }
    const suggestion = body.finalText;
    debugLog("[handleIncomingMessage] suggestion", suggestion);
    // Payload enriquecido opcional emitido desde el grafo (p.ej., room-info-img)
    const richPayload: RichPayload | undefined = (body as any)?.rich ?? (body as any)?.graphResult?.meta?.rich;
    // ===== Agent: SupervisorDecision =====
    const respCategory = (body?.graphResult?.category || body?.nextCategory || pre.prevCategory) as string | undefined;
    const respPromptKey = (
      body?.graphResult?.promptKey ||
      body?.graphResult?.classified?.promptKey ||
      pre.promptKey ||
      null
    ) as string | null;
    const respContentVersion = (
      body?.graphResult?.resolved?.content?.version ||
      body?.graphResult?.debug?.resolved?.content?.version ||
      null
    ) as string | null;
    const respSource = (
      body?.graphResult?.source ||
      null
    ) as string | null;
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
    const riskLevel = decideRiskLevel({
      category: respCategory,
      salesStage: respSalesStage,
      needsSupervision,
      isSafeCategory: safeCat,
    });
    const riskPolicyDecision = applyRiskPolicyToSupervisorDecision({
      combinedMode,
      supervisorStatus: decision.status,
      riskLevel,
    });
    const finalStatus = riskPolicyDecision.finalStatus;
    debugLog("[autosend]", { category: respCategory, salesStage: respSalesStage, mode: combinedMode, autosendReason: decision.autosendReason });
    if (riskPolicyDecision.autoApproved) {
      debugLog("[PIPELINE_AUTO_APPROVED_BY_POLICY]", {
        hotelId: pre.msg.hotelId,
        channel: pre.msg.channel,
        guestId: pre.msg.guestId,
        category: respCategory ?? null,
        salesStage: respSalesStage ?? null,
        riskLevel,
        autosendReason: decision.autosendReason,
        reason: riskPolicyDecision.reason,
        finalStatus,
      });
    }

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
      status: finalStatus,
      timestamp: safeNowISO(),
      direction: 'out',
      detectedLanguage: pre.lang,
      respondedBy: needsSupervision ? "assistant" : undefined,
      meta: {
        responseTrace: {
          category: respCategory ?? null,
          promptKey: respPromptKey,
          contentVersion: respContentVersion,
          source: respSource,
        },
      },
    } as ChannelMessage;
    if (richPayload) (aiMsg as any).rich = richPayload;

    // Telemetry: count autosend decision
    try {
      const autosendReason = riskPolicyDecision.autoApproved ? "safe_category" : decision.autosendReason;
      incAutosend(autosendReason, respCategory ?? "unknown", aiMsg.status === "sent");
    } catch { /* metrics are best-effort */ }
    if ((pre.msg as any).sourceProvider) {
      (aiMsg as any).sourceProvider = (pre.msg as any).sourceProvider;
    }
    debugLog("[handleIncomingMessage] aiMsg", aiMsg);
    (aiMsg as any).audit = verdictInfo ? { verdict: verdictInfo, llm: llmInterp } : undefined;
    await saveChannelMessageToAstra(aiMsg);
    try {
      await appendConversationReplyTrace(pre.conversationId, {
        messageId: aiMsg.messageId,
        timestamp: aiMsg.timestamp,
        category: respCategory ?? null,
        promptKey: respPromptKey,
        contentVersion: respContentVersion,
        source: respSource,
      }, 300);
    } catch (e) {
      console.warn("[conversation-trace] stamp warn:", (e as any)?.message || e);
    }
    channelMemory.addMessage(aiMsg);
    try {
      if (aiMsg.status === "sent") {
        debugLog("📤 [reply] via adapter?", !!pre.options?.sendReply, { len: suggestion.length });
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
