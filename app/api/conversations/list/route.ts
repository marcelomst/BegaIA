// Path: /root/begasist/app/api/conversations/list/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getConversationsByUser, getConversationsByHotelAndChannel } from "@/lib/db/conversations";
import { ALL_CHANNELS, type Channel } from "@/types/channel";

export async function GET(req: NextRequest) {
  try {
    const H = (k: string) => req.headers.get?.(k);
    console.log(`[edge] ${req.method} ${new URL(req.url).pathname} host=${H("host")} ip=${H("cf-connecting-ip")||H("x-forwarded-for")} cf-ray=${H("cf-ray")} ua=${H("user-agent")}`);

    const hotelId = req.nextUrl.searchParams.get("hotelId") || "hotel999";
    const userId = req.nextUrl.searchParams.get("userId") || undefined;
    const guestId = req.nextUrl.searchParams.get("guestId") || undefined;
    const rawChannel = req.nextUrl.searchParams.get("channel") || undefined;
    const id = userId || guestId;

    // ✅ Reutilizá el array centralizado de canales válidos
    const channel = ALL_CHANNELS.includes(rawChannel as Channel) ? (rawChannel as Channel) : undefined;

    if (!id && channel) {
      // Sin user/guest, pero con canal: trae todas las conversaciones del canal
      const conversations = await getConversationsByHotelAndChannel(hotelId, channel);
      return NextResponse.json({
        conversations: conversations.map((c) => ({
          conversationId: c.conversationId,
          startedAt: c.startedAt,
          lastUpdatedAt: c.lastUpdatedAt,
          lang: c.lang,
          status: c.status,
          subject: c.subject ?? "",
          guestId: c.guestId,
          userId: c.userId,
          channel: c.channel,
        })),
      });
    }

    // Si tenemos userId o guestId: trae solo las de ese usuario
    if (id) {
      const conversations = await getConversationsByUser(hotelId, id);
      return NextResponse.json({
        conversations: conversations.map((c) => ({
          conversationId: c.conversationId,
          startedAt: c.startedAt,
          lastUpdatedAt: c.lastUpdatedAt,
          lang: c.lang,
          status: c.status,
          subject: c.subject ?? "",
          guestId: c.guestId,
          userId: c.userId,
        })),
      });
    }

    // Si no hay ni canal válido ni usuario válido, devolvé vacío
    return NextResponse.json({ conversations: [] });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
