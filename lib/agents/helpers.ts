/* eslint-disable @typescript-eslint/no-explicit-any */
import { canonicalizeRoomType, maxGuestsForRoomType } from "@/lib/schemas/reservation";

function extractDirectGuestTotal(text: string): number | undefined {
  const t = String(text || "").toLowerCase();
  const patterns = [
    /\b(\d{1,2})\s*(?:personas|huespedes|huéspedes|pessoas|guests?|people)\b/,
    /\b(?:somos|vamos|seriamos|seríamos|seremos|we are|were)\s+(\d{1,2})\b/,
    /\bpara\s+(\d{1,2})\b(?!\s*(?:adultos?|adults?|mayores?|menor(?:es)?|ninos?|niños?|children|child|kids?|bebes?|bebés?|babies|baby))/,
  ];
  for (const rx of patterns) {
    const match = t.match(rx);
    if (match?.[1]) {
      const parsed = parseInt(match[1], 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  return undefined;
}

function extractSpelledGuestTotal(text: string): number | undefined {
  const t = String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  const numberWords: Record<string, number> = {
    un: 1,
    una: 1,
    uno: 1,
    um: 1,
    uma: 1,
    one: 1,
    dos: 2,
    duas: 2,
    dois: 2,
    two: 2,
    tres: 3,
    three: 3,
    cuatro: 4,
    quatro: 4,
    four: 4,
    cinco: 5,
    five: 5,
  };
  const match = t.match(/\b(un|una|uno|um|uma|one|dos|duas|dois|two|tres|three|cuatro|quatro|four|cinco|five)\s+(?:persona|personas|huesped|huespedes|pessoa|pessoas|guest|guests|people)\b/);
  if (!match?.[1]) return undefined;
  return numberWords[match[1]];
}

function extractComposedGuestTotal(text: string): number | undefined {
  const t = String(text || "").toLowerCase();
  const sumMatches = (rx: RegExp) =>
    Array.from(t.matchAll(rx)).reduce((total, match) => total + parseInt(match[1], 10), 0);
  const adults = sumMatches(/\b(\d{1,2})\s*(?:adultos?|adults?|mayores?)\b/g);
  const children = sumMatches(
    /(?:^|[\s,.;:!?])(\d{1,2})\s*(?:menor(?:es)?|ninos?|niños?|children|child|kids?|bebes?|bebés?|beb[eé]|bab(?:y|ies))(?=$|[\s,.;:!?])/gu
  );
  const total = adults + children;
  return total > 0 ? total : undefined;
}

// Normaliza slots legacy: guests -> numGuests (string)
export function normalizeSlots(slots: any): any {
  if (slots && typeof slots === "object") {
    // Si viene "guests", moverlo a numGuests y normalizar como string
    if ("guests" in (slots as any) && (slots as any).guests != null) {
      slots.numGuests = String((slots as any).guests);
      delete (slots as any).guests;
    }
    if (slots.numGuests != null) {
      slots.numGuests = String(slots.numGuests);
    }
  }
  return slots;
}


// --- Extrae slots básicos del texto del turno (pre-LLM) ---
import type { SlotMap } from "@/types/audit";
export function extractSlotsFromText(text: string, _lang: string): Partial<SlotMap> {
  const out: Partial<SlotMap> = {};
  const rawText = String(text || "");
  const t = (text || "").toLowerCase();
  const normalized = rawText
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[“”"'`]/g, "")
    .replace(/[¡!¿?.,;:()]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const inferYear = (day: number, month: number, explicitYear?: number) => {
    if (typeof explicitYear === "number") return explicitYear < 100 ? 2000 + explicitYear : explicitYear;
    const now = new Date();
    let year = now.getFullYear();
    const candidate = new Date(year, month - 1, day);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (candidate < today) year += 1;
    return year;
  };
  const toISOFromParts = (day: number, month: number, explicitYear?: number) =>
    `${String(inferYear(day, month, explicitYear)).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const toISOWithYear = (day: number, month: number, year: number) =>
    `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  // Fechas: "19/09/2025 al 22/09/2025", "19-09-2025 hasta 22-09-2025"
  const dateRange =
    t.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s*(?:al|hasta|a|-|→|->|—)\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
  if (dateRange) {
    const ci = toISODateDDMMYYYY(dateRange[1]);
    const co = toISODateDDMMYYYY(dateRange[2]);
    if (ci && co) { out.checkIn = ci; out.checkOut = co; }
  } else {
    // sueltos: "check in 19/09/2025" "check-out 22/09/2025"
    const ci = t.match(/check\s*-?\s*in[:\s-]*?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
    const co = t.match(/check\s*-?\s*out[:\s-]*?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
    if (ci?.[1]) out.checkIn = toISODateDDMMYYYY(ci[1]) || out.checkIn;
    if (co?.[1]) out.checkOut = toISODateDDMMYYYY(co[1]) || out.checkOut;
  }
  if (!out.checkIn && !out.checkOut) {
    const months: Record<string, number> = {
      enero: 1, ene: 1, january: 1, jan: 1,
      febrero: 2, feb: 2, february: 2,
      marzo: 3, mar: 3, march: 3,
      abril: 4, abr: 4, apr: 4, april: 4,
      mayo: 5, may: 5,
      junio: 6, jun: 6, june: 6,
      julio: 7, jul: 7, july: 7,
      agosto: 8, ago: 8, aug: 8, august: 8,
      septiembre: 9, setiembre: 9, sept: 9, sep: 9, september: 9,
      octubre: 10, oct: 10, october: 10,
      noviembre: 11, nov: 11, november: 11,
      diciembre: 12, dic: 12, dec: 12, december: 12,
    };
    const applyNamedMonthRange = (
      day1: number,
      month1: number | undefined,
      year1: number | undefined,
      day2: number,
      month2: number | undefined,
      year2: number | undefined
    ) => {
      if (!month1 || !month2) return;
      const resolvedYear1 = inferYear(day1, month1, year1);
      let resolvedYear2 = typeof year2 === "number" ? inferYear(day2, month2, year2) : resolvedYear1;
      if (typeof year2 !== "number") {
        const checkInDate = new Date(resolvedYear1, month1 - 1, day1);
        const checkOutDate = new Date(resolvedYear2, month2 - 1, day2);
        if (checkOutDate <= checkInDate) resolvedYear2 += 1;
      }
      out.checkIn = toISOWithYear(day1, month1, resolvedYear1);
      out.checkOut = toISOWithYear(day2, month2, resolvedYear2);
    };
    const monthRange = t.match(/(?:desde\s+(?:el\s+)?|del?\s+(?:el\s+)?|de\s+)?(\d{1,2})\s*(?:de\s+)?([a-záéíóúñ]+)?(?:\s+de\s+(\d{4}))?\s*(?:al|hasta(?:\s+el)?|a|até|ate|to|until)\s*(?:el\s+|o\s+)?(\d{1,2})\s*(?:de\s+|of\s+)?([a-záéíóúñ]+)?(?:\s+de\s+(\d{4}))?/i);
    if (monthRange) {
      const day1 = parseInt(monthRange[1], 10);
      const month1 = months[monthRange[2]] || months[monthRange[5]];
      const day2 = parseInt(monthRange[4], 10);
      const month2 = months[monthRange[5]] || month1;
      const year1 = monthRange[3]
        ? parseInt(monthRange[3], 10)
        : monthRange[6]
          ? parseInt(monthRange[6], 10)
          : undefined;
      const year2 = monthRange[6] ? parseInt(monthRange[6], 10) : year1;
      applyNamedMonthRange(day1, month1, year1, day2, month2, year2);
    }
    if (!out.checkIn && !out.checkOut) {
      const englishMonthFirstRange = t.match(/(?:from\s+)?([a-záéíóúñ]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\s*(?:to|until)\s*(?:the\s+)?([a-záéíóúñ]+)?\s*(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/i);
      const englishDayFirstRange = t.match(/(?:from\s+)?(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s*(?:to|until)\s*(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s+)?([a-záéíóúñ]+)(?:,?\s+(\d{4}))?/i);
      let appliedEnglishMonthFirstRange = false;
      if (englishMonthFirstRange) {
        const month1 = months[englishMonthFirstRange[1]];
        const day1 = parseInt(englishMonthFirstRange[2], 10);
        const year1 = englishMonthFirstRange[3] ? parseInt(englishMonthFirstRange[3], 10) : undefined;
        const month2 = months[englishMonthFirstRange[4]] || month1;
        const day2 = parseInt(englishMonthFirstRange[5], 10);
        const year2 = englishMonthFirstRange[6] ? parseInt(englishMonthFirstRange[6], 10) : year1;
        if (month1 && month2) {
          applyNamedMonthRange(day1, month1, year1, day2, month2, year2);
          appliedEnglishMonthFirstRange = true;
        }
      }
      if (!appliedEnglishMonthFirstRange && englishDayFirstRange) {
        const day1 = parseInt(englishDayFirstRange[1], 10);
        const day2 = parseInt(englishDayFirstRange[2], 10);
        const month = months[englishDayFirstRange[3]];
        const year = englishDayFirstRange[4] ? parseInt(englishDayFirstRange[4], 10) : undefined;
        applyNamedMonthRange(day1, month, year, day2, month, year);
      }
    }
    if (!out.checkIn && !out.checkOut) {
      const singleMonth = t.match(/(\d{1,2})\s*(?:de\s+)?([a-záéíóúñ]+)(?:\s+de\s+(\d{4}))?/i);
      if (singleMonth) {
        const day = parseInt(singleMonth[1], 10);
        const month = months[singleMonth[2]];
        const year = singleMonth[3] ? parseInt(singleMonth[3], 10) : undefined;
        if (month) out.checkIn = toISOFromParts(day, month, year);
      }
    }
  }
  if (!out.checkIn && !out.checkOut) {
    const looksExplicitCreate =
      /\b(reserv(?:ar|a|o|emos)?|book(?:ing)?)\b/i.test(normalized) &&
      !/\b(modific|cambi|alter|change|update|cancel|anul)\b/i.test(normalized);
    if (looksExplicitCreate) {
      const weekdayIndex: Record<string, number> = {
        domingo: 0,
        sunday: 0,
        lunes: 1,
        monday: 1,
        martes: 2,
        tuesday: 2,
        miercoles: 3,
        wednesday: 3,
        jueves: 4,
        thursday: 4,
        viernes: 5,
        friday: 5,
        sabado: 6,
        saturday: 6,
      };
      const resolveWeekdayOnOrAfter = (baseDate: Date, weekday: number) => {
        const candidate = new Date(baseDate.getTime());
        const delta = (weekday - candidate.getUTCDay() + 7) % 7;
        candidate.setUTCDate(candidate.getUTCDate() + delta);
        return candidate;
      };
      const resolveWeekdayStrictlyAfter = (baseDate: Date, weekday: number) => {
        const candidate = new Date(baseDate.getTime());
        let delta = (weekday - candidate.getUTCDay() + 7) % 7;
        if (delta === 0) delta = 7;
        candidate.setUTCDate(candidate.getUTCDate() + delta);
        return candidate;
      };
      const weekendRange =
        /\b(este\s+finde|este\s+fin\s+de\s+semana|this\s+weekend|este\s+fim\s+de\s+semana|fim\s+de\s+semana)\b/.test(normalized) ||
        /\b(sabado|saturday)\b.*\b(al|a|y|and)\b.*\b(domingo|sunday)\b(?:\s+(proximo|next))?/.test(normalized);
      const weekdayRangeMatch = normalized.match(
        /\b(domingo|sunday|lunes|monday|martes|tuesday|miercoles|wednesday|jueves|thursday|viernes|friday|sabado|saturday)\b\s*(?:al|a|y|and|hasta(?:\s+el|\s+la)?)\s*\b(domingo|sunday|lunes|monday|martes|tuesday|miercoles|wednesday|jueves|thursday|viernes|friday|sabado|saturday)\b(?:\s+(proximo|next))?/
      );
      const weekdayMap: Array<[RegExp, number]> = [
        [/\b(domingo|sunday)\b/, 0],
        [/\b(lunes|monday)\b/, 1],
        [/\b(martes|tuesday)\b/, 2],
        [/\b(miercoles|wednesday)\b/, 3],
        [/\b(jueves|thursday)\b/, 4],
        [/\b(viernes|friday)\b/, 5],
        [/\b(sabado|saturday)\b/, 6],
      ];
      const base = new Date();
      base.setUTCHours(0, 0, 0, 0);
      if (weekdayRangeMatch) {
        const startWeekday = weekdayIndex[weekdayRangeMatch[1]];
        const endWeekday = weekdayIndex[weekdayRangeMatch[2]];
        if (typeof startWeekday === "number" && typeof endWeekday === "number") {
          const checkInDate = resolveWeekdayOnOrAfter(base, startWeekday);
          const checkOutDate = resolveWeekdayStrictlyAfter(checkInDate, endWeekday);
          out.checkIn = checkInDate.toISOString().slice(0, 10);
          out.checkOut = checkOutDate.toISOString().slice(0, 10);
        }
      } else if (weekendRange) {
        const weekday = base.getUTCDay();
        const saturdayDelta = weekday === 6 ? 0 : weekday === 0 ? 6 : 6 - weekday;
        base.setUTCDate(base.getUTCDate() + saturdayDelta);
        out.checkIn = base.toISOString().slice(0, 10);
        const nextDay = new Date(base.getTime());
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        out.checkOut = nextDay.toISOString().slice(0, 10);
      } else {
        const weekday = weekdayMap.find(([pattern]) => pattern.test(normalized))?.[1];
        if (typeof weekday === "number") {
          const delta = (weekday - base.getUTCDay() + 7) % 7;
          base.setUTCDate(base.getUTCDate() + delta);
          out.checkIn = base.toISOString().slice(0, 10);
        }
      }
    }
  }
  // Personas / huéspedes: primero total directo, luego composición explícita. Si se contradicen, no resolver.
  const directGuests = extractDirectGuestTotal(t);
  const spelledGuests = extractSpelledGuestTotal(rawText);
  const composedGuests = extractComposedGuestTotal(t);
  const normalizedDirectGuests =
    typeof directGuests === "number"
      ? directGuests
      : typeof spelledGuests === "number"
        ? spelledGuests
        : undefined;
  if (typeof normalizedDirectGuests === "number" && typeof composedGuests === "number") {
    if (normalizedDirectGuests === composedGuests) out.numGuests = String(normalizedDirectGuests);
  } else if (typeof normalizedDirectGuests === "number") {
    out.numGuests = String(normalizedDirectGuests);
  } else if (typeof composedGuests === "number") {
    out.numGuests = String(composedGuests);
  }
  const detectedRoomType = canonicalizeRoomType(rawText);
  if (detectedRoomType) out.roomType = detectedRoomType;
  const inlineGuestName =
    rawText.match(/\ba\s+nombre\s+de\b[\s:,-]*([\p{L}][\p{L}'’. -]+(?:\s+[\p{L}][\p{L}'’. -]+){1,2})/iu) ||
    rawText.match(/\bem\s+nome\s+de\b[\s:,-]*([\p{L}][\p{L}'’. -]+(?:\s+[\p{L}][\p{L}'’. -]+){1,2})/iu) ||
    rawText.match(/\bunder\s+the\s+name\s+of\b[\s:,-]*([\p{L}][\p{L}'’. -]+(?:\s+[\p{L}][\p{L}'’. -]+){1,2})/iu) ||
    rawText.match(/\bnombre\b(?!\s+de\b)[\s:,-]*([\p{L}][\p{L}'’. -]+(?:\s+[\p{L}][\p{L}'’. -]+){1,2})/iu);
  if (inlineGuestName?.[1]) {
    const candidate = inlineGuestName[1]
      .trim()
      .replace(/[.,;:!?]+$/g, "")
      .replace(/\s{2,}/g, " ");
    if (isSafeGuestName(candidate)) out.guestName = normalizeNameCase(candidate);
  }
  return out;
}

// --- Valida si un nombre de huésped es seguro ---
const BAD_NAME_RE = /^(hola|hello|hi|hey|buenas|buenos dias|buenos días|buenas tardes|buenas noches|olá|ola|oi|quiero reservar|quero reservar)$/i;
const ROOM_WORD_RE = /(suite|matrimonial|doble|triple|individual|simple|single|double|twin|queen|king|deluxe|standard|cuadruple|cuádruple|quadruple|familiar)/i;
const GUEST_NAME_INTENT_WORD_RE = /\b(quiero|quero|reservar|reserva|booking|book|hacer|necesito|preciso|busco|cambiar|modificar|cancelar|confirmar|disponibilidad|habitaci[oó]n|quarto|personas?|hu[eé]spedes?|hospedes?|adultos?|menores?|niñ[oa]s?)\b/i;
const METALINGUISTIC_HOLDER_RE =
  /^(el nombre|nombre|el titular|titular|a nombre de|quien va la reserva|quien iria la reserva|quien seria la reserva|el nombre de la reserva|nombre de la reserva)$/i;
export function isMetalinguisticHolderCandidate(s?: string) {
  if (!s) return false;
  const normalized = String(s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
  return METALINGUISTIC_HOLDER_RE.test(normalized);
}
export function isSafeGuestName(s?: string) {
  if (!s) return false;
  const t = s.trim();
  if (!t) return false;
  if (/[0-9?!,:;@/\\]/.test(t)) return false;
  if (isMetalinguisticHolderCandidate(t)) return false;
  if (GUEST_NAME_INTENT_WORD_RE.test(t)) return false;
  if (BAD_NAME_RE.test(t) || ROOM_WORD_RE.test(t)) return false;
  // exigir al menos nombre y apellido
  const parts = t.split(/\s+/);
  if (parts.length < 2) return false;
  // largo razonable
  if (t.length < 3 || t.length > 60) return false;
  return true;
}
// Re-export helpers from reservation/questions for modular handlers
export * from './reservation/questions';
// isConfirmIntentLight: Detecta confirmaciones ligeras
export function isConfirmIntentLight(s: string) {
  const t = (s || "").toLowerCase().trim();
  return /\b(confirmar|confirmo|confirm|sí|si|ok|dale|de acuerdo|yes|okay|okey)\b/.test(t);
}

// isGreeting: Detecta saludos
export function isGreeting(s: string) {
  const t = (s || "").trim().toLowerCase();
  return /^(hola|hello|hi|hey|buenas|buenos dias|buenos días|buenas tardes|buenas noches|olá|ola|oi)$/.test(t);
}

// labelSlot: Traduce el slot a etiqueta legible
export function labelSlot(slot: string, lang2: "es" | "en" | "pt") {
  const LABELS = {
    es: { guestName: "nombre completo", roomType: "tipo de habitación", checkIn: "fecha de check-in", checkOut: "fecha de check-out", numGuests: "número de huéspedes" },
    en: { guestName: "guest name", roomType: "room type", checkIn: "check-in date", checkOut: "check-out date", numGuests: "number of guests" },
    pt: { guestName: "nome do hóspede", roomType: "tipo de quarto", checkIn: "data de check-in", checkOut: "data de check-out", numGuests: "número de hóspedes" },
  } as const;
  return (LABELS[lang2] as any)[slot] ?? slot;
}

// summarizeDraft: Resumen de slots actuales
export function summarizeDraft(lang2: "es" | "en" | "pt", s: Partial<Record<string, string>>) {
  const L = (k: string) => labelSlot(k, lang2);
  const line = (k: string) => `- ${L(k)}: ${s[k]?.toString().trim() || "—"}`;
  const pre = lang2 === "es" ? "Esto es lo que llevo de tu reserva:" : lang2 === "pt" ? "Aqui está o que tenho da sua reserva:" : "Here is what I have for your booking:";
  return [pre, line("guestName"), line("roomType"), line("checkIn"), line("checkOut"), line("numGuests")].join("\n");
}

// buildAggregatedQuestion: Pregunta agregada para slots faltantes
export function buildAggregatedQuestion(missing: string[], lang2: "es" | "en" | "pt") {
  const L = (k: string) => labelSlot(k, lang2);
  const parts = missing.map(k => (k === "checkIn" || k === "checkOut")
    ? L(k) + (lang2 === "en" ? " (dd/mm/yyyy)" : " (dd/mm/aaaa)")
    : L(k));
  return lang2 === "es"
    ? `Para avanzar, ¿me pasás ${parts.join(", ")}?`
    : lang2 === "pt"
      ? `Para avançar, pode me enviar ${parts.join(", ")}?`
      : `To proceed, could you share ${parts.join(", ")}?`;
}

function buildSingleReservationSlotQuestion(slot: string, lang2: "es" | "en" | "pt") {
  const label = labelSlot(slot, lang2);
  if (lang2 === "en") return `What is the ${label}?`;
  if (lang2 === "pt") {
    const article = slot === "checkIn" || slot === "checkOut" ? "a" : "o";
    return `Qual é ${article} ${label}?`;
  }
  const article = slot === "checkIn" || slot === "checkOut" ? "la" : "el";
  return `¿Cuál es ${article} ${label}?`;
}

export function buildReservationMissingQuestion(
  missing: string[],
  lang2: "es" | "en" | "pt",
  channel: "web" | "email" | "whatsapp" | "channelManager",
  preferSingleTurn: boolean
) {
  if (missing.length === 0) return "";
  if (channel === "email" && missing.length >= 2) {
    return buildAggregatedQuestion(missing, lang2);
  }
  if (missing.length === 1 || preferSingleTurn) {
    return buildSingleReservationSlotQuestion(missing[0], lang2);
  }
  return buildAggregatedQuestion(missing, lang2);
}

// mentionsLocale: Detecta si el texto menciona el locale
export function mentionsLocale(q: string) {
  return /locale|c[oó]digo\s+de\s+idioma|language\s*code|ISO\s*639-1/i.test(q || "");
}

// stripLocaleRequests: Limpia menciones de locale
export function stripLocaleRequests(q: string) {
  let out = (q || "");
  const patterns = [/c[oó]digo\s+de\s+idioma/gi, /idioma\s+preferido?/gi, /language\s*code/gi, /locale/gi, /ISO\s*639-1/gi];
  for (const rx of patterns) out = out.replace(rx, "");
  return out.replace(/\s{2,}/g, " ").replace(/\s+([?.!,;:])/g, "$1").trim();
}

// normalizeSlotsToStrings: Convierte los valores de slots a string
export function normalizeSlotsToStrings(src: any): Record<string, string> {
  const out: Record<string, string> = {};
  if (src?.guestName != null) out.guestName = String(src.guestName);
  if (src?.roomType != null) out.roomType = String(src.roomType);
  if (src?.checkIn != null) out.checkIn = String(src.checkIn);
  if (src?.checkOut != null) out.checkOut = String(src.checkOut);
  if (src?.numGuests != null) out.numGuests = String(src.numGuests);
  return out;
}

// isConfirmIntent: Detecta confirmaciones
export function isConfirmIntent(s: string) {
  const t = (s || "").toLowerCase();
  return /\b(confirmar|confirmo|sí|si|ok|dale|de acuerdo|confirm|yes|okey|okay)\b/.test(t);
}

// looksLikeDateOnly: Detecta si el mensaje parece solo una fecha
export function looksLikeDateOnly(msg: string) {
  const t = (msg || "").trim();
  return /^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})(\s*(a|al|hasta|-|—|–)\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}))?$/.test(t);
}

// looksLikeCorrection: Detecta si el mensaje parece una corrección
export function looksLikeCorrection(msg: string) {
  const t = (msg || "").toLowerCase();
  return /\b(no,?|perd[oó]n|me equivoqu[eé]|corrig|mejor|cambio|cambiar)\b/.test(t);
}

// maxGuestsFor: Máximo de huéspedes por tipo de habitación
export function maxGuestsFor(roomType?: string): number {
  return maxGuestsForRoomType(roomType);
}

// clampGuests: Limita el número de huéspedes
export function clampGuests(n: number, roomType?: string) {
  const min = 1, max = maxGuestsFor(roomType);
  if (!Number.isFinite(n)) return undefined;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

// sanitizePartial: Limpia y ajusta un objeto parcial de slots
export function sanitizePartial(
  partial: Partial<{ guestName: string; roomType: string; numGuests: number | string; checkIn: string; checkOut: string; locale: string }>,
  merged: any,
  userMsg: string
) {
  const out = { ...partial };
  if (looksLikeDateOnly(userMsg)) delete (out as any).numGuests;
  const correcting = looksLikeCorrection(userMsg);
  if (merged.guestName && out.guestName && !correcting) delete (out as any).guestName;
  if (merged.roomType && out.roomType && !correcting) delete (out as any).roomType;
  if (merged.checkIn && out.checkIn && !correcting) delete (out as any).checkIn;
  if (merged.checkOut && out.checkOut && !correcting) delete (out as any).checkOut;
  const rt = out.roomType || merged.roomType;
  if (typeof out.numGuests === "number") {
    const clamped = clampGuests(out.numGuests, rt);
    if (typeof clamped === "number") (out as any).numGuests = String(clamped);
    else delete (out as any).numGuests;
  }
  return out;
}
// Path: /home/marcelo/begasist/lib/agents/helpers.ts

// Detectar “2” a secas como huéspedes (sin confundir con fechas)
export function extractGuests(msg: string): string | undefined {
  const t = (msg || "").toLowerCase();
  const withoutDates = t
    .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, " ")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ")
    .trim();
  const _ddmm = Array.from(t.matchAll(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/g)).map(m => m[1]);

  // 1) Solo un número en el mensaje → tomarlo como huéspedes
  const onlyNum = withoutDates.match(/^\s*(\d{1,2})\s*$/);
  if (onlyNum) {
    const n = parseInt(onlyNum[1], 10);
    if (Number.isFinite(n)) return String(n);
  }

  // 2) Formas directas/contextuales y composición explícita
  const direct = extractDirectGuestTotal(withoutDates);
  const composed = extractComposedGuestTotal(withoutDates);
  if (typeof direct === "number" && typeof composed === "number") {
    if (direct === composed) return String(direct);
    return undefined;
  }
  if (typeof direct === "number") return String(direct);
  if (typeof composed === "number") return String(composed);

  // 3) Palabras → número
  const WORD2NUM: Record<string, number> = { uno: 1, una: 1, dos: 2, tres: 3, quatro: 4, cuatro: 4 };
  const mWord = withoutDates.match(/\b(uno|una|dos|tres|quatro|cuatro)\b/);
  if (mWord) return String(WORD2NUM[mWord[1]]);
  return undefined;
}
// Extrae checkIn/checkOut desde texto libre
export function extractDateRangeFromText(text: string): { checkIn?: string; checkOut?: string } {
  const t = (text || "").trim();
  const _ddmm = Array.from(t.matchAll(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/g)).map(m => m[1]);
  const iso = Array.from(t.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)).map(m => m[1]);
  const all = [..._ddmm, ...iso];
  if (all.length === 0) return {};
  const toISO = (s: string) => (s.includes("-") && s.length === 10 ? s : ddmmyyyyToISO(s) || undefined);
  if (all.length === 1) return { checkIn: toISO(all[0]) };
  const a = toISO(all[0]); const b = toISO(all[1]);
  if (a && b && new Date(a) > new Date(b)) return { checkIn: b, checkOut: a };
  return { checkIn: a, checkOut: b };
}
// dd/mm/aaaa -> YYYY-MM-DD
export function ddmmyyyyToISO(s: string): string | undefined {
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!m) return undefined;
  const [, dd, mm, yyRaw] = m;
  const day = parseInt(dd, 10), mon = parseInt(mm, 10);
  let year = parseInt(yyRaw, 10);
  if (yyRaw.length === 2) year += 2000;
  if (year < 1900 || year > 2100 || mon < 1 || mon > 12 || day < 1 || day > 31) return undefined;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${year}-${pad(mon)}-${pad(day)}`;
}
// Util: Date -> YYYY-MM-DD en TZ local
export function dateToISO(d: Date): string {
  const year = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${year}-${pad(m)}-${pad(day)}`;
}
// UTC-stable ISO (YYYY-MM-DD) for deterministic outputs in tests/integration
function toISO(d: Date): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${y}-${pad(m)}-${pad(day)}`;
}
// Capa 1 avanzada: usar Chrono para fechas relativas, detrás de bandera
async function loadChrono(): Promise<any> {
  const anyGlobal = globalThis as any;
  if (typeof anyGlobal.__chronoImport === 'function') {
    try { return await anyGlobal.__chronoImport(); } catch { /* ignore */ }
  }
  return await import('chrono-node');
}

export async function chronoExtractDateRange(
  text: string,
  lang2: "es" | "en" | "pt",
  _hotelTz?: string
): Promise<{ checkIn?: string; checkOut?: string }> {
  if ((process.env.USE_CHRONO_LAYER || "0") !== "1") return {};
  try {
    // Allow tests to inject a loader via globalThis.__chronoImport
    const injected = (globalThis as any).__chronoImport;
    const chrono: any = injected ? await injected() : await loadChrono();
    const ref = new Date();
    // Seleccionar parser por idioma si existe
    const parser = (lang2 === "es" && chrono.es)
      || (lang2 === "pt" && chrono.pt)
      || chrono.en
      || chrono;
    const results: any[] = (parser.parse ? parser.parse(text, ref, { forwardDate: true }) : chrono.parse(text, ref, { forwardDate: true })) || [];
    if (!results.length) return {};
    // Tomar hasta dos fechas (inicio/fin) si se detectan ranges
    // Chrono marca .start (y .end en ranges)
    const first = results[0];
    const start1: Date | undefined = first?.start?.date?.() || (first?.date ? first.date() : undefined);
    const end1: Date | undefined = first?.end?.date?.();
    if (start1 && end1) {
      return { checkIn: toISO(start1), checkOut: toISO(end1) };
    }
    if (results.length > 1) {
      const second = results[1];
      const start2: Date | undefined = second?.start?.date?.() || (second?.date ? second.date() : undefined);
      if (start1 && start2) {
        const a = start1 <= start2 ? start1 : start2;
        const b = start1 <= start2 ? start2 : start1;
        return { checkIn: toISO(a), checkOut: toISO(b) };
      }
    }
    if (start1) {
      const ci = toISO(start1);
      // Heurística: si menciona "una noche" / "1 noche" / "one night" y no hay end, asumimos 1 noche
      const tt = (text || "").toLowerCase();
      if (/(\buna\s+noche\b|\b1\s+noche\b|\bone\s+night\b|uma\s+noite)/.test(tt)) {
        const next = new Date(start1.getTime());
        next.setUTCDate(next.getUTCDate() + 1);
        return { checkIn: ci, checkOut: toISO(next) };
      }
      return { checkIn: ci };
    }
  } catch (_err) {
    // Silencioso: si chrono no está instalado o falla, no rompemos
  }
  return {};
}
import type { IntentResult } from "@/types/audit";

const LOOKS_ROOM_INFO_RE = /\b(check[- ]?in|check[- ]?out|ingreso|salida|horario|hora(s)?)\b/i;
export function looksRoomInfo(s: string): boolean {
  return LOOKS_ROOM_INFO_RE.test(s || "");
}

const LOOKS_NEARBY_POINTS_RE =
  /\b(puntos?\s+de\s+inter[eé]s?|puntos?\s+de\s+interese|puntos?\s+cercanos?|atracciones?\s+cercanas?|lugares?\s+cercanos?|lugares?\s+para\s+visitar|qué\s+hacer|que\s+hacer|qué\s+visitar|que\s+visitar|nearby\s+(attractions|points\s+of\s+interest|places)|points\s+of\s+interest|things\s+to\s+do|sights|attractions?\s+near)\b/i;
const WANTS_IMAGES_RE = /\b(im[áa]genes?|fotos?|carrusel|carrussel|carrousel|carroussel|carousel|galer[ií]a|gallery|imagens?)\b/i;

export function looksNearbyPoints(s: string): boolean {
  return LOOKS_NEARBY_POINTS_RE.test(s || "");
}

export function wantsNearbyImages(s: string): boolean {
  return WANTS_IMAGES_RE.test(s || "");
}

export function pickNearbyPromptKey(s: string): "nearby_points_img" | "nearby_points" | null {
  if (!looksNearbyPoints(s)) return null;
  return wantsNearbyImages(s) ? "nearby_points_img" : "nearby_points";
}



export function looksLikeName(s: string) {
  const t = (s || "").trim();
  if (t.length < 2 || t.length > 60) return false;
  if (/[0-9?!,:;@]/.test(t)) return false;
  const tokens = t.split(/\s+/);
  if (tokens.length === 0 || tokens.length > 3) return false;
  const STOP = new Set([
    "hola", "buenas", "hello", "hi", "hey", "olá", "ola", "oi",
    "que", "qué", "cuando", "cuándo", "donde", "dónde", "como", "cómo",
    "hora", "precio", "policy", "política", "check", "in", "out",
    "reserva", "reservo", "quiero", "quero", "tiene", "hay",
    "si", "sí", "sim", "yes", "ok", "okay", "dale", "claro"
  ]);
  if (tokens.some(w => STOP.has(w.toLowerCase()))) return false;
  if (!tokens.every(w => /^[\p{L}.'-]+$/u.test(w))) return false;
  return true;
}

export function normalizeNameCase(s: string) {
  const cap = (str: string) =>
    str ? str.slice(0, 1).toUpperCase() + str.slice(1).toLowerCase() : str;
  const capCompound = (word: string) => {
    // Preservar separadores '-' y apóstrofes en el resultado
    return word
      .split(/([-'’])/)
      .map(seg => (seg === '-' || seg === "'" || seg === '’' ? seg : cap(seg)))
      .join('');
  };
  return s
    .trim()
    .split(/\s+/)
    .map(w => capCompound(w))
    .join(" ");
}

// Extrae el nombre de pila para un trato más cercano en mensajes al usuario
// - Mantiene almacenamiento/validación con nombre completo por separado
// - Remueve honoríficos comunes (ES/PT/EN) al inicio
// - Devuelve el primer token capitalizado
export function firstNameOf(fullName?: string): string {
  if (!fullName) return "";
  let s = String(fullName || "").trim();
  if (!s) return "";
  // Normalizar espacios y comas sueltas
  s = s.replace(/\s*,\s*/g, " ").replace(/\s{2,}/g, " ").trim();
  // Remover honoríficos al inicio
  s = s.replace(/^(Sr\.?|Sra\.?|Señor(?:a)?|Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Dra\.?|Prof\.?|Ing\.?|Lic\.?|Don|Doña|Dona)\s+/i, "");
  // Normalizar mayúsculas/minúsculas luego de limpiar prefijos
  s = normalizeNameCase(s);
  const parts = s.split(/\s+/);
  if (parts.length === 0) return "";
  // Si el primer token es compuesto con guión, usarlo tal cual
  if (parts[0].includes("-")) return parts[0];
  // Heurística: nombres compuestos frecuentes (ES/PT)
  const P1 = new Set([
    "María", "Maria", "Ana", "Juan", "José", "Jose", "Luis", "Miguel", "João", "Joao", "Jośe", "Jorge", "Juan", "Pedro"
  ]);
  const P2 = new Set([
    "José", "Jose", "María", "Maria", "Pablo", "Carlos", "Manuel", "Luis", "Miguel", "Ángel", "Angel", "Paulo", "Clara", "Eduarda", "Luiza", "Sofía", "Sofia", "Paula", "Alice", "Antonio"
  ]);
  // Casos especiales tipo "María del Carmen"
  const CONNECTORS = new Set(["Del"]);
  // Intentar combinaciones
  if (parts.length >= 2) {
    const p0 = parts[0];
    const p1 = parts[1];
    if (P1.has(p0) && P2.has(p1)) {
      const out = `${p0} ${p1}`;
      return out;
    }
    // María del Carmen → tres tokens
    if ((p0 === "María" || p0 === "Maria") && CONNECTORS.has(p1) && parts[2]) {
      const out = `${p0} ${p1.toLowerCase()} ${parts[2]}`;
      return out;
    }
  }
  // Por defecto, primer token
  return parts[0];
}

export function heuristicClassify(text: string): IntentResult {
  const t = (text || "").toLowerCase();

  const isCancel = /\b(cancel(ar|la|ación)|anular|delete|remove|void|cancel)\b/.test(t);
  if (isCancel) {
    return { category: "cancel_reservation", desiredAction: "cancel", intentConfidence: 0.9, intentSource: "heuristic" };
  }

  const isModify = /\b(modific(ar|arla|ación)|change|cambiar|editar|move|mover)\b/.test(t);
  if (isModify) {
    return { category: "reservation", desiredAction: "modify", intentConfidence: 0.8, intentSource: "heuristic" };
  }

  const isReserve = /\b(reserv(ar|a)|book|booking|quiero reservar|quero reservar)\b/.test(t);
  if (isReserve) {
    return { category: "reservation", desiredAction: "create", intentConfidence: 0.75, intentSource: "heuristic" };
  }

  const isAvailability = /\b(disponibil\w*|availability)\b/.test(t);
  if (isAvailability) {
    return { category: "reservation", desiredAction: "create", intentConfidence: 0.76, intentSource: "heuristic" };
  }

  const isAmenities = /\b(piscina|pool|spa|gym|gimnasio|estacionamiento|parking|amenities|desayuno|breakfast)\b/.test(t);
  if (isAmenities) {
    return { category: "amenities", desiredAction: undefined, intentConfidence: 0.7, intentSource: "heuristic" };
  }

  const isBilling = /\b(factura|invoice|cobro|charge|billing|recibo|btc|bitcoin|crypto|criptomoneda|criptomoeda)\b/.test(t);
  if (isBilling) {
    return { category: "billing", desiredAction: undefined, intentConfidence: 0.7, intentSource: "heuristic" };
  }

  const isSupport = /\b(ayuda|help|soporte|support|problema|issue)\b/.test(t);
  if (isSupport) {
    return { category: "support", desiredAction: undefined, intentConfidence: 0.65, intentSource: "heuristic" };
  }

  const mentionsRoomWord =
    /\b(single|individual|simple|double|doble|matrimonial|twin|queen|king|triple|suite|familiar|quadruple|cuadruple|cuádruple)\b/i.test(t);
  if (mentionsRoomWord) {
    return { category: "reservation", desiredAction: "create", intentConfidence: 0.76, intentSource: "heuristic" };
  }


  return { category: "retrieval_based", desiredAction: undefined, intentConfidence: 0.5, intentSource: "heuristic" };
}

// Normaliza dd/mm/yyyy → yyyy-mm-dd (asumimos convención ES/PT, no US)
export function toISODateDDMMYYYY(s: string): string | null {
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!m) return null;
  const [, dd, mm, yyyyRaw] = m;
  const yyyy = yyyyRaw.length === 2 ? (Number(yyyyRaw) >= 70 ? "19" : "20") + yyyyRaw : yyyyRaw;
  const d = Number(dd), mth = Number(mm);
  if (mth < 1 || mth > 12 || d < 1 || d > 31) return null;
  return `${yyyy.padStart(4, "0")}-${String(mth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Localiza el tipo de habitación para mostrar al usuario (manteniendo canónico interno)
export function localizeRoomType(rt: string | undefined, lang2: "es" | "en" | "pt"): string {
  const key = canonicalizeRoomType(rt) || (rt || "").toLowerCase();
  const map: Record<string, { es: string; en: string; pt: string }> = {
    single: { es: "simple", en: "single", pt: "individual" },
    double: { es: "doble", en: "double", pt: "duplo" },
    triple: { es: "triple", en: "triple", pt: "triplo" },
    quadruple: { es: "cuadruple", en: "quadruple", pt: "quádruplo" },
    suite: { es: "suite", en: "suite", pt: "suite" },
    twin: { es: "twin", en: "twin", pt: "twin" },
  };
  const rec = map[key];
  if (!rec) return rt || "";
  return rec[lang2] || rt || "";
}

export function formatGuestCountLabel(
  count: number | string | undefined,
  lang2: "es" | "en" | "pt",
  opts?: { includeCount?: boolean }
): string {
  const includeCount = opts?.includeCount !== false;
  const parsed = Number.parseInt(String(count ?? ""), 10);
  const safeCount = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  const noun =
    lang2 === "pt"
      ? safeCount === 1 ? "hóspede" : "hóspedes"
      : lang2 === "en"
        ? safeCount === 1 ? "guest" : "guests"
        : safeCount === 1 ? "huésped" : "huéspedes";
  return includeCount ? `${safeCount} ${noun}` : noun;
}

export function formatNightCountLabel(
  count: number | string | undefined,
  lang2: "es" | "en" | "pt",
  opts?: { includeCount?: boolean }
): string {
  const includeCount = opts?.includeCount !== false;
  const parsed = Number.parseInt(String(count ?? ""), 10);
  const safeCount = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  const noun =
    lang2 === "pt"
      ? safeCount === 1 ? "noite" : "noites"
      : lang2 === "en"
        ? safeCount === 1 ? "night" : "nights"
        : safeCount === 1 ? "noche" : "noches";
  return includeCount ? `${safeCount} ${noun}` : noun;
}
