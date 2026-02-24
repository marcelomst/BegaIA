import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(),
  updateHotelConfig: vi.fn(),
}));
vi.mock("@/lib/media/googlePlaces", () => ({
  searchNearbyPlaces: vi.fn(async () => ([
    { name: "Festival X", photoName: "places/abc/photos/evt" },
  ])),
}));
vi.mock("@/lib/poi/searchEvents", () => ({
  searchEvents: vi.fn(async () => [
    {
      name: "Festival POI",
      startsAt: "2026-03-10T12:00:00.000Z",
      endsAt: "2026-03-10T23:00:00.000Z",
      sourceUrl: "https://poi.test/festival",
      location: { name: "Teatro POI" },
      summary: "Evento desde POI",
    },
  ]),
}));
vi.mock("@langchain/openai", () => {
  return {
    ChatOpenAI: class {
      async invoke() {
        return { content: "Evento destacado en la ciudad." };
      }
    },
  };
});

import { POST } from "@/app/api/admin/hotel-config/enrich-events/route";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import { searchNearbyPlaces } from "@/lib/media/googlePlaces";
import { searchEvents } from "@/lib/poi/searchEvents";

describe("admin enrich-events", () => {
  const hotelId = "hotel999";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("auth: ADMIN_API_KEY missing -> 500", async () => {
    delete process.env.ADMIN_API_KEY;
    const req = new Request("http://localhost/api/admin/hotel-config/enrich-events", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-hotel-id": "system" },
      body: JSON.stringify({ hotelId }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(500);
  });

  it("auth: wrong key -> 401", async () => {
    process.env.ADMIN_API_KEY = "test-key";
    const req = new Request("http://localhost/api/admin/hotel-config/enrich-events", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": "bad", "x-hotel-id": "system" },
      body: JSON.stringify({ hotelId }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it("auth: wrong hotel -> 403", async () => {
    process.env.ADMIN_API_KEY = "test-key";
    const req = new Request("http://localhost/api/admin/hotel-config/enrich-events", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": "test-key", "x-hotel-id": "system" },
      body: JSON.stringify({ hotelId }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(403);
  });

  it("system hotelId is forbidden in this endpoint -> 403", async () => {
    process.env.ADMIN_API_KEY = "test-key";
    const req = new Request("http://localhost/api/admin/hotel-config/enrich-events", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": "test-key", "x-hotel-id": "system" },
      body: JSON.stringify({ hotelId: "system" }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(403);
  });

  it("merge y stats: conserva imágenes existentes y enriquece notas", async () => {
    process.env.ADMIN_API_KEY = "test-key";
    (getHotelConfig as any).mockResolvedValue({
      hotelId,
      defaultLanguage: "es",
      address: "Centro",
      city: "Punta del Este",
      country: "UY",
      touristEvents: [
        { name: "Festival X", notes: "Ya existente", images: [{ url: "https://existing.jpg", alt: "Festival X" }] },
        { name: "Teatro Y" },
      ],
    });

    const req = new Request("http://localhost/api/admin/hotel-config/enrich-events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": "test-key",
        "x-hotel-id": "hotel999",
      },
      body: JSON.stringify({ hotelId, force: false }),
    });

    const res = await POST(req as any);
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.stats).toBeDefined();

    expect(updateHotelConfig).toHaveBeenCalledTimes(1);
    const [, payload] = (updateHotelConfig as any).mock.calls[0];
    const next = payload?.touristEvents || [];
    expect(next[0]?.images?.[0]?.url).toBe("https://existing.jpg");
    expect(String(next[1]?.notes || "")).toContain("Evento destacado");
  });

  it("sin ubicación: no llama Places y persiste igual", async () => {
    process.env.ADMIN_API_KEY = "test-key";
    (getHotelConfig as any).mockResolvedValue({
      hotelId,
      defaultLanguage: "es",
      touristEvents: [{ name: "Teatro Y" }],
    });

    const req = new Request("http://localhost/api/admin/hotel-config/enrich-events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": "test-key",
        "x-hotel-id": "hotel999",
      },
      body: JSON.stringify({ hotelId, force: false }),
    });

    const res = await POST(req as any);
    expect(res.ok).toBe(true);
    expect(searchNearbyPlaces).not.toHaveBeenCalled();
    expect(updateHotelConfig).toHaveBeenCalledTimes(1);
  });

  it("regenerar toma base desde POI por region y no desde LLM", async () => {
    process.env.ADMIN_API_KEY = "test-key";
    (getHotelConfig as any).mockResolvedValue({
      hotelId,
      defaultLanguage: "es",
      timezone: "America/Montevideo",
      city: "Punta del Este",
      country: "UY",
      eventsRegion: "maldonado_uy",
      touristEvents: [{ name: "Viejo" }],
    });

    const req = new Request("http://localhost/api/admin/hotel-config/enrich-events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": "test-key",
        "x-hotel-id": "hotel999",
      },
      body: JSON.stringify({ hotelId, regenerate: true, force: true }),
    });

    const res = await POST(req as any);
    expect(res.ok).toBe(true);
    expect(searchEvents).toHaveBeenCalledTimes(1);
    const [, payload] = (updateHotelConfig as any).mock.calls[(updateHotelConfig as any).mock.calls.length - 1];
    const next = payload?.touristEvents || [];
    expect(next.length).toBeGreaterThan(0);
    expect(next[0]?.name).toContain("Festival POI");
    expect(next[0]?.venue).toContain("Teatro POI");
  });
});
