import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  handleIncomingMessageMock,
  getAdapterMock,
  getHotelConfigMock,
  getMessagesByConversationServiceMock,
  detectLanguageMock,
  resolveGuestIdentityMock,
  findActiveConversationByGuestIdMock,
  clientOnMock,
  clientInitializeMock,
  shouldIngestWaMessageOnceMock,
  parseWhatsAppToChannelMessageMock,
  universalChannelEventHandlerMock,
  saveMessageIdempotentMock,
} = vi.hoisted(() => ({
  handleIncomingMessageMock: vi.fn(),
  getAdapterMock: vi.fn(),
  getHotelConfigMock: vi.fn(),
  getMessagesByConversationServiceMock: vi.fn(),
  detectLanguageMock: vi.fn(),
  resolveGuestIdentityMock: vi.fn(),
  findActiveConversationByGuestIdMock: vi.fn(),
  clientOnMock: vi.fn(),
  clientInitializeMock: vi.fn(),
  shouldIngestWaMessageOnceMock: vi.fn(),
  parseWhatsAppToChannelMessageMock: vi.fn(),
  universalChannelEventHandlerMock: vi.fn(),
  saveMessageIdempotentMock: vi.fn(),
}));

vi.mock("@/lib/handlers/messageHandler", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/handlers/messageHandler")>();
  return {
    ...actual,
    handleIncomingMessage: handleIncomingMessageMock,
  };
});

vi.mock("@/lib/adapters/registry", () => ({
  getAdapter: getAdapterMock,
}));

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: getHotelConfigMock,
}));

vi.mock("@/lib/services/messages", () => ({
  getMessagesByConversationService: getMessagesByConversationServiceMock,
}));

vi.mock("@/lib/utils/language", () => ({
  detectLanguage: detectLanguageMock,
}));

vi.mock("@/lib/pipeline/resolveGuestIdentity", () => ({
  resolveGuestIdentity: resolveGuestIdentityMock,
}));

vi.mock("@/lib/db/conversations", () => ({
  findActiveConversationByGuestId: findActiveConversationByGuestIdMock,
}));

vi.mock("@/lib/services/whatsappClient", () => ({
  whatsappClient: {
    on: clientOnMock,
    initialize: clientInitializeMock,
    sendMessage: vi.fn(),
  },
}));

vi.mock("qrcode-terminal", () => ({
  default: {
    generate: vi.fn(),
  },
}));

vi.mock("@/lib/parsers/whatsappParser", () => ({
  parseWhatsAppToChannelMessage: parseWhatsAppToChannelMessageMock,
}));

vi.mock("@/lib/handlers/universalChannelEventHandler", () => ({
  universalChannelEventHandler: universalChannelEventHandlerMock,
}));

vi.mock("@/lib/db/messages", () => ({
  getMessages: vi.fn(),
  updateMessageInAstra: vi.fn(),
  saveMessageIdempotent: saveMessageIdempotentMock,
}));

vi.mock("@/lib/services/redis", () => ({
  setQR: vi.fn(),
  clearQR: vi.fn(),
  setWhatsAppState: vi.fn(),
}));

vi.mock("@/lib/services/heartbeat", () => ({
  startChannelHeartbeat: vi.fn(),
}));

vi.mock("@/lib/utils/waIdempotency", () => ({
  shouldIngestWaMessageOnce: shouldIngestWaMessageOnceMock,
}));

vi.mock("@/lib/utils/debugLog", () => ({
  debugLog: vi.fn(),
}));

describe("multichannel canonical guest contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv("FORCE_GENERATION", "1");
    vi.stubEnv("ENABLE_TEST_FASTPATH", "0");

    getAdapterMock.mockReturnValue(null);
    getHotelConfigMock.mockResolvedValue({
      channelConfigs: {
        web: { mode: "automatic", enabled: true },
        email: { mode: "automatic", enabled: true },
        whatsapp: { mode: "automatic", enabled: true, ignoreGroups: true },
      },
    });
    getMessagesByConversationServiceMock.mockResolvedValue([]);
    detectLanguageMock.mockResolvedValue("es");
    findActiveConversationByGuestIdMock.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete (globalThis as any).__WA_INIT__;
    delete (globalThis as any).__WA_POLLERS__;
  });

  it("reuses the same canonical guest while preserving channel-compatible conversations", async () => {
    resolveGuestIdentityMock.mockImplementation(async ({ hotelId, channel, rawGuestId }) => {
      const raw = String(rawGuestId || "");
      if (hotelId !== "hotel999") return {};
      if (channel === "web" && raw === "session-abc") {
        return { guestId: "guest-canonical-1", guestAlias: "web:session-abc" };
      }
      if (channel === "email" && raw === "Guest@Example.com") {
        return { guestId: "guest-canonical-1", guestAlias: "email:guest@example.com" };
      }
      if (channel === "whatsapp" && raw === "whatsapp:+59899123456") {
        return { guestId: "guest-canonical-1", guestAlias: "whatsapp:+59899123456" };
      }
      return {};
    });

    findActiveConversationByGuestIdMock.mockImplementation(async ({ channel }) => {
      if (channel === "web") return { conversationId: "conv-web-1" };
      if (channel === "email") return { conversationId: "conv-email-1" };
      if (channel === "whatsapp") return { conversationId: "conv-whatsapp-1" };
      return null;
    });

    const { handleChannelMessage } = await import("@/lib/pipeline/handleChannelMessage");

    const web = await handleChannelMessage({
      hotelId: "hotel999",
      channel: "web",
      query: "hola desde web",
      guestId: "session-abc",
      sourceMsgId: "web-msg-1",
      sender: "session-abc",
      sourceProvider: "web",
    });

    const email = await handleChannelMessage({
      hotelId: "hotel999",
      channel: "email",
      query: "hola desde email",
      guestId: "Guest@Example.com",
      sourceMsgId: "<msg-1@example.com>",
      sender: "Guest@Example.com",
      sourceProvider: "email.imap",
    });

    const twilio = await handleChannelMessage({
      hotelId: "hotel999",
      channel: "whatsapp",
      query: "hola desde twilio",
      guestId: "whatsapp:+59899123456",
      sourceMsgId: "SM123",
      sender: "whatsapp:+59899123456",
      sourceProvider: "whatsapp.twilio",
    });

    expect(web.conversationId).toBe("conv-web-1");
    expect(email.conversationId).toBe("conv-email-1");
    expect(twilio.conversationId).toBe("conv-whatsapp-1");

    expect(findActiveConversationByGuestIdMock).toHaveBeenNthCalledWith(1, {
      hotelId: "hotel999",
      guestId: "guest-canonical-1",
      channel: "web",
    });
    expect(findActiveConversationByGuestIdMock).toHaveBeenNthCalledWith(2, {
      hotelId: "hotel999",
      guestId: "guest-canonical-1",
      channel: "email",
    });
    expect(findActiveConversationByGuestIdMock).toHaveBeenNthCalledWith(3, {
      hotelId: "hotel999",
      guestId: "guest-canonical-1",
      channel: "whatsapp",
    });

    expect(handleIncomingMessageMock).toHaveBeenCalledTimes(3);
    expect(handleIncomingMessageMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        channel: "web",
        guestId: "guest-canonical-1",
        conversationId: "conv-web-1",
        sourceMsgId: "web-msg-1",
        sourceProvider: "web",
      }),
      expect.objectContaining({ mode: "automatic" }),
    );
    expect(handleIncomingMessageMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        channel: "email",
        guestId: "guest-canonical-1",
        conversationId: "conv-email-1",
        sourceMsgId: "<msg-1@example.com>",
        sourceProvider: "email.imap",
      }),
      expect.objectContaining({ mode: "automatic" }),
    );
    expect(handleIncomingMessageMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        channel: "whatsapp",
        guestId: "guest-canonical-1",
        conversationId: "conv-whatsapp-1",
        sourceMsgId: "SM123",
        sourceProvider: "whatsapp.twilio",
      }),
      expect.objectContaining({ mode: "automatic" }),
    );

    const incomingMessages = handleIncomingMessageMock.mock.calls.map(([msg]) => msg);
    expect(incomingMessages.some((msg) => msg.guestId === "session-abc")).toBe(false);
    expect(incomingMessages.some((msg) => msg.guestId === "Guest@Example.com")).toBe(false);
    expect(incomingMessages.some((msg) => msg.guestId === "whatsapp:+59899123456")).toBe(false);
  });

  it("keeps WhatsApp legacy conversationId compatibility while upgrading guestId to the canonical identity", async () => {
    let inboundHandler: ((message: any) => Promise<void>) | undefined;
    clientOnMock.mockImplementation((event: string, handler: (...args: any[]) => any) => {
      if (event === "message") inboundHandler = handler as (message: any) => Promise<void>;
    });
    clientInitializeMock.mockReturnValue(undefined);
    shouldIngestWaMessageOnceMock.mockResolvedValue(true);
    parseWhatsAppToChannelMessageMock.mockResolvedValue({
      messageId: "parsed-mid-legacy-1",
      conversationId: "hotel999-whatsapp-5491100000000@c.us",
      hotelId: "hotel999",
      channel: "whatsapp",
      sender: "5491100000000@c.us",
      guestId: "5491100000000@c.us",
      content: "hola",
      timestamp: "2026-05-12T12:00:00.000Z",
      suggestion: "",
      status: "pending",
      role: "user",
    });
    resolveGuestIdentityMock.mockResolvedValue({
      guestId: "guest-canonical-1",
      guestAlias: "whatsapp:5491100000000@c.us",
    });
    saveMessageIdempotentMock.mockResolvedValue({ deduped: false });
    universalChannelEventHandlerMock.mockResolvedValue({ ok: true, deduped: false });

    const { startWhatsAppBot } = await import("@/lib/services/whatsapp");

    startWhatsAppBot({ hotelId: "hotel999", hotelPhone: "+59811111111" });

    expect(inboundHandler).toBeTypeOf("function");

    await inboundHandler?.({
      fromMe: false,
      from: "5491100000000@c.us",
      body: "hola",
      timestamp: 1715410000,
      id: { _serialized: "wamid.legacy-1" },
      reply: vi.fn(),
    });

    expect(resolveGuestIdentityMock).toHaveBeenCalledWith({
      hotelId: "hotel999",
      channel: "whatsapp",
      rawGuestId: "5491100000000@c.us",
    });

    expect(universalChannelEventHandlerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hotelId: "hotel999",
        channel: "whatsapp",
        guestId: "guest-canonical-1",
        conversationId: "hotel999-whatsapp-5491100000000@c.us",
        sourceMsgId: "wamid.legacy-1",
        meta: {
          senderJid: "5491100000000@c.us",
          guestAlias: "whatsapp:5491100000000@c.us",
        },
      }),
      expect.objectContaining({
        mode: "automatic",
        sendReply: expect.any(Function),
      }),
    );

    expect(saveMessageIdempotentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        guestId: "guest-canonical-1",
        sender: "5491100000000@c.us",
        conversationId: "hotel999-whatsapp-5491100000000@c.us",
      }),
      expect.objectContaining({
        idempotencyKey: "hotel999:whatsapp:wamid.legacy-1",
      }),
    );
  });
});
