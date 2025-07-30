// Path: /root/begasist/lib/parsers/whatsappParser.ts
import type { Message } from "whatsapp-web.js";
import type { ChannelMessage } from "@/types/channel";
import { getLocalTime } from "@/lib/utils/time";
import crypto from "crypto";

export async function parseWhatsAppToChannelMessage({
  message,
  hotelId,
  guestId
}: {
  message: Message,
  hotelId: string,
  guestId: string
}): Promise<ChannelMessage> {
  const timestamp = new Date().toISOString();
  return {
    messageId: crypto.randomUUID(),
    conversationId: `${hotelId}-whatsapp-${guestId}`,
    hotelId,
    channel: "whatsapp",
    sender: guestId,
    guestId,
    content: message.body,
    timestamp,
    time: await getLocalTime(hotelId, timestamp),
    suggestion: "",
    status: "pending",
    role: "user",
  };
}
