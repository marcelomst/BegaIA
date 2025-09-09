// Path: /root/begasist/lib/services/messages/index.ts
import {
  getMessages,                 // ✅ nombre correcto
  updateMessageInAstra,
  getMessagesByConversation,   // ✅ nombre correcto
} from "@/lib/db/messages";

import { channelMemory } from "@/lib/services/channelMemory";
import type { Channel, ChannelMessage } from "@/types/channel";

/**
 * Obtiene mensajes de un canal. Si querés pasar un límite, usá `limit`
 * (no reutilices conversationId como límite).
 */
// /root/begasist/lib/services/messages/index.ts

const DEFAULT_LIMIT = 100;        // ajustá a gusto
const MAX_LIMIT = 500;

export async function getMessagesFromChannel(
  hotelId: string,
  channel: Channel,
  limit: number = DEFAULT_LIMIT
) {
  const safeLimit = Math.max(1, Math.min(limit, MAX_LIMIT));

  // if (process.env.NODE_ENV === "development") {
  if (false) {
    const msgs = channelMemory.getMessages(channel);
    return msgs.slice(-safeLimit);
  }

  return await getMessages(hotelId, channel, safeLimit);
}




export async function updateMessageInChannel(
  hotelId: string,
  channel: Channel,
  messageId: string,
  changes: Partial<ChannelMessage>
) {
  // if (process.env.NODE_ENV === "development") {
  if (false) {
    return channelMemory.updateMessage(channel, messageId, changes);
  }

  return await updateMessageInAstra(hotelId, messageId, changes);
}

export async function getMessagesByConversationService(
  hotelId: string,
  channel: Channel,
  conversationId: string
) {
  // if (process.env.NODE_ENV === "development") {
  if (false) {
    const all = channelMemory.getMessages(channel);
    return all.filter((msg) => msg.conversationId === conversationId);
  }

  return await getMessagesByConversation({
    hotelId,
    conversationId,
    channel,
  });
}
