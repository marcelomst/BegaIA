// Path: /root/begasist/lib/db/whatsappTwilioRouting.ts
import { getHotelConfigCollection } from "@/lib/config/hotelConfig.server";

const ROUTING_CACHE_TTL_MS = 60_000;
const routingCache = new Map<string, { hotelId: string | null; expiresAt: number }>();

function normalizeTwilioTo(value: string | null | undefined): string {
  const trimmed = String(value ?? "").trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed.startsWith("whatsapp:") ? trimmed : `whatsapp:${trimmed}`;
}

function collectCandidateNumbers(whatsappCfg: Record<string, any> | null | undefined): string[] {
  if (!whatsappCfg || typeof whatsappCfg !== "object") return [];
  const directFields = [
    whatsappCfg.twilioTo,
    whatsappCfg.twilioNumber,
    whatsappCfg.twilioWhatsAppTo,
  ];
  const arrayFields = [
    ...(Array.isArray(whatsappCfg.numbers) ? whatsappCfg.numbers : []),
    ...(Array.isArray(whatsappCfg.toNumbers) ? whatsappCfg.toNumbers : []),
  ];
  return [...directFields, ...arrayFields]
    .map((candidate) => normalizeTwilioTo(candidate == null ? "" : String(candidate)))
    .filter(Boolean);
}

export async function resolveHotelIdByTwilioTo(input: { to: string }): Promise<string | null> {
  const normalizedTo = normalizeTwilioTo(input.to);
  if (!normalizedTo) return null;

  const now = Date.now();
  const cached = routingCache.get(normalizedTo);
  if (cached && cached.expiresAt > now) {
    return cached.hotelId;
  }

  try {
    const collection = getHotelConfigCollection();
    const docs = await collection.find({}).toArray();

    let resolvedHotelId: string | null = null;
    for (const doc of docs) {
      const hotelId = typeof doc?.hotelId === "string" ? doc.hotelId : null;
      if (!hotelId) continue;
      const candidates = collectCandidateNumbers(doc?.channelConfigs?.whatsapp);
      if (candidates.includes(normalizedTo)) {
        resolvedHotelId = hotelId;
        break;
      }
    }

    routingCache.set(normalizedTo, {
      hotelId: resolvedHotelId,
      expiresAt: now + ROUTING_CACHE_TTL_MS,
    });
    return resolvedHotelId;
  } catch (error) {
    console.warn("[WA_TWILIO_ROUTING_LOOKUP_FAILED]", {
      to: normalizedTo,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
