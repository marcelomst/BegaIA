// /root/begasist/lib/retrieval/index.ts

import puppeteer from "puppeteer-extra";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { translationModel } from "../../app/lib/translation";
import { debugLog } from "../utils/debugLog";
import { ChatOpenAI } from "@langchain/openai";
import { validateClassification } from "./validateClassification";
import fs from "fs";
import { cosineSimilarity } from "../utils/similarity";
import type { ChunkResult, InsertableChunk, SearchFilters } from "../../types/chunk";
import pdfParse from "pdf-parse";
import dotenv from "dotenv";
import { getHotelAstraCollection } from "../astra/connection";
import { getHotelConfig } from "../config/hotelConfig.server";
import { franc } from "franc";
import { iso3To1 } from "@/lib/utils/lang";
import { saveOriginalTextChunksToAstra } from "../astra/hotelTextCollection";

dotenv.config();

const urls = ["https://www.hoteldemo.com/en/index.php"];
export function getCollectionName(hotelId: string) {
  return `${hotelId}_collection`;
}
const curationAssistant = new ChatOpenAI({
  modelName: "gpt-4",
  temperature: 0,
});

const classificationPrompt = `
Eres un experto en hospitalidad. Vas a clasificar fragmentos de texto provenientes de documentos de hoteles en una de las siguientes categorías:

- reservation
- billing
- support
- amenities
- retrieval_based

Además, si corresponde, asignarás una clave de prompt especializada (promptKey) como por ejemplo: room_info, cancellation_policy, breakfast_details, etc. Si no hay un promptKey aplicable, devuélvelo como null.

Devuelve **exclusivamente** un JSON válido con esta estructura (una lista con un objeto por fragmento):

[
  {
    "category": "reservation",
    "promptKey": "cancellation_policy"
  },
  ...
]

Ahora analiza los siguientes fragmentos:

{fragments}
`;

// Traducción robusta a cualquier idioma destino (usada abajo)
async function translateTextToLang(text: string, lang: string) {
  try {
    const translated = await translationModel(text, lang);
    if (typeof translated.content === "string") {
      return translated.content;
    }
    return JSON.stringify(translated.content);
  } catch (err) {
    debugLog("❌ Error en traducción:", err);
    return text; // fallback al texto original
  }
}

/**
 * Calcula la próxima versión ("v1", "v2", ...) según los documentos ya presentes
 * Ahora: busca la versión máxima en TODA la colección, no solo por originalName
 */
async function getNextVersionForCollection(collection: any, hotelId: string) {
  const docs = await collection.find({ hotelId }).toArray();
  let maxVersion = 0;
  for (const doc of docs) {
    const m = (doc.version || "").match(/^v(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxVersion) maxVersion = n;
    }
  }
  return `v${maxVersion + 1}`;
}

/**
 * 🛠️ FIX: Clasifica cada chunk antes de guardar y guarda el texto original dividido en chunks en hotel_text_collection.
 */
export async function loadDocumentFileForHotel({
  hotelId,
  filePath,
  originalName,
  uploader,
  mimeType,
  metadata = {},
}: {
  hotelId: string;
  filePath: string;
  originalName: string;
  uploader: string;
  mimeType?: string;
  metadata?: Record<string, any>;
}) {
  // 1. Leer y extraer texto (PDF o TXT)
  let text = "";
  if (mimeType?.includes("pdf") || filePath.endsWith(".pdf")) {
    const buffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(buffer);
    text = pdfData.text;
  } else if (mimeType?.includes("text") || filePath.endsWith(".txt")) {
    text = fs.readFileSync(filePath, "utf8");
  } else {
    throw new Error("Formato no soportado. Solo PDF/TXT por ahora.");
  }

  // 2. Detección y normalización de idioma (usa franc → iso3 → iso1)
  let translatedText = text;
  let detectedLang3 = "und";
  let detectedIso1 = "und";
  let targetLang = "es";
  try {
    const config = await getHotelConfig(hotelId);
    targetLang = config?.defaultLanguage || "es";
    detectedLang3 = franc(text); // ej: "spa"
    detectedIso1 = await iso3To1(detectedLang3); // ej: "es"

    debugLog(`[Vectorización] Idioma detectado (franc/iso3): ${detectedLang3}, iso1: ${detectedIso1}, destino: ${targetLang}`);
    // Si el idioma detectado es distinto al objetivo, traducir
    if (targetLang && detectedIso1 !== "und" && detectedIso1 !== targetLang) {
      debugLog("[Vectorización] Traduciendo texto al idioma destino…");
      translatedText = await translateTextToLang(text, targetLang);
    } else {
      debugLog("[Vectorización] No es necesario traducir.");
    }
  } catch (err) {
    debugLog("⚠️ No se pudo obtener idioma destino desde config o traducir:", err);
  }

  // 3. Guardar texto original en hotel_text_collection (en chunks de 8000 caracteres)
  const now = new Date().toISOString();
  const collection = getHotelAstraCollection<InsertableChunk>(hotelId);
  const versionTag = await getNextVersionForCollection(collection, hotelId);
  await saveOriginalTextChunksToAstra({
    hotelId,
    originalName,
    version: versionTag,
    uploader,
    author: metadata.author ?? null,
    uploadedAt: now,
    textContent: text, // el texto crudo antes de chunkear
  });

  // 4. Chunking
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1500, chunkOverlap: 200 });
  const chunks = await splitter.createDocuments([translatedText]);

  // 5. 🧠 Clasificación de chunks antes de guardar (el FIX aquí)
  const enrichedChunks = await classifyFragmentsWithCurationAssistant(chunks);

  // 6. Vectorización y guardado
  const embedder = new OpenAIEmbeddings();

  for (const [i, doc] of enrichedChunks.entries()) {
    const embedding = await embedder.embedQuery(doc.pageContent);
    const record = {
      hotelId,
      category: doc.metadata.category || metadata.category || "retrieval_based",
      promptKey: doc.metadata.promptKey ?? metadata.promptKey ?? null,
      version: versionTag,
      author: metadata.author ?? null,
      uploader,
      text: doc.pageContent,
      $vector: embedding,
      uploadedAt: now,
      doc_json: JSON.stringify({
        ...doc,
        ...metadata,
        chunkIndex: i,
        originalName,
        uploader,
        mimeType,
        uploadedAt: now,
        version: versionTag,
        detectedLang: detectedIso1,
        targetLang,
      }),
      originalName,
      detectedLang: detectedIso1,
      targetLang,
    };
    await collection.insertOne(record);
  }

  return { ok: true, count: enrichedChunks.length, version: versionTag };
}

// --- El resto de helpers y retrieval (sin cambios importantes) ---

async function classifyFragmentsWithCurationAssistant(documents: Document[]): Promise<Document[]> {
  const inputChunks = documents.map((doc) => doc.pageContent);
  const promptText = classificationPrompt.replace(
    "{fragments}",
    inputChunks.map((t, i) => `Fragmento ${i + 1}: """${t}"""`).join("\n\n")
  );
  fs.writeFileSync("prompt-clasificador.txt", promptText, "utf8");
  console.log("🧠 Prompt guardado en prompt-clasificador.txt");

  const response = await curationAssistant.invoke([{ role: "user", content: promptText }]);

  function extractTextContent(content: any): string {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content.map((c) => c?.text || "").join("\n");
    }
    return JSON.stringify(content);
  }

  let parsed: any[] = [];
  try {
    parsed = JSON.parse(extractTextContent(response.content) || "[]");
  } catch (e) {
    debugLog("⛔ Error al parsear JSON del clasificador:", e);
  }
  fs.writeFileSync("parsed-completo.json", JSON.stringify(parsed, null, 2));

  return documents.map((doc, i) => {
    const classification = validateClassification(parsed[i] || {});
    return new Document({
      pageContent: doc.pageContent,
      metadata: {
        ...doc.metadata,
        category: classification.category,
        promptKey: classification.promptKey,
      },
    });
  });
}

async function fetchPageWithPuppeteer(url: string): Promise<string | null> {
  debugLog("🌐 Cargando página con Puppeteer:", url);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 120000 });
    await page.waitForSelector("body", { timeout: 120000 });
    return await page.evaluate(() => document.body.innerText);
  } catch (error) {
    debugLog("❌ Error en Puppeteer:", error);
    return null;
  } finally {
    await browser.close();
  }
}

export async function translateText(text: string) {
  try {
    const lang = process.env.SYSTEM_NATIVE_LANGUAGE;
    if (!lang) throw new Error("SYSTEM_NATIVE_LANGUAGE is not defined in .env");
    const translated = await translationModel(text, lang);
    return typeof translated.content === "string"
      ? translated.content
      : JSON.stringify(translated.content);
  } catch (error) {
    debugLog("⛔ Error en traducción:", error);
    return text;
  }
}

export async function loadDocuments(
  hotelId: string,
  opts: { version?: string } = {}
) {
  debugLog(`📦 Cargando documentos para hotel ${hotelId}`);

  const version = opts.version ?? "v1";

  const docs = await Promise.all(
    urls.map(async (url) => {
      const html = await fetchPageWithPuppeteer(url);
      if (!html) return null;
      const translated = await translateText(html);
      return new Document<{ source: string; hotelId: string }>({
        pageContent: translated,
        metadata: { source: url, hotelId },
      });
    })
  );

  const validDocs = docs.filter((d): d is Document<{ source: string; hotelId: string }> => d !== null);

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1500, chunkOverlap: 200 });
  const chunks = await splitter.splitDocuments(validDocs);

  const enrichedChunks = await classifyFragmentsWithCurationAssistant(chunks);

  const embedder = new OpenAIEmbeddings();
  const collection = getHotelAstraCollection<InsertableChunk>(hotelId);

  for (const doc of enrichedChunks) {
    const embedding = await embedder.embedQuery(doc.pageContent);
    if (!doc.metadata.hotelId || !doc.metadata.category) {
      throw new Error("Faltan hotelId o category en el metadata del chunk.");
    }
    await collection.insertOne({
      hotelId,
      category: doc.metadata.category || "retrieval_based",
      promptKey: doc.metadata.promptKey ?? null,
      text: doc.pageContent,
      $vector: embedding,
      version,
      ...doc.metadata,
    });
  }

  debugLog(`✅ Insertados ${enrichedChunks.length} chunks en colección ${hotelId}_collection`);
}

async function getLatestVersionForHotel(collection: any, hotelId: string) {
  const docs = await collection.find({ hotelId }).toArray();
  const byVersion = new Map<string, { version: string, uploadedAt: string }>();
  for (const doc of docs) {
    if (
      !byVersion.has(doc.version) ||
      new Date(doc.uploadedAt) > new Date(byVersion.get(doc.version)!.uploadedAt)
    ) {
      byVersion.set(doc.version, { version: doc.version, uploadedAt: doc.uploadedAt });
    }
  }
  const grouped = Array.from(byVersion.values()).sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
  return grouped[0]?.version;
}

export async function searchFromAstra(
  query: string,
  hotelId: string = "hotel123",
  filters: SearchFilters = {}
) {
  if (!hotelId || hotelId === "hotel123") {
    console.warn("⚠️ [searchFromAstra] hotelId no proporcionado, usando fallback: 'hotel123'");
  }
  const embedder = new OpenAIEmbeddings();
  const queryVector = await embedder.embedQuery(query);

  const collection = getHotelAstraCollection<ChunkResult>(hotelId);

  // 👉 Nueva lógica de versión
  let version = filters.version;
  if (!version) {
    version = await getLatestVersionForHotel(collection, hotelId);
    debugLog("🔄 Usando versión más reciente:", version);
  }
  const baseFilter: Record<string, any> = { hotelId };
  if (version) baseFilter.version = version;

  // 🧠 Primer intento: por promptKey (si está)
  if (filters.promptKey) {
    const promptKeyFilter = {
      ...baseFilter,
      promptKey: filters.promptKey,
    };
    debugLog("🔍 Filtro por promptKey:", promptKeyFilter);

    const cursor = await collection.find(promptKeyFilter, {
      sort: { $vector: queryVector },
      limit: 5,
      includeSimilarity: true,
    });
    const results = await cursor.toArray();
    if (results.length > 0) {
      return results.map((r: any) => r.text);
    }
  }

  // 🌀 No hubo resultados → intentar por category si existe
  if (filters.category) {
    const categoryFilter = {
      ...baseFilter,
      category: filters.category,
    };
    debugLog("🔁 Fallback por category:", categoryFilter);

    const fallbackCursor = await collection.find(categoryFilter, {
      sort: { $vector: queryVector },
      limit: 5,
      includeSimilarity: true,
    });

    type WithSim<T> = {
      document: T;
      similarity: number;
    };

    type FoundDoc<T> = {
      document: T;
    };

    type ChunkResult = {
      _id: string;
      text: string;
      $vector: number[];
      $similarity?: number;
      [key: string]: any;
    };

    const rawFallbackResults = await fallbackCursor.toArray() as unknown as WithSim<FoundDoc<ChunkResult>>[];

    const fallbackResults: ChunkResult[] = rawFallbackResults
      .filter(r => r?.document?.document)
      .map(r => ({
        ...r.document.document,
        $similarity: r.similarity,
      }));

    debugLog("🔁 FallbackResults por category:", fallbackResults);

    for (const r of fallbackResults) {
      if (!Array.isArray(r.$vector)) {
        console.warn("⚠️ Chunk con vector inválido:", r);
      }
    }

    const SIMILARITY_THRESHOLD = 0.95;

    const relevantResults = fallbackResults
      .filter((r) => Array.isArray(r.$vector) && r.$vector.length === queryVector.length)
      .map((r) => ({
        ...r,
        semanticRelevance: cosineSimilarity(queryVector, r.$vector),
      }))
      .filter((r) => r.semanticRelevance > SIMILARITY_THRESHOLD)
      .sort((a, b) => b.semanticRelevance - a.semanticRelevance);

    if (relevantResults.length > 0) {
      debugLog("✅ Resultados relevantes por similitud semántica:", relevantResults);
      return relevantResults.map((r) => r.text);
    }

    console.warn("⚠️ Ningún resultado con buena similitud. Reintentando sin filtros...");
  }

  // 🔚 Sin promptKey ni category → buscar solo por hotelId y version
  debugLog("🔍 Búsqueda sin filtro adicional (hotelId + version):", baseFilter);
  const fallbackCursor = await collection.find(
    baseFilter,
    {
      sort: { $vector: queryVector },
      limit: 5,
      includeSimilarity: true,
    }
  );
  const fallbackResults = await fallbackCursor.toArray();

  return fallbackResults.map((r: any) => r.text);
}
