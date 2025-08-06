// Path: /root/begasist/lib/db/cmEvents.ts

import type { CmEvent, CmEventStatus } from "@/types/cmEvent";
import { getAstraDB } from "@/lib/astra/connection";

// Nombre de la colección en Astra que almacena los eventos del Channel Manager.
const COLLECTION_NAME = "cm_events";

function getCmEventsCollection() {
  return getAstraDB().collection<CmEvent>(COLLECTION_NAME);
}

/**
 * Registra un nuevo evento proveniente del Channel Manager.
 * Si ya existe un documento con el mismo `eventId` y `hotelId`, se sobrescribe.
 */
export async function logCmEvent(event: CmEvent): Promise<CmEvent> {
  const collection = getCmEventsCollection();
  await collection.insertOne({ ...event });
  return event;
}

/**
 * Actualiza el estado de un evento ya almacenado en la colección `cm_events`.
 * También se puede actualizar la fecha de procesamiento o el error.
 * Se filtra por `hotelId` y `eventId` para evitar colisiones entre hoteles.
 */
export async function updateCmEventStatus(
  hotelId: string,
  eventId: string,
  status: CmEventStatus,
  processedAt?: string,
  error?: string
): Promise<void> {
  const collection = getCmEventsCollection();
  const updates: Partial<CmEvent> = { status };
  if (processedAt) updates.processedAt = processedAt;
  if (error) updates.error = error;
  await collection.updateOne(
    { hotelId, eventId },
    { $set: updates }
  );
}
