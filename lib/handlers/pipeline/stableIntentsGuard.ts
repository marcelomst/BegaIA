import { getHotelConfig } from "@/lib/config/hotelConfig.server";

export type StableIntentKey = "faq_check_in_time" | "faq_check_out_time";

export interface StableIntentGuardInput {
  rawQuery: string;
  hotelId: string;
  preferredLanguage: "es" | "en" | "pt";
  conversationId?: string;
}

export interface StableIntentGuardResult {
  matched: boolean;
  intentKey?: StableIntentKey;
  normalizedQuery?: string;
  response?: string;
}

function normalizeStableIntentInput(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[¡!¿?.,;:()[\]"'`]/g, " ")
    .replace(/\bcheck\s*[- ]*\s*i+n\b/g, " checkin ")
    .replace(/\bcheck\s*[- ]*\s*out\b/g, " checkout ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksTransactional(text: string): boolean {
  return /\b(reserv(ar|a|o|as)?|booking|book|modify|modificar|cambiar|alterar|cancel(ar|arla)?|cancel|disponibilidad|availability|habitacion|habitacion|quarto|room)\b/i.test(
    text
  );
}

function detectStableIntent(normalized: string): StableIntentKey | null {
  if (!normalized) return null;
  if (looksTransactional(normalized)) return null;

  const asksTime = /\b(a que hora|que hora|hora|horario|schedule|time|when|starts|start|begins|begin|comienza|empieza|abre)\b/i.test(
    normalized
  );
  const mentionsCheckIn = /\b(checkin|ingreso|entrada|llegada|arribo)\b/i.test(normalized);
  const mentionsCheckOut = /\b(checkout|salida|egreso|partida|retirada)\b/i.test(normalized);
  const isBareCheckIn = /^(checkin)$/.test(normalized);
  const isBareCheckOut = /^(checkout)$/.test(normalized);

  if (mentionsCheckIn && (asksTime || isBareCheckIn)) return "faq_check_in_time";
  if (mentionsCheckOut && (asksTime || isBareCheckOut)) return "faq_check_out_time";
  return null;
}

function getConfiguredCheckTimes(hotel: any): { checkIn?: string; checkOut?: string } {
  return {
    checkIn:
      hotel?.schedules?.checkIn ||
      hotel?.policies?.checkInTime ||
      hotel?.checkInTime ||
      undefined,
    checkOut:
      hotel?.schedules?.checkOut ||
      hotel?.policies?.checkOutTime ||
      hotel?.checkOutTime ||
      undefined,
  };
}

function buildStableIntentResponse(
  lang: "es" | "en" | "pt",
  intentKey: StableIntentKey,
  times: { checkIn?: string; checkOut?: string }
): string {
  if (intentKey === "faq_check_in_time") {
    if (times.checkIn) {
      if (lang === "pt") return `O check-in começa às ${times.checkIn}.`;
      if (lang === "en") return `Check-in starts at ${times.checkIn}.`;
      return `El check-in comienza a las ${times.checkIn}.`;
    }
    if (lang === "pt") return "Posso confirmar o horário exato de check-in com a recepção.";
    if (lang === "en") return "I can confirm the exact check-in time with reception.";
    return "Puedo confirmar el horario exacto de check-in con recepción.";
  }

  if (times.checkOut) {
    if (lang === "pt") return `O check-out vai até ${times.checkOut}.`;
    if (lang === "en") return `Check-out is until ${times.checkOut}.`;
    return `El check-out es hasta las ${times.checkOut}.`;
  }
  if (lang === "pt") return "Posso confirmar o horário exato de check-out com a recepção.";
  if (lang === "en") return "I can confirm the exact check-out time with reception.";
  return "Puedo confirmar el horario exacto de check-out con recepción.";
}

export async function runStableIntentsGuard(
  input: StableIntentGuardInput
): Promise<StableIntentGuardResult> {
  const normalizedQuery = normalizeStableIntentInput(input.rawQuery);
  const intentKey = detectStableIntent(normalizedQuery);
  if (!intentKey) return { matched: false, normalizedQuery };

  const hotel = await getHotelConfig(input.hotelId).catch(() => null);
  const response = buildStableIntentResponse(input.preferredLanguage, intentKey, getConfiguredCheckTimes(hotel));
  return {
    matched: true,
    intentKey,
    normalizedQuery,
    response,
  };
}

export const __stableIntentsForTest = {
  normalizeStableIntentInput,
  detectStableIntent,
};
