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
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { twilioSendWhatsAppMessage } = await import("@/lib/channels/whatsapp/twilioSendMessage");

    await twilioSendWhatsAppMessage({
      hotelId: "hotel999",
      to: "+59898835914",
      body: "hola",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const firstCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const [, init] = firstCall;
    const body = new URLSearchParams(String(init.body || ""));

    expect(body.get("From")).toBe("whatsapp:+14155238886");
    expect(body.get("To")).toBe("whatsapp:+59898835914");
  });

  it("no duplica el prefijo whatsapp cuando fromOverride o to ya lo traen", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ sid: "SM_OUT_2" }),
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { twilioSendWhatsAppMessage } = await import("@/lib/channels/whatsapp/twilioSendMessage");

    await twilioSendWhatsAppMessage({
      hotelId: "hotel999",
      to: "whatsapp:+59898835914",
      body: "hola",
      fromOverride: "whatsapp:+14155238886",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const firstCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const [, init] = firstCall;
    const body = new URLSearchParams(String(init.body || ""));

    expect(body.get("From")).toBe("whatsapp:+14155238886");
    expect(body.get("To")).toBe("whatsapp:+59898835914");
  });

  it("normaliza markdown de confirmación para WhatsApp sin asteriscos desbalanceados", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ sid: "SM_OUT_3" }),
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { twilioSendWhatsAppMessage } = await import("@/lib/channels/whatsapp/twilioSendMessage");

    await twilioSendWhatsAppMessage({
      hotelId: "hotel999",
      to: "+59898835914",
      body:
        "✅ ¡Reserva confirmada! Código **RES-F86F10**.\n" +
        "Habitación **doble**, Fechas **2026-06-18 → 2026-06-20** · **2** huésped(es) · Reserva a nombre de **Pep Guardiola**.",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const firstCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const [, init] = firstCall;
    const body = new URLSearchParams(String(init.body || ""));
    const sentText = String(body.get("Body") || "");

    expect(sentText).toContain("Código *RES-F86F10*");
    expect(sentText).toContain("Habitación *doble*");
    expect(sentText).toContain("Fechas *2026-06-18 → 2026-06-20*");
    expect(sentText).toContain("Reserva a nombre de *Pep Guardiola*");
    expect(sentText).not.toContain("Habitación *doble, Fechas");
    expect(sentText).not.toContain("Fechas **");
    expect(sentText).not.toContain("**");
    expect((sentText.match(/\*/g) || []).length % 2).toBe(0);
  });
});
