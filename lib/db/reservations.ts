// Path: /root/begasist/lib/db/reservations.ts
import type { Reservation } from "@/types/reservation";
import { getAstraDB } from "@/lib/astra/connection";

const COLLECTION_NAME = "reservations";

type ReservationDoc = Reservation & { _id?: string };

function getReservationsCollection() {
  return getAstraDB().collection<ReservationDoc>(COLLECTION_NAME);
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

/**
 * Upsert idempotente por _id = `${hotelId}:${reservationId}`
 * IMPORTANTE: no incluir _id en $set.
 */
export async function saveReservation(reservation: Reservation): Promise<Reservation> {
  const col = getReservationsCollection();
  const _id = `${reservation.hotelId}:${reservation.reservationId}`;
  const toSet: Partial<ReservationDoc> = {
    ...reservation,
    updatedAt: new Date().toISOString(),
  };
  await col.updateOne({ _id }, { $set: toSet } as any, { upsert: true });
  return reservation;
}

/**
 * Lectura por _id compuesto, con fallback a { hotelId, reservationId } para docs antiguos.
 */
export async function getReservation(hotelId: string, reservationId: string): Promise<Reservation | null> {
  const col = getReservationsCollection();

  let doc = await col.findOne({ _id: `${hotelId}:${reservationId}` });
  if (!doc) doc = await col.findOne({ hotelId, reservationId });
  if (!doc) return null;

  const { _id, ...rest } = doc;
  return rest as Reservation;
}

/**
 * Upsert de cambios (por si llega "modified" antes de "created").
 * IMPORTANTE: no incluir _id en $set. Se prunean undefined para evitar writes vacíos y errores TS.
 */
export async function updateReservation(
  hotelId: string,
  reservationId: string,
  changes: Partial<Reservation>
): Promise<void> {
  const col = getReservationsCollection();
  const _id = `${hotelId}:${reservationId}`;
  const toSet: Partial<ReservationDoc> = pruneUndefined<ReservationDoc>({
    ...(changes as Partial<ReservationDoc>),
    hotelId,
    reservationId,
    updatedAt: new Date().toISOString(),
  });
  await col.updateOne({ _id }, { $set: toSet } as any, { upsert: true });
}
