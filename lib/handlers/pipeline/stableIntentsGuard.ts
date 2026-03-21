import { getHotelConfig } from "@/lib/config/hotelConfig.server";

export type StableIntentKey =
  | "faq_check_in_time"
  | "faq_check_out_time"
  | "faq_breakfast_hours"
  | "faq_wifi"
  | "faq_parking";

export interface StableIntentGuardInput {
  rawQuery: string;
  hotelId: string;
  preferredLanguage: "es" | "en" | "pt";
  conversationId?: string;
}

export interface StableIntentGuardResult {
  matched: boolean;
  intentKey?: StableIntentKey;
  detectedIntentKey?: StableIntentKey;
  normalizedQuery?: string;
  response?: string;
  routingDecision: "served" | "blocked_by_policy" | "no_match";
  hotelPolicyApplied: boolean;
  policyEnabled?: boolean;
  policySource?: "hotel_config.semanticPolicy.stableIntents" | "default_catalog";
  responseSource?: string;
}

type StableIntentCatalogEntry = {
  intentKey: StableIntentKey;
  enabled: boolean;
  responseSource: string;
  examples?: string[];
  notes?: string;
};

type StableIntentCatalog = Record<StableIntentKey, StableIntentCatalogEntry>;

const DEFAULT_STABLE_INTENTS_CATALOG: StableIntentCatalog = {
  faq_check_in_time: {
    intentKey: "faq_check_in_time",
    enabled: true,
    responseSource: "schedules.checkIn",
    examples: ["a que hora es el check in", "check-in?", "check iin"],
    notes: "Horario de check-in estable del hotel",
  },
  faq_check_out_time: {
    intentKey: "faq_check_out_time",
    enabled: true,
    responseSource: "schedules.checkOut",
    examples: ["a que hora es el check-out", "checkout?", "hora checkout"],
    notes: "Horario de check-out estable del hotel",
  },
  faq_breakfast_hours: {
    intentKey: "faq_breakfast_hours",
    enabled: true,
    responseSource: "schedules.breakfast",
    examples: ["desayuno?", "incluye desayuno?", "breakfast"],
    notes: "Horario de desayuno estable del hotel",
  },
  faq_wifi: {
    intentKey: "faq_wifi",
    enabled: true,
    responseSource: "amenities.wifiNotes",
    examples: ["wifi?", "wifi password?", "internet"],
    notes: "Disponibilidad y notas de Wi-Fi",
  },
  faq_parking: {
    intentKey: "faq_parking",
    enabled: true,
    responseSource: "amenities.parkingNotes",
    examples: ["hay parking?", "parking", "estacionamiento"],
    notes: "Disponibilidad y notas de parking",
  },
};

function normalizeStableIntentInput(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[¡!¿?.,;:()[\]"'`]/g, " ")
    .replace(/\bcheck\s*[- ]*\s*i+n\b/g, " checkin ")
    .replace(/\bcheck\s*[- ]*\s*out\b/g, " checkout ")
    .replace(/\bwi\s*[- ]*\s*fi\b/g, " wifi ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksTransactional(text: string): boolean {
  return /\b(reserv(ar|a|o|as)?|booking|book|modify|modificar|cambiar|alterar|cancel(ar|arla)?|cancel|disponibilidad|availability|habitacion|habitacion|quarto|room|estadia|stay)\b/i.test(
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
  const mentionsBreakfast = /\b(desayuno|breakfast|cafe da manha)\b/i.test(normalized);
  const asksBreakfast = /\b(incluye|include|included|incluido|incluida|hora|horario|time)\b/i.test(normalized);
  const isBareBreakfast = /^(desayuno|breakfast|cafe da manha)$/.test(normalized);
  const isWifiFaq = /^(wifi|internet)$/.test(normalized)
    || /\b(tienen wifi|hay wifi|wifi gratis|wifi free|wifi password|clave wifi|password wifi|internet disponible)\b/i.test(normalized);
  const isParkingFaq = /^(parking|estacionamiento|aparcamiento)$/.test(normalized)
    || /\b(hay parking|tienen parking|parking incluido|donde estaciono|donde aparco|estacionamiento disponible|tienen estacionamiento)\b/i.test(normalized);

  if (mentionsCheckIn && (asksTime || isBareCheckIn)) return "faq_check_in_time";
  if (mentionsCheckOut && (asksTime || isBareCheckOut)) return "faq_check_out_time";
  if (mentionsBreakfast && (asksBreakfast || isBareBreakfast)) return "faq_breakfast_hours";
  if (isWifiFaq) return "faq_wifi";
  if (isParkingFaq) return "faq_parking";
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

function getStableFaqDetails(hotel: any) {
  return {
    breakfast:
      hotel?.schedules?.breakfast ||
      hotel?.meals?.breakfast?.hours ||
      undefined,
    wifiNotes:
      hotel?.amenities?.wifiNotes ||
      hotel?.wifi?.notes ||
      hotel?.wifi?.passwordNotes ||
      undefined,
    parkingNotes:
      hotel?.amenities?.parkingNotes ||
      hotel?.parking?.notes ||
      undefined,
  };
}

function buildStableIntentResponse(
  lang: "es" | "en" | "pt",
  intentKey: StableIntentKey,
  times: { checkIn?: string; checkOut?: string },
  details?: { breakfast?: string; wifiNotes?: string; parkingNotes?: string }
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
  if (intentKey === "faq_check_out_time") {
    if (times.checkOut) {
      if (lang === "pt") return `O check-out vai até ${times.checkOut}.`;
      if (lang === "en") return `Check-out is until ${times.checkOut}.`;
      return `El check-out es hasta las ${times.checkOut}.`;
    }
    if (lang === "pt") return "Posso confirmar o horário exato de check-out com a recepção.";
    if (lang === "en") return "I can confirm the exact check-out time with reception.";
    return "Puedo confirmar el horario exacto de check-out con recepción.";
  }
  if (intentKey === "faq_breakfast_hours") {
    if (details?.breakfast) {
      if (lang === "pt") return `O café da manhã é servido das ${details.breakfast}.`;
      if (lang === "en") return `Breakfast is served from ${details.breakfast}.`;
      return `El desayuno se sirve de ${details.breakfast}.`;
    }
    if (lang === "pt") return "Posso confirmar o horário do café da manhã com a recepção.";
    if (lang === "en") return "I can confirm breakfast hours with reception.";
    return "Puedo confirmar el horario del desayuno con recepción.";
  }
  if (intentKey === "faq_wifi") {
    if (details?.wifiNotes) return details.wifiNotes;
    if (lang === "pt") return "Sim, contamos com Wi-Fi no hotel. Se quiser, confirmo a rede e o acesso com a recepção.";
    if (lang === "en") return "Yes, we have Wi-Fi at the hotel. If you want, I can confirm the network and access details with reception.";
    return "Sí, contamos con Wi-Fi en el hotel. Si querés, confirmo la red y los datos de acceso con recepción.";
  }
  if (intentKey === "faq_parking") {
    if (details?.parkingNotes) return details.parkingNotes;
    if (lang === "pt") return "Temos estacionamento, sujeito à disponibilidade. Se quiser, confirmo as condições com a recepção.";
    if (lang === "en") return "We have parking, subject to availability. If you want, I can confirm the conditions with reception.";
    return "Contamos con estacionamiento, sujeto a disponibilidad. Si querés, confirmo las condiciones con recepción.";
  }
  if (lang === "pt") return "Posso confirmar o detalhe com a recepção.";
  if (lang === "en") return "I can confirm that detail with reception.";
  return "Puedo confirmar ese detalle con recepción.";
}

function resolveStableIntentCatalog(hotel: any): StableIntentCatalog {
  const configured = hotel?.semanticPolicy?.stableIntents;
  const catalog = { ...DEFAULT_STABLE_INTENTS_CATALOG } as StableIntentCatalog;

  if (!configured || typeof configured !== "object") {
    return catalog;
  }

  for (const key of Object.keys(catalog) as StableIntentKey[]) {
    const override = configured[key];
    if (override == null) continue;

    if (typeof override === "boolean") {
      catalog[key] = {
        ...catalog[key],
        enabled: override,
      };
      continue;
    }

    if (typeof override === "object") {
      catalog[key] = {
        ...catalog[key],
        enabled: typeof override.enabled === "boolean" ? override.enabled : catalog[key].enabled,
        responseSource:
          typeof override.responseSource === "string" && override.responseSource.trim()
            ? override.responseSource.trim()
            : catalog[key].responseSource,
        examples: Array.isArray(override.examples) ? [...override.examples] : catalog[key].examples,
        notes:
          typeof override.notes === "string" && override.notes.trim()
            ? override.notes.trim()
            : catalog[key].notes,
      };
    }
  }

  return catalog;
}

export async function runStableIntentsGuard(
  input: StableIntentGuardInput
): Promise<StableIntentGuardResult> {
  const normalizedQuery = normalizeStableIntentInput(input.rawQuery);
  const intentKey = detectStableIntent(normalizedQuery);
  if (!intentKey) {
    return {
      matched: false,
      normalizedQuery,
      routingDecision: "no_match",
      hotelPolicyApplied: false,
    };
  }

  const hotel = await getHotelConfig(input.hotelId).catch(() => null);
  const catalog = resolveStableIntentCatalog(hotel);
  const configured = hotel?.semanticPolicy?.stableIntents;
  const hasHotelOverride = Boolean(
    configured &&
    typeof configured === "object" &&
    Object.prototype.hasOwnProperty.call(configured, intentKey)
  );
  const policySource = hasHotelOverride
    ? "hotel_config.semanticPolicy.stableIntents"
    : "default_catalog";
  const policy = catalog[intentKey];

  if (!policy?.enabled) {
    return {
      matched: false,
      detectedIntentKey: intentKey,
      normalizedQuery,
      routingDecision: "blocked_by_policy",
      hotelPolicyApplied: true,
      policyEnabled: false,
      policySource,
      responseSource: policy?.responseSource,
    };
  }
  const response = buildStableIntentResponse(
    input.preferredLanguage,
    intentKey,
    getConfiguredCheckTimes(hotel),
    getStableFaqDetails(hotel)
  );
  return {
    matched: true,
    intentKey,
    detectedIntentKey: intentKey,
    normalizedQuery,
    response,
    routingDecision: "served",
    hotelPolicyApplied: true,
    policyEnabled: true,
    policySource,
    responseSource: policy.responseSource,
  };
}

export const __stableIntentsForTest = {
  normalizeStableIntentInput,
  detectStableIntent,
  resolveStableIntentCatalog,
  DEFAULT_STABLE_INTENTS_CATALOG,
};
