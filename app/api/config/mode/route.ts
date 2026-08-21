// /app/api/config/mode/route.ts
import { NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import type { ChannelMode } from "@/types/channel";
import { parseChannel } from "@/lib/utils/parseChannel";

function parseMode(mode: string | null): ChannelMode | null {
  if (mode === "automatic" || mode === "supervised") return mode;
  return null;
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const rawChannel = url.searchParams.get("channel");
  const hotelId = url.searchParams.get("hotelId");
  const rawMode = url.searchParams.get("mode");
  const channel = parseChannel(rawChannel);
  const mode = parseMode(rawMode);

  if (!hotelId) {
    return NextResponse.json({ error: "Falta hotelId" }, { status: 400 });
  }
  if (!channel) {
    return NextResponse.json({ error: "Canal no permitido" }, { status: 400 });
  }
  if (!mode) {
    return NextResponse.json({ error: "Modo no permitido" }, { status: 400 });
  }

  const config = await getHotelConfig(hotelId);
  const current = config?.channelConfigs?.[channel];

  if (!current) {
    return NextResponse.json({ error: "Canal no configurado" }, { status: 404 });
  }

  await updateHotelConfig(hotelId, {
    channelConfigs: {
      ...config.channelConfigs,
      [channel]: {
        ...current,
        mode,
      },
    },
  });

  return NextResponse.json({ ok: true, channel, mode });
}
