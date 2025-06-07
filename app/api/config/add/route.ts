// /app/api/config/add/route.ts
import { NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import { ChannelMode } from "@/types/channel";
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
  const redirectUrl = new URL("/admin/channels", req.url);
  redirectUrl.searchParams.set("hotelId", hotelId);
  return NextResponse.redirect(redirectUrl);

}
