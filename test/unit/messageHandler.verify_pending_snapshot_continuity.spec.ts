import { beforeEach, describe, expect, it, vi } from "vitest";

const messageStore: any[] = [];
const convStateStore = new Map<string, any>();

vi.mock("@/lib/db/messages", () => ({
  saveChannelMessageToAstra: vi.fn(async (msg: any) => {
    messageStore.push({ ...msg });
  }),
  getMessagesByConversation: vi.fn(async ({ hotelId, conversationId }: any) =>
    messageStore.filter((m) => m.hotelId === hotelId && m.conversationId === conversationId)
  ),
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
  getConvState: vi.fn(async (hotelId: string, conversationId: string) => {
    return convStateStore.get(`${hotelId}:${conversationId}`) ?? null;
  }),
  upsertConvState: vi.fn(async (hotelId: string, conversationId: string, patch: any) => {
    const key = `${hotelId}:${conversationId}`;
    const prev = convStateStore.get(key) || {
      hotelId,
      conversationId,
      reservationSlots: {},
    };
    const next = {
      ...prev,
      ...patch,
      reservationSlots: {
        ...(prev.reservationSlots || {}),
        ...(patch.reservationSlots || {}),
      },
    };
    if ("pendingAvailabilityVerification" in patch) {
      next.pendingAvailabilityVerification = patch.pendingAvailabilityVerification ?? null;
    }
    convStateStore.set(key, next);
    return next;
  }),
  resolveGuestState: vi.fn(() => undefined),
  CONVSTATE_VERSION: "test",
}));

vi.mock("@/lib/handlers/pipeline/availability", async () => {
  const actual = await vi.importActual<typeof import("@/lib/handlers/pipeline/availability")>("@/lib/handlers/pipeline/availability");
  return {
    ...actual,
    runAvailabilityCheck: vi.fn(async (_pre: any, slots: any, ciISO: string, coISO: string) => ({
      finalText: "Tengo doble disponible. Tarifa por noche: 115 USD. Total 4 noches: 460 USD.\n\n¿Cuántos huéspedes se alojarán?",
      nextSlots: {
        ...slots,
        roomType: slots.roomType || "double",
        checkIn: ciISO,
        checkOut: coISO,
      },
      needsHandoff: false,
    })),
  };
});

vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: vi.fn(async (args: any) => {
      const text = String(args.normalizedMessage || "");
      const slots = args.reservationSlots || {};
      if (/tienen disponibilidad/i.test(text)) {
        return {
          messages: [{ role: "assistant", content: "¿Cuál es el tipo de habitación?" }],
          category: "reservation",
          reservationSlots: {},
          meta: {},
        };
      }
      if (/^doble$/i.test(text)) {
        return {
          messages: [{ role: "assistant", content: "¿Cuál es la fecha de check-in?" }],
          category: "reservation",
          reservationSlots: { roomType: "double" },
          meta: {},
        };
      }
      if (/21\/03\/2026/.test(text)) {
        return {
          messages: [{ role: "assistant", content: "¿Cuál es la fecha de check-out?" }],
          category: "reservation",
          reservationSlots: { roomType: "double", checkIn: "2026-03-21" },
          meta: {},
        };
      }
      if (/25\/03\/2026/.test(text)) {
        return {
          messages: [{
            role: "assistant",
            content: "Anoté nuevas fechas: 21/03/2026 → 25/03/2026. ¿Deseás que verifique disponibilidad?"
          }],
          category: "reservation",
          reservationSlots: { roomType: "double", checkIn: "2026-03-21", checkOut: "2026-03-25" },
          meta: {},
        };
      }
      if (/^2$/i.test(text)) {
        return {
          messages: [{
            role: "assistant",
            content: slots.checkIn && slots.checkOut
              ? "¿A nombre de quién sería la reserva? (nombre y apellido)"
              : "¿Cuál es la fecha de check-in?",
          }],
          category: "reservation",
          reservationSlots: {
            ...slots,
            numGuests: "2",
          },
          meta: {},
        };
      }
      return {
        messages: [{ role: "assistant", content: "Entendido." }],
        category: "reservation",
        reservationSlots: slots,
        meta: {},
      };
    }),
  },
}));

vi.mock("@/lib/prompts", () => ({
  defaultPrompt: "{{retrieved}}",
  curatedPrompts: {},
}));

vi.mock("@/lib/web/eventBus", () => ({ emitToConversation: vi.fn(() => {}) }));
vi.mock("@/lib/utils/debugLog", () => ({ debugLog: vi.fn() }));
vi.mock("@/lib/agents/knowledgeBaseAgent", () => ({
  answerWithKnowledge: vi.fn(async () => ({
    ok: false,
    category: null,
    answer: "",
  })),
}));
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class { constructor(_c: any) {} async invoke() { return { content: "Respuesta base" }; } },
}));

const hotelId = "hotel999";
const conversationId = "conv-verify-pending-1";
const sendReply = vi.fn(async () => {});
let handleIncomingMessage: typeof import("@/lib/handlers/messageHandler").handleIncomingMessage;

const prevEnv = {
  USE_MH_FLOW_GRAPH: process.env.USE_MH_FLOW_GRAPH,
  USE_ORCHESTRATOR_AGENT: process.env.USE_ORCHESTRATOR_AGENT,
  USE_PRE_POS_PIPELINE: process.env.USE_PRE_POS_PIPELINE,
  STRUCTURED_ENABLED: process.env.STRUCTURED_ENABLED,
};

function msg(content: string) {
  return {
    messageId: `${content}-${Math.random().toString(36).slice(2, 8)}`,
    hotelId,
    channel: "web",
    sender: "guest",
    role: "user",
    content,
    timestamp: new Date().toISOString(),
    conversationId,
    guestId: "g1",
    detectedLanguage: "es",
  } as any;
}

describe("messageHandler verify pending snapshot continuity", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));
    messageStore.length = 0;
    convStateStore.clear();
    vi.clearAllMocks();
    vi.resetModules();
    process.env.USE_MH_FLOW_GRAPH = "0";
    process.env.USE_ORCHESTRATOR_AGENT = "0";
    process.env.USE_PRE_POS_PIPELINE = "0";
    process.env.STRUCTURED_ENABLED = "false";
    handleIncomingMessage = (await import("@/lib/handlers/messageHandler")).handleIncomingMessage;
  });

  it("persiste verify pending, cotiza en el 'si' y no pierde fechas en el turno de huéspedes", async () => {
    await handleIncomingMessage(msg("tienen disponibilidad para este fin de semana"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("doble"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("21/03/2026"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("25/03/2026"), { mode: "automatic", sendReply });

    const stAfterDates = convStateStore.get(`${hotelId}:${conversationId}`);
    expect(stAfterDates?.pendingAvailabilityVerification).toEqual({
      checkIn: "2026-03-21",
      checkOut: "2026-03-25",
    });
    expect(stAfterDates?.reservationSlots?.checkIn).toBe("2026-03-21");
    expect(stAfterDates?.reservationSlots?.checkOut).toBe("2026-03-25");

    const aiCountBeforeAck = messageStore.filter((m) => m.sender === "assistant").length;
    await handleIncomingMessage(msg("si"), { mode: "automatic", sendReply });

    const aiMessagesAfterAck = messageStore.filter((m) => m.sender === "assistant");
    const newAckReplies = aiMessagesAfterAck.slice(aiCountBeforeAck).map((m) => String(m.content || ""));
    expect(
      newAckReplies.some((text) =>
        /verifico disponibilidad/i.test(text) &&
        /Tarifa por noche: 115 USD/i.test(text) &&
        /¿Cuántos huéspedes se alojarán\?/i.test(text)
      )
    ).toBe(true);

    const stAfterAck = convStateStore.get(`${hotelId}:${conversationId}`);
    expect(stAfterAck?.pendingAvailabilityVerification ?? null).toBeNull();

    const aiCountBeforeGuests = messageStore.filter((m) => m.sender === "assistant").length;
    await handleIncomingMessage(msg("2"), { mode: "automatic", sendReply });

    const aiMessagesAfterGuests = messageStore.filter((m) => m.sender === "assistant");
    const newGuestReplies = aiMessagesAfterGuests.slice(aiCountBeforeGuests).map((m) => String(m.content || ""));
    expect(newGuestReplies.some((text) => /¿A nombre de quién sería la reserva\?/i.test(text))).toBe(true);
    expect(newGuestReplies.some((text) => /¿Cuál es la fecha de check-in\?/i.test(text))).toBe(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env.USE_MH_FLOW_GRAPH = prevEnv.USE_MH_FLOW_GRAPH;
    process.env.USE_ORCHESTRATOR_AGENT = prevEnv.USE_ORCHESTRATOR_AGENT;
    process.env.USE_PRE_POS_PIPELINE = prevEnv.USE_PRE_POS_PIPELINE;
    process.env.STRUCTURED_ENABLED = prevEnv.STRUCTURED_ENABLED;
  });
});
