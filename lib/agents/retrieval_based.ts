// Path: /root/begasist/lib/agents/retrieval_based.ts

import { ChatOpenAI } from "@langchain/openai";
import { GraphState } from "./index";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { defaultPrompt, curatedPrompts } from "../prompts";
import { debugLog } from "../utils/debugLog";
import { searchFromAstra } from "../retrieval";
import { getHotelNativeLanguage } from "../config/hotelLanguage";
import { translateIfNeeded } from "../i18n/translateIfNeeded";
import type { RichPayload } from "@/types/richPayload";
import type { CarouselItem } from "@/types/richResponse";
import { getImageSearchProvider } from "@/lib/media/imageSearch";
import { getWebSearchProvider } from "@/lib/media/webSearch";

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

function toNearbyPointsFromWeb(
  results: Array<{ title: string; snippet?: string }>,
  locationHint: string
): NearbyPoint[] {
  const seen = new Set<string>();
  const points: NearbyPoint[] = [];
  for (const r of results) {
    const name = cleanWebTitle(r.title);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    points.push({
      name,
      description: r.snippet || undefined,
      searchQuery: [name, locationHint].filter(Boolean).join(" ").trim() || undefined,
    });
  }
  return points;
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
  if (lang === "en") return `points of interest near ${base}`;
  if (lang === "pt") return `pontos de interesse perto de ${base}`;
  return `puntos de interes cerca de ${base}`;
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

// Función principal de retrieval determinista
export async function retrievalBased(state: any): Promise<any> {
  let userQuery = state.normalizedMessage;
  if (!userQuery) {
    userQuery = await getLastHumanText(state.messages as BaseMessage[]);
  }
  let promptKey = state.promptKey;
  let category = state.category;
  let retrievedInfo: string = "";
  let finalResponse: string = "";
  let rich: RichPayload | undefined = undefined;

  // --- Algoritmo determinista: VistaTotal ---
  const { getHotelAstraCollection } = await import("../astra/connection");
  const collection = getHotelAstraCollection(state.hotelId ?? "hotel999");
  const allDocs = await collection.find({ hotelId: state.hotelId ?? "hotel999" }).toArray();
  // Agrupar por category, promptKey, targetLang
  const groups: Record<string, any[]> = {};
  for (const doc of allDocs) {
    const key = `${doc.category ?? ''}|${doc.promptKey ?? ''}|${doc.targetLang ?? ''}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(doc);
  }
  // Para cada grupo, tomar el chunk con la versión más alta
  const latestIds = Object.values(groups).map((group: any[]) => {
    return group.reduce((max, curr) => {
      if (curr.version && max.version) {
        return curr.version > max.version ? curr : max;
      }
      return curr;
    }, group[0])._id;
  });
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
      const provider = getWebSearchProvider();
      if (process.env.DEBUG_NEARBY_POINTS === "1") {
        debugLog("[nearby_points] web provider", {
          promptKey,
          provider: provider.constructor?.name || "unknown",
        });
      }
      const locationHint = [
        extractLocationHints(retrievedInfo).city,
        extractLocationHints(retrievedInfo).country,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
      const query = buildNearbyQuery(locationHint || userQuery, langForNearby);
      const webResults = await provider.searchWeb(query, { count: 8 });
      if (process.env.DEBUG_NEARBY_POINTS === "1") {
        debugLog("[nearby_points] web results", {
          promptKey,
          query,
          count: webResults.length,
        });
      }
      const fromWeb = toNearbyPointsFromWeb(webResults, locationHint || userQuery).slice(0, 10);
      if (fromWeb.length) {
        nearbyPoints = fromWeb;
        retrievedInfo = buildNearbyInfoText(fromWeb, langForNearby);
      } else {
        const offline = offlineNearbyPoints(locationHint || userQuery, langForNearby).slice(0, 10);
        nearbyPoints = offline;
        retrievedInfo = buildNearbyInfoText(offline, langForNearby);
      }
    }
  }

  if (!retrievedInfo) {
    if (!isNearbyPrompt || process.env.DEBUG_NEARBY_POINTS === "1") {
      debugLog("⚠️ No se encontró información relevante en los documentos.");
    }
    const response = await getLocalModel().invoke([
      { role: "user", content: userQuery }
    ]);
    finalResponse = typeof response.content === "string" ? response.content.trim() : "Lo siento, no encontré información.";
  } else if (isNearbyPrompt) {
    // Para nearby_points, devolvemos formato determinista sin reescritura del modelo.
    finalResponse = stripUrls(retrievedInfo);
  } else {
    const promptTemplate = (promptKey && curatedPrompts[promptKey]) || defaultPrompt;
    // Preparar prompt final
    const finalPrompt = promptTemplate
      .replace("{{retrieved}}", retrievedInfo)
      .replace("{{query}}", userQuery);

    // Invocar modelo local con prompt final
    const response = await getLocalModel().invoke([
      { role: "system", content: finalPrompt },
      { role: "user", content: userQuery },
    ]);
    finalResponse = typeof response.content === "string" ? response.content.trim() : "";

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
              else images = imgRaw.split(/\s*,\s*|\s+|\n/).filter((u: string) => /https?:\/+/i.test(u));
            } catch { images = undefined; }
          } else {
            const imgLines = collectSection(/\b(Images?|Imágenes?|Imagens?)\s*:/i);
            images = imgLines
              .map((l) => l.replace(/!img\((.+)\)/i, "$1").trim())
              .filter((u) => /https?:\/+/i.test(u));
          }

          items.push({ type: type || undefined, icon: icon || undefined, highlights: highlights.length ? highlights : undefined, images: images?.length ? images : undefined });
        }
        if (items.length) rich = { type: "room-info-img", data: items };
      } catch { /* best-effort */ }
    }
  }
  if (promptKey === "nearby_points_img" && !rich) {
    const provider = getImageSearchProvider();
    const location = extractLocationHints(retrievedInfo);
    const points = (nearbyPoints.length ? nearbyPoints : parseNearbyPoints(retrievedInfo)).slice(0, 5);
    if (process.env.DEBUG_NEARBY_POINTS === "1") {
      debugLog("[nearby_points_img] image provider", {
        promptKey,
        provider: provider.constructor?.name || "unknown",
        points: points.length,
      });
    }
    const withImages = await mapWithLimit(points, 2, async (p): Promise<CarouselItem | null> => {
      const query = p.searchQuery
        ? p.searchQuery
        : [p.name, location.city, location.country].filter(Boolean).join(" ");
      if (!query) return null;
      const images = await provider.searchImages(query, { count: 4 });
      if (process.env.DEBUG_NEARBY_POINTS === "1") {
        debugLog("[nearby_points_img] images", { promptKey, query, count: images.length });
      }
      if (!images.length) return null;
      return {
        title: p.name,
        subtitle: p.description,
        images: images.slice(0, 4).map((img) => ({ url: img.url, alt: img.alt })),
      };
    });
    const carousel = withImages.filter(Boolean) as CarouselItem[];
    rich = { carousel };
  }

  // Traducir SOLO si retrievalLang difiere del idioma original del usuario
  const responseToUser = await translateIfNeeded(finalResponse, state.retrievalLang, state.originalLang);

  return {
    ...state,
    messages: [...state.messages, new AIMessage(responseToUser || "Lo siento, no encontré información.")],
    category,
    promptKey,
    meta: {
      ...(state as any).meta,
      ...(rich ? { rich } : {}),
    },
  };
}
