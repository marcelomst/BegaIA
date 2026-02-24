import { getAstraDB } from "@/lib/astra/connection";

const COLLECTION = "poi";

function col() {
  return getAstraDB().collection<any>(COLLECTION);
}

async function cursorToArray<T>(cursor: any): Promise<T[]> {
  if (!cursor) return [];
  if (Array.isArray(cursor)) return cursor as T[];
  if (typeof cursor.toArray === "function") return (await cursor.toArray()) as T[];
  return [];
}

async function hasDoc(id: string): Promise<boolean> {
  const cursor = await col().find({ _id: id }, { limit: 1 } as any);
  const rows = await cursorToArray<any>(cursor);
  return rows.length > 0;
}

async function main() {
  const startedAt = Date.now();
  let scanned = 0;
  let migrated = 0;
  let collisions = 0;
  let cleaned = 0;
  let skipped = 0;

  const cursor = await col().find({}, { limit: 1000 } as any);
  const iterable =
    cursor && typeof cursor[Symbol.asyncIterator] === "function"
      ? (cursor as AsyncIterable<any>)
      : (async function* () {
          const rows = await cursorToArray<any>(cursor);
          for (const row of rows) yield row;
        })();

  for await (const doc of iterable) {
    scanned++;
    const id = doc?._id ? String(doc._id) : "";
    const legacy = doc?.poiId ? String(doc.poiId) : "";
    if (!legacy) continue;
    if (!id) {
      skipped++;
      console.warn("[poi-migrate] doc sin _id, skip", { legacy });
      continue;
    }

    if (id === legacy) {
      await col().updateOne({ _id: id }, { $unset: { poiId: "" } } as any);
      cleaned++;
      continue;
    }

    if (await hasDoc(legacy)) {
      collisions++;
      console.warn("[poi-migrate] collision", { id, legacy });
      continue;
    }

    const next = { ...doc, _id: legacy };
    delete (next as any).poiId;
    await col().insertOne(next);
    await col().deleteOne({ _id: id } as any);
    migrated++;
  }

  const elapsedMs = Date.now() - startedAt;
  console.log("[poi-migrate] done", { scanned, migrated, cleaned, collisions, skipped, elapsedMs });
}

main().catch((err) => {
  console.error("[poi-migrate] error", err);
  process.exit(1);
});
