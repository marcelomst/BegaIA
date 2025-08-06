// Path: /root/begasist/lib/db/reservations.ts

import type { Reservation } from "@/types/reservation";
import { getAstraDB } from "@/lib/astra/connection";

// Nombre de la colección de reservas en Astra. Usa snake_case para coherencia.
const COLLECTION_NAME = "reservations";

function getReservationsCollection() {
  return getAstraDB().collection<Reservation>(COLLECTION_NAME);
}

/**
 * Inserta una nueva reserva en la colección `reservations`.
 * Si ya existe una reserva con el mismo `reservationId` y `hotelId`, será sobrescrita.
 */
export async function saveReservation(reservation: Reservation): Promise<Reservation> {
  const collection = getReservationsCollection();
  await collection.insertOne({ ...reservation });
  return reservation;
}

/**
 * Obtiene una reserva por `hotelId` y `reservationId`. Devuelve `null` si no existe.
 */
export async function getReservation(hotelId: string, reservationId: string): Promise<Reservation | null> {
  const collection = getReservationsCollection();
  return await collection.findOne({ hotelId, reservationId });
}

/**
 * Actualiza los campos de una reserva existente. Sólo se modifican los
 * campos proporcionados en `changes`. La marca `updatedAt` se actualiza automáticamente.
 */
export async function updateReservation(
  hotelId: string,
  reservationId: string,
  changes: Partial<Reservation>
): Promise<void> {
  const collection = getReservationsCollection();
  await collection.updateOne(
    { hotelId, reservationId },
    { $set: { ...changes, updatedAt: new Date().toISOString() } }
  );
}
