// Path: /root/begasist/types/reservation.ts

import type { Channel } from "./channel";

/**
 * Posibles estados de una reserva gestionada por Begaia.
 * Estos valores son internos al asistente y se usan para
 * determinar el flujo de conversación, no sustituyen a
 * los estados del PMS o del Channel Manager.
 */
export type ReservationStatus =
  | "pending"     // La reserva fue solicitada pero aún no confirmada
  | "confirmed"   // La reserva está confirmada
  | "modified"    // La reserva ha sido modificada después de la confirmación
  | "cancelled";  // La reserva fue cancelada por el huésped o el hotel

/**
 * Representa la información mínima de una reserva que necesita Begaia
 * para contextualizar conversaciones y eventos.  No pretende replicar
 * todas las propiedades de la reserva en el PMS, sino mantener un
 * índice ligero que permita identificar rápidamente la reserva y su
 * estado actual.  Los campos adicionales pueden almacenarse en
 * `meta` según sea necesario (por ejemplo, el ID en la OTA, notas
 * especiales del huésped, etc.).
 */
export interface Reservation {
  /** Identificador único de la reserva */
  reservationId: string;
  /** Identificador del hotel al que pertenece la reserva */
  hotelId: string;
  /** Identificador del huésped asociado */
  guestId: string;
  /** Canal desde el que se originó o se gestiona la reserva */
  channel: Channel;
  /** Estado actual de la reserva en el contexto de Begaia */
  status: ReservationStatus;
  /** Fecha de check‑in (formato YYYY‑MM‑DD) */
  checkInDate: string;
  /** Fecha de check‑out (formato YYYY‑MM‑DD) */
  checkOutDate: string;
  /** Tipo de habitación solicitada (opcional) */
  roomType?: string;
  /** Número de huéspedes (opcional) */
  numGuests?: number;
  /** Precio total de la reserva (opcional) */
  totalPrice?: number;
  /** Moneda del precio total (opcional) */
  currency?: string;
  /**
   * Campo para almacenar información adicional sin estructura fija,
   * como el identificador de la reserva en la OTA, observaciones o
   * datos específicos del Channel Manager.
   */
  meta?: Record<string, any>;
  /** Fecha y hora de creación del registro en Begaia */
  createdAt: string;
  /** Fecha y hora de la última actualización (opcional) */
  updatedAt?: string;
}
