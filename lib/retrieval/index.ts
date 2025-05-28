// /root/begasist/lib/retrieval/index.ts

import { cache } from "react";
import puppeteer from "puppeteer-extra";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { translationModel } from "../../app/lib/translation";
import { debugLog } from "../utils/debugLog";
import { DataAPIClient } from "@datastax/astra-db-ts";
import { ChatOpenAI } from "@langchain/openai";
import { validateClassification } from "./validateClassification";
import fs from "fs";
import { cosineSimilarity } from "../utils/similarity";
import type { ChunkResult, InsertableChunk, SearchFilters } from "../../types/chunk";
import type { WithSim, FoundDoc } from "@datastax/astra-db-ts";
import path from "path";
import pdfParse from "pdf-parse";
import dotenv from "dotenv";
dotenv.config();

const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE!;
const ASTRA_DB_URL = process.env.ASTRA_DB_URL!;
const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN!);
const db = client.db(process.env.ASTRA_DB_URL!, { keyspace: process.env.ASTRA_DB_KEYSPACE! });

const urls = ["https://www.hoteldemo.com/en/index.php"];

export const getCollectionName = (hotelId: string) => `${hotelId}_collection`;

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

export async function loadDocumentFileForHotel({
  hotelId,
  filePath,
  originalName,
  uploader,
  mimeType,
  metadata = {},
  version = "v1",
}: {
  hotelId: string;
  filePath: string;
  originalName: string;
  uploader: string;
  mimeType?: string;
  metadata?: Record<string, any>;
  version?: string | number | Date;
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

  // 2. Chunking
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1500, chunkOverlap: 200 });
  const chunks = await splitter.createDocuments([text]);

  // 3. Vectorización y guardado
  const embedder = new OpenAIEmbeddings();
  
  const collectionName = `${hotelId}_collection`;
  const collection = await db.collection<InsertableChunk>(collectionName);

  const now = new Date().toISOString();
  const versionTag =
    version ||
    metadata.version ||
    now.slice(0, 10) + "-" + now.slice(11, 19).replace(/:/g, ""); // "2025-05-23-102045"

  for (const [i, doc] of chunks.entries()) {
    const embedding = await embedder.embedQuery(doc.pageContent);

    // Estructura recomendada para AstraDB
    const record = {
      // --- Clave primaria si la coleccion lo requiere ---
      // key: uuidv4(), // opcional si Astra lo genera, usar si no
      
      hotelId,
      category: doc.metadata.category || metadata.category || "retrieval_based",
      promptKey: doc.metadata.promptKey ?? metadata.promptKey ?? null,
      version: versionTag,
      author: metadata.author ?? null,            // soportado si lo querés
      uploader,
      text: doc.pageContent,
      query_vector_value: embedding,              // embbeding OpenAI (1536 floats)
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
      }), // guarda TODO el chunk + metadata en JSON por trazabilidad
      originalName,
    };

    await collection.insertOne(record);
  }

  return { ok: true, count: chunks.length, version: versionTag };
}


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

  const version = opts.version ?? "v1"; // 👈 default "v1"

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

  // 🧩 Primero fragmentamos
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1500, chunkOverlap: 200 });
  const chunks = await splitter.splitDocuments(validDocs);

  // 🧠 Luego clasificamos
  const enrichedChunks = await classifyFragmentsWithCurationAssistant(chunks);

  const embedder = new OpenAIEmbeddings();
  const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
  const db = client.db(ASTRA_DB_URL, { keyspace: ASTRA_DB_KEYSPACE });
  const collectionName = getCollectionName(hotelId);
  const collection = await db.collection<InsertableChunk>(collectionName);

  for (const doc of enrichedChunks) {
    const embedding = await embedder.embedQuery(doc.pageContent);
    // Asegura que los campos hotelId y category estén en doc.metadata
    if (!doc.metadata.hotelId || !doc.metadata.category) {
      throw new Error("Faltan hotelId o category en el metadata del chunk.");
    }

    await collection.insertOne({
      hotelId,
      category: doc.metadata.category || "retrieval_based",
      promptKey: doc.metadata.promptKey ?? null,
      text: doc.pageContent,
      $vector: embedding,
      version,  // 👈 versión del documento
      ...doc.metadata,
    });
  }

  debugLog(`✅ Insertados ${enrichedChunks.length} chunks en colección ${collectionName}`);
}

/**
 * Devuelve el valor de versión más reciente para los chunks de un hotel.
 * Si no hay ninguna, devuelve undefined.
 */
async function getLatestVersionForHotel(collection: any, hotelId: string) {
  // Astra Data API: NO aggregate → filtramos y agrupamos en JS
  const docs = await collection.find({ hotelId }).toArray();

  // Group by version and pick max uploadedAt
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

  const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN!);
  const db = client.db(process.env.ASTRA_DB_URL!, { keyspace: process.env.ASTRA_DB_KEYSPACE! });
  const collectionName = `${hotelId}_collection`;
  const collection = await db.collection<ChunkResult>(collectionName);

  // 👉 Nueva lógica de versión
  let version = filters.version;
  if (!version) {
    // Si no pasan versión, se usa la más reciente (o undefined si no hay nada)
    version = await getLatestVersionForHotel(collection, hotelId);
    debugLog("🔄 Usando versión más reciente:", version);
  }
  // Arma el filtro base con hotelId y version (si existe alguna)
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
  const filterWithoutVersion = { ...baseFilter };
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
