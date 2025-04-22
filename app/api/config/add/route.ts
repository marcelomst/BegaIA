// /app/api/config/add/route.ts
import { NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig, type ChannelMode } from "@/lib/config/hotelConfig.server";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const channel = url.searchParams.get("channel");

  const allowedChannels = ["web", "email", "whatsapp", "channelManager"];

  // 🚫 Verificamos si es un canal permitido
  if (!channel || !allowedChannels.includes(channel)) {
    return NextResponse.json({ error: "Canal no permitido" }, { status: 400 });
  }

  const hotelId = "hotel123"; // Simulado
  const config = await getHotelConfig(hotelId);

  // ✅ Si ya existe, no hacer nada
  if (config?.channelConfigs?.[channel]) {
    return NextResponse.json({ message: "Canal ya está configurado" }, { status: 200 });
  }

  // ✅ Agrega el canal a la configuración
  const updatedConfigs = {
    ...config?.channelConfigs,
    [channel]: {
      enabled: false,
      mode: "supervised" as ChannelMode,
    },
  };

  await updateHotelConfig(hotelId, { channelConfigs: updatedConfigs });

  // ✅ Redirige de nuevo a la página de canales
  return NextResponse.redirect(new URL("/admin/channels", req.url));
}
