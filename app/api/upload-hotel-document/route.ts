// /app/api/upload-hotel-document/route.ts

import { NextRequest, NextResponse } from "next/server";
import { loadDocumentFileForHotel } from "@/lib/retrieval";
import formidable from "formidable";
import fs from "fs";

export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  // Parsear multipart/form-data (App Router compatible)
  const form = new formidable.IncomingForm({ keepExtensions: true });
  const data: any = await new Promise((resolve, reject) => {
    form.parse(req as any, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });

  const { fields, files } = data;
  const file = files.file?.[0] || files.file;
  const hotelId = fields.hotelId?.[0] || fields.hotelId;
  const uploader = fields.uploader?.[0] || fields.uploader || "anon";
  const originalName = file.originalFilename || file.newFilename;
  const filePath = file.filepath || file.path;
  const version = fields.version?.[0] || fields.version;
  const category = fields.category?.[0] || fields.category;
  const author = fields.author?.[0] || fields.author;
  const description = fields.description?.[0] || fields.description;
  const promptKey = fields.promptKey?.[0] || fields.promptKey;

  // Junta todos los metadatos útiles
  const metadata: Record<string, any> = {};
  if (category) metadata.category = category;
  if (author) metadata.author = author;
  if (description) metadata.description = description;
  if (promptKey) metadata.promptKey = promptKey;
  if (fields.notes) metadata.notes = fields.notes?.[0] || fields.notes;

  // Cualquier otro campo custom que venga del form
  for (const k of Object.keys(fields)) {
    if (!["hotelId", "uploader", "version", "category", "description", "file", "author", "promptKey", "notes"].includes(k)) {
      metadata[k] = fields[k];
    }
  }

  // Llama a la función de carga/vectorización (asegurate que grabe en colecciones vectoriales)
  const result = await loadDocumentFileForHotel({
    hotelId,
    filePath,
    originalName,
    uploader,
    mimeType: file.mimetype,
    metadata,
    version,
  });

  // Limpieza del archivo temporal
  fs.unlinkSync(filePath);

  return NextResponse.json({ ok: true, ...result });
}
