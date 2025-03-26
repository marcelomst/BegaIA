import { cache } from "react";
import fs from "fs";
import path from "path";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { translationModel } from "@/lib/translation";
import puppeteer from "puppeteer";
import dotenv from "dotenv";

dotenv.config(); // Carga las variables de entorno

// 🌐 URLs a extraer
const urls = [
  "https://www.hoteldemo.com/en/index.php",
];

const VECTOR_DIR = path.join(process.cwd(), "vector_cache");
const VECTOR_PATH = path.join(VECTOR_DIR, "rooms_vectorstore.json");

// 🖥 Función para extraer texto con Puppeteer
async function fetchPageWithPuppeteer(url: string): Promise<string | null> {
  console.log(`🖥 Cargando página con Puppeteer: ${url}`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 120000 }); // 60 segundos
    await page.waitForSelector("body", { timeout: 120000 });

    const pageContent = await page.evaluate(() => document.body.innerText);
    return pageContent;
  } catch (error) {
    console.error(`❌ Error con Puppeteer al acceder a ${url}:`, error);
    return null;
  } finally {
    await browser.close();
  }
}

// 🔄 Función para traducir texto con manejo de errores
export async function translateText(text: string) {
  try {
    console.log(`🔄 Traduciendo docs: "${text}"`);
    const lang = process.env.SYSTEM_NATIVE_LANGUAGE;
    if (!lang) {
      throw new Error("SYSTEM_NATIVE_LANGUAGE is not defined in environment variables.");
    }
    
    const translatedQuery = await translationModel(text, lang);


    const translatedText =
      typeof translatedQuery.content === "string"
        ? translatedQuery.content
        : JSON.stringify(translatedQuery.content);

    console.log(`🌍 Traducción completa: "${translatedText}"`);
    return translatedText;
  } catch (error) {
    console.error("⛔ Error en traducción:", error);
    return text; // En caso de fallo, devolver el texto original
  }
}

// ✅ Esta función queda envuelta en cache()
export const loadDocuments: () => Promise<MemoryVectorStore> = cache(async () => {
  
  // 1. Si ya existe el vector store guardado
  // if (fs.existsSync(VECTOR_PATH)) {
  //   console.log("📦 Cargando vectores desde caché local...");
  //   const raw = fs.readFileSync(VECTOR_PATH, "utf-8");
  //   return await MemoryVectorStore.fromJSON(JSON.parse(raw), new OpenAIEmbeddings());
  // }

  // 2. Scrapeo + traducción
  console.log("🔍 Generando vectores desde cero...");
  const docs = await Promise.all(
    urls.map(async (url) => {
      const html = await fetchPageWithPuppeteer(url);
      if (!html) return null;
      const translatedContent = await translateText(html);
      return new Document({ pageContent: translatedContent, metadata: { source: url } });
    })
  );

 
  const validDocs = docs.filter((d): d is Document<{ [key: string]: any }> => d !== null);

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
  const chunks = await splitter.splitDocuments(validDocs);
  const vectorStore = await MemoryVectorStore.fromDocuments(chunks, new OpenAIEmbeddings());

  // 3. Guardar en caché local
  if (!fs.existsSync(VECTOR_DIR)) fs.mkdirSync(VECTOR_DIR);
  fs.writeFileSync(VECTOR_PATH, JSON.stringify(await vectorStore.toJSON()), "utf-8");
  console.log("✅ Vectores guardados en vector_cache/");

  return vectorStore;
});

