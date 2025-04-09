import { cache } from "react";
import dotenv from "dotenv";
import puppeteer from "puppeteer-extra";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { translationModel } from "../../app/lib/translation";
import { debugLog } from "../utils/debugLog";
import { DataAPIClient } from "@datastax/astra-db-ts";

dotenv.config();

const urls = ["https://www.hoteldemo.com/en/index.php"];
const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE!;
// const ASTRA_DB_COLLECTION_NAME = "begaia";
const getCollectionName = (hotelId: string, category?: string) =>
  category ? `${hotelId}_${category}` : `${hotelId}_default`;

const ASTRA_DB_URL = process.env.ASTRA_DB_URL!; // Agregalo a tu .env

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

export async function loadDocuments(hotelId: string, category: string = "default") {
  debugLog(`📦 Cargando documentos para hotel ${hotelId}, categoría ${category}`);

  const docs = await Promise.all(
    urls.map(async (url) => {
      const html = await fetchPageWithPuppeteer(url);
      if (!html) return null;
      const translated = await translateText(html);
      return new Document<{ source: string; hotelId: string; category: string }>({
        pageContent: translated,
        metadata: { source: url, hotelId, category },
      });
    })
  );

  const validDocs = docs.filter((d): d is Document<{ source: string; hotelId: string; category: string }> => d !== null);
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1500, chunkOverlap: 200 });
  const chunks = await splitter.splitDocuments(validDocs);
  const embedder = new OpenAIEmbeddings();

  const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
  const db = client.db(ASTRA_DB_URL, { keyspace: ASTRA_DB_KEYSPACE }); // ✅
 
  
  const collectionName = getCollectionName(hotelId, category);
  const collection = await db.collection(collectionName);

  for (const doc of chunks) {
    const embedding = await embedder.embedQuery(doc.pageContent);
    await collection.insertOne({
      ...doc.metadata,
      text: doc.pageContent,
      $vector: embedding,
    });
  }

  debugLog(`✅ Insertados ${chunks.length} chunks en colección ${collectionName}`);
}


export async function searchFromAstra(query: string, hotelId: string = "defaultHotelId", category: string = "default") {
  const embedder = new OpenAIEmbeddings();
  const queryVector = await embedder.embedQuery(query);

  const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
  const db = client.db(ASTRA_DB_URL, { keyspace: ASTRA_DB_KEYSPACE });
  const collectionName = getCollectionName(hotelId, category);
  const collection = await db.collection(collectionName);

  const cursor = await collection.find({}, {
    sort: { $vector: queryVector },
    limit: 5,
    includeSimilarity: true,
  });

  const results = await cursor.toArray();
  return results.map((r: any) => r.text);
}

