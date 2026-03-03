// Path: /root/begasist/lib/channels/whatsapp/getTwilioClientForHotel.ts
import { getHotelConfig } from "@/lib/config/hotelConfig.server";

type TwilioClientConfig = {
  accountSid: string;
  authToken: string;
};

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeWhatsAppFrom(value: string | null): string | null {
  if (!value) return null;
  if (value.toLowerCase().startsWith("whatsapp:")) return value;
  if (value.startsWith("+")) return `whatsapp:${value}`;
  return value;
}

export async function getTwilioClientForHotel(hotelId: string): Promise<{ client: TwilioClientConfig; from: string }> {
  const config = await getHotelConfig(hotelId).catch(() => null);
  const wa = config?.channelConfigs?.whatsapp as Record<string, unknown> | undefined;

  const dbAccountSid = asNonEmptyString(wa?.twilioAccountSid);
  const dbAuthToken = asNonEmptyString(wa?.twilioAuthToken);
  const dbFrom = normalizeWhatsAppFrom(asNonEmptyString(wa?.twilioFrom));

  const accountSid = dbAccountSid ?? asNonEmptyString(process.env.TWILIO_ACCOUNT_SID);
  const authToken = dbAuthToken ?? asNonEmptyString(process.env.TWILIO_AUTH_TOKEN);
  const from = dbFrom ?? normalizeWhatsAppFrom(asNonEmptyString(process.env.TWILIO_WHATSAPP_FROM));

  if (!accountSid || !authToken) {
    throw new Error("Missing Twilio credentials (hotel_config twilioAccountSid/twilioAuthToken or env fallback)");
  }
  if (!from) {
    throw new Error("Missing Twilio from number (hotel_config twilioFrom or env TWILIO_WHATSAPP_FROM)");
  }

  return {
    client: { accountSid, authToken },
    from,
  };
}
