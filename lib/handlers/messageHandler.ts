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
import { normalizeNameCase, toISODateDDMMYYYY, extractSlotsFromText, isSafeGuestName } from "@/lib/agents/helpers";
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
};
// ----------------------

const IS_TEST = false;
export const MH_VERSION = "mh-2025-09-16-02";
console.log("[messageHandler] loaded:", MH_VERSION);
console.log("[messageHandler] using convState:", CONVSTATE_VERSION);



// ---------- helpers locales ----------
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

// función extractSlotsFromText extraída a helpers.ts

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
  return es ? "¿En qué puedo ayudarte? Nuestro equipo está disponible para asistirte."
    : pt ? "Em que posso ajudar? Nossa equipe está disponível para te atender."
      : "How can I help you? Our team is here for you.";
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

// *************************************************
const convQueues = new Map<string, Promise<any>>();
function runQueued<T>(convId: string, fn: () => Promise<T>): Promise<T> {
  const prev = convQueues.get(convId) || Promise.resolve();
  const next = prev.then(fn, fn);
  convQueues.set(convId, next.finally(() => { if (convQueues.get(convId) === next) convQueues.delete(convId); }));
  // @ts-ignore
  return next;
}
// función isSafeGuestName extraída a helpers.ts
// *************************************************
export async function handleIncomingMessage(
  msg: ChannelMessage,
  options?: {
    sendReply?: (reply: string) => Promise<void>; mode?: ChannelMode; skipPersistIncoming?: boolean;
  }
): Promise<void> {
  const lockId = msg.conversationId || `${msg.hotelId}-${msg.channel}-${(msg.sender || msg.guestId || "guest")}`;
  // Aseguramos orden serial por conversación
  //
  return runQueued(lockId, async () => {
    const now = safeNowISO();
    msg.messageId ||= crypto.randomUUID();
    msg.role ||= "user";
    msg.timestamp ||= now;

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
      if (existing) { console.log("🔁 [idempotency] ya existe ese sourceMsgId → corto"); return; }
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
    const lang = (msg.detectedLanguage || "es").toLowerCase();
    const recent = await getRecentHistorySafe(msg.hotelId, msg.channel, conversationId, CONFIG.HISTORY_LIMIT);
    const lcHistory = recent.map(toLC).filter(Boolean) as (HumanMessage | AIMessage)[];

    // --- Novedad: slots del turno actual (pre-LLM) → evitar re-preguntas
    const turnSlots = extractSlotsFromText(String(msg.content || ""), lang);
    // fusionamos: lo nuevo del turno tiene prioridad (si el usuario corrigió algo)
    const currSlots: ReservationSlotsStrict = { ...(prevSlotsStrict || {}), ...(turnSlots || {}) };

    // LOG: currSlots después de fusionar turnSlots y prevSlots
    console.log('[DEBUG-numGuests] currSlots:', JSON.stringify(currSlots));

    // Estado compacto para playbook
    const draftExists = !!currSlots.guestName || !!currSlots.roomType || !!currSlots.checkIn || !!currSlots.checkOut || !!currSlots.numGuests;
    const stateForPlaybook: ConversationState = { draft: draftExists ? { ...currSlots } : null, confirmedBooking: null, locale: lang };
    const intent = detectIntent(String(msg.content || ""), stateForPlaybook);

    // Elegir playbook + construir system prompt (con hints anti-repregunta)
    let promptKey = "default";
    try { promptKey = choosePlaybookKey(intent); } catch (e) { console.warn("[playbook] choosePlaybookKey error; using default", e); }

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

    // Hints concretos para no volver a pedir datos ya presentes
    const hints: string[] = [];
    if (lang) hints.push(`- No pidas el código de idioma/locale; ya está definido como "${lang}".`);
    if (currSlots.checkIn && currSlots.checkOut) hints.push(`- Ya tenemos fechas: check-in ${currSlots.checkIn} y check-out ${currSlots.checkOut}; no vuelvas a pedirlas, solo reconfirma si hiciera falta.`);
    if (currSlots.roomType) hints.push(`- Ya hay tipo de habitación: ${currSlots.roomType}; no vuelvas a pedir ese dato salvo conflicto.`);
    if (currSlots.numGuests) hints.push(`- Ya hay número de huéspedes: ${currSlots.numGuests}.`);
    if (isSafeGuestName(currSlots.guestName)) hints.push(`- Ya tenemos el nombre del huésped: ${currSlots.guestName}; no lo vuelvas a pedir salvo que el usuario lo corrija.`);

    if (hints.length) systemInstruction += `\n\nInstrucciones adicionales para este turno:\n${hints.join("\n")}`;

    const lcMessages = [new SystemMessage(systemInstruction), ...lcHistory, new HumanMessage(String(msg.content || ""))];

    // === Ejecutar grafo con defensas + AUDITORÍA ===
    let finalText = "";
    let nextCategory: string | null = prevCategory;
    let nextSlots: ReservationSlotsStrict = currSlots;

    // ---- PRELLM (heurística) ----
    console.log("[BP-A1] preLLM:start", { conv: conversationId, lang, prevCategory });

    const persistedSlotsForAudit: SlotMap = {
      guestName: currSlots.guestName, roomType: currSlots.roomType, checkIn: currSlots.checkIn, checkOut: currSlots.checkOut, numGuests: currSlots.numGuests,
    };

    let preInterp: Interpretation | null = null;
    try { preInterp = preLLMInterpret(String(msg.content || ""), persistedSlotsForAudit); }
    catch (e) { console.warn("[BP-A1W] preLLM:error", (e as any)?.message || e); }

    if (preInterp) {
      console.log("[BP-A2] preLLM:result", {
        category: preInterp.category, desiredAction: preInterp.desiredAction,
        confidence: preInterp.confidence?.intent, slots: preInterp.slots,
      });
    }

    if (IS_TEST) {
      finalText = "Estoy para ayudarte. ¿Podés contarme brevemente el problema?";
      nextCategory = "support";
    } else {
      const started = Date.now();
      console.log("🧪 [graph] invoking…", {
        hotelId: msg.hotelId, conversationId, lang, prevCategory, prevSlots: currSlots, lcHistoryLen: lcHistory.length, promptKey, intent,
      });

      try {
        console.log("[BP-CHAT1]", conversationId, msg.hotelId, String(msg.content || ""));

        // LOG: antes de invocar agentGraph
        console.log('[DEBUG-numGuests] antes de agentGraph:', JSON.stringify(currSlots));

        const graphResult = await withTimeout(
          agentGraph.invoke({
            hotelId: msg.hotelId,
            conversationId,
            detectedLanguage: msg.detectedLanguage,
            normalizedMessage: String(msg.content || ""),
            messages: lcMessages,
            reservationSlots: currSlots,        // 👈 ahora viajan los slots del turno
            meta: { channel: msg.channel, prevCategory },
            salesStage: st?.salesStage ?? undefined, // <-- pasa salesStage persistido si existe
            desiredAction: st?.desiredAction ?? undefined, // <-- pasa desiredAction persistido si existe
          }),
          CONFIG.GRAPH_TIMEOUT_MS,
          "agentGraph.invoke"
        );

        const last = (graphResult as any)?.messages?.at?.(-1);
        const lastText = extractTextFromLCContent(last?.content);
        console.log("[BP-CHAT2]", typeof lastText, lastText ? lastText.slice(0, 200) : "(empty)");

        finalText = (lastText || "").trim();
        nextCategory = (graphResult as any).category ?? prevCategory ?? null;

        const merged: ReservationSlotsStrict = { ...(currSlots || {}), ...((graphResult as any).reservationSlots || {}) };
        if (typeof merged.numGuests !== "undefined" && typeof merged.numGuests !== "string") {
          merged.numGuests = String((merged as any).numGuests);
        }
        nextSlots = merged;

        // LOG: después de merge de slots del grafo
        console.log('[DEBUG-numGuests] merged nextSlots:', JSON.stringify(merged));

        console.log("✅ [graph] ok in", Date.now() - started, "ms", { nextCategory, nextSlots });

        // === Guardar estado conversacional (dentro del scope de graphResult)
        try {
          if (nextSlots.guestName) {
            const nm = normalizeNameCase(String(nextSlots.guestName));
            if (!isSafeGuestName(nm)) { delete (nextSlots as any).guestName; }
          }

          console.log("💾 [conv-state] saving:", { conv: conversationId, nextCategory, nextSlots });

          const cleanedSlots = Object.fromEntries(Object.entries(nextSlots).filter(([_, v]) => typeof v !== "undefined")) as DbReservationSlots;
          // LOG: antes de guardar cleanedSlots en conv-state
          console.log('[DEBUG-numGuests] cleanedSlots a guardar:', JSON.stringify(cleanedSlots));

          // Guardar también desiredAction si el grafo lo retorna
          const persist: any = { lastCategory: nextCategory, reservationSlots: cleanedSlots };
          if ((graphResult as any)?.desiredAction !== undefined) {
            persist.desiredAction = (graphResult as any).desiredAction;
          }
          await upsertConvState(msg.hotelId, conversationId, persist);
          const after = await getConvState(msg.hotelId, conversationId);
          console.log("🔎 [conv-state] post-upsert snapshot:", after);
        } catch (err) {
          console.warn("⚠️ [messageHandler] upsertConvState warn:", err);
        }
      } catch (err: any) {
        console.error("❌ [messageHandler] agentGraph error:", { errMsg: err?.message || String(err), elapsedMs: Date.now() - started });
        finalText = lang.startsWith("es")
          ? "Perdón, tuve un problema procesando tu consulta. ¿Podés repetir o reformular?"
          : lang.startsWith("pt")
            ? "Desculpe, tive um problema ao processar sua solicitação. Pode repetir?"
            : "Sorry, I had an issue processing your request. Could you try again?";
      }
    }

    if (!finalText) {
      finalText = ruleBasedFallback(lang, String(msg.content || ""));
      console.warn("⚠️ [graph] finalText vacío → fallback determinista");
    }

    // ---- POSTLLM (comparación pre vs LLM) ----
    const llmSlotsForAudit: SlotMap = {
      guestName: nextSlots.guestName, roomType: nextSlots.roomType, checkIn: nextSlots.checkIn, checkOut: nextSlots.checkOut, numGuests: nextSlots.numGuests,
    };
    const llmIntentConf = intentConfidenceByRules(String(msg.content || ""), (nextCategory as any) || "retrieval_based");
    const llmSlotConfs = slotsConfidenceByRules(llmSlotsForAudit);

    const llmInterp: Interpretation = {
      source: "llm",
      category: (nextCategory as any) ?? "retrieval_based",
      desiredAction: undefined,
      slots: llmSlotsForAudit,
      confidence: { intent: llmIntentConf, slots: llmSlotConfs },
      notes: ["llm via agentGraph result"],
    };

    console.log("[BP-A3] llm:fromGraph", { category: llmInterp.category, confidence: llmInterp.confidence?.intent, slots: llmInterp.slots });

    let needsSupervision = false;
    let verdictInfo: any = null;
    try {
      if (preInterp) {
        const v = auditVerdict(preInterp, llmInterp);
        verdictInfo = v;
        console.log("[BP-A4] verdict", v);

        const riskyCategory = CONFIG.SENSITIVE_CATEGORIES.has(String(llmInterp.category || ""));
        const lowIntentConf = typeof llmInterp.confidence?.intent === "number" && llmInterp.confidence.intent < CONFIG.SUPERVISE_LOW_CONF_INTENT;
        needsSupervision = (riskyCategory && verdictInfo?.status === "disagree") || lowIntentConf;
      } else {
        console.log("[BP-A4] verdict:skipped (no preInterp)");
      }
    } catch (e) {
      console.warn("[BP-A4W] verdict:error", (e as any)?.message || e);
    }

    // === Persistir y emitir respuesta
    const suggestion = finalText;
    const aiMsg: ChannelMessage = {
      ...msg,
      messageId: crypto.randomUUID(),
      sender: "assistant",
      role: "ai",
      content: suggestion,
      suggestion,
      status: needsSupervision ? "pending" : (guest.mode ?? "automatic") === "automatic" ? "sent" : "pending",
      timestamp: safeNowISO(),
      respondedBy: needsSupervision ? "assistant" : undefined,
    };

    (aiMsg as any).audit = preInterp ? { pre: preInterp, llm: llmInterp, verdict: verdictInfo } : undefined;

    await saveChannelMessageToAstra(aiMsg);
    channelMemory.addMessage(aiMsg);

    try {
      if (aiMsg.status === "sent") {
        console.log("📤 [reply] via adapter?", !!options?.sendReply, { len: suggestion.length });
        await emitReply(conversationId, suggestion, options?.sendReply);
      } else {
        console.log("[BP-A5] supervised:pending", { reason: verdictInfo?.reason || "policy/safety/low-confidence" });
        const pending = lang.startsWith("es")
          ? "🕓 Tu consulta está siendo revisada por un recepcionista."
          : lang.startsWith("pt")
            ? "🕓 Sua solicitação está sendo revisada por um recepcionista."
            : "🕓 Your request is being reviewed by a receptionist.";
        await emitReply(conversationId, pending, options?.sendReply);
      }
    } catch (err) {
      console.error("❌ [messageHandler] sendReply error:", err);
    }

  });
}
