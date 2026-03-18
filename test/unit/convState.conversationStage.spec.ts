import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/astra/connection", async () => {
  const mod = await import("../mocks/astra");
  return {
    getAstraDB: () => ({
      collection: (name: string) => mod.getCollection(name),
    }),
  };
});

import { getConvState, upsertConvState } from "@/lib/db/convState";

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
});
