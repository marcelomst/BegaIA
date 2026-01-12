// Path: /root/begasist/scripts/repairVersionIndex.ts
/**
 * Reparación de registros en `hotel_version_index` que tienen currentId/lastId = null.
 * Intenta localizar el documento real en `hotel_content` usando (hotelId, category, promptKey, lang, version).
 * Si lo encuentra, actualiza el índice con el _id real. Si no, genera un id sintético estable.
 * Uso:
 *   pnpm ts-node scripts/repairVersionIndex.ts --hotel hotel999
 * Variables de entorno requeridas para conexión Astra (ver tus helpers existentes):
 *   ASTRA_DB_ID, ASTRA_DB_REGION, ASTRA_DB_APPLICATION_TOKEN, ASTRA_DB_KEYSPACE
 */
import { getAstraDB } from '@/lib/astra/connection';
import { normalizeVersionToTag } from '@/lib/astra/hotelContent';
import { setCurrentVersionInIndex } from '@/lib/astra/hotelVersionIndex';

type Args = { hotel: string };

function parseArgs(): Args {
    const hotelIdx = process.argv.indexOf('--hotel');
    if (hotelIdx === -1 || !process.argv[hotelIdx + 1]) {
        console.error('Falta --hotel <hotelId>');
        process.exit(1);
    }
    return { hotel: process.argv[hotelIdx + 1] };
}

async function main() {
    const { hotel } = parseArgs();
    const db = await getAstraDB();
    const indexCol = db.collection('hotel_version_index');
    const contentCol = db.collection('hotel_content');

    // Traer todos los registros del índice para el hotel
    const cursor = indexCol.find({ hotelId: hotel });
    const all = await cursor.toArray();
    if (!all.length) {
        console.log(`No hay registros en hotel_version_index para hotelId=${hotel}`);
        return;
    }
    let fixed = 0;
    for (const idx of all as any[]) {
        const {
            hotelId,
            category,
            promptKey,
            lang,
            currentVersion,
            lastVersion,
            currentId,
            lastId,
            _id,
        } = idx;
        const curTag = normalizeVersionToTag(currentVersion);
        const lastTag = lastVersion ? normalizeVersionToTag(lastVersion) : null;

        // Buscar current si falta
        let effectiveCurrentId = currentId;
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!effectiveCurrentId) {
            const curDoc = await contentCol.findOne({ hotelId, category, promptKey, lang, version: currentVersion });
            if (curDoc?._id && uuidRe.test(curDoc._id)) {
                effectiveCurrentId = curDoc._id;
            } else {
                effectiveCurrentId = undefined; // mantener null si no es UUID válido
            }
        } else if (!uuidRe.test(effectiveCurrentId)) {
            effectiveCurrentId = undefined; // invalid → null
        }

        // Buscar last si falta y existe lastVersion
        let effectiveLastId = lastId;
        if (lastTag && !effectiveLastId) {
            const lastDoc = await contentCol.findOne({ hotelId, category, promptKey, lang, version: lastVersion });
            if (lastDoc?._id && uuidRe.test(lastDoc._id)) {
                effectiveLastId = lastDoc._id;
            } else {
                effectiveLastId = undefined;
            }
        } else if (effectiveLastId && !uuidRe.test(effectiveLastId)) {
            effectiveLastId = undefined;
        }

        // Si alguno se reparó, actualizar directamente (evitamos la lógica de promoción)
        if (effectiveCurrentId !== currentId || effectiveLastId !== lastId) {
            await indexCol.updateOne({ _id }, { $set: { currentId: effectiveCurrentId ?? null, lastId: effectiveLastId ?? null } });
            fixed++;
            console.log(`Reparado índice ${_id}: currentId=${effectiveCurrentId ?? 'null'} lastId=${effectiveLastId ?? 'null'}`);
        }
    }

    console.log(`Total registros: ${all.length}. Reparados: ${fixed}.`);
    console.log('Fin reparación.');
}

// Ejecutar si se llama directamente
// Ejecutar inmediatamente (ESM no soporta require.main)
main().catch(err => {
    console.error('Error en reparación:', err);
    process.exit(1);
});
