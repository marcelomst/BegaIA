// Path: /root/begasist/test/api.messages.route.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserMock = vi.fn();
const getMessagesFromChannelMock = vi.fn();
const updateMessageInChannelMock = vi.fn();
const getMessageByIdMock = vi.fn();
const getMessagesByConversationMock = vi.fn();
const updateMessageInAstraMock = vi.fn();
const twilioSendWhatsAppMessageMock = vi.fn();
const sendEmailMock = vi.fn();
const getHotelConfigMock = vi.fn();
const getGuestMock = vi.fn();
const getGuestAliasesByGuestIdMock = vi.fn();
const emitToConversationMock = vi.fn();

vi.mock("@/lib/auth/getCurrentUser", () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock("@/lib/services/messages", () => ({
  getMessagesFromChannel: getMessagesFromChannelMock,
  updateMessageInChannel: updateMessageInChannelMock,
}));

vi.mock("@/lib/db/messages", () => ({
  getMessageById: getMessageByIdMock,
  getMessagesByConversation: getMessagesByConversationMock,
  updateMessageInAstra: updateMessageInAstraMock,
}));

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: getHotelConfigMock,
}));

vi.mock("@/lib/email/sendEmail", () => ({
  sendEmail: sendEmailMock,
}));

vi.mock("@/lib/channels/whatsapp/twilioSendMessage", () => ({
  twilioSendWhatsAppMessage: twilioSendWhatsAppMessageMock,
  toTwilioWhatsAppAddress: (value: string) => {
    const trimmed = String(value || "").trim();
    return trimmed.startsWith("whatsapp:") ? trimmed : `whatsapp:${trimmed}`;
  },
}));

vi.mock("@/lib/db/guests", () => ({
  getGuest: getGuestMock,
}));

vi.mock("@/lib/db/guestAliases", () => ({
  getGuestAliasesByGuestId: getGuestAliasesByGuestIdMock,
}));

vi.mock("@/lib/web/eventBus", () => ({
  emitToConversation: emitToConversationMock,
}));

describe("/api/messages POST approve_and_send", () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset();
    getMessagesFromChannelMock.mockReset();
    updateMessageInChannelMock.mockReset();
    getMessageByIdMock.mockReset();
    getMessagesByConversationMock.mockReset();
    updateMessageInAstraMock.mockReset();
    twilioSendWhatsAppMessageMock.mockReset();
    sendEmailMock.mockReset();
    getHotelConfigMock.mockReset();
    getGuestMock.mockReset();
    getGuestAliasesByGuestIdMock.mockReset();
    emitToConversationMock.mockReset();

    getCurrentUserMock.mockResolvedValue({
      email: "reception@hotel.com",
      hotelId: "hotel999",
      roleLevel: 80,
    });
    getHotelConfigMock.mockResolvedValue({
      hotelId: "hotel999",
      channelConfigs: {
        email: {
          enabled: true,
          mode: "supervised",
          dirEmail: "hotel@example.com",
          password: "smtp-pass",
          imapHost: "imap.example.com",
          imapPort: 993,
          smtpHost: "smtp.example.com",
          smtpPort: 587,
          secure: false,
        },
      },
    });
    getMessagesByConversationMock.mockResolvedValue([]);
    getGuestMock.mockResolvedValue(null);
    getGuestAliasesByGuestIdMock.mockResolvedValue([]);
  });

  it("Twilio ok: marca sent y persiste outboundSid", async () => {
    const { POST } = await import("@/app/api/messages/route");

    getMessageByIdMock.mockResolvedValueOnce({
      messageId: "m1",
      hotelId: "hotel999",
      channel: "whatsapp",
      status: "pending",
      guestId: "59cee1a6-fbc5-4c24-b104-729b23947ed8",
      suggestion: "texto sugerido",
      meta: { a: 1 },
    });
    getGuestAliasesByGuestIdMock.mockResolvedValueOnce([
      {
        hotelId: "hotel999",
        guestId: "59cee1a6-fbc5-4c24-b104-729b23947ed8",
        alias: "whatsapp:+59800000000",
        createdAt: new Date().toISOString(),
      },
    ]);
    twilioSendWhatsAppMessageMock.mockResolvedValueOnce({ sid: "SM_OUT_123" });

    const req = new Request("http://localhost/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "approve_and_send",
        messageId: "m1",
        channel: "whatsapp",
        approvedResponse: "texto final",
        respondedBy: "agent@hotel.com",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.outboundSid).toBe("SM_OUT_123");
    expect(twilioSendWhatsAppMessageMock).toHaveBeenCalledTimes(1);
    expect(twilioSendWhatsAppMessageMock).toHaveBeenCalledWith({
      hotelId: "hotel999",
      to: "whatsapp:+59800000000",
      body: "texto final",
    });
    expect(updateMessageInAstraMock).toHaveBeenCalledWith(
      "hotel999",
      "m1",
      expect.objectContaining({
        status: "sent",
        respondedBy: "agent@hotel.com",
        approvedResponse: "texto final",
        meta: expect.objectContaining({ twilioOutboundSid: "SM_OUT_123" }),
      }),
    );
  });

  it("Twilio falla: devuelve 502 y mantiene pending (sin update)", async () => {
    const { POST } = await import("@/app/api/messages/route");

    getMessageByIdMock.mockResolvedValueOnce({
      messageId: "m2",
      hotelId: "hotel999",
      channel: "whatsapp",
      status: "pending",
      guestId: "whatsapp:+59800000000",
      suggestion: "texto sugerido",
    });
    twilioSendWhatsAppMessageMock.mockRejectedValueOnce(new Error("Twilio timeout"));

    const req = new Request("http://localhost/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "approve_and_send",
        messageId: "m2",
        channel: "whatsapp",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json.success).toBe(false);
    expect(updateMessageInAstraMock).toHaveBeenCalledTimes(0);
  });

  it("si no hay channel address válido, no llama Twilio con guestId UUID y devuelve error controlado", async () => {
    const { POST } = await import("@/app/api/messages/route");

    getMessageByIdMock.mockResolvedValueOnce({
      messageId: "m3",
      hotelId: "hotel999",
      channel: "whatsapp",
      status: "pending",
      guestId: "59cee1a6-fbc5-4c24-b104-729b23947ed8",
      suggestion: "texto sugerido",
    });
    getGuestMock.mockResolvedValueOnce({
      guestId: "59cee1a6-fbc5-4c24-b104-729b23947ed8",
      hotelId: "hotel999",
      mode: "automatic",
    });
    getGuestAliasesByGuestIdMock.mockResolvedValueOnce([]);

    const req = new Request("http://localhost/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "approve_and_send",
        messageId: "m3",
        channel: "whatsapp",
        to: "59cee1a6-fbc5-4c24-b104-729b23947ed8",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/destinatario WhatsApp t[eé]cnico/i);
    expect(twilioSendWhatsAppMessageMock).toHaveBeenCalledTimes(0);
    expect(updateMessageInAstraMock).toHaveBeenCalledTimes(0);
  });

  it("Email supervisado: envía outbound al remitente del hilo y marca el pendiente como sent", async () => {
    const { POST } = await import("@/app/api/messages/route");

    getMessageByIdMock.mockResolvedValueOnce({
      messageId: "email-pending-1",
      hotelId: "hotel999",
      channel: "email",
      status: "pending",
      conversationId: "email-conv-1",
      guestId: "martin@example.com",
      suggestion: "texto sugerido",
      subject: "Reserva",
    });
    getMessagesByConversationMock.mockResolvedValueOnce([
      {
        messageId: "email-in-1",
        hotelId: "hotel999",
        channel: "email",
        status: "sent",
        conversationId: "email-conv-1",
        direction: "in",
        role: "user",
        sender: "martin@example.com",
        subject: "Reserva",
        originalMessageId: "<gmail-msg-1@example.com>",
      },
    ]);
    sendEmailMock.mockResolvedValueOnce(undefined);

    const req = new Request("http://localhost/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "approve_and_send",
        messageId: "email-pending-1",
        channel: "email",
        approvedResponse: "Texto editado\nsegunda línea",
        respondedBy: "agent@hotel.com",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(
      {
        host: "smtp.example.com",
        port: 587,
        user: "hotel@example.com",
        pass: "smtp-pass",
        secure: false,
      },
      "martin@example.com",
      "Re: Reserva",
      "Texto editado<br>segunda línea",
    );
    expect(updateMessageInAstraMock).toHaveBeenCalledWith(
      "hotel999",
      "email-pending-1",
      expect.objectContaining({
        approvedResponse: "Texto editado\nsegunda línea",
        status: "sent",
        respondedBy: "agent@hotel.com",
        deliveredAt: expect.any(String),
        meta: expect.objectContaining({
          emailOutboundTo: "martin@example.com",
          emailOriginalMessageId: "<gmail-msg-1@example.com>",
        }),
      }),
    );
  });

  it("Email supervisado: no duplica outbound si el pendiente ya estaba sent", async () => {
    const { POST } = await import("@/app/api/messages/route");

    getMessageByIdMock.mockResolvedValueOnce({
      messageId: "email-pending-2",
      hotelId: "hotel999",
      channel: "email",
      status: "sent",
      conversationId: "email-conv-2",
      suggestion: "texto sugerido",
    });

    const req = new Request("http://localhost/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "approve_and_send",
        messageId: "email-pending-2",
        channel: "email",
        approvedResponse: "Texto editado",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true, deduped: true });
    expect(sendEmailMock).toHaveBeenCalledTimes(0);
    expect(updateMessageInAstraMock).toHaveBeenCalledTimes(0);
  });

  it("Email supervisado: si SMTP falla devuelve error y no marca sent", async () => {
    const { POST } = await import("@/app/api/messages/route");

    getMessageByIdMock.mockResolvedValueOnce({
      messageId: "email-pending-3",
      hotelId: "hotel999",
      channel: "email",
      status: "pending",
      conversationId: "email-conv-3",
      guestId: "martin@example.com",
      suggestion: "texto sugerido",
      subject: "Reserva",
    });
    getMessagesByConversationMock.mockResolvedValueOnce([
      {
        messageId: "email-in-3",
        hotelId: "hotel999",
        channel: "email",
        conversationId: "email-conv-3",
        direction: "in",
        role: "user",
        sender: "martin@example.com",
        subject: "Reserva",
        originalMessageId: "<gmail-msg-3@example.com>",
      },
    ]);
    sendEmailMock.mockRejectedValueOnce(new Error("SMTP rejected"));

    const req = new Request("http://localhost/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "approve_and_send",
        messageId: "email-pending-3",
        channel: "email",
        approvedResponse: "Texto editado",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json.success).toBe(false);
    expect(json.error).toBe("SMTP rejected");
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(updateMessageInAstraMock).toHaveBeenCalledTimes(0);
  });

  it("Email supervisado: si Gmail rechaza inline reintenta con EMAIL_PASS antes de marcar sent", async () => {
    const { POST } = await import("@/app/api/messages/route");
    const previousEmailPass = process.env.EMAIL_PASS;
    process.env.EMAIL_PASS = "env-app-password";

    getMessageByIdMock.mockResolvedValueOnce({
      messageId: "email-pending-4",
      hotelId: "hotel999",
      channel: "email",
      status: "pending",
      conversationId: "email-conv-4",
      guestId: "martin@example.com",
      suggestion: "texto sugerido",
      subject: "Reserva",
    });
    getMessagesByConversationMock.mockResolvedValueOnce([
      {
        messageId: "email-in-4",
        hotelId: "hotel999",
        channel: "email",
        conversationId: "email-conv-4",
        direction: "in",
        role: "user",
        sender: "martin@example.com",
        subject: "Reserva",
      },
    ]);
    sendEmailMock
      .mockRejectedValueOnce(new Error("Invalid login: 535-5.7.8 Username and Password not accepted"))
      .mockResolvedValueOnce(undefined);

    try {
      const req = new Request("http://localhost/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_and_send",
          messageId: "email-pending-4",
          channel: "email",
          approvedResponse: "Texto editado",
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(sendEmailMock).toHaveBeenCalledTimes(2);
      expect(sendEmailMock).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ pass: "smtp-pass" }),
        "martin@example.com",
        "Re: Reserva",
        "Texto editado",
      );
      expect(sendEmailMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ pass: "env-app-password" }),
        "martin@example.com",
        "Re: Reserva",
        "Texto editado",
      );
      expect(updateMessageInAstraMock).toHaveBeenCalledWith(
        "hotel999",
        "email-pending-4",
        expect.objectContaining({ status: "sent" }),
      );
    } finally {
      if (previousEmailPass === undefined) {
        delete process.env.EMAIL_PASS;
      } else {
        process.env.EMAIL_PASS = previousEmailPass;
      }
    }
  });

  it("Web supervisado: guarda y envía el texto editado usando el messageId real", async () => {
    const { POST } = await import("@/app/api/messages/route");

    getMessageByIdMock.mockResolvedValueOnce({
      messageId: "pending-1",
      hotelId: "hotel999",
      channel: "web",
      status: "pending",
      conversationId: "conv-1",
      guestId: "guest-1",
      suggestion: "¿Cuál es el tipo de habitación?",
    });
    updateMessageInChannelMock.mockResolvedValueOnce(undefined);

    const req = new Request("http://localhost/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageId: "pending-1",
        channel: "web",
        approvedResponse: "Necesito saber qué tipo de habitación preferís.",
        status: "sent",
        respondedBy: "reception@hotel.com",
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });
    expect(updateMessageInChannelMock).toHaveBeenCalledWith(
      "hotel999",
      "web",
      "pending-1",
      {
        approvedResponse: "Necesito saber qué tipo de habitación preferís.",
        status: "sent",
        respondedBy: "reception@hotel.com",
      },
    );
    expect(emitToConversationMock).toHaveBeenCalledWith(
      "conv-1",
      expect.objectContaining({
        type: "message",
        sender: "assistant",
        text: "Necesito saber qué tipo de habitación preferís.",
        timestamp: expect.any(String),
      }),
    );
  });

  it("Web supervisado: permite aprobar y enviar la sugerencia sin modificarla", async () => {
    const { POST } = await import("@/app/api/messages/route");
    const suggestion = "¿Cuál es el tipo de habitación?";

    getMessageByIdMock.mockResolvedValueOnce({
      messageId: "pending-2",
      hotelId: "hotel999",
      channel: "web",
      status: "pending",
      conversationId: "conv-2",
      suggestion,
    });
    updateMessageInChannelMock.mockResolvedValueOnce(undefined);

    const req = new Request("http://localhost/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageId: "pending-2",
        channel: "web",
        approvedResponse: suggestion,
        status: "sent",
        respondedBy: "reception@hotel.com",
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(updateMessageInChannelMock).toHaveBeenCalledWith(
      "hotel999",
      "web",
      "pending-2",
      expect.objectContaining({ approvedResponse: suggestion, status: "sent" }),
    );
    expect(emitToConversationMock).toHaveBeenCalledWith(
      "conv-2",
      expect.objectContaining({ sender: "assistant", text: suggestion }),
    );
  });
});
