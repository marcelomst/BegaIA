// /root/begasist/scripts/generate-hotel-demo-pdf.ts

import puppeteer from "puppeteer-extra";
import * as fs from "fs";
import * as path from "path";
import PDFDocument from "pdfkit";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";
import { translationModel } from "../app/lib/translation";
import { getHotelConfig } from "../lib/config/hotelConfig.server"; // Ajustá path si es necesario

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = "https://www.hoteldemo.com/en/index.php";
const output = path.resolve(__dirname, "hotel-demo-en-textonly.pdf");

// Recibe hotelId (en entorno real esto lo recibe como argumento)
const hotelId = "hotel999";

async function fetchAndCleanText(url: string): Promise<string> {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2", timeout: 120000 });

  // Limpiar la página
  await page.evaluate(() => {
    document.querySelectorAll("img, svg, picture, video, iframe, nav, header, footer, aside, .banner, .ads, [role='banner']").forEach(el => el.remove());
    document.body.querySelectorAll("*").forEach(el => {
      (el as HTMLElement).style.background = "none";
      (el as HTMLElement).style.color = "#222";
    });
  });

  const text = await page.evaluate(() => document.body.innerText);
  await browser.close();
  return text;
}

(async () => {
  // 1. Obtener config real del hotel
  const config = await getHotelConfig(hotelId);
  const LANGUAGE = config?.defaultLanguage || "es";

  console.log("🌐 Extrayendo texto limpio del sitio...");
  const rawText = await fetchAndCleanText(url);

  // 2. Traducir
  console.log("🌎 Traduciendo texto al idioma destino:", LANGUAGE);
  let translatedText = rawText;
  try {
    const result = await translationModel(rawText, LANGUAGE);
    translatedText = typeof result.content === "string" ? result.content : JSON.stringify(result.content);
  } catch (e) {
    console.warn("⚠️ No se pudo traducir el texto, usando original en inglés.");
  }

  // 3. PDF (solo texto traducido)
  console.log("📄 Generando PDF solo texto traducido...");
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(fs.createWriteStream(output));

  // Portada
  const date = new Date().toLocaleString();
  doc.fontSize(20).text("Extracted from:", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(14).text(`URL: ${url}`, { align: "center" });
  doc.fontSize(14).text(`Hotel: ${config?.hotelName || hotelId}`, { align: "center" });
  doc.fontSize(12).text(`Date: ${date}`, { align: "center" });
  doc.fontSize(12).text(`Language: ${LANGUAGE}`, { align: "center" });
  doc.moveDown(1.5);
  doc.fontSize(12).text("↓ Scroll for translated full website content ↓", { align: "center", color: "#888" });
  doc.addPage();

  // Texto principal traducido
  doc.font("Times-Roman").fontSize(12).text(translatedText, {
    align: "left",
    lineGap: 4,
    paragraphGap: 10
  });

  doc.end();
  console.log(`✅ PDF generado (solo texto traducido): ${output}`);
})();
