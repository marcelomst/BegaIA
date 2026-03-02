// Path: /root/begasist/app/api/messages/pending/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { parseChannel } from "@/lib/utils/parseChannel";
import { getMessagesFromChannel } from "@/lib/services/messages";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const rawChannel = url.searchParams.get("channel");
  const channel = parseChannel(rawChannel);
  const requestedHotelId = url.searchParams.get("hotelId") || undefined;
  const hotelId = user.hotelId === "system" ? (requestedHotelId || user.hotelId) : user.hotelId;

  if (!channel) {
    return NextResponse.json({ error: "Canal no permitido" }, { status: 400 });
  }

  const config = await getHotelConfig(hotelId).catch(() => null);
  const slaRaw = config?.channelConfigs?.whatsapp?.slaMinutes;
  const slaMinutes = typeof slaRaw === "number" && Number.isFinite(slaRaw) && slaRaw > 0
    ? Math.floor(slaRaw)
    : null;

  const now = Date.now();
  const all = await getMessagesFromChannel(hotelId, channel, 500);
  const pending = all
    .filter((m) => m.status === "pending" && (m.role === "ai" || m.sender === "assistant"))
    .map((m) => {
      const baseTs = m.createdAt || m.timestamp;
      const ageMinutes = baseTs ? Math.max(0, Math.floor((now - Date.parse(baseTs)) / 60000)) : 0;
      return {
        messageId: m.messageId,
        conversationId: m.conversationId ?? null,
        guestId: m.guestId ?? null,
        channel: m.channel,
        status: m.status,
        suggestion: m.suggestion ?? null,
        approvedResponse: m.approvedResponse ?? null,
        content: m.content ?? null,
        respondedBy: m.respondedBy ?? null,
        timestamp: m.timestamp ?? null,
        createdAt: m.createdAt ?? null,
        ageMinutes,
        breach: slaMinutes != null ? ageMinutes >= slaMinutes : false,
      };
    });

  return NextResponse.json({
    hotelId,
    channel,
    slaMinutes,
    pending,
  });
}
