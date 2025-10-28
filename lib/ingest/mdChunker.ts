// Path: /root/begasist/lib/ingest/mdChunker.ts
import fs from "fs";
import matter from "gray-matter";
import path from "path";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export type KbFrontmatter = {
    title?: string;
    version?: number | string;
    valid_from?: string | null;
    valid_to?: string | null;
    audience?: "guest" | "staff" | "both";
    tags?: string[];
    jurisdiction?: string[];
};

export type NormalizedMeta = {
    hotelId: string;
    category: "reservation" | "cancellation" | "amenities" | "billing" | "support" | "general";
    audience: "guest" | "staff" | "both";
    targetLang: "es" | "en" | "pt";
    version: string;
    title?: string;
    valid_from?: string | null;
    valid_to?: string | null;
    tags?: string[];
    jurisdiction?: string[];
    source_ref: string;
};

function normLang(seg: string): "es" | "en" | "pt" {
    const v = seg.toLowerCase();
    if (v.startsWith("es") || v === "spa" || v === "esp" || v === "sp") return "es";
    if (v.startsWith("en") || v === "eng") return "en";
    if (v.startsWith("pt") || v === "por") return "pt";
    throw new Error(`Lang no soportado en ruta: ${seg}`);
}

function normCategory(seg: string): NormalizedMeta["category"] {
    const v = seg.toLowerCase();
    if (["reservation", "reservations"].includes(v)) return "reservation";
    if (["cancellation", "cancelation", "cancel"].includes(v)) return "cancellation";
    if (["amenities", "amenity"].includes(v)) return "amenities";
    if (["billing", "invoice", "facturacion", "facturación"].includes(v)) return "billing";
    if (["support", "help", "ayuda"].includes(v)) return "support";
    return "general";
}

function normAudience(seg?: string): "guest" | "staff" | "both" {
    const v = (seg || "").toLowerCase();
    if (v === "guest") return "guest";
    if (v === "staff") return "staff";
    return "both";
}

export function parseKbMd(filePath: string, hotelIdDefault = "hotel999") {
    const raw = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(raw);
    const fm = (data || {}) as KbFrontmatter;

    // /kb/{hotelId}/{category}/{audience}/{lang}/file_vX.md
    const parts = filePath.split(path.sep);
    const idx = parts.lastIndexOf("kb");
    if (idx < 0) throw new Error("Ruta KB inválida (no contiene /kb)");
    const hotelId = parts[idx + 1] || hotelIdDefault;
    const category = normCategory(parts[idx + 2] || "general");
    const audience = normAudience(parts[idx + 3] || fm.audience || "both");
    const targetLang = normLang(parts[idx + 4] || "es");

    let version = "v1";
    if (typeof fm.version === "number") version = `v${fm.version}`;
    else if (typeof fm.version === "string" && /^v?\d+$/i.test(fm.version)) {
        version = fm.version.startsWith("v") ? fm.version : `v${fm.version}`;
    } else {
        const base = path.basename(filePath);
        const m = base.match(/_v(\d+)\./i);
        if (m) version = `v${m[1]}`;
    }

    const meta: NormalizedMeta = {
        hotelId,
        category,
        audience,
        targetLang,
        version,
        title: fm.title,
        valid_from: fm.valid_from ?? null,
        valid_to: fm.valid_to ?? null,
        tags: fm.tags ?? [],
        jurisdiction: fm.jurisdiction ?? [],
        source_ref: filePath.replace(process.cwd(), ""),
    };

    return { meta, content };
}

export async function chunkMarkdown(mdText: string) {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 700,
        chunkOverlap: 100,
    });
    const docs = await splitter.createDocuments([mdText]);
    return docs.map((d, i) => ({ order: i, text: d.pageContent }));
}
