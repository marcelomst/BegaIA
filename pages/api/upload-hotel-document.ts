// /pages/api/upload-hotel-document.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { loadDocumentFileForHotel } from "../../lib/retrieval";
import { IncomingForm } from "formidable";
import * as fs from "fs";
import pdfParse = require("pdf-parse");

/**
 * Limpia y normaliza texto plano para asegurar consistencia entre .pdf y .txt.
 */
function cleanText(text: string) {
  return text
    .replace(/\r\n/g, "\n")              // Windows → Unix
    .replace(/\n{2,}/g, "\n\n")          // Máx doble salto
    .replace(/[^\x20-\x7E\n]/g, "")      // Remueve caracteres no imprimibles excepto saltos de línea
    .normalize("NFKC");                  // Normaliza Unicode
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

      if (mimeType.includes("pdf") || filePath.endsWith(".pdf")) {
        const buffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(buffer);
        const clean = cleanText(pdfData.text);
        // 🪪 DEBUG: Tamaño del texto generado para Astra
          const charCount = clean.length;
          const byteCount = Buffer.byteLength(clean, "utf8");
          console.log(`[DEBUG] TXT generado: ${charCount} caracteres, ${byteCount} bytes`);



        // Guardar temporal como .txt (por si querés conservar el archivo)
        const tmpTxtPath = filePath.replace(/\.pdf$/i, ".txt");
        fs.writeFileSync(tmpTxtPath, clean, "utf8");

        finalFilePath = tmpTxtPath;
        finalMimeType = "text/plain";
      }

      // Pipeline normalizado para PDF y TXT
      const result = await loadDocumentFileForHotel({
        hotelId,
        filePath: finalFilePath,
        originalName,
        uploader,
        mimeType: finalMimeType,
        metadata,
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
      res.status(200).json({ ok: true, version, ...restResult });
    } catch (e) {
  console.error("❌ Error en upload-hotel-document:", e);
  res.status(500).json({ error: "Processing error", details: (e as Error).message, stack: (e as Error).stack });
}

  });
}
