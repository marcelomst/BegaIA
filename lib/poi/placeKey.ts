import type { POIRecord } from "@/types/poi";

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizePlaceKey(value: string): string {
  return stripDiacritics(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function decodeQueryValue(value: string): string {
  const withSpaces = value.replace(/\+/g, " ");
  try {
    return decodeURIComponent(withSpaces);
  } catch {
    return withSpaces;
  }
}

export function extractMapsQuery(mapsUrl?: string): string | undefined {
  if (!mapsUrl) return undefined;
  try {
    const u = new URL(mapsUrl);
    const q = u.searchParams.get("q");
    if (q) return decodeQueryValue(q);
  } catch {
    // fallback simple parse
  }
  const m = mapsUrl.match(/[?&]q=([^&]+)/i);
  return m ? decodeQueryValue(m[1]) : undefined;
}

function looksLikeDescription(text?: string): boolean {
  const t = (text || "").trim();
  if (!t) return true;
  const low = t.toLowerCase();
  if (t.length > 90) return true;
  if (t.length > 70 && /[.!?]/.test(t)) return true;
  if (/(horario|hs\b|h\b|lunes|martes|miercoles|miércoles|jueves|viernes|sábado|domingo)/.test(low) && t.length > 40) {
    return true;
  }
  if (/(tel|t\.|whatsapp|wpp|cel|entrada|gratis|reservas)/.test(low) && t.length > 40) {
    return true;
  }
  if (/\+?\d[\d\s\-()]{5,}\d/.test(t)) return true;
  if (/\bde\s*\d{1,2}(?::\d{2})?\s*(?:h|hs|hrs)?\s*(?:a|-|–|hasta)\s*\d{1,2}(?::\d{2})?\s*(?:h|hs|hrs)?\b/i.test(t)) {
    return true;
  }
  return false;
}

function stripPhonesAndTimes(text: string): string {
  let out = text;
  out = out.replace(/\b(?:tel\.?|t\.?|whatsapp|wpp|cel\.?|celular)?\s*\+?\d[\d\s\-()]{5,}\d\b/gi, " ");
  out = out.replace(
    /\bde\s*\d{1,2}(?::\d{2})?\s*(?:h|hs|hrs)?\s*(?:a|-|–|hasta)\s*\d{1,2}(?::\d{2})?\s*(?:h|hs|hrs)?\b/gi,
    " "
  );
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

function cleanPoiName(name: string): string {
  let out = stripPhonesAndTimes(name || "");
  if (out.length > 120) out = out.slice(0, 120).trim();
  return out;
}

export function buildPlaceKeyFromPoi(poi: Pick<POIRecord, "location" | "name">): string {
  const loc = poi?.location;
  const address = loc?.address && !looksLikeDescription(loc.address) ? loc.address : undefined;
  const mapsQuery = extractMapsQuery(loc?.mapsUrl);
  const locName = loc?.name;
  const cleanedName = cleanPoiName(poi?.name || "");
  const candidate = address || mapsQuery || locName || cleanedName;
  if (!candidate) return "";
  return normalizePlaceKey(candidate);
}
