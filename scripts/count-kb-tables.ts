// Path: /root/begasist/scripts/count-kb-tables.ts
/**
 * Cuenta filas por hotel en tablas de KB: hotel_text_collection, hotel_content, hotel_version_index.
 * Uso:
 *   pnpm exec tsx scripts/count-kb-tables.ts --hotel hotel999
 */
import 'dotenv/config';
import { getCassandraClient } from '../lib/astra/connection';

function parseArgs() {
    const a = process.argv.slice(2);
    let hotel = process.env.HOTEL_ID || 'hotel999';
    for (let i = 0; i < a.length; i++) {
        if (a[i] === '--hotel' && a[i + 1]) { hotel = a[++i]; }
    }
    return { hotel };
}

async function main() {
    const { hotel } = parseArgs();
    const ks = process.env.ASTRA_DB_KEYSPACE;
    if (!ks) {
        console.error('[count-kb] ❌ Falta ASTRA_DB_KEYSPACE en entorno');
        process.exit(2);
    }
    const client = getCassandraClient();
    const tables = ['hotel_text_collection', 'hotel_content', 'hotel_version_index'];
    console.log(`[count-kb] hotelId=${hotel} keyspace=${ks}`);
    for (const t of tables) {
        try {
            const q = `SELECT COUNT(*) FROM "${ks}"."${t}" WHERE "hotelId"='${hotel}' ALLOW FILTERING`;
            const rs = await client.execute(q);
            const countVal = rs.rows[0]['count'];
            console.log(`${t}: ${countVal}`);
        } catch (e: any) {
            console.error(`[count-kb] Error en ${t}:`, e.message || e);
        }
    }
    await client.shutdown().catch(() => { });
}

main().catch(e => { console.error('[count-kb] ❌ Error general:', e); process.exit(1); });
