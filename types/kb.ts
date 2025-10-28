/**
 * Knowledge Base record schema and helpers
 *
 * Purpose
 * - Provide a deterministic, business-level identity for KB docs without relying on DB-managed _id
 * - Support per-language embeddings (es/en/pt) and versioning with isCurrent toggle per language
 * - Enable idempotent upserts by (docId, chunkIndex)
 *
 * Indexing suggestions (at DB level)
 * - Filter fields: hotelId, category, promptKey, lang, isCurrent, version, docId, docGroupId, status
 * - Vector index over $vector
 */

export type LangISO1 = "es" | "en" | "pt";
export type DetectedLangISO1 = LangISO1 | "other" | "und";

export type DocCategory =
    | "retrieval_based"
    | "reservation"
    | "reservation_snapshot"
    | "reservation_verify"
    | "cancel_reservation"
    | "amenities"
    | "billing"
    | "support"
    // allow forward-compat custom categories
    | (string & {});

export type PublicationStatus = "draft" | "published" | "archived";

/**
 * DEPRECADO para prompts/playbooks: Usar HotelContent/HotelVersionIndex (ver types/hotelContent.ts)
 * KBRecord se mantiene para chunks y embeddings de la base de conocimiento general.
 */
export interface KBRecord {
    // Identity (business keys)
    docId: string;              // e.g. "hotel999:retrieval_based:kb_general:es:v1"
    docGroupId: string;         // e.g. "hotel999:retrieval_based:kb_general" (sibling docs across languages)

    // Scope
    hotelId: string;
    category: DocCategory;
    promptKey: string | null;   // e.g. "kb_general"; can be null for general-category content

    // Language & versioning
    lang: LangISO1;             // target indexing language (embedding language)
    version: number | string;   // 1 | "v1" — use helpers to normalize
    isCurrent: boolean;         // published/active version for this lang within docGroupId

    // Chunking
    chunkIndex?: number;        // 0..N-1
    chunkCount?: number;        // N

    // Content
    title?: string | null;
    summary?: string | null;
    text: string;               // the chunk/page content
    sources?: string[] | null;  // URLs or references
    tags?: string[] | null;

    // Embeddings
    $vector?: number[];         // embedding vector for similarity search
    embeddingModel?: string | null;
    embeddingDim?: number | null;

    // Operational metadata
    status?: PublicationStatus; // default: published for active chunks
    author?: string | null;
    uploader?: string | null;
    originalName?: string | null;       // original file name
    detectedLang?: DetectedLangISO1;    // language of the original source text
    detectedLangScore?: number | null;  // heuristic score for language detection
    targetLang?: LangISO1;              // same as `lang` — kept for compatibility with current pipeline

    createdAt?: string;         // ISO date string
    updatedAt?: string;         // ISO date string

    // Idempotency & dedupe
    checksum?: string | null;   // SHA-256 (hex) of `text` (or full body) to avoid re-insert unchanged content

    // Raw doc json (optional, for auditing/compat with existing pipeline)
    doc_json?: string;
}

export interface BuildIdsInput {
    hotelId: string;
    category: string;     // accept string to avoid coupling to union during building
    promptKey: string;     // required for deterministic identity across languages
    lang: LangISO1;
    version: number | string;
}

/** Normalize version into the canonical tag form: "vN" */
export function normalizeVersion(v: number | string): string {
    if (typeof v === "number") return `v${v}`;
    const s = String(v).trim();
    if (/^v\d+$/i.test(s)) return s.toLowerCase();
    const m = s.match(/^(?:version[-_\s]*)?(\d+)$/i);
    return m ? `v${m[1]}` : (s.startsWith("v") ? s : `v${s}`);
}

/** Build docGroupId = hotelId:category:promptKey */
export function buildDocGroupId({ hotelId, category, promptKey }: Pick<BuildIdsInput, "hotelId" | "category" | "promptKey">): string {
    return `${hotelId}:${category}:${promptKey}`;
}

/** Build docId = hotelId:category:promptKey:lang:vN */
export function buildDocId(input: BuildIdsInput): string {
    const v = normalizeVersion(input.version);
    return `${input.hotelId}:${input.category}:${input.promptKey}:${input.lang}:${v}`;
}

/** Upsert filter for a chunk: (docId + chunkIndex) or (docId) if unchunked */
export function getUpsertFilterForChunk(docId: string, chunkIndex?: number) {
    return typeof chunkIndex === "number" ? { docId, chunkIndex } : { docId };
}

/**
 * Example constructor helper for a KBRecord (minimal fields)
 */
export function makeKBRecordMinimal(params: {
    ids: BuildIdsInput;
    text: string;
    chunkIndex?: number;
    chunkCount?: number;
    options?: Partial<Omit<KBRecord,
        | "docId"
        | "docGroupId"
        | "hotelId"
        | "category"
        | "promptKey"
        | "lang"
        | "version"
        | "isCurrent"
        | "text"
    >>;
}): KBRecord {
    const { ids, text, chunkIndex, chunkCount, options } = params;
    const versionTag = normalizeVersion(ids.version);
    const docId = buildDocId(ids);
    const docGroupId = buildDocGroupId(ids);
    const now = new Date().toISOString();

    return {
        docId,
        docGroupId,
        hotelId: ids.hotelId,
        category: ids.category as DocCategory,
        promptKey: ids.promptKey,
        lang: ids.lang,
        version: versionTag,
        isCurrent: true,
        chunkIndex,
        chunkCount,
        text,
        status: "published",
        createdAt: now,
        updatedAt: now,
        ...options,
    };
}

/**
 * Example: business logic to unpublish previous versions for same docGroupId+lang
 * (run this before inserting/upserting a new version as current)
 *
 * await collection.updateMany(
 *   { docGroupId, lang, isCurrent: true, version: { $ne: newVersion } },
 *   { $set: { isCurrent: false, updatedAt: new Date().toISOString() } }
 * );
 */
