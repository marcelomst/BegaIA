// Path: /root/begasist/lib/retrieval/versions.ts
import { getAstraDB } from "@/lib/astra/connection";

/**
 * Calcula la próxima versión tipo "vN" para el par (hotelId, promptKey, lang) dentro de la colección vectorial del hotel.
 * Si no hay coincidencias previas, devuelve "v1".
 */
export async function getNextVersionForCollection(
    db: any,
    args: { hotelId: string; category?: string; promptKey?: string; lang?: string }
): Promise<string> {
    const { hotelId, promptKey, lang } = args;
    const coll = db.collection(`${hotelId}_collection`);

    const filter: Record<string, any> = { hotelId };
    if (promptKey) filter.promptKey = promptKey;
    if (lang) filter.targetLang = lang;

    const docs = await coll.find(filter, { projection: { version: 1 } }).toArray();
    let max = 0;
    for (const d of docs) {
        const m = (d?.version || '').toString().match(/^v(\d+)$/i);
        if (m) {
            const n = parseInt(m[1], 10);
            if (Number.isFinite(n) && n > max) max = n;
        }
    }
    return `v${max + 1}`;
}
