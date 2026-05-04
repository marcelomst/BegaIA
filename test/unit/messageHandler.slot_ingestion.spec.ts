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
vi.mock("@/lib/agents/stateUpdaterAgent", () => ({
  updateConversationState: vi.fn(async (_hotelId: string, _conversationId: string, patch: any) => {
    currentState = { ...(currentState || {}), ...patch };
  }),
}));
vi.mock("@/lib/agents/reservations", () => ({
  confirmAndCreate: vi.fn(async () => ({ ok: true, reservationId: "R-NEW-01", message: "ok" })),
  modifyReservation: vi.fn(async () => ({ ok: true, message: "ok" })),
  askAvailability: vi.fn(async (_hotelId: string, snapshot: any) => ({
    ok: true,
    available: true,
    proposal: "Tengo disponibilidad.",
    options: [{
      roomType: snapshot.roomType || "double",
      pricePerNight: 100,
      currency: "USD",
    }],
  })),
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

function msg(content: string) {
  return {
    messageId: `m-${Math.random().toString(36).slice(2, 8)}`,
    hotelId: "hotel999",
    channel: "web",
    sender: "guest",
    content,
    timestamp: new Date().toISOString(),
    conversationId: "conv-slot-ingestion-1",
    guestId: "g1",
    detectedLanguage: "es",
  } as any;
}

describe("messageHandler slot ingestion", () => {
  beforeEach(() => {
    currentState = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("absorbe fechas y composición de huéspedes en un solo turno de create sin repreguntar huéspedes", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 10 al 15 de mayo de 2026 para 2 adultos y 1 menor"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/tipo de habitaci[oó]n|room type/i);
    expect(replyText).not.toMatch(/cu[aá]ntos hu[eé]spedes/i);
    expect(currentState?.reservationSlots).toMatchObject({
      checkIn: "2026-05-10",
      checkOut: "2026-05-15",
      numGuests: "3",
    });
  });

  it("en create interpreta 'somos 3' como total directo y avanza al siguiente faltante real", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 10 al 15 de mayo de 2026, somos 3"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/tipo de habitaci[oó]n/i);
    expect(replyText).not.toMatch(/cu[aá]ntos hu[eé]spedes/i);
    expect(currentState?.reservationSlots).toMatchObject({
      checkIn: "2026-05-10",
      checkOut: "2026-05-15",
      numGuests: "3",
    });
  });

  it("absorbe habitación + fechas + huéspedes en create y solo pregunta el dato faltante real", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar una doble del 10 al 15 de mayo de 2026 para 2 adultos con desayuno"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/a nombre de qui[eé]n|guest name|nombre y apellido/i);
    expect(replyText).not.toMatch(/cu[aá]ntos hu[eé]spedes|tipo de habitaci[oó]n|check-?in|check-?out/i);
    expect(currentState?.reservationSlots).toMatchObject({
      roomType: "double",
      checkIn: "2026-05-10",
      checkOut: "2026-05-15",
      numGuests: "2",
    });
  });

  it("en create interpreta 'quiero una doble' con canon estable y pide el siguiente dato faltante", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar una doble"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/check-?in|fecha/i);
    expect(currentState?.reservationSlots).toMatchObject({
      roomType: "double",
    });
  });

  it("en availability -> create, después de 'doble' pide check-in sin framing de modificación", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("hola, queria ver si hay disponibilidad"),
      { mode: "automatic", sendReply }
    );

    currentState = {
      reservationSlots: {},
      conversationFocus: {
        active: true,
        domain: "reservation",
        subFlow: "create",
      },
      activeReservationContext: {
        kind: "draft",
        phase: "collecting",
        updatedAt: new Date().toISOString(),
      },
      activeFlow: "reservation",
      desiredAction: "create",
      salesStage: "qualify",
      lastCategory: "reservation",
    };

    await handleIncomingMessage(
      msg("doble"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/check-?in|fecha/i);
    expect(replyText).not.toMatch(/nueva fecha/i);
  });

  it("absorbe guestName inline con patron 'a nombre de' y no repregunta nombre", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 1 al 5 de mayo de 2026 para 2 personas en una doble a nombre de Ana Gomez"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/a nombre de qui[eé]n|nombre y apellido/i);
  });

  it("primer turno completo con rango dd/mm sin año entra en create y no en modify.dates", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 22/4 al 25/4, doble para 2 personas a nombre de Ana"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/nueva fecha de check-in|modificando fechas/i);
    expect(currentState?.activeFlow).toBe("reservation");
    expect(currentState?.desiredAction).toBe("create");
    expect(currentState?.reservationSlots).toMatchObject({
      roomType: "double",
      checkIn: expect.stringMatching(/-04-22$/),
      checkOut: expect.stringMatching(/-04-25$/),
      numGuests: "2",
    });
  });

  it("no captura 'quiero' como guestName desde un primer turno create con fechas", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 22/4 al 25/4"),
      { mode: "automatic", sendReply }
    );

    expect(currentState?.activeFlow).toBe("reservation");
    expect(currentState?.desiredAction).toBe("create");
    expect(currentState?.reservationSlots).toMatchObject({
      checkIn: expect.stringMatching(/-04-22$/),
      checkOut: expect.stringMatching(/-04-25$/),
    });
    expect(currentState?.reservationSlots?.guestName).toBeUndefined();
  });

  it("no captura tokens de intención como guestName desde 'quiero hacer una reserva'", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero hacer una reserva del 22/4 al 25/4"),
      { mode: "automatic", sendReply }
    );

    expect(currentState?.activeFlow).toBe("reservation");
    expect(currentState?.desiredAction).toBe("create");
    expect(currentState?.reservationSlots).toMatchObject({
      checkIn: expect.stringMatching(/-04-22$/),
      checkOut: expect.stringMatching(/-04-25$/),
    });
    expect(currentState?.reservationSlots?.guestName).toBeUndefined();
  });

  it("control: primer turno create con rango textual sigue entrando en create", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("reservar del 22 al 25 de abril"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/nueva fecha de check-in|modificando fechas/i);
    expect(currentState?.activeFlow).toBe("reservation");
    expect(currentState?.desiredAction).toBe("create");
  });

  it("absorbe una corrección de fechas dentro de create y reemplaza el rango previo", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("Quiero reservar del 10 al 12 de septiembre"),
      { mode: "automatic", sendReply }
    );

    await handleIncomingMessage(
      msg("mejor del 11 al 13"),
      { mode: "automatic", sendReply }
    );

    expect(currentState?.reservationSlots).toMatchObject({
      checkIn: expect.stringMatching(/-09-11$/),
      checkOut: expect.stringMatching(/-09-13$/),
    });
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/10\/09|12\/09|2026-09-10|2026-09-12/i);
    expect(currentState?.activeFlow).toBe("reservation");
    expect(currentState?.desiredAction).toBe("create");
  });

  it("absorbe guestName inline con patron 'nombre X' y no repregunta nombre", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 1 al 5 de mayo de 2026, nombre Ana Gomez, doble para 2 personas"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/a nombre de qui[eé]n|nombre y apellido/i);
  });

  it("preserva captura de guestName completo con patron explicito", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 22/4 al 25/4, doble para 2 personas a nombre de Ana Gomez"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/a nombre de qui[eé]n|nombre y apellido/i);
  });

  it("preserva nombre parcial explicito como insuficiente y pide nombre completo", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 22/4 al 25/4, doble para 2 personas a nombre de Ana"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/a nombre de qui[eé]n|nombre y apellido/i);
    expect(currentState?.reservationSlots).toMatchObject({
      roomType: "double",
      checkIn: expect.stringMatching(/-04-22$/),
      checkOut: expect.stringMatching(/-04-25$/),
      numGuests: "2",
    });
    expect(currentState?.reservationSlots?.guestName).toBeUndefined();
  });

  it("no toma 'nombre de la empresa ...' como guestName ni degrada otros slots", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-30T12:00:00.000Z"));
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 1 al 5 de mayo de 2026, nombre de la empresa Acme, doble para 2"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/a nombre de qui[eé]n|nombre y apellido/i);
    expect(currentState?.reservationSlots).toMatchObject({
      roomType: "double",
      checkIn: "2026-05-01",
      checkOut: "2026-05-05",
      numGuests: "2",
    });
    expect(currentState?.reservationSlots?.guestName).toBeUndefined();
    vi.useRealTimers();
  });

  it("en modify absorbe intención + campo + nuevo valor en el mismo turno sin repregunta redundante", async () => {
    currentState = {
      reservationSlots: {
        guestName: "Marcelo Martinez",
        roomType: "double",
        checkIn: "2026-05-10",
        checkOut: "2026-05-15",
        numGuests: "2",
      },
      activeReservationContext: {
        kind: "reservation",
        reservationId: "R-123",
        phase: "confirmed",
        updatedAt: new Date().toISOString(),
      },
      salesStage: "close",
      conversationStage: "reservation_confirmed",
      lastCategory: "modify_reservation",
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("cambiar huéspedes a 2 adultos y 1 menor"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/cu[aá]l ser[ií]a la nueva cantidad de hu[eé]spedes/i);
    expect(replyText).toMatch(/nueva cantidad de hu[eé]spedes|quer[eé]s cambiar algo m[aá]s/i);
    expect(currentState?.reservationSlots).toMatchObject({
      numGuests: "3",
    });
    expect(currentState?.modifyState?.activeField).toBe("guests");
  });

  it("mantiene modify legítimo cuando existe reserva confirmada y el usuario pide cambiar fechas", async () => {
    currentState = {
      reservationSlots: {
        guestName: "Marcelo Martinez",
        roomType: "double",
        checkIn: "2026-05-10",
        checkOut: "2026-05-15",
        numGuests: "2",
      },
      activeReservationContext: {
        kind: "reservation",
        reservationId: "R-123",
        phase: "confirmed",
        updatedAt: new Date().toISOString(),
      },
      salesStage: "close",
      conversationStage: "reservation_confirmed",
      lastCategory: "modify_reservation",
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero cambiar fechas del 22/04/2026 al 25/04/2026"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/Anot[eé] nuevas fechas|verifique disponibilidad/i);
    expect(currentState?.activeFlow).toBe("modify_reservation");
    expect(currentState?.desiredAction).toBe("modify");
  });

  it("en modify interpreta 'somos 3' con la misma semántica base de huéspedes", async () => {
    currentState = {
      reservationSlots: {
        guestName: "Marcelo Martinez",
        roomType: "double",
        checkIn: "2026-05-10",
        checkOut: "2026-05-15",
        numGuests: "2",
      },
      activeReservationContext: {
        kind: "reservation",
        reservationId: "R-123",
        phase: "confirmed",
        updatedAt: new Date().toISOString(),
      },
      modifyState: {
        activeField: "guests",
        updatedAt: new Date().toISOString(),
      },
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
      salesStage: "close",
      conversationStage: "reservation_confirmed",
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("somos 3"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/cu[aá]l ser[ií]a la nueva cantidad de hu[eé]spedes/i);
    expect(replyText).not.toMatch(/no entend[ií]|humano|asesor/i);
    expect(currentState?.reservationSlots).toMatchObject({
      numGuests: "3",
    });
  });

  it("en modify interpreta 'cambiame a triple' con el mismo canon base de roomType", async () => {
    currentState = {
      reservationSlots: {
        guestName: "Marcelo Martinez",
        roomType: "double",
        checkIn: "2026-05-10",
        checkOut: "2026-05-15",
        numGuests: "2",
      },
      activeReservationContext: {
        kind: "reservation",
        reservationId: "R-123",
        phase: "confirmed",
        updatedAt: new Date().toISOString(),
      },
      modifyState: {
        activeField: "roomType",
        updatedAt: new Date().toISOString(),
      },
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
      salesStage: "close",
      conversationStage: "reservation_confirmed",
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("cambiame a triple"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/qu[eé] tipo de habitaci[oó]n/i);
    expect(replyText).not.toMatch(/no entend[ií]|humano|asesor/i);
    expect(currentState?.reservationSlots).toMatchObject({
      roomType: "triple",
    });
  });

  it("en follow-up create absorbe 'el sábado' como check-in y 'domingo' como check-out sin repreguntar salida", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T12:00:00.000Z"));

    currentState = {
      reservationSlots: {
        roomType: "double",
      },
      conversationFocus: {
        active: true,
        domain: "reservation",
        subFlow: "create",
      },
      activeReservationContext: {
        kind: "draft",
        phase: "collecting",
        updatedAt: new Date().toISOString(),
      },
      activeFlow: "reservation",
      desiredAction: "create",
      salesStage: "qualify",
      lastCategory: "reservation",
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("el sábado"), { mode: "automatic", sendReply });

    const afterCheckInReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(afterCheckInReply).toMatch(/check-?out|salida/i);
    expect(currentState?.reservationSlots).toMatchObject({
      roomType: "double",
      checkIn: "2026-04-25",
    });

    await handleIncomingMessage(msg("Domingo"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/check-?out|salida/i);
    expect(currentState?.reservationSlots).toMatchObject({
      roomType: "double",
      checkIn: "2026-04-25",
      checkOut: "2026-04-26",
    });
  });

  it("en primer turno create absorbe 'del sábado al domingo' y no repregunta fechas", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T12:00:00.000Z"));

    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar una doble del sábado al domingo para 2"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/a nombre de qui[eé]n|nombre y apellido/i);
    expect(replyText).not.toMatch(/check-?in|check-?out|fecha de entrada|fecha de salida/i);
    expect(currentState?.reservationSlots).toMatchObject({
      roomType: "double",
      checkIn: "2026-04-25",
      checkOut: "2026-04-26",
      numGuests: "2",
    });
  });

  it("en primer turno create absorbe 'este finde' y resuelve el rango completo", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T12:00:00.000Z"));

    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar este finde para 2 en doble"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/a nombre de qui[eé]n|nombre y apellido/i);
    expect(replyText).not.toMatch(/check-?in|check-?out|fecha de entrada|fecha de salida/i);
    expect(currentState?.reservationSlots).toMatchObject({
      roomType: "double",
      checkIn: "2026-04-25",
      checkOut: "2026-04-26",
      numGuests: "2",
    });
  });

  it("en primer turno create absorbe 'sábado al domingo próximo' sin repreguntar fechas", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T12:00:00.000Z"));

    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar una doble del sábado al domingo próximo para 2"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/a nombre de qui[eé]n|nombre y apellido/i);
    expect(replyText).not.toMatch(/check-?in|check-?out|fecha de entrada|fecha de salida/i);
    expect(currentState?.reservationSlots).toMatchObject({
      roomType: "double",
      checkIn: "2026-04-25",
      checkOut: "2026-04-26",
      numGuests: "2",
    });
  });

  it("en primer turno create absorbe 'domingo al lunes proximo' y no repregunta check-out", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T12:00:00.000Z"));

    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero hacer una reserva para el domingo al lunes proximo, una simple, para 1 personas a nombre de Ana Gomez"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/check-?out|salida|fecha de salida/i);
    expect(replyText).not.toMatch(/a nombre de qui[eé]n|nombre y apellido/i);
  });

  it("en primer turno create absorbe 'domingo al lunes próximo' con tildes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T12:00:00.000Z"));

    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero hacer una reserva para el domingo al lunes próximo, una simple, para 1 personas a nombre de Ana Gomez"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/check-?out|salida|fecha de salida/i);
    expect(replyText).not.toMatch(/a nombre de qui[eé]n|nombre y apellido/i);
  });

  it("en primer turno create absorbe 'martes hasta el miercoles proximo' y no repregunta check-out", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T12:00:00.000Z"));

    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero hacer una reserva para el martes hasta el miercoles proximo, una doble para 2 personas, a nombre de Marcelo Martinez"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/check-?out|salida|fecha de salida/i);
    expect(replyText).not.toMatch(/a nombre de qui[eé]n|nombre y apellido/i);
  });

  it("en primer turno create absorbe 'martes hasta el miércoles próximo' con tildes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T12:00:00.000Z"));

    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero hacer una reserva para el martes hasta el miércoles próximo, una doble para 2 personas, a nombre de Marcelo Martinez"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/check-?out|salida|fecha de salida/i);
    expect(replyText).not.toMatch(/a nombre de qui[eé]n|nombre y apellido/i);
  });

  it("cuando create espera check-out y recibe fecha explícita no vuelve a repreguntar la salida", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T12:00:00.000Z"));

    currentState = {
      reservationSlots: {
        roomType: "double",
        checkIn: "2026-04-25",
      },
      conversationFocus: {
        active: true,
        domain: "reservation",
        subFlow: "create",
      },
      activeReservationContext: {
        kind: "draft",
        phase: "collecting",
        updatedAt: new Date().toISOString(),
      },
      activeFlow: "reservation",
      desiredAction: "create",
      salesStage: "qualify",
      lastCategory: "reservation",
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("26/04/2026"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/check-?out|salida/i);
    expect(currentState?.reservationSlots).toMatchObject({
      roomType: "double",
      checkIn: "2026-04-25",
      checkOut: "2026-04-26",
    });
  });

  it("regresión: en create explícito 'el sábado' sigue funcionando como single-date contextual", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T12:00:00.000Z"));

    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar el sábado"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/fechas parecen inconsistentes|check-out debe ser posterior/i);
    expect(replyText).toMatch(/check-?out|salida/i);
    expect(currentState?.reservationSlots).toMatchObject({
      checkIn: "2026-04-25",
    });
    expect(currentState?.reservationSlots?.checkOut).toBeUndefined();
  });
});
