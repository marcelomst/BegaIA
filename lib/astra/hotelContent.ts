// Path: /root/begasist/lib/astra/hotelContent.ts
import { getAstraDB, getCassandraClient } from "./connection";
import type { HotelContent } from "@/types/hotelContent";

/**
 * Helpers de versión: aceptamos string|number y derivamos:
 *  - tag: "vN"
 *  - number: N
 */
export function normalizeVersionToTag(v: string | number | null | undefined): string {
  if (v == null) return "v1";
  if (typeof v === "number") return `v${v}`;
  const m = v.match(/^v(\d+)$/i);
  if (m) return `v${m[1]}`;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? `v${n}` : "v1";
}
export function normalizeVersionToNumber(v: string | number | null | undefined): number {
  if (v == null) return 1;
  if (typeof v === "number") return v;
  const m = v.match(/^v(\d+)$/i);
  if (m) return parseInt(m[1], 10);
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 1;
}

/**
 * Documento almacenado en Astra:
 * - Respeta tu tipo público HotelContent
 * - Añade _id + timestamps
 * - versionTag/versionNumber son metacampos derivados para consultas
 */
export type HotelContentDb = HotelContent & {
  _id: string;             // generado por Astra
  createdAt: string;       // ISO
  updatedAt: string;       // ISO
  versionTag?: string;     // "vN" (derivado)
  versionNumber?: number;  // N   (derivado)
};

const COLLECTION_NAME = "hotel_content";

/**
 * Upsert por clave lógica (hotelId, category, promptKey, lang, version).
 * Si existe → actualiza; si no → inserta.
 * Devuelve el `_id` generado por Astra y metadatos de versión normalizados.
 */
export async function upsertHotelContent(doc: HotelContent) {
  const col = getAstraDB().collection<HotelContentDb>(COLLECTION_NAME);
  const now = new Date().toISOString();

  const versionTag = normalizeVersionToTag(doc.version);
  const versionNumber = normalizeVersionToNumber(doc.version);

  // Filtro de unicidad lógica
  const filter = {
    hotelId: doc.hotelId,
    category: doc.category,
    promptKey: doc.promptKey,
    lang: doc.lang,
    version: doc.version,
  };

  try {
    const existing = await col.findOne(filter);

    if (existing) {
      await col.updateOne(
        { _id: existing._id },
        {
          $set: {
            ...doc,
            updatedAt: now,
            versionTag,
            versionNumber,
          },
          $setOnInsert: {
            createdAt: existing.createdAt ?? now,
          },
        },
        { upsert: true }
      );
      return { id: existing._id, versionTag, versionNumber, created: false };
    }

    // Insertar nuevo documento
    const toInsert: Omit<HotelContentDb, "_id"> = {
      ...doc,
      createdAt: now,
      updatedAt: now,
      versionTag,
      versionNumber,
    };

    const ins: any = await col.insertOne(toInsert);
    const insertedId: string | undefined = ins?.insertedId || ins?._id || ins?.id;
    if (insertedId) {
      return { id: insertedId, versionTag, versionNumber, created: true };
    }

    const inserted = await col.findOne(filter);
    if (!inserted?._id) {
      throw new Error("No se pudo recuperar _id del registro en hotel_content");
    }
    return { id: inserted._id, versionTag, versionNumber, created: true };
  } catch (e: any) {
    const msg = String(e?.message || e);
    const shouldFallback = /Collection does not exist/i.test(msg)
      || /Only columns defined/i.test(msg)
      || /unknown columns/i.test(msg);
    if (!shouldFallback) throw e;
    // Fallback CQL: upsert por PK lógica
    const client = getCassandraClient();
    await client.execute(
      `INSERT INTO "${process.env.ASTRA_DB_KEYSPACE}"."hotel_content"
       ("hotelId", category, "promptKey", lang, version, body, "createdAt", title, type, "updatedAt")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        doc.hotelId,
        doc.category,
        doc.promptKey,
        doc.lang,
        versionTag,
        doc.body ?? null,
        now,
        (doc as any).title ?? null,
        doc.type ?? null,
        now,
      ],
      { prepare: true }
    );
    // En CQL no hay _id; devolvemos sin id
    return { id: undefined as any, versionTag, versionNumber, created: true };
  }
}

export async function getHotelContent(
  hotelId: string,
  category: string,
  promptKey: string,
  lang: string,
  version: string | number
) {
  const col = getAstraDB().collection<HotelContentDb>(COLLECTION_NAME);
  return col.findOne({ hotelId, category, promptKey, lang, version });
}

export async function listHotelContentVersions(
  hotelId: string,
  category: string,
  promptKey: string,
  lang: string
) {
  const col = getAstraDB().collection<HotelContentDb>(COLLECTION_NAME);
  return col
    .find({ hotelId, category, promptKey, lang })
    .toArray();
}
