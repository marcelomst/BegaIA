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
  publishDeterministicCreateProposalIfLatest: vi.fn(async (
    hotelId: string,
    conversationId: string,
    identity: any,
    proposal: any
  ) => {
    const exactProposalIdentity = Boolean(
      identity?.input?.hotelId === hotelId &&
      proposal?.text === identity?.sourceText &&
      proposal?.available === identity?.available &&
      proposal?.availabilityStatus === identity?.availabilityStatus &&
      proposal?.toolCall?.name === "checkAvailability" &&
      proposal?.toolCall?.at === identity?.toolCallAt &&
      proposal?.toolCall?.outputSummary === identity?.outputSummary &&
      JSON.stringify(proposal?.toolCall?.input) === JSON.stringify(identity?.input) &&
      JSON.stringify(proposal?.snapshot) === JSON.stringify(identity?.snapshot)
    );
    if (!exactProposalIdentity) {
      return { matched: false, modified: false, matchedCount: 0, modifiedCount: 0 };
    }
    const currentAt = currentState?.lastProposal?.toolCall?.at;
    if (currentAt && currentAt > identity.toolCallAt) {
      return { matched: false, modified: false, matchedCount: 0, modifiedCount: 0 };
    }
    if (currentAt === identity.toolCallAt) {
      const idempotent = JSON.stringify(currentState?.lastProposal) === JSON.stringify(proposal);
      return {
        matched: idempotent,
        modified: false,
        matchedCount: idempotent ? 1 : 0,
        modifiedCount: 0,
      };
    }
    currentState = {
      ...(currentState || {}),
      hotelId,
      conversationId,
      reservationSlots: { ...identity.snapshot },
      lastProposal: proposal,
      activeFlow: "reservation",
      desiredAction: identity.available ? "create" : "notify_reception",
      salesStage: identity.available ? "qualify" : "followup",
      conversationStage: "reservation_collecting",
      activeReservationContext: { kind: "draft", phase: "collecting", updatedAt: identity.toolCallAt },
    };
    return { matched: true, modified: true, matchedCount: 1, modifiedCount: 1 };
  }),
  finalizeDeterministicCreateProposalIfCurrent: vi.fn(async (
    hotelId: string,
    conversationId: string,
    identity: any,
    text: string
  ) => {
    const proposal = currentState?.lastProposal;
    const exactCurrentIdentity = Boolean(
      currentState?.hotelId === hotelId &&
      currentState?.conversationId === conversationId &&
      identity?.input?.hotelId === hotelId &&
      proposal?.available === identity?.available &&
      proposal?.availabilityStatus === identity?.availabilityStatus &&
      [identity?.sourceText, text].includes(proposal?.text) &&
      proposal?.toolCall?.name === "checkAvailability" &&
      proposal?.toolCall?.at === identity?.toolCallAt &&
      proposal?.toolCall?.outputSummary === identity?.outputSummary &&
      JSON.stringify(proposal?.toolCall?.input) === JSON.stringify(identity?.input) &&
      JSON.stringify(proposal?.snapshot) === JSON.stringify(identity?.snapshot) &&
      JSON.stringify(currentState?.reservationSlots) === JSON.stringify(identity?.snapshot)
    );
    if (!exactCurrentIdentity) {
      return { matched: false, modified: false, matchedCount: 0, modifiedCount: 0 };
    }
    const finalStage = identity.available ? "quote" : "followup";
    const finalConversationStage = identity.available ? "reservation_quoted" : "reservation_collecting";
    const idempotent = proposal.text === text &&
      currentState.salesStage === finalStage &&
      currentState.conversationStage === finalConversationStage;
    currentState = {
      ...currentState,
      lastProposal: { ...proposal, text },
      desiredAction: identity.available ? "create" : "notify_reception",
      salesStage: finalStage,
      conversationStage: finalConversationStage,
      activeReservationContext: {
        kind: "draft",
        phase: identity.available ? "quoted" : "collecting",
        updatedAt: identity.toolCallAt,
      },
    };
    return {
      matched: true,
      modified: !idempotent,
      matchedCount: 1,
      modifiedCount: idempotent ? 0 : 1,
    };
  }),
  CONVSTATE_VERSION: "test",
  resolveGuestState: vi.fn(() => undefined),
}));
vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: vi.fn(async () => ({
      messages: [{ role: "assistant", content: "Respuesta base" }],
      category: "reservation",
      meta: {},
    })),
  },
}));
vi.mock("@/lib/agents/reservations", () => ({
  askAvailability: vi.fn(async (_hotelId: string, snapshot: any) => ({
    ok: true,
    available: true,
    proposal: `Tengo ${snapshot.roomType || "doble"} disponible para ${snapshot.guestName || "el huésped"}. Tarifa por noche: 100 USD. Total 2 noches: 200 USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.`,
    options: [{ roomType: snapshot.roomType || "double", pricePerNight: 100, currency: "USD" }],
  })),
  confirmAndCreate: vi.fn(async (hotelId: string, slots: any) => ({
    ok: true,
    reservationId: "RES-PLURAL-001",
    reservation: {
      reservationId: "RES-PLURAL-001",
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
    message: "created",
  })),
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

function msg(content: string) {
  return {
    messageId: `m-${Math.random().toString(36).slice(2, 8)}`,
    hotelId: "hotel999",
    channel: "web",
    sender: "guest",
    content,
    timestamp: new Date().toISOString(),
    conversationId: "conv-create-sequencing-1",
    guestId: "g1",
    detectedLanguage: "es",
  } as any;
}

function msgWithLang(content: string, detectedLanguage: "es" | "en" | "pt") {
  return {
    ...msg(content),
    detectedLanguage,
  } as any;
}

function lastReply(sendReply: any): string {
  return String(sendReply.mock.calls.at(-1)?.[0] || "");
}

const FUTURE_CHECKIN_TEXT = "18/07/2027";
const FUTURE_CHECKOUT_TEXT = "20/07/2027";

describe("messageHandler create sequencing", () => {
  beforeEach(() => {
    currentState = null;
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("con fechas válidas pero sin huéspedes pregunta huéspedes antes que habitación", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 10 al 15 de mayo de 2026"),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/cu[aá]ntos hu[eé]spedes/i);
    expect(replyText).not.toMatch(/tipo de habitaci[oó]n/i);
  });

  it("con fechas + huéspedes avanza al siguiente faltante real y no repregunta huéspedes", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 10 al 15 de mayo de 2026 para 2 adultos"),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/tipo de habitaci[oó]n/i);
    expect(replyText).not.toMatch(/cu[aá]ntos hu[eé]spedes/i);
  });

  it("con turno rico no repregunta datos ya entregados y pide solo nombre", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar una doble del 10 al 15 de mayo de 2026 para 2 adultos"),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/a nombre de qui[eé]n|nombre y apellido/i);
    expect(replyText).not.toMatch(/cu[aá]ntos hu[eé]spedes|tipo de habitaci[oó]n/i);
  });

  it("extrae huéspedes escritos en español y cotiza sin repreguntar cantidad", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg(`Quiero hacer una reserva, a nombre de Pedro Picapiedra, para el ${FUTURE_CHECKIN_TEXT} al ${FUTURE_CHECKOUT_TEXT} una doble para dos personas`),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).not.toMatch(/cu[aá]ntos hu[eé]spedes se alojar[aá]n/i);
    expect(replyText).toMatch(/tengo doble disponible/i);
    expect(replyText).toMatch(/Pedro Picapiedra/i);
    expect(replyText).toMatch(/Total 2 noches/i);
    expect(replyText).not.toMatch(/Total 2 noche:/i);
    expect(replyText).toMatch(/confirm[aá]s la reserva|respond[eé]\s+["“]?confirmar["”]?/i);
  });

  it("la cotización activa usa pluralización natural para 1 noche", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("Quiero hacer una reserva para el 19/07/2027 al 20/07/2027, una doble, para dos personas, a nombre de Pedro Picapiedra"),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toContain("Total 1 noche: 100 USD.");
    expect(replyText).not.toContain("Total 1 noches");
  });

  it("la cotización activa usa pluralización natural para 1 noche en single", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("Quiero hacer una reserva para el 21/07/2027 al 22/07/2027, una single, para una persona, a nombre de Ana Perez"),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toContain("Total 1 noche: 100 USD.");
    expect(replyText).not.toContain("Total 1 noches");
  });

  it("la confirmación usa pluralización natural para 1 huésped", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg(`Quiero hacer una reserva, a nombre de Ana Perez, para el ${FUTURE_CHECKIN_TEXT} al ${FUTURE_CHECKOUT_TEXT} una doble para 1 persona`),
      { mode: "automatic", sendReply }
    );
    expect(currentState).toMatchObject({
      salesStage: "quote",
      conversationStage: "reservation_quoted",
      reservationSlots: {
        guestName: "Ana Perez",
        roomType: "double",
        checkIn: "2027-07-18",
        checkOut: "2027-07-20",
        numGuests: "1",
      },
      lastProposal: {
        available: true,
        availabilityStatus: "available",
        snapshot: {
          guestName: "Ana Perez",
          roomType: "double",
          checkIn: "2027-07-18",
          checkOut: "2027-07-20",
          numGuests: "1",
        },
        options: [expect.objectContaining({ roomType: "double", pricePerNight: 100, currency: "USD" })],
        toolCall: expect.objectContaining({
          name: "checkAvailability",
          outputSummary: "available:true",
          input: expect.objectContaining({
            hotelId: "hotel999",
            roomType: "double",
            numGuests: 1,
            checkIn: "2027-07-18",
            checkOut: "2027-07-20",
          }),
        }),
      },
    });
    await handleIncomingMessage(msg("CONFIRMAR"), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/Reserva confirmada/i);
    expect(replyText).toContain("1 huésped");
    expect(replyText).not.toContain("huésped(es)");
    expect(replyText).not.toContain("1 huéspedes");
  });

  it("si el sistema espera huéspedes y el usuario responde 'sí', no avanza prematuramente", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 10 al 15 de mayo de 2026"),
      { mode: "automatic", sendReply }
    );
    await handleIncomingMessage(msg("sí"), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/cu[aá]ntos hu[eé]spedes/i);
    expect(replyText).not.toMatch(/confirm[aá]s la reserva|tarifa por noche/i);
  });

  it("mantiene secuencia natural: fechas -> huéspedes -> habitación -> nombre", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 10 al 15 de mayo de 2026"),
      { mode: "automatic", sendReply }
    );
    expect(lastReply(sendReply)).toMatch(/cu[aá]ntos hu[eé]spedes/i);

    await handleIncomingMessage(msg("2 adultos"), { mode: "automatic", sendReply });
    expect(lastReply(sendReply)).toMatch(/tipo de habitaci[oó]n/i);

    await handleIncomingMessage(msg("doble"), { mode: "automatic", sendReply });
    expect(lastReply(sendReply)).toMatch(/a nombre de qui[eé]n|nombre y apellido/i);
  });

  it("mantiene español en create/date correction aunque el follow-up híbrido llegue detectado como inglés", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T12:00:00.000Z"));

    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("Marcelo"), { mode: "automatic", sendReply });
    await handleIncomingMessage(
      msg("Quiero reservar una doble del 19/06/2026 al 20/06/2026 para 2 personas a nombre de Lionel Scaloni"),
      { mode: "automatic", sendReply }
    );

    expect(lastReply(sendReply)).toMatch(/ya pasó/i);
    expect(lastReply(sendReply)).toMatch(/nueva fecha de check-in/i);

    await handleIncomingMessage(
      msgWithLang("corrijo check in 21/06/2026 al 22/06/2026", "en"),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/tengo doble disponible/i);
    expect(replyText).toMatch(/Tarifa por noche/i);
    expect(replyText).toMatch(/Total 1 noche/i);
    expect(replyText).toMatch(/¿Confirm[aá]s la reserva\?/i);
    expect(replyText).toMatch(/Respond[eé]\s+[“"]CONFIRMAR[”"]\.?/i);
    expect(replyText).not.toMatch(/I have/i);
    expect(replyText).not.toMatch(/Rate per night/i);
    expect(replyText).not.toMatch(/Total 1 night/i);
    expect(replyText).not.toMatch(/Do you confirm the booking/i);
  });
});
