import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/messages", () => ({
  saveChannelMessageToAstra: vi.fn(async () => {}),
  getMessagesByConversation: vi.fn(async () => [
    {
      messageId: "m1",
      hotelId: "hotel999",
      channel: "web",
      sender: "assistant",
      role: "ai",
      content: "¿Confirmás la reserva? Respondé “CONFIRMAR”.",
      timestamp: new Date(Date.now() - 1000).toISOString(),
      conversationId: "conv-confirm-1",
    },
  ]),
}));
vi.mock("@/lib/db/conversations", () => ({
  getOrCreateConversation: vi.fn(async () => {}),
  appendConversationReplyTrace: vi.fn(async () => {}),
}));
vi.mock("@/lib/db/guests", () => ({
  getGuest: vi.fn(async () => null),
  createGuest: vi.fn(async () => {}),
  updateGuest: vi.fn(async () => {}),
}));
vi.mock("@/lib/db/convState", () => ({
  getConvState: vi.fn(async () => ({
    reservationSlots: {
      guestName: "Marcelo Martinez",
      roomType: "double",
      checkIn: "2026-03-21",
      checkOut: "2026-03-25",
      numGuests: "2",
    },
    salesStage: "quote",
  })),
  upsertConvState: vi.fn(async () => {}),
  CONVSTATE_VERSION: "test",
  resolveGuestState: (st: any) => {
    if (!st) return undefined;
    if (st.guestState === "prospect" || st.guestState === "booked" || st.guestState === "in_house") {
      return st.guestState;
    }
    if (st.lastReservation?.status === "created" || st.lastReservation?.status === "updated") {
      return "booked";
    }
    if (st.salesStage === "close" || st.conversationStage === "reservation_confirmed") {
      return "booked";
    }
    if (st.reservationSlots || st.salesStage || st.conversationStage) {
      return "prospect";
    }
    return undefined;
  },
}));
vi.mock("@/lib/agents/reservations", () => ({
  confirmAndCreate: vi.fn(async () => ({
    ok: true,
    reservationId: "R-0001",
    message: "✅ Reserva creada. ID: R-0001",
  })),
}));
vi.mock("@/lib/agents", () => ({
  agentGraph: { invoke: vi.fn(async () => ({ messages: [], category: "reservation", meta: {} })) },
}));
vi.mock("@/lib/agents/stateUpdaterAgent", () => ({
  updateConversationState: vi.fn(async () => {}),
}));
vi.mock("@/lib/prompts", () => ({
  defaultPrompt: "{{retrieved}}",
  curatedPrompts: {},
}));
vi.mock("@/lib/web/eventBus", () => ({ emitToConversation: vi.fn(() => {}) }));
vi.mock("@/lib/utils/debugLog", () => ({ debugLog: vi.fn() }));
vi.mock("@/lib/agents/knowledgeBaseAgent", () => ({
  answerWithKnowledge: vi.fn(async () => ({
    ok: true,
    category: "retrieval_based",
    answer: "contenido generico",
    retrieved: [],
  })),
}));
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class { constructor(_c: any) {} async invoke() { return { content: "Respuesta base" }; } },
}));

import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import { confirmAndCreate } from "@/lib/agents/reservations";
import { getConvState } from "@/lib/db/convState";
import { getMessagesByConversation } from "@/lib/db/messages";
import { updateConversationState } from "@/lib/agents/stateUpdaterAgent";

describe("messageHandler reservation confirm follow-up", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    "CONFIRMAR",
    "si, confirmo",
    "comfirmar",
    "confimar",
    "cofirmar",
    "dale",
    "ok hacelo",
  ])("cierra la reserva cuando el usuario responde %s después de la oferta explícita", async (userInput) => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage({
      messageId: "confirm-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: userInput,
      timestamp: new Date().toISOString(),
      conversationId: "conv-confirm-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    expect(confirmAndCreate).toHaveBeenCalled();
    expect(updateConversationState).toHaveBeenCalledWith(
      "hotel999",
      "conv-confirm-1",
      expect.objectContaining({
        reservationSlots: expect.objectContaining({
          guestName: "Marcelo Martinez",
          roomType: "double",
          checkIn: "2026-03-21",
          checkOut: "2026-03-25",
          numGuests: "2",
        }),
        salesStage: "close",
        lastReservation: expect.objectContaining({
          reservationId: "R-0001",
          status: "created",
        }),
      })
    );
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/Reserva confirmada|R-0001/i);
    expect(replyText).not.toContain("contenido generico");
  });

  it("no confirma la reserva con un negativo explícito como 'no confirmes todavía'", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage({
      messageId: "confirm-neg-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "no confirmes todavía",
      timestamp: new Date().toISOString(),
      conversationId: "conv-confirm-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    expect(confirmAndCreate).not.toHaveBeenCalled();
  });

  it("no confirma si no hay estado de cotización y responde pidiendo datos", async () => {
    const sendReply = vi.fn(async () => {});
    (getConvState as any).mockResolvedValueOnce({
      reservationSlots: undefined,
      salesStage: null,
      lastProposal: null,
    });
    (getMessagesByConversation as any).mockResolvedValueOnce([]);

    await handleIncomingMessage({
      messageId: "confirm-missing-state-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "confirmar",
      timestamp: new Date().toISOString(),
      conversationId: "conv-confirm-2",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    expect(confirmAndCreate).not.toHaveBeenCalled();
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText.toLowerCase()).toContain("propuesta");
    expect(replyText.toLowerCase()).toContain("fecha");
  });

  it("al confirmar un segundo booking deja el foco activo en la nueva reserva sin perder el historial", async () => {
    const sendReply = vi.fn(async () => {});
    (getConvState as any).mockResolvedValueOnce({
      reservationSlots: {
        guestName: "Marcelo Martinez",
        roomType: "suite",
        checkIn: "2026-04-01",
        checkOut: "2026-04-04",
        numGuests: "2",
      },
      salesStage: "quote",
      activeFlow: "reservation",
      desiredAction: "create",
      reservationHistory: [
        {
          reservationId: "RES-BASE-01",
          status: "created",
          createdAt: "2026-03-20T10:00:00.000Z",
          channel: "web",
        },
      ],
      lastReservation: {
        reservationId: "RES-BASE-01",
        status: "created",
        createdAt: "2026-03-20T10:00:00.000Z",
        channel: "web",
      },
    });

    await handleIncomingMessage({
      messageId: "confirm-2",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "confirmar",
      timestamp: new Date().toISOString(),
      conversationId: "conv-confirm-3",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    expect(updateConversationState).toHaveBeenCalledWith(
      "hotel999",
      "conv-confirm-3",
      expect.objectContaining({
        reservationHistory: expect.arrayContaining([
          expect.objectContaining({ reservationId: "RES-BASE-01" }),
          expect.objectContaining({ reservationId: "R-0001" }),
        ]),
        lastReservation: expect.objectContaining({
          reservationId: "R-0001",
          status: "created",
        }),
        activeReservationContext: expect.objectContaining({
          kind: "reservation",
          reservationId: "R-0001",
          phase: "confirmed",
        }),
      })
    );
  });
});
