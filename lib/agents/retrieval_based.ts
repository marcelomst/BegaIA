// Path: /root/begasist/lib/agents/retrieval_based.ts

import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { defaultPrompt, curatedPrompts } from "../prompts";
import { debugLog } from "../utils/debugLog";
import { searchFromAstra } from "../retrieval";
import { translateIfNeeded } from "../i18n/translateIfNeeded";
import type { RichPayload } from "@/types/richPayload";
import type { CarouselItem } from "@/types/richResponse";
import { searchNearbyPlaces } from "@/lib/media/googlePlaces";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { getConvState, upsertConvState } from "@/lib/db/convState";
import { searchEvents } from "@/lib/poi/searchEvents";
import { searchAttractions } from "@/lib/poi/searchAttractions";
import { extractMapsQuery } from "@/lib/poi/placeKey";
import { getTemplate } from "@/lib/prompts/templates";
import { renderCuratedTemplate } from "@/lib/prompts/renderCuratedTemplate";
import { getCurrentVersionFromIndex } from "@/lib/astra/hotelVersionIndex";
import { DateTime } from "luxon";

let localModel: ChatOpenAI | null = null;

function getLocalModel(): ChatOpenAI {
  if (!localModel) {
    localModel = new ChatOpenAI({
      modelName: process.env.LLM_KB_MODEL || process.env.LLM_DEFAULT_MODEL || "gpt-4o-mini",
      temperature: 0.2,
    });
  }
  return localModel;
}

// Normaliza a ISO1 soportado (es/en/pt/other)
function normalizeLang(raw?: string | null): "es" | "en" | "pt" | "other" {
  const v = (raw || "").toLowerCase();
  if (v.startsWith("es") || v === "spa" || v === "esp" || v === "sp") return "es";
  if (v.startsWith("en") || v === "eng") return "en";
  if (v.startsWith("pt") || v === "por") return "pt";
  return "other";
}

// Utilidad para extraer el último texto humano
export async function getLastHumanText(msgs: BaseMessage[]): Promise<string> {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (m instanceof HumanMessage) {
      const c = (m as HumanMessage).content;
      if (typeof c === "string") return c.trim();
      if (Array.isArray(c)) {
        type TextSegment = { type?: string; text?: string } | string | null | undefined;
        return (c as TextSegment[])
          .map((p) => {
            if (typeof p === "string") return p;
            if (p && typeof p === "object" && (p as { type?: string }).type === "text") {
              return (p as { text?: string }).text ?? "";
            }
            return "";
          })
          .join(" ").trim();
      }
    }
  }
  return "";
}

type NearbyPoint = {
  name: string;
  description?: string;
  searchQuery?: string;
};

function normalizeText(value: string): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function countryFromEventsRegion(region?: string): string {
  const raw = String(region || "").trim().toLowerCase();
  if (!raw) return "";
  const parts = raw.split("_").filter(Boolean);
  const code = parts[parts.length - 1];
  if (!code) return "";
  const map: Record<string, string> = {
    uy: "Uruguay",
    ar: "Argentina",
    br: "Brazil",
    cl: "Chile",
    py: "Paraguay",
    pe: "Peru",
    bo: "Bolivia",
    co: "Colombia",
    ec: "Ecuador",
    ve: "Venezuela",
    mx: "Mexico",
    es: "Spain",
    us: "United States",
    ca: "Canada",
  };
  return map[code] || "";
}

function buildLocationTokens(city?: string, country?: string): string[] {
  const tokens: string[] = [];
  const cityNorm = normalizeText(city || "");
  const countryNorm = normalizeText(country || "");
  if (cityNorm) tokens.push(cityNorm);
  if (countryNorm) {
    tokens.push(countryNorm);
    if (countryNorm === "uy") tokens.push("uruguay");
  }
  return Array.from(new Set(tokens)).filter(Boolean);
}

function placeMatchesLocation(place: { name: string; description?: string }, tokens: string[]): boolean {
  if (!tokens.length) return true;
  const hay = normalizeText([place.name, place.description || ""].join(" "));
  return tokens.some((t) => t && hay.includes(t));
}

function isRelevantPoi(place: { name: string; description?: string }): boolean {
  const hay = normalizeText([place.name, place.description || ""].join(" "));
  const keywords = [
    // ES
    "playa", "museo", "monumento", "parque", "plaza", "puerto", "mirador", "faro", "isla",
    "avenida", "paseo", "mercado", "teatro", "galeria", "jardin", "shopping",
    // EN
    "beach", "museum", "monument", "park", "square", "port", "marina", "viewpoint", "lighthouse", "island",
    "avenue", "promenade", "market", "theater", "gallery", "garden", "mall",
    // PT
    "praia", "museu", "monumento", "parque", "praca", "porto", "mirante", "farol", "ilha",
    "avenida", "passeio", "mercado", "teatro", "galeria", "jardim", "shopping",
  ];
  return keywords.some((k) => hay.includes(k));
}

function toNearbyPointsFromConfig(
  attractions: Array<{ name?: string; notes?: string }> | undefined,
  locationHint: string
): NearbyPoint[] {
  if (!Array.isArray(attractions)) return [];
  return attractions
    .map((a) => {
      const name = String(a?.name || "").trim();
      if (!name) return null;
      return {
        name,
        description: a?.notes ? String(a.notes) : undefined,
        searchQuery: locationHint ? `${name} ${locationHint}` : name,
      } as NearbyPoint;
    })
    .filter(Boolean) as NearbyPoint[];
}

function looksLikeEventsIntent(text: string, promptKey?: string, category?: string): boolean {
  const hay = normalizeText(text || "");
  const priceSignals = [
    "precio",
    "precios",
    "preco",
    "precos",
    "tarifa",
    "tarifas",
    "costo",
    "costos",
    "valor",
    "rate",
    "rates",
    "price",
    "prices",
    "cost",
  ];
  if (priceSignals.some((k) => hay.includes(k))) return false;
  if (promptKey === "tourist_events" || promptKey === "tourist_events_img") return true;
  const hardEventKeys = [
    // ES
    "evento",
    "eventos",
    "agenda",
    "agenda cultural",
    "concierto",
    "conciertos",
    "recital",
    "recitales",
    "festival",
    "festivales",
    "feria",
    "ferias",
    "show",
    "teatro",
    "exposicion",
    "exposiciones",
    "carnaval",
    "muestra",
    "muestras",
    // EN
    "event",
    "events",
    "event calendar",
    "calendar",
    "concert",
    "gig",
    "festival",
    "fair",
    "show",
    "theatre",
    "theater",
    "exhibition",
    "carnival",
    // PT
    "evento",
    "eventos",
    "agenda",
    "agenda cultural",
    "festival",
    "feira",
    "teatro",
    "exposicao",
    "exposicoes",
    "show",
    "carnaval",
  ];
  return hardEventKeys.some((k) => hay.includes(k));
}

function extractCityMention(text: string): string | undefined {
  const rawText = String(text || "");
  const hay = normalizeText(rawText);
  const cities: Array<{ norm: string; label: string }> = [
    { norm: "punta del este", label: "Punta del Este" },
    { norm: "maldonado", label: "Maldonado" },
    { norm: "piriapolis", label: "Piriápolis" },
    { norm: "san carlos", label: "San Carlos" },
    { norm: "la barra", label: "La Barra" },
    { norm: "jose ignacio", label: "José Ignacio" },
    { norm: "punta ballena", label: "Punta Ballena" },
  ];
  for (const c of cities) {
    if (hay.includes(c.norm)) return c.label;
  }
  const toTitle = (s: string) =>
    s
      .split(/\s+/)
      .map((w) => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)
      .join(" ");
  const puntaMatch = rawText.match(/\bpunta\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)\b/i);
  if (puntaMatch?.[1]) {
    return `Punta ${toTitle(puntaMatch[1])}`.trim();
  }
  const inMatch = rawText.match(/\b(en|in|em)\s+([a-záéíóúñ][\wáéíóúñ.-]*(?:\s+[a-záéíóúñ][\wáéíóúñ.-]*){0,3})/i);
  if (inMatch?.[2]) {
    const cand = normalizeText(inMatch[2]);
    const stop = ["este mes", "este finde", "esta noche", "hoy", "mañana", "manana", "this month", "this weekend", "tonight", "today"];
    if (!stop.includes(cand)) return toTitle(inMatch[2].trim());
  }
  return undefined;
}

function resolveEventRange(text: string, tz: string, lang?: "es" | "en" | "pt" | "other"): { from: string; to: string } {
  const hay = normalizeText(text || "");
  const now = DateTime.now().setZone(tz);
  const dateOnly = (d: DateTime) => d.toFormat("yyyy-LL-dd");
  const parseNumericRange = () => {
    const m =
      hay.match(/\b(?:del\s+)?(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\s+(?:al|a|to|ate)\s+(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/i) ||
      hay.match(/\b(\d{4})-(\d{2})-(\d{2})\s+(?:al|a|to|ate)\s+(\d{4})-(\d{2})-(\d{2})\b/i);
    if (!m) return null;
    if (m[1].length === 4) {
      const from = `${m[1]}-${m[2]}-${m[3]}`;
      const to = `${m[4]}-${m[5]}-${m[6]}`;
      return { from, to };
    }
    const from = `${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
    const to = `${m[6]}-${String(m[5]).padStart(2, "0")}-${String(m[4]).padStart(2, "0")}`;
    return { from, to };
  };
  const parseMonthRange = () => {
    const monthMap: Array<{ rx: RegExp; month: number }> = [
      { rx: /\benero\b/i, month: 1 }, { rx: /\bfebrero\b/i, month: 2 }, { rx: /\bmarzo\b/i, month: 3 },
      { rx: /\babril\b/i, month: 4 }, { rx: /\bmayo\b/i, month: 5 }, { rx: /\bjunio\b/i, month: 6 },
      { rx: /\bjulio\b/i, month: 7 }, { rx: /\bagosto\b/i, month: 8 }, { rx: /\bseptiembre\b|\bsetiembre\b/i, month: 9 },
      { rx: /\boctubre\b/i, month: 10 }, { rx: /\bnoviembre\b/i, month: 11 }, { rx: /\bdiciembre\b/i, month: 12 },
      { rx: /\bjanuary\b/i, month: 1 }, { rx: /\bfebruary\b/i, month: 2 }, { rx: /\bmarch\b/i, month: 3 },
      { rx: /\bapril\b/i, month: 4 }, { rx: /\bmay\b/i, month: 5 }, { rx: /\bjune\b/i, month: 6 },
      { rx: /\bjuly\b/i, month: 7 }, { rx: /\baugust\b/i, month: 8 }, { rx: /\bseptember\b/i, month: 9 },
      { rx: /\boctober\b/i, month: 10 }, { rx: /\bnovember\b/i, month: 11 }, { rx: /\bdecember\b/i, month: 12 },
      { rx: /\bjaneiro\b/i, month: 1 }, { rx: /\bfevereiro\b/i, month: 2 }, { rx: /\bmarco\b|\bmarço\b/i, month: 3 },
      { rx: /\babril\b/i, month: 4 }, { rx: /\bmaio\b/i, month: 5 }, { rx: /\bjunho\b/i, month: 6 },
      { rx: /\bjulho\b/i, month: 7 }, { rx: /\bagosto\b/i, month: 8 }, { rx: /\bsetembro\b/i, month: 9 },
      { rx: /\boutubro\b/i, month: 10 }, { rx: /\bnovembro\b/i, month: 11 }, { rx: /\bdezembro\b/i, month: 12 },
    ];
    const found = monthMap.find((m) => m.rx.test(hay));
    if (!found) return null;
    let year = now.year;
    if (found.month < now.month) year += 1;
    const first = DateTime.fromObject({ year, month: found.month, day: 1 }, { zone: tz }).startOf("day");
    const last = first.endOf("month");
    return { from: dateOnly(first), to: dateOnly(last) };
  };
  const numericRange = parseNumericRange();
  if (numericRange) return numericRange;
  const monthRange = parseMonthRange();
  if (monthRange) return monthRange;
  const langKey = lang && lang !== "other" ? lang : undefined;
  const hasAny = (arr: string[]) => arr.some((k) => hay.includes(k));
  const isToday = hasAny(
    langKey === "en" ? ["today"] :
      langKey === "pt" ? ["hoje"] :
        ["hoy"]
  );
  const isTomorrow = hasAny(
    langKey === "en" ? ["tomorrow"] :
      langKey === "pt" ? ["amanha", "amanhã"] :
        ["manana", "mañana"]
  );
  const isTonight = hasAny(
    langKey === "en" ? ["tonight"] :
      langKey === "pt" ? ["esta noite"] :
        ["esta noche"]
  );
  const isWeekend = hasAny(
    langKey === "en" ? ["this weekend", "weekend"] :
      langKey === "pt" ? ["este fim de semana", "fim de semana"] :
        ["este fin de semana", "fin de semana"]
  );
  const isNextWeek = hasAny(
    langKey === "en" ? ["next week"] :
      langKey === "pt" ? ["proxima semana", "próxima semana", "semana que vem"] :
        ["proxima semana", "próxima semana", "la proxima semana", "la próxima semana"]
  );

  if (isTonight) {
    const startLocal = now.set({ hour: 18, minute: 0, second: 0, millisecond: 0 });
    const endLocal = now.endOf("day");
    return { from: startLocal.toUTC().toISO()!, to: endLocal.toUTC().toISO()! };
  }
  if (isToday) {
    return { from: dateOnly(now), to: dateOnly(now) };
  }
  if (isTomorrow) {
    const day = now.plus({ days: 1 });
    return { from: dateOnly(day), to: dateOnly(day) };
  }
  if (isWeekend) {
    const weekday = now.weekday; // 1=Mon ... 6=Sat 7=Sun
    let sat: DateTime;
    let sun: DateTime;
    if (weekday === 6) {
      sat = now.startOf("day");
      sun = now.plus({ days: 1 }).endOf("day");
    } else if (weekday === 7) {
      sat = now.minus({ days: 1 }).startOf("day");
      sun = now.endOf("day");
    } else {
      const daysToSat = 6 - weekday;
      sat = now.plus({ days: daysToSat }).startOf("day");
      sun = sat.plus({ days: 1 }).endOf("day");
    }
    return { from: dateOnly(sat), to: dateOnly(sun) };
  }
  if (isNextWeek) {
    const weekday = now.weekday; // 1=Mon ... 7=Sun
    const daysToNextMonday = 8 - weekday;
    const start = now.plus({ days: daysToNextMonday }).startOf("day");
    const end = start.plus({ days: 6 }).endOf("day");
    return { from: dateOnly(start), to: dateOnly(end) };
  }
  const start = now.startOf("day");
  const end = now.plus({ days: 7 }).endOf("day");
  return { from: dateOnly(start), to: dateOnly(end) };
}

function hasTemporalSignalForEvents(text: string): boolean {
  const hay = normalizeText(text || "");
  if (!hay) return false;
  if (/(hoy|mañana|manana|esta noche|fin de semana|este fin de semana|proxima semana|próxima semana|la proxima semana|la próxima semana|weekend|this weekend|next week|today|tomorrow|tonight|hoje|amanha|amanhã|semana que vem|este mes|este mês|this month|mes|mês)\b/i.test(hay)) return true;
  if (/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{4}\b/.test(hay)) return true;
  if (/\b\d{4}-\d{2}-\d{2}\b/.test(hay)) return true;
  if (/\benero\b|\bfebrero\b|\bmarzo\b|\babril\b|\bmayo\b|\bjunio\b|\bjulio\b|\bagosto\b|\bseptiembre\b|\bsetiembre\b|\boctubre\b|\bnoviembre\b|\bdiciembre\b/i.test(hay)) return true;
  if (/\bjanuary\b|\bfebruary\b|\bmarch\b|\bapril\b|\bmay\b|\bjune\b|\bjuly\b|\baugust\b|\bseptember\b|\boctober\b|\bnovember\b|\bdecember\b/i.test(hay)) return true;
  if (/\bjaneiro\b|\bfevereiro\b|\bmarco\b|\bmarço\b|\babril\b|\bmaio\b|\bjunho\b|\bjulho\b|\bagosto\b|\bsetembro\b|\boutubro\b|\bnovembro\b|\bdezembro\b/i.test(hay)) return true;
  return false;
}

function formatEventRange(startIso: string, endIso: string | undefined, tz: string, lang: "es" | "en" | "pt") {
  const locale = lang === "pt" ? "pt" : lang === "en" ? "en" : "es";
  const isDateOnly = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
  const start = isDateOnly(startIso)
    ? DateTime.fromISO(startIso, { zone: tz }).startOf("day").setLocale(locale)
    : DateTime.fromISO(startIso, { zone: "utc" }).setZone(tz).setLocale(locale);
  const end = endIso
    ? (isDateOnly(endIso)
      ? DateTime.fromISO(endIso, { zone: tz }).endOf("day").setLocale(locale)
      : DateTime.fromISO(endIso, { zone: "utc" }).setZone(tz).setLocale(locale))
    : null;
  if (end && start.hasSame(end, "day")) {
    const day = start.toLocaleString(DateTime.DATE_MED);
    const startTime = start.toLocaleString(DateTime.TIME_SIMPLE);
    const endTime = end.toLocaleString(DateTime.TIME_SIMPLE);
    return `${day} ${startTime}–${endTime}`;
  }
  if (end) {
    return `${start.toLocaleString(DateTime.DATETIME_MED)}–${end.toLocaleString(DateTime.DATETIME_MED)}`;
  }
  return start.toLocaleString(DateTime.DATETIME_MED);
}

function buildNearbyCarouselFromConfig(
  attractions: Array<{ name?: string; notes?: string; images?: Array<{ url?: string; alt?: string }> }> | undefined,
  maxItems = 5
): CarouselItem[] {
  if (!Array.isArray(attractions)) return [];
  return attractions
    .map((a) => {
      const title = String(a?.name || "").trim();
      const subtitle = a?.notes ? String(a.notes).trim() : undefined;
      const images = Array.isArray(a?.images)
        ? a.images
          .map((img) => {
            const url = String(img?.url || "").trim();
            if (!url) return null;
            return { url, alt: img?.alt || title || subtitle || undefined };
          })
          .filter(Boolean) as Array<{ url: string; alt?: string }>
        : [];
      if (!images.length) return null;
      return { title, subtitle, images };
    })
    .filter(Boolean)
    .slice(0, maxItems) as CarouselItem[];
}

function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test((url || "").trim());
}

function buildThingsToDoCarouselFromConfig(
  attractions: Array<any> | undefined,
  fallbackCity?: string,
  maxItems = 5
): CarouselItem[] {
  if (!Array.isArray(attractions)) return [];
  const seen = new Set<string>();
  const out: CarouselItem[] = [];
  for (const a of attractions) {
    if (out.length >= maxItems) break;
    const title = String(a?.name || "").trim();
    if (!title) continue;
    const key = normalizeText(title);
    if (!key || seen.has(key)) continue;
    const rawImages = Array.isArray(a?.images) ? a.images : [];
    const images = rawImages
      .map((img: any) => {
        const url = String(img?.url || img || "").trim();
        if (!isHttpUrl(url)) return null;
        return { url, alt: String(img?.alt || title || "").trim() || undefined };
      })
      .filter(Boolean)
      .slice(0, 2) as Array<{ url: string; alt?: string }>;
    if (!images.length) continue;
    const subtitle =
      String(a?.zone || a?.area || a?.neighborhood || a?.city || fallbackCity || a?.notes || "")
        .trim() || undefined;
    out.push({ title, subtitle, images });
    seen.add(key);
  }
  return out;
}

function extractLocationHints(text: string): { city?: string; country?: string } {
  const line =
    text.match(/\b(Ubicaci[oó]n|Location|Localiza[cç][aã]o)\s*:\s*(.+)/i)?.[2] ||
    text.match(/\bCity\s*:\s*(.+)/i)?.[1] ||
    "";
  if (!line) return {};
  const parts = line.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 1) return { city: parts[0] };
  if (parts.length >= 2) return { city: parts[parts.length - 2], country: parts[parts.length - 1] };
  return {};
}

function parseNearbyPoints(text: string): NearbyPoint[] {
  const blocks = text.split(/\n\s*\n+/);
  const items: NearbyPoint[] = [];
  for (const b of blocks) {
    const name = (b.match(/\b(Nombre|Name|Nome)\s*:\s*(.+)/i)?.[2] || "").trim();
    const desc = (b.match(/\b(Descripción corta|Short description|Descri[cç][aã]o curta)\s*:\s*(.+)/i)?.[2] || "").trim();
    const query = (b.match(/\b(Search query)\s*:\s*(.+)/i)?.[2] || "").trim();
    if (name) {
      items.push({ name, description: desc || undefined, searchQuery: query || undefined });
      continue;
    }
    const bullet = b.match(/^\s*[-•]\s+(.+)/m)?.[1];
    if (bullet) {
      items.push({ name: bullet.trim() });
    }
  }
  return items;
}

function offlineNearbyPoints(locationText: string, lang: "es" | "en" | "pt"): NearbyPoint[] {
  const loc = (locationText || "").toLowerCase();
  const isPuntaDelEste = /\b(punta del este|playa mansa|uruguay|punta ballena)\b/i.test(loc);
  if (isPuntaDelEste) {
    const items: Array<NearbyPoint> = [
      {
        name: "Playa Mansa",
        description: lang === "en" ? "Calm beach ideal for families." : lang === "pt" ? "Praia calma, ideal para famílias." : "Playa tranquila, ideal para familias.",
      },
      {
        name: "Playa Brava",
        description: lang === "en" ? "Open ocean beach with stronger waves." : lang === "pt" ? "Praia do mar aberto com ondas mais fortes." : "Playa oceánica con olas más fuertes.",
      },
      {
        name: "Monumento Los Dedos",
        description: lang === "en" ? "Iconic hand sculpture on Playa Brava." : lang === "pt" ? "Escultura icônica na Playa Brava." : "Escultura icónica en Playa Brava.",
      },
      {
        name: "Puerto de Punta del Este",
        description: lang === "en" ? "Harbor with yachts, cafes, and sea lions." : lang === "pt" ? "Porto com iates, cafés e leões-marinhos." : "Puerto con yates, cafés y lobos marinos.",
      },
      {
        name: "Avenida Gorlero",
        description: lang === "en" ? "Main avenue for shops and restaurants." : lang === "pt" ? "Avenida principal de lojas e restaurantes." : "Avenida principal de tiendas y restaurantes.",
      },
      {
        name: "Isla Gorriti",
        description: lang === "en" ? "Island with beaches and walking trails." : lang === "pt" ? "Ilha com praias e trilhas." : "Isla con playas y senderos.",
      },
      {
        name: "Faro de Punta del Este",
        description: lang === "en" ? "Historic lighthouse with panoramic views." : lang === "pt" ? "Farol histórico com vista panorâmica." : "Faro histórico con vistas panorámicas.",
      },
      {
        name: "Casapueblo",
        description: lang === "en" ? "Art museum and viewpoint in Punta Ballena." : lang === "pt" ? "Museu de arte e mirante em Punta Ballena." : "Museo de arte y mirador en Punta Ballena.",
      },
      {
        name: "Museo Ralli",
        description: lang === "en" ? "Contemporary art museum with free entry." : lang === "pt" ? "Museu de arte contemporânea com entrada gratuita." : "Museo de arte contemporáneo con entrada gratuita.",
      },
      {
        name: "Arboretum Lussich",
        description: lang === "en" ? "Nature reserve and botanical garden." : lang === "pt" ? "Reserva natural e jardim botânico." : "Reserva natural y jardín botánico.",
      },
    ];
    return items.map((it) => ({
      ...it,
      searchQuery: `${it.name} Punta del Este Uruguay`,
    }));
  }

  const generic = [
    {
      name: lang === "en" ? "Historic center / main square" : lang === "pt" ? "Centro histórico / praça principal" : "Centro histórico / plaza principal",
      description: lang === "en" ? "Walkable core with landmarks and cafes." : lang === "pt" ? "Centro caminhável com marcos e cafés." : "Centro caminable con hitos y cafés.",
    },
    {
      name: lang === "en" ? "Seaside promenade / beach" : lang === "pt" ? "Calçadão / praia" : "Costanera / playa",
      description: lang === "en" ? "Best area for sunsets and walks." : lang === "pt" ? "Melhor área para pôr do sol e caminhadas." : "Mejor área para atardeceres y caminatas.",
    },
    {
      name: lang === "en" ? "Scenic viewpoint" : lang === "pt" ? "Mirante" : "Mirador",
      description: lang === "en" ? "Panoramic city or coastline views." : lang === "pt" ? "Vista panorâmica da cidade ou costa." : "Vista panorámica de la ciudad o la costa.",
    },
    {
      name: lang === "en" ? "Harbor / marina" : lang === "pt" ? "Porto / marina" : "Puerto / marina",
      description: lang === "en" ? "Boats, seafood, and local atmosphere." : lang === "pt" ? "Barcos, frutos do mar e clima local." : "Barcos, mariscos y ambiente local.",
    },
    {
      name: lang === "en" ? "Local market / fair" : lang === "pt" ? "Mercado / feira local" : "Mercado / feria local",
      description: lang === "en" ? "Regional products and crafts." : lang === "pt" ? "Produtos regionais e artesanato." : "Productos regionales y artesanías.",
    },
    {
      name: lang === "en" ? "Local museum" : lang === "pt" ? "Museu local" : "Museo local",
      description: lang === "en" ? "Learn about local history and art." : lang === "pt" ? "Conheça a história e arte locais." : "Conocé la historia y el arte local.",
    },
    {
      name: lang === "en" ? "City park" : lang === "pt" ? "Parque urbano" : "Parque urbano",
      description: lang === "en" ? "Green space for a relaxed walk." : lang === "pt" ? "Área verde para uma caminhada tranquila." : "Espacio verde para una caminata tranquila.",
    },
    {
      name: lang === "en" ? "Gastronomic district" : lang === "pt" ? "Bairro gastronômico" : "Barrio gastronómico",
      description: lang === "en" ? "Restaurants and bars concentrated in one area." : lang === "pt" ? "Restaurantes e bares concentrados." : "Restaurantes y bares concentrados.",
    },
  ];

  return generic.map((it) => ({
    ...it,
    searchQuery: `${it.name} ${locationText}`.trim(),
  }));
}

function estimatedNote(lang: "es" | "en" | "pt") {
  if (lang === "en") return "Note: estimated list (not verified).";
  if (lang === "pt") return "Nota: lista estimada (não verificada).";
  return "Nota: listado estimado (no verificado).";
}

export function cleanWebTitle(title: string): string {
  let out = (title || "").trim();
  if (!out) return "";

  out = out.replace(/\s*\(([^)]{1,80})\)\s*$/, (match, inner) => {
    const meta = String(inner || "").toLowerCase();
    const isMeta = /\b(map|reviews?|rating|official|oficial|site|sitio|website|tripadvisor|google|facebook|instagram|booking|expedia|yelp|wikipedia)\b/.test(meta);
    return isMeta ? "" : match;
  });

  out = out.split(/\s+[-–—|•]\s+/)[0].trim();

  out = out.replace(/\s*(tripadvisor|wikipedia|booking\.com|expedia|google maps|lonely planet|yelp|facebook|instagram)\s*$/i, "");

  out = out.replace(/\s{2,}/g, " ").trim();
  return out;
}

export function toNearbyPointsFromPlaces(
  places: Array<{ name: string; description?: string; photoName?: string }>,
  locationHint: string
): NearbyPoint[] {
  return places
    .filter((p) => p && p.name)
    .map((p) => ({
      name: p.name,
      description: p.description || undefined,
      searchQuery: [p.name, locationHint].filter(Boolean).join(" ").trim() || undefined,
    }));
}

export function buildNearbyCarouselFromPlaces(
  places: Array<{ name: string; description?: string; photoName?: string }>,
  maxItems = 5
): CarouselItem[] {
  // Regla: incluir SOLO items con foto; si hay menos de 3, se devuelve lo que haya.
  return places
    .filter((p) => p.photoName)
    .slice(0, maxItems)
    .map((p) => ({
      title: p.name,
      subtitle: p.description,
      images: [
        {
          url: `/api/places/photo?name=${encodeURIComponent(p.photoName!)}&maxWidth=900`,
          alt: p.name,
        },
      ],
    }));
}

function toNearbyPointsFromPoi(
  pois: Array<{ name?: string; summary?: string; description?: string }>,
  locationHint: string
): NearbyPoint[] {
  return (pois || [])
    .filter((p) => p && p.name)
    .map((p) => ({
      name: p.name as string,
      description: p.summary || p.description || undefined,
      searchQuery: [p.name, locationHint].filter(Boolean).join(" ").trim() || undefined,
    }));
}

function mergeNearbyPoints(primary: NearbyPoint[], secondary: NearbyPoint[], limit = 10): NearbyPoint[] {
  const out: NearbyPoint[] = [];
  const seen = new Set<string>();
  const push = (p: NearbyPoint) => {
    const key = normalizeText(p.name || "");
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(p);
  };
  for (const p of primary || []) push(p);
  for (const p of secondary || []) push(p);
  return out.slice(0, limit);
}
type EventSummary = {
  _id?: string;
  name: string;
  notes?: string;
  priority?: number;
  startsAt?: string;
  endsAt?: string;
  startDate?: string;
  endDate?: string;
  sourceUrl?: string;
  location?: { name?: string; address?: string; locality?: string; mapsUrl?: string };
};

type LocalTouristEventOverride = {
  poiRefId?: string;
  name?: string;
  notes?: string;
  startsAt?: string;
  endsAt?: string;
  venue?: string;
  sourceUrl?: string;
  priority?: number;
  hidden?: boolean;
};

function eventOverrideKey(args: { name?: string; startsAt?: string; endsAt?: string; venue?: string }) {
  return normalizeText(
    `${args.name || ""}|${args.startsAt || ""}|${args.endsAt || ""}|${args.venue || ""}`
  );
}

function applyLocalEventOverrides(
  baseEvents: EventSummary[],
  localOverrides: LocalTouristEventOverride[] | undefined
): EventSummary[] {
  const overrides = Array.isArray(localOverrides) ? localOverrides : [];
  if (!overrides.length) return baseEvents;

  const byPoiRef = new Map<string, LocalTouristEventOverride>();
  const byKey = new Map<string, LocalTouristEventOverride>();
  const usedOverrides = new Set<LocalTouristEventOverride>();
  for (const o of overrides) {
    const ref = String(o?.poiRefId || "").trim();
    if (ref) byPoiRef.set(ref, o);
    const key = eventOverrideKey({
      name: o?.name,
      startsAt: o?.startsAt,
      endsAt: o?.endsAt,
      venue: o?.venue,
    });
    if (key) byKey.set(key, o);
  }

  const merged = baseEvents
    .map((ev) => {
      const poiRef = String(ev?._id || "").trim();
      const evStart = ev.startsAt || ev.startDate || "";
      const evEnd = ev.endsAt || ev.endDate || "";
      const evVenue = ev.location?.name || ev.location?.address || ev.location?.locality || "";
      const key = eventOverrideKey({
        name: ev.name,
        startsAt: evStart,
        endsAt: evEnd,
        venue: evVenue,
      });
      const ov = (poiRef && byPoiRef.get(poiRef)) || byKey.get(key);
      if (!ov) return { ...ev, priority: 0 };
      usedOverrides.add(ov);
      if (ov.hidden) return null;
      return {
        ...ev,
        notes: String(ov.notes || ev.notes || "").trim() || undefined,
        sourceUrl: String(ov.sourceUrl || ev.sourceUrl || "").trim() || undefined,
        location: {
          ...(ev.location || {}),
          name: String(ov.venue || ev.location?.name || "").trim() || ev.location?.name,
        },
        priority: Number.isFinite(Number(ov.priority)) ? Number(ov.priority) : 0,
      } as EventSummary;
    })
    .filter(Boolean) as EventSummary[];

  const mergedKeys = new Set(
    merged.map((ev) =>
      eventOverrideKey({
        name: ev.name,
        startsAt: ev.startsAt || ev.startDate || "",
        endsAt: ev.endsAt || ev.endDate || "",
        venue: ev.location?.name || ev.location?.address || ev.location?.locality || "",
      })
    )
  );
  const localOnly: EventSummary[] = overrides
    .filter((ov) => !usedOverrides.has(ov))
    .filter((ov) => !ov.hidden)
    .map((ov) => {
      const name = String(ov.name || "").trim();
      if (!name) return null;
      const startsAt = String(ov.startsAt || "").trim() || undefined;
      const endsAt = String(ov.endsAt || "").trim() || undefined;
      const venue = String(ov.venue || "").trim() || undefined;
      const sourceUrl = String(ov.sourceUrl || "").trim() || undefined;
      const notes = String(ov.notes || "").trim() || undefined;
      const key = eventOverrideKey({ name, startsAt, endsAt, venue });
      if (!key || mergedKeys.has(key)) return null;
      return {
        _id: `local:${key}`,
        name,
        notes,
        startsAt,
        endsAt,
        sourceUrl,
        location: venue ? { name: venue } : undefined,
        priority: Number.isFinite(Number(ov.priority)) ? Number(ov.priority) : 0,
      } as EventSummary;
    })
    .filter(Boolean) as EventSummary[];

  return [...merged, ...localOnly].sort((a, b) => {
    const pa = Number(a.priority || 0);
    const pb = Number(b.priority || 0);
    if (pb !== pa) return pb - pa;
    const aStart = Date.parse(a.startsAt || a.startDate || "");
    const bStart = Date.parse(b.startsAt || b.startDate || "");
    return (Number.isNaN(aStart) ? 0 : aStart) - (Number.isNaN(bStart) ? 0 : bStart);
  });
}

function buildEventQuery(event: EventSummary): string {
  const mapsQuery = extractMapsQuery(event.location?.mapsUrl);
  const locName = (event.location?.name || "").trim();
  const address = (event.location?.address || "").trim();
  return (mapsQuery || locName || address || "").trim();
}

async function buildEventsCarouselFromPlaces(
  events: EventSummary[],
  tz: string,
  lang: "es" | "en" | "pt",
  locationHint?: string
): Promise<CarouselItem[]> {
  const items: CarouselItem[] = [];
  for (const event of events.slice(0, 5)) {
    const queryText = buildEventQuery(event);
    if (!queryText) continue;
    const places = await searchNearbyPlaces({
      queryText,
      locationText: locationHint,
      lang,
      count: 3,
    });
    const placeWithPhoto = places.find((p) => p.photoName);
    if (!placeWithPhoto?.photoName) continue;
    const start = event.startsAt || event.startDate;
    const end = event.endsAt || event.endDate;
    const when = start ? formatEventRange(start, end, tz, lang) : "";
    const locality = event.location?.locality || event.location?.name || event.location?.address || "";
    const subtitle = [locality, when].filter(Boolean).join(" • ");
    items.push({
      title: event.name,
      subtitle: subtitle || undefined,
      images: [
        {
          url: `/api/places/photo?name=${encodeURIComponent(placeWithPhoto.photoName)}&maxWidth=900`,
          alt: event.name,
        },
      ],
    });
    if (items.length >= 5) break;
  }
  return items;
}

function buildNearbyInfoText(points: NearbyPoint[], lang: "es" | "en" | "pt"): string {
  const labels =
    lang === "en"
      ? { title: "Nearby points of interest", name: "Name", desc: "Short description", query: "Search query" }
      : lang === "pt"
        ? { title: "Pontos de interesse próximos", name: "Nome", desc: "Descrição curta", query: "Search query" }
        : { title: "Puntos de interés cercanos", name: "Nombre", desc: "Descripción corta", query: "Search query" };
  const lines = points
    .map(
      (p) =>
        `- ${labels.name}: ${p.name}\n` +
        `  - ${labels.desc}: ${p.description || ""}\n` +
        `  - ${labels.query}: ${p.searchQuery || ""}`
    )
    .join("\n");
  return `# ${labels.title}\n\n${lines}`;
}

function buildNearbyQuery(text: string, lang: "es" | "en" | "pt"): string {
  const base = text.trim();
  if (!base) return "";
  const already =
    /points?\s+of\s+interest.*near/i.test(base) ||
    /pontos?\s+de\s+interesse.*perto\s+de/i.test(base) ||
    /puntos?\s+de\s+inter[eé]s.*cerca\s+de/i.test(base);
  if (already) return base;
  if (lang === "en") return `tourist attractions near ${base}`;
  if (lang === "pt") return `atrações turísticas perto de ${base}`;
  return `atracciones turísticas cerca de ${base}`;
}

function buildNearbyQueries(text: string, lang: "es" | "en" | "pt"): string[] {
  const base = text.trim();
  if (!base) return [];
  if (lang === "en") {
    return [
      `tourist attractions near ${base}`,
      `points of interest near ${base}`,
      `things to do near ${base}`,
    ];
  }
  if (lang === "pt") {
    return [
      `atrações turísticas perto de ${base}`,
      `pontos de interesse perto de ${base}`,
      `lugares turísticos perto de ${base}`,
    ];
  }
  return [
    `atracciones turísticas cerca de ${base}`,
    `puntos de interés cerca de ${base}`,
    `lugares turísticos cerca de ${base}`,
  ];
}

function stripUrls(text: string): string {
  return (text || "").replace(/https?:\/\/\S+/gi, "").replace(/\s{2,}/g, " ").trim();
}

async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let idx = 0;
  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (idx < items.length) {
      const current = idx++;
      out[current] = await fn(items[current]);
    }
  });
  await Promise.all(workers);
  return out;
}

function normalizeBullets(text: string): string {
  const lines = (text || "").split(/\r?\n/);
  const metaPrefix = /^(nota|fuente|bus|rango|ciudad|eventos|events|range|city|search query)\b/i;
  const metaBus = /^bus\b\s*[-—]?\s*\(?\d{2,4}\)?/i;
  const metaLocationLine = /^(edificio|parada|playa\s+parada)\b/i;
  return lines
    .map((line) => {
      const raw = line.trim();
      if (!raw) return line;
      if (/^#{1,6}\s+/.test(raw)) return line;
      const deBulleted = raw.replace(/^[-•*]\s+/, "");
      if (metaPrefix.test(deBulleted) || metaBus.test(deBulleted) || metaLocationLine.test(deBulleted)) {
        return deBulleted;
      }
      if (/^[-•*]\s+/.test(raw)) return `- ${raw.replace(/^[-•*]\s+/, "")}`;
      if (/^\d+[.)]\s+/.test(raw)) return `- ${raw.replace(/^\d+[.)]\s+/, "")}`;
      if (raw.length <= 120 && !raw.includes(":") && !metaPrefix.test(raw) && !metaBus.test(raw)) return `- ${raw}`;
      return line;
    })
    .join("\n");
}

function ensureFinalQuestion(text: string, lang: "es" | "en" | "pt"): string {
  if (text.includes("?")) return text;
  const q =
    lang === "en"
      ? "Do you prefer something relaxed or more lively?"
      : lang === "pt"
        ? "Você prefere algo mais tranquilo ou mais agitado?"
        : "¿Preferís opciones tranquilas o con más movimiento?";
  return `${text.replace(/\s*$/, "")}\n${q}`;
}

function clampBullets(text: string, min = 4, max = 8): string {
  const lines = (text || "").split(/\r?\n/);
  const questionLineIndex = lines.findIndex((l) => /\?\s*$/.test(l.trim()));
  const questionLine = questionLineIndex >= 0 ? lines[questionLineIndex] : null;
  const contentLines = questionLineIndex >= 0 ? lines.filter((_, i) => i !== questionLineIndex) : lines;
  const bulletLines = contentLines.filter((l) => /^\s*-\s+/.test(l));
  if (bulletLines.length > max) {
    const kept: string[] = [];
    let count = 0;
    for (const l of contentLines) {
      if (/^\s*-\s+/.test(l)) {
        if (count >= max) continue;
        count++;
      }
      kept.push(l);
    }
    if (questionLine) kept.push(questionLine);
    return kept.join("\n");
  }
  if (bulletLines.length < min) {
    if (questionLine) return [...contentLines, questionLine].join("\n");
  }
  return lines.join("\n");
}

// Función principal de retrieval determinista
export async function retrievalBased(state: any): Promise<any> {
  if (process.env.DEBUG_ROUTING === "1") {
    debugLog("[routing] enter retrievalBased", {
      conversationId: state.conversationId,
      promptKey: state.promptKey,
      normalizedMessage: state.normalizedMessage,
    });
  }
  debugger;
  let userQuery = state.normalizedMessage;
  if (!userQuery) {
    userQuery = await getLastHumanText(state.messages as BaseMessage[]);
  }
  let promptKey = state.promptKey;
  let category = state.category;
  let retrievedInfo: string = "";
  let finalResponse: string = "";
  let rich: RichPayload | undefined = undefined;
  const debugRouting = process.env.DEBUG_ROUTING === "1";
  const isEventsPrompt = promptKey === "tourist_events" || promptKey === "tourist_events_img";
  const isNearbyPrompt = promptKey === "nearby_points" || promptKey === "nearby_points_img";
  const isThingsToDoPrompt =
    promptKey === "things_to_do" ||
    promptKey === "things_to_do_img" ||
    promptKey === "things_to_do_en" ||
    promptKey === "things_to_do_en_img" ||
    promptKey === "things_to_do_pt" ||
    promptKey === "things_to_do_pt_img";
  const isThingsToDoImgPrompt =
    promptKey === "things_to_do_img" ||
    promptKey === "things_to_do_en_img" ||
    promptKey === "things_to_do_pt_img";
  const eventIntent = looksLikeEventsIntent(userQuery, promptKey, category);
  debugLog("[events-intent-check]", {
    category,
    promptKey,
    userQuery,
    eventIntent,
  });

  if (isEventsPrompt || (eventIntent && !isThingsToDoPrompt && !isNearbyPrompt)) {
    debugLog("[events-intent]", {
      category,
      promptKey,
      userQuery,
    });
    const hotelId = state.hotelId ?? "hotel999";
    const conversationId = state.conversationId || "";
    const cfg = await getHotelConfig(hotelId);
    const st = conversationId ? await getConvState(hotelId, conversationId) : null;
    const langRaw = normalizeLang(
      state.originalLang ?? state.retrievalLang ?? state.detectedLanguage ?? state.preferredLanguage
    );
    const langForEvents = langRaw === "other" ? "es" : langRaw;
    const hasPhotoSignal = /\b(foto|fotos|imagen|imagenes|imágenes|photos|pics)\b/i.test(userQuery || "");
    const eventPromptKey = promptKey === "tourist_events_img" || hasPhotoSignal ? "tourist_events_img" : "tourist_events";

    const tz = cfg?.timezone || "UTC";
    const hasTimeSignal = hasTemporalSignalForEvents(userQuery || "");
    const cityMention = extractCityMention(userQuery) || undefined;
    const city = cityMention || (st as any)?.lastEventCity || cfg?.city || undefined;
    const eventsRegion = String((cfg as any)?.eventsRegion || "").trim() || undefined;
    const range = (!hasTimeSignal && (st as any)?.lastEventRange?.from && (st as any)?.lastEventRange?.to)
      ? { from: (st as any).lastEventRange.from, to: (st as any).lastEventRange.to, tz: (st as any).lastEventRange.tz || tz }
      : { ...resolveEventRange(userQuery, tz, langForEvents), tz };
    const events = await searchEvents({
      from: range.from,
      to: range.to,
      city,
      region: eventsRegion,
      limit: 5,
      tz: range.tz,
    });
    const rangeText = formatEventRange(range.from, range.to, range.tz, langForEvents);
    let eventsContentVersion: string | null = null;
    try {
      const idx = await getCurrentVersionFromIndex(hotelId, "retrieval_based", eventPromptKey, langForEvents);
      eventsContentVersion = idx?.currentVersion ? String(idx.currentVersion) : null;
    } catch {
      eventsContentVersion = null;
    }
    const deduped = (events || [])
      .filter((e) => (e?.name || "").trim().length > 0)
      .filter((e, idx, arr) => {
        const startRaw = e.startsAt || e.startDate || "";
        const endRaw = e.endsAt || e.endDate || "";
        const place = e.location?.name || e.location?.address || e.location?.locality || "";
        const key = normalizeText(`${e.name}|${startRaw}|${endRaw}|${place}`);
        return arr.findIndex((x) => {
          const xs = x.startsAt || x.startDate || "";
          const xe = x.endsAt || x.endDate || "";
          const xp = x.location?.name || x.location?.address || x.location?.locality || "";
          return normalizeText(`${x.name}|${xs}|${xe}|${xp}`) === key;
        }) === idx;
      });
    const curatedEvents = applyLocalEventOverrides(
      deduped as EventSummary[],
      (cfg as any)?.touristEvents as LocalTouristEventOverride[] | undefined
    );
    let venues: Array<{ name: string }> = [];
    let placesForVenues: Array<{ name: string; description?: string; photoName?: string }> = [];
    const allowPlacesRuntime = (cfg as any)?.globalEventsProvider === "places" || process.env.ALLOW_PLACES_RUNTIME === "1";
    if (!curatedEvents.length && allowPlacesRuntime) {
      const countryForEvents =
        String(cfg?.country || "").trim() ||
        countryFromEventsRegion((cfg as any)?.eventsRegion || "");
      const locationText = city
        ? [city, countryForEvents].filter(Boolean).join(", ").trim()
        : [cfg?.city, countryForEvents].filter(Boolean).join(", ").trim();
      const queryText =
        langForEvents === "en"
          ? "event venues"
          : langForEvents === "pt"
            ? "locais de eventos"
            : "lugares de eventos";
      const places = await searchNearbyPlaces({
        queryText,
        locationText,
        lang: langForEvents as any,
        count: 5,
      });
      placesForVenues = places || [];
      const seen = new Set<string>();
      venues = (places || [])
        .map((p) => ({ name: String(p?.name || "").trim() }))
        .filter((v) => v.name)
        .filter((v) => {
          const key = normalizeText(v.name);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 5);
    }
    const venuesIntro =
      venues.length
        ? langForEvents === "en"
          ? "Places that often host events in the area:\n"
          : langForEvents === "pt"
            ? "Locais onde costumam ocorrer eventos na região:\n"
            : "Lugares donde suelen anunciarse eventos en la zona:\n"
        : "";
    const venuesBlock = venues.length
      ? `${venuesIntro}${venues.map((v) => `- ${v.name}`).join("\n")}\n`
      : "";
    const eventsFallback =
      venues.length
        ? (langForEvents === "en"
          ? "Here are places that often host events in the area:\n"
          : langForEvents === "pt"
            ? "Aqui estão locais onde costumam ocorrer eventos na região:\n"
            : "Acá tenés lugares donde suelen anunciarse eventos en la zona:\n") +
          `${venues.map((v) => `- ${v.name}`).join("\n")}\n`
        : "";
    const eventsFallbackBase =
      langForEvents === "en"
        ? "I couldn't find any events loaded for this period.\nYou can check up‑to‑date sources and, if you want, I can expand the range or city.\n\n- Walks along the waterfront and nearby beaches\n- Local food spots and markets\n- Viewpoints and sunsets\n- Museums or cultural centers\n"
        : langForEvents === "pt"
          ? "Não encontrei eventos carregados para este período.\nVocê pode consultar fontes atualizadas e, se quiser, posso ampliar o intervalo ou a cidade.\n\n- Passeios pela orla e praias próximas\n- Gastronomia local e mercados\n- Mirantes e pôr do sol\n- Museus ou centros culturais\n"
          : "No encontré eventos cargados para este período.\nPodés consultar fuentes actualizadas y, si querés, ampliar rango o ciudad.\n\n- Paseos por la rambla y playas cercanas\n- Gastronomía local y mercados\n- Miradores y atardeceres\n- Museos o centros culturales\n";
    const labelWhen =
      langForEvents === "en" ? "When" : langForEvents === "pt" ? "Quando" : "Cuándo";
    const labelPlace =
      langForEvents === "en" ? "Place" : langForEvents === "pt" ? "Lugar" : "Lugar";
    const labelSource =
      langForEvents === "en" ? "Source" : langForEvents === "pt" ? "Fonte" : "Fuente";
    const labelDetails =
      langForEvents === "en" ? "Details" : langForEvents === "pt" ? "Detalhes" : "Detalle";
    const questionText =
      curatedEvents.length === 0
        ? ""
        : langForEvents === "en"
          ? "Do you prefer something relaxed or more lively?"
          : langForEvents === "pt"
            ? "Você prefere algo mais tranquilo ou mais agitado?"
            : "¿Preferís opciones tranquilas o con más movimiento?";
    const questionBlock = questionText ? `${questionText}\n ->\n` : "";
    const eventsBlock = curatedEvents.length
      ? curatedEvents
          .map((e) => {
            const start = e.startsAt || e.startDate;
            const end = e.endsAt || e.endDate;
            const when = start ? formatEventRange(start, end, tz, langForEvents) : "";
            const place = e.location?.name || e.location?.address || e.location?.locality || "";
            const sourceUrl =
              typeof e.sourceUrl === "string" && /^https?:\/\//i.test(e.sourceUrl) ? e.sourceUrl : "";
            const details = String((e as any)?.notes || "").trim();
            return `- ${e.name}\n  - ${labelWhen}: ${when}\n  - ${labelPlace}: ${place}\n  - ${labelSource}: ${sourceUrl}\n${details ? `  - ${labelDetails}: ${details}\n` : ""}`;
          })
          .join("")
      : (eventsFallback || eventsFallbackBase);
    const viewModel = {
      title:
        langForEvents === "en"
          ? "Events"
          : "Eventos",
      city: city || "",
      rangeText,
      venuesIntro,
      venues,
      venuesBlock,
      eventsFallback,
      questionBlock,
      eventsBlock,
      runtime: {
        title:
          langForEvents === "en"
            ? "Events"
            : "Eventos",
        rangeText,
        eventsBlock,
        questionBlock,
      },
    };
    const template = getTemplate("retrieval_based", eventPromptKey, langForEvents);
    const renderedText = template
      ? renderCuratedTemplate(template.body, viewModel).trim()
      : "No hay eventos para este período.";
    const carousel =
      eventPromptKey === "tourist_events_img"
        ? curatedEvents.length
          ? await buildEventsCarouselFromPlaces(curatedEvents, range.tz, langForEvents, city || cfg?.city)
          : buildNearbyCarouselFromPlaces(placesForVenues, 5)
        : [];
    finalResponse = renderedText;
    const messageText = finalResponse || (carousel.length ? "" : "Lo siento, no encontré información.");
    debugLog("[events-render]", {
      promptKey,
      eventPromptKey,
      langForEvents,
      hasTemplate: Boolean(template),
      eventsCount: curatedEvents.length,
      carouselCount: carousel.length,
      renderedTextPreview: renderedText.slice(0, 120),
      messageTextPreview: messageText.slice(0, 120),
    });
    if (conversationId) {
      await upsertConvState(hotelId, conversationId, {
        lastEventCity: city ?? null,
        lastEventRange: { from: range.from, to: range.to, tz: range.tz },
        lastEventPromptKey: eventPromptKey,
        lastIntentGroup: "events",
        updatedBy: "ai",
      } as any);
    }
    return {
      ...state,
      messages: [...state.messages, new AIMessage(messageText)],
      category,
      promptKey: eventPromptKey,
      source: "retrieval_based_events",
      resolved: {
        ...((state as any).resolved || {}),
        content: {
          ...(((state as any).resolved || {}).content || {}),
          version: eventsContentVersion,
        },
      },
      meta: {
        ...(state as any).meta,
        ...(debugRouting
          ? {
            debug: {
              ...((state as any)?.meta?.debug || {}),
              intentGroup: "events",
              ...(curatedEvents.length === 0 ? { reason: "no-events" } : {}),
              eventIntent: true,
              carouselCount: carousel.length,
            },
          }
          : {}),
        ...(carousel.length ? { rich: { carousel } } : {}),
      },
    };
  }

  if (isThingsToDoPrompt) {
    const promptTemplate =
      curatedPrompts[promptKey as keyof typeof curatedPrompts] ||
      curatedPrompts.things_to_do ||
      defaultPrompt;
    const cfg = await getHotelConfig(state.hotelId ?? "hotel999");
    const region = (cfg as any)?.eventsRegion || "";
    const regionPois = region ? await searchAttractions({ region, limit: 12 }) : [];
    const regionPoints = toNearbyPointsFromPoi(regionPois, [cfg?.city, cfg?.country].filter(Boolean).join(", "));
    const hotelPoints = toNearbyPointsFromConfig(cfg?.attractions, cfg?.city || "").slice(0, 10);
    const mergedPoints = mergeNearbyPoints(regionPoints, hotelPoints, 12);
    const retrievedBlock = mergedPoints.length
      ? mergedPoints.map((p) => `- ${p.name}${p.description ? `: ${p.description}` : ""}`).join("\n")
      : "";
    const finalPrompt = promptTemplate
      .replace("{{locationLine}}", "")
      .replace("{{retrieved}}", retrievedBlock)
      .replace("{{query}}", userQuery);
    const response = await getLocalModel().invoke([
      { role: "system", content: finalPrompt },
      { role: "user", content: userQuery },
    ]);
    finalResponse = typeof response.content === "string" ? response.content.trim() : "";
    const langRaw = normalizeLang(state.originalLang ?? state.retrievalLang ?? state.detectedLanguage);
    const langForFallback = langRaw === "en" ? "en" : langRaw === "pt" ? "pt" : "es";
    finalResponse = normalizeBullets(finalResponse);
    finalResponse = ensureFinalQuestion(finalResponse, langForFallback);
    finalResponse = clampBullets(finalResponse, 4, 8);
    if (isThingsToDoImgPrompt) {
      const langForPlaces = langRaw === "other" ? "es" : langRaw;
      let carousel = buildThingsToDoCarouselFromConfig((cfg as any)?.attractions, (cfg as any)?.city, 5);
      if (!carousel.length && process.env.ALLOW_PLACES_RUNTIME === "1") {
        const locationText = [String((cfg as any)?.city || "").trim(), String((cfg as any)?.country || "").trim()]
          .filter(Boolean)
          .join(", ")
          .trim();
        const queryText =
          langForPlaces === "en"
            ? `things to do in ${locationText || "the area"}`
            : langForPlaces === "pt"
              ? `atividades e atrações em ${locationText || "a região"}`
              : `actividades y atracciones en ${locationText || "la zona"}`;
        try {
          const places = await searchNearbyPlaces({
            queryText,
            locationText: locationText || undefined,
            lang: langForPlaces,
            count: 12,
          });
          carousel = buildNearbyCarouselFromPlaces(places, 5);
          const seenTitles = new Set<string>();
          carousel = carousel
            .map((item) => ({
              ...item,
              images: (item.images || []).filter((img) => {
                const url = String(img?.url || "").trim();
                return isHttpUrl(url) || url.startsWith("/api/places/photo?");
              }),
            }))
            .filter((item) => {
              const key = normalizeText(String(item?.title || ""));
              if (!key || seenTitles.has(key)) return false;
              if (!Array.isArray(item.images) || item.images.length < 1) return false;
              seenTitles.add(key);
              return true;
            })
            .slice(0, 5);
        } catch {
          // best effort: devolver solo texto
        }
      }
      if (carousel.length) {
        rich = { carousel };
      }
    }
    const responseToUser = await translateIfNeeded(finalResponse, state.retrievalLang, state.originalLang);
    return {
      ...state,
      messages: [...state.messages, new AIMessage(responseToUser || "Lo siento, no encontré información.")],
      category,
      promptKey,
      meta: {
        ...(state as any).meta,
        ...(debugRouting
          ? {
            debug: {
              ...((state as any)?.meta?.debug || {}),
              intentGroup: "things_to_do",
              eventIntent: false,
              carouselCount: (rich as any)?.carousel?.length || 0,
            },
          }
          : {}),
        ...(rich ? { rich } : {}),
      },
    };
  }

  // --- Algoritmo determinista: VistaTotal ---
  const { getHotelAstraCollection } = await import("../astra/connection");
  const collection = getHotelAstraCollection(state.hotelId ?? "hotel999");
  const hotelId = state.hotelId ?? "hotel999";
  const filter =
    state.promptKey ? { hotelId, promptKey: state.promptKey } :
      state.category ? { hotelId, category: state.category } :
        { hotelId };
  const projection = { _id: 1, category: 1, promptKey: 1, targetLang: 1, version: 1, updatedAt: 1 };
  const cursor = collection.find(filter, { projection } as any);
  const bestByGroup: Record<string, any> = {};
  let scanned = 0;
  try {
    for await (const doc of cursor as any) {
      scanned++;
      const key = `${doc.category ?? ''}|${doc.promptKey ?? ''}|${doc.targetLang ?? ''}`;
      const best = bestByGroup[key];
      if (!best) {
        bestByGroup[key] = doc;
        continue;
      }
      const bestHasVersion = best.version !== undefined && best.version !== null;
      const currHasVersion = doc.version !== undefined && doc.version !== null;
      if (bestHasVersion && currHasVersion) {
        const bestNum = Number(best.version);
        const currNum = Number(doc.version);
        if (Number.isFinite(bestNum) && Number.isFinite(currNum)) {
          bestByGroup[key] = currNum > bestNum ? doc : best;
          continue;
        }
        if (Number.isFinite(currNum) && !Number.isFinite(bestNum)) {
          bestByGroup[key] = doc;
          continue;
        }
        if (!Number.isFinite(currNum) && Number.isFinite(bestNum)) {
          bestByGroup[key] = best;
          continue;
        }
        bestByGroup[key] = String(doc.version) > String(best.version) ? doc : best;
        continue;
      }
      if (currHasVersion && !bestHasVersion) {
        bestByGroup[key] = doc;
        continue;
      }
      if (!currHasVersion && bestHasVersion) {
        bestByGroup[key] = best;
        continue;
      }
      const bestUpdated = best.updatedAt ? Date.parse(best.updatedAt) : NaN;
      const currUpdated = doc.updatedAt ? Date.parse(doc.updatedAt) : NaN;
      if (Number.isFinite(bestUpdated) && Number.isFinite(currUpdated)) {
        bestByGroup[key] = currUpdated > bestUpdated ? doc : best;
        continue;
      }
      if (Number.isFinite(currUpdated) && !Number.isFinite(bestUpdated)) {
        bestByGroup[key] = doc;
        continue;
      }
      bestByGroup[key] = best;
    }
  } finally {
    try {
      const maybe = (cursor as any).close?.();
      if (maybe && typeof (maybe as any).then === "function") await maybe;
    } catch { }
  }
  if (process.env.DEBUG_NEARBY_POINTS === "1") {
    debugLog("[VistaTotal] base filter + count", { filter, count: scanned });
  }
  // Mantener el mejor documento por grupo (category|promptKey|targetLang)
  const latestIds = Object.values(bestByGroup)
    .map((d: any) => d?._id ?? null)
    .filter((id): id is string => Boolean(id));
  debugLog(`[retrievalBased] latestIds por grupo:`, latestIds);
  // Realizar búsqueda con esos IDs filtrados
  const docs = await searchFromAstra(
    userQuery,
    state.hotelId ?? "hotel999",
    {},
    state.retrievalLang,
    { forceVectorSearch: true, allowedIds: latestIds }
  );

  // searchFromAstra retorna string[]; unificamos a texto
  retrievedInfo = Array.isArray(docs) ? docs.join("\n\n") : String(docs ?? "");

  if (!eventIntent) {
    const isNearbyPrompt = promptKey === "nearby_points" || promptKey === "nearby_points_img";
    const normalizedLang = normalizeLang(state.originalLang ?? state.retrievalLang);
    let nearbyPoints: NearbyPoint[] = [];

    if (isNearbyPrompt) {
      const parsed = parseNearbyPoints(retrievedInfo);
      const insufficient =
        !retrievedInfo ||
        retrievedInfo.trim().length < 80 ||
        parsed.length < 3;
      if (process.env.DEBUG_NEARBY_POINTS === "1") {
        debugLog("[nearby_points] retrievedInfo", {
          promptKey,
          length: retrievedInfo?.length || 0,
          parsedCount: parsed.length,
          insufficient,
        });
      }
      const langForNearby = normalizedLang === "other" ? "es" : normalizedLang;
      if (!insufficient) {
        nearbyPoints = parsed;
      } else {
        const hints = extractLocationHints(retrievedInfo);
        let locationHint = [hints.city, hints.country].filter(Boolean).join(" ").trim();
        const cfg = await getHotelConfig(state.hotelId ?? "hotel999");
        if (!locationHint) {
          locationHint = [
            cfg?.address,
            cfg?.city,
            cfg?.country,
          ]
            .filter(Boolean)
            .join(", ")
            .trim();
        }
        if (process.env.DEBUG_NEARBY_POINTS === "1") {
          debugLog("[nearby_points] location hint", {
            promptKey,
            locationHint,
            hotelAddress: cfg?.address,
            hotelCity: cfg?.city,
            hotelCountry: cfg?.country,
          });
        }
        const queryBase = [hints.city || cfg?.city, hints.country || cfg?.country]
          .filter(Boolean)
          .join(", ")
          .trim();
        const primaryLocation = queryBase || locationHint || userQuery;
        const primaryQueries = buildNearbyQueries(primaryLocation, langForNearby);
        let places: Array<{ name: string; description?: string; photoName?: string }> = [];
        let usedQuery = primaryQueries[0] || primaryLocation;
        // NOTE: Places solo se usa en enrich (admin), no en runtime; fallback apagado por defecto.
        const allowPlacesRuntime = process.env.ALLOW_PLACES_RUNTIME === "1";
        if (allowPlacesRuntime) {
          for (const q of primaryQueries) {
            usedQuery = q;
            places = await searchNearbyPlaces({
              queryText: q,
              locationText: primaryLocation,
              lang: langForNearby,
              count: 20,
            });
            if (places.length >= 3) break;
          }
          if (places.length < 3 && locationHint && locationHint !== primaryLocation) {
            const fallbackQueries = buildNearbyQueries(locationHint, langForNearby);
            for (const q of fallbackQueries) {
              usedQuery = q;
              places = await searchNearbyPlaces({
                queryText: q,
                locationText: locationHint,
                lang: langForNearby,
                count: 20,
              });
              if (places.length >= 3) break;
            }
          }
        }
        let pickedPlaces: Array<{ name: string; description?: string; photoName?: string }> = [];
        if (allowPlacesRuntime && places.length) {
          const locationTokens = buildLocationTokens(hints.city || cfg?.city, hints.country || cfg?.country);
          const locationFiltered = locationTokens.length
            ? places.filter((p) => placeMatchesLocation(p, locationTokens))
            : places;
          const candidatePlaces = locationFiltered.length >= 3 ? locationFiltered : places;
          const typeFiltered = candidatePlaces.filter((p) => isRelevantPoi(p));
          pickedPlaces = typeFiltered.length >= 3 ? typeFiltered : candidatePlaces;
          if (process.env.DEBUG_NEARBY_POINTS === "1") {
            debugLog("[nearby_points] places results", {
              promptKey,
              query: usedQuery,
              count: pickedPlaces.length,
            });
            debugLog("[nearby_points] places typeFilter", {
              promptKey,
              total: candidatePlaces.length,
              typeFiltered: typeFiltered.length,
              picked: pickedPlaces.length,
            });
          }
        }
        const region = (cfg as any)?.eventsRegion || "";
        const regionPois = region ? await searchAttractions({ region, limit: 12 }) : [];
        const fromPoi = toNearbyPointsFromPoi(regionPois, locationHint || userQuery).slice(0, 10);
        const fromConfig = toNearbyPointsFromConfig(cfg?.attractions, locationHint || userQuery).slice(0, 10);
        const merged = mergeNearbyPoints(fromPoi, fromConfig, 10);
        if (merged.length) {
          nearbyPoints = merged;
          retrievedInfo = buildNearbyInfoText(merged, langForNearby) + `\n\n${estimatedNote(langForNearby)}`;
        } else {
          const fromPlaces = allowPlacesRuntime
            ? toNearbyPointsFromPlaces(pickedPlaces, locationHint || userQuery).slice(0, 10)
            : [];
          if (fromPlaces.length) {
            nearbyPoints = fromPlaces;
            retrievedInfo = buildNearbyInfoText(fromPlaces, langForNearby);
          } else {
            const offline = offlineNearbyPoints(locationHint || userQuery, langForNearby).slice(0, 10);
            nearbyPoints = offline;
            retrievedInfo = buildNearbyInfoText(offline, langForNearby) + `\n\n${estimatedNote(langForNearby)}`;
          }
        }
      }
    }

    if (!retrievedInfo) {
      if (!isNearbyPrompt || process.env.DEBUG_NEARBY_POINTS === "1") {
        debugLog("⚠️ No se encontró información relevante en los documentos.");
      }
      const cfg = await getHotelConfig(state.hotelId ?? "hotel999");
      const cfgCity = String((cfg as any)?.city || "").trim();
      const cfgCountry = String((cfg as any)?.country || "").trim();
      const hints = extractLocationHints(userQuery);
      const city = cfgCity || hints.city || "";
      const country = cfgCountry || hints.country || "";
      const fallbackPrompt = defaultPrompt
        .replace("{{locationLine}}", (() => {
          const langRaw = normalizeLang(state.originalLang ?? state.retrievalLang ?? state.detectedLanguage);
          const langForFallback = langRaw === "en" ? "en" : langRaw === "pt" ? "pt" : "es";
          const locationText =
            [city, country].filter(Boolean).join(", ") ||
            (langForFallback === "en" ? "the area" : langForFallback === "pt" ? "a região" : "la zona");
          return langForFallback === "en"
            ? `Location: ${locationText}`
            : langForFallback === "pt"
              ? `Localização: ${locationText}`
              : `Ubicación: ${locationText}`;
        })())
        .replace("{{retrieved}}", "")
        .replace("{{query}}", userQuery);
      const response = await getLocalModel().invoke([
        { role: "system", content: fallbackPrompt },
        { role: "user", content: userQuery }
      ]);
      finalResponse = typeof response.content === "string" ? response.content.trim() : "Lo siento, no encontré información.";
      const langRaw = normalizeLang(state.originalLang ?? state.retrievalLang ?? state.detectedLanguage);
      const langForFallback = langRaw === "en" ? "en" : langRaw === "pt" ? "pt" : "es";
      finalResponse = normalizeBullets(finalResponse);
      finalResponse = ensureFinalQuestion(finalResponse, langForFallback);
      finalResponse = clampBullets(finalResponse, 4, 8);
    } else if (isNearbyPrompt) {
      // Para nearby_points, devolvemos formato determinista sin reescritura del modelo.
      finalResponse = stripUrls(retrievedInfo);
    } else {
      const promptTemplate = (promptKey && curatedPrompts[promptKey]) || defaultPrompt;
      // Preparar prompt final
      const finalPrompt = promptTemplate
        .replace("{{locationLine}}", "")
        .replace("{{retrieved}}", retrievedInfo)
        .replace("{{query}}", userQuery);

      // Invocar modelo local con prompt final
      const response = await getLocalModel().invoke([
        { role: "system", content: finalPrompt },
        { role: "user", content: userQuery },
      ]);
      finalResponse = typeof response.content === "string" ? response.content.trim() : "";
      const langRaw = normalizeLang(state.originalLang ?? state.retrievalLang ?? state.detectedLanguage);
      const langForFallback = langRaw === "en" ? "en" : langRaw === "pt" ? "pt" : "es";
      finalResponse = normalizeBullets(finalResponse);
      finalResponse = ensureFinalQuestion(finalResponse, langForFallback);
      finalResponse = clampBullets(finalResponse, 4, 8);

      // 🆕 Si es un doc "room_info_img", intentar construir payload rico básico
      if (promptKey === "room_info_img") {
        try {
          const items: Array<{ type?: string; icon?: string; highlights?: string[]; images?: string[] }> = [];
          const blocks = retrievedInfo.split(/\n\s*\n+/);
          const labelRe = /^\s*(Tipo|Type|Icono|Icon|Highlights?|Destacados?|Destaques?|Images?|Imágenes?|Imagens?)\s*:/i;
          for (const b of blocks) {
            const type = (b.match(/\b(Tipo|Type)\s*:\s*(.+)/i)?.[2] || "").trim();
            const icon = (b.match(/\b(Icono|Icon)\s*:\s*(.+)/i)?.[2] || "").trim();
            const hiRaw = (b.match(/\b(Highlights?|Destacados?|Destaques?)\s*:\s*(.+)/i)?.[2] || "").trim();
            const imgRaw = (b.match(/\b(Images?|Imágenes?|Imagens?)\s*:\s*(\[.*\]|.+)/i)?.[2] || "").trim();
            if (!type && !hiRaw && !imgRaw && !b.includes("Highlights") && !b.includes("Images")) continue;

            const lines = b.split("\n");
            const collectSection = (label: RegExp) => {
              const start = lines.findIndex((l) => label.test(l));
              if (start === -1) return [];
              const out: string[] = [];
              for (let i = start + 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                if (labelRe.test(line)) break;
                if (/^[-•]\s+/.test(line)) out.push(line.replace(/^[-•]\s+/, ""));
                else out.push(line);
              }
              return out;
            };

            const highlights = hiRaw
              ? hiRaw.split(/[•\-\u2022]|\s*;\s*|\s*\|\s*|\n/).map((s: string) => s.trim()).filter(Boolean).slice(0, 6)
              : collectSection(/\b(Highlights?|Destacados?|Destaques?)\s*:/i).slice(0, 6);

            let images: string[] | undefined;
            if (imgRaw) {
              try {
                if (imgRaw.startsWith("[")) images = JSON.parse(imgRaw);
                else images = imgRaw.split(/\s*,\s*|\s+|\n/).filter((u: string) => /^https?:\/\//i.test(u) || u.startsWith("/"));
              } catch { images = undefined; }
            } else {
              const imgLines = collectSection(/\b(Images?|Imágenes?|Imagens?)\s*:/i);
              images = imgLines
                .map((l) => l.replace(/!img\((.+)\)/i, "$1").trim())
                .filter((u) => /^https?:\/\//i.test(u) || u.startsWith("/"));
            }

            items.push({ type: type || undefined, icon: icon || undefined, highlights: highlights.length ? highlights : undefined, images: images?.length ? images : undefined });
          }
          if (items.length) rich = { type: "room-info-img", data: items };
        } catch { /* best-effort */ }
      }
    }
    if (!rich && isThingsToDoImgPrompt) {
      const cfg = await getHotelConfig(state.hotelId ?? "hotel999");
      const langRaw = normalizeLang(state.originalLang ?? state.retrievalLang ?? state.detectedLanguage);
      const langForPlaces = langRaw === "other" ? "es" : langRaw;
      let carousel = buildThingsToDoCarouselFromConfig((cfg as any)?.attractions, (cfg as any)?.city, 5);
      if (!carousel.length && process.env.ALLOW_PLACES_RUNTIME === "1") {
        const locationText = [String((cfg as any)?.city || "").trim(), String((cfg as any)?.country || "").trim()]
          .filter(Boolean)
          .join(", ")
          .trim();
        const queryText =
          langForPlaces === "en"
            ? `things to do in ${locationText || "the area"}`
            : langForPlaces === "pt"
              ? `atividades e atrações em ${locationText || "a região"}`
              : `actividades y atracciones en ${locationText || "la zona"}`;
        try {
          const places = await searchNearbyPlaces({
            queryText,
            locationText: locationText || undefined,
            lang: langForPlaces,
            count: 12,
          });
          carousel = buildNearbyCarouselFromPlaces(places, 5);
          const seenTitles = new Set<string>();
          carousel = carousel
            .map((item) => ({
              ...item,
              images: (item.images || []).filter((img) => {
                const url = String(img?.url || "").trim();
                return isHttpUrl(url) || url.startsWith("/api/places/photo?");
              }),
            }))
            .filter((item) => {
              const key = normalizeText(String(item?.title || ""));
              if (!key || seenTitles.has(key)) return false;
              if (!Array.isArray(item.images) || item.images.length < 1) return false;
              seenTitles.add(key);
              return true;
            })
            .slice(0, 5);
        } catch {
          // best effort: devolver solo texto
        }
      }
      if (carousel.length) {
        rich = { carousel };
      }
    }
    if (!rich && (promptKey === "nearby_points_img" || promptKey === "nearby_points")) {
      const cfg = await getHotelConfig(state.hotelId ?? "hotel999");
      const mode = (cfg as any)?.nearbyPointsMode;
      const allowRich = promptKey === "nearby_points_img" || mode === "always" || mode === "carousel" || mode === "auto";
      const carousel = buildNearbyCarouselFromConfig((cfg as any)?.attractions, 5);
      if (allowRich && carousel.length) {
        if (process.env.DEBUG_NEARBY_POINTS === "1") {
          debugLog("[nearby_points_img] carousel from config", {
            promptKey,
            count: carousel.length,
          });
        }
        rich = { carousel };
      }
    }
    if (isNearbyPrompt) {
      const responseToUser = await translateIfNeeded(finalResponse, state.retrievalLang, state.originalLang);
      return {
        ...state,
        messages: [...state.messages, new AIMessage(responseToUser || "Lo siento, no encontré información.")],
        category,
        promptKey,
        meta: {
          ...(state as any).meta,
          ...(debugRouting
            ? {
              debug: {
                ...((state as any)?.meta?.debug || {}),
                intentGroup: "nearby",
              },
            }
            : {}),
          ...(rich ? { rich } : {}),
        },
      };
    }
  }

  // Traducir SOLO si retrievalLang difiere del idioma original del usuario
  const responseToUser = await translateIfNeeded(finalResponse, state.retrievalLang, state.originalLang);

  const intentGroup = !retrievedInfo ? "fallback" : "other";
  return {
    ...state,
    messages: [...state.messages, new AIMessage(responseToUser || "Lo siento, no encontré información.")],
    category,
    promptKey,
    meta: {
      ...(state as any).meta,
      ...(debugRouting
        ? {
          debug: {
            ...((state as any)?.meta?.debug || {}),
            intentGroup,
          },
        }
        : {}),
      ...(rich ? { rich } : {}),
    },
  };
}
