// Path: /root/begasist/test/graph.reservation.persist.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AIMessage, HumanMessage } from "@langchain/core/messages";

// 👇 Mocks de módulos que usa el handler
vi.mock("@/lib/db/convState", () => {
  return {
    getConvState: vi.fn(),
    upsertConvState: vi.fn(),
  };
});

vi.mock("@/lib/agents/reservations", () => {
  return {
    // los seteamos test a test
    fillSlotsWithLLM: vi.fn(),
    askAvailability: vi.fn(),
    confirmAndCreate: vi.fn(),
  };
});

// Import después de definir mocks
import { agentGraph } from "@/lib/agents/graph";
import { handleReservationNode } from "@/lib/agents/nodes/reservation";
import { getConvState, upsertConvState } from "@/lib/db/convState";
import {
  fillSlotsWithLLM,
  askAvailability,
  confirmAndCreate,
} from "@/lib/agents/reservations";

describe("reservation handler - persistencia en conv_state", () => {
  const hotelId = "hotel999";
  const conversationId = "conv-123";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));
    vi.clearAllMocks();
    // por defecto, no hay snapshot previo
    (getConvState as any).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("cuando falta info → pregunta 1 cosa y persiste reservationSlots parcial (salesStage=qualify)", async () => {
    (fillSlotsWithLLM as any).mockResolvedValue({
      need: "question",
      question: "¿Para qué fecha querés hacer el check-in?",
    });

    const res = await agentGraph.invoke({
      normalizedMessage: "Quiero reservar",
      detectedLanguage: "es",
      hotelId,
      conversationId,
      reservationSlots: {}, // sin datos
    });

    // En etapa de cotización prioriza slots transaccionales antes que guestName.
    expect(String(res.messages?.[0]?.content)).toMatch(/tipo de habitación|check-in/);
    expect(upsertConvState).toHaveBeenCalledTimes(1);
    expect(upsertConvState).toHaveBeenCalledWith(
      hotelId,
      conversationId,
      expect.objectContaining({
        reservationSlots: expect.objectContaining({
          // no sabemos cuáles vienen aún; pero debe guardar el locale
          locale: "es",
        }),
        salesStage: "qualify",
        updatedBy: "ai",
      })
    );
  });

  it("pricing web con roomType conocido no pide guestName primero; pide fecha de check-in", async () => {
    (fillSlotsWithLLM as any).mockResolvedValue({
      need: "question",
      question: "¿Cuál es tu nombre?",
      partial: {
        roomType: "double",
        locale: "es",
      },
    });

    const res = await agentGraph.invoke({
      normalizedMessage: "Quisiera saber tarifas para una habitación doble",
      detectedLanguage: "es",
      hotelId,
      conversationId,
      reservationSlots: {},
    });

    expect(String(res.messages?.[0]?.content)).toContain("check-in");
    expect(String(res.messages?.[0]?.content)).not.toMatch(/nombre|huésped/i);
  });

  it("availability web con fechas conocidas difiere guestName y prioriza roomType antes que nombre", async () => {
    (fillSlotsWithLLM as any).mockResolvedValue({
      need: "question",
      question: "¿Cuál es tu nombre y cuántos huéspedes se alojarán?",
      partial: {
        checkIn: "2026-03-21",
        checkOut: "2026-03-23",
        locale: "es",
      },
    });

    const res = await agentGraph.invoke({
      normalizedMessage: "Quiero consultar disponibilidad para este fin de semana",
      detectedLanguage: "es",
      hotelId,
      conversationId,
      reservationSlots: {},
    });

    expect(String(res.messages?.[0]?.content)).toContain("tipo de habitación");
    expect(String(res.messages?.[0]?.content)).not.toMatch(/nombre|huésped/i);
  });

  it("si el usuario informa un check-in pasado, frena de inmediato y repregunta check-in", async () => {
    (fillSlotsWithLLM as any).mockResolvedValue({
      need: "question",
      question: "Perfecto. ¿Podés confirmarme también la fecha de check-out? (formato dd/mm/aaaa)",
      partial: {
        roomType: "double",
        checkIn: "2025-02-21",
        locale: "es",
      },
    });

    const res = await handleReservationNode({
      normalizedMessage: "21/02/2025",
      detectedLanguage: "es",
      hotelId,
      conversationId,
      reservationSlots: { roomType: "double" },
      messages: [
        new HumanMessage("tienen disponibilidad para este fin de semana"),
        new AIMessage("¿Cuál es el tipo de habitación?"),
        new HumanMessage("doble"),
        new AIMessage("¿Cuál es la fecha de check-in?"),
      ],
    } as any);

    const text = String(res.messages?.[0]?.content || "");
    expect(text).toMatch(/ya pasó|in the past|não pode ser anterior/i);
    expect(text).toMatch(/nueva fecha de check-in|new check-in date|nova data de check-in/i);
    expect(text).not.toMatch(/check-out/i);
    expect((askAvailability as any)).not.toHaveBeenCalled();
  });

  it("slots completos → persiste slots y lastProposal; responde con confirmación (quote)", async () => {
    (fillSlotsWithLLM as any).mockResolvedValue({
      need: "none",
      slots: {
        guestName: "Juan Perez",
        roomType: "double",
        guests: 2,
        checkIn: "2026-09-10",
        checkOut: "2026-09-12",
        locale: "es",
      },
    });

    (askAvailability as any).mockResolvedValue({
      ok: true,
      available: true,
      proposal: "Tengo double disponible. Tarifa por noche: 100 USD.",
      options: [{ roomType: "double", pricePerNight: 100, currency: "USD" }],
    });

    const res = await agentGraph.invoke({
      normalizedMessage: "Quiero reservar doble 10 al 12 de Septiembre de 2026",
      detectedLanguage: "es",
      hotelId,
      conversationId,
      reservationSlots: {}, // puede venir vacío
    });

    // mensaje incluye CTA de confirmación
    expect(String(res.messages?.[0]?.content)).toMatch(/CONFIRMAR/);

    // 1) persistió slots completos
    expect(upsertConvState).toHaveBeenCalledWith(
      hotelId,
      conversationId,
      expect.objectContaining({
        reservationSlots: {
          guestName: "Juan Perez",
          roomType: "double",
          checkIn: "2026-09-10",
          checkOut: "2026-09-12",
          numGuests: 2,
          locale: "es",
        },
      })
    );

    // 2) persistió lastProposal con toolCall
    expect(upsertConvState).toHaveBeenCalledWith(
      hotelId,
      conversationId,
      expect.objectContaining({
        lastProposal: expect.objectContaining({
          text: expect.stringContaining("double disponible"),
          available: true,
          options: expect.any(Array),
          toolCall: expect.objectContaining({
            name: "checkAvailability",
            input: expect.objectContaining({
              hotelId,
              roomType: "double",
              numGuests: 2,
              checkIn: "2026-09-10",
              checkOut: "2026-09-12",
            }),
            outputSummary: "available:true",
          }),
        }),
        salesStage: "quote",
        updatedBy: "ai",
      })
    );
  });

  it("si solo falta guestName, pide titular y no cotiza ni ofrece confirmar", async () => {
    (fillSlotsWithLLM as any).mockResolvedValue({
      need: "question",
      partial: {
        roomType: "double",
        checkIn: "2026-11-10",
        checkOut: "2026-11-12",
        numGuests: 2,
        locale: "es",
      },
      question: "¿Cuál es el nombre completo?",
    });

    (askAvailability as any).mockResolvedValue({
      ok: true,
      available: true,
      proposal: "Tengo double disponible. Tarifa por noche: 100 USD.",
      options: [{ roomType: "double", pricePerNight: 100, currency: "USD" }],
    });

    const res = await agentGraph.invoke({
      normalizedMessage: "Quiero reservar doble del 10/11/2026 al 12/11/2026 para 2",
      detectedLanguage: "es",
      hotelId,
      conversationId,
      reservationSlots: {},
    });

    const text = String(res.messages?.[0]?.content || "");
    expect(text).toMatch(/A nombre de quién|nombre y apellido|nombre completo/i);
    expect(text).not.toMatch(/CONFIRMAR/i);
    expect(text).not.toMatch(/Tarifa por noche/i);
    expect((askAvailability as any)).not.toHaveBeenCalled();
  });

  it("si el contexto previo era de fin de semana y el rango nuevo es anómalo, pide confirmación reforzada antes de cotizar", async () => {
    (getConvState as any).mockResolvedValue({
      _id: `${hotelId}:${conversationId}`,
      hotelId,
      conversationId,
      activeFlow: "reservation",
      salesStage: "qualify",
      reservationSlots: {
        roomType: "double",
        checkIn: "2026-02-21",
        numGuests: 2,
        locale: "es",
      },
      updatedAt: new Date().toISOString(),
    });

    (fillSlotsWithLLM as any).mockResolvedValue({
      need: "question",
      partial: {
        roomType: "double",
        checkIn: "2026-02-21",
        checkOut: "2026-03-23",
        numGuests: 2,
        locale: "es",
      },
      question: "¿Cuál es tu nombre completo?",
    });

    const res = await handleReservationNode({
      normalizedMessage: "23/03/2026",
      detectedLanguage: "es",
      hotelId,
      conversationId,
      reservationSlots: {},
      messages: [
        new HumanMessage("tienen disponibilidad para este fin de semana"),
        new AIMessage("¿Cuál es el tipo de habitación?"),
        new HumanMessage("doble"),
        new AIMessage("¿Cuál es la fecha de check-in?"),
        new HumanMessage("21/02/2026"),
        new AIMessage("Perfecto. ¿Podés confirmarme también la fecha de check-out? (formato dd/mm/aaaa)"),
        new HumanMessage("23/03/2026"),
      ],
    } as any);

    const text = String(res.messages?.[0]?.content || "");
    expect(text).toMatch(/cotice igualmente ese rango|diferentes del contexto anterior/i);
    expect(text).toMatch(/30 noches|cambio de mes/i);
    expect(text).not.toMatch(/Tarifa por noche/i);
    expect((askAvailability as any)).not.toHaveBeenCalled();
  });

  it("al confirmar con todo completo en snapshot → crea reserva y persiste lastReservation (close)", async () => {
    // snapshot ya tiene todo; el usuario solo dice “confirmar”
    (getConvState as any).mockResolvedValue({
      _id: `${hotelId}:${conversationId}`,
      hotelId,
      conversationId,
      reservationSlots: {
        guestName: "Ana Gomez",
        roomType: "suite",
        checkIn: "2026-09-20",
        checkOut: "2026-09-22",
        numGuests: 2,
        locale: "es",
      },
      updatedAt: new Date().toISOString(),
    });

    (confirmAndCreate as any).mockResolvedValue({
      ok: true,
      reservationId: "R-ABC123",
      status: "created",
      createdAt: new Date().toISOString(),
      channel: "web",
      message: "Reserva creada. ID: R-ABC123"
    });

    const res = await agentGraph.invoke({
      normalizedMessage: "Confirmar",
      detectedLanguage: "es",
      hotelId,
      conversationId,
      reservationSlots: {}, // no aporta nada nuevo, se usa snapshot
    });

    // El grafo devuelve mensaje de confirmación estandarizado
    expect(String(res.messages?.[0]?.content)).toContain("Reserva confirmada");
    expect(upsertConvState).toHaveBeenCalledWith(
      hotelId,
      conversationId,
      expect.objectContaining({
        lastReservation: expect.objectContaining({
          reservationId: "R-ABC123",
          status: "created",
          channel: "web",
        }),
        salesStage: "close",
        updatedBy: "ai",
      })
    );
  });
});
