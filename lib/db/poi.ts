// Path: /root/begasist/lib/db/poi.ts
import { getAstraDB } from "@/lib/astra/connection";
import type { POIRecord } from "@/types/poi";

const COLLECTION = "poi";

function col() {
  return getAstraDB().collection<POIRecord>(COLLECTION);
}

export async function upsertPois(
  pois: POIRecord[]
): Promise<{ inserted: number; updated: number; total: number }> {
  if (!Array.isArray(pois) || pois.length === 0) {
    return { inserted: 0, updated: 0, total: 0 };
  }

  let inserted = 0;
  let updated = 0;

  for (const poi of pois) {
    const sourceId = String(poi?.sourceId || "").trim();
    const externalId = poi?.externalId != null ? String(poi.externalId).trim() : "";
    const sourceUrl = String(poi?.sourceUrl || "").trim();
    const startsAt = String(poi?.startsAt || poi?.startDate || "").trim();
    const name = String(poi?.name || "").trim();
    const keyLegacyId = String(poi?._id || "").trim();
    if (!sourceId && !keyLegacyId) continue;

    const toSet: Partial<POIRecord> = { ...poi };
    delete (toSet as any)._id;
    if (externalId) {
      (toSet as any).externalId = externalId;
    }

    let filter: any = null;
    if (sourceId && externalId) {
      filter = { sourceId, externalId };
    } else if (sourceId && sourceUrl && startsAt && name) {
      filter = { sourceId, sourceUrl, startsAt, name };
    } else if (keyLegacyId) {
      filter = { _id: keyLegacyId };
    } else {
      continue;
    }
    const toSetOnInsert: any = {};
    const res: any = await col().updateOne(
      filter,
      { $set: toSet, $setOnInsert: toSetOnInsert },
      { upsert: true }
    );

    if (res?.upsertedId || res?.upsertedCount) {
      inserted++;
    } else if (res?.matchedCount || res?.modifiedCount) {
      updated++;
    } else {
      updated++;
    }
  }

  return { inserted, updated, total: inserted + updated };
}
