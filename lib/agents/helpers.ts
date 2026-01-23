/* eslint-disable @typescript-eslint/no-explicit-any */
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
  const t = (text || "").toLowerCase();
  // Fechas: "19/09/2025 al 22/09/2025", "19-09-2025 hasta 22-09-2025"
  const dateRange =
    t.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s*(?:al|hasta|a|-|→|->|—)\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
  if (dateRange) {
    const ci = toISODateDDMMYYYY(dateRange[1]);
    const co = toISODateDDMMYYYY(dateRange[2]);
    if (ci && co) { out.checkIn = ci; out.checkOut = co; }
  } else {
    // sueltos: "check in 19/09/2025" "check-out 22/09/2025"
    const ci = t.match(/check\s*in[:\s-]*?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
    const co = t.match(/check\s*out[:\s-]*?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
    if (ci?.[1]) out.checkIn = toISODateDDMMYYYY(ci[1]) || out.checkIn;
    if (co?.[1]) out.checkOut = toISODateDDMMYYYY(co[1]) || out.checkOut;
  }
  // Personas / huéspedes: "para dos personas", "somos 3"
  const ng = t.match(/(?:para|somos|para\s*|)\s*(\d{1,2})\s*(?:personas|huespedes|huéspedes|pessoas)/);
  if (ng?.[1]) out.numGuests = String(parseInt(ng[1], 10));
  // Tipo de habitación: lista simple (se puede extender)
  const types = ["doble", "triple", "individual", "single", "twin", "queen", "king", "matrimonial", "suite", "deluxe", "standard"];
  const found = types.find(tp => t.includes(tp));
  if (found) out.roomType = found;
  return out;
}

// --- Valida si un nombre de huésped es seguro ---
const BAD_NAME_RE = /^(hola|hello|hi|hey|buenas|buenos dias|buenos días|buenas tardes|buenas noches|olá|ola|oi|quiero reservar|quero reservar)$/i;
const ROOM_WORD_RE = /(suite|matrimonial|doble|triple|individual|single|double|twin|queen|king|deluxe|standard)/i;
export function isSafeGuestName(s?: string) {
  if (!s) return false;
  const t = s.trim();
  if (!t) return false;
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
  const rt = (roomType || "").toLowerCase();
  if (/single|individual|simple/.test(rt)) return 1;
  if (/double|doble|matrimonial|twin|queen|king/.test(rt)) return 2;
  if (/triple/.test(rt)) return 3;
  if (/suite|familiar/.test(rt)) return 4;
  return 4;
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

  // 2) Formas contextuales
  const contextual = withoutDates.match(/\b(?:somos|para)?\s*(\d{1,2})\s*(?:p[eé]r+r?sonas|personas|hu[eé]spedes|pessoas)\b/);
  if (contextual?.[1]) return String(parseInt(contextual[1], 10));

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
    "reserva", "reservo", "quiero", "quero", "tiene", "hay"
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

  const isAmenities = /\b(piscina|pool|spa|gym|gimnasio|estacionamiento|parking|amenities|desayuno|breakfast)\b/.test(t);
  if (isAmenities) {
    return { category: "amenities", desiredAction: undefined, intentConfidence: 0.7, intentSource: "heuristic" };
  }

  const isBilling = /\b(factura|invoice|cobro|charge|billing|recibo)\b/.test(t);
  if (isBilling) {
    return { category: "billing", desiredAction: undefined, intentConfidence: 0.7, intentSource: "heuristic" };
  }

  const isSupport = /\b(ayuda|help|soporte|support|problema|issue)\b/.test(t);
  if (isSupport) {
    return { category: "support", desiredAction: undefined, intentConfidence: 0.65, intentSource: "heuristic" };
  }

  const mentionsRoomWord =
    /\b(single|individual|simple|double|doble|matrimonial|twin|queen|king|triple|suite|familiar)\b/i.test(t);
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
  const key = (rt || "").toLowerCase();
  const map: Record<string, { es: string; en: string; pt: string }> = {
    single: { es: "simple", en: "single", pt: "individual" },
    double: { es: "doble", en: "double", pt: "duplo" },
    triple: { es: "triple", en: "triple", pt: "triplo" },
    suite: { es: "suite", en: "suite", pt: "suite" },
    queen: { es: "queen", en: "queen", pt: "queen" },
    king: { es: "king", en: "king", pt: "king" },
    twin: { es: "twin", en: "twin", pt: "twin" },
    deluxe: { es: "deluxe", en: "deluxe", pt: "deluxe" },
    standard: { es: "standard", en: "standard", pt: "standard" },
  };
  const rec = map[key];
  if (!rec) return rt || "";
  return rec[lang2] || rt || "";
}
