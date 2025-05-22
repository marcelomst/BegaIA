// /lib/services/messages/index.ts
import {
  getMessagesFromAstra,
  updateMessageInAstra,
  getMessagesFromAstraByConversation, // 👈 agregalo
} from "@/lib/db/messages";

import { channelMemory } from "@/lib/services/channelMemory";
import type { Channel, ChannelMessage } from "@/types/channel";


export async function getMessagesFromChannel(
  hotelId: string,
  channel: Channel,
  conversationId?: string
) {
  if (process.env.NODE_ENV === "development") {
    const msgs = channelMemory.getMessages(channel);
    return conversationId ? msgs.filter(m => m.conversationId === conversationId) : msgs;
  }

  const parsedLimit = conversationId ? parseInt(conversationId, 10) : undefined;
  return await getMessagesFromAstra(hotelId, channel, parsedLimit);
}


export async function updateMessageInChannel(
  hotelId: string,
  channel: Channel,
  messageId: string,
  changes: Partial<ChannelMessage>
) {
  if (process.env.NODE_ENV === "development") {
    return channelMemory.updateMessage(channel, messageId, changes);
  }

  return await updateMessageInAstra(hotelId, messageId, changes); // 👈 importante
}

export async function getMessagesByConversation(
  hotelId: string,
  channel: Channel,
  conversationId: string
) {
  if (process.env.NODE_ENV === "development") {
    const all = channelMemory.getMessages(channel);
    return all.filter((msg) => msg.conversationId === conversationId);
  }

  return await getMessagesFromAstraByConversation(hotelId, channel, conversationId);
}


