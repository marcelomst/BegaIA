import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const handleChannelMessageMock = vi.fn();
const twilioSendWhatsAppMessageMock = vi.fn();
const validateTwilioSignatureMock = vi.fn();

vi.mock("@/lib/pipeline/handleChannelMessage", () => ({
  handleChannelMessage: handleChannelMessageMock,
}));

vi.mock("@/lib/channels/whatsapp/twilioSendMessage", () => ({
  twilioSendWhatsAppMessage: twilioSendWhatsAppMessageMock,
}));

vi.mock("@/lib/channels/whatsapp/twilioValidateSignature", () => ({
  validateTwilioSignature: validateTwilioSignatureMock,
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
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns 200 and sends outbound when pipeline returns sent", async () => {
    const { POST } = await import("@/app/api/webhooks/whatsapp/twilio/route");
    vi.stubEnv("TWILIO_WA_TO_HOTEL999", "whatsapp:+11111111111");
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC123");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "token123");
    vi.stubEnv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886");
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
      to: "whatsapp:+59800000000",
      from: "whatsapp:+14155238886",
      body: "respuesta bot",
    });
  });

  it("enforced: returns 403 when signature missing", async () => {
    const { POST } = await import("@/app/api/webhooks/whatsapp/twilio/route");
    vi.stubEnv("TWILIO_SIGNATURE_ENFORCE", "1");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "token123");
    vi.stubEnv("TWILIO_WA_TO_HOTEL999", "whatsapp:+11111111111");

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
    vi.stubEnv("TWILIO_WA_TO_HOTEL999", "whatsapp:+11111111111");
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
    vi.stubEnv("TWILIO_WA_TO_HOTEL999", "whatsapp:+11111111111");
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
    vi.stubEnv("TWILIO_WA_TO_HOTEL999", "whatsapp:+11111111111");

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

  it("non-enforced: still returns 200 and processes", async () => {
    const { POST } = await import("@/app/api/webhooks/whatsapp/twilio/route");
    vi.stubEnv("TWILIO_WA_TO_HOTEL999", "whatsapp:+11111111111");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "token123");
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
});
