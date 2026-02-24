import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(),
  updateHotelConfig: vi.fn(),
}));
vi.mock("@/lib/media/googlePlaces", () => ({
  searchNearbyPlaces: vi.fn(async () => ([
    { name: "Playa Mansa", photoName: "places/abc/photos/def" },
  ])),
}));
vi.mock("@langchain/openai", () => {
  return {
    ChatOpenAI: class {
      async invoke() {
        return { content: "Nota enriquecida" };
      }
    },
  };
});

import { POST } from "@/app/api/admin/hotel-config/enrich-attractions/route";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import { searchNearbyPlaces } from "@/lib/media/googlePlaces";

describe("admin enrich-attractions", () => {
  const hotelId = "hotel999";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_API_KEY = "test-key";
  });

  it("mantiene imágenes existentes y enriquece notes cuando falta", async () => {
    (getHotelConfig as any).mockResolvedValue({
      hotelId,
      defaultLanguage: "es",
      address: "Playa Mansa",
      city: "Punta del Este",
      country: "UY",
      attractions: [
        { name: "Avenida Gorlero", notes: "Ya existente", images: [{ url: "https://existing.jpg", alt: "Avenida" }] },
        { name: "Playa Brava" },
      ],
    });

    const req = new Request("http://localhost/api/admin/hotel-config/enrich-attractions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": "test-key",
        "x-hotel-id": "system",
      },
      body: JSON.stringify({ hotelId, maxItems: 12, maxImagesPerItem: 2, force: false }),
    });

    const res = await POST(req as any);
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.stats).toBeDefined();

    expect(updateHotelConfig).toHaveBeenCalledTimes(1);
    const [, payload] = (updateHotelConfig as any).mock.calls[0];
    const next = payload?.attractions || [];
    expect(next.length).toBe(2);
    expect(next[0]?.images?.[0]?.url).toBe("https://existing.jpg");
    expect(String(next[1]?.notes || "")).toContain("Nota enriquecida");
    expect(String(next[1]?.images?.[0]?.url || "")).toContain("/api/places/photo?name=");
  });

  it("sin ubicación: no llama Places y persiste igual", async () => {
    (getHotelConfig as any).mockResolvedValue({
      hotelId,
      defaultLanguage: "es",
      attractions: [
        { name: "Playa Brava" },
      ],
    });

    const req = new Request("http://localhost/api/admin/hotel-config/enrich-attractions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": "test-key",
        "x-hotel-id": "system",
      },
      body: JSON.stringify({ hotelId, maxItems: 12, maxImagesPerItem: 2, force: false }),
    });

    const res = await POST(req as any);
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(searchNearbyPlaces).not.toHaveBeenCalled();
    expect(updateHotelConfig).toHaveBeenCalledTimes(1);
    expect(json?.stats?.skippedImages).toBe(1);
  });
});
