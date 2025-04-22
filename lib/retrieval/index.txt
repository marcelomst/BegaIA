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
import type { ChunkResult, InsertableChunk } from "../../types/chunk.ts"; // o el path relativo según tu setup

 
import dotenv from "dotenv";
dotenv.config();

const urls = ["https://www.hoteldemo.com/en/index.php"];
const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE!;
const ASTRA_DB_URL = process.env.ASTRA_DB_URL!;

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

export async function loadDocuments(hotelId: string) {
  debugLog(`📦 Cargando documentos para hotel ${hotelId}`);

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

  const collection = await db.collection<InsertableChunk >(collectionName);


  for (const doc of enrichedChunks) {
    const embedding = await embedder.embedQuery(doc.pageContent);
    const { hotelId, category, promptKey } = doc.metadata;
  
    if (!hotelId || !category) {
      throw new Error("Faltan hotelId o category en el metadata del chunk.");
    }
  
    await collection.insertOne({
      hotelId,
      category,
      promptKey: promptKey ?? null, // opcional, aseguramos que sea null o string
      text: doc.pageContent,
      $vector: embedding,
    });
  }
  

  debugLog(`✅ Insertados ${enrichedChunks.length} chunks en colección ${collectionName}`);
}

type SearchFilters = {
  category?: string;
  promptKey?: string;
};

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

  const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
  const db = client.db(ASTRA_DB_URL, { keyspace: ASTRA_DB_KEYSPACE });
  const collectionName = getCollectionName(hotelId);
  const collection = await db.collection<ChunkResult>(collectionName);

  debugLog("Collection name:", collection);
  // 🧠 Primer intento: por promptKey (si está)
  if (filters.promptKey) {
    const promptKeyFilter = {
      hotelId,
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
      hotelId,
      category: filters.category,
    };
    debugLog("🔁 Fallback por category:", categoryFilter);
  
    const fallbackCursor = await collection.find(categoryFilter, {
      sort: { $vector: queryVector },
      limit: 5,
      includeSimilarity: true,
    });
  
    type ChunkResult = {
      _id: string;
      text: string;
      $similarity: number;
      $vector: number[];
      [key: string]: any;
    };
  
    const fallbackResults = (await fallbackCursor.toArray()) as ChunkResult[];
  
    debugLog("🔁 FallbackResults por category:", fallbackResults);
    for (const r of fallbackResults) {
      if (!Array.isArray(r.$vector)) {
        console.warn("⚠️ Chunk con vector inválido:", r);
      }
    }
    
    const SIMILARITY_THRESHOLD = 0.95;
  
    const relevantResults = fallbackResults
      .filter((r) => Array.isArray(r.$vector)&& r.$vector.length === queryVector.length) // defensivo
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
  
  // 🔚 Sin promptKey ni category → buscar solo por hotelId
  debugLog("🔍 Búsqueda sin filtro adicional (solo hotelId):", { hotelId });

  const fallbackCursor = await collection.find(
    { hotelId },
    {
      sort: { $vector: queryVector },
      limit: 5,
      includeSimilarity: true,
    }
  );
  const fallbackResults = await fallbackCursor.toArray();
  return fallbackResults.map((r: any) => r.text);
    
  }
