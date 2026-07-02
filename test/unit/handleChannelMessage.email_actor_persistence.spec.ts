import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  handleIncomingMessageMock,
  getAdapterMock,
  getHotelConfigMock,
  getMessagesByConversationServiceMock,
  detectLanguageMock,
  resolveGuestIdentityMock,
  findActiveConversationByGuestIdMock,
  getOrCreateConversationMock,
  updateConversationMock,
  updateGuestMock,
} = vi.hoisted(() => ({
  handleIncomingMessageMock: vi.fn(),
  getAdapterMock: vi.fn(),
  getHotelConfigMock: vi.fn(),
  getMessagesByConversationServiceMock: vi.fn(),
  detectLanguageMock: vi.fn(),
  resolveGuestIdentityMock: vi.fn(),
  findActiveConversationByGuestIdMock: vi.fn(),
  getOrCreateConversationMock: vi.fn(),
  updateConversationMock: vi.fn(),
  updateGuestMock: vi.fn(),
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
  getOrCreateConversation: getOrCreateConversationMock,
  updateConversation: updateConversationMock,
}));

vi.mock("@/lib/db/guests", () => ({
  updateGuest: updateGuestMock,
}));

describe("handleChannelMessage email actor persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAdapterMock.mockReturnValue(null);
    getHotelConfigMock.mockResolvedValue({
      channelConfigs: {
        email: { mode: "automatic", enabled: true },
      },
    });
    getMessagesByConversationServiceMock.mockResolvedValue([]);
    detectLanguageMock.mockResolvedValue("es");
    resolveGuestIdentityMock.mockResolvedValue({
      guestId: "guest-canonical-email-1",
      guestAlias: "email:legacy@example.com",
    });
    findActiveConversationByGuestIdMock.mockResolvedValue({
      conversationId: "conv-email-1",
    });
    handleIncomingMessageMock.mockResolvedValue({
      response: "ok",
      status: "sent",
      messageId: "mid-1",
      conversationId: "conv-email-1",
      lang: "es",
    });
  });

  it("persiste el actor inline en email limpio sobre el guest canónico resuelto", async () => {
    const { handleChannelMessage } = await import("@/lib/pipeline/handleChannelMessage");

    await handleChannelMessage({
      hotelId: "hotel999",
      channel: "email",
      query: "Hola, soy Martín P. Quisiera reservar una triple del 25 al 27 de julio para\ntres personas, a nombre de Ana Rodríguez.",
      guestId: "Legacy@Example.com",
      sender: "Legacy@Example.com",
      sourceMsgId: "<msg-clean-1@example.com>",
      sourceProvider: "email",
    });

    expect(updateGuestMock).toHaveBeenCalledWith("hotel999", "guest-canonical-email-1", {
      name: "Martín P.",
      firstName: "Martín",
    });
    expect(getOrCreateConversationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "conv-email-1",
        hotelId: "hotel999",
        guestId: "guest-canonical-email-1",
        channel: "email",
      }),
    );
  }, 10_000);

  it("persiste el actor inline en email con prefijo estilo Gmail sobre el guest canónico resuelto", async () => {
    const { handleChannelMessage } = await import("@/lib/pipeline/handleChannelMessage");

    await handleChannelMessage({
      hotelId: "hotel999",
      channel: "email",
      query: "marcelomst123 jun 2026, 9:40 (hace 8 días)Hola, soy Martín P. Quisiera reservar una triple del 25 al 27 de julio para\ntres personas, a nombre de Ana Rodríguez.",
      guestId: "Legacy@Example.com",
      sender: "Legacy@Example.com",
      sourceMsgId: "<msg-gmail-noise-1@example.com>",
      sourceProvider: "email",
    });

    expect(updateGuestMock).toHaveBeenCalledWith("hotel999", "guest-canonical-email-1", {
      name: "Martín P.",
      firstName: "Martín",
    });
  });

  it("no inventa actor conversacional desde guestName cuando el email no trae autopresentación", async () => {
    const { handleChannelMessage } = await import("@/lib/pipeline/handleChannelMessage");

    await handleChannelMessage({
      hotelId: "hotel999",
      channel: "email",
      query: "Quisiera reservar una triple del 25 al 27 de julio para tres personas, a nombre de Ana Rodríguez.",
      guestId: "Legacy@Example.com",
      sender: "Legacy@Example.com",
      sourceMsgId: "<msg-no-actor-1@example.com>",
      sourceProvider: "email",
    });

    expect(updateGuestMock).not.toHaveBeenCalled();
  });
});
