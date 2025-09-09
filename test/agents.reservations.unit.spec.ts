// Path: /root/begasist/test/agents.reservations.unit.spec.ts
import { describe, it, expect, vi } from "vitest";

// Mock tools HTTP (nos concentramos en parseo y armado de respuesta)
vi.mock("@/lib/tools/mcp", () => {
  return {
    checkAvailabilityTool: vi.fn(async () => ({
      ok: true,
      available: false,
      options: [
        { roomType: "double", pricePerNight: 120, currency: "USD" },
        { roomType: "suite", pricePerNight: 200, currency: "USD" },
      ],
    })),
    createReservationTool: vi.fn(async () => ({
      ok: true,
      status: "created",
      reservationId: "R-XYZ",
    })),
  };
});

// Importar después de mock
import { askAvailability, confirmAndCreate } from "@/lib/agents/reservations";

describe("agents/reservations - tools wrappers", () => {
  it("askAvailability arma propuesta con alternativas cuando no hay disponibilidad", async () => {
    const out = await askAvailability("hotel999", {
      roomType: "single",
      guests: 1,
      checkIn: "2025-10-01",
      checkOut: "2025-10-03",
      guestName: "Test",
      locale: "spa",
    } as any);

    expect(out.ok).toBe(true);
    expect(out.available).toBe(false);
    expect(out.proposal).toMatch(/puedo ofrecer: double, suite/i);
    expect(out.options?.length).toBeGreaterThan(0);
  });

  it("confirmAndCreate devuelve mensaje de éxito con el ID", async () => {
    const out = await confirmAndCreate(
      "hotel999",
      {
        guestName: "Test",
        roomType: "double",
        guests: 2,
        checkIn: "2025-10-10",
        checkOut: "2025-10-12",
        locale: "spa",
      } as any,
      "web"
    );

    expect(out.ok).toBe(true);
    expect(out.reservationId).toBe("R-XYZ");
    expect(out.message).toMatch(/Reserva creada/);
  });
});
