import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HumanMessage } from "@langchain/core/messages";

vi.mock("@/lib/utils/debugLog", () => ({ debugLog: () => {} }));

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class {
    invoke() {
      return { content: "" };
    }
  },
}));

vi.mock("@/lib/poi/searchEvents", () => ({
  searchEvents: vi.fn(async () => [
    {
      name: "Mercadillo Orgánico",
      startsAt: "2026-02-08T10:00:00-03:00",
      endsAt: "2026-02-08T13:00:00-03:00",
      location: { name: "Cantegril Country Club", locality: "Piriápolis" },
      sourceUrl: "https://example.com/agenda",
    },
  ]),
}));

vi.mock("@/lib/media/googlePlaces", () => ({
  searchNearbyPlaces: vi.fn(async () => []),
}));

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(async () => ({ timezone: "America/Montevideo", city: "Piriápolis", country: "Uruguay" })),
}));

import { retrievalBased } from "@/lib/agents/retrieval_based";

describe("events positive responses", () => {
  const prevEnv = process.env.DEBUG_ROUTING;
  beforeEach(() => {
    process.env.DEBUG_ROUTING = "1";
  });
  afterEach(() => {
    process.env.DEBUG_ROUTING = prevEnv;
  });

  it("tourist_events includes event details and debug meta", async () => {
    const res = await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events",
      category: "retrieval_based",
      normalizedMessage: "eventos en piriapolis",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("eventos en piriapolis")],
    } as any);

    const msg = String(res?.messages?.[res.messages.length - 1]?.content || "");
    expect(msg).toMatch(/Mercadillo/i);
    expect(msg).toMatch(/Cantegril/i);
    expect(msg).toMatch(/https:\/\/example\.com\/agenda/);
    expect(res?.meta?.debug?.intentGroup).toBe("events");
    expect(res?.meta?.debug?.carouselCount ?? 0).toBe(0);
    expect(msg).not.toMatch(/Punta del Este/i);
  });

  it("tourist_events_img includes text and optional carousel", async () => {
    const res = await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events_img",
      category: "retrieval_based",
      normalizedMessage: "eventos en piriapolis con fotos",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("eventos en piriapolis con fotos")],
    } as any);

    const msg = String(res?.messages?.[res.messages.length - 1]?.content || "");
    expect(msg).toMatch(/Mercadillo/i);
    expect(msg).toMatch(/Cantegril/i);
    expect(res?.meta?.debug?.intentGroup).toBe("events");
    expect((res?.meta?.debug?.carouselCount ?? 0)).toBeGreaterThanOrEqual(0);
    if (res?.meta?.rich?.carousel) {
      expect(res.meta.rich.carousel.length).toBeGreaterThanOrEqual(1);
    }
    expect(msg).not.toMatch(/Punta del Este/i);
  });
});
