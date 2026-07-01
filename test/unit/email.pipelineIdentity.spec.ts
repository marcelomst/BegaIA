import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  handleChannelMessageMock,
  parseEmailToChannelMessageMock,
  getMessageByOriginalIdScopedMock,
  guardInboundOnceMock,
  clearGuardMock,
} = vi.hoisted(() => ({
  handleChannelMessageMock: vi.fn(),
  parseEmailToChannelMessageMock: vi.fn(),
  getMessageByOriginalIdScopedMock: vi.fn(),
  guardInboundOnceMock: vi.fn(),
  clearGuardMock: vi.fn(),
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

vi.mock("@/lib/db/messageGuards", () => ({
  guardInboundOnce: guardInboundOnceMock,
  clearGuard: clearGuardMock,
}));

import { processInboundEmailMessage } from "@/lib/services/email";

describe("email pipeline identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMessageByOriginalIdScopedMock.mockResolvedValue(null);
    guardInboundOnceMock.mockResolvedValue({ applied: true });
    clearGuardMock.mockResolvedValue(undefined);
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

  it("limpia el quoted thread del reply email antes de invocar el pipeline", async () => {
    parseEmailToChannelMessageMock.mockResolvedValueOnce({
      messageId: "parser-msg-quoted-1",
      conversationId: "hotel-email-1-email-legacy@example.com",
      hotelId: "hotel-email-1",
      channel: "email",
      sender: "Legacy@Example.com",
      guestId: "Legacy@Example.com",
      content: [
        "Confirmar",
        "El mar, 19 may 2026 a las 16:34, <hotel@example.com> escribió:",
        "> ¿Confirmás la reserva? Respondé “CONFIRMAR”.",
      ].join("\n"),
      suggestion: "",
      subject: "Re: Consulta",
      recipient: "hotel@example.com",
      cc: [],
      bcc: [],
      attachments: [],
      references: ["<ref-1@example.com>"],
      inReplyTo: "<prev@example.com>",
      originalMessageId: "<msg-quoted-1@example.com>",
      isForwarded: false,
      role: "user",
    });
    const sendReply = vi.fn(async () => {});

    await processInboundEmailMessage({
      hotelId: "hotel-email-1",
      parsed: {
        from: { text: "Legacy@Example.com" },
        subject: "Re: Consulta",
        messageId: "<msg-quoted-1@example.com>",
      },
      raw: "raw-email",
      mode: "automatic",
      emailUser: "hotel@example.com",
      sendReply,
    });

    expect(handleChannelMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "Confirmar",
        subject: "Re: Consulta",
        sourceMsgId: "<msg-quoted-1@example.com>",
      }),
    );
  });

  it("limpia quoted thread con marcador en ingles y preserva la confirmacion nueva", async () => {
    parseEmailToChannelMessageMock.mockResolvedValueOnce({
      messageId: "parser-msg-quoted-2",
      conversationId: "hotel-email-1-email-legacy@example.com",
      hotelId: "hotel-email-1",
      channel: "email",
      sender: "Legacy@Example.com",
      guestId: "Legacy@Example.com",
      content: [
        "sí, confirmar",
        "On Tue, May 19, 2026 at 4:34 PM <hotel@example.com> wrote:",
        "> Do you confirm the booking? Reply “CONFIRMAR”.",
      ].join("\n"),
      suggestion: "",
      subject: "Re: Consulta",
      recipient: "hotel@example.com",
      cc: [],
      bcc: [],
      attachments: [],
      references: ["<ref-1@example.com>"],
      inReplyTo: "<prev@example.com>",
      originalMessageId: "<msg-quoted-2@example.com>",
      isForwarded: false,
      role: "user",
    });

    await processInboundEmailMessage({
      hotelId: "hotel-email-1",
      parsed: {
        from: { text: "Legacy@Example.com" },
        subject: "Re: Consulta",
        messageId: "<msg-quoted-2@example.com>",
      },
      raw: "raw-email",
      mode: "automatic",
      emailUser: "hotel@example.com",
      sendReply: vi.fn(async () => {}),
    });

    expect(handleChannelMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "sí, confirmar",
        sourceMsgId: "<msg-quoted-2@example.com>",
      }),
    );
  });

  it("conserva una autopresentación inline aunque el body traiga prefijo estilo Gmail", async () => {
    parseEmailToChannelMessageMock.mockResolvedValueOnce({
      messageId: "parser-msg-gmail-noise-1",
      conversationId: "hotel-email-1-email-legacy@example.com",
      hotelId: "hotel-email-1",
      channel: "email",
      sender: "Legacy@Example.com",
      guestId: "Legacy@Example.com",
      content: "marcelomst123 jun 2026, 9:40 (hace 8 días)Hola, soy Martín P. Quisiera reservar una triple del 25 al 27 de julio para tres personas, a nombre de Ana Rodríguez.",
      suggestion: "",
      subject: "Consulta",
      recipient: "hotel@example.com",
      cc: [],
      bcc: [],
      attachments: [],
      references: [],
      inReplyTo: "",
      originalMessageId: "<msg-gmail-noise-1@example.com>",
      isForwarded: false,
      role: "user",
    });

    await processInboundEmailMessage({
      hotelId: "hotel-email-1",
      parsed: {
        from: { text: "Legacy@Example.com" },
        subject: "Consulta",
        messageId: "<msg-gmail-noise-1@example.com>",
      },
      raw: "raw-email",
      mode: "automatic",
      emailUser: "hotel@example.com",
      sendReply: vi.fn(async () => {}),
    });

    expect(handleChannelMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "marcelomst123 jun 2026, 9:40 (hace 8 días)Hola, soy Martín P. Quisiera reservar una triple del 25 al 27 de julio para tres personas, a nombre de Ana Rodríguez.",
        guestId: "legacy@example.com",
        sender: "legacy@example.com",
        channel: "email",
      }),
    );
  });

  it("no promueve una confirmacion citada cuando la parte nueva no confirma", async () => {
    parseEmailToChannelMessageMock.mockResolvedValueOnce({
      messageId: "parser-msg-quoted-3",
      conversationId: "hotel-email-1-email-legacy@example.com",
      hotelId: "hotel-email-1",
      channel: "email",
      sender: "Legacy@Example.com",
      guestId: "Legacy@Example.com",
      content: [
        "Gracias, lo reviso.",
        "El mar, 19 may 2026 a las 16:34, <hotel@example.com> escribió:",
        "> ¿Confirmás la reserva? Respondé “CONFIRMAR”.",
      ].join("\n"),
      suggestion: "",
      subject: "Re: Consulta",
      recipient: "hotel@example.com",
      cc: [],
      bcc: [],
      attachments: [],
      references: ["<ref-1@example.com>"],
      inReplyTo: "<prev@example.com>",
      originalMessageId: "<msg-quoted-3@example.com>",
      isForwarded: false,
      role: "user",
    });

    await processInboundEmailMessage({
      hotelId: "hotel-email-1",
      parsed: {
        from: { text: "Legacy@Example.com" },
        subject: "Re: Consulta",
        messageId: "<msg-quoted-3@example.com>",
      },
      raw: "raw-email",
      mode: "automatic",
      emailUser: "hotel@example.com",
      sendReply: vi.fn(async () => {}),
    });

    expect(handleChannelMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "Gracias, lo reviso.",
        sourceMsgId: "<msg-quoted-3@example.com>",
      }),
    );
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

  it("deduplica un segundo intento del mismo inbound y evita doble SMTP", async () => {
    const sendReply = vi.fn(async () => {});
    guardInboundOnceMock
      .mockResolvedValueOnce({ applied: true })
      .mockResolvedValueOnce({ applied: false });
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

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

    const second = await processInboundEmailMessage({
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

    expect(second.deduped).toBe(true);
    expect(handleChannelMessageMock).toHaveBeenCalledTimes(1);
    expect(sendReply).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[email] 🔁 dedupe inbound/reply → ignorado <msg-1@example.com>",
    );

    consoleSpy.mockRestore();
  });

  it("libera el guard si el procesamiento falla para permitir retry legitimo", async () => {
    handleChannelMessageMock.mockRejectedValueOnce(new Error("pipeline boom"));

    await expect(processInboundEmailMessage({
      hotelId: "hotel-email-1",
      parsed: {
        from: { text: "Legacy@Example.com" },
        subject: "Consulta",
        messageId: "<msg-1@example.com>",
      },
      raw: "raw-email",
      mode: "automatic",
      emailUser: "hotel@example.com",
      sendReply: vi.fn(async () => {}),
    })).rejects.toThrow("pipeline boom");

    expect(clearGuardMock).toHaveBeenCalledWith(
      "hotel-email-1",
      "hotel-email-1-email-legacy@example.com",
      "<msg-1@example.com>",
      "in",
    );
  });
});
