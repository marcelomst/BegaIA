// Path: /root/begasist/test/unit/channelManagerAdapter.registry.spec.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/astra/connection", async () => {
  const mod = await import("../mocks/astra");
  return {
    getAstraDB: () => ({
      collection: (name: string) => mod.getCollection(name),
      table: (name: string) => mod.getTable(name),
    }),
  };
});

import { getCMAdapter, inspectDemoInventory, resetDemoInventory } from "@/lib/mcp/channelManagerAdapter";

describe("getCMAdapter registry by hotelId", () => {
  it("reuses the registry instance while the durable store remains shared across adapter instances", async () => {
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

    expect(created.reservationId).toMatch(/^RES-[A-Z0-9]{6,}$/);
    expect(inA?.reservationId).toBe(created.reservationId);
    expect(inB?.reservationId).toBe(created.reservationId);
  });

  it("persists create, get, list, availability, update and cancel across a new adapter instance", async () => {
    const hotelId = `hotel-restart-${Date.now()}`;
    const instanceA = getCMAdapter(hotelId);
    const created = await instanceA.createReservation({
      hotelId,
      guestName: "Ana Rodriguez",
      roomType: "suite",
      checkInDate: "2026-04-20",
      checkOutDate: "2026-04-22",
    });

    const { DurableDemoCMAdapter } = await import("@/lib/mcp/channelManagerAdapter");
    const instanceB = new DurableDemoCMAdapter();
    expect((await instanceB.getReservation(hotelId, created.reservationId))?.guestName).toBe("Ana Rodriguez");
    expect((await instanceB.listReservations({ hotelId })).items.map((item) => item.reservationId)).toContain(created.reservationId);
    expect(await instanceB.searchAvailability({
      hotelId,
      startDate: "2026-04-21",
      endDate: "2026-04-23",
      roomType: "suite",
      guests: 2,
    })).toEqual([]);

    const quote = await instanceB.quoteReservationModification({
      hotelId,
      reservationId: created.reservationId,
      checkInDate: "2026-04-25",
      checkOutDate: "2026-04-27",
    });
    expect(quote.available).toBe(true);
    const updated = await instanceB.updateReservation({
      hotelId,
      reservationId: created.reservationId,
      checkInDate: "2026-04-25",
      checkOutDate: "2026-04-27",
      quoteId: quote.quoteId,
      quoteVersion: quote.quoteVersion,
    });
    expect(updated.checkInDate).toBe("2026-04-25");
    expect((await instanceA.getReservation(hotelId, created.reservationId))?.checkOutDate).toBe("2026-04-27");

    const cancelled = await instanceB.cancelReservation({ hotelId, reservationId: created.reservationId });
    expect(cancelled.status).toBe("cancelled");
    expect((await instanceA.getReservation(hotelId, created.reservationId))?.status).toBe("cancelled");
  });

  it("requires an available current quote before persisting a durable modification", async () => {
    const hotelId = `hotel-modify-quote-${Date.now()}`;
    const adapter = getCMAdapter(hotelId);
    const created = await adapter.createReservation({
      hotelId,
      guestName: "Quote Contract",
      roomType: "double",
      checkInDate: "2026-04-20",
      checkOutDate: "2026-04-22",
    });
    const patch = { checkInDate: "2026-04-25", checkOutDate: "2026-04-29" };
    const quote = await adapter.quoteReservationModification({ hotelId, reservationId: created.reservationId, ...patch });
    expect(quote).toMatchObject({ available: true, currency: "USD" });

    const updated = await adapter.updateReservation({
      hotelId, reservationId: created.reservationId, ...patch,
      quoteId: quote.quoteId, quoteVersion: quote.quoteVersion,
    });
    expect(updated).toMatchObject({
      reservationId: created.reservationId,
      checkInDate: patch.checkInDate,
      checkOutDate: patch.checkOutDate,
      priceTotal: quote.priceTotal,
      currency: quote.currency,
    });

    const beforeRejectedUpdates = await adapter.getReservation(hotelId, created.reservationId);
    await expect(adapter.updateReservation({ hotelId, reservationId: created.reservationId, checkOutDate: "2026-04-30" }))
      .rejects.toThrow("QUOTE_REQUIRED");
    await expect(adapter.updateReservation({ hotelId, reservationId: created.reservationId, checkOutDate: "2026-04-30", quoteVersion: quote.quoteVersion }))
      .rejects.toThrow("QUOTE_REQUIRED");
    await expect(adapter.updateReservation({ hotelId, reservationId: created.reservationId, checkOutDate: "2026-04-30", quoteId: quote.quoteId }))
      .rejects.toThrow("QUOTE_REQUIRED");
    await expect(adapter.updateReservation({ hotelId, reservationId: created.reservationId, checkOutDate: "2026-04-30", quoteId: quote.quoteId, quoteVersion: quote.quoteVersion }))
      .rejects.toThrow("QUOTE_STALE");
    expect(await adapter.getReservation(hotelId, created.reservationId)).toEqual(beforeRejectedUpdates);
  });

  it("rejects unavailable quotes without mutating the durable reservation", async () => {
    const hotelId = `hotel-modify-unavailable-${Date.now()}`;
    const adapter = getCMAdapter(hotelId);
    const created = await adapter.createReservation({
      hotelId,
      guestName: "Unavailable Quote",
      roomType: "suite",
      checkInDate: "2026-04-20",
      checkOutDate: "2026-04-22",
    });
    const quote = await adapter.quoteReservationModification({
      hotelId, reservationId: created.reservationId, checkInDate: "2026-04-20", checkOutDate: "2026-04-22",
    });
    expect(quote).toMatchObject({ available: false, priceTotal: 0 });

    await expect(adapter.updateReservation({
      hotelId, reservationId: created.reservationId, checkOutDate: "2026-04-22",
      quoteId: quote.quoteId, quoteVersion: quote.quoteVersion,
    })).rejects.toThrow("QUOTE_UNAVAILABLE");
    expect(await adapter.getReservation(hotelId, created.reservationId)).toEqual(created);
  });

  it("isolates tenant reads and resets only the requested hotel", async () => {
    const suffix = Date.now();
    const hotelA = `hotel-tenant-a-${suffix}`;
    const hotelB = `hotel-tenant-b-${suffix}`;
    const adapter = getCMAdapter(hotelA);
    const reservationA = await adapter.createReservation({ hotelId: hotelA, guestName: "Hotel A", roomType: "double", checkInDate: "2026-05-01", checkOutDate: "2026-05-03" });
    const reservationB = await adapter.createReservation({ hotelId: hotelB, guestName: "Hotel B", roomType: "double", checkInDate: "2026-05-01", checkOutDate: "2026-05-03" });

    expect(await adapter.getReservation(hotelA, reservationB.reservationId)).toBeNull();
    expect((await adapter.listReservations({ hotelId: hotelA })).items.map((item) => item.reservationId)).toEqual([reservationA.reservationId]);
    await resetDemoInventory(hotelA);
    expect((await adapter.listReservations({ hotelId: hotelA })).items).toEqual([]);
    expect((await adapter.getReservation(hotelB, reservationB.reservationId))?.guestName).toBe("Hotel B");
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

  it("exposes active demo reservations and can reset the real hotel store", async () => {
    const hotelId = `hotel-debug-${Date.now()}`;
    const cm = getCMAdapter(hotelId);

    const active = await cm.createReservation({
      hotelId,
      guestName: "Reserva Debug",
      roomType: "double",
      checkInDate: "2026-04-20",
      checkOutDate: "2026-04-23",
    });

    const cancelled = await cm.createReservation({
      hotelId,
      guestName: "Reserva Cancelada",
      roomType: "suite",
      checkInDate: "2026-04-21",
      checkOutDate: "2026-04-22",
    });

    await cm.cancelReservation({ hotelId, reservationId: cancelled.reservationId });

    const snapshot = await inspectDemoInventory(hotelId, {
      startDate: "2026-04-21",
      endDate: "2026-04-22",
      roomType: "double",
      guests: 2,
    });

    expect(snapshot.hotelId).toBe(hotelId);
    expect(snapshot.sharedByHotelId).toBe(true);
    expect(snapshot.totals.totalReservations).toBe(2);
    expect(snapshot.totals.activeReservations).toBe(1);
    expect(snapshot.activeReservations.map((reservation) => reservation.reservationId)).toContain(active.reservationId);
    expect(snapshot.cancelledReservations.map((reservation) => reservation.reservationId)).toContain(cancelled.reservationId);
    expect(snapshot.roomTypes.find((room) => room.roomType === "double")).toMatchObject({
      stock: 4,
      activeReservationsCount: 1,
      activeReservationIds: [active.reservationId],
      availableUnitsFromActiveReservations: 3,
    });
    expect(snapshot.searchDebug?.rooms.find((room) => room.roomType === "double")).toMatchObject({
      overlappingReservationsCount: 1,
      overlappingReservationIds: [active.reservationId],
      returnedBySearch: true,
    });

    const resetResult = await resetDemoInventory(hotelId);
    expect(resetResult.clearedReservations).toBe(2);

    const resetSnapshot = await inspectDemoInventory(hotelId);
    expect(resetSnapshot.totals.totalReservations).toBe(0);
    expect(resetSnapshot.activeReservations).toEqual([]);
  });
});
