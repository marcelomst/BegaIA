// Path: /root/begasist/lib/handlers/messageHandler.ts

import type { ChannelMessage } from "@/types/channel";
import { saveMessageToAstra } from "@/lib/db/messages";
import { agentGraph } from "@/lib/agents";
import { HumanMessage } from "@langchain/core/messages";
import { channelMemory } from "@/lib/services/channelMemory";
import { getOrCreateConversation } from "@/lib/db/conversations";
import { getGuest, createGuest, updateGuest } from "@/lib/db/guests";
import crypto from "crypto";

/**
 * Procesa y guarda un mensaje unificado de canal.
 * Si autoReply es true y sendReply se provee, responde usando IA y persiste ambos mensajes.
 */
export async function handleIncomingMessage(
  msg: ChannelMessage,
  options?: {
    autoReply?: boolean;
    sendReply?: (reply: string) => Promise<void>;
    mode?: "automatic" | "supervised";
  }
): Promise<void> {
  if (!msg.content || !msg.sender) {
    msg.status = "ignored";
    msg.role = "user";
    await saveMessageToAstra(msg);
    channelMemory.addMessage(msg);
    return;
  }

  msg.messageId = msg.messageId || crypto.randomUUID();
  msg.role = msg.role || "user";

  // --- CREAR GUEST SI NO EXISTE ---
  const guestId = msg.guestId ?? msg.sender;
  const now = new Date().toISOString();
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
    console.log(`👤 Guest creado: ${guestId}`);
  } else {
    await updateGuest(msg.hotelId, guestId, { updatedAt: now });
  }

  // --- CONVERSATION ID ---
  const conversationId = `${msg.hotelId}-${msg.channel}-${guestId}`;
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

  // --- GUARDAR MENSAJE ---
  await saveMessageToAstra(msg);
  channelMemory.addMessage(msg);

  // --- RESPUESTA AUTOMÁTICA ---
  if (options?.autoReply && options.sendReply) {
    const response = await agentGraph.invoke({
      hotelId: msg.hotelId,
      conversationId: msg.conversationId,
      messages: [new HumanMessage(msg.content)],
    });

    const reply = response.messages.at(-1)?.content;
    if (typeof reply === "string" && reply.trim()) {
      const aiMessage: ChannelMessage = {
        ...msg,
        messageId: crypto.randomUUID(),
        sender: "assistant",
        content: reply,
        suggestion: reply,
        role: "ai",
        status: options.mode === "automatic" ? "sent" : "pending",
        timestamp: new Date().toISOString(),
      };
      await saveMessageToAstra(aiMessage);
      channelMemory.addMessage(aiMessage);

      if (options.mode === "automatic" && options.sendReply) {
        await options.sendReply(reply);
      }
    }
  }
}
