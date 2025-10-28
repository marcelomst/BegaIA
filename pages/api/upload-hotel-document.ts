// /pages/api/upload-hotel-document.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { loadDocumentFileForHotel } from "../../lib/retrieval";
import { IncomingForm } from "formidable";
import * as fs from "fs";
import pdfParse from "pdf-parse";
import { franc } from "franc-min";

// Normaliza un idioma de entorno a es/en/pt (fallback es)
function normalizeEnvLang(raw?: string | null): 'es' | 'en' | 'pt' {
  const v = (raw || '').toLowerCase();
  if (v.startsWith('es') || v === 'spa' || v === 'esp' || v === 'sp') return 'es';
  if (v.startsWith('en') || v === 'eng') return 'en';
  if (v.startsWith('pt') || v === 'por') return 'pt';
  return 'es';
}

/**
 * Limpia y normaliza texto plano para asegurar consistencia entre .pdf y .txt.
 */
function cleanText(text: string) {
  return text
    .replace(/\r\n/g, "\n")        // Windows → Unix
    .replace(/[ \t]+\n/g, "\n")    // espacios finales de línea
    .replace(/\n{3,}/g, "\n\n")    // máximo doble salto
    // Conservamos caracteres unicode (acentos, ñ, ç). Removemos sólo no imprimibles excepto tabs/newlines
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .normalize("NFKC");
}

export const config = {
  api: { bodyParser: false },
};

/**
 * API para subir documentos a un hotel específico.
 *
 * Requiere un POST con un formulario que incluya:
 * - file: el archivo a subir
 * - hotelId: ID del hotel
 * - uploader: nombre del uploader (opcional, por defecto "anon")
 * - metadata opcional: category, author, description, promptKey, notes
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const form = new IncomingForm({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      res.status(500).json({ error: "Form parse error", details: err });
      return;
    }
    try {
      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }
      const hotelIdRaw = Array.isArray(fields.hotelId) ? fields.hotelId[0] : fields.hotelId;
      if (!hotelIdRaw || typeof hotelIdRaw !== "string") {
        res.status(400).json({ error: "Missing or invalid hotelId" });
        return;
      }
      const hotelId: string = hotelIdRaw;
      const uploader = Array.isArray(fields.uploader) ? fields.uploader[0] : fields.uploader || "anon";
      const originalName = (file as any).originalFilename || (file as any).newFilename;
      const filePath = (file as any).filepath || (file as any).path;
      const mimeType = (file as any).mimetype ?? "";

      const category = Array.isArray(fields.category) ? fields.category[0] : fields.category;
      const author = Array.isArray(fields.author) ? fields.author[0] : fields.author;
      const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;
      const promptKey = Array.isArray(fields.promptKey) ? fields.promptKey[0] : fields.promptKey;

      const metadata: Record<string, any> = {};
      if (category) metadata.category = category;
      if (author) metadata.author = author;
      if (description) metadata.description = description;
      if (promptKey) metadata.promptKey = promptKey;
      if (fields.notes) metadata.notes = Array.isArray(fields.notes) ? fields.notes[0] : fields.notes;

      // Otros campos extra del form
      for (const k of Object.keys(fields)) {
        if (!["hotelId", "uploader", "version", "category", "description", "file", "author", "promptKey", "notes"].includes(k)) {
          metadata[k] = fields[k];
        }
      }

      // 🚩 Conversión previa: si es PDF, lo pasamos a .txt plano antes de cargar
      let finalFilePath = filePath;
      let finalMimeType = mimeType;
      let extractedText: string | null = null;

      if (mimeType.includes("pdf") || filePath.endsWith(".pdf")) {
        const buffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(buffer);
        const clean = cleanText(pdfData.text || "");
        extractedText = clean;
        // DEBUG tamaño
        const charCount = clean.length;
        const byteCount = Buffer.byteLength(clean, "utf8");
        console.log(`[DEBUG] TXT generado: ${charCount} caracteres, ${byteCount} bytes`);
        const tmpTxtPath = filePath.replace(/\.pdf$/i, ".txt");
        fs.writeFileSync(tmpTxtPath, clean, "utf8");
        finalFilePath = tmpTxtPath;
        finalMimeType = "text/plain";
      }

      // Si es texto plano y no viene de PDF, leer para detección de idioma
      if (!extractedText && finalMimeType === "text/plain" && fs.existsSync(finalFilePath)) {
        const raw = fs.readFileSync(finalFilePath, "utf8");
        extractedText = cleanText(raw || "");
      }

      // Detección de idioma usando franc (ISO-639-3)
      const iso3 = extractedText ? franc(extractedText, { minLength: 32 }) : "und";
      const iso3to2: Record<string, string> = { spa: "es", eng: "en", por: "pt" };
      let detectedLang: string = iso3to2[iso3] || (iso3 === 'und' ? 'und' : 'other');
      const len = (extractedText || '').length;
      const detectedLangScore = Math.max(0, Math.min(1, len / 2000));
      const systemDefault = normalizeEnvLang(process.env.SYSTEM_NATIVE_LANGUAGE);
      const targetLang: 'es' | 'en' | 'pt' = (detectedLang === 'es' || detectedLang === 'en' || detectedLang === 'pt') ? detectedLang as any : systemDefault;

      // Pipeline normalizado para PDF y TXT
      const result = await loadDocumentFileForHotel({
        hotelId,
        filePath: finalFilePath,
        originalName,
        uploader,
        mimeType: finalMimeType,
        metadata: {
          ...metadata,
          detectedLang,
          detectedLangScore,
          targetLang,
        },
      });

      // Limpieza: Borra ambos archivos temporales si existen
      if (finalFilePath !== filePath && fs.existsSync(finalFilePath)) {
        fs.unlinkSync(finalFilePath);
      }
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Usa la versión retornada por el backend, no una variable local
      const { ok, version, ...restResult } = result || {};
      res.status(200).json({
        ok: true,
        version,
        ...restResult,
        detectedLang,
        detectedLangScore,
        targetLang,
      });
    } catch (e) {
      console.error("❌ Error en upload-hotel-document:", e);
      res.status(500).json({ error: "Processing error", details: (e as Error).message, stack: (e as Error).stack });
    }

  });
}
