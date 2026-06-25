// Path: /root/begasist/lib/schemas/reservation.ts
import { z } from "zod";

export const CANONICAL_ROOM_TYPES = [
  "single",
  "double",
  "triple",
  "quadruple",
  "twin",
  "suite",
] as const;

export type CanonicalRoomType = typeof CANONICAL_ROOM_TYPES[number];

const ROOM_TYPE_ALIAS_MAP: Record<string, CanonicalRoomType> = {
  single: "single",
  simple: "single",
  individual: "single",
  double: "double",
  doble: "double",
  duplo: "double",
  matrimonial: "double",
  triple: "triple",
  triplo: "triple",
  quadruple: "quadruple",
  cuadruple: "quadruple",
  familiar: "quadruple",
  twin: "twin",
  suite: "suite",
};

function normalizeRoomTypeLexicalInput(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ROOM_TYPE_PATTERNS = Object.entries(ROOM_TYPE_ALIAS_MAP)
  .sort((a, b) => b[0].length - a[0].length)
  .map(([alias, canonical]) => ({
    canonical,
    pattern: new RegExp(`(?:^|[^\\p{L}])${escapeRegex(alias)}(?=$|[^\\p{L}])`, "u"),
  }));

export function canonicalizeRoomType(rt?: string): CanonicalRoomType | undefined {
  const normalized = normalizeRoomTypeLexicalInput(String(rt || ""));
  if (!normalized) return undefined;
  const matches = new Set<CanonicalRoomType>();
  for (const entry of ROOM_TYPE_PATTERNS) {
    if (entry.pattern.test(normalized)) matches.add(entry.canonical);
  }
  if (matches.size !== 1) return undefined;
  return Array.from(matches)[0];
}

export function maxGuestsForRoomType(roomType?: string): number {
  const canonical = canonicalizeRoomType(roomType);
  switch (canonical) {
    case "single":
      return 1;
    case "double":
    case "twin":
      return 2;
    case "triple":
      return 3;
    case "quadruple":
    case "suite":
      return 4;
    default:
      return 4;
  }
}

/**
 * 🎯 Slots mínimos para consultar disponibilidad y crear reserva.
 * - Fechas en ISO-8601 (validación estricta).
 * - guests > 0 (y <= capacidad por tipo de habitación si se reconoce).
 * - roomType flexible (el LLM normaliza).
 * - locale en ISO 639-1 ("es" | "en" | "pt").
 */
export const reservationSlotsSchema = z.object({
  guestName: z.string().min(2, "Nombre muy corto"),
  roomType: z.string()
    .transform((value) => canonicalizeRoomType(value))
    .refine((value): value is CanonicalRoomType => typeof value === "string", "Tipo de habitación requerido"),
  numGuests: z.number().int().positive("Cantidad de huéspedes inválida").optional(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "checkIn debe ser YYYY-MM-DD"),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "checkOut debe ser YYYY-MM-DD"),
  locale: z.string().length(2, "Usar código ISO 639-1"),
});

export type ReservationSlots = z.infer<typeof reservationSlotsSchema>;

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
