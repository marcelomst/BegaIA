// Path: /root/begasist/test/api.messages.route.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserMock = vi.fn();
const getMessagesFromChannelMock = vi.fn();
const updateMessageInChannelMock = vi.fn();
const getMessageByIdMock = vi.fn();
const updateMessageInAstraMock = vi.fn();
const twilioSendWhatsAppMessageMock = vi.fn();

vi.mock("@/lib/auth/getCurrentUser", () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock("@/lib/services/messages", () => ({
  getMessagesFromChannel: getMessagesFromChannelMock,
  updateMessageInChannel: updateMessageInChannelMock,
}));

vi.mock("@/lib/db/messages", () => ({
  getMessageById: getMessageByIdMock,
  updateMessageInAstra: updateMessageInAstraMock,
}));

vi.mock("@/lib/channels/whatsapp/twilioSendMessage", () => ({
  twilioSendWhatsAppMessage: twilioSendWhatsAppMessageMock,
}));

describe("/api/messages POST approve_and_send", () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset();
    getMessagesFromChannelMock.mockReset();
    updateMessageInChannelMock.mockReset();
    getMessageByIdMock.mockReset();
    updateMessageInAstraMock.mockReset();
    twilioSendWhatsAppMessageMock.mockReset();

    getCurrentUserMock.mockResolvedValue({
      email: "reception@hotel.com",
      hotelId: "hotel999",
      roleLevel: 80,
    });
  });

  it("Twilio ok: marca sent y persiste outboundSid", async () => {
    const { POST } = await import("@/app/api/messages/route");
    vi.stubEnv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886");

    getMessageByIdMock.mockResolvedValueOnce({
      messageId: "m1",
      hotelId: "hotel999",
      channel: "whatsapp",
      status: "pending",
      guestId: "whatsapp:+59800000000",
      suggestion: "texto sugerido",
      meta: { a: 1 },
    });
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
    vi.stubEnv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886");

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
});
