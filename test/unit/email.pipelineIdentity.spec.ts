import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  handleChannelMessageMock,
  parseEmailToChannelMessageMock,
  getMessageByOriginalIdScopedMock,
} = vi.hoisted(() => ({
  handleChannelMessageMock: vi.fn(),
  parseEmailToChannelMessageMock: vi.fn(),
  getMessageByOriginalIdScopedMock: vi.fn(),
}));

vi.mock("@/lib/pipeline/handleChannelMessage", () => ({
  handleChannelMessage: handleChannelMessageMock,
}));

vi.mock("@/lib/parsers/emailParser", () => ({
  parseEmailToChannelMessage: parseEmailToChannelMessageMock,
}));

vi.mock("@/lib/db/messages", () => ({
  getMessageByOriginalIdScoped: getMessageByOriginalIdScopedMock,
}));

import { processInboundEmailMessage } from "@/lib/services/email";

describe("email pipeline identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMessageByOriginalIdScopedMock.mockResolvedValue(null);
    handleChannelMessageMock.mockResolvedValue({
      response: "respuesta automatica",
      status: "sent",
      messageId: "msg-email-1",
      conversationId: "conv-canon-1",
      lang: "es",
      hotelId: "hotel-email-1",
      channel: "email",
    });
    parseEmailToChannelMessageMock.mockResolvedValue({
      messageId: "parser-msg-1",
      conversationId: "hotel-email-1-email-legacy@example.com",
      hotelId: "hotel-email-1",
      channel: "email",
      sender: "Legacy@Example.com",
      guestId: "Legacy@Example.com",
      content: " Hola desde email ",
      suggestion: "",
      subject: "Consulta",
      recipient: "hotel@example.com",
      cc: ["copiado@example.com"],
      bcc: [],
      attachments: [],
      references: ["<ref-1@example.com>"],
      inReplyTo: "<prev@example.com>",
      originalMessageId: "<msg-1@example.com>",
      isForwarded: false,
      role: "user",
    });
  });

  it("preserva remitente real y usa el camino canonico sin imponer conversationId del parser", async () => {
    const sendReply = vi.fn(async () => {});

    await processInboundEmailMessage({
      hotelId: "hotel-email-1",
      parsed: {
        from: { text: "Legacy@Example.com" },
        subject: "Consulta",
        messageId: "<msg-1@example.com>",
      },
      raw: "raw-email",
      mode: "automatic",
      emailUser: "hotel@example.com",
      sendReply,
    });

    expect(getMessageByOriginalIdScopedMock).toHaveBeenCalledWith(
      "hotel-email-1",
      "<msg-1@example.com>",
    );
    expect(handleChannelMessageMock).toHaveBeenCalledTimes(1);
    expect(handleChannelMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hotelId: "hotel-email-1",
        channel: "email",
        guestId: "legacy@example.com",
        sender: "legacy@example.com",
        sourceMsgId: "<msg-1@example.com>",
        originalMessageId: "<msg-1@example.com>",
        subject: "Consulta",
      }),
    );

    const payload = handleChannelMessageMock.mock.calls[0][0];
    expect(payload).not.toHaveProperty("conversationId");
    expect(sendReply).toHaveBeenCalledWith({
      to: "legacy@example.com",
      subject: "Re: Consulta",
      text: "respuesta automatica",
    });
  });

  it("corta por idempotencia scoped sin invocar el pipeline", async () => {
    getMessageByOriginalIdScopedMock.mockResolvedValue({ messageId: "existing-msg-1" });
    const sendReply = vi.fn(async () => {});

    const result = await processInboundEmailMessage({
      hotelId: "hotel-email-1",
      parsed: {
        from: { text: "Legacy@Example.com" },
        subject: "Consulta",
        messageId: "<msg-1@example.com>",
      },
      raw: "raw-email",
      mode: "automatic",
      emailUser: "hotel@example.com",
      sendReply,
    });

    expect(result.deduped).toBe(true);
    expect(handleChannelMessageMock).not.toHaveBeenCalled();
    expect(sendReply).not.toHaveBeenCalled();
  });
});
