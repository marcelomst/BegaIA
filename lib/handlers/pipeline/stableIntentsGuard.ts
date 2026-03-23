import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import type { GuestState } from "@/lib/db/convState";

export type StableIntentKey =
  | "faq_check_in_time"
  | "faq_check_out_time"
  | "faq_breakfast_hours"
  | "faq_breakfast_included"
  | "faq_breakfast_type"
  | "faq_wifi"
  | "faq_wifi_quality"
  | "faq_parking";

export interface StableIntentGuardInput {
  rawQuery: string;
  hotelId: string;
  preferredLanguage: "es" | "en" | "pt";
  conversationId?: string;
  guestState?: GuestState;
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
    examples: ["desayuno?", "a que hora es el desayuno?", "breakfast hours"],
    notes: "Horario de desayuno estable del hotel",
  },
  faq_breakfast_included: {
    intentKey: "faq_breakfast_included",
    enabled: true,
    responseSource: "meals.breakfast.included",
    examples: ["el desayuno esta incluido?", "incluye desayuno?", "breakfast included"],
    notes: "Inclusión del desayuno en la tarifa o servicio",
  },
  faq_breakfast_type: {
    intentKey: "faq_breakfast_type",
    enabled: true,
    responseSource: "meals.breakfast.type",
    examples: ["el desayuno es buffet?", "breakfast buffet?", "tipo de desayuno"],
    notes: "Modalidad o tipo de desayuno",
  },
  faq_wifi: {
    intentKey: "faq_wifi",
    enabled: true,
    responseSource: "amenities.wifiNotes",
    examples: ["wifi?", "wifi password?", "hay wifi gratis?"],
    notes: "Disponibilidad y notas de Wi-Fi",
  },
  faq_wifi_quality: {
    intentKey: "faq_wifi_quality",
    enabled: true,
    responseSource: "wifi.quality",
    examples: ["necesito wifi para trabajar", "el wifi anda bien?", "wifi estable"],
    notes: "Calidad, estabilidad o adecuación del Wi-Fi para uso intensivo",
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
  const mentionsBreakfast = /\b(desayuno|breakfast|cafe da manha)\b/i.test(normalized);
  const asksBreakfastTime = /\b(a que hora|que hora|hora|horario|schedule|time|when|starts|start|begins|begin|comienza|empieza|abre)\b/i.test(
    normalized
  );
  const asksBreakfastIncluded = /\b(incluye|include|included|incluido|incluida|esta incluido|esta incluida|is included)\b/i.test(normalized);
  const asksBreakfastType = /\b(buffet|bufet|continental|americano|tipo de desayuno|breakfast type)\b/i.test(normalized);
  const isBareBreakfast = /^(desayuno|breakfast|cafe da manha)$/.test(normalized);
  const isWifiFaq = /^(wifi|internet)$/.test(normalized)
    || /\b(tienen wifi|hay wifi|wifi gratis|wifi free|wifi password|clave wifi|password wifi|internet disponible)\b/i.test(normalized);
  const isWifiQualityFaq = /\b(necesito wifi para trabajar|wifi para trabajar|el wifi anda bien|wifi anda bien|wifi estable|wifi rapido|wifi rápido|internet estable|internet rapido|internet rápido)\b/i.test(normalized);
  const isParkingFaq = /^(parking|estacionamiento|aparcamiento)$/.test(normalized)
    || /\b(hay parking|tienen parking|parking incluido|donde estaciono|donde aparco|estacionamiento disponible|tienen estacionamiento)\b/i.test(normalized)
    || /^(quiero|necesito)\s+(parking|estacionamiento|aparcamiento)(?:\s+(?:para|por)\s+.+)?$/i.test(normalized)
    || /\b(quiero|necesito)\s+(?:saber\s+si\s+)?(?:hay\s+)?(parking|estacionamiento|aparcamiento)\b/i.test(normalized);

  if (mentionsCheckIn && (asksTime || isBareCheckIn)) return "faq_check_in_time";
  if (mentionsCheckOut && (asksTime || isBareCheckOut)) return "faq_check_out_time";
  if (mentionsBreakfast && asksBreakfastIncluded) return "faq_breakfast_included";
  if (mentionsBreakfast && asksBreakfastType) return "faq_breakfast_type";
  if (mentionsBreakfast && (asksBreakfastTime || isBareBreakfast)) return "faq_breakfast_hours";
  if (isWifiQualityFaq) return "faq_wifi_quality";
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
    breakfastIncluded:
      hotel?.meals?.breakfast?.included ??
      hotel?.breakfast?.included ??
      undefined,
    breakfastType:
      hotel?.meals?.breakfast?.type ||
      hotel?.breakfast?.type ||
      undefined,
    wifiNotes:
      hotel?.amenities?.wifiNotes ||
      hotel?.wifi?.notes ||
      hotel?.wifi?.passwordNotes ||
      undefined,
    wifiQuality:
      hotel?.wifi?.quality ||
      hotel?.wifi?.speed ||
      hotel?.amenities?.wifiQuality ||
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
  guestState?: GuestState,
  details?: {
    breakfast?: string;
    breakfastIncluded?: boolean | string;
    breakfastType?: string;
    wifiNotes?: string;
    wifiQuality?: string;
    parkingNotes?: string;
  }
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
  if (intentKey === "faq_breakfast_included") {
    const included = details?.breakfastIncluded;
    if (typeof included === "boolean") {
      if (included) {
        if (lang === "pt") return details?.breakfast ? `O café da manhã está incluído. O horário atual é ${details.breakfast}.` : "O café da manhã está incluído.";
        if (lang === "en") return details?.breakfast ? `Breakfast is included. Current hours are ${details.breakfast}.` : "Breakfast is included.";
        return details?.breakfast ? `El desayuno está incluido. El horario actual es ${details.breakfast}.` : "El desayuno está incluido.";
      }
      if (lang === "pt") return "O hotel oferece café da manhã, mas ele não está incluído por padrão na tarifa.";
      if (lang === "en") return "The hotel offers breakfast, but it is not included by default in the rate.";
      return "El hotel ofrece desayuno, pero no está incluido por defecto en la tarifa.";
    }
    if (typeof included === "string" && included.trim()) return included.trim();
    if (guestState === "in_house") {
      if (lang === "pt") return "Se você já está hospedado, a inclusão do café da manhã depende da tarifa registrada no seu check-in. Isso costuma constar na confirmação ou pode ser validado rapidamente na recepção.";
      if (lang === "en") return "If you are already staying with us, breakfast inclusion depends on the rate attached to your check-in. It is usually listed on your booking confirmation and can be quickly verified at the front desk.";
      return "Si ya estás alojado, la inclusión del desayuno depende de la tarifa registrada en tu check-in. Suele figurar en tu confirmación y puede validarse rápido en recepción.";
    }
    if (guestState === "booked") {
      if (lang === "pt") return "Se você já tem uma reserva, a inclusão do café da manhã depende da tarifa confirmada. Vale revisar a confirmação da reserva para ver se ele já está contemplado.";
      if (lang === "en") return "If you already have a booking, breakfast inclusion depends on the confirmed rate. It is best to check your booking confirmation to see whether it is already included.";
      return "Si ya tenés una reserva, la inclusión del desayuno depende de la tarifa confirmada. Conviene revisar la confirmación para ver si ya está contemplado.";
    }
    if (lang === "pt") return details?.breakfast ? `O hotel oferece café da manhã das ${details.breakfast}. Se quiser, confirmo se ele está incluído na sua tarifa.` : "Posso confirmar com a recepção se o café da manhã está incluído na sua tarifa.";
    if (lang === "en") return details?.breakfast ? `The hotel serves breakfast from ${details.breakfast}. If you want, I can confirm whether it is included in your rate.` : "I can confirm with reception whether breakfast is included in your rate.";
    return details?.breakfast ? `El hotel ofrece desayuno de ${details.breakfast}. Si querés, confirmo si está incluido en tu tarifa.` : "Puedo confirmar con recepción si el desayuno está incluido en tu tarifa.";
  }
  if (intentKey === "faq_breakfast_type") {
    if (details?.breakfastType) {
      if (lang === "pt") return details?.breakfast ? `O café da manhã é ${details.breakfastType}. O horário atual é ${details.breakfast}.` : `O café da manhã é ${details.breakfastType}.`;
      if (lang === "en") return details?.breakfast ? `Breakfast is ${details.breakfastType}. Current hours are ${details.breakfast}.` : `Breakfast is ${details.breakfastType}.`;
      return details?.breakfast ? `El desayuno es ${details.breakfastType}. El horario actual es ${details.breakfast}.` : `El desayuno es ${details.breakfastType}.`;
    }
    if (lang === "pt") return details?.breakfast ? `O hotel oferece café da manhã das ${details.breakfast}. Se quiser, confirmo se ele é buffet ou outro formato.` : "Posso confirmar com a recepção se o café da manhã é buffet ou qual é a modalidade.";
    if (lang === "en") return details?.breakfast ? `The hotel serves breakfast from ${details.breakfast}. If you want, I can confirm whether it is buffet-style or another format.` : "I can confirm with reception whether breakfast is buffet-style or another format.";
    return details?.breakfast ? `El hotel ofrece desayuno de ${details.breakfast}. Si querés, confirmo si es buffet u otra modalidad.` : "Puedo confirmar con recepción si el desayuno es buffet u otra modalidad.";
  }
  if (intentKey === "faq_wifi") {
    if (details?.wifiNotes) return details.wifiNotes;
    if (guestState === "in_house") {
      if (lang === "pt") return "Se você já está hospedado, o Wi-Fi do hotel deveria estar disponível para uso. Se não recebeu os dados de acesso no check-in, a recepção pode validá-los no momento.";
      if (lang === "en") return "If you are already staying with us, the hotel Wi-Fi should already be available for use. If you did not receive the access details at check-in, the front desk can validate them right away.";
      return "Si ya estás alojado, el Wi-Fi del hotel debería estar disponible para uso. Si no te dieron los datos de acceso al hacer check-in, recepción puede validarlos en el momento.";
    }
    if (lang === "pt") return "Sim, contamos com Wi-Fi no hotel. Se quiser, confirmo a rede e o acesso com a recepção.";
    if (lang === "en") return "Yes, we have Wi-Fi at the hotel. If you want, I can confirm the network and access details with reception.";
    return "Sí, contamos con Wi-Fi en el hotel. Si querés, confirmo la red y los datos de acceso con recepción.";
  }
  if (intentKey === "faq_wifi_quality") {
    if (details?.wifiQuality) return String(details.wifiQuality);
    if (details?.wifiNotes) {
      if (guestState === "in_house") {
        if (lang === "pt") return `${details.wifiNotes} Como você já está hospedado, se notar instabilidade no quarto ou em alguma área, a recepção pode revisar o acesso sem depender de nova confirmação.`;
        if (lang === "en") return `${details.wifiNotes} Since you are already staying with us, if you notice instability in your room or a specific area, the front desk can review the access without needing a new confirmation.`;
        return `${details.wifiNotes} Como ya estás alojado, si notás inestabilidad en la habitación o en algún sector, recepción puede revisar el acceso sin depender de una nueva confirmación.`;
      }
      if (lang === "pt") return `${details.wifiNotes} Se precisar usar para trabalho, posso confirmar estabilidade e cobertura com a recepção.`;
      if (lang === "en") return `${details.wifiNotes} If you need it for work, I can confirm stability and coverage with reception.`;
      return `${details.wifiNotes} Si lo necesitás para trabajar, puedo confirmar estabilidad y cobertura con recepción.`;
    }
    if (guestState === "in_house") {
      if (lang === "pt") return "Se você já está hospedado, o Wi-Fi do hotel deveria estar ativo. Se precisar trabalhar, a recepção pode ajudar a validar cobertura e estabilidade no seu quarto ou área comum.";
      if (lang === "en") return "If you are already staying with us, the hotel Wi-Fi should already be active. If you need it for work, the front desk can help validate coverage and stability in your room or in common areas.";
      return "Si ya estás alojado, el Wi-Fi del hotel debería estar activo. Si lo necesitás para trabajar, recepción puede ayudarte a validar cobertura y estabilidad en tu habitación o en áreas comunes.";
    }
    if (guestState === "booked") {
      if (lang === "pt") return "O hotel conta com Wi-Fi. Como você já tem reserva, no check-in poderão indicar a melhor rede ou setor caso precise trabalhar durante a estadia.";
      if (lang === "en") return "The hotel has Wi-Fi. Since you already have a booking, at check-in they can point you to the best network or area if you need to work during your stay.";
      return "El hotel cuenta con Wi-Fi. Como ya tenés una reserva, al hacer check-in podrán indicarte la mejor red o sector si necesitás trabajar durante la estadía.";
    }
    if (lang === "pt") return "Temos Wi-Fi no hotel. Se você precisar usar para trabalho, posso confirmar estabilidade, velocidade e cobertura com a recepção.";
    if (lang === "en") return "We have Wi-Fi at the hotel. If you need it for work, I can confirm stability, speed, and coverage with reception.";
    return "Contamos con Wi-Fi en el hotel. Si lo necesitás para trabajar, puedo confirmar estabilidad, velocidad y cobertura con recepción.";
  }
  if (intentKey === "faq_parking") {
    if (details?.parkingNotes) {
      if (guestState === "in_house") {
        if (lang === "pt") return `${details.parkingNotes} Como você já está hospedado, a recepção pode orientar o acesso ou a dinâmica de uso no momento.`;
        if (lang === "en") return `${details.parkingNotes} Since you are already staying with us, the front desk can guide you on access or current parking operations right away.`;
        return `${details.parkingNotes} Como ya estás alojado, recepción puede indicarte en el momento el acceso o la operativa de uso.`;
      }
      if (guestState === "booked") {
        if (lang === "pt") return `${details.parkingNotes} Como você já tem reserva, vale confirmar antes da chegada se precisa deixar o carro no hotel.`;
        if (lang === "en") return `${details.parkingNotes} Since you already have a booking, it is worth confirming before arrival if you need to leave your car at the hotel.`;
        return `${details.parkingNotes} Como ya tenés una reserva, conviene confirmarlo antes de llegar si necesitás dejar el auto en el hotel.`;
      }
      return details.parkingNotes;
    }
    if (guestState === "in_house") {
      if (lang === "pt") return "O estacionamento está sujeito à disponibilidade. Como você já está hospedado, a recepção pode indicar agora mesmo o acesso ou a dinâmica de uso.";
      if (lang === "en") return "Parking is subject to availability. Since you are already staying with us, the front desk can point you to the access or current parking process right away.";
      return "El estacionamiento está sujeto a disponibilidad. Como ya estás alojado, recepción puede indicarte ahora mismo el acceso o la operativa de uso.";
    }
    if (guestState === "booked") {
      if (lang === "pt") return "O estacionamento está sujeito à disponibilidade. Como você já tem reserva, vale confirmá-lo antes da chegada se for um requisito da sua estadia.";
      if (lang === "en") return "Parking is subject to availability. Since you already have a booking, it is best to confirm it before arrival if it is important for your stay.";
      return "El estacionamiento está sujeto a disponibilidad. Como ya tenés una reserva, conviene confirmarlo antes de llegar si es importante para tu estadía.";
    }
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
    input.guestState,
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
