// scripts/seed-category-registry.ts
// Lee seeds/category_registry.json y upserta en la colección "category_registry"
// - Modo dry-run por defecto (no escribe)
// - Usar --apply para aplicar cambios
// - Respetar política: no crear colecciones automáticamente; si falta, hacer fallback CQL

import * as fs from "fs";
import * as path from "path";
import { getAstraDB, getCassandraClient } from "../lib/astra/connection";
import type { Client as CassandraClient } from "cassandra-driver";

type SeedEntry = {
    categoryId: string;
    name?: string;
    enabled?: boolean;
    router?: { category: string; promptKey: string };
    retriever?: { topK?: number; filters?: Record<string, any> };
    templates?: Record<string, any>; // se convierte a CategoryTemplates en persistencia
    fallback?: string;
    intents?: any[];
    version?: number;
    updatedBy?: string; // actor que modifica (solo Document API)
};

function parseArgs(argv: string[]) {
    const arr = argv.slice(2);
    const apply = arr.includes("--apply");
    const only = arr.find((a) => a.startsWith("--only="))?.split("=")[1];
    const actor = arr.find((a) => a.startsWith("--actor="))?.split("=")[1];
    return { apply, only, actor };
}

async function main() {
    const { apply, only, actor } = parseArgs(process.argv);
    const file = path.resolve(process.cwd(), "seeds/category_registry.json");
    if (!fs.existsSync(file)) {
        console.error(`❌ No se encontró ${file}.`);
        process.exit(1);
    }
    const raw = fs.readFileSync(file, "utf8");
    const seeds: SeedEntry[] = JSON.parse(raw);
    const entries = only ? seeds.filter((s) => s.categoryId === only) : seeds;
    if (!entries.length) {
        console.log(`ℹ️ No hay entradas para procesar${only ? ` (filtro: ${only})` : ""}.`);
        return;
    }

    const db = await getAstraDB();
    const coll = db.collection("category_registry");
    const nowIso = new Date().toISOString();

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let fallbackCql = false;
    let cqlClient: CassandraClient | null = null; // único cliente CQL reutilizable

    try {
        for (const seed of entries) {
            const { categoryId } = seed;
            // Validación no bloqueante: router vs categoryId
            const [cidCat, cidPk] = String(categoryId).split("/");
            if (seed.router && (seed.router.category !== cidCat || seed.router.promptKey !== cidPk)) {
                console.warn(`⚠️ router/categoryId mismatch for ${categoryId}: router={${seed.router.category}/${seed.router.promptKey}}`);
            }
            try {
                const existing = await coll.findOne({ categoryId });
                if (!existing) {
                    const doc = {
                        categoryId,
                        name: seed.name ?? categoryId.split("/")[1],
                        enabled: seed.enabled ?? true,
                        router: seed.router ?? inferRouter(categoryId),
                        retriever: seed.retriever ?? inferRetriever(categoryId),
                        templates: seed.templates ?? {},
                        fallback: seed.fallback ?? "qa",
                        intents: seed.intents ?? [],
                        version: seed.version ?? 1,
                        createdAt: nowIso,
                        updatedAt: nowIso,
                        ...(seed.updatedBy || actor ? { updatedBy: seed.updatedBy || actor } : {}),
                    };
                    if (apply) {
                        await coll.insertOne(doc as any);
                        created++;
                        console.log(`➕ created (doc): ${categoryId}`);
                    } else {
                        console.log(`📝 DRY create → ${categoryId}`);
                    }
                } else {
                    // merge only known fields; keep existing _id and other system fields
                    const next = {
                        name: seed.name ?? existing.name ?? categoryId.split("/")[1],
                        enabled: typeof seed.enabled === "boolean" ? seed.enabled : (existing.enabled ?? true),
                        router: seed.router ?? existing.router ?? inferRouter(categoryId),
                        retriever: seed.retriever ?? existing.retriever ?? inferRetriever(categoryId),
                        templates: deepMerge(existing.templates || {}, seed.templates || {}),
                        fallback: seed.fallback ?? existing.fallback ?? "qa",
                        intents: Array.isArray(seed.intents) ? seed.intents : (existing.intents ?? []),
                        version: typeof seed.version === "number" ? seed.version : (existing.version ?? 1),
                        updatedAt: nowIso,
                        ...(seed.updatedBy || actor ? { updatedBy: seed.updatedBy || actor } : {}),
                    };

                    // Validación no bloqueante también en update
                    const r = (next as any).router;
                    if (r && (r.category !== cidCat || r.promptKey !== cidPk)) {
                        console.warn(`⚠️ router/categoryId mismatch (update) for ${categoryId}: router={${r.category}/${r.promptKey}}`);
                    }

                    // Compare shallowly to decide if update
                    const willChange = differs(existing, next);
                    if (apply && willChange) {
                        await coll.updateOne({ _id: (existing as any)._id }, { $set: next }, { upsert: true });
                        updated++;
                        console.log(`✏️  updated (doc): ${categoryId}`);
                    } else if (!apply && willChange) {
                        console.log(`📝 DRY update → ${categoryId}`);
                    } else {
                        skipped++;
                        console.log(`⏭️  skip (no changes): ${categoryId}`);
                    }
                }
            } catch (e: any) {
                const msg = String(e?.message || e);
                const shouldFallback = /Collection does not exist/i.test(msg)
                    || /Only columns defined/i.test(msg)
                    || /unknown columns/i.test(msg);
                if (!shouldFallback) throw e;
                fallbackCql = true;

                // Crear cliente CQL una sola vez
                if (!cqlClient) {
                    cqlClient = getCassandraClient();
                    await cqlClient.connect();
                }

                // Check existencia
                const sel = await cqlClient.execute(
                    `SELECT "categoryId" FROM "${process.env.ASTRA_DB_KEYSPACE}"."category_registry" WHERE "categoryId"=? LIMIT 1`,
                    [seed.categoryId],
                    { prepare: true }
                );
                const exists = sel.rowLength > 0;
                if (!exists) {
                    const insValues = {
                        categoryId: seed.categoryId,
                        name: seed.name ?? seed.categoryId.split("/")[1],
                        enabled: seed.enabled ?? true,
                        routerCategory: (seed.router?.category) ?? seed.categoryId.split("/")[0],
                        routerPromptKey: (seed.router?.promptKey) ?? seed.categoryId.split("/")[1],
                        retrieverTopK: seed.retriever?.topK ?? 6,
                        retrieverFilters: JSON.stringify(seed.retriever?.filters ?? inferRetriever(seed.categoryId).filters),
                        intents: seed.intents ?? [],
                        templates: JSON.stringify(seed.templates ?? {}),
                        fallback: seed.fallback ?? "qa",
                        version: seed.version ?? 1,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        // updatedBy omitido en CQL por no existir en schema
                    } as const;

                    if (apply) {
                        await cqlClient.execute(
                            `INSERT INTO "${process.env.ASTRA_DB_KEYSPACE}"."category_registry"
             ("categoryId", name, enabled, "routerCategory", "routerPromptKey", "retrieverTopK", "retrieverFilters", intents, templates, fallback, version, "createdAt", "updatedAt")
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                insValues.categoryId,
                                insValues.name,
                                insValues.enabled,
                                insValues.routerCategory,
                                insValues.routerPromptKey,
                                insValues.retrieverTopK,
                                insValues.retrieverFilters,
                                insValues.intents,
                                insValues.templates,
                                insValues.fallback,
                                insValues.version,
                                insValues.createdAt,
                                insValues.updatedAt,
                            ],
                            { prepare: true }
                        );
                        created++;
                        console.log(`➕ created (cql): ${seed.categoryId}`);
                    } else {
                        console.log(`📝 DRY create (cql) → ${seed.categoryId}`);
                    }
                } else {
                    // CQL update: sólo campos provistos en seed
                    const updValues = {
                        name: seed.name,
                        enabled: seed.enabled,
                        routerCategory: seed.router?.category,
                        routerPromptKey: seed.router?.promptKey,
                        retrieverTopK: seed.retriever?.topK,
                        retrieverFilters: seed.retriever?.filters ? JSON.stringify(seed.retriever?.filters) : undefined,
                        intents: seed.intents,
                        templates: seed.templates ? JSON.stringify(seed.templates) : undefined,
                        fallback: seed.fallback,
                        updatedAt: new Date(),
                        // updatedBy omitido en CQL por no existir en schema
                    } as const;

                    const sets: string[] = [];
                    const vals: any[] = [];
                    for (const [k, v] of Object.entries(updValues)) {
                        if (v === undefined) continue;
                        sets.push(`"${k}"=?`);
                        vals.push(v);
                    }
                    if (sets.length === 0) {
                        skipped++;
                        console.log(`⏭️  skip (no changes, cql): ${seed.categoryId}`);
                    } else if (apply) {
                        await cqlClient.execute(
                            `UPDATE "${process.env.ASTRA_DB_KEYSPACE}"."category_registry" SET ${sets.join(", ")} WHERE "categoryId"=?`,
                            [...vals, seed.categoryId],
                            { prepare: true }
                        );
                        updated++;
                        console.log(`✏️  updated (cql): ${seed.categoryId}`);
                    } else {
                        console.log(`📝 DRY update (cql) → ${seed.categoryId}`);
                    }
                }
            }
        }
    } finally {
        console.log("\n==== Summary ====");
        console.log(`created: ${created}`);
        console.log(`updated: ${updated}`);
        console.log(`skipped: ${skipped}`);
        if (fallbackCql) console.log(`(used CQL fallback for some operations)`);

        // Cerrar cliente CQL si se usó, para evitar que el proceso quede colgado
        if (cqlClient) {
            try {
                await Promise.race([
                    cqlClient.shutdown(),
                    new Promise((_, rej) => setTimeout(() => rej(new Error("CQL shutdown timeout")), 3000)),
                ]);
            } catch (e: any) {
                console.warn(`⚠️  CQL shutdown warning: ${e?.message || e}`);
            }
        }
    }
}

function inferRouter(categoryId: string) {
    const [category, promptKey] = categoryId.split("/");
    return { category, promptKey };
}

function inferRetriever(categoryId: string) {
    const [category, promptKey] = categoryId.split("/");
    return { topK: 6, filters: { category, promptKey, status: "active" } };
}

function deepMerge<T extends Record<string, any>>(a: T, b: T): T {
    const out: Record<string, any> = Array.isArray(a) ? [...(a as any)] : { ...(a || {}) };
    for (const [k, v] of Object.entries(b || {})) {
        if (v && typeof v === "object" && !Array.isArray(v)) {
            out[k] = deepMerge((out[k] || {}) as any, v as any);
        } else {
            out[k] = v;
        }
    }
    return out as T;
}

function differs(existing: any, next: any) {
    const keys = [
        "name",
        "enabled",
        "router",
        "retriever",
        "templates",
        "fallback",
        "intents",
        "version",
    ];
    return keys.some((k) => JSON.stringify(existing?.[k]) !== JSON.stringify((next as any)[k]));
}

main().catch((err) => {
    console.error("❌ Error:", err?.message || err);
    process.exit(1);
});
