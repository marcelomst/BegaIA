// /app/api/config/toggle/route.ts
import { NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
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

  const updatedConfigs = {
    ...config.channelConfigs,
    [channel]: {
      ...current,
      enabled: !current.enabled, // alternamos el valor
    },
  };

  await updateHotelConfig(hotelId, { channelConfigs: updatedConfigs });

  // Redirige a canales manteniendo el hotelId en el query
  const redirectUrl = new URL("/admin/channels", req.url);
  redirectUrl.searchParams.set("hotelId", hotelId);
  return NextResponse.redirect(redirectUrl);
}
// Nota: Este endpoint alterna el estado de habilitación de un canal
// y redirige a la página de canales con el hotelId en el query.