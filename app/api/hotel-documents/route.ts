// Path: /root/begasist/app/api/hotel-documents/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAstraDB, getHotelAstraCollection } from "@/lib/astra/connection";

type UIRow = {
  _id: string;
  hotelId: string;
  name: string;
  version: string;
  categories: string[];
  chunks: number;
  uploader: string | null;
  uploadedAt: string | null;
  // extra
  originalName?: string | null;
  promptKey?: string | null;
  category?: string | null;
  language?: string | null;
  textPreview?: string | null;
};

export async function GET(req: NextRequest) {
  const hotelId = req.nextUrl.searchParams.get("hotelId") || "hotel999";

  try {
    // 🟦 SYSTEM: listar desde `system_playbook`
    if (hotelId === "system") {
      const db = getAstraDB();
      const sysCol = db.collection("system_playbook");
      const docs = await (await sysCol.find({}, { limit: 500 })).toArray();

      const rows: UIRow[] = (docs || []).map((d: any) => {
        const promptKey = d.promptKey ?? null;
        // Evitamos 1970 devolviendo null si no hay fecha
        const uploadedAt: string | null = d.uploadedAt ?? null;
        return {
          _id: String(d._id),
          hotelId: "system",
          name: promptKey ? `system:${promptKey}` : "system:playbook",
          version: d.version ?? "v1",
          categories: d.category ? [String(d.category)] : [],
          chunks: 1,
          uploader: d.uploader ?? null,
          uploadedAt,
          // para que el UI pueda pedir detalles:
          originalName: promptKey, // el UI usa originalName en la query de detalles
          promptKey,
          category: d.category ?? null,
          language: d.langIso1 ?? d.language ?? null,
          textPreview: typeof d.text === "string" ? d.text.slice(0, 160) : null,
        };
      });

      return NextResponse.json({ docs: rows }, { status: 200 });
    }

    // 🟩 HOTELES NORMALES (chunks en `${hotelId}_collection`)
    const collection = getHotelAstraCollection<any>(hotelId);
    const allDocs = await collection.find({ hotelId }).toArray();

    const byKey = new Map<string, UIRow>();
    for (const doc of allDocs as any[]) {
      const originalName: string = doc.originalName || "(sin nombre)";
      const version: string = doc.version || "v1";
      const key = `${originalName}::${version}`;

      let row = byKey.get(key);
      if (!row) {
        row = {
          _id: key,
          hotelId,
          name: originalName,
          version,
          categories: [],
          chunks: 0,
          uploader: doc.uploader ?? null,
          uploadedAt: doc.uploadedAt ?? null,
          originalName,
        };
        byKey.set(key, row);
      }

      const cat = doc.category ? String(doc.category) : null;
      if (cat && !row.categories.includes(cat)) row.categories.push(cat);

      row.chunks += 1;
      if (doc.uploadedAt && (!row.uploadedAt || new Date(doc.uploadedAt) > new Date(row.uploadedAt))) {
        row.uploadedAt = doc.uploadedAt;
      }
    }

    const rows = Array.from(byKey.values()).sort((a, b) => {
      const ta = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const tb = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return tb - ta;
    });

    return NextResponse.json({ docs: rows }, { status: 200 });
  } catch (err: any) {
    console.error("❌ /api/hotel-documents error:", err?.message || err);
    return NextResponse.json({ docs: [], error: err?.message || "unexpected_error" }, { status: 500 });
  }
}
