// /app/api/config/whatsapp/route.ts

import { NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import type { WhatsAppConfig } from "@/types/channel";

export async function POST(req: Request) {
  const body = await req.json();
  const { hotelId, celNumber, apiKey } = body;
  if (!hotelId || !celNumber) {
    return NextResponse.json({ error: "Faltan campos obligatorios." }, { status: 400 });
  }

  const config = await getHotelConfig(hotelId);
  if (!config) {
    return NextResponse.json({ error: "Hotel no encontrado" }, { status: 404 });
  }

  // Chequear si ya hay una config previa (usa tipado WhatsAppConfig si está)
  const prev = config.channelConfigs?.whatsapp as WhatsAppConfig | undefined;

  await updateHotelConfig(hotelId, {
    channelConfigs: {
      ...config.channelConfigs,
      whatsapp: {
        enabled: true,
        mode: prev?.mode ?? "supervised",
        celNumber,
        apiKey,
      },
    },
  });

  return NextResponse.json({ ok: true });
}
