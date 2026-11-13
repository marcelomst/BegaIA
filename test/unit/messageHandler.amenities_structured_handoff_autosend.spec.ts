import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const scenario = vi.hoisted(() => ({
  graphCategory: "amenities",
  structuredIntent: "amenities_info",
  savedMessages: [] as any[],
  currentState: null as any,
}));

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class TestChatOpenAI {
    withStructuredOutput() {
      return {
        invoke: async () => ({
          answer: "El hotel dispone de estacionamiento.",
          intent: scenario.structuredIntent,
          entities: {},
          actions: [{ type: "notify_reception", detail: "manual review" }],
          handoff: true,
          missing_fields: [],
          language: "es",
        }),
      };
    }
  },
}));

vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: vi.fn(async () => ({
      messages: [{ role: "assistant", content: "El hotel dispone de estacionamiento." }],
      category: scenario.graphCategory,
      meta: {},
    })),
  },
}));

vi.mock("@/lib/db/messages", () => ({
  saveChannelMessageToAstra: vi.fn(async (message: any) => {
    scenario.savedMessages.push({ ...message });
  }),
  getMessagesByConversation: vi.fn(async () => []),
  getMessageById: vi.fn(async () => null),
  updateMessageInAstra: vi.fn(async () => {}),
}));

vi.mock("@/lib/db/conversations", () => ({
  getOrCreateConversation: vi.fn(async () => {}),
  appendConversationReplyTrace: vi.fn(async () => {}),
}));

vi.mock("@/lib/db/guests", () => ({
  getGuest: vi.fn(async () => ({
    guestId: "guest-amenities",
    hotelId: "hotel999",
    name: "Ana",
    mode: "automatic",
  })),
  createGuest: vi.fn(async () => {}),
  updateGuest: vi.fn(async () => {}),
}));

vi.mock("@/lib/db/convState", () => ({
  getConvState: vi.fn(async () => scenario.currentState),
  upsertConvState: vi.fn(async (_hotelId: string, _conversationId: string, patch: any) => {
    scenario.currentState = { ...(scenario.currentState || {}), ...patch };
    return scenario.currentState;
  }),
  CONVSTATE_VERSION: "amenities-handoff-test",
  resolveGuestState: vi.fn(() => undefined),
}));

vi.mock("@/lib/agents/stateUpdaterAgent", () => ({
  updateConversationState: vi.fn(async (_hotelId: string, _conversationId: string, patch: any) => {
    scenario.currentState = { ...(scenario.currentState || {}), ...patch };
    return scenario.currentState;
  }),
}));

vi.mock("@/lib/agents/knowledgeBaseAgent", () => ({
  answerWithKnowledge: vi.fn(async () => ({
    ok: false,
    category: "retrieval_based",
    answer: "",
    retrieved: [],
  })),
}));

vi.mock("@/lib/web/eventBus", () => ({ emitToConversation: vi.fn(() => {}) }));
vi.mock("@/lib/utils/debugLog", () => ({ debugLog: vi.fn() }));
vi.mock("@/lib/prompts", () => ({ defaultPrompt: "{{retrieved}}", curatedPrompts: {} }));

let handleIncomingMessage: typeof import("@/lib/handlers/messageHandler").handleIncomingMessage;

const previousEnv = {
  FORCE_GENERATION: process.env.FORCE_GENERATION,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  STRUCTURED_ENABLED: process.env.STRUCTURED_ENABLED,
  USE_MH_FLOW_GRAPH: process.env.USE_MH_FLOW_GRAPH,
  USE_ORCHESTRATOR_AGENT: process.env.USE_ORCHESTRATOR_AGENT,
  USE_PRE_POS_PIPELINE: process.env.USE_PRE_POS_PIPELINE,
};

function restoreEnv(name: keyof typeof previousEnv) {
  const value = previousEnv[name];
  if (typeof value === "undefined") delete process.env[name];
  else process.env[name] = value;
}

function incomingMessage(suffix: string) {
  return {
    messageId: `amenities-${suffix}`,
    hotelId: "hotel999",
    channel: "web" as const,
    sender: "guest",
    guestId: "guest-amenities",
    conversationId: `conv-amenities-${suffix}`,
    content: "¿El hotel tiene estacionamiento?",
    detectedLanguage: "es",
    timestamp: "2026-11-13T12:00:00.000Z",
  } as any;
}

function assistantOutput() {
  return scenario.savedMessages.find((message) => message.sender === "assistant");
}

describe("structured amenities handoff autosend policy", () => {
  beforeAll(async () => {
    vi.resetModules();
    process.env.FORCE_GENERATION = "1";
    process.env.OPENAI_API_KEY = "test-key-never-used";
    process.env.STRUCTURED_ENABLED = "true";
    process.env.USE_MH_FLOW_GRAPH = "0";
    process.env.USE_ORCHESTRATOR_AGENT = "0";
    process.env.USE_PRE_POS_PIPELINE = "0";
    handleIncomingMessage = (await import("@/lib/handlers/messageHandler")).handleIncomingMessage;
    process.env.FORCE_GENERATION = "0";
  });

  beforeEach(() => {
    scenario.graphCategory = "amenities";
    scenario.structuredIntent = "amenities_info";
    scenario.savedMessages.length = 0;
    scenario.currentState = null;
    vi.clearAllMocks();
  });

  afterAll(() => {
    restoreEnv("FORCE_GENERATION");
    restoreEnv("OPENAI_API_KEY");
    restoreEnv("STRUCTURED_ENABLED");
    restoreEnv("USE_MH_FLOW_GRAPH");
    restoreEnv("USE_ORCHESTRATOR_AGENT");
    restoreEnv("USE_PRE_POS_PIPELINE");
  });

  it("autosends Web automatic when graph amenities and structured amenities_info requests handoff", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(incomingMessage("automatic"), { mode: "automatic", sendReply });

    expect(assistantOutput()).toMatchObject({
      status: "sent",
      meta: { responseTrace: { category: "amenities" } },
    });
    expect(sendReply).toHaveBeenCalledWith(expect.stringMatching(/estacionamiento/i));
  });

  it("keeps the same Web scenario pending when channel mode is supervised", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(incomingMessage("supervised"), { mode: "supervised", sendReply });

    expect(assistantOutput()).toMatchObject({
      status: "pending",
      meta: { responseTrace: { category: "amenities" } },
    });
  });

  it("keeps a non-amenities structured handoff supervised in Web automatic", async () => {
    scenario.graphCategory = "pricing_info";
    scenario.structuredIntent = "pricing_request";
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(incomingMessage("sensitive"), { mode: "automatic", sendReply });

    expect(assistantOutput()).toMatchObject({
      status: "pending",
      meta: { responseTrace: { category: "pricing_info" } },
    });
  });
});
