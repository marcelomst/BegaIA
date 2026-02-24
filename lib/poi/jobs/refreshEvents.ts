// Path: /root/begasist/lib/poi/jobs/refreshEvents.ts
import { fetchQueHacemosHoyEvents } from "../sources/queHacemosHoy";
import { upsertPois } from "../../db/poi";

export async function refreshEventsJob(): Promise<{
  fetched: number;
  inserted: number;
  updated: number;
  total: number;
}> {
  try {
    const events = await fetchQueHacemosHoyEvents();
    const fetched = events.length;
    const { inserted, updated, total } = await upsertPois(events);
    console.log(`[POI] refreshEventsJob fetched=${fetched} inserted=${inserted} updated=${updated} total=${total}`);
    return { fetched, inserted, updated, total };
  } catch (err) {
    console.error("[POI] refreshEventsJob error", err);
    throw err;
  }
}
