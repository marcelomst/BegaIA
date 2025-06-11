// Path: /root/begasist/app/api/messages/by-conversation/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getMessagesByConversation } from "@/lib/services/messages";
import { getConversationById } from "@/lib/db/conversations";
import { parseChannel } from "@/lib/utils/parseChannel";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawChannel = url.searchParams.get("channelId");
  const conversationId = url.searchParams.get("conversationId");
  const hotelId = url.searchParams.get("hotelId") || "hotel123";
  const guestId = url.searchParams.get("guestId");

  const channel = parseChannel(rawChannel);

  if (!channel || !conversationId) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  // Opcional: verificar que la conversación sea del guest actual
  if (guestId) {
    const conv = await getConversationById(conversationId);
    if (!conv || conv.hotelId !== hotelId || conv.guestId !== guestId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  const messages = await getMessagesByConversation(hotelId, channel, conversationId);
  return NextResponse.json({ messages });
}
