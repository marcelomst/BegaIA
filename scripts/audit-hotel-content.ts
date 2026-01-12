// Path: /root/begasist/scripts/audit-hotel-content.ts
// pnpm exec tsx scripts/audit-hotel-content.ts --hotelId=hotel999 --limit=30
// Lista documentos en la colección hotel_content mostrando metadatos clave.
import 'dotenv/config';
import { getAstraDB } from '@/lib/astra/connection';

function parseArgs(argv: string[]) {
    const args = argv.slice(2);
    const hotelId = args.find(a => a.startsWith('--hotelId='))?.split('=')[1] || 'hotel999';
    const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '30', 10);
    const filterCat = args.find(a => a.startsWith('--category='))?.split('=')[1];
    const filterPrompt = args.find(a => a.startsWith('--prompt='))?.split('=')[1];
    return { hotelId, limit, filterCat, filterPrompt };
}

function trunc(s: string | undefined, n: number) {
    if (!s) return '';
    return s.length <= n ? s : s.slice(0, n) + '…';
}

async function main() {
    const { hotelId, limit, filterCat, filterPrompt } = parseArgs(process.argv);
    console.log(`[audit-hotel-content] hotelId=${hotelId} limit=${limit}`);
    const db = await getAstraDB();
    const coll = db.collection('hotel_content');
    const query: Record<string, any> = { hotelId };
    if (filterCat) query.category = filterCat;
    if (filterPrompt) query.promptKey = filterPrompt;

    const docs = await coll.find(query).toArray();
    if (!docs.length) {
        console.log('⚠️ Sin documentos para criterios.');
        return;
    }
    // Ordenar por category/promptKey/lang/version
    docs.sort((a: any, b: any) => {
        const ak = `${a.category}/${a.promptKey}/${a.lang}/${a.version}`;
        const bk = `${b.category}/${b.promptKey}/${b.lang}/${b.version}`;
        return ak.localeCompare(bk);
    });

    console.log(`Total documentos: ${docs.length}`);
    for (const d of docs.slice(0, limit)) {
        const body: string = d.body || ''; // almacenado raw (tokens o expandido)
        console.log({
            id: d._id,
            category: d.category,
            promptKey: d.promptKey,
            lang: d.lang,
            version: d.version,
            title: d.title,
            chars: body.length,
            preview: trunc(body.replace(/\n/g, ' '), 140)
        });
    }
    // Resumen por categoría/promptKey
    const summary: Record<string, number> = {};
    for (const d of docs) {
        const key = `${d.category}/${d.promptKey}`;
        summary[key] = (summary[key] || 0) + 1;
    }
    console.log('\nResumen:');
    Object.entries(summary).sort(([a], [b]) => a.localeCompare(b)).forEach(([k, v]) => console.log(`${k}: ${v}`));
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
