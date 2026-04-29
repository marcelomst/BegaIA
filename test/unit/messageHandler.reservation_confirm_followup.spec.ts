import { beforeEach, describe, expect, it, vi } from "vitest";

let currentState: any = null;

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
  getConvState: vi.fn(async () => currentState),
  upsertConvState: vi.fn(async (_hotelId: string, _conversationId: string, patch: any) => {
    currentState = { ...(currentState || {}), ...patch };
  }),
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
vi.mock("@/lib/handlers/pipeline/availability", async () => {
  const actual = await vi.importActual<typeof import("@/lib/handlers/pipeline/availability")>("@/lib/handlers/pipeline/availability");
  return {
    ...actual,
    runAvailabilityCheck: vi.fn(async (_pre: any, slots: any, ciISO: string, coISO: string) => {
      const roomType = slots.roomType || "double";
      const guests = String(slots.numGuests || "2");
      return {
        finalText: `Tengo ${roomType} disponible. Tarifa por noche: 100 USD. Total 2 noches: 200 USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.`,
        nextSlots: {
          ...slots,
          checkIn: ciISO,
          checkOut: coISO,
          roomType,
          numGuests: guests,
        },
        needsHandoff: false,
      };
    }),
  };
});
vi.mock("@/lib/agents", () => ({
  agentGraph: { invoke: vi.fn(async () => ({ messages: [], category: "reservation", meta: {} })) },
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
import { getConvState } from "@/lib/db/convState";
import { getMessagesByConversation } from "@/lib/db/messages";
import { updateConversationState } from "@/lib/agents/stateUpdaterAgent";

function msg(content: string, conversationId = "conv-confirm-1") {
  return {
    messageId: `m-${Math.random().toString(36).slice(2, 8)}`,
    hotelId: "hotel999",
    channel: "web",
    sender: "guest",
    content,
    timestamp: new Date().toISOString(),
    conversationId,
    guestId: "g1",
    detectedLanguage: "es",
  } as any;
}

function lastReply(sendReply: any): string {
  return String(sendReply.mock.calls.at(-1)?.[0] || "");
}

describe("messageHandler reservation confirm follow-up", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentState = {
      reservationSlots: {
        guestName: "Marcelo Martinez",
        roomType: "double",
        checkIn: "2026-03-21",
        checkOut: "2026-03-25",
        numGuests: "2",
      },
      salesStage: "quote",
      conversationStage: "reservation_quoted",
      activeFlow: "reservation",
      desiredAction: "create",
      conversationFocus: {
        domain: "reservation",
        subFlow: "create",
        active: true,
        updatedAt: "2026-04-02T10:00:00.000Z",
      },
      lastProposal: {
        text: "Tengo doble disponible. Tarifa por noche: 100 USD. Total 4 noches: 400 USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.",
        available: true,
      },
    };
  });

  it.each([
    "CONFIRMAR",
    "confirmar",
  ])("cierra la reserva solo con confirmación limpia: %s", async (userInput) => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg(userInput), { mode: "automatic", sendReply });

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
    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/Reserva confirmada|R-0001/i);
    expect(replyText).not.toContain("contenido generico");
  });

  it.each(["confirmar?", "confirmar mañana"])(
    "no confirma con confirmación ambigua en proposal activa: %s",
    async (userInput) => {
      const sendReply = vi.fn(async () => {});

      await handleIncomingMessage(msg(userInput), { mode: "automatic", sendReply });

      expect(confirmAndCreate).not.toHaveBeenCalled();
      expect(lastReply(sendReply)).toMatch(/respond[eé] solo .?confirmar.?|si quer[eé]s confirmar la reserva/i);
      expect(currentState?.salesStage).toBe("quote");
      expect(currentState?.lastProposal?.available).toBe(true);
    }
  );

  it("con proposal activa de fin de semana, 'confirmar mañana' no entra a date-flow ni modifica fechas", async () => {
    currentState = {
      ...currentState,
      reservationSlots: {
        guestName: "Ana Gomez",
        roomType: "double",
        checkIn: "2026-04-25",
        checkOut: "2026-04-26",
        numGuests: "2",
      },
      lastProposal: {
        text: "Tengo doble disponible. Tarifa por noche: 100 USD. Total 1 noche: 100 USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.",
        available: true,
      },
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("confirmar mañana"), { mode: "automatic", sendReply });

    expect(confirmAndCreate).not.toHaveBeenCalled();
    expect(lastReply(sendReply)).toMatch(/respond[eé] solo .?confirmar.?|si quer[eé]s confirmar la reserva/i);
    expect(lastReply(sendReply)).not.toMatch(/check-?out|fecha de salida|fecha de check-?out/i);
    expect(currentState?.reservationSlots).toMatchObject({
      guestName: "Ana Gomez",
      roomType: "double",
      checkIn: "2026-04-25",
      checkOut: "2026-04-26",
      numGuests: "2",
    });
    expect(currentState?.salesStage).toBe("quote");
    expect(currentState?.lastProposal?.available).toBe(true);
  });

  it("e2e realista: proposal generada en turno 1 mantiene governance ante 'confirmar mañana' en turno 2", async () => {
    process.env.USE_CHRONO_LAYER = "1";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T12:00:00.000Z"));
    currentState = null;
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar una doble del sábado al domingo para 2 a nombre de Ana Gomez", "conv-proposal-e2e-1"),
      { mode: "automatic", sendReply }
    );

    const firstReply = String(sendReply.mock.calls.at(-1)?.[0] || "");
    expect(firstReply).toMatch(/confirm[aá]s la reserva|respond[eé].*confirmar/i);
    expect(currentState?.reservationSlots).toMatchObject({
      guestName: "Ana Gomez",
      roomType: "double",
      checkIn: "2026-04-25",
      checkOut: "2026-04-26",
      numGuests: "2",
    });
    expect(currentState?.salesStage).toBe("quote");
    expect(currentState?.lastProposal?.available).toBe(true);

    await handleIncomingMessage(
      msg("confirmar mañana", "conv-proposal-e2e-1"),
      { mode: "automatic", sendReply }
    );

    const secondReply = String(sendReply.mock.calls.at(-1)?.[0] || "");
    expect(confirmAndCreate).not.toHaveBeenCalled();
    expect(secondReply).toMatch(/respond[eé] solo .?confirmar.?|si quer[eé]s confirmar la reserva/i);
    expect(secondReply).not.toMatch(/check-?out|fecha de salida|fecha de check-?out/i);
    expect(currentState?.reservationSlots).toMatchObject({
      guestName: "Ana Gomez",
      roomType: "double",
      checkIn: "2026-04-25",
      checkOut: "2026-04-26",
      numGuests: "2",
    });
    expect(currentState?.salesStage).toBe("quote");
    expect(currentState?.lastProposal?.available).toBe(true);
    vi.useRealTimers();
    delete process.env.USE_CHRONO_LAYER;
  });

  it.each(["sí", "ok"])(
    "no confirma con afirmativo débil en proposal activa: %s",
    async (userInput) => {
      const sendReply = vi.fn(async () => {});

      await handleIncomingMessage(msg(userInput), { mode: "automatic", sendReply });

      expect(confirmAndCreate).not.toHaveBeenCalled();
      expect(lastReply(sendReply)).toMatch(/propuesta lista|respond[eé].*confirmar/i);
      expect(currentState?.salesStage).toBe("quote");
      expect(currentState?.lastProposal?.available).toBe(true);
    }
  );

  it("con 'no' sale del loop de confirmación y pausa la proposal", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("no"), { mode: "automatic", sendReply });

    expect(confirmAndCreate).not.toHaveBeenCalled();
    expect(lastReply(sendReply)).toMatch(/no confirmo esta propuesta|cambiar fechas, habitaci[oó]n o hu[eé]spedes/i);
    expect(currentState?.salesStage).toBe("qualify");
    expect(currentState?.lastProposal ?? null).toBeNull();
  });

  it("si corrige fechas sobre proposal activa invalida la propuesta previa y recotiza", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-06T12:00:00.000Z"));
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("mejor del lunes al martes"), { mode: "automatic", sendReply });

    expect(confirmAndCreate).not.toHaveBeenCalled();
    expect(lastReply(sendReply)).toMatch(/tarifa por noche|confirm[aá]s la reserva/i);
    expect(currentState?.salesStage).toBe("quote");
    expect(currentState?.reservationSlots).toMatchObject({
      guestName: "Marcelo Martinez",
      roomType: "double",
      numGuests: "2",
      checkIn: "2026-05-11",
      checkOut: "2026-05-12",
    });
    vi.useRealTimers();
  });

  it("si corrige huéspedes no contamina guestName y mantiene el comportamiento de capacidad", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("mejor para 3"), { mode: "automatic", sendReply });

    expect(confirmAndCreate).not.toHaveBeenCalled();
    expect(lastReply(sendReply)).toMatch(/no admite 3 hu[eé]sped|cambiar a/i);
    expect(currentState?.reservationSlots?.guestName).toBe("Marcelo Martinez");
    expect(currentState?.reservationSlots?.numGuests).toBe("3");
    expect(currentState?.reservationSlots?.roomType).toBeUndefined();
    expect(currentState?.salesStage).toBe("qualify");
    expect(currentState?.lastProposal ?? null).toBeNull();
  });

  it("no reabre create ante follow-up de confirmación si la reserva ya quedó confirmada", async () => {
    const sendReply = vi.fn(async () => {});
    (getConvState as any).mockResolvedValueOnce({
      reservationSlots: {
        guestName: "Marcelo Martinez",
        roomType: "double",
        checkIn: "2026-03-21",
        checkOut: "2026-03-25",
        numGuests: "2",
      },
      reservationHistory: [
        {
          reservationId: "R-0001",
          status: "created",
          createdAt: "2026-04-21T10:00:00.000Z",
          channel: "web",
          guestName: "Marcelo Martinez",
          roomType: "double",
          checkIn: "2026-03-21",
          checkOut: "2026-03-25",
          numGuests: "2",
        },
      ],
      lastReservation: {
        reservationId: "R-0001",
        status: "created",
        createdAt: "2026-04-21T10:00:00.000Z",
        channel: "web",
        guestName: "Marcelo Martinez",
        roomType: "double",
        checkIn: "2026-03-21",
        checkOut: "2026-03-25",
        numGuests: "2",
      },
      salesStage: "close",
      conversationStage: "reservation_confirmed",
      activeFlow: null,
      lastProposal: null,
    });

    await handleIncomingMessage(msg("pudiste confirmar?", "conv-confirm-closed-1"), { mode: "automatic", sendReply });

    expect(confirmAndCreate).not.toHaveBeenCalled();
    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/resumen de tu reserva/i);
    expect(replyText).toMatch(/R-0001/i);
    expect(replyText).not.toMatch(/CONFIRMAR/i);
    expect(replyText).not.toMatch(/Tengo\s+doble\s+disponible/i);
  });

  it("no confirma la reserva con un negativo explícito como 'no confirmes todavía'", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("no confirmes todavía"), { mode: "automatic", sendReply });

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

    await handleIncomingMessage(msg("confirmar", "conv-confirm-2"), { mode: "automatic", sendReply });

    expect(confirmAndCreate).not.toHaveBeenCalled();
    const replyText = lastReply(sendReply);
    expect(replyText.toLowerCase()).toContain("propuesta");
    expect(replyText.toLowerCase()).toContain("fecha");
  });

  it("no ejecuta create si la propuesta quedó con draft incompleto y vuelve al dato faltante", async () => {
    const sendReply = vi.fn(async () => {});
    (getConvState as any).mockResolvedValueOnce({
      reservationSlots: {
        checkIn: "2026-03-21",
        checkOut: "2026-03-25",
        roomType: "double",
      },
      salesStage: "quote",
      desiredAction: "create",
      conversationFocus: {
        domain: "reservation",
        subFlow: "create",
        active: true,
        updatedAt: "2026-04-02T10:00:00.000Z",
      },
    });

    await handleIncomingMessage(msg("confirmar", "conv-confirm-3"), { mode: "automatic", sendReply });

    expect(confirmAndCreate).not.toHaveBeenCalled();
    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/cu[aá]ntos hu[eé]spedes/i);
  });

  it("no persiste una reserva creada si confirmAndCreate devuelve ok pero sin reservationId", async () => {
    const sendReply = vi.fn(async () => {});
    (confirmAndCreate as any).mockResolvedValueOnce({
      ok: true,
      reservationId: "",
      message: "ok-without-id",
    });

    await handleIncomingMessage(msg("confirmar"), { mode: "automatic", sendReply });

    expect(updateConversationState).not.toHaveBeenCalledWith(
      "hotel999",
      "conv-confirm-1",
      expect.objectContaining({
        lastReservation: expect.objectContaining({
          status: "created",
        }),
      })
    );
    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/dato faltante|incomplet/i);
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

    await handleIncomingMessage(msg("confirmar", "conv-confirm-3"), { mode: "automatic", sendReply });

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
