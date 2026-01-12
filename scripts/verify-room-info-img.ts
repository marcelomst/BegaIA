// Path: /root/begasist/scripts/verify-room-info-img.ts
// pnpm exec tsx scripts/verify-room-info-img.ts --hotelId=hotel999 --lang=es
// Verifica que el documento room_info_img exista y muestra metadatos clave.
import 'dotenv/config';
import { getAstraDB } from '@/lib/astra/connection';

function parseArgs(argv: string[]) {
    const args = argv.slice(2);
    const hotelId = args.find(a => a.startsWith('--hotelId='))?.split('=')[1] || 'hotel999';
    const lang = args.find(a => a.startsWith('--lang='))?.split('=')[1] || 'es';
    return { hotelId, lang };
}

async function main() {
    const { hotelId, lang } = parseArgs(process.argv);
    console.log('[verify-room-info-img] hotelId=', hotelId, 'lang=', lang);
    const db = await getAstraDB();
    const coll = db.collection('hotel_content');
    // Buscamos última versión (ordenamos por version desc si es string tipo vN)
    const docs = await coll
        .find({ hotelId, category: 'retrieval_based', promptKey: 'room_info_img', lang })
        .toArray();
    if (!docs.length) {
        console.log('❌ No se encontró room_info_img para', hotelId, 'lang', lang);
        process.exit(1);
    }
    // Heurística para elegir doc más nuevo: comparar version tag (v2 > v1)
    const pick = docs.reduce((best, curr) => {
        const vBest = String(best.version || best.versionTag || 'v0');
        const vCurr = String(curr.version || curr.versionTag || 'v0');
        return vCurr > vBest ? curr : best;
    }, docs[0]);
    const body: string = pick.body || '';
    console.log('✅ room_info_img encontrado');
    console.log({
        _id: pick._id, hotelId: pick.hotelId, category: pick.category, promptKey: pick.promptKey,
        lang: pick.lang, version: pick.version, title: pick.title,
        bodyChars: body.length,
        bodyPreview: body.slice(0, 280).replace(/\n/g, ' ')
    });
    // Validaciones rápidas del formato esperado
    const hasTipo = /Tipo:\s*/i.test(body);
    const hasImages = /Images:\s*\[/i.test(body);
    if (!hasTipo) console.warn('⚠️ No se detectó bloque Tipo: revisar generación.');
    if (!hasImages) console.warn('⚠️ No se detectó línea Images: (puede faltar imágenes en hotel_config.rooms[*].images).');
    if (hasTipo && hasImages) console.log('🎯 Formato básico OK (Tipo + Images presentes).');
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
