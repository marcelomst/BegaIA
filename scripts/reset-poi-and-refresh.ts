// Path: /root/begasist/scripts/reset-poi-and-refresh.ts
import { getAstraDB } from "../lib/astra/connection";
import { refreshEventsJob } from "../lib/poi/jobs/refreshEvents";

async function main() {
  const col = getAstraDB().collection("poi");
  console.log("[POI] reset: deleting all documents in collection poi...");
  const res: any = await col.deleteMany({});
  const deleted = res?.deletedCount ?? res?.deleted ?? 0;
  console.log(`[POI] reset: deleted=${deleted}`);

  const metrics = await refreshEventsJob();
  console.log("[POI] reset: refresh done", metrics);
}

main().catch((err) => {
  console.error("[POI] reset error", err);
  process.exit(1);
});
