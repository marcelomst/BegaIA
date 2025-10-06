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
    // S3: mocks para update/cancel
    updateReservationTool: vi.fn(async (_in: any) => ({
      ok: true,
      status: "updated",
    })),
    cancelReservationTool: vi.fn(async (_in: any) => ({
      ok: true,
      status: "cancelled",
    })),
  };
});

// Importar después de mock
import { askAvailability, confirmAndCreate, modifyReservation, cancelReservation } from "@/lib/agents/reservations";
import { checkAvailabilityTool, updateReservationTool, cancelReservationTool } from "@/lib/tools/mcp";

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

  it("canonicaliza 'doble matrimonial' → 'double' al invocar el tool", async () => {
    await askAvailability("hotel999", {
      roomType: "doble matrimonial",
      guests: 2,
      checkIn: "2025-10-10",
      checkOut: "2025-10-12",
      guestName: "Ana",
      locale: "es",
    } as any);

    expect((checkAvailabilityTool as unknown as { mock: any }).mock.calls.length).toBeGreaterThan(0);
    const last = (checkAvailabilityTool as unknown as { mock: any }).mock.calls.at(-1)?.[0];
    expect(last?.roomType).toBe("double");
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

  // ====== Tests de CONTRATO (Zod) — Sprint 1 ======
  it("CreateReservationInput rechaza guests como string y acepta number", async () => {
    // Importar el módulo real (no el mock) para validar el esquema Zod
    const real = await vi.importActual<typeof import("@/lib/tools/mcp")>("@/lib/tools/mcp");

    // Acepta número
    expect(() =>
      real.CreateReservationInput.parse({
        hotelId: "h",
        guestName: "Ana",
        roomType: "double",
        guests: 2,
        checkIn: "2025-10-10T00:00:00.000Z",
        checkOut: "2025-10-12T00:00:00.000Z",
        channel: "web",
      })
    ).not.toThrow();

    // Rechaza string
    expect(() =>
      real.CreateReservationInput.parse({
        hotelId: "h",
        guestName: "Ana",
        roomType: "double",
        guests: "2" as any,
        checkIn: "2025-10-10T00:00:00.000Z",
        checkOut: "2025-10-12T00:00:00.000Z",
        channel: "web",
      })
    ).toThrow();
  });

  it("CheckAvailabilityInput requiere datetime ISO válido (no acepta '2025/10/01')", async () => {
    const real = await vi.importActual<typeof import("@/lib/tools/mcp")>("@/lib/tools/mcp");

    // Válido
    expect(() =>
      real.CheckAvailabilityInput.parse({
        hotelId: "h",
        roomType: "double",
        guests: 2,
        checkIn: "2025-10-01T00:00:00.000Z",
        checkOut: "2025-10-03T00:00:00.000Z",
      })
    ).not.toThrow();

    // Inválido (formato con '/')
    expect(() =>
      real.CheckAvailabilityInput.parse({
        hotelId: "h",
        roomType: "double",
        guests: 2,
        checkIn: "2025/10/01" as any,
        checkOut: "2025/10/03" as any,
      })
    ).toThrow();
  });

  // ====== Wrappers de Sprint 3 (modify/cancel) ======
  it("modifyReservation devuelve mensaje de éxito y llama updateReservationTool con normalización", async () => {
    const out = await modifyReservation("hotel999", "ABC123", {
      guestName: "Ana",
      roomType: "doble",
      numGuests: "2",
      checkIn: "2025-10-19",
      checkOut: "2025-10-21",
      locale: "es",
    } as any, "web");

    expect(out.ok).toBe(true);
    expect(out.message).toMatch(/actualizada/i);
    expect((updateReservationTool as any).mock.calls.length).toBeGreaterThan(0);
    const last = (updateReservationTool as any).mock.calls.at(-1)?.[0];
    // roomType canonicalizado y fechas ISO con tiempo
    expect(last.roomType).toBe("double");
    expect(last.checkIn).toMatch(/T00:00:00\.000Z$/);
    expect(last.checkOut).toMatch(/T00:00:00\.000Z$/);
    expect(typeof last.guests).toBe("number");
  });

  it("modifyReservation propaga error si el tool no devuelve 'updated'", async () => {
    (updateReservationTool as any).mockResolvedValueOnce({ ok: true, status: "noop" });
    const out = await modifyReservation("hotel999", "ABC123", {
      roomType: "double", numGuests: 2, checkIn: "2025-10-19", checkOut: "2025-10-21", locale: "es",
    } as any, "web");
    expect(out.ok).toBe(false);
    expect(out.message).toMatch(/No pude modificar/i);
  });

  it("cancelReservation devuelve mensaje de éxito y llama cancelReservationTool", async () => {
    const out = await cancelReservation("hotel999", "ABC123");
    expect(out.ok).toBe(true);
    expect(out.message).toMatch(/cancelada/i);
    expect((cancelReservationTool as any).mock.calls.length).toBeGreaterThan(0);
  });

  it("cancelReservation propaga error si el tool no devuelve 'cancelled'", async () => {
    (cancelReservationTool as any).mockResolvedValueOnce({ ok: true, status: "noop" });
    const out = await cancelReservation("hotel999", "ABC123");
    expect(out.ok).toBe(false);
    expect(out.message).toMatch(/No pude cancelar/i);
  });
});
