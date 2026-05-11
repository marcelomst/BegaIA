import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  clientOnMock,
  clientInitializeMock,
  shouldIngestWaMessageOnceMock,
  parseWhatsAppToChannelMessageMock,
  universalChannelEventHandlerMock,
  getHotelConfigMock,
  saveMessageIdempotentMock,
  resolveGuestIdentityMock,
} = vi.hoisted(() => ({
  clientOnMock: vi.fn(),
  clientInitializeMock: vi.fn(),
  shouldIngestWaMessageOnceMock: vi.fn(),
  parseWhatsAppToChannelMessageMock: vi.fn(),
  universalChannelEventHandlerMock: vi.fn(),
  getHotelConfigMock: vi.fn(),
  saveMessageIdempotentMock: vi.fn(),
  resolveGuestIdentityMock: vi.fn(),
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

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: getHotelConfigMock,
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

vi.mock("@/lib/pipeline/resolveGuestIdentity", () => ({
  resolveGuestIdentity: resolveGuestIdentityMock,
}));

import { startWhatsAppBot } from "@/lib/services/whatsapp";

describe("whatsapp legacy guest alias resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    delete (globalThis as any).__WA_INIT__;
    delete (globalThis as any).__WA_POLLERS__;

    clientOnMock.mockImplementation(() => undefined);
    clientInitializeMock.mockReturnValue(undefined);
    shouldIngestWaMessageOnceMock.mockResolvedValue(true);
    getHotelConfigMock.mockResolvedValue({
      channelConfigs: {
        whatsapp: {
          mode: "automatic",
          ignoreGroups: true,
        },
      },
    });
    parseWhatsAppToChannelMessageMock.mockResolvedValue({
      messageId: "parsed-mid-1",
      conversationId: "hotel999-whatsapp-5491100000000@c.us",
      hotelId: "hotel999",
      channel: "whatsapp",
      sender: "5491100000000@c.us",
      guestId: "5491100000000@c.us",
      content: "hola",
      timestamp: "2026-05-11T12:00:00.000Z",
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
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as any).__WA_INIT__;
    delete (globalThis as any).__WA_POLLERS__;
  });

  it("resuelve guestId canonico antes de delegar al runtime y preserva conversationId/sourceMsgId", async () => {
    let inboundHandler: ((message: any) => Promise<void>) | undefined;
    clientOnMock.mockImplementation((event: string, handler: (...args: any[]) => any) => {
      if (event === "message") inboundHandler = handler as (message: any) => Promise<void>;
    });

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

    expect(saveMessageIdempotentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hotelId: "hotel999",
        channel: "whatsapp",
        guestId: "guest-canonical-1",
        sender: "5491100000000@c.us",
        conversationId: "hotel999-whatsapp-5491100000000@c.us",
        messageId: "parsed-mid-1",
      }),
      expect.objectContaining({
        idempotencyKey: "hotel999:whatsapp:wamid.legacy-1",
      }),
    );

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
  });
});
