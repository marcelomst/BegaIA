// /app/api/config/mode/route.ts
import { NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import { ChannelMode } from "@/types/channel";
import { parseChannel } from "@/lib/utils/parseChannel";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const rawChannel = url.searchParams.get("channel");
  const channel = parseChannel(rawChannel);

  if (!channel) {
    return NextResponse.json({ error: "Canal no permitido" }, { status: 400 });
  }

  const hotelId = "hotel123"; // simulado
  const config = await getHotelConfig(hotelId);
  const current = config?.channelConfigs?.[channel];

  if (!current) {
    return NextResponse.json({ error: "Canal no configurado" }, { status: 404 });
  }

  const newMode: ChannelMode = current.mode === "automatic" ? "supervised" : "automatic";

  await updateHotelConfig(hotelId, {
    channelConfigs: {
      ...config.channelConfigs,
      [channel]: {
        ...current,
        mode: newMode as ChannelMode,
      },
    },
  });

  return NextResponse.redirect(new URL("/admin/channels", req.url));
}
