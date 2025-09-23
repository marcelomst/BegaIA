// Path: /root/begasist/lib/tools/mcp.ts
import { z } from "zod";

/**
 * 🧰 Contratos “MCP” (tools) con schemas Zod.
 * Estos wrappers llaman a tu endpoint actual (MCP_ENDPOINT).
 * Si mañana cambiás a SiteMinder/Beds24, solo cambiás acá.
 */

const ENDPOINT = process.env.MCP_ENDPOINT || "";
const API_KEY = process.env.MCP_API_KEY || "";
const MOCK_PORT = process.env.MCP_MOCK_PORT || "3000";

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
  // Si ENDPOINT no está configurado, usa el mock local de Next.js (válido para Node y frontend)
  let url = ENDPOINT ? ENDPOINT + path : `http://localhost:${MOCK_PORT}/api/mcp${path}`;
  // Log de depuración para ver a dónde va el fetch y con qué entorno
  console.log('[MCP] POST', url, JSON.stringify(body));
  console.log('[MCP] ENV', {
    MCP_ENDPOINT: process.env.MCP_ENDPOINT,
    MCP_MOCK_PORT: process.env.MCP_MOCK_PORT,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
  });
  let lastError;
  try {
    const res = await fetch(url, {
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
  } catch (err) {
    lastError = err;
    // Si es localhost, intenta con 127.0.0.1
    if (!ENDPOINT && url.includes("localhost")) {
      const altUrl = url.replace("localhost", "127.0.0.1");
      try {
        const res = await fetch(altUrl, {
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
  const out = await postJSON<unknown>("/availability", parsed);
  return CheckAvailabilityOutput.parse(out);
}

export async function createReservationTool(input: CreateReservationInput) {
  const parsed = CreateReservationInput.parse(input);
  const out = await postJSON<unknown>("/reservations/create", parsed);
  return CreateReservationOutput.parse(out);
}
