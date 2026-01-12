// Path: /root/begasist/lib/astra/hotelVersionIndex.ts
import { getAstraDB, getCassandraClient } from "./connection";
import type { HotelVersionIndex } from "@/types/hotelContent";
import {
  normalizeVersionToNumber,
  normalizeVersionToTag,
} from "./hotelContent";

/**
 * Documento en Astra:
 * - Usa tu tipo público HotelVersionIndex
 * - Añade _id (Astra) y updatedAt
 * - Guarda metacampos derivados para conveniencia
 */
type HotelVersionIndexDb = HotelVersionIndex & {
  _id: string;                   // generado por Astra
  updatedAt: string;             // ISO
  currentVersionTag?: string | null;
  currentVersionNumber?: number | null;
  lastVersionTag?: string | null;
  lastVersionNumber?: number | null;
  // currentId/lastId quedan deprecados: aceptamos null y no los gestionamos.
};

const COLLECTION_NAME = "hotel_version_index";

/**
 * Upsert por clave lógica (hotelId, category, promptKey, lang).
 * Promueve current* y desplaza a last*.
 * currentId y lastId usan el _id real de Astra de hotel_content.
 */
export async function setCurrentVersionInIndex(params: {
  hotelId: string;
  category: string;
  promptKey: string;
  lang: string;
  currentVersion: string | number;
  // currentId deprecado: se ignora (lookup se basa solo en clave lógica + currentVersion)
  currentId?: string;
}) {
  const { hotelId, category, promptKey, lang } = params;
  const col = getAstraDB().collection<HotelVersionIndexDb>(COLLECTION_NAME);
  const now = new Date().toISOString();

  const currentVersionTag = normalizeVersionToTag(params.currentVersion);
  const currentVersionNumber = normalizeVersionToNumber(params.currentVersion);
  // Validar UUID (CQL define columnas uuid). Si el id no es UUID, lo dejamos undefined para que persista como null.
  // Ignorar currentId: dejamos null para columnas uuid si existen.
  const effectiveCurrentId = undefined;
  const filter = { hotelId, category, promptKey, lang };

  try {
    const existing = await col.findOne(filter);

    if (!existing) {
      const doc: Omit<HotelVersionIndexDb, "_id"> = {
        hotelId, category, promptKey, lang,
        currentVersion: params.currentVersion,
        lastVersion: undefined,
        currentId: undefined,
        lastId: undefined,
        updatedAt: now,
        currentVersionTag,
        currentVersionNumber,
        lastVersionTag: null,
        lastVersionNumber: null,
      };
      const ins: any = await col.insertOne(doc);
      return { id: ins?.insertedId || ins?._id || ins?.id, created: true };
    }

    const updated: Partial<HotelVersionIndexDb> = {
      lastVersion: existing.currentVersion ?? null,
      lastId: undefined,
      lastVersionTag:
        existing.currentVersionTag ??
        normalizeVersionToTag(existing.currentVersion ?? null),
      lastVersionNumber:
        existing.currentVersionNumber ??
        normalizeVersionToNumber(existing.currentVersion ?? null),
      currentVersion: params.currentVersion,
      currentId: undefined,
      currentVersionTag,
      currentVersionNumber,
      updatedAt: now,
    };

    await col.updateOne({ _id: existing._id }, { $set: updated }, { upsert: true });
    return { id: existing._id, created: false };
  } catch (e: any) {
    const msg = String(e?.message || e);
    const shouldFallback = /Collection does not exist/i.test(msg)
      || /Only columns defined/i.test(msg)
      || /unknown columns/i.test(msg);
    if (!shouldFallback) throw e;
    // Fallback CQL
    const client = getCassandraClient();
    // Leer existente
    const sel = await client.execute(
      `SELECT "currentVersion", "currentId", "lastVersion", "lastId" FROM "${process.env.ASTRA_DB_KEYSPACE}"."hotel_version_index"
       WHERE "hotelId"=? AND category=? AND "promptKey"=? AND lang=? LIMIT 1`,
      [hotelId, category, promptKey, lang], { prepare: true }
    );
    const row = sel.first();
    const lastVersion = row ? (row.get("currentVersion") as string | null) : null;
    const lastId = row ? (row.get("currentId") as any) : null;

    await client.execute(
      `INSERT INTO "${process.env.ASTRA_DB_KEYSPACE}"."hotel_version_index"
       ("hotelId", category, "promptKey", lang, "currentVersion", "currentId", "lastVersion", "lastId")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [hotelId, category, promptKey, lang, params.currentVersion as any, null, lastVersion ?? null, null],
      { prepare: true }
    );
    return { id: undefined as any, created: !row };
  }
}

export async function getCurrentVersionFromIndex(
  hotelId: string,
  category: string,
  promptKey: string,
  lang: string
) {
  const col = getAstraDB().collection<HotelVersionIndexDb>(COLLECTION_NAME);
  return col.findOne({ hotelId, category, promptKey, lang });
}
