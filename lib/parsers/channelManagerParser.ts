// Path: /root/begasist/lib/parsers/channelManagerParser.ts

import type { ChannelManagerEventDTO, ChannelMessageDTO } from "@/types/externalDTOs";
import type { MessageSource } from "@/types/externalDTOs";
import type { MessageStatus } from "@/types/channel";

/**
 * Parsea el XML/JSON de SiteMinder y devuelve un array de eventos tipados.
 */
export function parseChannelManagerEvents(xml: string): ChannelManagerEventDTO[] {
  // TODO: Implementar parseo real de XML SOAP
  return [];
}

/**
 * Convierte un payload de mensaje del Channel Manager en ChannelMessageDTO.
 */
export function parseCMMessageToChannelMessage(payload: any): ChannelMessageDTO {
  const msg: ChannelMessageDTO = {
    messageId: payload.messageId || payload.id || "",
    conversationId: payload.conversationId,
    reservationId: payload.reservationId,
    guestId: payload.guestId,
    channel: "channelManager",
    source: (payload.source as MessageSource) || "cm",
    direction: "incoming",
    timestamp: payload.timestamp || new Date().toISOString(),
    content: payload.content || "",
    status: (payload.status as MessageStatus) || "pending",
    rawPayload: payload,
  };
  return msg;
}
