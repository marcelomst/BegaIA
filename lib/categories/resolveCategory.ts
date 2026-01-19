import { getAstraDB, getCassandraClient } from "@/lib/astra/connection";
import type { CategoryRegistry } from "@/types/categoryRegistry";
import type { CategoryOverrides } from "@/types/categoryOverrides";
import type { CategoryResolved } from "@/types/categoryResolved";
import type { HotelContent } from "@/types/hotelContent";
import type { PromptType } from "@/types/prompt";

type CategoryResolvedInternal = Omit<CategoryResolved, "debug" | "content"> & {
    content?: {
        id?: string;
        hotelId: string;
        category: string;
        promptKey: string;
        lang: string;
        version: string | number;
        type?: PromptType;
        title?: string;
        body?: string;
        raw?: Record<string, any>;
    };
    debug?: {
        reason?: string;
        sources?: Array<"registry" | "override" | "hotel_content" | "fallback_system" | "version_index">;
    };
};

/**
 * Lee un registro de category_registry por categoryId.
 * No crea colecciones. Si no existe, devuelve null.
 */
async function getCategoryRegistry(categoryId: string): Promise<CategoryRegistry | null> {
    const db = await getAstraDB();
    const coll = db.collection<CategoryRegistry>("category_registry");
    try {
        const doc = await coll.findOne({ categoryId });
        return doc ?? null;
    } catch (e: any) {
        const msg = String(e?.message || e);
        if (/Collection does not exist/i.test(msg)) {
            try {
                const client = getCassandraClient();
                const res = await client.execute(
                    `SELECT "categoryId", name, enabled, "routerCategory", "routerPromptKey", "retrieverTopK", "retrieverFilters",
                            intents, templates, fallback, "createdAt", "updatedAt", version
                     FROM "${process.env.ASTRA_DB_KEYSPACE}"."category_registry" WHERE "categoryId"=? LIMIT 1`,
                    [categoryId],
                    { prepare: true }
                );
                const row = res.first();
                if (!row) return null;
                const rawFilters = row.get("retrieverFilters");
                let retrieverFilters: Record<string, string> | undefined = undefined;
                if (rawFilters) {
                    try {
                        retrieverFilters = typeof rawFilters === "string" ? JSON.parse(rawFilters) : rawFilters;
                    } catch {
                        retrieverFilters = undefined;
                    }
                }
                return {
                    categoryId: row.get("categoryId"),
                    name: row.get("name") ?? undefined,
                    enabled: row.get("enabled") ?? undefined,
                    routerCategory: row.get("routerCategory") ?? undefined,
                    routerPromptKey: row.get("routerPromptKey") ?? undefined,
                    retrieverTopK: row.get("retrieverTopK") ?? undefined,
                    retrieverFilters,
                    intents: row.get("intents") ?? undefined,
                    templates: row.get("templates") ?? undefined,
                    fallback: row.get("fallback") ?? undefined,
                    createdAt: row.get("createdAt") ?? undefined,
                    updatedAt: row.get("updatedAt") ?? undefined,
                    version: row.get("version") ?? undefined,
                } as CategoryRegistry;
            } catch {
                return null;
            }
        }
        throw e;
    }
}

/**
 * Lee un override por hotel y categoryId.
 */
async function getCategoryOverride(hotelId: string, categoryId: string): Promise<CategoryOverrides | null> {
    // 1) Intentar vía Document API (colección category_overrides)
    try {
        const db = await getAstraDB();
        const coll = db.collection<CategoryOverrides>("category_overrides");
        const doc = await coll.findOne({ hotelId, categoryId });
        if (doc) return doc;
    } catch (e: any) {
        const msg = String(e?.message || e);
        if (!/Collection does not exist/i.test(msg)) {
            // si es otro error, propagar
            throw e;
        }
        // si no existe la colección, probamos CQL más abajo
    }

    // 2) Fallback: CQL table "category_overrides" (PRIMARY KEY ((hotelId), categoryId))
    try {
        const client = getCassandraClient();
        const query = `SELECT hotelId, categoryId, enabled, preferLang, preferVersion, preferContentId,
                              routerOverrideCategory, routerOverridePromptKey,
                              retrieverOverrideTopK, retrieverOverrideFilters,
                              notes, createdAt, updatedAt
                       FROM "${process.env.ASTRA_DB_KEYSPACE}"."category_overrides"
                       WHERE "hotelId" = ? AND "categoryId" = ? LIMIT 1`;
        const res = await client.execute(query, [hotelId, categoryId], { prepare: true });
        const row = res.first();
        if (!row) return null;
        const record: CategoryOverrides = {
            hotelId: row.get("hotelId"),
            categoryId: row.get("categoryId"),
            enabled: row.get("enabled") ?? undefined,
            preferLang: row.get("preferLang") ?? undefined,
            preferVersion: row.get("preferVersion") ?? undefined,
            preferContentId: row.get("preferContentId") ?? undefined,
            routerOverrideCategory: row.get("routerOverrideCategory") ?? undefined,
            routerOverridePromptKey: row.get("routerOverridePromptKey") ?? undefined,
            retrieverOverrideTopK: row.get("retrieverOverrideTopK") ?? undefined,
            // map<text,text> → JS object
            retrieverOverrideFilters: row.get("retrieverOverrideFilters") ? Object.fromEntries(row.get("retrieverOverrideFilters").entries()) : undefined,
            notes: row.get("notes") ?? undefined,
            createdAt: row.get("createdAt") ?? undefined,
            updatedAt: row.get("updatedAt") ?? undefined,
        };
        return record;
    } catch (e) {
        // Si falla CQL, devolvemos null para no romper flujo (mejor fallback a defaults)
        return null;
    }
}

/**
 * Lee el índice de versión vigente (hotel_version_index).
 */
async function getVersionIndex(args: {
    hotelId: string;
    category: string;
    promptKey: string;
    lang: string;
}): Promise<{
    currentVersion?: string;
    currentId?: string;
} | null> {
    const db = await getAstraDB();
    const coll = db.collection("hotel_version_index");
    try {
        const doc = await coll.findOne({
            hotelId: args.hotelId,
            category: args.category,
            promptKey: args.promptKey,
            lang: args.lang,
        });
        return doc ? { currentVersion: (doc as any).currentVersion, currentId: (doc as any).currentId } : null;
    } catch (e: any) {
        const msg = String(e?.message || e);
        if (/Collection does not exist/i.test(msg)) {
            return null;
        }
        throw e;
    }
}

/**
 * Lee un contenido específico en hotel_content por _id.
 */
async function getHotelContentById(id: string): Promise<HotelContent | null> {
    const db = await getAstraDB();
    const coll = db.collection<HotelContent>("hotel_content");
    try {
        const doc = await coll.findOne({ _id: { $eq: id } } as any);
        return doc ?? null;
    } catch (e: any) {
        const msg = String(e?.message || e);
        if (/Collection does not exist/i.test(msg)) {
            return null;
        }
        throw e;
    }
}

/**
 * Busca en hotel_content por hotelId/category/promptKey/lang/(version?),
 * con fallback al hotelId="system".
 */
async function getHotelContentEffective(args: {
    hotelId: string;
    category: string;
    promptKey: string;
    lang: string;
    version?: string;
}): Promise<HotelContent | null> {
    const db = await getAstraDB();
    const coll = db.collection<HotelContent>("hotel_content");

    const query: any = {
        hotelId: args.hotelId,
        category: args.category,
        promptKey: args.promptKey,
        lang: args.lang,
    };
    if (args.version) {
        query.version = args.version;
    }

    try {
        const hotelDoc = await coll.findOne(query);
        if (hotelDoc) return hotelDoc;

        // fallback: system
        const sysDoc = await coll.findOne({
            hotelId: "system",
            category: args.category,
            promptKey: args.promptKey,
            lang: args.lang,
        } as any);
        if (sysDoc) return sysDoc;

        return null;
    } catch (e: any) {
        const msg = String(e?.message || e);
        if (/Collection does not exist/i.test(msg)) {
            return null;
        }
        throw e;
    }
}

/**
 * Resolver TODO en un solo objeto.
 */
export async function resolveCategoryForHotel(opts: {
    hotelId: string;
    category: string;
    promptKey: string;
    desiredLang?: string;
}): Promise<CategoryResolvedInternal> {
    const { hotelId, category, promptKey, desiredLang } = opts;
    const categoryId = `${category}/${promptKey}`;

    // 1) leer registry (global)
    const registry = await getCategoryRegistry(categoryId);

    // 2) leer override (por hotel)
    const override = await getCategoryOverride(hotelId, categoryId);

    // 3) idioma final
    const lang =
        override?.preferLang ??
        desiredLang ??
        "es";

    const registryRouter = registry?.router ?? {};
    const registryRetriever = registry?.retriever ?? {};
    const registryRetrieverFilters = (() => {
        const raw = registryRetriever.filters ?? registry?.retrieverFilters;
        if (raw && typeof raw === "string") {
            try {
                return JSON.parse(raw);
            } catch {
                return undefined;
            }
        }
        return raw;
    })() as Record<string, string> | undefined;

    // 4) routing final
    const router = {
        category: override?.routerOverrideCategory ?? registryRouter?.category ?? registry?.routerCategory ?? category,
        promptKey: override?.routerOverridePromptKey ?? registryRouter?.promptKey ?? registry?.routerPromptKey ?? promptKey,
    };

    // 5) retriever final (merge simple)
    const baseFilters: Record<string, string> = {
        // aseguramos que si alguien no puso filtros, igual filtramos por la categoría
        category,
        promptKey,
    };
    const retriever = {
        topK: override?.retrieverOverrideTopK ?? registryRetriever?.topK ?? registry?.retrieverTopK ?? 6,
        filters: {
            ...(registryRetrieverFilters ?? {}),
            ...(override?.retrieverOverrideFilters ?? {}),
            ...baseFilters,
        },
    };

    // 6) contenido efectivo
    //    prioridad:
    //    a) override.preferContentId
    //    b) override.preferVersion
    //    c) version index
    //    d) primer contenido hotel
    let content: HotelContent | null = null;
    let sources: Array<"registry" | "override" | "hotel_content" | "fallback_system" | "version_index"> = [];

    if (registry) sources.push("registry");
    if (override) sources.push("override");

    if (override?.preferContentId) {
        const doc = await getHotelContentById(override.preferContentId);
        if (doc) {
            content = doc;
            sources.push("hotel_content");
        }
    }

    if (!content && override?.preferVersion) {
        const doc = await getHotelContentEffective({
            hotelId,
            category,
            promptKey,
            lang,
            version: override.preferVersion,
        });
        if (doc) {
            content = doc;
            sources.push("hotel_content");
        }
    }

    // si todavía no hay contenido, usamos version_index
    if (!content) {
        const idx = await getVersionIndex({ hotelId, category, promptKey, lang });
        if (idx?.currentId) {
            const doc = await getHotelContentById(idx.currentId);
            if (doc) {
                content = doc;
                sources.push("version_index");
                sources.push("hotel_content");
            }
        } else if (idx?.currentVersion) {
            const doc = await getHotelContentEffective({
                hotelId,
                category,
                promptKey,
                lang,
                version: idx.currentVersion,
            });
            if (doc) {
                content = doc;
                sources.push("version_index");
                sources.push("hotel_content");
            }
        }
    }

    // último fallback: hotel_content (hotel) o system
    if (!content) {
        const doc = await getHotelContentEffective({
            hotelId,
            category,
            promptKey,
            lang,
        });
        if (doc) {
            content = doc;
            sources.push(doc.hotelId === "system" ? "fallback_system" : "hotel_content");
        }
    }

    return {
        categoryId,
        hotelId,
        enabled: registry?.enabled ?? true,
        registry: registry ?? undefined,
        override: override ?? undefined,
        router,
        retriever,
        lang,
        content: content
            ? {
                id: (content as any)._id ?? (content as any).id,
                hotelId: content.hotelId,
                category: content.category,
                promptKey: content.promptKey,
                lang: content.lang,
                version: content.version,
                type: content.type,
                title: (content as any).title,
                body: content.body,
                raw: content as any,
            }
            : undefined,
        debug: {
            reason: content ? "resolved" : "no-content",
            sources,
        },
    };
}
