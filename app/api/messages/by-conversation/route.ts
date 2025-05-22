// /app/api/messages/by-conversation/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getMessagesByConversation } from "@/lib/services/messages";
import { parseChannel } from "@/lib/utils/parseChannel";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const rawChannel = url.searchParams.get("channelId");
  const conversationId = url.searchParams.get("conversationId");

  const channel = parseChannel(rawChannel);

  if (!channel || !conversationId) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const messages = await getMessagesByConversation(user.hotelId, channel, conversationId);
  return NextResponse.json({ messages });
}
