import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  getConvStateMock,
  upsertConvStateMock,
  confirmAndCreateMock,
  fillSlotsWithLLMMock,
  runAvailabilityCheckMock,
} = vi.hoisted(() => ({
  getConvStateMock: vi.fn(),
  upsertConvStateMock: vi.fn(async () => {}),
  confirmAndCreateMock: vi.fn(async () => ({
    ok: true,
    reservationId: "R-GRAPH-01",
    message: "ok",
  })),
  fillSlotsWithLLMMock: vi.fn(async () => ({
    need: "none",
    slots: {
      guestName: "Ana Gomez",
      roomType: "double",
      checkIn: "2026-04-22",
      checkOut: "2026-04-25",
      numGuests: 2,
    },
  })),
  runAvailabilityCheckMock: vi.fn(async () => ({
    finalText: "Tengo disponibilidad. ¿Confirmás la reserva? Respondé “CONFIRMAR”.",
    nextSlots: {
      guestName: "Ana Gomez",
      roomType: "double",
      checkIn: "2026-04-22",
      checkOut: "2026-04-25",
      numGuests: "2",
    },
    needsHandoff: false,
  })),
}));

vi.mock("@/lib/db/convState", () => ({
  getConvState: getConvStateMock,
  upsertConvState: upsertConvStateMock,
}));

vi.mock("@/lib/agents/reservations", () => ({
  fillSlotsWithLLM: fillSlotsWithLLMMock,
  confirmAndCreate: confirmAndCreateMock,
}));

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(async () => ({ timezone: "America/Montevideo" })),
}));

vi.mock("@/lib/handlers/pipeline/availability", () => ({
  runAvailabilityCheck: runAvailabilityCheckMock,
}));

vi.mock("@/lib/agents/retrieval_based", () => ({
  retrievalBased: vi.fn(async () => ({
    messages: [],
    category: "retrieval_based",
  })),
}));

vi.mock("@/lib/utils/debugLog", () => ({
  debugLog: vi.fn(),
}));

import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { handleReservationNode } from "@/lib/agents/nodes/reservation";
import { handleReservationConfirmNode } from "@/lib/agents/nodes/reservationConfirm";

describe("graph create confirm guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConvStateMock.mockResolvedValue({
      reservationSlots: {
        guestName: "Ana Gomez",
        roomType: "double",
        checkIn: "2026-04-22",
        checkOut: "2026-04-25",
        numGuests: "2",
        locale: "es",
      },
      salesStage: "quote",
      conversationStage: "reservation_quoted",
      lastProposal: {
        text: "Tengo disponibilidad. ¿Confirmás la reserva? Respondé “CONFIRMAR”.",
        available: true,
      },
    });
  });

  it("no crea reserva con 'si' en reservation node aunque haya draft completo y quote activo", async () => {
    const result = await handleReservationNode({
      detectedLanguage: "es",
      reservationSlots: {
        guestName: "Ana Gomez",
        roomType: "double",
        checkIn: "2026-04-22",
        checkOut: "2026-04-25",
        numGuests: "2",
      },
      normalizedMessage: "si",
      hotelId: "hotel999",
      conversationId: "conv-graph-confirm-guard",
      salesStage: "quote",
      desiredAction: "create",
      messages: [
        new AIMessage("¿Confirmás la reserva? Respondé “CONFIRMAR”."),
        new HumanMessage("si"),
      ],
      meta: { channel: "web" },
    } as any);

    expect(confirmAndCreateMock).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it("no crea reserva con 'si' en reservationConfirm node y pide confirmación explícita", async () => {
    const result = await handleReservationConfirmNode({
      normalizedMessage: "si",
      hotelId: "hotel999",
      conversationId: "conv-graph-confirm-guard",
      detectedLanguage: "es",
    } as any);

    expect(confirmAndCreateMock).not.toHaveBeenCalled();
    expect(String(result?.messages?.[0]?.content || "")).toMatch(/respond[eé].*confirmar/i);
  });
});
