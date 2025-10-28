// /app/api/config/mode/route.ts
import { NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import type { ChannelMode } from "@/types/channel";
import { parseChannel } from "@/lib/utils/parseChannel";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const rawChannel = url.searchParams.get("channel");
  const hotelId = url.searchParams.get("hotelId");
  const channel = parseChannel(rawChannel);

  if (!hotelId) {
    return NextResponse.json({ error: "Falta hotelId" }, { status: 400 });
  }
  if (!channel) {
    return NextResponse.json({ error: "Canal no permitido" }, { status: 400 });
  }

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

  // Redirige a canales manteniendo el hotelId en el query
  const redirectUrl = new URL("/admin/channels", req.url);
  redirectUrl.searchParams.set("hotelId", hotelId);
  return NextResponse.redirect(redirectUrl);
}
// Nota: Este endpoint cambia el modo de un canal entre "automatic" y "supervised"
// y redirige a la página de canales con el hotelId en el query.
// Asegúrate de que el hotelId se maneje correctamente en tu aplicación para que este endpoint funcione como se espera.