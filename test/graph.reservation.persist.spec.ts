// Path: /root/begasist/test/graph.reservation.persist.spec.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

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
    vi.clearAllMocks();
    // por defecto, no hay snapshot previo
    (getConvState as any).mockResolvedValue(null);
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
        checkIn: "2026-03-14",
        checkOut: "2026-03-16",
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

  it("slots completos → persiste slots y lastProposal; responde con confirmación (quote)", async () => {
    (fillSlotsWithLLM as any).mockResolvedValue({
      need: "none",
      slots: {
        guestName: "Juan Perez",
        roomType: "double",
        guests: 2,
        checkIn: "2025-09-10",
        checkOut: "2025-09-12",
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
      normalizedMessage: "Quiero reservar doble 10 al 12 de Septiembre",
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
          checkIn: "2025-09-10",
          checkOut: "2025-09-12",
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
              checkIn: "2025-09-10",
              checkOut: "2025-09-12",
            }),
            outputSummary: "available:true",
          }),
        }),
        salesStage: "quote",
        updatedBy: "ai",
      })
    );
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
        checkIn: "2025-09-20",
        checkOut: "2025-09-22",
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
