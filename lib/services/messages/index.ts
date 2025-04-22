// /lib/services/messages/index.ts (refactorizado con tipos y lógica desacoplada)

import { getMessagesFromAstra, updateMessageInAstra } from "@/lib/db/messages";
import { channelMemory } from "@/lib/services/channelMemory";
import type { Channel } from "@/types/channel";
import type { Message } from "@/types/message";
import type { ChannelMessage, ChannelStatus } from "@/types/channel"; // Ensure this path is correct

const HOTEL_ID = "hotel123";

// ✅ Lectura unificada por canal
export async function getMessagesFromChannel(channel: Channel) {
  if (process.env.NODE_ENV === "development") {
    return channelMemory.getMessages(channel);
  }

  return await getMessagesFromAstra(HOTEL_ID, channel);
}

// ✅ Actualización unificada por canal
export async function updateMessageInChannel(
  channel: Channel,
  id: string,
  changes: Partial<Message>
) {
  if (process.env.NODE_ENV === "development") {
    const mappedChanges: Partial<ChannelMessage> = {
      ...changes,
      status: changes.status as ChannelStatus | undefined,
    };
    return channelMemory.updateMessage(channel, id, mappedChanges);
  }
  

  return await updateMessageInAstra(id, changes);
}
