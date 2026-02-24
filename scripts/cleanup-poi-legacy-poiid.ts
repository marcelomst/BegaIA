// Path: /root/begasist/scripts/cleanup-poi-legacy-poiid.ts
import { getAstraDB } from "../lib/astra/connection";

const COLLECTION = "poi";

type PoiDoc = {
  _id?: string;
  poiId?: string;
};

function col() {
  return getAstraDB().collection<PoiDoc>(COLLECTION);
}

async function cursorToArray<T>(cursor: any): Promise<T[]> {
  if (!cursor) return [];
  if (Array.isArray(cursor)) return cursor as T[];
  if (typeof cursor.toArray === "function") return (await cursor.toArray()) as T[];
  return [];
}

async function main() {
  const apply = process.argv.includes("--apply");
  const startedAt = Date.now();
  let scanned = 0;
  let withLegacyPoiId = 0;
  let cleaned = 0;
  let failed = 0;

  const cursor = await col().find({ poiId: { $exists: true } } as any, { limit: 5000 } as any);
  const rows = await cursorToArray<PoiDoc>(cursor);

  for (const row of rows) {
    scanned++;
    const id = String(row?._id || "").trim();
    const legacy = String(row?.poiId || "").trim();
    if (!id || !legacy) continue;
    withLegacyPoiId++;

    if (!apply) continue;

    try {
      await col().updateOne(
        { _id: id } as any,
        { $unset: { poiId: "" } } as any
      );
      cleaned++;
    } catch {
      failed++;
    }
  }

  const elapsedMs = Date.now() - startedAt;
  console.log("[poi-cleanup-poiid] done", {
    mode: apply ? "apply" : "dry-run",
    scanned,
    withLegacyPoiId,
    cleaned,
    failed,
    elapsedMs,
  });
}

main().catch((err) => {
  console.error("[poi-cleanup-poiid] error", err);
  process.exit(1);
});
