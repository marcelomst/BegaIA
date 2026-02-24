// Path: /root/begasist/app/api/hotels/enrich-arrivals-transport/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";

type Airport = { code?: string; name?: string; distanceKm?: number; driveTime?: string };
type Transport = { hasPrivateTransfer?: boolean; transferNotes?: string; taxiNotes?: string; busNotes?: string };

function normalizeLang(raw?: string | null): "es" | "en" | "pt" {
  const v = (raw || "").toLowerCase();
  if (v.startsWith("en")) return "en";
  if (v.startsWith("pt")) return "pt";
  return "es";
}

function buildFallback(locationText: string, lang: "es" | "en" | "pt"): { airports: Airport[]; transport: Transport } {
  const loc = (locationText || "").toLowerCase();
  const isPuntaDelEste = /\b(punta del este|maldonado|uruguay)\b/i.test(loc);
  if (isPuntaDelEste) {
    return {
      airports: [
        { code: "PDP", name: "Aeropuerto Internacional de Punta del Este (Laguna del Sauce)", distanceKm: 20, driveTime: "25 min" },
        { code: "MVD", name: "Aeropuerto Internacional de Carrasco", distanceKm: 120, driveTime: "1 h 45 min" },
      ],
      transport: {
        hasPrivateTransfer: true,
        transferNotes:
          lang === "en"
            ? "Private transfer available upon request with prior notice."
            : lang === "pt"
              ? "Transfer privado disponível sob solicitação com aviso prévio."
              : "Transfer privado disponible bajo solicitud con aviso previo.",
        taxiNotes:
          lang === "en"
            ? "Taxis and ride-hailing services are available 24/7."
            : lang === "pt"
              ? "Táxis e apps de mobilidade disponíveis 24h."
              : "Taxis y apps de movilidad disponibles las 24 h.",
        busNotes:
          lang === "en"
            ? "Intercity buses connect the terminal with downtown and coastal areas."
            : lang === "pt"
              ? "Ônibus interdepartamentais conectam o terminal ao centro e à costa."
              : "Ómnibus interdepartamentales conectan la terminal con el centro y la costa.",
      },
    };
  }
  return {
    airports: [],
    transport: {
      hasPrivateTransfer: false,
      transferNotes:
        lang === "en"
          ? "Transfer service may be available on request."
          : lang === "pt"
            ? "Serviço de transfer pode estar disponível sob solicitação."
            : "El servicio de transfer puede estar disponible bajo solicitud.",
      taxiNotes:
        lang === "en"
          ? "Taxi and app transport options are generally available."
          : lang === "pt"
            ? "Táxi e apps de transporte geralmente disponíveis."
            : "Taxi y apps de transporte generalmente disponibles.",
      busNotes:
        lang === "en"
          ? "Please check local bus schedules before traveling."
          : lang === "pt"
            ? "Consulte os horários de ônibus locais antes de viajar."
            : "Consultar horarios locales de ómnibus antes de viajar.",
    },
  };
}

async function generateArrivalsTransport(args: {
  lang: "es" | "en" | "pt";
  hotelName?: string;
  locationText: string;
}): Promise<{ airports: Airport[]; transport: Transport }> {
  try {
    const model = new ChatOpenAI({
      modelName: process.env.LLM_KB_MODEL || process.env.LLM_DEFAULT_MODEL || "gpt-4o-mini",
      temperature: 0.2,
    });
    const prompt = [
      "Devuelve SOLO JSON válido (sin explicaciones).",
      `Idioma: ${args.lang}.`,
      `Hotel: ${args.hotelName || "Hotel"}.`,
      `Ubicación del hotel: ${args.locationText}.`,
      "Genera información de llegada para KB de hotel.",
      'Formato exacto: {"airports":[{"code":"IATA","name":"...","distanceKm":12.3,"driveTime":"25 min"}],"transport":{"hasPrivateTransfer":true,"transferNotes":"...","taxiNotes":"...","busNotes":"..."}}',
      "Reglas: 1) máximo 3 aeropuertos. 2) distanceKm numérico. 3) no inventar precisión extrema. 4) si no estás seguro, usa texto prudente.",
    ].join("\n");
    const res = await model.invoke([{ role: "user", content: prompt }]);
    const raw = typeof res.content === "string" ? res.content : JSON.stringify(res.content);
    const parsed = JSON.parse(raw);
    const airports = Array.isArray(parsed?.airports)
      ? parsed.airports
          .map((a: any) => ({
            code: String(a?.code || "").trim() || undefined,
            name: String(a?.name || "").trim() || undefined,
            distanceKm: Number.isFinite(Number(a?.distanceKm)) ? Number(a.distanceKm) : undefined,
            driveTime: String(a?.driveTime || "").trim() || undefined,
          }))
          .filter((a: Airport) => a.name)
          .slice(0, 3)
      : [];
    const transport: Transport = {
      hasPrivateTransfer: Boolean(parsed?.transport?.hasPrivateTransfer),
      transferNotes: String(parsed?.transport?.transferNotes || "").trim() || undefined,
      taxiNotes: String(parsed?.transport?.taxiNotes || "").trim() || undefined,
      busNotes: String(parsed?.transport?.busNotes || "").trim() || undefined,
    };
    if (airports.length || transport.transferNotes || transport.taxiNotes || transport.busNotes) {
      return { airports, transport };
    }
  } catch {
    // fallback below
  }
  return buildFallback(args.locationText, args.lang);
}

export async function POST(req: NextRequest) {
  const { hotelId } = await req.json();
  if (!hotelId) return NextResponse.json({ error: "Falta hotelId" }, { status: 400 });

  const cfg = await getHotelConfig(hotelId);
  if (!cfg) return NextResponse.json({ error: "Hotel no encontrado" }, { status: 404 });

  const lang = normalizeLang(cfg.defaultLanguage);
  const locationText = [cfg.address, cfg.city, cfg.country].filter(Boolean).join(", ");
  const generated = await generateArrivalsTransport({
    lang,
    hotelName: cfg.hotelName,
    locationText,
  });

  await updateHotelConfig(hotelId, {
    airports: generated.airports,
    transport: generated.transport,
  });

  return NextResponse.json({
    ok: true,
    airports: generated.airports,
    transport: generated.transport,
    count: generated.airports.length,
  });
}

