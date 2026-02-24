import { getAstraDB } from "@/lib/astra/connection";
import type { POIRecord } from "@/types/poi";

function col() {
  return getAstraDB().collection<POIRecord>("poi");
}

export async function searchAttractions(args: {
  region?: string;
  limit?: number;
}): Promise<POIRecord[]> {
  const region = (args.region || "").trim();
  if (!region) return [];
  const limit = Math.max(1, Math.min(Number(args.limit) || 10, 50));
  // @ts-ignore Astra cursor options
  const cursor = await col().find(
    { type: "attraction", region } as any,
    { limit } as any
  );
  const rows = Array.isArray(cursor) ? cursor : await (cursor?.toArray?.() ?? []);
  return rows.slice(0, limit);
}
