import { beforeEach, describe, expect, it, vi } from "vitest";

const getTwilioClientForHotelMock = vi.fn();

vi.mock("@/lib/channels/whatsapp/getTwilioClientForHotel", () => ({
  getTwilioClientForHotel: getTwilioClientForHotelMock,
}));

describe("twilioSendWhatsAppMessage", () => {
  beforeEach(() => {
    getTwilioClientForHotelMock.mockReset();
    vi.unstubAllEnvs();
    getTwilioClientForHotelMock.mockResolvedValue({
      client: {
        accountSid: "AC_TEST_123",
        authToken: "AUTH_TEST_123",
      },
      from: "+14155238886",
    });
  });

  it("normaliza from y to como direcciones whatsapp antes de llamar a Twilio", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ sid: "SM_OUT_1" }),
    }));
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const { twilioSendWhatsAppMessage } = await import("@/lib/channels/whatsapp/twilioSendMessage");

    await twilioSendWhatsAppMessage({
      hotelId: "hotel999",
      to: "+59898835914",
      body: "hola",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = new URLSearchParams(String(init.body || ""));

    expect(body.get("From")).toBe("whatsapp:+14155238886");
    expect(body.get("To")).toBe("whatsapp:+59898835914");
  });

  it("no duplica el prefijo whatsapp cuando fromOverride o to ya lo traen", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ sid: "SM_OUT_2" }),
    }));
    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const { twilioSendWhatsAppMessage } = await import("@/lib/channels/whatsapp/twilioSendMessage");

    await twilioSendWhatsAppMessage({
      hotelId: "hotel999",
      to: "whatsapp:+59898835914",
      body: "hola",
      fromOverride: "whatsapp:+14155238886",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = new URLSearchParams(String(init.body || ""));

    expect(body.get("From")).toBe("whatsapp:+14155238886");
    expect(body.get("To")).toBe("whatsapp:+59898835914");
  });
});
