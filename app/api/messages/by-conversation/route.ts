// Path: /root/begasist/app/api/messages/by-conversation/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getMessagesByConversationService } from "@/lib/services/messages";
import { getConversationById } from "@/lib/db/conversations";
import { parseChannel } from "@/lib/utils/parseChannel";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { canAccessAdminRoute, resolveAuthorizedStaffHotelId } from "@/lib/auth/roles";

export async function GET(req: NextRequest) {
  const H = (k: string) => req.headers.get?.(k);
  console.log(
    `[edge] ${req.method} ${new URL(req.url).pathname} host=${H("host")} ip=${H("cf-connecting-ip") || H("x-forwarded-for")} cf-ray=${H("cf-ray")} ua=${H("user-agent")}`
  );

  const url = new URL(req.url);
  const rawChannel = url.searchParams.get("channelId");
  const conversationId = url.searchParams.get("conversationId");
  const requestedHotelId = url.searchParams.get("hotelId");

  const channel = parseChannel(rawChannel);

  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!canAccessAdminRoute(user.roleLevel, "/admin/inbox")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!channel || !conversationId) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const hotelId = resolveAuthorizedStaffHotelId(user, requestedHotelId);
  if (!hotelId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const conv = await getConversationById(hotelId, conversationId).catch(() => null);
  if (!conv || conv.hotelId !== hotelId || conv.channel !== channel) {
    return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  const messages = await getMessagesByConversationService(hotelId, channel, conversationId);

  return NextResponse.json({ messages });
}
