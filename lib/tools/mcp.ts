// Path: /root/begasist/lib/tools/mcp.ts
import { z } from "zod";
import type { Reservation } from "@/lib/mcp/types";

/**
 * 🧰 Contratos “MCP” (tools) con schemas Zod.
 * Estos wrappers llaman a tu endpoint actual (MCP_ENDPOINT).
 * Si mañana cambiás a SiteMinder/Beds24, solo cambiás acá.
 */

const ENDPOINT = process.env.MCP_ENDPOINT || "";
const API_KEY = process.env.MCP_API_KEY || "";
const MOCK_PORT = process.env.MCP_MOCK_PORT || "3000";
const DEBUG = process.env.MCP_DEBUG === "1";

// ===== Schemas de I/O =====
export const CheckAvailabilityInput = z.object({
  hotelId: z.string(),
  roomType: z.string().optional(),
  guests: z.number().int().positive().optional(),
  checkIn: z.string().datetime().optional(),
  checkOut: z.string().datetime().optional(),
});
export type CheckAvailabilityInput = z.infer<typeof CheckAvailabilityInput>;

export const CheckAvailabilityOutput = z.object({
  ok: z.boolean(),
  available: z.boolean().optional(),
  options: z.array(z.object({
    roomType: z.string(),
    pricePerNight: z.number().optional(),
    currency: z.string().optional(),
    policies: z.string().optional(),
    availability: z.number().int().nonnegative().optional(),
  })).optional(),
  error: z.string().optional(),
  toolCall: z.any().optional(), // Permite persistir el toolCall si está presente
});
export type CheckAvailabilityOutput = z.infer<typeof CheckAvailabilityOutput>;

export const CreateReservationInput = z.object({
  hotelId: z.string(),
  guestName: z.string(),
  roomType: z.string(),
  guests: z.number().int().positive(),
  checkIn: z.string().datetime(),
  checkOut: z.string().datetime(),
  channel: z.string().default("web"),
});
export type CreateReservationInput = z.infer<typeof CreateReservationInput>;

const ReservationResult = z.object({
  reservationId: z.string().trim().min(1),
  hotelId: z.string().trim().min(1),
  roomType: z.string(),
  guestName: z.string(),
  guestEmail: z.string().nullish().transform((value) => value ?? undefined),
  guestPhone: z.string().nullish().transform((value) => value ?? undefined),
  numGuests: z.number().int().positive().nullable(),
  checkInDate: z.string(),
  checkOutDate: z.string(),
  status: z.enum(["confirmed", "cancelled", "pending"]),
  currency: z.string(),
  priceTotal: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateReservationOutput = z.object({
  ok: z.boolean(),
  reservationId: z.string().optional(),
  reservation: ReservationResult.optional(),
  status: z.enum(["created", "error"]).optional(),
  error: z.string().optional(),
});
export type CreateReservationOutput = z.infer<typeof CreateReservationOutput>;

// === Sprint 3: modificar / cancelar ===
export const UpdateReservationInput = z.object({
  hotelId: z.string(),
  reservationId: z.string(),
  roomType: z.string().optional(),
  guests: z.number().int().positive().optional(),
  quoteId: z.string().optional(),
  quoteVersion: z.string().optional(),
  checkIn: z.string().datetime().optional(),
  checkOut: z.string().datetime().optional(),
  channel: z.string().default("web").optional(),
});
export type UpdateReservationInput = z.infer<typeof UpdateReservationInput>;

export const QuoteReservationModificationInput = UpdateReservationInput.pick({
  hotelId: true, reservationId: true, roomType: true, guests: true, checkIn: true, checkOut: true,
});
export type QuoteReservationModificationInput = z.infer<typeof QuoteReservationModificationInput>;

export const UpdateReservationOutput = z.object({
  ok: z.boolean(),
  status: z.enum(["updated"]).optional(),
  reservation: ReservationResult.optional(),
  error: z.string().optional(),
});
export type UpdateReservationOutput = z.infer<typeof UpdateReservationOutput>;

export const CancelReservationInput = z.object({
  hotelId: z.string(),
  reservationId: z.string(),
});
export type CancelReservationInput = z.infer<typeof CancelReservationInput>;

export const CancelReservationOutput = z.object({
  ok: z.boolean(),
  status: z.enum(["cancelled"]).optional(),
  error: z.string().optional(),
});
export type CancelReservationOutput = z.infer<typeof CancelReservationOutput>;

type ReservationSlotsLike = Partial<{
  guestName: string;
  roomType: string;
  guests: number;
  numGuests: number | string;
  checkIn: string;
  checkOut: string;
  checkInDate: string;
  checkOutDate: string;
}>;

function coerceGuests(slots: ReservationSlotsLike): number | undefined {
  const raw = slots.guests ?? slots.numGuests;
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return Math.floor(n);
}

type SlotsMapperAction =
  | "searchAvailability"
  | "createReservation"
  | "updateReservation";

export function slotsToMcpParams(
  action: SlotsMapperAction,
  payload: { hotelId: string; slots: ReservationSlotsLike; reservationId?: string; channel?: string }
): Record<string, unknown> {
  const hotelId = String(payload.hotelId ?? "").trim();
  if (!hotelId) throw new Error("slotsToMcpParams: missing hotelId");
  const slots = payload.slots ?? {};
  const roomType = typeof slots.roomType === "string" && slots.roomType.trim() ? slots.roomType.trim() : undefined;
  const guests = coerceGuests(slots);
  const checkInDate =
    (typeof slots.checkInDate === "string" && slots.checkInDate.trim() ? slots.checkInDate.trim() : undefined) ??
    (typeof slots.checkIn === "string" && slots.checkIn.trim() ? slots.checkIn.trim() : undefined);
  const checkOutDate =
    (typeof slots.checkOutDate === "string" && slots.checkOutDate.trim() ? slots.checkOutDate.trim() : undefined) ??
    (typeof slots.checkOut === "string" && slots.checkOut.trim() ? slots.checkOut.trim() : undefined);

  if (action === "searchAvailability") {
    return {
      hotelId,
      roomType,
      guests,
      startDate: checkInDate,
      endDate: checkOutDate,
    };
  }

  if (action === "createReservation") {
    return {
      hotelId,
      guestName: typeof slots.guestName === "string" ? slots.guestName : undefined,
      roomType,
      guests,
      checkInDate,
      checkOutDate,
      channel: payload.channel,
    };
  }

  return {
    hotelId,
    reservationId: payload.reservationId,
    roomType,
    guests,
    checkInDate,
    checkOutDate,
    channel: payload.channel,
  };
}

function resolveMcpUrl(): string {
  if (ENDPOINT) return ENDPOINT;
  return `http://localhost:${MOCK_PORT}/api/mcp`;
}

// ===== Helpers HTTP =====
export async function callMcpTool<TResult = unknown>(
  name: "searchAvailability" | "createReservation" | "updateReservation" | "quoteReservationModification" | "cancelReservation" | "getReservation" | "listReservations",
  params: Record<string, unknown>
): Promise<TResult> {
  let url = resolveMcpUrl();
  if (DEBUG) {
    console.log("[MCP] POST", url, JSON.stringify({ action: "call", name, params }));
    console.log('[MCP] ENV', {
      MCP_ENDPOINT: process.env.MCP_ENDPOINT,
      MCP_MOCK_PORT: process.env.MCP_MOCK_PORT,
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
    });
  }
  let lastError;
  const body = { action: "call", name, params };
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(API_KEY ? { "x-mcp-key": API_KEY } : {}),
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`MCP call ${name} ${res.status}: ${txt || "error HTTP"}`);
    }
    const json = (await res.json()) as { ok?: boolean; data?: TResult; error?: string };
    if (!json?.ok) throw new Error(`MCP call ${name} failed: ${json?.error ?? "unknown error"}`);
    return json.data as TResult;
  } catch (err) {
    lastError = err;
    // Si es localhost, intenta con 127.0.0.1
    if (!ENDPOINT && url.includes("localhost")) {
      const altUrl = url.replace("localhost", "127.0.0.1");
      try {
        const res = await fetch(altUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`MCP call ${name} ${res.status}: ${txt || "error HTTP"}`);
        }
        const json = (await res.json()) as { ok?: boolean; data?: TResult; error?: string };
        if (!json?.ok) throw new Error(`MCP call ${name} failed: ${json?.error ?? "unknown error"}`);
        return json.data as TResult;
      } catch (err2) {
        console.error("[MCP] fetch failed for both localhost and 127.0.0.1", err, err2);
        throw err2;
      }
    }
    console.error("[MCP] fetch failed", err);
    throw lastError;
  }
}

// ===== Tools =====
export async function checkAvailabilityTool(input: CheckAvailabilityInput) {
  const parsed = CheckAvailabilityInput.parse(input);
  const params = slotsToMcpParams("searchAvailability", { hotelId: parsed.hotelId, slots: parsed });
  const options = await callMcpTool<Array<{
    roomType: string;
    pricePerNight: number;
    currency: string;
    availability: number;
    description?: string;
  }>>("searchAvailability", params);
  return CheckAvailabilityOutput.parse({
    ok: true,
    available: options.some((opt) => (opt.availability ?? 0) > 0),
    options,
    toolCall: {
      name: "searchAvailability",
      input: {
        hotelId: parsed.hotelId,
        roomType: parsed.roomType,
        numGuests: parsed.guests,
        checkIn: parsed.checkIn,
        checkOut: parsed.checkOut,
      },
    },
  });
}

export async function createReservationTool(input: CreateReservationInput) {
  const parsed = CreateReservationInput.parse(input);
  const params = slotsToMcpParams("createReservation", { hotelId: parsed.hotelId, slots: parsed, channel: parsed.channel });
  const providerResult = await callMcpTool<unknown>("createReservation", params);
  const validated = validateProviderReservation(providerResult, {
    hotelId: parsed.hotelId,
    guests: parsed.guests,
  });
  if (!validated.ok) {
    return CreateReservationOutput.parse({ ok: false, status: "error", error: validated.error });
  }
  return CreateReservationOutput.parse({
    ok: true,
    status: "created",
    reservationId: validated.reservation.reservationId,
    reservation: validated.reservation,
  });
}

export async function updateReservationTool(input: UpdateReservationInput) {
  const parsed = UpdateReservationInput.parse(input);
  const params = {
    ...slotsToMcpParams("updateReservation", {
    hotelId: parsed.hotelId,
    reservationId: parsed.reservationId,
    slots: parsed,
    channel: parsed.channel,
    }),
    quoteId: parsed.quoteId,
    quoteVersion: parsed.quoteVersion,
  };
  const providerResult = await callMcpTool<unknown>("updateReservation", params);
  const validated = validateProviderReservation(providerResult, {
    hotelId: parsed.hotelId,
    reservationId: parsed.reservationId,
    guests: parsed.guests,
  });
  if (!validated.ok) {
    return UpdateReservationOutput.parse({ ok: false, error: validated.error });
  }
  return UpdateReservationOutput.parse({
    ok: true,
    status: "updated",
    reservation: validated.reservation,
  });
}

function validateProviderReservation(
  value: unknown,
  expected: { hotelId: string; reservationId?: string; guests?: number },
): { ok: true; reservation: Reservation } | { ok: false; error: string } {
  const parsed = ReservationResult.safeParse(value);
  if (!parsed.success) return { ok: false, error: "INVALID_PROVIDER_RESERVATION" };
  const reservation = parsed.data as Reservation;
  if (reservation.hotelId !== expected.hotelId) {
    return { ok: false, error: "PROVIDER_HOTEL_ID_MISMATCH" };
  }
  if (expected.reservationId !== undefined && reservation.reservationId !== expected.reservationId) {
    return { ok: false, error: "PROVIDER_RESERVATION_ID_MISMATCH" };
  }
  if (expected.guests !== undefined && reservation.numGuests !== expected.guests) {
    return { ok: false, error: "PROVIDER_NUM_GUESTS_MISMATCH" };
  }
  return { ok: true, reservation };
}

export async function quoteReservationModificationTool(input: QuoteReservationModificationInput) {
  const parsed = QuoteReservationModificationInput.parse(input);
  const params = slotsToMcpParams("updateReservation", { hotelId: parsed.hotelId, reservationId: parsed.reservationId, slots: parsed });
  return callMcpTool<any>("quoteReservationModification", params);
}

export async function cancelReservationTool(input: CancelReservationInput) {
  const parsed = CancelReservationInput.parse(input);
  const reservation = await callMcpTool<{ status?: string }>("cancelReservation", {
    hotelId: parsed.hotelId,
    reservationId: parsed.reservationId,
  });
  return CancelReservationOutput.parse({
    ok: true,
    status: reservation?.status === "cancelled" ? "cancelled" : "cancelled",
  });
}
