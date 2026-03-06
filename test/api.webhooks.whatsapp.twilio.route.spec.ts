// Path: /root/begasist/test/api.webhooks.whatsapp.twilio.route.spec.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const handleChannelMessageMock = vi.fn();
const twilioSendWhatsAppMessageMock = vi.fn();
const validateTwilioSignatureMock = vi.fn();
const hasInboundMessageBySourceMsgIdMock = vi.fn();
const getConversationIdByGuestPhoneMock = vi.fn();
const resolveHotelIdByTwilioToMock = vi.fn();

vi.mock("@/lib/pipeline/handleChannelMessage", () => ({
  handleChannelMessage: handleChannelMessageMock,
}));

vi.mock("@/lib/channels/whatsapp/twilioSendMessage", () => ({
  twilioSendWhatsAppMessage: twilioSendWhatsAppMessageMock,
}));

vi.mock("@/lib/channels/whatsapp/twilioValidateSignature", () => ({
  validateTwilioSignature: validateTwilioSignatureMock,
}));

vi.mock("@/lib/db/messagesDedupe", () => ({
  hasInboundMessageBySourceMsgId: hasInboundMessageBySourceMsgIdMock,
}));

vi.mock("@/lib/db/conversationBinding", () => ({
  getConversationIdByGuestPhone: getConversationIdByGuestPhoneMock,
}));

vi.mock("@/lib/db/whatsappTwilioRouting", () => ({
  resolveHotelIdByTwilioTo: resolveHotelIdByTwilioToMock,
}));

function makeFormReq(data: Record<string, string>): Request {
  const body = new URLSearchParams(data);
  return new Request("http://localhost/api/webhooks/whatsapp/twilio", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

describe("/api/webhooks/whatsapp/twilio", () => {
  beforeEach(() => {
    handleChannelMessageMock.mockReset();
    twilioSendWhatsAppMessageMock.mockReset();
    validateTwilioSignatureMock.mockReset();
    hasInboundMessageBySourceMsgIdMock.mockReset();
    getConversationIdByGuestPhoneMock.mockReset();
    resolveHotelIdByTwilioToMock.mockReset();
    hasInboundMessageBySourceMsgIdMock.mockResolvedValue(false);
    getConversationIdByGuestPhoneMock.mockResolvedValue(null);
    resolveHotelIdByTwilioToMock.mockResolvedValue("hotel999");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns 200 and sends outbound when pipeline returns sent", async () => {
    const { POST } = await import("@/app/api/webhooks/whatsapp/twilio/route");
    handleChannelMessageMock.mockResolvedValueOnce({
      response: "respuesta bot",
      status: "sent",
      messageId: "mid-1",
      conversationId: "conv-1",
      lang: "es",
    });
    twilioSendWhatsAppMessageMock.mockResolvedValueOnce({ sid: "SM_OUT_1" });

    const req = makeFormReq({
      From: "whatsapp:+59800000000",
      To: "whatsapp:+11111111111",
      Body: "hola",
      MessageSid: "SM123",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(handleChannelMessageMock).toHaveBeenCalledTimes(1);
    expect(twilioSendWhatsAppMessageMock).toHaveBeenCalledTimes(1);
    expect(twilioSendWhatsAppMessageMock).toHaveBeenCalledWith({
      hotelId: "hotel999",
      to: "whatsapp:+59800000000",
      body: "respuesta bot",
    });
  });

  it("enforced: returns 403 when signature missing", async () => {
    const { POST } = await import("@/app/api/webhooks/whatsapp/twilio/route");
    vi.stubEnv("TWILIO_SIGNATURE_ENFORCE", "1");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "token123");

    const req = makeFormReq({
      From: "whatsapp:+59800000000",
      To: "whatsapp:+11111111111",
      Body: "hola",
      MessageSid: "SM_SIG_MISSING",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.ok).toBe(false);
    expect(validateTwilioSignatureMock).toHaveBeenCalledTimes(0);
    expect(handleChannelMessageMock).toHaveBeenCalledTimes(0);
    expect(twilioSendWhatsAppMessageMock).toHaveBeenCalledTimes(0);
  });

  it("enforced: returns 403 when signature invalid", async () => {
    const { POST } = await import("@/app/api/webhooks/whatsapp/twilio/route");
    vi.stubEnv("TWILIO_SIGNATURE_ENFORCE", "1");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "token123");
    validateTwilioSignatureMock.mockReturnValueOnce(false);

    const req = new Request("http://localhost/api/webhooks/whatsapp/twilio", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "x-twilio-signature": "invalid-sig",
      },
      body: new URLSearchParams({
        From: "whatsapp:+59800000000",
        To: "whatsapp:+11111111111",
        Body: "hola",
        MessageSid: "SM_SIG_BAD",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.ok).toBe(false);
    expect(validateTwilioSignatureMock).toHaveBeenCalledTimes(1);
    expect(handleChannelMessageMock).toHaveBeenCalledTimes(0);
    expect(twilioSendWhatsAppMessageMock).toHaveBeenCalledTimes(0);
  });

  it("returns 200 and does not send outbound when pipeline returns pending", async () => {
    const { POST } = await import("@/app/api/webhooks/whatsapp/twilio/route");
    vi.stubEnv("WA_PENDING_ACK_ENABLED", "0");
    handleChannelMessageMock.mockResolvedValueOnce({
      response: "",
      status: "pending",
      messageId: "mid-2",
      conversationId: "conv-2",
      lang: "es",
    });

    const req = makeFormReq({
      From: "whatsapp:+59800000000",
      To: "whatsapp:+11111111111",
      Body: "hola",
      MessageSid: "SM999",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(handleChannelMessageMock).toHaveBeenCalledTimes(1);
    expect(twilioSendWhatsAppMessageMock).toHaveBeenCalledTimes(0);
  });

  it("returns 200 when To does not map", async () => {
    const { POST } = await import("@/app/api/webhooks/whatsapp/twilio/route");
    resolveHotelIdByTwilioToMock.mockResolvedValueOnce(null);

    const req = makeFormReq({
      From: "whatsapp:+59800000000",
      To: "whatsapp:+22222222222",
      Body: "hola",
      MessageSid: "SM777",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(handleChannelMessageMock).toHaveBeenCalledTimes(0);
    expect(twilioSendWhatsAppMessageMock).toHaveBeenCalledTimes(0);
  });

  it("resolves hotelId dynamically from hotel_config routing", async () => {
    const { POST } = await import("@/app/api/webhooks/whatsapp/twilio/route");
    resolveHotelIdByTwilioToMock.mockResolvedValueOnce("hotel-dynamic");
    handleChannelMessageMock.mockResolvedValueOnce({
      response: "",
      status: "pending",
      messageId: "mid-dynamic",
      conversationId: "conv-dynamic",
      lang: "es",
    });

    const req = makeFormReq({
      From: "whatsapp:+59800000000",
      To: "whatsapp:+99999999999",
      Body: "hola",
      MessageSid: "SM_DYNAMIC",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(resolveHotelIdByTwilioToMock).toHaveBeenCalledWith({ to: "whatsapp:+99999999999" });
    expect(handleChannelMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ hotelId: "hotel-dynamic" }),
    );
  });

  it("non-enforced: still returns 200 and processes", async () => {
    const { POST } = await import("@/app/api/webhooks/whatsapp/twilio/route");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "token123");
    vi.stubEnv("WA_PENDING_ACK_ENABLED", "0");
    validateTwilioSignatureMock.mockReturnValueOnce(false);
    handleChannelMessageMock.mockResolvedValueOnce({
      response: "",
      status: "pending",
      messageId: "mid-non-enforced",
      conversationId: "conv-non-enforced",
      lang: "es",
    });

    const req = new Request("http://localhost/api/webhooks/whatsapp/twilio", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "x-twilio-signature": "invalid-but-non-enforced",
      },
      body: new URLSearchParams({
        From: "whatsapp:+59800000000",
        To: "whatsapp:+11111111111",
        Body: "hola",
        MessageSid: "SM_NON_ENFORCED",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(validateTwilioSignatureMock).toHaveBeenCalledTimes(1);
    expect(handleChannelMessageMock).toHaveBeenCalledTimes(1);
    expect(twilioSendWhatsAppMessageMock).toHaveBeenCalledTimes(0);
  });

  it("dedupe: returns 200 and does not call pipeline/outbound when inbound already exists", async () => {
    const { POST } = await import("@/app/api/webhooks/whatsapp/twilio/route");
    hasInboundMessageBySourceMsgIdMock.mockResolvedValueOnce(true);

    const req = makeFormReq({
      From: "whatsapp:+59800000000",
      To: "whatsapp:+11111111111",
      Body: "hola",
      MessageSid: "SM_DEDUPE_1",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.deduped).toBe(true);
    expect(hasInboundMessageBySourceMsgIdMock).toHaveBeenCalledTimes(1);
    expect(handleChannelMessageMock).toHaveBeenCalledTimes(0);
    expect(twilioSendWhatsAppMessageMock).toHaveBeenCalledTimes(0);
  });

  it("dedupe: when check returns false, continues processing", async () => {
    const { POST } = await import("@/app/api/webhooks/whatsapp/twilio/route");
    hasInboundMessageBySourceMsgIdMock.mockResolvedValueOnce(false);
    vi.stubEnv("WA_PENDING_ACK_ENABLED", "0");
    handleChannelMessageMock.mockResolvedValueOnce({
      response: "",
      status: "pending",
      messageId: "mid-dedupe-fallback",
      conversationId: "conv-dedupe-fallback",
      lang: "es",
    });

    const req = makeFormReq({
      From: "whatsapp:+59800000000",
      To: "whatsapp:+11111111111",
      Body: "hola",
      MessageSid: "SM_DEDUPE_FALLBACK",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(handleChannelMessageMock).toHaveBeenCalledTimes(1);
    expect(twilioSendWhatsAppMessageMock).toHaveBeenCalledTimes(0);
  });

  it("binding: reuses existing conversationId", async () => {
    const { POST } = await import("@/app/api/webhooks/whatsapp/twilio/route");
    getConversationIdByGuestPhoneMock.mockResolvedValueOnce("conv-existing");
    handleChannelMessageMock.mockResolvedValueOnce({
      response: "",
      status: "pending",
      messageId: "mid-binding-existing",
      conversationId: "conv-existing",
      lang: "es",
    });

    const req = makeFormReq({
      From: "whatsapp:+59800000000",
      To: "whatsapp:+11111111111",
      Body: "hola",
      MessageSid: "SM_BINDING_EXISTING",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(handleChannelMessageMock).toHaveBeenCalledTimes(1);
    expect(handleChannelMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: "conv-existing" }),
    );
  });

  it("binding: when no previous conversation, pipeline generates new", async () => {
    const { POST } = await import("@/app/api/webhooks/whatsapp/twilio/route");
    getConversationIdByGuestPhoneMock.mockResolvedValueOnce(null);
    handleChannelMessageMock.mockResolvedValueOnce({
      response: "",
      status: "pending",
      messageId: "mid-binding-new",
      conversationId: "conv-generated",
      lang: "es",
    });

    const req = makeFormReq({
      From: "whatsapp:+59800000000",
      To: "whatsapp:+11111111111",
      Body: "hola",
      MessageSid: "SM_BINDING_NEW",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(handleChannelMessageMock).toHaveBeenCalledTimes(1);
    expect(handleChannelMessageMock.mock.calls[0]?.[0]).not.toHaveProperty("conversationId");
  });

  it("binding: DB error does not block", async () => {
    const { POST } = await import("@/app/api/webhooks/whatsapp/twilio/route");
    getConversationIdByGuestPhoneMock.mockRejectedValueOnce(new Error("binding down"));
    handleChannelMessageMock.mockResolvedValueOnce({
      response: "",
      status: "pending",
      messageId: "mid-binding-fallback",
      conversationId: "conv-generated",
      lang: "es",
    });

    const req = makeFormReq({
      From: "whatsapp:+59800000000",
      To: "whatsapp:+11111111111",
      Body: "hola",
      MessageSid: "SM_BINDING_FALLBACK",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(handleChannelMessageMock).toHaveBeenCalledTimes(1);
  });
});
