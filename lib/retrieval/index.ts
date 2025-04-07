process.env.OPENAI_LOG = "off";
import { cache } from "react";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { translationModel } from "../../app/lib/translation";
import puppeteer from "puppeteer-extra";
import dotenv from "dotenv";
import { debugLog } from "../utils/debugLog";

dotenv.config();

const urls = ["https://www.hoteldemo.com/en/index.php"];

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

export const loadDocuments: () => Promise<MemoryVectorStore> = cache(async () => {
  debugLog("📦 Cargando e indexando documentos...");

  const docs = await Promise.all(
    urls.map(async (url) => {
      const html = await fetchPageWithPuppeteer(url);
      if (!html) return null;

      const translated = await translateText(html);
      return new Document({
        pageContent: translated,
        metadata: { source: url },
      });
    })
  );

  const validDocs = docs.filter(
    (d): d is NonNullable<typeof d> => d !== null
  );

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });

  const chunks = await splitter.splitDocuments(validDocs);

  return await MemoryVectorStore.fromDocuments(
    chunks,
    new OpenAIEmbeddings({ verbose: false }));
});
