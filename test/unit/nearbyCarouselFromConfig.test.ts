import { describe, it, expect, vi, beforeEach } from "vitest";
import { HumanMessage } from "@langchain/core/messages";

let lastCursor: { close: ReturnType<typeof vi.fn> } | null = null;
const makeCursor = () => {
  const cursor = {
    async *[Symbol.asyncIterator]() { /* empty */ },
    close: vi.fn(),
  };
  lastCursor = cursor;
  return cursor;
};

vi.mock("@/lib/astra/connection", () => ({
  getHotelAstraCollection: vi.fn(() => ({
    find: vi.fn(() => makeCursor()),
  })),
}));

vi.mock("@/lib/retrieval", () => ({
  searchFromAstra: vi.fn(async () => ""),
}));
vi.mock("@/lib/media/googlePlaces", () => ({
  searchNearbyPlaces: vi.fn(async () => []),
}));
vi.mock("@/lib/i18n/translateIfNeeded", () => ({
  translateIfNeeded: vi.fn(async (text: string) => text),
}));
vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(),
}));

import { retrievalBased } from "@/lib/agents/retrieval_based";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { searchNearbyPlaces } from "@/lib/media/googlePlaces";

const makeAttractions = () => ([
  { name: "Playa Brava", notes: "Olas fuertes", images: [{ url: "https://img/1.jpg", alt: "Playa Brava" }] },
  { name: "Los Dedos", notes: "Escultura", images: [{ url: "https://img/2.jpg" }] },
  { name: "Gorlero", notes: "Avenida", images: [{ url: "https://img/3.jpg" }] },
]);

describe("retrievalBased nearby_points carousel from hotel_config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ALLOW_PLACES_RUNTIME;
    lastCursor = null;
  });

  it("nearby_points_img uses config carousel and does not call Places", async () => {
    (getHotelConfig as any).mockResolvedValue({
      hotelId: "hotel999",
      attractions: makeAttractions(),
      nearbyPointsMode: "auto",
      city: "Punta del Este",
      country: "UY",
    });
    const res = await retrievalBased({
      hotelId: "hotel999",
      promptKey: "nearby_points_img",
      category: "retrieval_based",
      normalizedMessage: "puntos de interes cerca de playa mansa",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("puntos de interes cerca de playa mansa")],
    } as any);
    expect(searchNearbyPlaces).not.toHaveBeenCalled();
    expect(res?.meta?.rich?.carousel?.length || 0).toBeGreaterThan(0);
    expect(res?.meta?.rich?.carousel?.[0]?.images?.[0]?.url || "").toContain("https://img/");
    const urls = (res?.meta?.rich?.carousel || []).flatMap((item: any) => (item?.images || []).map((img: any) => img?.url || ""));
    expect(urls.join("|")).toContain("https://img/2.jpg");
    expect(lastCursor?.close).toHaveBeenCalled();
  });

  it("nearby_points with nearbyPointsMode=carousel uses config carousel", async () => {
    (getHotelConfig as any).mockResolvedValue({
      hotelId: "hotel999",
      attractions: makeAttractions(),
      nearbyPointsMode: "carousel",
      city: "Punta del Este",
      country: "UY",
    });
    const res = await retrievalBased({
      hotelId: "hotel999",
      promptKey: "nearby_points",
      category: "retrieval_based",
      normalizedMessage: "puntos de interes cerca de playa mansa",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("puntos de interes cerca de playa mansa")],
    } as any);
    expect(searchNearbyPlaces).not.toHaveBeenCalled();
    expect(res?.meta?.rich?.carousel?.length || 0).toBeGreaterThan(0);
    expect(res?.meta?.rich?.carousel?.[0]?.images?.[0]?.url || "").toContain("https://img/");
    const urls = (res?.meta?.rich?.carousel || []).flatMap((item: any) => (item?.images || []).map((img: any) => img?.url || ""));
    expect(urls.join("|")).toContain("https://img/2.jpg");
    expect(lastCursor?.close).toHaveBeenCalled();
  });
});
