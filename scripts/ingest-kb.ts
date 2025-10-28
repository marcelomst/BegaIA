// Path: /root/begasist/scripts/ingest-kb.ts
import "dotenv/config";
import * as path from "path";
import { globSync } from "glob";
import { OpenAIEmbeddings } from "@langchain/openai";
import { getHotelAstraCollection } from "../lib/astra/connection";
import { parseKbMd, chunkMarkdown } from "../lib/ingest/mdChunker";

type Insertable = {
    hotelId: string;
    category: string;
    promptKey?: string | null;
    version: string;
    author?: string | null;
    uploader?: string | null;
    text: string;
    $vector: number[];
    uploadedAt: string;
    originalName: string;
    detectedLang: string;
    detectedLangScore?: number | null;
    targetLang: "es" | "en" | "pt";
    audience?: "guest" | "staff" | "both";
    valid_from?: string | null;
    valid_to?: string | null;
    tags?: string[];
    jurisdiction?: string[];
    doc_json?: string;
};

function nowIso() { return new Date().toISOString(); }

async function main() {
    const hotelId = process.env.HOTEL_ID || "hotel999";
    const root = path.resolve(process.cwd(), "kb", hotelId);
    const pattern = `${root}/**/*.md`;

    const files = globSync(pattern, { nodir: true });
    if (files.length === 0) {
        console.error(`[ingest-kb] No se encontraron MD en ${pattern}`);
        process.exit(2);
    }
    console.log(`[ingest-kb] ${files.length} archivos encontrados bajo ${root}`);

    const embedder = new OpenAIEmbeddings();
    const col = getHotelAstraCollection<Insertable>(hotelId);

    for (const f of files) {
        const base = path.basename(f);
        const { meta, content } = parseKbMd(f, hotelId);
        if (meta.hotelId !== hotelId) {
            console.warn(`[ingest-kb] Saltando ${base} (hotelId en ruta ${meta.hotelId} != ${hotelId})`);
            continue;
        }
        const chunks = await chunkMarkdown(content);
        console.log(`[ingest-kb] ${base} → ${chunks.length} chunks (${meta.category}/${meta.targetLang}/${meta.audience})`);

        for (const ch of chunks) {
            const vec = await embedder.embedQuery(ch.text);
            const rec: Insertable = {
                hotelId,
                category: meta.category,
                version: meta.version,
                text: ch.text,
                $vector: vec,
                uploadedAt: nowIso(),
                originalName: base,
                detectedLang: meta.targetLang,
                detectedLangScore: 1,
                targetLang: meta.targetLang,
                audience: meta.audience,
                valid_from: meta.valid_from ?? null,
                valid_to: meta.valid_to ?? null,
                tags: meta.tags ?? [],
                jurisdiction: meta.jurisdiction ?? [],
                doc_json: JSON.stringify({
                    source_ref: meta.source_ref,
                    title: meta.title,
                    chunkIndex: ch.order,
                    audience: meta.audience,
                    tags: meta.tags,
                    jurisdiction: meta.jurisdiction,
                }),
            };
            await col.insertOne(rec);
        }
    }

    console.log(`[ingest-kb] ✅ Completo para hotelId=${hotelId}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
