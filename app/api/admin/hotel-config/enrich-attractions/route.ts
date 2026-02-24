// Path: /root/begasist/app/api/admin/hotel-config/enrich-attractions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import { searchNearbyPlaces } from "@/lib/media/googlePlaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Attraction = {
  name?: string;
  notes?: string;
  images?: Array<{ url: string; alt?: string }>;
};

function normalize(v: string | null | undefined) {
  return (v ?? "").trim().replace(/^"([\s\S]*)"$/, "$1").replace(/^'([\s\S]*)'$/, "$1");
}

function requireSystemHotel(req: NextRequest) {
  const hdr = normalize(req.headers.get("x-hotel-id"));
  return hdr === "system";
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
      "No inventes distancias ni eventos. Enfocate en el lugar.",
      `Lugar: ${args.name}.`,
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
      const alt = String(p.name || args.name || "Atracción").trim() || "Atracción";
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
  if (!requireSystemHotel(req)) {
    return NextResponse.json({ error: "Forbidden (x-hotel-id)" }, { status: 403 });
  }

  const body = await req.json();
  const hotelId = normalize(body?.hotelId);
  const maxItems = Math.max(1, Math.min(Number(body?.maxItems) || 12, 24));
  const maxImagesPerItem = Math.max(1, Math.min(Number(body?.maxImagesPerItem) || 3, 6));
  const force = Boolean(body?.force);

  if (!hotelId) return NextResponse.json({ error: "hotelId requerido" }, { status: 400 });

  const cfg = await getHotelConfig(hotelId);
  if (!cfg) return NextResponse.json({ error: "Hotel no encontrado" }, { status: 404 });

  const attractions = (Array.isArray(cfg.attractions) ? cfg.attractions : []) as Attraction[];
  const lang = normalizeLang(cfg.defaultLanguage);
  const locationText = [cfg.address, cfg.city, cfg.country].filter(Boolean).join(", ").trim();
  if (shouldLog()) {
    console.log("[enrich-attractions] processing sequentially to control costs/quota");
  }

  let enrichedImages = 0;
  let enrichedNotes = 0;
  let skippedImages = 0;

  const nextAttractions: Attraction[] = [];
  for (let i = 0; i < attractions.length; i++) {
    const base = attractions[i] || {};
    if (i >= maxItems) {
      nextAttractions.push(base);
      continue;
    }
    const name = String(base.name || "").trim();
    if (!name) {
      nextAttractions.push(base);
      continue;
    }
    const next: Attraction = { ...base };
    const existingImages = Array.isArray(base.images) ? base.images.filter((img) => img?.url) : [];
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

    nextAttractions.push(next);
  }

  if (shouldLog()) {
    console.log("[enrich-attractions] stats", {
      total: attractions.length,
      enrichedImages,
      enrichedNotes,
      skippedImages,
    });
  }

  await updateHotelConfig(hotelId, { attractions: nextAttractions });
  return NextResponse.json({
    ok: true,
    count: nextAttractions.length,
    stats: { enrichedImages, enrichedNotes, skippedImages },
  });
}
