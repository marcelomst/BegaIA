// Path: /root/begasist/lib/handlers/messageHandler.ts
import type { ChannelMessage } from "@/types/channel";
import { saveMessageToAstra } from "@/lib/db/messages";
import { agentGraph } from "@/lib/agents";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { channelMemory } from "@/lib/services/channelMemory";
import { getOrCreateConversation } from "@/lib/db/conversations";
import { getGuest, createGuest, updateGuest } from "@/lib/db/guests";
import crypto from "crypto";

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

export async function handleIncomingMessage(
  msg: ChannelMessage,
  options?: {
    autoReply?: boolean;
    sendReply?: (reply: string) => Promise<void>; // ← el adapter canaliza
    mode?: "automatic" | "supervised";
    skipPersistIncoming?: boolean;
  }
): Promise<void> {
  // Defaults mínimos
  msg.messageId = msg.messageId || crypto.randomUUID();
  msg.role = msg.role || "user";
  msg.timestamp = msg.timestamp || new Date().toISOString();

  // Si no hay contenido/sender, ignorar pero persistir si aplica
  if (!msg.content || !msg.sender) {
    msg.status = "ignored";
    if (!options?.skipPersistIncoming) await saveMessageToAstra(msg);
    channelMemory.addMessage(msg);
    return;
  }

  const now = new Date().toISOString();
  const guestId = msg.guestId ?? msg.sender;

  // Guest
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

  // Si el texto parece un nombre, guardarlo
  if (!guest.name && isLikelyName(msg.content)) {
    const prettyName = titleCaseName(msg.content);
    try {
      await updateGuest(msg.hotelId, guestId, { name: prettyName, updatedAt: now });
      guest.name = prettyName;
    } catch {}
  }

  // Conversación
  const conversationId = msg.conversationId || `${msg.hotelId}-${msg.channel}-${guestId}`;
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
  msg.guestId = guestId;

  // Persistir mensaje del usuario
  if (!options?.skipPersistIncoming) await saveMessageToAstra(msg);
  channelMemory.addMessage(msg);

  // Auto-reply opcional
  if (options?.sendReply) {
    const lang = (msg.detectedLanguage || "en").toLowerCase();
    const knownName = guest?.name?.trim();
    const effectiveMode: "automatic" | "supervised" =
      options.mode ?? guest.mode ?? "automatic";

    const systemMsgText =
      `You are a hotel front-desk assistant. Reply in ${lang}. ` +
      (knownName ? `If possible, greet the guest by their name "${knownName}". ` : "") +
      `When the guest wants to make a reservation, collect ONLY the missing fields from: ` +
      `guest name, room type, check-in date, check-out date. ` +
      `Be concise, friendly, and ask for the missing info in one short sentence.`;

    const response = await agentGraph.invoke({
      hotelId: msg.hotelId,
      conversationId: msg.conversationId,
      detectedLanguage: msg.detectedLanguage,
      messages: [new SystemMessage(systemMsgText), new HumanMessage(msg.content)],
    });

    const content = response.messages.at(-1)?.content;
    if (typeof content === "string" && content.trim().length > 0) {
      const suggestion = content.trim();
      const aiMsg: ChannelMessage = {
        ...msg,
        messageId: crypto.randomUUID(),
        sender: "assistant",
        content: suggestion,
        suggestion,
        role: "ai",
        status: effectiveMode === "automatic" ? "sent" : "pending",
        timestamp: new Date().toISOString(),
      };

      await saveMessageToAstra(aiMsg);
      channelMemory.addMessage(aiMsg);

      // Entrega por el canal a través del adapter
      if (effectiveMode === "automatic") {
        await options.sendReply(suggestion);
      } else {
        const notifying = lang.startsWith("es")
          ? "🕓 Tu consulta está siendo revisada por un recepcionista y pronto recibirás una respuesta."
          : "🕓 Your request is being reviewed by a receptionist. You will receive a reply shortly.";
        await options.sendReply(notifying);
      }
    }
  }
}
