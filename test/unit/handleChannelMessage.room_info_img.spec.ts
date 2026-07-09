import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  savedMessages,
  answerWithKnowledgeMock,
  retrievalBasedMock,
  getHotelConfigMock,
  resolveCategoryForHotelMock,
} = vi.hoisted(() => ({
  savedMessages: [] as any[],
  answerWithKnowledgeMock: vi.fn(),
  retrievalBasedMock: vi.fn(),
  getHotelConfigMock: vi.fn(),
  resolveCategoryForHotelMock: vi.fn(),
}));

vi.mock("@/lib/db/messages", () => ({
  saveChannelMessageToAstra: vi.fn(async (msg: any) => {
    savedMessages.push(msg);
  }),
  getMessagesByConversation: vi.fn(async ({ hotelId, channel, conversationId }: any) =>
    savedMessages.filter((msg) =>
      msg.hotelId === hotelId &&
      msg.channel === channel &&
      msg.conversationId === conversationId
    )
  ),
}));

vi.mock("@/lib/services/messages", () => ({
  getMessagesByConversationService: vi.fn(async (hotelId: string, channel: string, conversationId: string) =>
    savedMessages.filter((msg) =>
      msg.hotelId === hotelId &&
      msg.channel === channel &&
      msg.conversationId === conversationId
    )
  ),
}));

vi.mock("@/lib/db/conversations", () => ({
  findActiveConversationByGuestId: vi.fn(async () => null),
  getOrCreateConversation: vi.fn(async () => ({})),
  updateConversation: vi.fn(async () => ({})),
  appendConversationReplyTrace: vi.fn(async () => ({})),
}));

vi.mock("@/lib/db/guests", () => ({
  getGuest: vi.fn(async () => null),
  createGuest: vi.fn(async () => ({})),
  updateGuest: vi.fn(async () => ({})),
}));

vi.mock("@/lib/db/convState", () => ({
  getConvState: vi.fn(async () => null),
  upsertConvState: vi.fn(async () => ({})),
  resolveGuestState: vi.fn(() => undefined),
  CONVSTATE_VERSION: "test",
}));

vi.mock("@/lib/adapters/registry", () => ({
  getAdapter: vi.fn(() => null),
}));

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: getHotelConfigMock,
}));

vi.mock("@/lib/utils/language", () => ({
  detectLanguage: vi.fn(async () => "es"),
}));

vi.mock("@/lib/pipeline/resolveGuestIdentity", () => ({
  resolveGuestIdentity: vi.fn(async ({ rawGuestId }: any) => ({ guestId: rawGuestId || "web-guest" })),
}));

vi.mock("@/lib/categories/resolveCategory", () => ({
  resolveCategoryForHotel: resolveCategoryForHotelMock,
}));

vi.mock("@/lib/agents/knowledgeBaseAgent", () => ({
  answerWithKnowledge: answerWithKnowledgeMock,
}));

vi.mock("@/lib/agents/retrieval_based", () => ({
  retrievalBased: retrievalBasedMock,
}));

vi.mock("@/lib/agents", () => ({
  agentGraph: { invoke: vi.fn(async () => ({ messages: [], category: "retrieval_based", meta: {} })) },
}));

vi.mock("@/lib/web/eventBus", () => ({ emitToConversation: vi.fn(() => {}) }));
vi.mock("@/lib/utils/debugLog", () => ({ debugLog: vi.fn() }));
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class { constructor(_c: any) {} async invoke() { return { content: "Respuesta base" }; } },
}));

describe("handleChannelMessage room_info_img real path", () => {
  beforeEach(() => {
    savedMessages.length = 0;
    vi.clearAllMocks();
    vi.stubEnv("FORCE_GENERATION", "1");
    vi.stubEnv("ENABLE_TEST_FASTPATH", "0");
    vi.stubEnv("DEBUG_FASTPATH", "0");
    getHotelConfigMock.mockResolvedValue({
      hotelId: "hotel999",
      defaultLanguage: "es",
      channelConfigs: { web: { mode: "automatic", enabled: true } },
      rooms: [{ name: "Doble", images: [] }],
    });
    resolveCategoryForHotelMock.mockResolvedValue({
      content: {
        body: [
          "Tipo: Habitación Doble",
          "Images:",
          " - /hotel999/rooms/double/double.jpg",
        ].join("\n"),
      },
    });
    retrievalBasedMock.mockResolvedValue({
      messages: [{ role: "assistant", content: "Tenemos habitaciones con fotos." }],
      meta: {
        rich: {
          type: "room-info-img",
          data: [
            { type: "Single Standard", images: ["/hotel999/rooms/single/single.jpg"] },
            { type: "Doble", images: ["/hotel999/rooms/double/double.jpg"] },
            { type: "Twin", images: ["/hotel999/rooms/twin/twin.jpg"] },
            { type: "Triple", images: ["/hotel999/rooms/triple/hab-triple-1.jpg"] },
          ],
        },
        resolved: { content: { version: "v4" } },
      },
    });
    answerWithKnowledgeMock.mockResolvedValue({
      ok: true,
      category: "retrieval_based",
      promptKey: "room_info",
      answer: "```md\n<br><br>\n```",
    });
  });

  it.each([
    "Que tipos de habitaciones tienen?",
    "mostrame habitaciones",
  ])("retorna rich room-info-img y no usa room_info textual para: %s", async (query) => {
    const { handleChannelMessage } = await import("@/lib/pipeline/handleChannelMessage");

    const result = await handleChannelMessage({
      hotelId: "hotel999",
      channel: "web",
      query,
      conversationId: `conv-room-img-${query.replace(/\W+/g, "-")}`,
      guestId: "web-guest-room-img",
      sender: "guest",
    });

    expect(retrievalBasedMock).toHaveBeenCalledWith(expect.objectContaining({
      hotelId: "hotel999",
      normalizedMessage: query,
      category: "retrieval_based",
      promptKey: "room_info_img",
    }));
    expect(answerWithKnowledgeMock).not.toHaveBeenCalled();
    expect(result.rich).toEqual(expect.objectContaining({ type: "room-info-img" }));
    const rich = result.rich as { data?: Array<{ type?: string }> };
    expect(rich.data).toHaveLength(4);
    expect(rich.data?.map((item) => item.type)).toEqual([
      "Single Standard",
      "Doble",
      "Twin",
      "Triple",
    ]);
    expect(result.response).not.toContain("```md");
    expect(result.response).not.toContain("<br><br>");
    expect(result.response).not.toContain("![");

    const assistant = savedMessages.find((msg) => msg.sender === "assistant");
    expect(assistant?.meta?.responseTrace).toEqual(expect.objectContaining({
      category: "retrieval_based",
      promptKey: "room_info_img",
      source: "retrievalBased_kb_precedence_policy",
    }));
  });
});
