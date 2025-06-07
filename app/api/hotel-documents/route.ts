// /app/api/hotel-documents/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getHotelAstraCollection } from "@/lib/astra/connection";
import type { ChunkResult } from "@/types/chunk";

// Utilidad para agrupar por documento original+versión
function groupChunksByOriginal(chunks: ChunkResult[]) {
  const groups: Record<string, any> = {};

  for (const chunk of chunks) {
    const key = `${chunk.originalName || "?"}__${chunk.version || "v1"}`;
    if (!groups[key]) {
      groups[key] = {
        hotelId: chunk.hotelId,
        originalName: chunk.originalName,
        version: chunk.version,
        uploader: chunk.uploader,
        author: chunk.author,
        uploadedAt: chunk.uploadedAt,
        categories: new Set<string>(),
        promptKeys: new Set<string>(),
        detectedLang: chunk.detectedLang,
        targetLang: chunk.targetLang,
        chunkCount: 0,
      };
    }
    if (chunk.category) groups[key].categories.add(chunk.category);
    if (chunk.promptKey) groups[key].promptKeys.add(chunk.promptKey);
    groups[key].chunkCount++;
  }

  // Formateo para salida legible
  return Object.values(groups).map((doc: any) => ({
    hotelId: doc.hotelId,
    originalName: doc.originalName,
    version: doc.version,
    uploader: doc.uploader,
    author: doc.author,
    uploadedAt: doc.uploadedAt,
    categories: Array.from(doc.categories).sort(), // listado ordenado (detalle)
    categoryCount: doc.categories.size,            // ← cantidad única (para la tabla)
    promptKeys: Array.from(doc.promptKeys),
    detectedLang: doc.detectedLang,
    targetLang: doc.targetLang,
    chunkCount: doc.chunkCount,                    // cantidad total de chunks
  }));
}

// 🚩 Handler principal
export async function GET(req: NextRequest) {
  const hotelId = req.nextUrl.searchParams.get("hotelId");
  if (!hotelId) {
    return NextResponse.json({ error: "Missing hotelId" }, { status: 400 });
  }

  const collection = getHotelAstraCollection<ChunkResult>(hotelId);

  // Limitar cantidad si hay muchos docs (puedes agregar paginación en el futuro)
  const allDocs = await collection.find({ hotelId }).toArray();

  const allChunks: ChunkResult[] = allDocs.map((doc: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { $vector, ...chunk } = doc;
    return chunk as ChunkResult;
  });

  const grouped = groupChunksByOriginal(allChunks);

  // Ordenar por originalName, version DESC
  grouped.sort((a: any, b: any) => {
    if (a.originalName === b.originalName) {
      // Ordenar por versión descendente (v3 > v2 > v1)
      const nA = parseInt((a.version || "v0").replace("v", ""), 10);
      const nB = parseInt((b.version || "v0").replace("v", ""), 10);
      return nB - nA;
    }
    return (a.originalName || "").localeCompare(b.originalName || "");
  });

  return NextResponse.json({ ok: true, docs: grouped });
}
