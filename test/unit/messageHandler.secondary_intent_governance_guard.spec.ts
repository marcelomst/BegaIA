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
  resolveGuestState: vi.fn(() => undefined),
}));
const isReservationish = (text: string) =>
  /\breserv(a|ar|e|as|o|amos|an)\b/i.test(text) ||
  /\b(reserva|reservas)\b/i.test(text);

vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: vi.fn(async (input: any) => {
      const text = String(input?.normalizedMessage || "").toLowerCase();
      if (isReservationish(text)) {
        return {
          messages: [{ role: "assistant", content: "Para seguir con la reserva necesito las fechas." }],
          category: "reservation",
          meta: {},
        };
      }
      if (/wifi/.test(text)) {
        return {
          messages: [{ role: "assistant", content: "Sí, tenemos wifi en todo el hotel." }],
          category: "amenities_info",
          meta: {},
        };
      }
      if (/desayuno/.test(text)) {
        return {
          messages: [{ role: "assistant", content: "Sí, tenemos desayuno disponible." }],
          category: "amenities_info",
          meta: {},
        };
      }
      if (/mascotas/.test(text)) {
        return {
          messages: [{ role: "assistant", content: "Sí, aceptamos mascotas con aviso previo." }],
          category: "policies",
          meta: {},
        };
      }
      return {
        messages: [{ role: "assistant", content: "Podés escribirnos por WhatsApp o email para seguir." }],
        category: "retrieval_based",
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
vi.mock("@/lib/prompts", () => ({
  defaultPrompt: "{{retrieved}}",
  curatedPrompts: {},
}));
vi.mock("@/lib/web/eventBus", () => ({ emitToConversation: vi.fn(() => {}) }));
vi.mock("@/lib/utils/debugLog", () => ({ debugLog: vi.fn() }));
vi.mock("@/lib/agents/knowledgeBaseAgent", () => ({
  answerWithKnowledge: vi.fn(async ({ question }: any) => {
    const text = String(question || "").toLowerCase();
    if (isReservationish(text)) {
      return {
        ok: false,
        category: "retrieval_based",
        answer: "",
        retrieved: [],
      };
    }
    if (/desayuno/.test(text)) {
      return {
        ok: true,
        category: "amenities_info",
        answer: "Sí, tenemos desayuno disponible.",
        promptKey: "amenities_list",
        retrieved: [],
      };
    }
    if (/mascotas/.test(text)) {
      return {
        ok: true,
        category: "policies",
        answer: "Sí, aceptamos mascotas con aviso previo.",
        promptKey: "policies",
        retrieved: [],
      };
    }
    if (/wifi/.test(text)) {
      return {
        ok: true,
        category: "amenities_info",
        answer: "Sí, tenemos wifi en todo el hotel.",
        promptKey: "amenities_list",
        retrieved: [],
      };
    }
    return {
      ok: true,
      category: "retrieval_based",
      answer: "Podés escribirnos por WhatsApp o email para seguir.",
      retrieved: [],
    };
  }),
}));
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class {
    constructor(_c: any) {}
    async invoke() {
      return { content: "Respuesta base" };
    }
  },
}));

import { handleIncomingMessage } from "@/lib/handlers/messageHandler";

const NO_CUE_RE =
  /despu[eé]s vemos|luego vemos|si quer[eé]s vemos|tamb[ié]n puedo ayudarte con/i;

function msg(content: string) {
  return {
    messageId: `m-${Math.random().toString(36).slice(2, 8)}`,
    hotelId: "hotel-guard-1",
    channel: "web",
    sender: "guest",
    content,
    timestamp: new Date().toISOString(),
    conversationId: "conv-secondary-guard-1",
    guestId: "guest-1",
    detectedLanguage: "es",
  } as any;
}

const expectNoSecondaryMemoryLeak = () => {
  if (!currentState) {
    expect(currentState).toBeNull();
    return;
  }
  expect(currentState && "retainedIntent" in currentState).toBe(false);
  expect(currentState && "secondaryIntent" in currentState).toBe(false);
  expect(currentState && "pendingIntent" in currentState).toBe(false);
};

describe("secondary intent governance guardrails", () => {
  beforeEach(() => {
    currentState = null;
    vi.clearAllMocks();
  });

  it("cross-domain: responde solo reservation sin mencionar secundaria", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 1 al 5 de mayo y saber si tienen desayuno"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/desayuno/i);
    expect(replyText).not.toMatch(NO_CUE_RE);
    expectNoSecondaryMemoryLeak();
  });

  it("reactivación explícita responde faq sin memoria previa", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 1 al 5 de mayo y saber si tienen desayuno"),
      { mode: "automatic", sendReply }
    );

    currentState = null;

    await handleIncomingMessage(msg("desayuno?"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/desayuno/i);
    expect(replyText).not.toMatch(NO_CUE_RE);
    expectNoSecondaryMemoryLeak();
  });

  it("continuidad fuerte: sigue reservation y no reaparece secundaria", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 1 al 5 de mayo y saber si tienen desayuno"),
      { mode: "automatic", sendReply }
    );
    await handleIncomingMessage(msg("2 personas"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/desayuno/i);
    expect(replyText).not.toMatch(NO_CUE_RE);
    expectNoSecondaryMemoryLeak();
  });

  it("cancelación explícita: no reaparece secundaria ni cues", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 1 al 5 de mayo y saber si tienen desayuno"),
      { mode: "automatic", sendReply }
    );
    await handleIncomingMessage(msg("olvidate de eso"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/desayuno/i);
    expect(replyText).not.toMatch(NO_CUE_RE);
    expectNoSecondaryMemoryLeak();
  });

  it("múltiples secundarias: no menciona desayuno ni mascotas", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 1 al 5 y saber si tienen desayuno y si aceptan mascotas"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/desayuno/i);
    expect(replyText).not.toMatch(/mascotas/i);
    expect(replyText).not.toMatch(NO_CUE_RE);
    expectNoSecondaryMemoryLeak();
  });

  it("secundaria contradictoria: no se menciona ni reaparece", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 1 al 5 y no me interesa el desayuno"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/desayuno/i);
    expect(replyText).not.toMatch(NO_CUE_RE);
    expectNoSecondaryMemoryLeak();
  });
});
