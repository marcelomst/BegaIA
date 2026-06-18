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
  normalizeReservationIntent: (text: string) => {
    const normalizedText = String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[“”"'`]/g, "")
      .replace(/[¡!¿?.,;:()]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const isModifyInquiry =
      /\b(modify|modific(ar)?|cambi(ar)?|edit|change|update)\b.*\b(si|if|se)\b.*\b(hay|have|tem|availability|disponibilidad|lugar)\b/i.test(normalizedText) ||
      /\b(quiero modificar si hay lugar|quiero cambiar si hay lugar)\b/i.test(normalizedText) ||
      /\b(quiero saber si puedo|puedo|se puede|can i|can we|posso|da pra)\s+(modify|modificar|cambiar|editar|alterar|change|edit|update|mudar)\b/i.test(normalizedText) ||
      /\b(before|antes de)\s+(modify|modificar|cambiar|editar|alterar|change|edit|update|mudar)\b/i.test(normalizedText) ||
      /\bsi\s+(modifico|modificar|cambio|cambiar|edito|editar|altero|alterar|change|edit|update|mudar)\b.*\b(cobran|cobrar|charge|price|precio|policy|politica|penalidad|penalty)\b/i.test(normalizedText) ||
      /\b(modify|modificar|cambiar|editar|alterar|change|edit|update|mudar)\b.*\b(me recordas|recordas|recordame|recordar|price|precio)\b/i.test(normalizedText);
    if (isModifyInquiry) return { kind: "other", executable: false, normalizedText };
    if (/\b(modify|modific(?:ar|a|ame|alo|ala)?|cambi(?:ar|a|ame|alo|ala)?|edit(?:ar|a)?|alter(?:ar|a)?|change|update)\b/i.test(normalizedText)) {
      return { kind: "modify", executable: true, normalizedText };
    }
    return { kind: "other", executable: false, normalizedText };
  },
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

  it("si create espera checkOut y el turno dice 'check out' explícito inválido, repregunta checkOut y no checkIn", async () => {
    fillSlotsWithLLMMock.mockResolvedValueOnce({
      need: "question",
      question: "¿Cuál sería la nueva fecha de check-in? (dd/mm/aaaa)",
      partial: {
        checkIn: "2026-05-25",
        numGuests: 2,
      },
    } as any);
    getConvStateMock.mockResolvedValueOnce({
      reservationSlots: {
        roomType: "double",
        checkIn: "2026-05-30",
      },
      salesStage: "qualify",
      conversationStage: "reservation_collecting",
    });
    getConvStateMock.mockResolvedValueOnce({
      reservationSlots: {
        roomType: "double",
        checkIn: "2026-05-30",
      },
      salesStage: "qualify",
      conversationStage: "reservation_collecting",
    });

    const result = await handleReservationNode({
      detectedLanguage: "es",
      reservationSlots: {
        roomType: "double",
        checkIn: "2026-05-30",
        checkOut: "2026-05-25",
        numGuests: "2",
      },
      normalizedMessage: "check out 25/5/2026, 2 personas",
      hotelId: "hotel999",
      conversationId: "conv-graph-explicit-checkout-invalid",
      salesStage: "qualify",
      desiredAction: "create",
      messages: [
        new AIMessage("Perfecto. ¿Podés confirmarme también la fecha de check-out? (formato dd/mm/aaaa)"),
        new HumanMessage("check out 25/5/2026, 2 personas"),
      ],
      meta: { channel: "web" },
    } as any);

    const text = String(result?.messages?.[0]?.content || "");
    expect(text).toMatch(/check-?out|fecha de check-out/i);
    expect(text).not.toMatch(/ya pas[oó].*check-?in|nueva fecha de check-?in/i);
    expect(result?.reservationSlots).toEqual(
      expect.objectContaining({
        roomType: "double",
        checkIn: "2026-05-30",
        numGuests: "2",
      })
    );
    expect(result?.reservationSlots?.checkOut).toBeUndefined();
    expect(runAvailabilityCheckMock).not.toHaveBeenCalled();
    expect(confirmAndCreateMock).not.toHaveBeenCalled();
  });

  it.each([
    "quiero saber si puedo modificar",
    "antes de modificar, ¿me recordás el precio?",
    "quiero cambiar si hay lugar",
  ])("en salesStage close no abre modify legacy para consulta no ejecutable: %s", async (text) => {
    const result = await handleReservationNode({
      detectedLanguage: "es",
      reservationSlots: {
        guestName: "Ana Gomez",
        roomType: "double",
        checkIn: "2026-04-22",
        checkOut: "2026-04-25",
        numGuests: "2",
      },
      normalizedMessage: text,
      hotelId: "hotel999",
      conversationId: "conv-graph-close-modify-inquiry",
      salesStage: "close",
      desiredAction: undefined,
      messages: [
        new AIMessage("Reserva confirmada."),
        new HumanMessage(text),
      ],
      meta: { channel: "web" },
    } as any);

    const replyText = String((result as any)?.messages?.[0]?.content || "");
    expect(replyText).not.toMatch(/¿qué dato de la reserva deseas modificar\?|what detail of the booking would you like to modify\?/i);
    expect((result as any)?.desiredAction).not.toBe("modify");
    expect((result as any)?.category).not.toBe("modify_reservation_field");
  });

  it("en salesStage close mantiene modify ejecutable para 'quiero modificar la segunda reserva'", async () => {
    const result = await handleReservationNode({
      detectedLanguage: "es",
      reservationSlots: {
        guestName: "Ana Gomez",
        roomType: "double",
        checkIn: "2026-04-22",
        checkOut: "2026-04-25",
        numGuests: "2",
      },
      normalizedMessage: "quiero modificar la segunda reserva",
      hotelId: "hotel999",
      conversationId: "conv-graph-close-modify-exec",
      salesStage: "close",
      desiredAction: "modify",
      messages: [
        new AIMessage("Reserva confirmada."),
        new HumanMessage("quiero modificar la segunda reserva"),
      ],
      meta: { channel: "web" },
    } as any);

    const replyText = String((result as any)?.messages?.[0]?.content || "");
    expect(replyText).toMatch(/qué dato de la reserva deseas modificar|what detail of the booking would you like to modify/i);
    expect((result as any)?.desiredAction).toBe("modify");
    expect((result as any)?.salesStage).toBe("qualify");
  });
});
