import {
  getMessagesFromAstra,
  updateMessageInAstra,
  getMessagesFromAstraByConversation, // 👈 agregalo
} from "@/lib/db/messages";

import { channelMemory } from "@/lib/services/channelMemory";
import type { Channel, ChannelMessage } from "@/types/channel";

const HOTEL_ID = "hotel123";

export async function getMessagesFromChannel(channel: Channel, conversationId?: string) {
  if (process.env.NODE_ENV === "development") {
    const msgs = channelMemory.getMessages(channel);
    return conversationId ? msgs.filter(m => m.conversationId === conversationId) : msgs;
  }
  const parsedLimit = conversationId ? parseInt(conversationId, 10) : undefined;
  return await getMessagesFromAstra(HOTEL_ID, channel, parsedLimit);

 }

export async function updateMessageInChannel(
  channel: Channel,
  messageId: string,
  changes: Partial<ChannelMessage>
) {
  if (process.env.NODE_ENV === "development") {
    return channelMemory.updateMessage(channel, messageId, changes);
  }

  return await updateMessageInAstra(messageId, changes);
}
export async function getMessagesByConversation(channel: Channel, conversationId: string) {
  if (process.env.NODE_ENV === "development") {
    const all = channelMemory.getMessages(channel);
    return all.filter((msg) => msg.conversationId === conversationId);
  }

  return await getMessagesFromAstraByConversation(HOTEL_ID, channel, conversationId);
}

