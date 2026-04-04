import { beforeEach, describe, expect, it, vi } from "vitest";

let currentState: any = null;

const { agentInvoke, answerWithKnowledgeMock, confirmAndCreateMock, modifyReservationMock, getHotelConfigMock } = vi.hoisted(() => ({
  agentInvoke: vi.fn(async (_input: any) => ({
    messages: [{ role: "assistant", content: "Respuesta base" }],
    category: "reservation",
    meta: {},
  })),
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

const NO_CUE_RE = /despu[eé]s vemos|luego vemos|si quer[eé]s vemos|tamb[ié]n puedo ayudarte con/i;

function expectNoSecondaryCue(text: string) {
  expect(text).not.toMatch(NO_CUE_RE);
}

function expectNoSecondaryMemoryLeak(state: any) {
  const keys = Object.keys(state || {});
  expect(keys).not.toContain("retainedIntent");
  expect(keys).not.toContain("secondaryIntent");
  expect(keys).not.toContain("pendingIntent");
}

describe("secondary intent governance guard", () => {
  beforeEach(() => {
    currentState = null;
    vi.clearAllMocks();
  });

  it("cross-domain con secundaria explícita responde solo reservation y no menciona secundaria", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 1 al 5 de mayo y saber si tienen desayuno", "conv-guard-1"),
      { mode: "automatic", sendReply }
    );

    const reply = lastReply(sendReply);
    expect(reply).toMatch(/cu[aá]ntos hu[eé]spedes/i);
    expect(reply).not.toMatch(/desayuno|07:00 - 10:30/i);
    expectNoSecondaryCue(reply);
    expectNoSecondaryMemoryLeak(currentState);
  });

  it("reactivación explícita responde FAQ sin depender de memoria previa", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 1 al 5 de mayo y saber si tienen desayuno", "conv-guard-2"),
      { mode: "automatic", sendReply }
    );

    currentState = null;

    await handleIncomingMessage(
      msg("desayuno?", "conv-guard-2"),
      { mode: "automatic", sendReply }
    );

    const reply = lastReply(sendReply);
    expect(reply).toMatch(/desayuno|07:00 - 10:30/i);
    expectNoSecondaryCue(reply);
    expectNoSecondaryMemoryLeak(currentState);
  });

  it("continuidad fuerte del flujo principal no reintroduce secundaria", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 1 al 5 de mayo y saber si tienen desayuno", "conv-guard-3"),
      { mode: "automatic", sendReply }
    );

    await handleIncomingMessage(
      msg("2 personas", "conv-guard-3"),
      { mode: "automatic", sendReply }
    );

    const reply = lastReply(sendReply);
    expect(reply).toMatch(/tipo de habitaci[oó]n/i);
    expect(reply).not.toMatch(/desayuno|07:00 - 10:30/i);
    expectNoSecondaryCue(reply);
    expectNoSecondaryMemoryLeak(currentState);
  });

  it("cancelación explícita de secundaria no provoca reaparición", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 1 al 5 de mayo y saber si tienen desayuno", "conv-guard-4"),
      { mode: "automatic", sendReply }
    );

    await handleIncomingMessage(
      msg("olvidate de eso", "conv-guard-4"),
      { mode: "automatic", sendReply }
    );

    const reply = lastReply(sendReply);
    expect(reply).not.toMatch(/desayuno|07:00 - 10:30/i);
    expectNoSecondaryCue(reply);
    expectNoSecondaryMemoryLeak(currentState);
  });

  it("múltiples secundarias en el mismo turno no se mencionan", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 1 al 5 y saber si tienen desayuno y si aceptan mascotas", "conv-guard-5"),
      { mode: "automatic", sendReply }
    );

    const reply = lastReply(sendReply);
    expect(reply).not.toMatch(/desayuno|mascotas|07:00 - 10:30/i);
    expectNoSecondaryCue(reply);
    expectNoSecondaryMemoryLeak(currentState);
  });

  it("secundaria contradictoria no se menciona ni reaparece", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 1 al 5 y no me interesa el desayuno", "conv-guard-6"),
      { mode: "automatic", sendReply }
    );

    const reply = lastReply(sendReply);
    expect(reply).not.toMatch(/desayuno|07:00 - 10:30/i);
    expectNoSecondaryCue(reply);
    expectNoSecondaryMemoryLeak(currentState);
  });
});
