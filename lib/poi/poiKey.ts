// Path: /root/begasist/lib/poi/poiKey.ts
import { createHash } from "crypto";

export function buildPoiKey(args: {
  sourceId: string;
  sourceUrl?: string;
  externalId?: string;
}): string {
  const { sourceId, sourceUrl, externalId } = args;
  const basis = externalId ? `${sourceId}:${externalId}` : `${sourceId}:${sourceUrl || ""}`;
  return createHash("sha1").update(basis).digest("hex");
}
