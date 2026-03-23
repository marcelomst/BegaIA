import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/astra/connection", async () => {
  const mod = await import("../mocks/astra");
  return {
    getAstraDB: () => ({
      collection: (name: string) => mod.getCollection(name),
    }),
  };
});

import {
  getConvState,
  resolveActiveReservationContext,
  resolveGuestState,
  upsertConvState,
} from "@/lib/db/convState";

describe("convState conversationStage", () => {
  it("deriva reservation_quoted cuando el runtime persiste salesStage=quote", async () => {
    const hotelId = "hotel999";
    const conversationId = `conv-stage-quote-${Date.now()}`;

    await upsertConvState(hotelId, conversationId, {
      activeFlow: "reservation",
      salesStage: "quote",
      reservationSlots: {
        roomType: "double",
        checkIn: "2026-03-21",
        checkOut: "2026-03-25",
      },
      updatedBy: "ai",
    });

    const st = await getConvState(hotelId, conversationId);
    expect(st?.conversationStage).toBe("reservation_quoted");
    expect(st?.salesStage).toBe("quote");
  });

  it("deriva reservation_confirmed cuando el runtime persiste una reserva creada", async () => {
    const hotelId = "hotel999";
    const conversationId = `conv-stage-close-${Date.now()}`;

    await upsertConvState(hotelId, conversationId, {
      lastReservation: {
        reservationId: "RES-TST001",
        status: "created",
        createdAt: new Date().toISOString(),
        channel: "web",
      },
      salesStage: "close",
      updatedBy: "ai",
    });

    const st = await getConvState(hotelId, conversationId);
    expect(st?.conversationStage).toBe("reservation_confirmed");
    expect(st?.salesStage).toBe("close");
  });

  it("persiste guestState explícito y lo resuelve como fuente prioritaria", async () => {
    const hotelId = "hotel999";
    const conversationId = `conv-guest-state-inhouse-${Date.now()}`;

    await upsertConvState(hotelId, conversationId, {
      guestState: "in_house",
      updatedBy: "ai",
    });

    const st = await getConvState(hotelId, conversationId);
    expect(st?.guestState).toBe("in_house");
    expect(resolveGuestState(st)).toBe("in_house");
  });

  it("deriva guestState=booked desde salesStage close + lastReservation sin campo explícito", async () => {
    const guestState = resolveGuestState({
      hotelId: "hotel999",
      conversationId: "conv-booked-derived",
      salesStage: "close",
      conversationStage: "reservation_confirmed",
      lastReservation: {
        reservationId: "RES-TST002",
        status: "created",
        createdAt: new Date().toISOString(),
        channel: "web",
      },
      updatedAt: new Date().toISOString(),
      _id: "hotel999:conv-booked-derived",
    });

    expect(guestState).toBe("booked");
  });

  it("persiste activeReservationContext explícito para un draft nuevo", async () => {
    const hotelId = "hotel999";
    const conversationId = `conv-active-draft-${Date.now()}`;

    await upsertConvState(hotelId, conversationId, {
      activeFlow: "reservation",
      desiredAction: "create",
      salesStage: "qualify",
      activeReservationContext: {
        kind: "draft",
        phase: "collecting",
        updatedAt: new Date().toISOString(),
      },
      updatedBy: "ai",
    });

    const st = await getConvState(hotelId, conversationId);
    expect(st?.activeReservationContext).toMatchObject({
      kind: "draft",
      phase: "collecting",
    });
    expect(resolveActiveReservationContext(st)?.kind).toBe("draft");
  });

  it("prioriza activeReservationContext explícito cuando hay dos reservas confirmadas", () => {
    const active = resolveActiveReservationContext({
      hotelId: "hotel999",
      conversationId: "conv-active-confirmed",
      reservationHistory: [
        {
          reservationId: "RES-001",
          status: "created",
          createdAt: new Date().toISOString(),
          channel: "web",
        },
        {
          reservationId: "RES-002",
          status: "created",
          createdAt: new Date().toISOString(),
          channel: "web",
        },
      ],
      lastReservation: {
        reservationId: "RES-002",
        status: "created",
        createdAt: new Date().toISOString(),
        channel: "web",
      },
      activeReservationContext: {
        kind: "reservation",
        reservationId: "RES-001",
        phase: "confirmed",
        updatedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
      _id: "hotel999:conv-active-confirmed",
    });

    expect(active).toMatchObject({
      kind: "reservation",
      reservationId: "RES-001",
      phase: "confirmed",
    });
  });
});
