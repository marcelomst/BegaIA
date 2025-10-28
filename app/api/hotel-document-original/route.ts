// API: /api/hotel-document-original
// Devuelve el documento original (texto plano)
// - Hoteles normales: desde hotel_text_collection (concatena textPart por chunkIndex)
// - System: desde system_playbook (texto completo del doc)
// Query params generales:
//  - hotelId (string) requerido
//  - version (string) requerido (para system si se usa promptKey)
//  - format (optional): "txt" (default) o "json"
//  - download (optional): "1" para forzar descarga (attachment); default inline
// Esquemas por modo:
//  - hotel normal: originalName requerido
//  - system: id ó (promptKey + version)

import { NextRequest, NextResponse } from "next/server";
import { getOriginalTextChunksFromAstra } from "@/lib/astra/hotelTextCollection";
import { getAstraDB } from "@/lib/astra/connection";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const hotelId = searchParams.get("hotelId");
        const originalName = searchParams.get("originalName");
        const version = searchParams.get("version");
        const id = searchParams.get("id");
        const promptKey = searchParams.get("promptKey");
        const format = (searchParams.get("format") || "txt").toLowerCase();
        const download = searchParams.get("download") === "1";

        if (!hotelId) {
            return NextResponse.json({ error: "hotelId requerido" }, { status: 400 });
        }

        // MODO SYSTEM: leer de system_playbook por id o (promptKey+version)
        if (hotelId === "system") {
            if (!id && !promptKey) {
                return NextResponse.json({ error: "Falta id o promptKey" }, { status: 400 });
            }
            if (!id && !version) {
                return NextResponse.json({ error: "version requerida cuando se usa promptKey" }, { status: 400 });
            }

            const db = getAstraDB();
            const spb = db.collection("system_playbook");

            let doc: any | null = null;
            if (id) {
                doc = await spb.findOne({ _id: id });
            } else if (promptKey && version) {
                const cursor = await spb.find({ promptKey, version }).limit(1);
                const arr = await cursor.toArray();
                doc = arr?.[0]?.document ?? null;
            }

            if (!doc) {
                return NextResponse.json({ error: "no_found" }, { status: 404 });
            }

            const bodyText = typeof doc.text === "string" ? doc.text : "";
            if (format === "json") {
                return NextResponse.json(
                    {
                        hotelId: "system",
                        id: String(doc._id ?? id ?? `${promptKey}-${version}`),
                        promptKey: doc.promptKey ?? promptKey ?? null,
                        version: doc.version ?? version ?? null,
                        text: bodyText,
                    },
                    { status: 200 }
                );
            }

            const filename = `${encodeURIComponent(doc.promptKey ?? promptKey ?? "system_doc")}-${encodeURIComponent(doc.version ?? version ?? "v1")}.txt`;
            return new NextResponse(bodyText, {
                status: 200,
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
                },
            });
        }

        // MODO HOTEL NORMAL
        if (!originalName || !version) {
            return NextResponse.json(
                { error: "originalName y version son requeridos para hotel normal" },
                { status: 400 }
            );
        }

        const chunks = await getOriginalTextChunksFromAstra({ hotelId, originalName, version });
        if (!Array.isArray(chunks) || chunks.length === 0) {
            return NextResponse.json(
                { error: "no_found", message: "No hay texto original para ese documento" },
                { status: 404 }
            );
        }

        // Ordenar por chunkIndex y concatenar
        const ordered = chunks
            .map((c: any) => ({
                chunkIndex: typeof c.chunkIndex === "number" ? c.chunkIndex : 0,
                textPart: typeof c.textPart === "string" ? c.textPart : "",
            }))
            .sort((a, b) => a.chunkIndex - b.chunkIndex);

        if (format === "json") {
            return NextResponse.json(
                {
                    hotelId,
                    originalName,
                    version,
                    chunks: ordered,
                },
                { status: 200 }
            );
        }

        const fullText = ordered.map((c) => c.textPart).join("");
        // Devolver como texto plano
        return new NextResponse(fullText, {
            status: 200,
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                // inline o attachment según flag
                "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(originalName)}-${version}.txt"`,
            },
        });
    } catch (e: any) {
        console.error("/api/hotel-document-original error:", e?.message || e);
        return NextResponse.json({ error: e?.message || "server_error" }, { status: 500 });
    }
}
