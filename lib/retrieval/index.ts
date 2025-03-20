import puppeteer from "puppeteer";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { writeFile } from "fs/promises";
import { Document } from "@langchain/core/documents";
import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
import { translationModel } from "@/lib/translation";

dotenv.config(); // Carga las variables de entorno


// 🔄 Función para traducir texto con manejo de errores
export async function translateText(text: string) {
  try {
    console.log(`🔄 Traduciendo consulta: "${text}"`);

    const translatedQuery = await translationModel(text, "English");

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


// 🌐 URLs a extraer
const urls = [
  "https://www.hoteldemo.com/rooms",
  "https://www.hoteldemo.com/services",
  "https://www.hoteldemo.com/contact",
];

// 🖥 Función para extraer texto con Puppeteer
async function fetchPageWithPuppeteer(url: string): Promise<string | null> {
  console.log(`🖥 Cargando página con Puppeteer: ${url}`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle0", timeout: 15000 });
    await page.waitForSelector("body", { visible: true, timeout: 10000 });

    const pageContent = await page.evaluate(() => document.body.innerText);
    return pageContent;
  } catch (error) {
    console.error(`❌ Error con Puppeteer al acceder a ${url}:`, error);
    return null;
  } finally {
    await browser.close();
  }
}

// 📥 Función para cargar y procesar documentos
export async function loadDocuments() {
  console.log("🔍 Iniciando carga de documentos con Puppeteer...");

  const docs = await Promise.all(
    urls.map(async (url) => {
      const html = await fetchPageWithPuppeteer(url);
      if (!html) return null;

      const translatedContent = await translateText(html);

      return new Document({
        pageContent: translatedContent,
        metadata: { source: url },
      });
    })
  );

  const docsList = docs.filter((doc) => doc !== null);
  console.log(`✅ Documentos extraídos y traducidos: ${docsList.length}`);

  // 🛠 **Dividir el texto en fragmentos para mejor indexación**
  const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
  const docSplits = await textSplitter.splitDocuments(docsList);

  // 💾 Guardar datos en un archivo de depuración
  await saveDocsToFile(docSplits);

  // 📚 Crear base vectorial con textos en español
  return await MemoryVectorStore.fromDocuments(docSplits, new OpenAIEmbeddings());
}

// 💾 Función para guardar datos en un archivo
async function saveDocsToFile(docSplits: Document[]) {
  try {
    const textContent = JSON.stringify(docSplits, null, 2);
    await writeFile("output_cleaned.txt", textContent, "utf-8");
    console.log("📂 Datos guardados en output_cleaned.txt");
  } catch (error) {
    console.error("❌ Error al escribir el archivo:", error);
  }
}
