import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let currentState: any = null;

vi.mock("@/lib/db/messages", () => ({
  saveChannelMessageToAstra: vi.fn(async () => {}),
  getMessagesByConversation: vi.fn(async () => []),
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
  getConvState: vi.fn(async () => currentState),
  upsertConvState: vi.fn(async (_hotelId: string, _conversationId: string, patch: any) => {
    currentState = { ...(currentState || {}), ...patch };
  }),
  CONVSTATE_VERSION: "test",
  resolveGuestState: vi.fn((st: any) => {
    if (!st) return undefined;
    if (st.salesStage === "close" || st.conversationStage === "reservation_confirmed") return "booked";
    if (st.reservationSlots || st.salesStage || st.conversationStage) return "prospect";
    return undefined;
  }),
}));
vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: vi.fn(async (input: any) => {
      const text = String(input?.normalizedMessage || "");
      if (/disponibilidad/i.test(text)) {
        return {
          messages: [{ role: "assistant", content: "¿Cuál es el tipo de habitación?" }],
          category: "reservation",
          meta: {},
        };
      }
      return {
        messages: [{ role: "assistant", content: "Respuesta base" }],
        category: "reservation",
        meta: {},
      };
    }),
  },
}));
vi.mock("@/lib/agents/reservations", () => ({
  askAvailability: vi.fn(async () => ({
    ok: true,
    available: true,
    options: [{ roomType: "double", pricePerNight: 100, currency: "USD", availability: 2 }],
  })),
  confirmAndCreate: vi.fn(async () => ({ ok: true, reservationId: "R-NEW-01", message: "ok" })),
  modifyReservation: vi.fn(async () => ({ ok: true, message: "ok" })),
}));
vi.mock("@/lib/agents/stateUpdaterAgent", () => ({
  updateConversationState: vi.fn(async (_hotelId: string, _conversationId: string, patch: any) => {
    currentState = { ...(currentState || {}), ...patch };
  }),
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
import { getMessagesByConversation } from "@/lib/db/messages";

function msg(content: string) {
  return {
    messageId: `m-${Math.random().toString(36).slice(2, 8)}`,
    hotelId: "hotel999",
    channel: "web",
    sender: "guest",
    content,
    timestamp: new Date().toISOString(),
    conversationId: "conv-availability-inquiry-policy-1",
    guestId: "g1",
    detectedLanguage: "es",
  } as any;
}

function lastReply(sendReply: any): string {
  return String(sendReply.mock.calls.at(-1)?.[0] || "");
}

describe("messageHandler availability inquiry policy", () => {
  beforeEach(() => {
    currentState = null;
    vi.clearAllMocks();
    vi.mocked(getMessagesByConversation).mockResolvedValue([]);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("recolecta mínimos de availability, responde disponibilidad y no abre create prematuro", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("hola, queria ver si hay disponibilidad"), { mode: "automatic", sendReply });
    expect(lastReply(sendReply)).toMatch(/tipo de habitaci[oó]n/i);

    await handleIncomingMessage(msg("doble"), { mode: "automatic", sendReply });
    expect(lastReply(sendReply)).toMatch(/check-?in|fecha/i);
    expect(lastReply(sendReply)).not.toMatch(/nueva fecha/i);

    await handleIncomingMessage(msg("el sábado"), { mode: "automatic", sendReply });
    expect(lastReply(sendReply)).toMatch(/check-?out|salida/i);

    await handleIncomingMessage(msg("el domingo"), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/disponible|disponibilidad|tarifa por noche/i);
    expect(replyText).not.toMatch(/a nombre de qui[eé]n|nombre y apellido/i);
    expect(replyText).not.toMatch(/confirm[aá]s la reserva|respond[eé]\s+[“"]?confirmar/i);
    expect(currentState?.reservationSlots).toMatchObject({
      roomType: "double",
      checkIn: "2026-04-25",
      checkOut: "2026-04-26",
    });
    expect(currentState?.lastProposal ?? null).toBeNull();
    expect(currentState?.pendingAvailabilityVerification ?? null).toBeNull();
    expect(currentState?.lastCategory).toBe("availability_inquiry");
    expect(currentState?.desiredAction).toBeUndefined();
  });

  it("después de responder disponibilidad solo entra en create si el usuario expresa intención de reservar", async () => {
    const sendReply = vi.fn(async () => {});

    currentState = {
      reservationSlots: {
        roomType: "double",
        checkIn: "2026-04-25",
        checkOut: "2026-04-26",
      },
      lastCategory: "availability_inquiry",
      salesStage: "qualify",
    };

    await handleIncomingMessage(msg("sí, quiero reservar"), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/cu[aá]ntos hu[eé]spedes/i);
    expect(replyText).not.toMatch(/a nombre de qui[eé]n|confirm[aá]s la reserva/i);
    expect(currentState?.conversationFocus?.subFlow).toBe("create");
    expect(currentState?.desiredAction).toBe("create");
    expect(currentState?.lastCategory).toBe("reservation");
    expect(currentState?.reservationSlots).toMatchObject({
      roomType: "double",
      checkIn: "2026-04-25",
      checkOut: "2026-04-26",
    });
  });

  it("handoff: tras inquiry positiva, 'reservemos' entra en create y pide el siguiente faltante real", async () => {
    const sendReply = vi.fn(async () => {});

    currentState = {
      reservationSlots: {
        roomType: "double",
        checkIn: "2026-04-25",
        checkOut: "2026-04-26",
      },
      lastCategory: "availability_inquiry",
      salesStage: "qualify",
    };

    vi.mocked(getMessagesByConversation).mockResolvedValue([
      {
        messageId: "a1",
        hotelId: "hotel999",
        channel: "web",
        sender: "assistant",
        role: "ai",
        content: "Tengo doble disponible. Tarifa por noche: 100 USD.\n\nSi querés reservar, después puedo ayudarte a completar la reserva.",
        timestamp: new Date().toISOString(),
        conversationId: "conv-availability-inquiry-policy-1",
      },
    ]);

    await handleIncomingMessage(msg("reservemos"), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/cu[aá]ntos hu[eé]spedes/i);
    expect(replyText).not.toMatch(/disponible|disponibilidad|tarifa por noche/i);
    expect(currentState?.conversationFocus?.subFlow).toBe("create");
    expect(currentState?.desiredAction).toBe("create");
    expect(currentState?.lastCategory).toBe("reservation");
  });

  it("handoff: tras inquiry positiva, 'hagamos la reserva' entra en create", async () => {
    const sendReply = vi.fn(async () => {});

    currentState = {
      reservationSlots: {
        roomType: "double",
        checkIn: "2026-04-25",
        checkOut: "2026-04-26",
      },
      lastCategory: "availability_inquiry",
      salesStage: "qualify",
    };

    vi.mocked(getMessagesByConversation).mockResolvedValue([
      {
        messageId: "a2",
        hotelId: "hotel999",
        channel: "web",
        sender: "assistant",
        role: "ai",
        content: "Tengo doble disponible. Tarifa por noche: 100 USD.\n\nSi querés reservar, después puedo ayudarte a completar la reserva.",
        timestamp: new Date().toISOString(),
        conversationId: "conv-availability-inquiry-policy-1",
      },
    ]);

    await handleIncomingMessage(msg("hagamos la reserva"), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/cu[aá]ntos hu[eé]spedes/i);
    expect(replyText).not.toMatch(/disponible|disponibilidad|tarifa por noche/i);
    expect(currentState?.conversationFocus?.subFlow).toBe("create");
    expect(currentState?.desiredAction).toBe("create");
    expect(currentState?.lastCategory).toBe("reservation");
  });

  it("handoff: tras inquiry positiva, 'quiero reservar' entra en create", async () => {
    const sendReply = vi.fn(async () => {});

    currentState = {
      reservationSlots: {
        roomType: "double",
        checkIn: "2026-04-25",
        checkOut: "2026-04-26",
      },
      lastCategory: "availability_inquiry",
      salesStage: "qualify",
    };

    vi.mocked(getMessagesByConversation).mockResolvedValue([
      {
        messageId: "a3",
        hotelId: "hotel999",
        channel: "web",
        sender: "assistant",
        role: "ai",
        content: "Tengo doble disponible. Tarifa por noche: 100 USD.\n\nSi querés reservar, después puedo ayudarte a completar la reserva.",
        timestamp: new Date().toISOString(),
        conversationId: "conv-availability-inquiry-policy-1",
      },
    ]);

    await handleIncomingMessage(msg("quiero reservar"), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/cu[aá]ntos hu[eé]spedes/i);
    expect(replyText).not.toMatch(/disponible|disponibilidad|tarifa por noche/i);
    expect(currentState?.conversationFocus?.subFlow).toBe("create");
    expect(currentState?.desiredAction).toBe("create");
    expect(currentState?.lastCategory).toBe("reservation");
  });

  it.each(["ok", "sí", "dale", "confirmar"])(
    "handoff: tras inquiry positiva, '%s' no entra en create",
    async (userReply) => {
      const sendReply = vi.fn(async () => {});

      currentState = {
        reservationSlots: {
          roomType: "double",
          checkIn: "2026-04-25",
          checkOut: "2026-04-26",
        },
        lastCategory: "availability_inquiry",
        salesStage: "qualify",
      };

      vi.mocked(getMessagesByConversation).mockResolvedValue([
        {
          messageId: "a4",
          hotelId: "hotel999",
          channel: "web",
          sender: "assistant",
          role: "ai",
          content: "Tengo doble disponible. Tarifa por noche: 100 USD.\n\nSi querés reservar, después puedo ayudarte a completar la reserva.",
          timestamp: new Date().toISOString(),
          conversationId: "conv-availability-inquiry-policy-1",
        },
      ]);

      await handleIncomingMessage(msg(userReply), { mode: "automatic", sendReply });

      const replyText = lastReply(sendReply);
      expect(replyText).toMatch(/quiero reservar|quero reservar|i want to book/i);
      expect(replyText).not.toMatch(/cu[aá]ntos hu[eé]spedes|a nombre de qui[eé]n|nombre y apellido/i);
      expect(replyText).not.toMatch(/disponible|disponibilidad|tarifa por noche/i);
      expect(currentState?.conversationFocus?.subFlow).not.toBe("create");
      expect(currentState?.desiredAction).not.toBe("create");
      expect(currentState?.lastCategory).toBe("availability_inquiry");
      expect(currentState?.reservationSlots).toMatchObject({
        roomType: "double",
        checkIn: "2026-04-25",
        checkOut: "2026-04-26",
      });
    }
  );

  it("regresión: create explícito sigue pidiendo guestName cuando falta", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar una doble del 25/04/2026 al 26/04/2026 para 2 personas"),
      { mode: "automatic", sendReply }
    );

    expect(lastReply(sendReply)).toMatch(/a nombre de qui[eé]n|nombre y apellido/i);
    expect(currentState?.lastCategory).toBe("reservation");
  });

  it("regresión: confirmación explícita sigue funcionando en create quoted", async () => {
    const sendReply = vi.fn(async () => {});
    currentState = {
      reservationSlots: {
        guestName: "Ana Gomez",
        roomType: "double",
        checkIn: "2026-04-25",
        checkOut: "2026-04-26",
        numGuests: "2",
      },
      lastProposal: {
        text: "Tengo doble disponible. Tarifa por noche: 100 USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.",
        available: true,
      },
      conversationFocus: {
        domain: "reservation",
        subFlow: "create",
        active: true,
        updatedAt: new Date().toISOString(),
      },
      activeFlow: "reservation",
      desiredAction: "create",
      salesStage: "quote",
      lastCategory: "reservation",
    };

    await handleIncomingMessage(msg("confirmar"), { mode: "automatic", sendReply });

    expect(confirmAndCreate).toHaveBeenCalledTimes(1);
  });
});
