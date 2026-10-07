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
import { DEMO_CHANNEL_MANAGER_RESERVATIONS_TABLE } from "@/lib/db/demoChannelManagerReservations";
import { getTable } from "../mocks/astra";

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

  it("round-trips numGuests and preserves it across date and room-only updates", async () => {
    const hotelId = `hotel-num-guests-${Date.now()}`;
    const adapter = getCMAdapter(hotelId);
    const created = await adapter.createReservation({
      hotelId, guestName: "Guest Authority", roomType: "suite", guests: 3,
      checkInDate: "2026-06-10", checkOutDate: "2026-06-12",
    });
    expect(created.numGuests).toBe(3);

    const datePatch = { checkInDate: "2026-06-15", checkOutDate: "2026-06-17" };
    const dateQuote = await adapter.quoteReservationModification({ hotelId, reservationId: created.reservationId, ...datePatch });
    const dateUpdated = await adapter.updateReservation({
      hotelId, reservationId: created.reservationId, ...datePatch,
      quoteId: dateQuote.quoteId, quoteVersion: dateQuote.quoteVersion,
    });
    expect(dateUpdated.numGuests).toBe(3);

    const roomPatch = { roomType: "triple" };
    const roomQuote = await adapter.quoteReservationModification({ hotelId, reservationId: created.reservationId, ...roomPatch });
    const roomUpdated = await adapter.updateReservation({
      hotelId, reservationId: created.reservationId, ...roomPatch,
      quoteId: roomQuote.quoteId, quoteVersion: roomQuote.quoteVersion,
    });
    expect(roomUpdated).toMatchObject({ roomType: "triple", numGuests: 3 });

    const guestQuote = await adapter.quoteReservationModification({ hotelId, reservationId: created.reservationId, guests: 2 });
    const guestUpdated = await adapter.updateReservation({
      hotelId, reservationId: created.reservationId, guests: 2,
      quoteId: guestQuote.quoteId, quoteVersion: guestQuote.quoteVersion,
    });
    expect(guestUpdated.numGuests).toBe(2);
  });

  it("projects historical rows as null and materializes a later explicit guest update", async () => {
    const hotelId = `hotel-historical-guests-${Date.now()}`;
    const reservationId = "RES-HISTORICAL";
    await getTable(DEMO_CHANNEL_MANAGER_RESERVATIONS_TABLE).insertOne({
      hotel_id: hotelId, reservation_id: reservationId, room_type: "double", guest_name: "Historical Guest",
      check_in_date: "2026-07-10", check_out_date: "2026-07-12", status: "confirmed", currency: "USD",
      price_total: 200, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
    });
    const adapter = getCMAdapter(hotelId);
    expect((await adapter.getReservation(hotelId, reservationId))?.numGuests).toBeNull();

    const quote = await adapter.quoteReservationModification({ hotelId, reservationId, guests: 2 });
    const updated = await adapter.updateReservation({
      hotelId, reservationId, guests: 2, quoteId: quote.quoteId, quoteVersion: quote.quoteVersion,
    });
    expect(updated.numGuests).toBe(2);
  });

  it("rejects invalid guest counts without writing a reservation", async () => {
    const hotelId = `hotel-invalid-guests-${Date.now()}`;
    const adapter = getCMAdapter(hotelId);
    await expect(adapter.createReservation({
      hotelId, guestName: "Invalid Guest Count", roomType: "double", guests: 0,
      checkInDate: "2026-08-10", checkOutDate: "2026-08-12",
    })).rejects.toThrow("INVALID_GUESTS");
    expect((await adapter.listReservations({ hotelId })).items).toEqual([]);
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
