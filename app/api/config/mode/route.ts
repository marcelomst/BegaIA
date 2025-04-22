// /app/api/config/mode/route.ts
import { NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const channel = url.searchParams.get("channel");

  if (!channel) {
    return NextResponse.json({ error: "Falta el parámetro 'channel'" }, { status: 400 });
  }

  const hotelId = "hotel123"; // simulado
  const config = await getHotelConfig(hotelId);
  const current = config?.channelConfigs?.[channel];

  if (!current) {
    return NextResponse.json({ error: "Canal no configurado" }, { status: 404 });
  }

  const newMode = current.mode === "auto" ? "supervised" : "auto";

  await updateHotelConfig(hotelId, {
    channelConfigs: {
      ...config.channelConfigs,
      [channel]: {
        ...current,
        mode: newMode,
      },
    },
  });

  return NextResponse.redirect(new URL("/admin/channels", req.url));
}
