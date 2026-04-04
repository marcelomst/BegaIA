import { beforeEach, describe, expect, it, vi } from "vitest";

let currentState: any = null;

const { agentInvoke, answerWithKnowledgeMock, confirmAndCreateMock, modifyReservationMock, getHotelConfigMock } = vi.hoisted(() => ({
  agentInvoke: vi.fn(async (input: any) => {
    const text = String(input?.normalizedMessage || "").toLowerCase();
    if (/mascotas|pets/.test(text)) {
      return {
        messages: [{ role: "assistant", content: "Para cotizar una habitación doble necesito las fechas de check-in y check-out." }],
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
  answerWithKnowledgeMock: vi.fn(async ({ question }: any) => {
    const text = String(question || "").toLowerCase();
    if (/mascotas|pets/.test(text)) {
      return {
        ok: true,
        category: "retrieval_based",
        answer: "Sí, aceptamos mascotas.",
        retrieved: [],
      };
    }
    if (/desayuno|breakfast/.test(text)) {
      return {
        ok: true,
        category: "amenities_info",
        answer: "El desayuno se sirve de 07:00 a 10:30.",
        promptKey: "breakfast_bar",
        retrieved: [],
      };
    }
    return {
      ok: true,
      category: "retrieval_based",
      answer: "Respuesta base",
      retrieved: [],
    };
  }),
  confirmAndCreateMock: vi.fn(async () => ({
    ok: true,
    reservationId: "RES-NEW-1",
    message: "Reserva creada",
  })),
  modifyReservationMock: vi.fn(async (_hotelId: string, reservationId: string) => ({
    ok: true,
    message: `Reserva modificada ${reservationId}`,
  })),
  getHotelConfigMock: vi.fn(async () => ({
    hotelName: "Hotel Demo",
    schedules: {
      checkIn: "15:00",
      checkOut: "11:00",
      breakfast: "07:00 - 10:30",
    },
    amenities: {
      wifiNotes: "Wi-Fi gratis.",
      parkingNotes: "Parking sujeto a disponibilidad.",
    },
  })),
}));

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
    if (st.lastReservation?.status === "created" || st.lastReservation?.status === "updated") return "booked";
    if (st.reservationSlots || st.salesStage || st.conversationStage) return "prospect";
    return undefined;
  }),
}));
vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: getHotelConfigMock,
}));
vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: agentInvoke,
  },
}));
vi.mock("@/lib/agents/knowledgeBaseAgent", () => ({
  answerWithKnowledge: answerWithKnowledgeMock,
}));
vi.mock("@/lib/agents/reservations", () => ({
  confirmAndCreate: confirmAndCreateMock,
  modifyReservation: modifyReservationMock,
  cancelReservation: vi.fn(async (_hotelId: string, reservationId: string) => ({
    ok: true,
    message: `Reserva cancelada ${reservationId}`,
  })),
}));
vi.mock("@/lib/prompts", () => ({
  defaultPrompt: "{{retrieved}}",
  curatedPrompts: {},
}));
vi.mock("@/lib/web/eventBus", () => ({ emitToConversation: vi.fn(() => {}) }));
vi.mock("@/lib/utils/debugLog", () => ({ debugLog: vi.fn() }));
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class { constructor(_c: any) {} async invoke() { return { content: "Respuesta base" }; } },
}));

import { handleIncomingMessage } from "@/lib/handlers/messageHandler";

function msg(content: string, conversationId: string) {
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

describe("messageHandler cross-domain intent prioritization", () => {
  beforeEach(() => {
    currentState = null;
    vi.clearAllMocks();
  });

  it("prioriza reservation sobre FAQ en el mismo turno y mantiene foco create", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 1 al 5 de mayo y saber si tienen desayuno", "conv-cross-domain-1"),
      { mode: "automatic", sendReply }
    );

    expect(lastReply(sendReply)).toMatch(/cu[aá]ntos hu[eé]spedes/i);
    expect(lastReply(sendReply)).not.toMatch(/desayuno|07:00 - 10:30/i);
    expect(currentState?.conversationFocus).toMatchObject({
      domain: "reservation",
      subFlow: "create",
      active: true,
    });
    expect(confirmAndCreateMock).not.toHaveBeenCalled();
  });

  it("prioriza pricing sobre policies en el mismo turno y no responde la intención secundaria", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("cuánto sale una doble y si aceptan mascotas", "conv-cross-domain-2"),
      { mode: "automatic", sendReply }
    );

    expect(agentInvoke).not.toHaveBeenCalled();
    expect(lastReply(sendReply)).toMatch(/cotiz|precio exacto/i);
    expect(lastReply(sendReply)).not.toMatch(/mascotas|pets/i);
    expect(confirmAndCreateMock).not.toHaveBeenCalled();
  });

  it("pricing puro no dispara reservation collecting ni foco create", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("cuánto sale una doble", "conv-cross-domain-2b"),
      { mode: "automatic", sendReply }
    );

    expect(agentInvoke).not.toHaveBeenCalled();
    expect(lastReply(sendReply)).toMatch(/cotiz|precio exacto/i);
    expect(lastReply(sendReply)).not.toMatch(/¿cu[aá]l.*check-?in|¿cu[aá]ndo quer[eé]s/i);
    expect(currentState?.conversationFocus?.subFlow).not.toBe("create");
    expect(currentState?.desiredAction).not.toBe("create");
  });

  it("prioriza modify sobre create cuando ambas aparecen en el mismo turno", async () => {
    const sendReply = vi.fn(async () => {});
    currentState = {
      lastReservation: {
        reservationId: "RES-100",
        status: "created",
        createdAt: "2026-04-01T10:00:00.000Z",
        channel: "web",
        guestName: "Ana Gomez",
        roomType: "double",
        checkIn: "2026-05-01",
        checkOut: "2026-05-05",
        numGuests: "2",
      },
      reservationHistory: [
        {
          reservationId: "RES-100",
          status: "created",
          createdAt: "2026-04-01T10:00:00.000Z",
          channel: "web",
          guestName: "Ana Gomez",
          roomType: "double",
          checkIn: "2026-05-01",
          checkOut: "2026-05-05",
          numGuests: "2",
        },
      ],
      activeReservationContext: {
        kind: "reservation",
        reservationId: "RES-100",
        phase: "confirmed",
        updatedAt: "2026-04-01T10:00:00.000Z",
      },
    };

    await handleIncomingMessage(
      msg("cambiame la reserva y además quiero otra", "conv-cross-domain-3"),
      { mode: "automatic", sendReply }
    );

    expect(currentState?.desiredAction).toBe("modify");
    expect(currentState?.conversationFocus).toMatchObject({
      domain: "reservation",
      subFlow: "modify",
      active: true,
    });
    expect(lastReply(sendReply)).toMatch(/qu[eé] te gustar[ií]a cambiar|cambiar fechas|cambiar hu[eé]spedes/i);
    expect(lastReply(sendReply)).not.toMatch(/check-?in y check-?out.*tipo de habitaci[oó]n/i);
    expect(confirmAndCreateMock).not.toHaveBeenCalled();
    expect(modifyReservationMock).not.toHaveBeenCalled();
  });

  it("con modify activo, una FAQ pura puede responderse sin quedar secuestrada por el subflujo", async () => {
    const sendReply = vi.fn(async () => {});
    currentState = {
      reservationSlots: {
        guestName: "Ana Gomez",
        roomType: "double",
        numGuests: "2",
        checkIn: "2026-05-01",
        checkOut: "2026-05-05",
      },
      selectedReservationTarget: {
        reservationId: "RES-100",
        source: "active_focus",
        strength: "strong",
        updatedAt: "2026-04-01T10:00:00.000Z",
      },
      activeReservationContext: {
        kind: "reservation",
        reservationId: "RES-100",
        phase: "confirmed",
        updatedAt: "2026-04-01T10:00:00.000Z",
      },
      conversationFocus: {
        domain: "reservation",
        subFlow: "modify",
        active: true,
        updatedAt: "2026-04-01T10:00:00.000Z",
      },
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
      modifyState: {
        activeField: "dates",
        updatedAt: "2026-04-01T10:00:00.000Z",
      },
    };

    await handleIncomingMessage(
      msg("tienen desayuno?", "conv-cross-domain-4"),
      { mode: "automatic", sendReply }
    );

    expect(lastReply(sendReply)).toMatch(/desayuno|07:00 - 10:30/i);
    expect(lastReply(sendReply)).not.toMatch(/seguimos modificando|nuevo check-?in|qué te gustaría cambiar/i);
    expect(modifyReservationMock).not.toHaveBeenCalled();
  });

  it("permite salir explícitamente de modify y vuelve a estado neutral", async () => {
    const sendReply = vi.fn(async () => {});
    currentState = {
      conversationFocus: {
        domain: "reservation",
        subFlow: "modify",
        active: true,
        updatedAt: "2026-04-01T10:00:00.000Z",
      },
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
      modifyState: {
        activeField: "roomType",
        updatedAt: "2026-04-01T10:00:00.000Z",
      },
      selectedReservationTarget: {
        reservationId: "RES-100",
        source: "active_focus",
        strength: "strong",
        updatedAt: "2026-04-01T10:00:00.000Z",
      },
      activeReservationContext: {
        kind: "reservation",
        reservationId: "RES-100",
        phase: "confirmed",
        updatedAt: "2026-04-01T10:00:00.000Z",
      },
    };

    await handleIncomingMessage(
      msg("no quiero modificarla", "conv-cross-domain-5"),
      { mode: "automatic", sendReply }
    );

    expect(lastReply(sendReply)).toMatch(/salgo de la modificaci[oó]n|otra consulta/i);
    expect(currentState?.conversationFocus).toBeNull();
    expect(currentState?.modifyState).toBeNull();
    expect(currentState?.activeFlow).toBeNull();
    expect(currentState?.desiredAction).toBeUndefined();
    expect(currentState?.selectedReservationTarget).toBeNull();
  });

  it("retiene una FAQ secundaria explícita y la retoma solo si el usuario la reactiva", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 1 al 5 de mayo y saber si tienen desayuno", "conv-cross-domain-6"),
      { mode: "automatic", sendReply }
    );

    const firstReply = lastReply(sendReply);
    expect(firstReply).toMatch(/cu[aá]ntos hu[eé]spedes/i);
    expect(firstReply).not.toMatch(/desayuno|07:00 - 10:30/i);

    await handleIncomingMessage(
      msg("desayuno?", "conv-cross-domain-6"),
      { mode: "automatic", sendReply }
    );

    expect(lastReply(sendReply)).toMatch(/desayuno|07:00 - 10:30/i);
  });

  it("retiene como máximo una secundaria y descarta el resto", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 1 al 5 y saber si tienen desayuno y si aceptan mascotas", "conv-cross-domain-7"),
      { mode: "automatic", sendReply }
    );

    const reply = lastReply(sendReply);
    expect(reply).not.toMatch(/mascotas|desayuno/i);
  });

  it("la intención retenida no secuestra una continuidad fuerte del siguiente turno", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 1 al 5 de mayo y saber si tienen desayuno", "conv-cross-domain-8"),
      { mode: "automatic", sendReply }
    );

    expect(lastReply(sendReply)).not.toMatch(/desayuno|07:00 - 10:30/i);

    await handleIncomingMessage(
      msg("2 personas", "conv-cross-domain-8"),
      { mode: "automatic", sendReply }
    );

    expect(lastReply(sendReply)).toMatch(/tipo de habitaci[oó]n/i);
    expect(lastReply(sendReply)).not.toMatch(/desayuno|07:00 - 10:30/i);
  });

  it("limpia la intención retenida si el usuario la cancela explícitamente", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 1 al 5 de mayo y saber si tienen desayuno", "conv-cross-domain-9"),
      { mode: "automatic", sendReply }
    );

    expect(lastReply(sendReply)).not.toMatch(/desayuno|07:00 - 10:30/i);

    await handleIncomingMessage(
      msg("olvidate de eso", "conv-cross-domain-9"),
      { mode: "automatic", sendReply }
    );

    expect(lastReply(sendReply)).not.toMatch(/desayuno|07:00 - 10:30/i);
  });

  it("no retiene secundaria contradictoria dentro del mismo turno", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 1 al 5 y no me interesa el desayuno", "conv-cross-domain-10"),
      { mode: "automatic", sendReply }
    );

    expect(lastReply(sendReply)).not.toMatch(/desayuno/i);
  });
});
