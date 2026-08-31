// Path: /home/marcelo/begasist/lib/db/demoChannelManagerReservations.ts
import { Table } from "@datastax/astra-db-ts";
import { getAstraDB } from "@/lib/astra/connection";
import type { Reservation } from "@/lib/mcp/types";

export const DEMO_CHANNEL_MANAGER_RESERVATIONS_TABLE = "demo_cm_reservations";

type DemoReservationRow = {
  hotel_id: string;
  reservation_id: string;
  room_type: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  check_in_date: string;
  check_out_date: string;
  status: Reservation["status"];
  currency: string;
  price_total?: number;
  created_at: string;
  updated_at: string;
};

type DemoReservationPrimaryKey = Pick<DemoReservationRow, "hotel_id" | "reservation_id">;

// This definition documents the manually provisioned Data API table; it does not create remote infrastructure.
export const DEMO_CHANNEL_MANAGER_RESERVATIONS_SCHEMA = Table.schema({
  columns: {
    hotel_id: "text",
    reservation_id: "text",
    room_type: "text",
    guest_name: "text",
    guest_email: "text",
    guest_phone: "text",
    check_in_date: "text",
    check_out_date: "text",
    status: "text",
    currency: "text",
    price_total: "double",
    created_at: "text",
    updated_at: "text",
  },
  primaryKey: {
    partitionBy: ["hotel_id"],
    partitionSort: { reservation_id: 1 },
  },
});

function getTable() {
  return getAstraDB().table<DemoReservationRow, DemoReservationPrimaryKey>(DEMO_CHANNEL_MANAGER_RESERVATIONS_TABLE);
}

function toRow(reservation: Reservation): DemoReservationRow {
  return {
    hotel_id: reservation.hotelId,
    reservation_id: reservation.reservationId,
    room_type: reservation.roomType,
    guest_name: reservation.guestName,
    guest_email: reservation.guestEmail,
    guest_phone: reservation.guestPhone,
    check_in_date: reservation.checkInDate,
    check_out_date: reservation.checkOutDate,
    status: reservation.status,
    currency: reservation.currency,
    price_total: reservation.priceTotal,
    created_at: reservation.createdAt,
    updated_at: reservation.updatedAt,
  };
}

function toReservation(row: DemoReservationRow | null): Reservation | null {
  if (!row) return null;
  return {
    reservationId: row.reservation_id,
    hotelId: row.hotel_id,
    roomType: row.room_type,
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    guestPhone: row.guest_phone,
    checkInDate: row.check_in_date,
    checkOutDate: row.check_out_date,
    status: row.status,
    currency: row.currency,
    priceTotal: row.price_total,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Durable operational store for the local/demo Channel Manager provider. */
export async function saveDemoChannelManagerReservation(reservation: Reservation): Promise<Reservation> {
  await getTable().insertOne(toRow(reservation));
  return reservation;
}

export async function getDemoChannelManagerReservation(
  hotelId: string,
  reservationId: string,
): Promise<Reservation | null> {
  return toReservation(await getTable().findOne({ hotel_id: hotelId, reservation_id: reservationId }));
}

export async function listDemoChannelManagerReservations(hotelId: string): Promise<Reservation[]> {
  const rows = await getTable().find({ hotel_id: hotelId }).toArray();
  return rows
    .map((row) => toReservation(row))
    .filter((reservation): reservation is Reservation => Boolean(reservation))
    .sort((left, right) => Date.parse(right.updatedAt || right.createdAt) - Date.parse(left.updatedAt || left.createdAt));
}

export async function deleteDemoChannelManagerReservationsForHotel(hotelId: string): Promise<number> {
  const table = getTable();
  const rows = await table.find({ hotel_id: hotelId }).toArray();
  for (const row of rows) await table.deleteOne({ hotel_id: hotelId, reservation_id: row.reservation_id });
  return rows.length;
}
