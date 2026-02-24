import { getAstraDB } from "@/lib/astra/connection";
import { buildPlaceKeyFromPoi } from "@/lib/poi/placeKey";
import type { POIRecord } from "@/types/poi";

const COLLECTION = "poi";

type POIWithAudit = POIRecord & { updatedAt?: string; updatedBy?: string };

function col() {
  return getAstraDB().collection<POIWithAudit>(COLLECTION);
}

async function cursorToArray<T>(cursor: any): Promise<T[]> {
  if (!cursor) return [];
  if (Array.isArray(cursor)) return cursor as T[];
  if (typeof cursor.toArray === "function") return (await cursor.toArray()) as T[];
  return [];
}

function buildNextLocation(loc: POIRecord["location"] | undefined, locality: string) {
  if (loc) return { ...loc, locality };
  return { country: "Uruguay", adminArea1: "Maldonado", locality };
}

export async function setEventLocalityById(
  id: string,
  locality: string,
  meta: { updatedBy: string }
): Promise<{ ok: true; matched: number; updated: number }> {
  if (!id || !locality) throw new Error("setEventLocalityById: id y locality requeridos");
  const now = new Date().toISOString();
  const cursor = await col().find({ _id: id, type: "event" } as any, { limit: 1 } as any);
  const rows = await cursorToArray<POIWithAudit>(cursor);
  const doc = rows[0];
  if (!doc) return { ok: true, matched: 0, updated: 0 };

  const nextLocation = buildNextLocation(doc.location, locality);
  const res: any = await col().updateOne(
    { _id: doc._id, type: "event" } as any,
    { $set: { location: nextLocation, updatedAt: now, updatedBy: meta.updatedBy } } as any
  );
  const matched = typeof res?.matchedCount === "number" ? res.matchedCount : 1;
  const updated = typeof res?.modifiedCount === "number" ? res.modifiedCount : matched;
  return { ok: true, matched, updated };
}

export async function propagateLocalityById(
  id: string,
  locality: string,
  meta: { updatedBy: string }
): Promise<{ ok: true; matched: number; updated: number }> {
  if (!id || !locality) throw new Error("propagateLocalityById: id y locality requeridos");
  const now = new Date().toISOString();
  const baseCursor = await col().find({ _id: id, type: "event" } as any, { limit: 1 } as any);
  const baseRows = await cursorToArray<POIWithAudit>(baseCursor);
  const base = baseRows[0];
  if (!base) return { ok: true, matched: 0, updated: 0 };

  const baseKey = buildPlaceKeyFromPoi({ location: base.location, name: base.name });
  if (!baseKey) return { ok: true, matched: 0, updated: 0 };

  let rows: POIWithAudit[] = [];
  try {
    const cursor = await col().find(
      { sourceId: "quehacemoshoy", type: "event" } as any,
      { limit: 300 } as any
    );
    rows = await cursorToArray<POIWithAudit>(cursor);
  } catch {
    const cursor = await col().find({ type: "event" } as any, { limit: 300 } as any);
    rows = (await cursorToArray<POIWithAudit>(cursor)).filter(
      (r) => r?.sourceId === "quehacemoshoy"
    );
  }

  const matched = rows.filter((r) => {
    const key = buildPlaceKeyFromPoi({ location: r.location, name: r.name });
    return key && key === baseKey;
  });

  let updated = 0;
  for (const doc of matched) {
    if (!doc?._id) continue;
    const nextLocation = buildNextLocation(doc.location, locality);
    const res: any = await col().updateOne(
      { _id: doc._id, type: "event" } as any,
      { $set: { location: nextLocation, updatedAt: now, updatedBy: meta.updatedBy } } as any
    );
    const didUpdate = typeof res?.modifiedCount === "number" ? res.modifiedCount > 0 : true;
    if (didUpdate) updated++;
  }

  return { ok: true, matched: matched.length, updated };
}
