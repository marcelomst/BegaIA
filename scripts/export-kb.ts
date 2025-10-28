// Path: /root/begasist/scripts/export-kb.ts
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { getHotelAstraCollection } from "../lib/astra/connection";

async function main() {
    const hotelId = process.env.HOTEL_ID || "hotel999";
    const outDir = path.resolve(process.cwd(), "exports");
    const outFile = path.join(outDir, `${hotelId}_collection_export.json`);

    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const col = getHotelAstraCollection<any>(hotelId);
    const cursor = await col.find({ hotelId });
    const docs = await cursor.toArray();

    // No exportamos vectores completos para no generar archivos gigantes.
    // Guardamos solo metadata esencial y un preview del texto.
    const sanitized = docs.map((d: any) => ({
        _id: d._id,
        hotelId: d.hotelId,
        category: d.category,
        version: d.version,
        originalName: d.originalName,
        uploadedAt: d.uploadedAt,
        detectedLang: d.detectedLang,
        detectedLangScore: d.detectedLangScore,
        targetLang: d.targetLang,
        audience: d.audience,
        valid_from: d.valid_from ?? null,
        valid_to: d.valid_to ?? null,
        tags: d.tags ?? [],
        jurisdiction: d.jurisdiction ?? [],
        // preview del texto (primeros 200 chars)
        textPreview: typeof d.text === "string" ? d.text.slice(0, 200) : null,
        // doc_json puede ser grande; si querés inspeccionarlo, lo dejamos tal cual:
        doc_json: d.doc_json ?? null
    }));

    fs.writeFileSync(outFile, JSON.stringify({ hotelId, count: sanitized.length, docs: sanitized }, null, 2), "utf8");
    console.log(`[kb:export] ✅ Exportado ${sanitized.length} documentos a ${outFile}`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
