// Path: /root/begasist/app/api/hotels/enrich-attractions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";

const DEFAULT_COUNT = 8;

function normalizeLang(raw?: string | null): "es" | "en" | "pt" {
  const v = (raw || "").toLowerCase();
  if (v.startsWith("en")) return "en";
  if (v.startsWith("pt")) return "pt";
  return "es";
}

function offlineFixedAttractions(locationText: string, lang: "es" | "en" | "pt") {
  const loc = (locationText || "").toLowerCase();
  const isPuntaDelEste = /\b(punta del este|playa mansa|uruguay|punta ballena)\b/i.test(loc);
  if (isPuntaDelEste) {
    return [
      { name: "Playa Mansa", notes: lang === "en" ? "Calm beach ideal for families." : lang === "pt" ? "Praia calma, ideal para famílias." : "Playa tranquila, ideal para familias." },
      { name: "Playa Brava", notes: lang === "en" ? "Open ocean beach with stronger waves." : lang === "pt" ? "Praia do mar aberto com ondas mais fortes." : "Playa oceánica con olas más fuertes." },
      { name: "Monumento Los Dedos", notes: lang === "en" ? "Iconic hand sculpture on Playa Brava." : lang === "pt" ? "Escultura icônica na Playa Brava." : "Escultura icónica en Playa Brava." },
      { name: "Puerto de Punta del Este", notes: lang === "en" ? "Harbor with yachts, cafes, and sea lions." : lang === "pt" ? "Porto com iates, cafés e leões-marinhos." : "Puerto con yates, cafés y lobos marinos." },
      { name: "Avenida Gorlero", notes: lang === "en" ? "Main avenue for shops and restaurants." : lang === "pt" ? "Avenida principal de lojas e restaurantes." : "Avenida principal de tiendas y restaurantes." },
      { name: "Isla Gorriti", notes: lang === "en" ? "Island with beaches and trails." : lang === "pt" ? "Ilha com praias e trilhas." : "Isla con playas y senderos." },
      { name: "Faro de Punta del Este", notes: lang === "en" ? "Historic lighthouse with coastal views." : lang === "pt" ? "Farol histórico com vista costeira." : "Faro histórico con vistas costeras." },
      { name: "Casapueblo (Punta Ballena)", notes: lang === "en" ? "Iconic cliffside museum and gallery." : lang === "pt" ? "Museu e galeria icônica na falésia." : "Museo y galería icónica sobre el acantilado." },
    ];
  }
  const generic = [
    lang === "en" ? "Historic center / main square" : lang === "pt" ? "Centro histórico / praça principal" : "Centro histórico / plaza principal",
    lang === "en" ? "Seafront / beach" : lang === "pt" ? "Orla / praia" : "Costanera / playa",
    lang === "en" ? "Scenic viewpoint" : lang === "pt" ? "Mirante" : "Mirador",
    lang === "en" ? "Harbor / marina" : lang === "pt" ? "Porto / marina" : "Puerto / marina",
    lang === "en" ? "Local market / fair" : lang === "pt" ? "Mercado / feira" : "Mercado / feria",
    lang === "en" ? "Local museum" : lang === "pt" ? "Museu local" : "Museo local",
    lang === "en" ? "Park" : lang === "pt" ? "Parque" : "Parque",
    lang === "en" ? "Food district" : lang === "pt" ? "Bairro gastronômico" : "Barrio gastronómico",
  ];
  return generic.map((name) => ({ name, notes: lang === "en" ? "Popular spot near your location." : lang === "pt" ? "Ponto popular perto da sua localização." : "Punto popular cerca de tu ubicación." }));
}

function distanceRangeLabel(idx: number, lang: "es" | "en" | "pt") {
  const ranges = ["0.5–1 km", "1–3 km", "3–6 km", "6–10 km"];
  const label = ranges[idx % ranges.length];
  if (lang === "en") return `Estimated distance: ${label}.`;
  if (lang === "pt") return `Distância estimada: ${label}.`;
  return `Distancia estimada: ${label}.`;
}

function appendEstimatedDistanceIfMissing(
  items: Array<{ name?: string; notes?: string; distanceKm?: number; driveTime?: string }>,
  lang: "es" | "en" | "pt"
) {
  return items.map((it, idx) => {
    if (typeof it.distanceKm === "number" || it.driveTime) return it;
    const suffix = distanceRangeLabel(idx, lang);
    const notes = it.notes ? `${it.notes} ${suffix}` : suffix;
    return { ...it, notes };
  });
}

async function generateFixedAttractions(args: {
  hotelName?: string;
  locationText: string;
  lang: "es" | "en" | "pt";
  count: number;
}) {
  try {
    const model = new ChatOpenAI({
      modelName: process.env.LLM_KB_MODEL || process.env.LLM_DEFAULT_MODEL || "gpt-4o-mini",
      temperature: 0.2,
    });
    const prompt = [
      "Devuelve SOLO JSON válido (sin explicaciones).",
      `Idioma: ${args.lang}.`,
      `Objetivo: listar ${args.count} puntos de interés FIJOS (lugares permanentes) cerca de "${args.locationText}".`,
      "No incluir eventos, espectáculos, partidos, ni fechas.",
      'Formato: [{"name":"...","notes":"...","distanceKm":0.0,"driveTime":"10 min"}]',
    ].join("\n");
    const res = await model.invoke([{ role: "user", content: prompt }]);
    const raw = typeof res.content === "string" ? res.content : JSON.stringify(res.content);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("JSON inválido");
    const items = parsed
      .map((it: any) => ({
        name: String(it?.name || "").trim(),
        notes: String(it?.notes || "").trim(),
        distanceKm: typeof it?.distanceKm === "number" ? it.distanceKm : undefined,
        driveTime: String(it?.driveTime || "").trim() || undefined,
      }))
      .filter((it: any) => it.name);
    if (items.length) return appendEstimatedDistanceIfMissing(items.slice(0, args.count), args.lang);
  } catch {
    // fallback a lista offline
  }
  return appendEstimatedDistanceIfMissing(
    offlineFixedAttractions(args.locationText, args.lang)
      .map((it: any) => ({ ...it, distanceKm: undefined, driveTime: undefined }))
      .slice(0, args.count),
    args.lang
  );
}

export async function POST(req: NextRequest) {
  const { hotelId, count } = await req.json();
  if (!hotelId) return NextResponse.json({ error: "Falta hotelId" }, { status: 400 });

  const cfg = await getHotelConfig(hotelId);
  if (!cfg) return NextResponse.json({ error: "Hotel no encontrado" }, { status: 404 });

  const lang = normalizeLang(cfg.defaultLanguage);
  const locationText = [cfg.address, cfg.city, cfg.country].filter(Boolean).join(", ");
  const max = Math.max(5, Math.min(Number(count) || DEFAULT_COUNT, 10));
  const attractions = await generateFixedAttractions({
    hotelName: cfg.hotelName,
    locationText,
    lang,
    count: max,
  });

  await updateHotelConfig(hotelId, { attractions });
  return NextResponse.json({ ok: true, count: attractions.length, attractions });
}
