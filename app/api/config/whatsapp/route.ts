// /app/api/config/whatsapp/route.ts

import { NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import type { WhatsAppConfig } from "@/types/channel";

export async function POST(req: Request) {
  const body = await req.json();
  const {
    hotelId,
    celNumber,
    apiKey,
    provider,
    twilioAccountSid,
    twilioAuthToken,
    twilioWhatsAppNumber,
  } = body;
  if (!hotelId) {
    return NextResponse.json({ error: "Falta hotelId." }, { status: 400 });
  }

  const config = await getHotelConfig(hotelId);
  if (!config) {
    return NextResponse.json({ error: "Hotel no encontrado" }, { status: 404 });
  }

  // Chequear si ya hay una config previa (usa tipado WhatsAppConfig si está)
  const prev = config.channelConfigs?.whatsapp as WhatsAppConfig | undefined;
  const nextProvider = (provider || prev?.provider || "legacy") as "legacy" | "twilio";
  const nextTwilioNumber = typeof twilioWhatsAppNumber === "string" ? twilioWhatsAppNumber : prev?.twilioWhatsAppNumber || prev?.twilioFrom || "";

  await updateHotelConfig(hotelId, {
    channelConfigs: {
      ...config.channelConfigs,
      whatsapp: {
        ...prev,
        enabled: prev?.enabled ?? true,
        mode: prev?.mode ?? "supervised",
        provider: nextProvider,
        celNumber: typeof celNumber === "string" ? celNumber : prev?.celNumber,
        apiKey: typeof apiKey === "string" ? apiKey : prev?.apiKey,
        twilioAccountSid: typeof twilioAccountSid === "string" ? twilioAccountSid : prev?.twilioAccountSid,
        twilioAuthToken: typeof twilioAuthToken === "string" ? twilioAuthToken : prev?.twilioAuthToken,
        twilioWhatsAppNumber: nextTwilioNumber,
        twilioFrom: nextTwilioNumber,
      },
    },
  });

  return NextResponse.json({ ok: true });
}
