import { describe, it, expect, vi, beforeEach } from "vitest";
import { HumanMessage } from "@langchain/core/messages";

vi.mock("@/lib/utils/debugLog", () => ({ debugLog: () => {} }));

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class {
    invoke() {
      return { content: "stub concierge" };
    }
  },
}));

vi.mock("@/lib/astra/connection", () => ({
  getHotelAstraCollection: vi.fn(() => ({
    find: () => ({
      async *[Symbol.asyncIterator]() {},
      close: () => {},
    }),
  })),
}));

vi.mock("@/lib/retrieval", () => ({
  searchFromAstra: vi.fn(async () => ["ctx"]),
}));

vi.mock("@/lib/media/googlePlaces", () => ({
  searchNearbyPlaces: vi.fn(async () => []),
}));

vi.mock("@/lib/poi/searchEvents", () => ({
  searchEvents: vi.fn(async () => []),
}));

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(),
}));

import { retrievalBased } from "@/lib/agents/retrieval_based";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { searchNearbyPlaces } from "@/lib/media/googlePlaces";

describe("things_to_do_img carousel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_PLACES_RUNTIME = "0";
  });

  it("uses only real config images and omits carousel when no valid images and runtime is off", async () => {
    (getHotelConfig as any).mockResolvedValueOnce({
      city: "Punta del Este",
      country: "Uruguay",
      attractions: [
        {
          name: "Playa Brava",
          zone: "Punta del Este",
          images: [{ url: "https://img.test/brava.jpg" }, { url: "http://img.test/brava-2.jpg" }],
        },
        {
          name: "Item inválido",
          images: [{ url: "" }, { url: "ftp://img.test/nope.jpg" }, "nota-sin-url"],
        },
      ],
    });

    const resWithImages = await retrievalBased({
      hotelId: "hotel999",
      promptKey: "things_to_do_img",
      category: "retrieval_based",
      normalizedMessage: "que se puede hacer con fotos",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("que se puede hacer con fotos")],
    } as any);

    const carouselA = resWithImages?.meta?.rich?.carousel || [];
    expect(carouselA.length).toBeGreaterThan(0);
    expect(carouselA.every((item: any) => Array.isArray(item?.images) && item.images.length >= 1)).toBe(true);
    const urlsA = carouselA.flatMap((item: any) => (item?.images || []).map((img: any) => String(img?.url || "")));
    expect(urlsA.length).toBeGreaterThan(0);
    expect(urlsA.every((u: string) => /^https?:\/\//i.test(u) && u.trim().length > 0)).toBe(true);

    (getHotelConfig as any).mockResolvedValueOnce({
      city: "Punta del Este",
      country: "Uruguay",
      attractions: [{ name: "Sin imagen", images: [{ url: "" }, { url: "nota" }] }],
    });

    const resNoImages = await retrievalBased({
      hotelId: "hotel999",
      promptKey: "things_to_do_img",
      category: "retrieval_based",
      normalizedMessage: "que se puede hacer con fotos",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("que se puede hacer con fotos")],
    } as any);

    expect(resNoImages?.meta?.rich?.carousel).toBeUndefined();
  });

  it("dedupes and filters fallback places carousel items", async () => {
    process.env.ALLOW_PLACES_RUNTIME = "1";
    (getHotelConfig as any).mockResolvedValue({
      city: "Punta del Este",
      country: "Uruguay",
      attractions: [{ name: "Sin imagen", images: [{ url: "" }] }],
    });
    (searchNearbyPlaces as any).mockResolvedValue([
      { name: "Los Dedos", photoName: "places/x/photos/1" },
      { name: "Los Dedos", photoName: "places/x/photos/2" },
      { name: "Puerto", photoName: "places/x/photos/3" },
      { name: "Sin foto" },
    ]);

    const res = await retrievalBased({
      hotelId: "hotel999",
      promptKey: "things_to_do_img",
      category: "retrieval_based",
      normalizedMessage: "que se puede hacer con fotos",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("que se puede hacer con fotos")],
    } as any);

    const carousel = res?.meta?.rich?.carousel || [];
    expect(carousel.length).toBe(2);
    const titles = carousel.map((i: any) => i.title);
    expect(titles).toEqual(["Los Dedos", "Puerto"]);
    const urls = carousel.flatMap((item: any) => (item?.images || []).map((img: any) => String(img?.url || "")));
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((u: string) => u.startsWith("/api/places/photo?") || /^https?:\/\//i.test(u))).toBe(true);
  });
});
