// Path: /root/begasist/app/api/config/channel/[channel]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import type { ChannelConfigMap } from "@/types/channel";

// Solo los canales reales
const VALID_CHANNELS: (keyof ChannelConfigMap)[] = [
  "web", "email", "whatsapp", "channelManager", "telegram", "instagram", "tiktok", "x", "facebook"
];

function isValidChannel(channel: string): channel is keyof ChannelConfigMap {
  return VALID_CHANNELS.includes(channel as any);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const hotelId = url.searchParams.get("hotelId");
  // Extraer canal dinámico del path (último segmento)
  const channel = url.pathname.split("/").pop() || "";

  if (!hotelId || !channel) {
    return NextResponse.json({ error: "Faltan parámetros hotelId o channel." }, { status: 400 });
  }
  if (!isValidChannel(channel)) {
    return NextResponse.json({ error: "Canal no válido para configuración." }, { status: 400 });
  }
  const config = await getHotelConfig(hotelId);
  if (!config) {
    return NextResponse.json({ error: "Hotel no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ config: config.channelConfigs?.[channel] ?? null });
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const hotelId = url.searchParams.get("hotelId");
  // Extraer canal dinámico del path (último segmento)
  const channel = url.pathname.split("/").pop() || "";

  const body = await request.json();
  // Si el front lo envía en body, dale preferencia al body, si no, usá query:
  const bodyHotelId = body.hotelId || hotelId;
  const channelConfig = { ...body };
  delete channelConfig.hotelId;

  if (!bodyHotelId || !channel) {
    return NextResponse.json({ error: "Faltan parámetros hotelId o channel." }, { status: 400 });
  }
  if (!isValidChannel(channel)) {
    return NextResponse.json({ error: "Canal no válido para configuración." }, { status: 400 });
  }
  const config = await getHotelConfig(bodyHotelId);
  if (!config) {
    return NextResponse.json({ error: "Hotel no encontrado" }, { status: 404 });
  }
  await updateHotelConfig(bodyHotelId, {
    channelConfigs: {
      ...config.channelConfigs,
      [channel]: channelConfig,
    },
  });

  return NextResponse.json({ ok: true });
}
