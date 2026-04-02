import { beforeEach, describe, expect, it, vi } from "vitest";

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
    invoke: vi.fn(async () => ({
      messages: [{ role: "assistant", content: "Respuesta base" }],
      category: "reservation",
      meta: {},
    })),
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

  it("absorbe guestName inline con patron 'a nombre de' y no repregunta nombre", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 1 al 5 de mayo de 2026 para 2 personas en una doble a nombre de Ana Gomez"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/a nombre de qui[eé]n|nombre y apellido/i);
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

  it("no toma 'nombre de la empresa ...' como guestName ni degrada otros slots", async () => {
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
});
