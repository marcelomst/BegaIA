// Path: /root/begasist/lib/astra/bootstrap.ts
import { getAstraDB } from "@/lib/astra/connection";

/**
 * Modo manual: verifica que existan colecciones Document API.
 * Si falta alguna, arroja un error descriptivo (NO crea nada).
 */
export async function assertAstraCollectionsExist(names: string[]) {
    const db = await getAstraDB();
    const listed = await db.listCollections().catch((e: any) => {
        throw new Error(`No se pudo listar colecciones en Astra: ${e?.message || e}`);
    });

    // listCollections devuelve un array de descriptores { name: string, ... }
    const existing = new Set((Array.isArray(listed) ? listed : []).map((c: any) => c.name));
    const missing = names.filter((n) => !existing.has(n));

    if (missing.length) {
        throw new Error(
            `Faltan colecciones en Astra: ${missing.join(
                ", "
            )}. Crealas manualmente en el keyspace configurado.`
        );
    }
}

/**
 * Crea (si faltan) las colecciones documentales indicadas.
 * Idempotente: si alguna ya existe, se la saltea.
 */
export async function ensureAstraCollections(names: string[]) {
    const db = await getAstraDB();
    const listed = await db.listCollections().catch((e: any) => {
        throw new Error(`No se pudo listar colecciones en Astra: ${e?.message || e}`);
    });
    const existing = new Set((Array.isArray(listed) ? listed : []).map((c: any) => c.name));
    const missing = names.filter((n) => !existing.has(n));
    for (const name of missing) {
        try {
            await (db as any).createCollection(name);
        } catch (e: any) {
            const msg = String(e?.message || e);
            if (/already exists/i.test(msg)) continue;
            throw new Error(`No se pudo crear la colección "${name}": ${msg}`);
        }
    }
}
