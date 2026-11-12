// Path: test/integration/guest_web_real_pipeline_continuity.spec.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { AIMessage } from "@langchain/core/messages";
import { getCollection } from "../mocks/astra";

const runtimeMocks = vi.hoisted(() => ({
  agentInvoke: vi.fn(),
  resolveGuestIdentity: vi.fn(),
}));

vi.unmock("@/lib/pipeline/handleChannelMessage");
vi.unmock("@/lib/handlers/messageHandler");
vi.unmock("@/lib/services/messages");

vi.mock("@/lib/agents", () => ({
  agentGraph: { invoke: runtimeMocks.agentInvoke },
}));

vi.mock("@/lib/agents/knowledgeBaseAgent", () => ({
  answerWithKnowledge: vi.fn(async () => ({ ok: false, answer: "", category: null, promptKey: null })),
}));

vi.mock("@/lib/agents/retrieval_based", () => ({
  retrievalBased: vi.fn(async () => ({ messages: [], meta: {} })),
}));

vi.mock("@/lib/pipeline/resolveGuestIdentity", () => ({
  resolveGuestIdentity: runtimeMocks.resolveGuestIdentity,
}));

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(async (hotelId: string) => ({
    hotelId,
    defaultLanguage: "es",
    channelConfigs: { web: { enabled: true, mode: "automatic" } },
  })),
}));

vi.mock("@/lib/adapters/registry", () => ({ getAdapter: vi.fn(() => null) }));
vi.mock("@/lib/utils/language", () => ({ detectLanguage: vi.fn(async () => "es") }));
vi.mock("@/lib/web/eventBus", () => ({ emitToConversation: vi.fn() }));
vi.mock("@/lib/utils/debugLog", () => ({ debugLog: vi.fn(), logToFile: vi.fn() }));
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class {
    async invoke() { return new AIMessage("isolated provider response"); }
  },
}));

describe("Guest Web continuity through the real conversational pipeline", () => {
  beforeEach(() => {
    vi.stubEnv("FORCE_GENERATION", "1");
    vi.stubEnv("ENABLE_TEST_FASTPATH", "0");
    vi.stubEnv("DEBUG_FASTPATH", "0");
    vi.stubEnv("GUEST_WEB_CONVERSATION_SECRET", "real-pipeline-guest-secret-with-at-least-32-bytes");
    runtimeMocks.resolveGuestIdentity.mockReset();
    runtimeMocks.resolveGuestIdentity.mockResolvedValue({
      guestId: "guest-real-pipeline",
      guestAlias: "web:ws_real_pipeline",
    });
    runtimeMocks.agentInvoke.mockReset();
    runtimeMocks.agentInvoke.mockImplementation(async (state: { messages?: Array<{ content?: unknown }> }) => {
      const texts = (state.messages ?? []).map((message) => String(message.content ?? ""));
      const loadedFirstTurn = texts.some((text) => text.includes("ALFA-947"));
      return {
        ...state,
        category: "retrieval_based",
        messages: [new AIMessage(loadedFirstTurn ? "runtime-context-loaded:ALFA-947" : "runtime-turn-accepted")],
        meta: { debug: { route_source: "controlled_test_provider" } },
      };
    });
  });

  it("loads the first persisted turn into the fourth real messageHandler invocation", async () => {
    const [{ POST }, conversations, capability] = await Promise.all([
      import("@/app/api/chat/route"),
      import("@/lib/db/conversations"),
      import("@/lib/auth/guestConversationCapability"),
    ]);
    const hotelId = `hotel-real-${crypto.randomUUID()}`;
    const conversationId = `conv-real-${crypto.randomUUID()}`;
    const webSubject = `ws_${crypto.randomUUID()}`;
    const jti = crypto.randomUUID();
    const grant = capability.createGuestWebGrant({ webSubject, jti });
    await conversations.createConversation({
      hotelId,
      conversationId,
      channel: "web",
      lang: "es",
      guestId: "guest-real-pipeline",
      metadata: { guestWebGrant: grant },
    });
    const token = await capability.issueGuestConversationCapability({ hotelId, conversationId, jti, grant });

    const queries = [
      "Dato inicial de continuidad: ALFA-947",
      "Segundo turno de continuidad general",
      "Tercer turno de continuidad general",
      "Recuperá el dato indicado al inicio",
    ];
    const payloads: any[] = [];
    for (const query of queries) {
      const response = await POST(new Request("http://localhost/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query,
          messageId: crypto.randomUUID(),
          hotelId,
          conversationId,
          channel: "web",
        }),
      }));
      expect(response.status).toBe(200);
      payloads.push(await response.json());
    }

    expect(payloads.map((payload) => payload.conversationId)).toEqual([
      conversationId,
      conversationId,
      conversationId,
      conversationId,
    ]);
    expect(payloads[3].response).toContain("runtime-context-loaded:ALFA-947");
    expect(runtimeMocks.agentInvoke).toHaveBeenCalledTimes(4);
    const fourthInput = runtimeMocks.agentInvoke.mock.calls[3][0] as { messages: Array<{ content?: unknown }> };
    expect(fourthInput.messages.map((message) => String(message.content ?? "")))
      .toContain("Dato inicial de continuidad: ALFA-947");

    const persistedMessages = await getCollection("messages").findMany({ hotelId, conversationId });
    expect(persistedMessages).toHaveLength(8);
    expect(new Set(persistedMessages.map((message) => message.conversationId))).toEqual(new Set([conversationId]));
    expect(new Set(persistedMessages.map((message) => message.guestId).filter(Boolean)))
      .toEqual(new Set(["guest-real-pipeline"]));
  }, 30_000);
});
