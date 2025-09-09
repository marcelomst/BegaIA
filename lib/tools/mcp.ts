// Path: /root/begasist/lib/tools/mcp.ts
import { z } from "zod";

/**
 * 🧰 Contratos “MCP” (tools) con schemas Zod.
 * Estos wrappers llaman a tu endpoint actual (MCP_ENDPOINT).
 * Si mañana cambiás a SiteMinder/Beds24, solo cambiás acá.
 */

const ENDPOINT = process.env.MCP_ENDPOINT || "";
const API_KEY = process.env.MCP_API_KEY || "";

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

export const CreateReservationOutput = z.object({
  ok: z.boolean(),
  reservationId: z.string().optional(),
  status: z.enum(["created", "error"]).optional(),
  error: z.string().optional(),
});
export type CreateReservationOutput = z.infer<typeof CreateReservationOutput>;

// ===== Helpers HTTP =====
async function postJSON<TOut>(path: string, body: unknown): Promise<TOut> {
  if (!ENDPOINT) throw new Error("MCP_ENDPOINT no configurado");
  const res = await fetch(`${ENDPOINT}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { "x-api-key": API_KEY } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`MCP ${path} ${res.status}: ${txt || "error HTTP"}`);
  }
  return (await res.json()) as TOut;
}

// ===== Tools =====
export async function checkAvailabilityTool(input: CheckAvailabilityInput) {
  const parsed = CheckAvailabilityInput.parse(input);
  const out = await postJSON<unknown>("/availability", parsed);
  return CheckAvailabilityOutput.parse(out);
}

export async function createReservationTool(input: CreateReservationInput) {
  const parsed = CreateReservationInput.parse(input);
  const out = await postJSON<unknown>("/reservations/create", parsed);
  return CreateReservationOutput.parse(out);
}
