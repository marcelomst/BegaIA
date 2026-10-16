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
  finalizeDeterministicCreateProposalIfCurrent: vi.fn(async (
    _hotelId: string,
    _conversationId: string,
    identity: any,
    text: string
  ) => {
    const matched = currentState?.lastProposal?.toolCall?.at === identity.toolCallAt;
    if (matched) {
      currentState = {
        ...currentState,
        reservationSlots: identity.snapshot,
        lastProposal: { ...currentState.lastProposal, text },
        salesStage: identity.available ? "quote" : "followup",
        conversationStage: identity.available ? "reservation_quoted" : "reservation_collecting",
        desiredAction: identity.available ? "create" : "notify_reception",
        activeFlow: "reservation",
      };
    }
    return { matched, modified: matched, matchedCount: matched ? 1 : 0, modifiedCount: matched ? 1 : 0 };
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
  confirmAndCreate: vi.fn(async (hotelId: string, slots: any) => ({
    ok: true,
    reservationId: "R-0001",
    reservation: {
      reservationId: "R-0001",
      hotelId,
      guestName: slots.guestName,
      roomType: slots.roomType,
      numGuests: Number(slots.numGuests ?? slots.guests),
      checkInDate: slots.checkIn,
      checkOutDate: slots.checkOut,
      status: "confirmed",
      currency: "USD",
      priceTotal: 400,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
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
      const finalText = `Tengo ${roomType} disponible. Tarifa por noche: 100 USD. Total 2 noches: 200 USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.`;
      const snapshot = { ...slots, checkIn: ciISO, checkOut: coISO, roomType, numGuests: guests };
      const toolCallAt = new Date().toISOString();
      const richProposal = {
        text: finalText,
        available: true,
        availabilityStatus: "available",
        snapshot,
        options: [{ roomType, pricePerNight: 100, currency: "USD" }],
        toolCall: {
          name: "checkAvailability",
          input: { hotelId: "hotel999", roomType, numGuests: Number(guests), checkIn: ciISO, checkOut: coISO },
          outputSummary: "available:true",
          at: toolCallAt,
        },
      };
      currentState = { ...(currentState || {}), reservationSlots: snapshot, lastProposal: richProposal, salesStage: "quote" };
      return {
        finalText,
        nextSlots: snapshot,
        needsHandoff: false,
        status: "available" as const,
        snapshot,
        richProposal,
        proposalIdentity: {
          sourceText: finalText,
          available: true,
          availabilityStatus: "available" as const,
          toolCallAt,
          outputSummary: "available:true" as const,
          input: richProposal.toolCall.input,
          snapshot,
        },
        proposalPersistence: { matched: true, modified: true, matchedCount: 1, modifiedCount: 1 },
        providerResult: { ok: true, available: true },
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
import { saveChannelMessageToAstra } from "@/lib/db/messages";
import { updateConversationState } from "@/lib/agents/stateUpdaterAgent";
import { getGuest } from "@/lib/db/guests";
import { runAvailabilityCheck } from "@/lib/handlers/pipeline/availability";

function msg(content: string, conversationId = "conv-confirm-1", channel = "web") {
  return {
    messageId: `m-${Math.random().toString(36).slice(2, 8)}`,
    hotelId: "hotel999",
    channel,
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
        checkIn: "2027-03-21",
        checkOut: "2027-03-25",
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
    (getGuest as any).mockResolvedValue({
      guestId: "g1",
      hotelId: "hotel999",
      name: "Geronimo",
      firstName: "Geronimo",
    });
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
          checkIn: "2027-03-21",
          checkOut: "2027-03-25",
          numGuests: 2,
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
    expect(replyText).toMatch(/Reserva a nombre de \*\*Marcelo Martinez\*\*/i);
    expect(replyText).not.toContain("contenido generico");
    expect(replyText).not.toMatch(/^Marcelo,/i);
  });

  it("mantiene compatibilidad con proposal positiva legacy que ya tenía toolCall", async () => {
    currentState = {
      ...currentState,
      conversationStage: undefined,
      lastProposal: {
        text: "Tengo doble disponible. Respondé CONFIRMAR.",
        available: true,
        toolCall: {
          name: "checkAvailability",
          input: {
            hotelId: "hotel999",
            roomType: "double",
            numGuests: 2,
            checkIn: "2027-03-21",
            checkOut: "2027-03-25",
          },
          outputSummary: "available:true",
          at: "2026-04-02T10:00:00.000Z",
        },
      },
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("CONFIRMAR"), { mode: "automatic", sendReply });

    expect(confirmAndCreate).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["unavailable", false, "available:false"],
    ["error", false, "error"],
  ] as const)("bloquea CONFIRMAR cuando la propuesta vigente tiene status %s", async (availabilityStatus, available, outputSummary) => {
    currentState = {
      ...currentState,
      lastProposal: {
        ...currentState.lastProposal,
        available,
        availabilityStatus,
        snapshot: { ...currentState.reservationSlots },
        toolCall: {
          name: "checkAvailability",
          input: {
            hotelId: "hotel999",
            roomType: "double",
            numGuests: 2,
            checkIn: "2027-03-21",
            checkOut: "2027-03-25",
          },
          outputSummary,
          at: "2026-10-15T12:00:00.000Z",
        },
      },
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("CONFIRMAR"), { mode: "automatic", sendReply });

    expect(confirmAndCreate).not.toHaveBeenCalled();
    expect(lastReply(sendReply)).toMatch(/todav[ií]a no tengo una propuesta lista|fechas.*tipo de habitaci[oó]n/i);
  });

  it.each(["unavailable", "error"] as const)(
    "no reutiliza la propuesta positiva anterior después de una respuesta conservadora por %s no persistido",
    async () => {
      currentState = {
        ...currentState,
        activeReservationContext: { kind: "draft", phase: "quoted" },
        lastProposal: {
          text: "Tengo doble disponible. ¿Confirmás la reserva? Respondé CONFIRMAR.",
          available: true,
        },
      };
      vi.mocked(getMessagesByConversation).mockResolvedValueOnce([
        {
          messageId: "m-conservative",
          hotelId: "hotel999",
          channel: "web",
          sender: "assistant",
          role: "ai",
          content: "No pude mantener esa propuesta como vigente de forma segura. Recepción revisará la disponibilidad.",
          timestamp: new Date(Date.now() - 1000).toISOString(),
          conversationId: "conv-confirm-1",
        } as any,
      ]);
      const sendReply = vi.fn(async () => {});

      await handleIncomingMessage(msg("CONFIRMAR"), { mode: "automatic", sendReply });

      expect(confirmAndCreate).not.toHaveBeenCalled();
      expect(lastReply(sendReply)).not.toMatch(/Reserva confirmada|R-0001/i);
    }
  );

  it("bloquea CONFIRMAR cuando la identidad rica no coincide con el snapshot vigente", async () => {
    currentState = {
      ...currentState,
      lastProposal: {
        ...currentState.lastProposal,
        available: true,
        availabilityStatus: "available",
        snapshot: { ...currentState.reservationSlots, roomType: "triple" },
        toolCall: {
          name: "checkAvailability",
          input: {
            hotelId: "hotel999",
            roomType: "triple",
            numGuests: 2,
            checkIn: "2027-03-21",
            checkOut: "2027-03-25",
          },
          outputSummary: "available:true",
          at: "2026-10-15T12:00:00.000Z",
        },
      },
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("CONFIRMAR"), { mode: "automatic", sendReply });

    expect(confirmAndCreate).not.toHaveBeenCalled();
  });

  it("mantiene el cierre de reserva en canal email con confirmación limpia", async () => {
    (getGuest as any).mockResolvedValue({
      guestId: "g1",
      hotelId: "hotel999",
      name: "Geronimo",
      firstName: "Geronimo",
    });
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("Confirmar", "conv-confirm-email-1", "email"), { mode: "automatic", sendReply });

    expect(confirmAndCreate).toHaveBeenCalled();
    expect(updateConversationState).toHaveBeenCalledWith(
      "hotel999",
      "conv-confirm-email-1",
      expect.objectContaining({
        salesStage: "close",
        lastReservation: expect.objectContaining({
          reservationId: "R-0001",
          status: "created",
        }),
      })
    );
    expect(lastReply(sendReply)).toMatch(/Reserva confirmada|R-0001/i);
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

    const firstReply = lastReply(sendReply);
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

    const secondReply = lastReply(sendReply);
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

  it("propaga handoff cuando la recotización por fechas resulta negativa", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-06T12:00:00.000Z"));
    const sendReply = vi.fn(async () => {});
    (runAvailabilityCheck as any).mockImplementationOnce(async (pre: any, slots: any, ciISO: string, coISO: string) => {
      const snapshot = { ...slots, checkIn: ciISO, checkOut: coISO, locale: pre.lang };
      const finalText = "No hay disponibilidad para esas fechas. Recepción revisará alternativas.";
      const toolCallAt = new Date().toISOString();
      const richProposal = {
        text: finalText,
        available: false,
        availabilityStatus: "unavailable",
        snapshot,
        options: [{ roomType: "triple", pricePerNight: 140, currency: "USD" }],
        suggestedRoomType: "triple",
        suggestedPricePerNight: 140,
        toolCall: {
          name: "checkAvailability",
          input: {
            hotelId: pre.msg.hotelId,
            roomType: snapshot.roomType,
            numGuests: Number(snapshot.numGuests),
            checkIn: ciISO,
            checkOut: coISO,
          },
          outputSummary: "available:false",
          at: toolCallAt,
        },
      };
      currentState = {
        ...currentState,
        reservationSlots: snapshot,
        lastProposal: richProposal,
        salesStage: "followup",
        conversationStage: "reservation_collecting",
      };
      return {
        finalText,
        nextSlots: snapshot,
        needsHandoff: true,
        status: "unavailable",
        snapshot,
        richProposal,
        proposalIdentity: {
          sourceText: finalText,
          available: false,
          availabilityStatus: "unavailable",
          toolCallAt,
          outputSummary: "available:false",
          input: richProposal.toolCall.input,
          snapshot,
        },
        proposalPersistence: { matched: true, modified: true, matchedCount: 1, modifiedCount: 1 },
        providerResult: { ok: true, available: false },
      };
    });

    await handleIncomingMessage(msg("mejor del lunes al martes"), { mode: "automatic", sendReply });

    const assistantSave = (saveChannelMessageToAstra as any).mock.calls
      .map((call: any[]) => call[0])
      .filter((message: any) => message?.sender === "assistant")
      .at(-1);
    expect(assistantSave).toMatchObject({ status: "pending", respondedBy: "assistant" });
    expect(assistantSave.content).toMatch(/no hay disponibilidad|recepci[oó]n/i);
    expect(currentState?.lastProposal).toMatchObject({
      available: false,
      availabilityStatus: "unavailable",
      options: [expect.objectContaining({ currency: "USD" })],
    });
    expect(currentState?.salesStage).toBe("followup");
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
        checkIn: "2027-03-21",
        checkOut: "2027-03-25",
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
          checkIn: "2027-03-21",
          checkOut: "2027-03-25",
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
        checkIn: "2027-03-21",
        checkOut: "2027-03-25",
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
        checkIn: "2027-03-21",
        checkOut: "2027-03-25",
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
        checkIn: "2027-04-01",
        checkOut: "2027-04-04",
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
