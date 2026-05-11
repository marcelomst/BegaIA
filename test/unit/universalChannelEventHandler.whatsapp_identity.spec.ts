import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  handleIncomingMessageMock,
  guardInboundOnceMock,
} = vi.hoisted(() => ({
  handleIncomingMessageMock: vi.fn(),
  guardInboundOnceMock: vi.fn(),
}));

vi.mock("@/lib/handlers/messageHandler", () => ({
  handleIncomingMessage: handleIncomingMessageMock,
}));

vi.mock("@/lib/db/messageGuards", () => ({
  guardInboundOnce: guardInboundOnceMock,
}));

import { universalChannelEventHandler } from "@/lib/handlers/universalChannelEventHandler";

describe("universalChannelEventHandler whatsapp identity parity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardInboundOnceMock.mockResolvedValue({ applied: true });
    handleIncomingMessageMock.mockResolvedValue(undefined);
  });

  it("preserva guestId, conversationId y sourceMsgId al normalizar un evento de WhatsApp", async () => {
    const sendReply = vi.fn(async () => {});

    const result = await universalChannelEventHandler(
      {
        hotelId: "hotel999",
        channel: "whatsapp",
        conversationId: "hotel999-whatsapp-5491100000000@s.whatsapp.net",
        guestId: "5491100000000@s.whatsapp.net",
        sourceMsgId: "wamid.HBgLM...",
        content: "hola",
        from: "guest",
        timestamp: 1715410000000,
      },
      {
        mode: "automatic",
        sendReply,
      },
    );

    expect(result).toEqual({ ok: true, deduped: false });
    expect(guardInboundOnceMock).toHaveBeenCalledWith({
      hotelId: "hotel999",
      conversationId: "hotel999-whatsapp-5491100000000@s.whatsapp.net",
      sourceMsgId: "wamid.HBgLM...",
      ttlSec: 7 * 24 * 60 * 60,
    });
    expect(handleIncomingMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hotelId: "hotel999",
        channel: "whatsapp",
        guestId: "5491100000000@s.whatsapp.net",
        conversationId: "hotel999-whatsapp-5491100000000@s.whatsapp.net",
        sourceMsgId: "wamid.HBgLM...",
      }),
      {
        mode: "automatic",
        sendReply,
      },
    );
  });
});
