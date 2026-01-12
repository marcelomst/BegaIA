// Path: /root/begasist/scripts/inspect-kb-version-index.ts
/**
 * Lista las entradas de version index para un hotel.
 * Uso:
 *   pnpm exec tsx scripts/inspect-kb-version-index.ts --hotel hotel999
 */
import 'dotenv/config';
import { getCassandraClient } from '../lib/astra/connection';

function parseArgs() {
    const a = process.argv.slice(2);
    let hotel = process.env.HOTEL_ID || 'hotel999';
    for (let i = 0; i < a.length; i++) {
        if (a[i] === '--hotel' && a[i + 1]) hotel = a[++i];
    }
    return { hotel };
}

async function main() {
    const { hotel } = parseArgs();
    const ks = process.env.ASTRA_DB_KEYSPACE;
    if (!ks) { console.error('[inspect-version] Falta ASTRA_DB_KEYSPACE'); process.exit(2); }
    const client = getCassandraClient();
    const q = `SELECT "category", "promptKey", lang, "currentVersion", "lastVersion" FROM "${ks}"."hotel_version_index" WHERE "hotelId"='${hotel}' ALLOW FILTERING`;
    const rs = await client.execute(q);
    console.log(`[inspect-version] Registros=${rs.rows.length}`);
    for (const r of rs.rows) {
        console.log(` - ${r['category']}/${r['promptKey']}.${r['lang']} current=${r['currentVersion']} last=${r['lastVersion']}`);
    }
    await client.shutdown().catch(() => { });
}

main().catch(e => { console.error('[inspect-version] ❌ Error:', e); process.exit(1); });
