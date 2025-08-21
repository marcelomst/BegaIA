// Path: /root/begasist/lib/db/cmEvents.ts
import type { CmEvent, CmEventStatus } from "@/types/cmEvent";
import { getAstraDB } from "@/lib/astra/connection";

const COLLECTION_NAME = "cm_events";
type CmEventDoc = CmEvent & { _id?: string };

function getCmEventsCollection() {
  return getAstraDB().collection<CmEventDoc>(COLLECTION_NAME);
}

// Acepta parciales y devuelve parciales sin undefined
function pruneUndefined<T extends Record<string, any>>(obj: Partial<T>): Partial<T> {
  const out: Record<string, any> = {};
  for (const k in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    const v = (obj as any)[k];
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

/** Log idempotente por _id = `${hotelId}:${eventId}` (sin _id en $set). */
export async function logCmEvent(event: CmEvent): Promise<CmEvent> {
  const col = getCmEventsCollection();
  const _id = `${event.hotelId}:${event.eventId}`;
  const toSet: Partial<CmEventDoc> = pruneUndefined<CmEventDoc>({ ...event });
  await col.updateOne({ _id }, { $set: toSet } as any, { upsert: true });
  return event;
}

/** Update de estado con upsert (sin _id en $set). */
export async function updateCmEventStatus(
  hotelId: string,
  eventId: string,
  status: CmEventStatus,
  processedAt?: string,
  error?: string
): Promise<void> {
  const col = getCmEventsCollection();
  const _id = `${hotelId}:${eventId}`;
  const toSet: Partial<CmEventDoc> = pruneUndefined<CmEventDoc>({
    status,
    processedAt,
    error,
    hotelId,
    eventId,
  });
  await col.updateOne({ _id }, { $set: toSet } as any, { upsert: true });
}
