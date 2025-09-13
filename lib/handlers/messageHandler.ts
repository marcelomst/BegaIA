// Path: /root/begasist/lib/handlers/messageHandler.ts
import type { ChannelMessage } from "@/types/channel";
import {
  // saveMessageToAstra,  // ❌
  getMessagesByConversation,
  type MessageDoc,
  saveChannelMessageToAstra,   // ✅
} from "@/lib/db/messages";
import { agentGraph } from "@/lib/agents";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from "@langchain/core/messages";
import { channelMemory } from "@/lib/services/channelMemory";
import { getOrCreateConversation } from "@/lib/db/conversations";
import { getGuest, createGuest, updateGuest } from "@/lib/db/guests";
import { getConvState, upsertConvState, CONVSTATE_VERSION } from "@/lib/db/convState";
import type { ReservationSlots as DbReservationSlots } from "@/lib/db/convState";
import crypto from "crypto";

// 🆕 Playbooks de sistema
import {
  buildSystemInstruction,
  choosePlaybookKey,
  type ConversationState,
} from "@/lib/agents/systemInstructions";
import { normalizeNameCase } from "@/lib/agents/graph.ts";
// ⬇️ cerca del top del archivo
const IS_TEST = !!process.env.VITEST || process.env.NODE_ENV === "test";

/** Versión para trazar qué archivo está cargando realmente */
export const MH_VERSION = "mh-2025-09-01-09";
console.log("[messageHandler] loaded:", MH_VERSION);
console.log("[messageHandler] using convState:", CONVSTATE_VERSION);

/** El grafo espera todos los slots como string */
type ReservationSlotsStrict = {
  guestName?: string;
  roomType?: string;
  checkIn?: string;
  checkOut?: string;
  numGuests?: string;
};

async function getRecentHistorySafe(
  hotelId: string,
  channel: ChannelMessage["channel"],
  conversationId: string,
  limit = 8
): Promise<ChannelMessage[]> {
  try {
    return await getRecentHistory(hotelId, channel, conversationId, limit);
  } catch (err) {
    console.error("⚠️ getRecentHistory fallback [] por error:", err);
    return [];
  }
}

function toStrictSlots(slots?: DbReservationSlots | null): ReservationSlotsStrict {
  return {
    guestName: slots?.guestName,
    roomType: slots?.roomType,
    checkIn: slots?.checkIn,
    checkOut: slots?.checkOut,
    numGuests: slots?.numGuests != null ? String(slots.numGuests) : undefined,
  };
}

function toLC(msg: ChannelMessage) {
  const txt = String(msg.content || msg.suggestion || "").trim();
  if (!txt) return null;
  if (msg.role === "ai" || msg.sender === "assistant") return new AIMessage(txt);
  return new HumanMessage(txt);
}

/** Comparador genérico por timestamp ASC (sirve para MessageDoc y ChannelMessage) */
function sortAscByTimestamp<T extends { timestamp?: string }>(a: T, b: T) {
  const ta = new Date(a.timestamp || 0).getTime();
  const tb = new Date(b.timestamp || 0).getTime();
  return ta - tb;
}

async function getRecentHistory(
  hotelId: string,
  channel: ChannelMessage["channel"],
  conversationId: string,
  limit = 8
): Promise<ChannelMessage[]> {
  // Trae MessageDoc[]
  const arr: MessageDoc[] = await getMessagesByConversation({
    hotelId,
    conversationId,
    limit: Math.max(limit * 3, 24),
  });

  // Normaliza a ChannelMessage (evita null en conversationId y asegura suggestion/timestamp:string)
  const normalized: ChannelMessage[] = arr.map((d) => {
    const cm: ChannelMessage = {
      messageId: d.messageId,
      hotelId: d.hotelId,
      channel: d.channel as ChannelMessage["channel"],
      sender: (d as any).sender ?? "Usuario",
      content: d.content ?? "",
      suggestion: d.suggestion ?? "",                 // ← string garantizado
      approvedResponse: d.approvedResponse,
      respondedBy: d.respondedBy,
      status: d.status as ChannelMessage["status"],
      timestamp: d.timestamp ?? "",                   // ← string garantizado (FIX TS2322)
      time: (d as any).time,
      role: (d as any).role,
      conversationId: d.conversationId ?? undefined,  // null → undefined
      guestId: (d as any).guestId,
      detectedLanguage: (d as any).detectedLanguage,
    };
    return cm;
  });

  return normalized
    .filter((m) => m.channel === channel)
    .sort(sortAscByTimestamp)
    .slice(-limit);
}

/** Timeout defensivo para el grafo */
async function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  label = "graph"
): Promise<T> {
  let t: any;
  const timeout = new Promise<never>((_, rej) => {
    t = setTimeout(() => rej(new Error(`[${label}] timeout ${ms}ms`)), ms);
  });
  try {
    // @ts-ignore
    const res = await Promise.race([p, timeout]);
    return res;
  } finally {
    clearTimeout(t);
  }
}

/** Emite por adapter si está; si no, por SSE directo */
async function emitReply(
  conversationId: string,
  text: string,
  sendReply?: (reply: string) => Promise<void>
) {
  if (sendReply) {
    await sendReply(text);
  } else {
    const { emitToConversation } = await import("@/lib/web/eventBus");
    emitToConversation(conversationId, {
      type: "message",
      sender: "assistant",
      text,
      timestamp: new Date().toISOString(),
    });
    console.log("📡 [reply] fallback SSE directo (sin adapter)");
  }
}

/** Fallback determinista muy simple si el grafo falla o no devuelve texto */
function ruleBasedFallback(lang: string, userText: string): string {
  const t = userText.toLowerCase();
  const es = lang.startsWith("es");
  const pt = lang.startsWith("pt");
  const wantsReservation = /reserv|book|quero reservar|quiero reservar/.test(t);

  if (wantsReservation) {
    return es
      ? "Para avanzar con tu reserva necesito: nombre del huésped, tipo de habitación, fecha de check-in y fecha de check-out. ¿Me lo compartís?"
      : pt
      ? "Para prosseguir com a sua reserva preciso: nome do hóspede, tipo de quarto, data de check-in e check-out. Pode me enviar?"
      : "To proceed with your booking I need: guest name, room type, check-in date and check-out date. Could you share them?";
  }
  return es
    ? "¿En qué puedo ayudarte? Nuestro equipo está disponible para asistirte."
    : pt
    ? "Em que posso ajudar? Nossa equipe está disponível para te atender."
    : "How can I help you? Our team is here for you.";
}

/** 🆕 NLU mínima para elegir playbook */
function detectIntent(
  userText: string,
  state: Pick<ConversationState, "draft" | "confirmedBooking">
): "reservation" | "modify" | "ambiguous" {
  const t = (userText || "").toLowerCase();

  const asksModify =
    /(modific|cambi|alter|mudar|change|update|editar|edit)/.test(t) ||
    /(cancel)/.test(t);

  const asksReserve = /(reserv|book|quero reservar|quiero reservar)/.test(t);

  if (asksModify) return "modify";
  if (asksReserve) return "reservation";

  // Heurística: si hay borrador activo y menciona "esa reserva", suponer modify
  if (state?.draft && /esa reserva|that booking|minha reserva|mi reserva/.test(t)) {
    return "modify";
  }
  return "ambiguous";
}

export async function handleIncomingMessage(
  msg: ChannelMessage,
  options?: {
    sendReply?: (reply: string) => Promise<void>;
    mode?: "automatic" | "supervised";
    skipPersistIncoming?: boolean;
  }
): Promise<void> {
  const now = new Date().toISOString();
  msg.messageId ||= crypto.randomUUID();
  msg.role ||= "user";
  msg.timestamp ||= now;

  // --- Guest
  const guestId = msg.guestId ?? msg.sender ?? "guest";
  let guest = await getGuest(msg.hotelId, guestId);
  if (!guest) {
    guest = {
      guestId,
      hotelId: msg.hotelId,
      name: "",
      mode: options?.mode ?? "automatic",
      createdAt: now,
      updatedAt: now,
    };
    await createGuest(guest);
  } else {
    await updateGuest(msg.hotelId, guestId, { updatedAt: now });
  }
  msg.guestId = guestId;

  // --- Conversation
  const conversationId =
    msg.conversationId || `${msg.hotelId}-${msg.channel}-${guestId}`;
  await getOrCreateConversation({
    conversationId,
    hotelId: msg.hotelId,
    guestId,
    channel: msg.channel,
    startedAt: now,
    lastUpdatedAt: now,
    status: "active",
    subject: "",
  });
  msg.conversationId = conversationId;

  if (msg.direction === "in" && msg.sourceMsgId) {
    const existing = await getMessagesByConversation({
      hotelId: msg.hotelId,
      conversationId,
      limit: 50, // chico por performance
    }).then(arr => arr.find(d => (d as any).direction === "in" && (d as any).sourceMsgId === msg.sourceMsgId));

    if (existing) {
      console.log("🔁 [idempotency] ya existe ese sourceMsgId → corto");
      return;
    }
  }


  // Persist incoming
  if (!options?.skipPersistIncoming) await saveChannelMessageToAstra(msg);
  channelMemory.addMessage(msg);

  // === Estado previo de la conversación
  const st = await getConvState(msg.hotelId, conversationId);
  const prevCategory = st?.lastCategory ?? null;
  const prevSlotsStrict: ReservationSlotsStrict = toStrictSlots(
    st?.reservationSlots
  );
  console.log("🧷 [conv-state] loaded:", {
    conv: conversationId,
    prevCategory,
    prevSlots: prevSlotsStrict,
  });

  // === Contexto para el LLM (historial reciente)
  const lang = (msg.detectedLanguage || "es").toLowerCase();
  const recent = await getRecentHistorySafe(
    msg.hotelId,
    msg.channel,
    conversationId,
    8
  );
  const lcHistory = recent.map(toLC).filter(Boolean) as (
    | HumanMessage
    | AIMessage
  )[];

  // 🆕 Estado compacto para el playbook
  const draftExists =
    !!prevSlotsStrict?.guestName ||
    !!prevSlotsStrict?.roomType ||
    !!prevSlotsStrict?.checkIn ||
    !!prevSlotsStrict?.checkOut ||
    !!prevSlotsStrict?.numGuests;

  const stateForPlaybook: ConversationState = {
    draft: draftExists ? { ...prevSlotsStrict } : null,
    confirmedBooking: null,
    locale: lang,
  };

  const intent = detectIntent(String(msg.content || ""), stateForPlaybook);
  const promptKey = choosePlaybookKey(intent);

  // 🧠 Instrucción de sistema desde system_playbook
  const systemInstruction = await buildSystemInstruction({
    promptKey,
    lang,
    state: stateForPlaybook,
    hotelId: msg.hotelId,
  });

  const lcMessages = [
    new SystemMessage(systemInstruction),
    ...lcHistory,
    new HumanMessage(String(msg.content || "")),
  ];

  // === Ejecutar grafo con defensas
// === Ejecutar grafo con defensas
let finalText = "";
let nextCategory: string | null = prevCategory;
let nextSlots: ReservationSlotsStrict = prevSlotsStrict;

if (IS_TEST) {
  // ✅ Fast-path de test: sin red, sin latencia, determinista
  finalText = "Estoy para ayudarte. ¿Podés contarme brevemente el problema?";
  nextCategory = "support";
  nextSlots = prevSlotsStrict;
  console.log("🧪 [graph] TEST fast-path activo");
} else {
  const started = Date.now();
  console.log("🧪 [graph] invoking…", {
    hotelId: msg.hotelId,
    conversationId,
    lang,
    prevCategory,
    prevSlots: prevSlotsStrict,
    lcHistoryLen: lcHistory.length,
    promptKey,
    intent,
  });

  try {
    console.log("[BP-CHAT1]",conversationId, msg.hotelId, String(msg.content || ""));
    const graphResult = await withTimeout(
      
      agentGraph.invoke({
        hotelId: msg.hotelId,
        conversationId,
        detectedLanguage: msg.detectedLanguage,
        normalizedMessage: String(msg.content || ""),
        messages: lcMessages,
        reservationSlots: prevSlotsStrict,
        meta: { channel: msg.channel, prevCategory },
      }),
      300000,
      "agentGraph.invoke"
    );

    const last = (graphResult as any)?.messages?.at?.(-1);
    console.log(
      "[BP-CHAT2]",
      last && typeof last?.content,
      last && (typeof last?.content === "string"
        ? last?.content.slice(0, 200)
        : last?.content)
    );

    finalText =
      typeof last?.content === "string" ? String(last.content).trim() : "";

    nextCategory = (graphResult as any).category ?? prevCategory ?? null;

    const merged: ReservationSlotsStrict = {
      ...(prevSlotsStrict || {}),
      ...((graphResult as any).reservationSlots || {}),
    };
    if (
      typeof merged.numGuests !== "undefined" &&
      typeof merged.numGuests !== "string"
    ) {
      merged.numGuests = String(merged.numGuests as any);
    }
    nextSlots = merged;

    console.log("✅ [graph] ok in", Date.now() - started, "ms", {
      nextCategory,
      nextSlots,
    });
  } catch (err: any) {
    console.error("❌ [messageHandler] agentGraph error:", {
      errMsg: err?.message || String(err),
      stack: err?.stack,
      cause: err?.cause,
      elapsedMs: Date.now() - started,
    });

    // Fallback amable
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


  // === Persistir y emitir respuesta
  const suggestion = finalText;
  const aiMsg: ChannelMessage = {
    ...msg,
    messageId: crypto.randomUUID(),
    sender: "assistant",
    role: "ai",
    content: suggestion,
    suggestion,
    status: (guest.mode ?? "automatic") === "automatic" ? "sent" : "pending",
    timestamp: new Date().toISOString(),
  };

  await saveChannelMessageToAstra(aiMsg);
  channelMemory.addMessage(aiMsg);

  try {
    if (aiMsg.status === "sent") {
      console.log("📤 [reply] via adapter?", !!options?.sendReply, {
        len: suggestion.length,
      });
      await emitReply(conversationId, suggestion, options?.sendReply);
    } else {
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

  // === Guardar estado conversacional
  try {
    const BAD_NAME_RE =
      /^(hola|hello|hi|hey|buenas|buenos dias|buenos días|buenas tardes|buenas noches|olá|ola|oi|quiero reservar|quero reservar)$/i;
    const ROOM_WORD_RE =
      /(suite|matrimonial|doble|triple|individual|single|double|twin|queen|king|deluxe|standard)/i;

    if (nextSlots.guestName) {
      const nm = normalizeNameCase(String(nextSlots.guestName));
      if (BAD_NAME_RE.test(nm) || ROOM_WORD_RE.test(nm)) {
        delete (nextSlots as any).guestName;
      }
    }

    console.log("💾 [conv-state] saving:", {
      conv: conversationId,
      nextCategory,
      nextSlots,
    });

    const cleanedSlots = Object.fromEntries(
      Object.entries(nextSlots).filter(([_, v]) => typeof v !== "undefined")
    ) as DbReservationSlots;

    await upsertConvState(msg.hotelId, conversationId, {
      lastCategory: nextCategory,
      reservationSlots: cleanedSlots,
    });

    // Verificación inmediata
    const after = await getConvState(msg.hotelId, conversationId);
    console.log("🔎 [conv-state] post-upsert snapshot:", after);
  } catch (err) {
    console.warn("⚠️ [messageHandler] upsertConvState warn:", err);
  }
}
