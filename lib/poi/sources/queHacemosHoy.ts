// Path: /root/begasist/lib/poi/sources/queHacemosHoy.ts
import type { POIRecord } from "@/types/poi";
import { buildPoiKey } from "@/lib/poi/poiKey";

const SOURCE_ID = "quehacemoshoy";
const SOURCE_URL = "https://quehacemoshoy.com.uy/agenda/";
const TZ = "America/Montevideo";
const REGION = "maldonado_uy";

const LOCALITY_KEYWORDS: Array<{ key: string; locality: string }> = [
  { key: "punta del este", locality: "Punta del Este" },
  { key: "maldonado", locality: "Maldonado" },
  { key: "piriápolis", locality: "Piriápolis" },
  { key: "piriapolis", locality: "Piriápolis" },
  { key: "san carlos", locality: "San Carlos" },
  { key: "la barra", locality: "La Barra" },
  { key: "jose ignacio", locality: "José Ignacio" },
  { key: "josé ignacio", locality: "José Ignacio" },
];

function decodeHtml(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function inferLocality(text?: string): string | undefined {
  if (!text) return undefined;
  const low = text.toLowerCase();
  for (const { key, locality } of LOCALITY_KEYWORDS) {
    if (low.includes(key)) return locality;
  }
  return undefined;
}

function normalizeContentToIso(content?: string | null): string | undefined {
  if (!content) return undefined;
  const parsed = Date.parse(content);
  if (Number.isNaN(parsed)) return undefined;
  return new Date(parsed).toISOString();
}

function normalizeUnixToIso(value?: string): string | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const ms = n > 1e12 ? n : n * 1000;
  return new Date(ms).toISOString();
}

function extractAttr(tag: string, attr: string): string | undefined {
  const re = new RegExp(`${attr}=["']([^"']+)["']`, "i");
  const m = tag.match(re);
  return m ? decodeHtml(m[1]) : undefined;
}

function extractText(tag: string): string | undefined {
  const m = tag.match(/>([\s\S]*?)</);
  return m ? decodeHtml(m[1]) : undefined;
}

function buildMapsUrlFromText(text?: string): string | undefined {
  const q = (text || "").trim();
  if (!q) return undefined;
  return `https://maps.google.com/?q=${encodeURIComponent(q)}`;
}

function extractMapsQuery(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    const q = u.searchParams.get("q");
    if (q) return decodeHtml(q);
  } catch { /* noop */ }
  const m = url.match(/[?&]q=([^&]+)/i);
  return m ? decodeHtml(m[1]) : undefined;
}

function normalizePlaceKey(value?: string): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildEventPoi(args: {
  name: string;
  sourceUrl: string;
  startsAt?: string;
  endsAt?: string;
  locationText?: string;
  locationAddress?: string;
  locationName?: string;
  mapsUrl?: string;
  externalId?: string;
}): POIRecord {
  const { name, sourceUrl, externalId, startsAt, endsAt, locationText, locationAddress, locationName, mapsUrl } = args;
  const fullText = name.trim();
  let nextName = fullText;
  let nextDescription: string | undefined;
  let nextSummary: string | undefined;
  let nextLocationAddress = locationAddress;

  const norm = (s?: string) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
  const looksLikeDescription = (s?: string) => {
    const t = (s || "").trim();
    if (!t) return false;
    const low = t.toLowerCase();
    if (t.length > 90 && (/[.!?]/.test(t) || /(\bhs\b|\bh\b|\bhorario\b)/.test(low))) return true;
    const hints = [
      "t.", "tel", "whatsapp", "entrada", "gratis", "gratuito",
      "reservas", "a la gorra", "todos los días", "lunes", "martes", "miércoles",
      "jueves", "viernes", "sábado", "domingo",
    ];
    return t.length > 80 && hints.some((h) => low.includes(h));
  };

  if (nextLocationAddress) {
    const nAddr = norm(nextLocationAddress);
    const nName = norm(fullText);
    const similar = nAddr === nName || nAddr.startsWith(nName) || nName.startsWith(nAddr);
    if (similar || looksLikeDescription(nextLocationAddress)) {
      if (!nextDescription) nextDescription = fullText;
      else if (!nextSummary) nextSummary = fullText;
      nextLocationAddress = undefined;
    }
  }

  if (fullText.length > 120) {
    const tryCut = (idx: number) => (idx >= 8 ? fullText.slice(0, idx).trim() : "");
    let cut = "";
    const dotIdx = fullText.indexOf(".");
    if (dotIdx >= 0) cut = tryCut(dotIdx);
    if (!cut) {
      const commaIdx = fullText.indexOf(",");
      if (commaIdx >= 0) cut = tryCut(commaIdx);
    }
    if (!cut) {
      const patterns = [" de ", " frente a ", " T.", " Tel", " Whatsapp"];
      for (const p of patterns) {
        const idx = fullText.indexOf(p);
        if (idx >= 0) {
          cut = tryCut(idx);
          if (cut) break;
        }
      }
    }
    if (cut) {
      nextName = cut;
      if (!nextDescription) nextDescription = fullText;
      else if (!nextSummary) nextSummary = fullText;
    }
  }

  const resolvedMapsUrl =
    mapsUrl ||
    buildMapsUrlFromText(nextLocationAddress || locationName || locationText || nextName);

  const mapsQuery = extractMapsQuery(resolvedMapsUrl);
  const locality =
    inferLocality(nextLocationAddress || locationText || locationName || nextName) ||
    inferLocality(mapsQuery);
  const hasAnyLocation = Boolean(locality || nextLocationAddress || locationName || resolvedMapsUrl);
  return {
    type: "event",
    name: nextName,
    summary: nextSummary,
    description: nextDescription || fullText,
    categories: undefined,
    tags: undefined,
    location: hasAnyLocation
      ? {
          name: locationName || undefined,
          country: "Uruguay",
          adminArea1: "Maldonado",
          adminArea2: undefined,
          locality: locality || undefined,
          address: nextLocationAddress || undefined,
          mapsUrl: resolvedMapsUrl || undefined,
        }
      : undefined,
    startsAt: startsAt || undefined,
    endsAt: endsAt || undefined,
    startDate: startsAt || undefined,
    endDate: endsAt || undefined,
    sourceId: SOURCE_ID,
    sourceUrl,
    externalId: externalId || undefined,
    region: REGION,
  };
}

export async function fetchQueHacemosHoyEvents(): Promise<POIRecord[]> {
  const res = await fetch(SOURCE_URL, {
    headers: {
      "User-Agent": "begasist-bot/1.0",
      "Accept": "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) return [];

  const html = await res.text();
  const items: POIRecord[] = [];

  const eventRe = /<li[^>]*class=["'][^"']*\bsimcal-event\b[^"']*["'][\s\S]*?<\/li>/gi;
  let match: RegExpExecArray | null = null;
  let i = 0;
  while ((match = eventRe.exec(html))) {
    const block = match[0];
    const titleMatch = block.match(/<span[^>]*class=["'][^"']*\bsimcal-event-title\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    const name = titleMatch ? decodeHtml(titleMatch[1]) : undefined;
    if (!name || name.length < 3) {
      i++;
      continue;
    }

    const startTag = block.match(/<span[^>]*class=["'][^"']*\bsimcal-event-start\b[^"']*["'][^>]*>/i)?.[0];
    const endTag = block.match(/<span[^>]*class=["'][^"']*\bsimcal-event-end\b[^"']*["'][^>]*>/i)?.[0];
    const startContent = startTag ? extractAttr(startTag, "content") : undefined;
    const endContent = endTag ? extractAttr(endTag, "content") : undefined;
    const startUnix = startTag ? extractAttr(startTag, "data-event-start") : undefined;
    const endUnix = endTag ? extractAttr(endTag, "data-event-end") : undefined;
    const liStartUnix = block.match(/<li[^>]*\bdata-start=["']([^"']+)["']/i)?.[1];

    const locationTag = block.match(/<span[^>]*class=["'][^"']*\bsimcal-event-address\b[^"']*["'][^>]*>[\s\S]*?<\/span>/i)?.[0];
    const locationText = locationTag ? decodeHtml(locationTag.replace(/<\/?[^>]+>/g, " ")) : undefined;
    const locationAddress = locationTag ? extractAttr(locationTag, "content") : undefined;
    const locationName = locationTag ? extractAttr(locationTag, "name") : undefined;
    const mapsUrl =
      block.match(/<a[^>]*class=["'][^"']*\bqhh_location\b[^"']*["'][^>]*href=["']([^"']+)["']/i)?.[1] ||
      block.match(/href=["']([^"']*(?:maps\.google\.com\/\?q=|www\.google\.com\/maps|maps\.app\.goo\.gl)[^"']*)["']/i)?.[1];

    const startsAt =
      normalizeContentToIso(startContent) ||
      normalizeUnixToIso(startUnix) ||
      normalizeUnixToIso(liStartUnix);
    const endsAt = normalizeContentToIso(endContent) || normalizeUnixToIso(endUnix);

    const externalId =
      extractAttr(block, "data-start") ||
      startUnix ||
      `${startsAt || ""}:${name}:${i}`;

    const poi = buildEventPoi({
      name,
      sourceUrl: SOURCE_URL,
      externalId,
      startsAt,
      endsAt,
      locationText,
      locationAddress,
      locationName,
      mapsUrl: mapsUrl ? decodeHtml(mapsUrl) : undefined,
    });

    items.push(poi);
    i++;
  }

  // Propagar locality por "lugar equivalente" dentro del batch
  const localityByKey = new Map<string, string>();
  for (const poi of items) {
    const loc = poi.location;
    if (!loc?.locality) continue;
    const key = normalizePlaceKey(
      loc.name || loc.address || extractMapsQuery(loc.mapsUrl) || ""
    );
    if (key) localityByKey.set(key, loc.locality);
  }
  if (localityByKey.size) {
    for (const poi of items) {
      const loc = poi.location;
      if (!loc || loc.locality) continue;
      const key = normalizePlaceKey(
        loc.name || loc.address || extractMapsQuery(loc.mapsUrl) || ""
      );
      const inferred = key ? localityByKey.get(key) : undefined;
      if (inferred) {
        loc.locality = inferred;
      }
    }
  }

  const uniq = new Map<string, POIRecord>();
  for (const p of items) {
    const key = buildPoiKey({
      sourceId: p.sourceId,
      sourceUrl: p.sourceUrl,
      externalId: p.externalId != null ? String(p.externalId) : undefined,
    });
    if (!key) continue;
    if (!uniq.has(key)) uniq.set(key, p);
  }
  return Array.from(uniq.values());
}
