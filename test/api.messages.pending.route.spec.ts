// Path: /root/begasist/test/api.messages.pending.route.spec.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserMock = vi.fn();
const getMessagesFromChannelMock = vi.fn();
const getHotelConfigMock = vi.fn();

vi.mock("@/lib/auth/getCurrentUser", () => ({
  getCurrentUser: getCurrentUserMock,
}));

vi.mock("@/lib/services/messages", () => ({
  getMessagesFromChannel: getMessagesFromChannelMock,
}));

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: getHotelConfigMock,
}));

describe("/api/messages/pending", () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset();
    getMessagesFromChannelMock.mockReset();
    getHotelConfigMock.mockReset();

    getCurrentUserMock.mockResolvedValue({
      email: "agent@hotel.com",
      hotelId: "hotel999",
      roleLevel: 80,
    });
  });

  it("calcula ageMinutes y breach con slaMinutes", async () => {
    const { GET } = await import("@/app/api/messages/pending/route");

    getHotelConfigMock.mockResolvedValueOnce({
      hotelId: "hotel999",
      channelConfigs: { whatsapp: { slaMinutes: 10 } },
    });

    const oldIso = new Date(Date.now() - 16 * 60_000).toISOString();
    getMessagesFromChannelMock.mockResolvedValueOnce([
      {
        messageId: "m1",
        hotelId: "hotel999",
        channel: "whatsapp",
        status: "pending",
        role: "ai",
        guestId: "whatsapp:+59800000000",
        suggestion: "hola",
        timestamp: oldIso,
      },
    ]);

    const req = new Request("http://localhost/api/messages/pending?hotelId=hotel999&channel=whatsapp");
    const res = await GET(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.slaMinutes).toBe(10);
    expect(Array.isArray(json.pending)).toBe(true);
    expect(json.pending[0].breach).toBe(true);
    expect(json.pending[0].ageMinutes).toBeGreaterThanOrEqual(15);
  });
});
