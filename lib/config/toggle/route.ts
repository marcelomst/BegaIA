// /app/api/config/toggle/route.ts
import { NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const channel = url.searchParams.get("channel");

  if (!channel) {
    return NextResponse.json({ error: "Channel is required" }, { status: 400 });
  }

  const hotelId = "hotel123"; // Simulado
  const config = await getHotelConfig(hotelId);
  const current = config?.channelConfigs?.[channel];

  if (!current) {
    return NextResponse.json({ error: "Canal no configurado" }, { status: 404 });
  }

  const updated = {
    ...config.channelConfigs,
    [channel]: {
      ...current,
      enabled: !current.enabled,
    },
  };

  await updateHotelConfig(hotelId, { channelConfigs: updated });

  return NextResponse.redirect(new URL("/admin/channels", req.url));
}
