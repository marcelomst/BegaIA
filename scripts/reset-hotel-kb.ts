// Path: /root/begasist/scripts/reset-hotel-kb.ts
/**
 * Reset completo del conocimiento de un hotel (vector + tablas CQL) en un solo comando.
 * Basado en la lógica de `wipe-hotel-data.ts` pero expuesto como script único.
 * No elimina ni recrea colecciones/tablas: solo borra datos del hotel.
 *
 * Uso:
 *   pnpm exec tsx scripts/reset-hotel-kb.ts --hotel hotel999        (dry-run)
 *   pnpm exec tsx scripts/reset-hotel-kb.ts --hotel hotel999 --apply (ejecuta borrado)
 */
import 'dotenv/config';
import { getCassandraClient, getHotelAstraCollection } from '../lib/astra/connection';

type Parsed = { hotel: string; apply: boolean };

function parseArgs(): Parsed {
    const args = process.argv.slice(2);
    let hotel = process.env.HOTEL_ID || 'hotel999';
    let apply = false;
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '--hotel' && args[i + 1]) { hotel = args[++i]; continue; }
        if (a === '--apply') { apply = true; continue; }
    }
    return { hotel, apply };
}

async function wipeVector(hotelId: string, apply: boolean) {
    const col = getHotelAstraCollection<any>(hotelId);
    const count = await col.countDocuments({ hotelId }, 1_000_000);
    console.log(`[reset] Vector ${hotelId}_collection → ${count} docs`);
    if (!apply) { console.log('[reset] Vector DRY-RUN'); return; }
    try {
        const res = await col.deleteMany({ hotelId });
        console.log(`[reset] Vector ✅ eliminados: ${res?.deletedCount ?? 0}`);
    } catch (e: any) {
        console.error('[reset] Vector ❌ error:', e?.message || e);
    }
}

async function wipeTables(hotelId: string, apply: boolean) {
    const client = getCassandraClient();
    const ks = process.env.ASTRA_DB_KEYSPACE!;
    const tables: Array<{ name: string; pkFallback?: (row: any) => any[]; sel?: string }> = [
        {
            name: 'hotel_text_collection',
            sel: `SELECT "originalName", version, "chunkIndex" FROM "${ks}"."hotel_text_collection" WHERE "hotelId"=? ALLOW FILTERING`,
            pkFallback: (row) => [row.get('originalName'), row.get('version'), row.get('chunkIndex') ?? 0],
        },
        {
            name: 'hotel_content',
            sel: `SELECT category, "promptKey", lang, version FROM "${ks}"."hotel_content" WHERE "hotelId"=? ALLOW FILTERING`,
            pkFallback: (row) => [row.get('category'), row.get('promptKey'), row.get('lang'), row.get('version')],
        },
        {
            name: 'hotel_version_index',
            sel: `SELECT category, "promptKey", lang FROM "${ks}"."hotel_version_index" WHERE "hotelId"=? ALLOW FILTERING`,
            pkFallback: (row) => [row.get('category'), row.get('promptKey'), row.get('lang')],
        },
    ];

    for (const t of tables) {
        console.log(`[reset] CQL ${t.name} → DELETE WHERE "hotelId"='${hotelId}'`);
        if (!apply) continue;
        try {
            const del = `DELETE FROM "${ks}"."${t.name}" WHERE "hotelId"=?`;
            await client.execute(del, [hotelId], { prepare: true });
            console.log(`[reset] CQL ${t.name} ✅ borrado por partition key`);
        } catch (e: any) {
            const msg = String(e?.message || e);
            console.warn(`[reset] CQL ${t.name} ↪ fallback (${msg})`);
            if (!t.sel || !t.pkFallback) continue;
            try {
                const rs = await client.execute(t.sel, [hotelId], { prepare: true });
                let n = 0;
                for (const row of rs.rows) {
                    const parts = t.pkFallback(row);
                    try {
                        let q = '';
                        if (t.name === 'hotel_text_collection') {
                            q = `DELETE FROM "${ks}"."${t.name}" WHERE "hotelId"=? AND "originalName"=? AND version=? AND "chunkIndex"=?`;
                        } else if (t.name === 'hotel_content') {
                            q = `DELETE FROM "${ks}"."${t.name}" WHERE "hotelId"=? AND category=? AND "promptKey"=? AND lang=? AND version=?`;
                        } else if (t.name === 'hotel_version_index') {
                            q = `DELETE FROM "${ks}"."${t.name}" WHERE "hotelId"=? AND category=? AND "promptKey"=? AND lang=?`;
                        }
                        await client.execute(q, [hotelId, ...parts], { prepare: true });
                        n++;
                    } catch (ee: any) {
                        console.error(`[reset] CQL ${t.name} ❌ fila fallback:`, ee?.message || ee);
                    }
                }
                console.log(`[reset] CQL ${t.name} ✅ fallback filas borradas: ${n}`);
            } catch (ee: any) {
                console.error(`[reset] CQL ${t.name} ❌ fallback total:`, ee?.message || ee);
            }
        }
    }
    await client.shutdown().catch(() => { });
}

async function main() {
    const { hotel, apply } = parseArgs();
    console.log(`[reset] HotelId=${hotel} mode=${apply ? 'APPLY' : 'DRY-RUN'}`);
    await wipeVector(hotel, apply);
    await wipeTables(hotel, apply);
    if (!apply) console.log('[reset] DRY-RUN ✅ Sin cambios. Usa --apply para ejecutar.');
    else console.log('[reset] ✅ Reset completo finalizado.');
}

main().catch(e => { console.error(e); process.exit(1); });
