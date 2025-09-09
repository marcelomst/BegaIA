// Path: /root/begasist/app/api/hotel-document-details/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getHotelAstraCollection, getAstraDB } from "@/lib/astra/connection";
import type { ChunkResult } from "@/types/chunk";

/**
 * Devuelve los "chunks" detallados de un documento.
 * - Para hoteles normales: busca en {hotelId}_collection por originalName+version.
 * - Para "system": lee 1 doc de `system_playbook` (por _id o por promptKey+version) y
 *   devuelve un único chunk sintético con el texto completo (sin embeddings).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hotelId = searchParams.get("hotelId") || "hotel999";
    const version = searchParams.get("version") || "v1";

    if (hotelId === "system") {
      const id = searchParams.get("id") || undefined;
      const promptKey = searchParams.get("promptKey") || undefined;

      const db = getAstraDB();
      const spb = db.collection("system_playbook");

      let doc: any | null = null;
      if (id) {
        const q: any = { _id: id };
        doc = await spb.findOne(q);
      } else if (promptKey) {
        const q: any = { promptKey, version };
        const cursor = await spb.find(q).limit(1);
        const arr = await cursor.toArray();
        doc = arr?.[0]?.document ?? null;
      }

      if (!doc) {
        return NextResponse.json({ chunks: [] }, { status: 200 });
      }

      // Respuesta: 1 chunk con el texto completo
      const chunk = {
        index: 0,
        category: doc.category ?? null,
        promptKey: doc.promptKey ?? null,
        text: doc.text ?? "",
        uploadedAt: doc.uploadedAt ?? null,
      };
      return NextResponse.json({ chunks: [chunk] }, { status: 200 });
    }

    // Hotel normal → usar colección vectorial
    const originalName = searchParams.get("originalName");
    if (!originalName) {
      return NextResponse.json({ error: "originalName requerido" }, { status: 400 });
    }

    const collection = getHotelAstraCollection<ChunkResult>(hotelId);
    const chunks = await collection
      .find({ hotelId, originalName, version })
      .toArray();

    const mapped = chunks.map((r: any, idx: number) => ({
      index: idx,
      category: r.category ?? null,
      promptKey: r.promptKey ?? null,
      text: r.text ?? "",
      uploadedAt: r.uploadedAt ?? null,
      similarity: r.$similarity ?? undefined,
    }));

    return NextResponse.json({ chunks: mapped }, { status: 200 });
  } catch (e: any) {
    console.error("hotel-document-details error:", e);
    return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 });
  }
}
