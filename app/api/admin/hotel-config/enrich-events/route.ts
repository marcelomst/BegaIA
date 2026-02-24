// Path: /root/begasist/app/api/admin/hotel-config/enrich-events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import { searchNearbyPlaces } from "@/lib/media/googlePlaces";
import { searchEvents } from "@/lib/poi/searchEvents";
import { debugLog } from "@/lib/utils/debugLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TouristEvent = {
  poiRefId?: string;
  name?: string;
  notes?: string;
  startsAt?: string;
  endsAt?: string;
  venue?: string;
  sourceUrl?: string;
  priority?: number;
  hidden?: boolean;
  images?: Array<{ url: string; alt?: string }>;
};

function isExpiredEvent(ev: TouristEvent, nowTs: number): boolean {
  const end = typeof ev.endsAt === "string" ? Date.parse(ev.endsAt) : NaN;
  return Number.isFinite(end) && end < nowTs;
}

function normalize(v: string | null | undefined) {
  return (v ?? "").trim().replace(/^"([\s\S]*)"$/, "$1").replace(/^'([\s\S]*)'$/, "$1");
}

function getRequestHotelId(req: NextRequest) {
  return normalize(req.headers.get("x-hotel-id"));
}

function normalizeLang(raw?: string | null): "es" | "en" | "pt" {
  const v = (raw || "").toLowerCase();
  if (v.startsWith("en")) return "en";
  if (v.startsWith("pt")) return "pt";
  return "es";
}

function shouldLog() {
  return process.env.DEBUG_ENRICH === "1";
}

async function generateNotes(args: { name: string; locationText?: string; lang: "es" | "en" | "pt" }) {
  try {
    const model = new ChatOpenAI({
      modelName: process.env.LLM_KB_MODEL || process.env.LLM_DEFAULT_MODEL || "gpt-4o-mini",
      temperature: 0.2,
    });
    const lines = [
      `Idioma: ${args.lang}.`,
      "Escribe una descripción corta (1 frase, máx 120 caracteres).",
      "No inventes distancias ni eventos extra. Enfocate en el evento.",
      `Evento: ${args.name}.`,
      args.locationText ? `Ubicación: ${args.locationText}.` : "",
      "Responde SOLO con la frase.",
    ].filter(Boolean);
    const prompt = lines.join("\n");
    const res = await model.invoke([{ role: "user", content: prompt }]);
    const text = typeof res.content === "string" ? res.content.trim() : String(res.content || "").trim();
    return text || "";
  } catch {
    return "";
  }
}

async function generateBaseEvents(args: { locationText: string; lang: "es" | "en" | "pt"; count: number }) {
  try {
    const model = new ChatOpenAI({
      modelName: process.env.LLM_KB_MODEL || process.env.LLM_DEFAULT_MODEL || "gpt-4o-mini",
      temperature: 0.2,
    });
    const prompt = [
      "Devuelve SOLO JSON válido (sin explicaciones).",
      `Idioma: ${args.lang}.`,
      `Genera ${args.count} eventos turísticos o culturales (no lugares fijos) cerca de "${args.locationText}".`,
      "Sugerí eventos plausibles y variados aunque no tengas datos exactos.",
      "Las fechas deben ser FUTURAS a partir de hoy y dentro de los próximos 90 días.",
      "Si no sabes la fecha exacta, usa una fecha aproximada dentro de las próximas semanas.",
      "Ejemplos: teatro, conciertos, ferias, fiestas nocturnas, competencias deportivas, festivales.",
      'Formato: [{"name":"...","notes":"...","startsAt":"YYYY-MM-DD","endsAt":"YYYY-MM-DD","venue":"...","sourceUrl":""}]',
    ].join("\n");
    const res = await model.invoke([{ role: "user", content: prompt }]);
    const raw = typeof res.content === "string" ? res.content : JSON.stringify(res.content);
    if (shouldLog()) {
      debugLog("[enrich-events] llm raw", { raw });
    }
    const parsed = (() => {
      try {
        const direct = JSON.parse(raw);
        return direct;
      } catch {
        const match = raw.match(/\[[\s\S]*\]/);
        if (!match) return null;
        try {
          return JSON.parse(match[0]);
        } catch {
          return null;
        }
      }
    })();
    if (!Array.isArray(parsed)) return [];
    const toISODate = (ts: number) => new Date(ts).toISOString().slice(0, 10);
    const nowTs = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const normalized = parsed
      .map((it: any) => ({
        name: String(it?.name || "").trim(),
        notes: String(it?.notes || "").trim() || undefined,
        startsAt: String(it?.startsAt || "").trim() || undefined,
        endsAt: String(it?.endsAt || "").trim() || undefined,
        venue: String(it?.venue || "").trim() || undefined,
        sourceUrl: String(it?.sourceUrl || "").trim() || undefined,
        images: Array.isArray(it?.images) ? it.images : undefined,
      }))
      .map((it: any, idx: number) => {
        const startMs = it.startsAt ? Date.parse(it.startsAt) : NaN;
        const endMs = it.endsAt ? Date.parse(it.endsAt) : NaN;
        const baseStart = nowTs + (7 + (idx % 7)) * dayMs;
        const nextStart = Number.isFinite(startMs) && startMs >= nowTs ? startMs : baseStart;
        const nextEnd = Number.isFinite(endMs) && endMs >= nextStart ? endMs : nextStart;
        if (Number.isFinite(startMs) || Number.isFinite(endMs)) {
          it.startsAt = toISODate(nextStart);
          it.endsAt = toISODate(nextEnd);
        }
        return it;
      })
      .filter((it: any) => it.name)
      .slice(0, args.count);
    return normalized;
  } catch {
    return [];
  }
}

async function buildImages(args: { name: string; locationText: string; lang: "es" | "en" | "pt"; maxImages: number }) {
  const places = await searchNearbyPlaces({
    queryText: args.name,
    locationText: args.locationText,
    lang: args.lang,
    count: Math.max(1, Math.min(args.maxImages, 5)),
  });
  // Nota: Esto NO persiste la imagen real, solo referencia el proxy interno.
  // TODO: Persistir URL absoluta o descargar y subir a Storage/caché común en enrich.
  const images = places
    .map((p) => {
      const photoName = p.photoName;
      if (!photoName) return null;
      const url = `/api/places/photo?name=${encodeURIComponent(photoName)}&maxWidth=900`;
      const alt = String(p.name || args.name || "Evento").trim() || "Evento";
      return { url, alt };
    })
    .filter(Boolean) as Array<{ url: string; alt?: string }>;
  return images.slice(0, args.maxImages);
}

export async function POST(req: NextRequest) {
  const adminKey = normalize(process.env.ADMIN_API_KEY);
  if (!adminKey) {
    return NextResponse.json({ error: "ADMIN_API_KEY missing" }, { status: 500 });
  }
  const hdrKey = normalize(req.headers.get("x-admin-key"));
  if (adminKey !== hdrKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const hotelId = normalize(body?.hotelId);
  const maxItems = Math.max(1, Math.min(Number(body?.maxItems) || 12, 24));
  const maxImagesPerItem = Math.max(1, Math.min(Number(body?.maxImagesPerItem) || 3, 6));
  const force = Boolean(body?.force);

  if (!hotelId) return NextResponse.json({ error: "hotelId requerido" }, { status: 400 });
  const requestHotelId = getRequestHotelId(req);
  if (!requestHotelId || requestHotelId !== hotelId) {
    return NextResponse.json({ error: "Forbidden (x-hotel-id)" }, { status: 403 });
  }
  if (hotelId === "system") {
    return NextResponse.json({ error: "Forbidden: system opera POI global" }, { status: 403 });
  }

  const cfg = await getHotelConfig(hotelId);
  if (!cfg) return NextResponse.json({ error: "Hotel no encontrado" }, { status: 404 });

  const rawEvents = (Array.isArray((cfg as any).touristEvents) ? (cfg as any).touristEvents : []) as TouristEvent[];
  const lang = normalizeLang(cfg.defaultLanguage);
  const locationText = [cfg.address, cfg.city, cfg.country].filter(Boolean).join(", ").trim();
  const regenerate = Boolean(body?.regenerate);
  const allowLlmFallback = Boolean(body?.allowLlmFallback);
  const cleanupExpired = body?.cleanupExpired !== false;
  const nowTs = Date.now();
  const cleanedEvents = cleanupExpired ? rawEvents.filter((ev) => !isExpiredEvent(ev, nowTs)) : rawEvents;
  let events: TouristEvent[] = [];
  let source: "poi" | "llm_fallback" | "local" = "local";
  let poiCount = 0;

  if (regenerate) {
    const now = new Date();
    const from = now.toISOString().slice(0, 10);
    const toDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const to = toDate.toISOString().slice(0, 10);
    const region = String((cfg as any)?.eventsRegion || "").trim() || undefined;
    const city = String(cfg?.city || "").trim() || undefined;
    const poiEvents = await searchEvents({
      from,
      to,
      city,
      region,
      limit: maxItems,
      tz: cfg?.timezone || "UTC",
    });
    poiCount = Array.isArray(poiEvents) ? poiEvents.length : 0;
    events = (poiEvents || []).map((ev) => ({
      poiRefId: String(ev._id || "").trim() || undefined,
      name: ev.name,
      notes: String(ev.summary || ev.description || "").trim() || undefined,
      startsAt: String(ev.startsAt || ev.startDate || "").slice(0, 10) || undefined,
      endsAt: String(ev.endsAt || ev.endDate || "").slice(0, 10) || undefined,
      venue: ev.location?.name || ev.location?.address || ev.location?.locality || undefined,
      sourceUrl: ev.sourceUrl || undefined,
      priority: undefined,
      hidden: false,
      images: [],
    }));
    source = "poi";
    if (!events.length && allowLlmFallback && locationText) {
      events = await generateBaseEvents({ locationText, lang, count: maxItems });
      source = "llm_fallback";
    }
  } else {
    events = cleanedEvents;
    source = "local";
  }

  if (shouldLog()) {
    debugLog("[enrich-events] processing sequentially to control costs/quota");
    debugLog("[enrich-events] inputs", { hotelId, total: events.length, locationText, regenerate, cleanupExpired, allowLlmFallback });
  }

  let enrichedImages = 0;
  let enrichedNotes = 0;
  let skippedImages = 0;

  const nextEvents: TouristEvent[] = [];
  for (let i = 0; i < events.length; i++) {
    const base = events[i] || {};
    if (i >= maxItems) {
      nextEvents.push(base);
      continue;
    }
    const name = String(base.name || "").trim();
    if (!name) {
      nextEvents.push(base);
      continue;
    }
    const next: TouristEvent = { ...base };
    const existingImages = Array.isArray(base.images)
      ? base.images.filter((img: { url?: string; alt?: string } | null | undefined) => Boolean(img?.url))
      : [];
    const hasImages = existingImages.length > 0;

    if (!force && hasImages) {
      skippedImages++;
    } else {
      if (!locationText) {
        next.images = [];
        skippedImages++;
      } else {
        const images = await buildImages({ name, locationText, lang, maxImages: maxImagesPerItem });
        next.images = images;
        if (images.length) enrichedImages++;
      }
    }

    const notes = String(base.notes || "").trim();
    if (!notes || notes.length < 20) {
      const generated = await generateNotes({ name, locationText: locationText || undefined, lang });
      if (generated) {
        next.notes = generated;
        enrichedNotes++;
      }
    }

    nextEvents.push(next);
  }

  if (shouldLog()) {
    debugLog("[enrich-events] stats", {
      total: events.length,
      enrichedImages,
      enrichedNotes,
      skippedImages,
    });
  }

  await updateHotelConfig(hotelId, { touristEvents: nextEvents });
  return NextResponse.json({
    ok: true,
    mode: regenerate ? "regenerate" : "enrich",
    source,
    poiCount,
    savedCount: nextEvents.length,
    count: nextEvents.length,
    stats: { enrichedImages, enrichedNotes, skippedImages },
  });
}
