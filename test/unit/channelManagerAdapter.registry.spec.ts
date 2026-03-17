// Path: /root/begasist/test/unit/channelManagerAdapter.registry.spec.ts
import { describe, expect, it } from "vitest";
import { getCMAdapter } from "@/lib/mcp/channelManagerAdapter";

describe("getCMAdapter registry by hotelId", () => {
  it("reuses instance for same hotelId and isolates different hotelId", async () => {
    const hotelA = `hotel-a-${Date.now()}`;
    const hotelB = `hotel-b-${Date.now()}`;

    const cmA1 = getCMAdapter(hotelA);
    const cmA2 = getCMAdapter(hotelA);
    const cmB = getCMAdapter(hotelB);

    expect(cmA1).toBe(cmA2);
    expect(cmA1).not.toBe(cmB);

    const created = await cmA1.createReservation({
      hotelId: hotelA,
      guestName: "QA User",
      roomType: "double",
      checkInDate: "2026-04-01",
      checkOutDate: "2026-04-02",
    });

    const inA = await cmA2.getReservation(hotelA, created.reservationId);
    const inB = await cmB.getReservation(hotelA, created.reservationId);

    expect(inA?.reservationId).toBe(created.reservationId);
    expect(inB).toBeNull();
  });

  it("falls back to default key when hotelId is empty", () => {
    const cm1 = getCMAdapter();
    const cm2 = getCMAdapter("");
    const cm3 = getCMAdapter("   ");
    expect(cm1).toBe(cm2);
    expect(cm2).toBe(cm3);
  });

  it("filters room types by guest capacity for demo availability", async () => {
    const hotelId = `hotel-guests-${Date.now()}`;
    const cm = getCMAdapter(hotelId);

    const options = await cm.searchAvailability({
      hotelId,
      startDate: "2026-02-20",
      endDate: "2026-02-22",
      guests: 3,
    });

    expect(options.some((room) => room.roomType === "single")).toBe(false);
    expect(options.some((room) => room.roomType === "double")).toBe(false);
    expect(options.some((room) => room.roomType === "triple")).toBe(true);
    expect(options.some((room) => room.roomType === "suite")).toBe(true);
  });

  it("reduces availability when overlapping reservations consume demo stock", async () => {
    const hotelId = `hotel-stock-${Date.now()}`;
    const cm = getCMAdapter(hotelId);

    await cm.createReservation({
      hotelId,
      guestName: "Reserva 1",
      roomType: "suite",
      checkInDate: "2026-02-20",
      checkOutDate: "2026-02-22",
    });

    const overlapping = await cm.searchAvailability({
      hotelId,
      startDate: "2026-02-21",
      endDate: "2026-02-23",
      roomType: "suite",
      guests: 2,
    });

    expect(overlapping).toEqual([]);
  });
});
