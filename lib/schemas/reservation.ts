// Path: /root/begasist/lib/schemas/reservation.ts
import { z } from "zod";

/**
 * 🎯 Slots mínimos para consultar disponibilidad y crear reserva.
 * - Fechas en ISO-8601 (validación estricta).
 * - guests > 0 (y <= capacidad por tipo de habitación si se reconoce).
 * - roomType flexible (el LLM normaliza).
 * - locale en ISO 639-1 ("es" | "en" | "pt").
 */
export const reservationSlotsSchema = z.object({
  guestName: z.string().min(2, "Nombre muy corto"),
  roomType: z.string().min(3, "Tipo de habitación requerido"),
  numGuests: z.number().int().positive("Cantidad de huéspedes inválida").optional(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "checkIn debe ser YYYY-MM-DD"),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "checkOut debe ser YYYY-MM-DD"),
  locale: z.string().length(2, "Usar código ISO 639-1"),
});

export type ReservationSlots = z.infer<typeof reservationSlotsSchema>;

/** Capacidad sugerida por tipo de habitación (normalizada). */
const ROOM_CAPACITY: Record<string, number> = {
  single: 1,
  individual: 1,
  simple: 1,
  double: 2,
  doble: 2,
  matrimonial: 2,
  twin: 2,
  triple: 3,
  suite: 4,
  familiar: 4,
};
const DEFAULT_MAX_GUESTS = 4;

/** Normaliza el tipo de habitación a una clave conocida para capacidad. */
function normalizeRoomType(rt: string): string {
  const t = (rt || "").toLowerCase();
  if (/single|individual|simple/.test(t)) return "single";
  if (/double|doble|matrimonial/.test(t)) return "double";
  if (/twin/.test(t)) return "twin";
  if (/triple/.test(t)) return "triple";
  if (/suite/.test(t)) return "suite";
  if (/familiar|family/.test(t)) return "familiar";
  return t; // si no matchea, devolvemos tal cual
}

/** Inicio del día (00:00:00) en la TZ del servidor. */
function startOfTodayMs() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Normaliza una fecha (Date o ISO) a "YYYY-MM-DD" en una TZ dada.
function ymdInTz(d: Date | string, tz: string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(dt);
  const y = parts.find(p => p.type === "year")?.value ?? "0000";
  const m = parts.find(p => p.type === "month")?.value ?? "01";
  const day = parts.find(p => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${day}`;
}

export function validateBusinessRules(
  slots: ReservationSlots,
  localeIso6391: "es" | "en" | "pt" = "es",
  hotelTz: string = "UTC"
) {
  const toMs = (iso: string) => new Date(iso).getTime();
  const inDate = toMs(slots.checkIn);
  const outDate = toMs(slots.checkOut);
  if (!(inDate < outDate)) {
    throw new Error("La fecha de check-out debe ser posterior al check-in.");
  }
  // "Hoy" con TZ del hotel, a medianoche local
  const nowTz = new Date(
    new Date().toLocaleString("en-US", { timeZone: hotelTz })
  );
  const todayLocal = new Date(
    nowTz.getFullYear(), nowTz.getMonth(), nowTz.getDate()
  ).getTime();
  if (inDate < todayLocal) {
    throw new Error(
      localeIso6391 === "es"
        ? "La fecha de check-in no puede ser anterior a hoy."
        : localeIso6391 === "pt"
          ? "A data de check-in não pode ser anterior a hoje."
          : "Check-in date cannot be in the past."
    );
  }
}
