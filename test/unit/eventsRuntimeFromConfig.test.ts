import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HumanMessage } from "@langchain/core/messages";

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(),
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
vi.mock("@/lib/astra/connection", () => ({
  getAstraDB: () => ({
    collection: () => ({
      find: vi.fn(async () => []),
    }),
  }),
}));
vi.mock("@/lib/poi/searchEvents", () => ({
  searchEvents: vi.fn(),
}));

import { retrievalBased } from "@/lib/agents/retrieval_based";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { searchNearbyPlaces } from "@/lib/media/googlePlaces";
import { searchFromAstra } from "@/lib/retrieval";
import { searchEvents } from "@/lib/poi/searchEvents";

const makeEvents = () => ([
  { name: "Festival X", notes: "Evento anual", images: [{ url: "https://img/1.jpg", alt: "Festival X" }] },
  { name: "Teatro Y", notes: "Obra en el centro", images: [{ url: "https://img/2.jpg" }] },
]);

describe("events runtime from config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("tourist_events_img returns carousel from config", async () => {
    (searchEvents as any).mockResolvedValue([
      { name: "Festival X", startsAt: "2026-01-27T00:00:00Z", location: { name: "Teatro Central" } },
    ]);
    (getHotelConfig as any).mockResolvedValue({
      hotelId: "hotel999",
      defaultLanguage: "es",
      city: "Punta del Este",
      country: "UY",
      touristEvents: makeEvents(),
    });
    const res = await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "eventos cerca",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("eventos cerca")],
    } as any);
    expect(searchEvents).toHaveBeenCalledWith(
      expect.objectContaining({ city: "Punta del Este" })
    );
    expect(searchNearbyPlaces).toHaveBeenCalledTimes(1);
    expect(searchFromAstra).not.toHaveBeenCalled();
    const text = (res?.messages?.at?.(-1)?.content || "").toString();
    expect(text).toContain("Festival X");
    expect(text).toContain("Teatro Central");
  });

  it("tourist_events with nearbyPointsMode=carousel returns carousel", async () => {
    (searchEvents as any).mockResolvedValue([
      { name: "Teatro Y", startsAt: "2026-01-27T00:00:00Z", location: { locality: "Punta del Este" } },
    ]);
    (getHotelConfig as any).mockResolvedValue({
      hotelId: "hotel999",
      defaultLanguage: "es",
      nearbyPointsMode: "carousel",
      touristEvents: makeEvents(),
    });
    const res = await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events",
      category: "retrieval_based",
      normalizedMessage: "eventos",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("eventos")],
    } as any);
    expect(searchNearbyPlaces).not.toHaveBeenCalled();
    expect(searchFromAstra).not.toHaveBeenCalled();
    const text = (res?.messages?.at?.(-1)?.content || "").toString();
    expect(text).toContain("Teatro Y");
  });

  it("empty touristEvents does not crash and returns no carousel", async () => {
    (searchEvents as any).mockResolvedValue([]);
    (getHotelConfig as any).mockResolvedValue({
      hotelId: "hotel999",
      defaultLanguage: "es",
      touristEvents: [],
    });
    const res = await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "eventos",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("eventos")],
    } as any);
    const text = (res?.messages?.at?.(-1)?.content || "").toString();
    expect(text).toContain("No encontré eventos");
  });

  it("filters out past events when endsAt is before now", async () => {
    const nowISO = "2026-01-26T12:00:00Z";
    (searchEvents as any).mockResolvedValue([
      { name: "Vigente sin fechas", location: { locality: "Punta del Este" } },
    ]);
    (getHotelConfig as any).mockResolvedValue({
      hotelId: "hotel999",
      defaultLanguage: "es",
      touristEvents: [
        { name: "Pasado", startsAt: "2026-01-01T00:00:00Z", endsAt: "2026-01-05T00:00:00Z", images: [{ url: "https://img/old.jpg" }] },
        { name: "Vigente sin fechas", notes: "ok", images: [{ url: "https://img/ok.jpg" }] },
      ],
    });
    const res = await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "eventos",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("eventos")],
      nowISO,
    } as any);
    const text = (res?.messages?.at?.(-1)?.content || "").toString();
    expect(text).not.toContain("Pasado");
    expect(text).toContain("Vigente sin fechas");
    expect(searchNearbyPlaces).not.toHaveBeenCalled();
    expect(searchFromAstra).not.toHaveBeenCalled();
  });

  it("includes venue, dates and clean sourceUrl in text", async () => {
    const nowISO = "2026-01-26T12:00:00Z";
    (searchEvents as any).mockResolvedValue([
      {
        name: "Concierto Z",
        startsAt: "2026-01-26T00:00:00Z",
        endsAt: "2026-01-26T23:59:59Z",
        location: { name: "Teatro Central" },
      },
    ]);
    (getHotelConfig as any).mockResolvedValue({
      hotelId: "hotel999",
      defaultLanguage: "es",
      touristEvents: [
        {
          name: "Concierto Z",
          notes: "Live",
          startsAt: "2026-01-26T00:00:00Z",
          endsAt: "2026-01-26T23:59:59Z",
          venue: "Teatro Central",
          sourceUrl: "https://example.com/evento?id=123&utm=abc",
          images: [{ url: "https://img/ev.jpg" }],
        },
      ],
    });
    const res = await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events",
      category: "retrieval_based",
      normalizedMessage: "eventos",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("eventos")],
      nowISO,
    } as any);
    const text = (res?.messages?.at?.(-1)?.content || "").toString();
    expect(text).toContain("Concierto Z");
    expect(text).toContain("Teatro Central");
    expect(searchNearbyPlaces).not.toHaveBeenCalled();
    expect(searchFromAstra).not.toHaveBeenCalled();
  });

  it("orders by startsAt ascending (nearest first)", async () => {
    const nowISO = "2026-01-15T00:00:00Z";
    (searchEvents as any).mockResolvedValue([
      { name: "Mas pronto", startsAt: "2026-01-18T00:00:00Z" },
      { name: "Mas tarde", startsAt: "2026-01-20T00:00:00Z" },
    ]);
    (getHotelConfig as any).mockResolvedValue({
      hotelId: "hotel999",
      defaultLanguage: "es",
      touristEvents: [
        { name: "Mas tarde", startsAt: "2026-01-20T00:00:00Z", images: [{ url: "https://img/late.jpg" }] },
        { name: "Mas pronto", startsAt: "2026-01-18T00:00:00Z", images: [{ url: "https://img/soon.jpg" }] },
      ],
    });
    const res = await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "eventos",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("eventos")],
      nowISO,
    } as any);
    const text = (res?.messages?.at?.(-1)?.content || "").toString();
    const posSoon = text.indexOf("Mas pronto");
    const posLate = text.indexOf("Mas tarde");
    expect(posSoon).toBeGreaterThan(-1);
    expect(posLate).toBeGreaterThan(-1);
    expect(posSoon).toBeLessThan(posLate);
    expect(searchNearbyPlaces).not.toHaveBeenCalled();
    expect(searchFromAstra).not.toHaveBeenCalled();
  });
});
