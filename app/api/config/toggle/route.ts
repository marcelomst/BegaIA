// /app/api/config/toggle/route.ts
import { NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const channel = url.searchParams.get("channel");

  if (!channel) {
    return NextResponse.json({ error: "Falta el parámetro 'channel'" }, { status: 400 });
  }

  const hotelId = "hotel123"; // ← Simulado
  const config = await getHotelConfig(hotelId);

  const current = config?.channelConfigs?.[channel];
  if (!current) {
    return NextResponse.json({ error: "Canal no configurado" }, { status: 404 });
  }

  const updatedConfigs = {
    ...config.channelConfigs,
    [channel]: {
      ...current,
      enabled: !current.enabled, // ← alternamos el valor
    },
  };

  await updateHotelConfig(hotelId, { channelConfigs: updatedConfigs });

  return NextResponse.redirect(new URL("/admin/channels", req.url));
}
