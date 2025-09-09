// Path: /root/begasist/lib/schemas/reservation.ts
import { z } from "zod";

/**
 * 🎯 Slots mínimos para consultar disponibilidad y crear reserva.
 * - Fechas en ISO-8601 (validación estricta).
 * - guests > 0
 * - roomType flexible (el LLM normaliza).
 * - locale en ISO 639-3 (como pediste).
 */
export const reservationSlotsSchema = z.object({
  guestName: z.string().min(2, "Nombre muy corto"),
  roomType: z.string().min(3, "Tipo de habitación requerido"),
  guests: z.number().int().positive("Cantidad de huéspedes inválida"),
  checkIn: z.string().datetime("checkIn debe ser ISO-8601"),
  checkOut: z.string().datetime("checkOut debe ser ISO-8601"),
  locale: z.string().length(3, "Usar código ISO 639-3"),
});

export type ReservationSlots = z.infer<typeof reservationSlotsSchema>;

export function validateBusinessRules(slots: ReservationSlots) {
  const inDate = new Date(slots.checkIn).getTime();
  const outDate = new Date(slots.checkOut).getTime();
  if (!(inDate < outDate)) {
    throw new Error("La fecha de check-out debe ser posterior al check-in.");
  }
}
