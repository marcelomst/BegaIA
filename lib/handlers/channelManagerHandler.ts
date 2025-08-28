// Path: /root/begasist/lib/handlers/messageHandler.ts
import type { ChannelMessage, ChannelMode, Channel } from "@/types/channel";
import { saveMessageToAstra } from "@/lib/db/messages";
import { agentGraph } from "@/lib/agents";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { channelMemory } from "@/lib/services/channelMemory";
import { getOrCreateConversation } from "@/lib/db/conversations";
import { getGuest, createGuest, updateGuest } from "@/lib/db/guests";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { emitToConversation } from "@/lib/web/eventBus";
import crypto from "crypto";

/** Heurística simple para detectar si el texto parece un nombre propio "suelto". */
function isLikelyName(text: string): boolean {
  const t = (text || "").trim();
  if (t.length < 2 || t.length > 60) return false;
  const okChars = /^[A-Za-zÁÉÍÓÚÑáéíóúÜü' -]+$/u.test(t);
  if (!okChars) return false;
  const tokens = t.split(/\s+/);
  return tokens.length >= 1 && tokens.length <= 4;
}
function titleCaseName(text: string): string {
  return (text || "")
    .trim()
    .toLowerCase()
    .replace(/\b([a-záéíóúñü])/g, (m) => m.toUpperCase())
    .replace(/\s+/g, " ");
}

export type HandleIncomingResult = {
  reply?: string;
  status?: "sent" | "pending";
  messageId?: string;
  conversationId: string;
  lang?: string;
};

export async function handleIncomingMessage(
  msg: ChannelMessage,
  options?: {
    /** Si true, invoca IA para generar respuesta. */
    autoReply?: boolean;
    /** Modo forzado (si no se pasa, se usa: guest.mode > canal.mode). */
    mode?: "automatic" | "supervised";
    /** En canales con entrega real (WA, email), cómo enviar la respuesta. */
    sendReply?: (reply: string) => Promise<void>;
    /** Si true, NO persiste el mensaje entrante (p.ej. ya guardado en CM). */
    skipPersistIncoming?: boolean;
  }
): Promise<HandleIncomingResult> {
  // -------- Normalización mínima --------
  if (!msg.hotelId) throw new Error("hotelId requerido");
  if (!msg.channel) throw new Error("channel requerido");
  if (!msg.sender) msg.sender = "guest";
  if (!msg.messageId) msg.messageId = crypto.randomUUID();
  if (!msg.timestamp) msg.timestamp = new Date().toISOString();
  if (!msg.role) msg.role = "user";
  const channel: Channel = msg.channel as Channel;

  // -------- Config & modo efectivo --------
  const hotelConfig = await getHotelConfig(msg.hotelId);
  const channelModeFromConfig: ChannelMode =
    hotelConfig?.channelConfigs?.[channel]?.mode ?? "automatic";
  const defaultLang = (msg.detectedLanguage || hotelConfig?.defaultLanguage || "es").toLowerCase();

  // -------- Guest --------
  const guestId = msg.guestId ?? msg.sender;
  const now = new Date().toISOString();
  let guest = await getGuest(msg.hotelId, guestId);
  if (!guest) {
    guest = {
      guestId,
      hotelId: msg.hotelId,
      name: "",
      mode: options?.mode ?? channelModeFromConfig,
      createdAt: now,
      updatedAt: now,
    };
    await createGuest(guest);
  } else {
    // mantener updatedAt; no sobreescribir mode aquí
    await updateGuest(msg.hotelId, guestId, { updatedAt: now });
  }

  // Capturar nombre si vino “solo nombre”
  if (!guest.name && msg.content && isLikelyName(msg.content)) {
    const prettyName = titleCaseName(msg.content);
    try {
      await updateGuest(msg.hotelId, guestId, { name: prettyName, updatedAt: now });
      guest.name = prettyName;
      // no es blocking
    } catch {}
  }

  // -------- Conversación --------
  const conversationId =
    msg.conversationId || `${msg.hotelId}-${channel}-${guestId}`;
  await getOrCreateConversation({
    conversationId,
    hotelId: msg.hotelId,
    guestId,
    channel,
    startedAt: now,
    lastUpdatedAt: now,
    status: "active",
    subject: "",
  });

  // -------- Persistir entrante & emitir SSE --------
  if (!options?.skipPersistIncoming) {
    await saveMessageToAstra({ ...msg, conversationId });
  }
  channelMemory.addMessage({ ...msg, conversationId });

  emitToConversation({
    conversationId,
    type: "message.in",
    payload: { ...msg, conversationId },
  });

  // Si no hay autoReply, listo
  if (!options?.autoReply) {
    return { conversationId, lang: defaultLang };
  }

  // -------- Modo efectivo (guest > override > canal) --------
  let effectiveMode: ChannelMode = channelModeFromConfig;
  if (guest?.mode) effectiveMode = guest.mode;
  if (options?.mode) effectiveMode = options.mode;

  // -------- IA --------
  const knownName = guest?.name?.trim();
  const systemMsgText =
    `You are a hotel front-desk assistant. Reply in ${defaultLang}. ` +
    (knownName ? `If possible, greet the guest by their name "${knownName}". ` : "") +
    `When the guest wants to make a reservation, collect ONLY the missing fields from: ` +
    `guest name, room type, check-in date, check-out date. ` +
    `Be concise, friendly, and ask for the missing info in one short sentence.`;

  const response = await agentGraph.invoke({
    hotelId: msg.hotelId,
    conversationId,
    detectedLanguage: defaultLang,
    messages: [
      new SystemMessage(systemMsgText),
      new HumanMessage(String(msg.content ?? "")),
    ],
  });

  const ai = response.messages.findLast((m) => m instanceof AIMessage) as AIMessage | undefined;
  const suggestion = (ai?.content ?? "").toString().trim() || "…";

  const status: ChannelMessage["status"] =
    effectiveMode === "automatic" ? "sent" : "pending";

  // -------- Persistir salida & emitir SSE --------
  const aiMsg: ChannelMessage = {
    hotelId: msg.hotelId,
    channel,
    conversationId,
    guestId,
    sender: "assistant",
    role: "ai",
    messageId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    content: "",            // seguimos guardando en `suggestion` como venías haciendo
    suggestion,
    status,
    approvedResponse: status === "sent" ? suggestion : undefined,
    respondedBy: status === "sent" ? "assistant" : undefined,
    detectedLanguage: defaultLang,
  };

  await saveMessageToAstra(aiMsg);
  channelMemory.addMessage(aiMsg);

  emitToConversation({
    conversationId,
    type: "message.out",
    payload: aiMsg,
  });

  // -------- Entrega real (WA, email, etc.) --------
  if (status === "automatic" && options?.sendReply) {
    // nunca ocurre porque status es "sent"|"pending"; por claridad dejamos:
  }
  if (status === "sent" && options?.sendReply) {
    await options.sendReply(suggestion);
  } else if (status === "pending" && options?.sendReply) {
    // Si querés notificar en canales “sin UI”:
    const notifying =
      defaultLang.startsWith("es")
        ? "🕓 Tu consulta está siendo revisada por un recepcionista y pronto recibirás una respuesta."
        : "🕓 Your request is being reviewed by a receptionist. You will receive a reply shortly.";
    await options.sendReply(notifying);
  }

  return {
    reply: suggestion,
    status,
    messageId: aiMsg.messageId,
    conversationId,
    lang: defaultLang,
  };
}
