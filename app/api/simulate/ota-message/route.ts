// Path: /root/begasist/app/api/simulate/ota-message/route.ts

import { NextResponse } from "next/server";
import type { ChannelMessageDTO } from "@/types/externalDTOs";
import type { ChannelMessage } from "@/types/channel";
import { handleIncomingMessage } from "@/lib/handlers/messageHandler";

/**
 * Ruta de simulación de mensajes OTA.
 * Convierte el DTO entrante en un ChannelMessage y lo procesa.
 */
export async function POST(req: Request) {
  const dto = (await req.json()) as ChannelMessageDTO;

  // Mapear DTO a ChannelMessage interno
  const channelMsg: ChannelMessage = {
    messageId: dto.messageId,
    conversationId: dto.conversationId,
    hotelId: dto.guestId ?? "",        // Ajusta según tu lógica para obtener hotelId
    channel: dto.channel,
    sender: dto.guestId ?? "guest",
    content: dto.content,
    timestamp: dto.timestamp,
    time: new Date(dto.timestamp).toLocaleTimeString(),
    suggestion: dto.suggestionByHA ?? "",
    status: dto.status,
    guestId: dto.guestId,
  };

  try {
    await handleIncomingMessage(channelMsg, {
      autoReply: false,
      sendReply: async () => {},        // No enviamos respuesta en simulación
      mode: "supervised",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[simulate/ota] error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
