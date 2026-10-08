import { afterEach, describe, expect, it, vi } from "vitest";

import { askAvailability, confirmAndCreate } from "@/lib/agents/reservations";
import { createReservationTool } from "@/lib/tools/mcp";

const providerReservation = {
  reservationId: "RES-NULL-CONTACTS",
  hotelId: "hotel999",
  guestName: "Ana Gomez",
  roomType: "double",
  numGuests: 2,
  checkInDate: "2026-11-10T00:00:00.000Z",
  checkOutDate: "2026-11-12T00:00:00.000Z",
  status: "confirmed" as const,
  currency: "USD",
  priceTotal: 200,
  createdAt: "2026-10-08T12:00:00.000Z",
  updatedAt: "2026-10-08T12:00:00.000Z",
};

const createInput = {
  hotelId: "hotel999",
  guestName: "Ana Gomez",
  roomType: "double",
  guests: 2,
  checkIn: "2026-11-10T00:00:00.000Z",
  checkOut: "2026-11-12T00:00:00.000Z",
  channel: "web",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("provider Reservation optional contacts boundary", () => {
  it.each([
    ["ambos null", null, null, undefined, undefined],
    ["email null", null, "+59899111222", undefined, "+59899111222"],
    ["phone null", "guest@example.com", null, "guest@example.com", undefined],
    ["ambos strings", "guest@example.com", "+59899111222", "guest@example.com", "+59899111222"],
  ])(
    "normaliza %s sin rechazar la Reservation",
    async (_case, guestEmail, guestPhone, expectedEmail, expectedPhone) => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({
        ok: true,
        data: { ...providerReservation, guestEmail, guestPhone },
      }));

      const result = await createReservationTool(createInput);

      expect(result).toMatchObject({
        ok: true,
        status: "created",
        reservationId: providerReservation.reservationId,
      });
      expect(result.reservation?.guestEmail).toBe(expectedEmail);
      expect(result.reservation?.guestPhone).toBe(expectedPhone);
    },
  );

  it("mantiene el rechazo cuando falta un campo obligatorio", async () => {
    const { hotelId: _missingHotelId, ...incompleteReservation } = providerReservation;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({
      ok: true,
      data: { ...incompleteReservation, guestEmail: null, guestPhone: null },
    }));

    const result = await createReservationTool(createInput);

    expect(result).toEqual({
      ok: false,
      status: "error",
      error: "INVALID_PROVIDER_RESERVATION",
    });
  });

  it("completa create después de CONFIRMAR cuando el provider devuelve contactos null", async () => {
    const providerActions: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { name: string };
      providerActions.push(body.name);
      if (body.name === "searchAvailability") {
        return Response.json({
          ok: true,
          data: [{
            roomType: "double",
            pricePerNight: 100,
            currency: "USD",
            availability: 1,
          }],
        });
      }
      return Response.json({
        ok: true,
        data: { ...providerReservation, guestEmail: null, guestPhone: null },
      });
    });

    const slots = {
      guestName: "Ana Gomez",
      roomType: "double" as const,
      numGuests: 2,
      checkIn: "2026-11-10",
      checkOut: "2026-11-12",
      locale: "es" as const,
    };
    const proposal = await askAvailability("hotel999", slots);
    expect(proposal).toMatchObject({ ok: true, available: true });
    expect(proposal.proposal).toMatch(/disponible/i);

    const confirmation = "CONFIRMAR";
    expect(confirmation).toBe("CONFIRMAR");
    const result = await confirmAndCreate("hotel999", slots, "web");

    expect(providerActions).toEqual(["searchAvailability", "createReservation"]);
    expect(result).toMatchObject({
      ok: true,
      reservationId: providerReservation.reservationId,
      reservation: {
        reservationId: providerReservation.reservationId,
        guestEmail: undefined,
        guestPhone: undefined,
      },
    });
    expect(result.message).not.toContain("INVALID_PROVIDER_RESERVATION");
  });
});
