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

  it("cuando el LLM falla pero el turno ya trae todos los slots, cotiza y no emite pregunta vacía", async () => {
    fillSlotsWithLLMMock.mockRejectedValueOnce(new Error("slot failure"));

    const result = await handleReservationNode({
      detectedLanguage: "es",
      reservationSlots: {},
      normalizedMessage:
        "Hola, quiero hacer una reserva para el dia 28/05/2026 hasta 29/05/2026, una doble para 2 personas, a nombre de Pedro Picapiedra",
      hotelId: "hotel999",
      conversationId: "conv-graph-complete-slots-fallback",
      salesStage: "qualify",
      desiredAction: "create",
      messages: [new HumanMessage("Hola, quiero hacer una reserva para el dia 28/05/2026 hasta 29/05/2026, una doble para 2 personas, a nombre de Pedro Picapiedra")],
      meta: { channel: "email" },
    } as any);

    const text = String(result?.messages?.[0]?.content || "");
    expect(text).toMatch(/confirm[aá]s la reserva|CONFIRMAR/i);
    expect(text).not.toContain("¿me pasás ?");
    expect(text).toMatch(/disponibilidad|disponible/i);
  });

  it("cuando faltan datos reales, pregunta un faltante concreto en vez de una agregada vacía", async () => {
    fillSlotsWithLLMMock.mockRejectedValueOnce(new Error("slot failure"));
    getConvStateMock.mockResolvedValueOnce(null);
    getConvStateMock.mockResolvedValueOnce(null);

    const result = await handleReservationNode({
      detectedLanguage: "es",
      reservationSlots: {},
      normalizedMessage:
        "Hola, quiero hacer una reserva para el dia 28/05/2026 hasta 29/05/2026, una doble para 2 personas",
      hotelId: "hotel999",
      conversationId: "conv-graph-missing-guestname",
      salesStage: "qualify",
      desiredAction: "create",
      messages: [new HumanMessage("Hola, quiero hacer una reserva para el dia 28/05/2026 hasta 29/05/2026, una doble para 2 personas")],
      meta: { channel: "email" },
    } as any);

    const text = String(result?.messages?.[0]?.content || "");
    expect(text).toMatch(/tipo de habitaci[oó]n|a nombre de qui[eé]n|nombre y apellido/i);
    expect(text).not.toContain("¿me pasás ?");
    expect(runAvailabilityCheckMock).not.toHaveBeenCalled();
  });

  it("en email con varios faltantes agrupa la repregunta", async () => {
    fillSlotsWithLLMMock.mockRejectedValueOnce(new Error("slot failure"));
    getConvStateMock.mockResolvedValueOnce(null);
    getConvStateMock.mockResolvedValueOnce(null);

    const result = await handleReservationNode({
      detectedLanguage: "es",
      reservationSlots: {},
      normalizedMessage: "quiero reservar",
      hotelId: "hotel999",
      conversationId: "conv-graph-email-grouped-ask",
      salesStage: "qualify",
      desiredAction: "create",
      messages: [new HumanMessage("quiero reservar")],
      meta: { channel: "email" },
    } as any);

    const text = String(result?.messages?.[0]?.content || "");
    expect(text).toMatch(/para avanzar,.*fecha de check-in/i);
    expect(text).toMatch(/fecha de check-out/i);
    expect(text).toMatch(/tipo de habitaci[oó]n/i);
  });

  it("en web con varios faltantes mantiene la pregunta incremental", async () => {
    fillSlotsWithLLMMock.mockRejectedValueOnce(new Error("slot failure"));
    getConvStateMock.mockResolvedValueOnce(null);
    getConvStateMock.mockResolvedValueOnce(null);

    const result = await handleReservationNode({
      detectedLanguage: "es",
      reservationSlots: {},
      normalizedMessage: "quiero reservar",
      hotelId: "hotel999",
      conversationId: "conv-graph-web-incremental-ask",
      salesStage: "qualify",
      desiredAction: "create",
      messages: [new HumanMessage("quiero reservar")],
      meta: { channel: "web" },
    } as any);

    const text = String(result?.messages?.[0]?.content || "");
    expect(text).toMatch(/tipo de habitaci[oó]n/i);
    expect(text).not.toMatch(/fecha de check-out/i);
    expect(text).not.toMatch(/fecha de check-in/i);
  });

  it("en whatsapp con varios faltantes mantiene la pregunta incremental", async () => {
    fillSlotsWithLLMMock.mockRejectedValueOnce(new Error("slot failure"));
    getConvStateMock.mockResolvedValueOnce(null);
    getConvStateMock.mockResolvedValueOnce(null);

    const result = await handleReservationNode({
      detectedLanguage: "es",
      reservationSlots: {},
      normalizedMessage: "quiero reservar",
      hotelId: "hotel999",
      conversationId: "conv-graph-whatsapp-incremental-ask",
      salesStage: "qualify",
      desiredAction: "create",
      messages: [new HumanMessage("quiero reservar")],
      meta: { channel: "whatsapp" },
    } as any);

    const text = String(result?.messages?.[0]?.content || "");
    expect(text).toMatch(/tipo de habitaci[oó]n/i);
    expect(text).not.toMatch(/fecha de check-out/i);
    expect(text).not.toMatch(/fecha de check-in/i);
  });

  it("en email, después de un follow-up parcial, mantiene agrupados los faltantes reales restantes", async () => {
    fillSlotsWithLLMMock.mockResolvedValueOnce({
      need: "question",
      question: "¿Cuántos huéspedes se alojarán?",
      partial: {
        checkIn: "2026-06-23",
        checkOut: "2026-06-25",
      },
    } as any);
    getConvStateMock.mockResolvedValueOnce({
      reservationSlots: {},
      salesStage: "qualify",
      conversationStage: "reservation_collecting",
    });
    getConvStateMock.mockResolvedValueOnce({
      reservationSlots: {},
      salesStage: "qualify",
      conversationStage: "reservation_collecting",
    });

    const result = await handleReservationNode({
      detectedLanguage: "es",
      reservationSlots: {},
      normalizedMessage: "del 23/6/2026 al 25/06/2026",
      hotelId: "hotel999",
      conversationId: "conv-graph-email-followup-grouped-ask",
      salesStage: "qualify",
      desiredAction: "create",
      messages: [
        new AIMessage("Para avanzar con tu reserva necesito: nombre del huésped, tipo de habitación, fecha de check-in y fecha de check-out. ¿Me lo compartís?"),
        new HumanMessage("del 23/6/2026 al 25/06/2026"),
      ],
      meta: { channel: "email" },
    } as any);

    const text = String(result?.messages?.[0]?.content || "");
    expect(text).toMatch(/nombre (?:completo|del huésped|del huesped)/i);
    expect(text).toMatch(/tipo de habitaci[oó]n/i);
    expect(text).toMatch(/n[uú]mero de hu[eé]spedes/i);
    expect(text).not.toMatch(/^¿Cuántos huéspedes se alojarán\?$/i);
    expect(result?.reservationSlots).toEqual(
      expect.objectContaining({
        checkIn: "2026-06-23",
        checkOut: "2026-06-25",
      })
    );
  });

  it("en web, después de un follow-up parcial, mantiene la política incremental", async () => {
    fillSlotsWithLLMMock.mockResolvedValueOnce({
      need: "question",
      question: "¿Cuántos huéspedes se alojarán?",
      partial: {
        checkIn: "2026-06-23",
        checkOut: "2026-06-25",
      },
    } as any);
    getConvStateMock.mockResolvedValueOnce({
      reservationSlots: {},
      salesStage: "qualify",
      conversationStage: "reservation_collecting",
    });
    getConvStateMock.mockResolvedValueOnce({
      reservationSlots: {},
      salesStage: "qualify",
      conversationStage: "reservation_collecting",
    });

    const result = await handleReservationNode({
      detectedLanguage: "es",
      reservationSlots: {},
      normalizedMessage: "del 23/6/2026 al 25/06/2026",
      hotelId: "hotel999",
      conversationId: "conv-graph-web-followup-incremental-ask",
      salesStage: "qualify",
      desiredAction: "create",
      messages: [
        new AIMessage("Para avanzar con tu reserva necesito: nombre del huésped, tipo de habitación, fecha de check-in y fecha de check-out. ¿Me lo compartís?"),
        new HumanMessage("del 23/6/2026 al 25/06/2026"),
      ],
      meta: { channel: "web" },
    } as any);

    const text = String(result?.messages?.[0]?.content || "");
    expect(text).toMatch(/tipo de habitaci[oó]n/i);
    expect(text).not.toMatch(/nombre (?:completo|del huésped|del huesped)/i);
    expect(text).not.toMatch(/n[uú]mero de hu[eé]spedes/i);
  });
});
