// Wipes all KB-related data for a given hotelId without dropping collections/tables.
// It preserves the collection structures to respect the "no auto-create" policy.
// Targets:
// - Vector collection: <hotelId>_collection (Document API) → deleteMany({ hotelId })
// - CQL tables: hotel_text_collection, hotel_content, hotel_version_index → DELETE WHERE "hotelId" = ?
//
// Usage:
//   pnpm exec tsx scripts/wipe-hotel-data.ts --hotel hotel999 [--apply]

import "dotenv/config";
import { getCassandraClient, getHotelAstraCollection } from "../lib/astra/connection";

function parseArgs() {
    const args = process.argv.slice(2);
    const out: Record<string, string | boolean> = {};
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === "--apply") { out.apply = true; continue; }
        if (a === "--hotel") { out.hotel = args[++i]; continue; }
    }
    return out as { hotel?: string; apply?: boolean };
}

async function wipeVectorCollection(hotelId: string, apply: boolean) {
    const vecCol = getHotelAstraCollection<any>(hotelId);
    const count = await vecCol.countDocuments({ hotelId }, 1_000_000);
    console.log(`[wipe] Vector ${hotelId}_collection → ${count} docs del hotel`);
    if (!apply) {
        console.log(`[wipe] Vector DRY-RUN — omitiendo deleteMany`);
        return;
    }
    try {
        const res = await vecCol.deleteMany({ hotelId });
        console.log(`[wipe] Vector ✅ eliminados: ${res?.deletedCount ?? 0}`);
    } catch (e: any) {
        console.error(`[wipe] Vector ❌ error al eliminar:`, e?.message || e);
    }
}

async function wipeCqlTables(hotelId: string, apply: boolean) {
    const client = getCassandraClient();
    const ks = process.env.ASTRA_DB_KEYSPACE!;

    const tables = [
        "hotel_text_collection",
        "hotel_content",
        "hotel_version_index",
    ];

    for (const t of tables) {
        const qualified = `"${ks}"."${t}"`;
        // We can't reliably count without schema knowledge; log intent and delete by partition key.
        console.log(`[wipe] CQL ${t} → DELETE WHERE "hotelId"='${hotelId}'`);
        if (!apply) { continue; }
        try {
            const q = `DELETE FROM ${qualified} WHERE "hotelId" = ?`;
            await client.execute(q, [hotelId], { prepare: true });
            console.log(`[wipe] CQL ${t} ✅ eliminado por hotelId`);
        } catch (e: any) {
            const msg = String(e?.message || e);
            console.warn(`[wipe] CQL ${t} ↪ fallback por clave compuesta (${msg})`);
            // Fallback: listar claves con ALLOW FILTERING y borrar fila por fila con PK completa
            try {
                if (t === "hotel_text_collection") {
                    const sel = `SELECT "originalName", version, "chunkIndex" FROM ${qualified} WHERE "hotelId" = ? ALLOW FILTERING`;
                    const rs = await client.execute(sel, [hotelId], { prepare: true });
                    let n = 0;
                    for (const row of rs.rows) {
                        const originalName = row.get("originalName");
                        const version = row.get("version");
                        const chunkIndex = row.get("chunkIndex") ?? 0;
                        try {
                            const del = `DELETE FROM ${qualified} WHERE "hotelId" = ? AND "originalName" = ? AND version = ? AND "chunkIndex" = ?`;
                            await client.execute(del, [hotelId, originalName, version, chunkIndex], { prepare: true });
                            n++;
                        } catch (ee: any) {
                            console.error(`[wipe] CQL ${t} ❌ al borrar fila (${originalName}, ${version}, ${chunkIndex}):`, ee?.message || ee);
                        }
                    }
                    console.log(`[wipe] CQL ${t} ✅ borradas ${n} filas por clave completa`);
                } else if (t === "hotel_content" || t === "hotel_version_index") {
                    const sel = `SELECT category, "promptKey", lang FROM ${qualified} WHERE "hotelId" = ? ALLOW FILTERING`;
                    const rs = await client.execute(sel, [hotelId], { prepare: true });
                    let n = 0;
                    for (const row of rs.rows) {
                        const category = row.get("category");
                        const promptKey = row.get("promptKey");
                        const lang = row.get("lang");
                        try {
                            const del = `DELETE FROM ${qualified} WHERE "hotelId" = ? AND category = ? AND "promptKey" = ? AND lang = ?`;
                            await client.execute(del, [hotelId, category, promptKey, lang], { prepare: true });
                            n++;
                        } catch (ee: any) {
                            console.error(`[wipe] CQL ${t} ❌ al borrar fila (${category}, ${promptKey}, ${lang}):`, ee?.message || ee);
                        }
                    }
                    console.log(`[wipe] CQL ${t} ✅ borradas ${n} filas por clave completa`);
                }
            } catch (ee: any) {
                console.error(`[wipe] CQL ${t} ❌ fallback falló:`, ee?.message || ee);
            }
        }
    }

    await client.shutdown().catch(() => { });
}

async function main() {
    const { hotel: hotelIdArg, apply } = parseArgs();
    const hotelId = hotelIdArg || process.env.HOTEL_ID || "hotel999";

    console.log(`[wipe] Objetivo hotelId=${hotelId} (use --apply para ejecutar cambios)`);

    await wipeVectorCollection(hotelId, !!apply);
    await wipeCqlTables(hotelId, !!apply);

    if (!apply) {
        console.log("[wipe] DRY-RUN ✅ No se realizaron cambios. Agregá --apply para ejecutar.");
    } else {
        console.log("[wipe] ✅ Limpieza completada (colección vectorial + tablas CQL)");
    }
}

main().catch((e) => { console.error(e); process.exit(1); });
