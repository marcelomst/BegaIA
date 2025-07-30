// Path: /root/begasist/app/api/channel-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getQR, getWhatsAppState, redis } from "@/lib/services/redis";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";

// Canales que usan heartbeat real en Redis
const HEARTBEAT_CHANNELS = ["email", "whatsapp", "channelManager"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hotelId = searchParams.get("hotelId");
  const channel = searchParams.get("channel");

  if (!hotelId || !channel) {
    return NextResponse.json({ error: "Missing hotelId or channel" }, { status: 400 });
  }

  // WhatsApp también tiene QR adicional
  if (channel === "whatsapp") {
    const state = await getWhatsAppState(hotelId);
    const qr = state === "waiting_qr" ? (await getQR(hotelId)) : null;

    // Intentamos también obtener modo desde config
    const config = await getHotelConfig(hotelId);
    const mode = config?.channelConfigs?.whatsapp?.mode ?? null;

    return NextResponse.json({ state, qr, mode });
  }

  // Canales con heartbeat en Redis
  if (HEARTBEAT_CHANNELS.includes(channel)) {
    const heartbeatKey = `heartbeat:${channel}-bot:${hotelId}`;
    const exists = await redis.exists(heartbeatKey);
    const state = exists === 1 ? "online" : "offline";

    const config = await getHotelConfig(hotelId);
    const mode = config?.channelConfigs?.[channel as keyof typeof config.channelConfigs]?.mode ?? null;

    return NextResponse.json({ state, mode });
  }

  // Otros canales: usar solo config
  const config = await getHotelConfig(hotelId);
  if (!config) {
    return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
  }
  const chan = config.channelConfigs?.[channel as keyof typeof config.channelConfigs];
  if (!chan) {
    return NextResponse.json({ error: "Channel not configured" }, { status: 404 });
  }

  let state = "unknown";
  if (chan.enabled === false) state = "disabled";
  else if (chan.mode === "supervised") state = "supervised";
  else if (chan.mode === "automatic") state = "automatic";
  else state = "active";

  return NextResponse.json({ state, mode: chan.mode ?? null });
}
