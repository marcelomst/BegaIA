// /app/api/hotels/upload-docs/route.ts
import { NextRequest, NextResponse } from "next/server";
import formidable from "formidable";
import { loadDocumentFileForHotel } from "@/lib/retrieval";
import { promises as fs } from "fs";
import path from "path";

// Necesario para deshabilitar el bodyParser
export const config = {
  api: { bodyParser: false }
};

async function parseForm(req: Request): Promise<{ fields: any, files: any }> {
  const form = formidable({ multiples: false, uploadDir: "/tmp", keepExtensions: true });
  return new Promise((resolve, reject) => {
    form.parse(req as any, (err: any, fields: any, files: any) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export async function POST(req: NextRequest) {
  // Validación de usuario/hotel (ejemplo simple, mejorá para usar auth real)
  const hotelId = req.headers.get("x-hotel-id"); // o sacalo del token, etc.
  const uploader = req.headers.get("x-user-email") || "admin@unknown";

  if (!hotelId) {
    return NextResponse.json({ error: "hotelId requerido" }, { status: 401 });
  }

  try {
    const { fields, files } = await parseForm(req as any);
    const file = files.file; // nombre input="file"
    if (!file) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });

    const filePath = file.filepath || file.path;
    const originalName = file.originalFilename || file.name;
    const mimeType = file.mimetype || "application/pdf";

    const result = await loadDocumentFileForHotel({
      hotelId,
      filePath,
      originalName,
      uploader,
      mimeType,
      metadata: {} // Podés agregar más metadata acá si querés
    });

    // Opcional: borrar el archivo temporal
    await fs.unlink(filePath);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
