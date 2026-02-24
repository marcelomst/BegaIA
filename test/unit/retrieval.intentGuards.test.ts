import { describe, it, expect, vi } from "vitest";
import { HumanMessage } from "@langchain/core/messages";

vi.mock("@/lib/utils/debugLog", () => ({ debugLog: () => {} }));

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class {
    invoke() {
      return {
        content: [
          "• Playa y caminatas costeras",
          "1. Miradores al atardecer",
          "Circuito gastronómico local",
        ].join("\n"),
      };
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
  searchFromAstra: vi.fn(async () => []),
}));

vi.mock("@/lib/media/googlePlaces", () => ({
  searchNearbyPlaces: vi.fn(async () => []),
}));

vi.mock("@/lib/poi/searchEvents", () => ({
  searchEvents: vi.fn(async () => []),
}));

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(async () => ({ timezone: "America/Montevideo", city: "Punta del Este" })),
}));

import { retrievalBased } from "@/lib/agents/retrieval_based";
import { searchEvents } from "@/lib/poi/searchEvents";
import { searchNearbyPlaces } from "@/lib/media/googlePlaces";

describe("retrieval intent guards", () => {
  it("things_to_do does not trigger events or nearby", async () => {
    const prev = process.env.DEBUG_ROUTING;
    process.env.DEBUG_ROUTING = "1";
    const res = await retrievalBased({
      hotelId: "hotel999",
      promptKey: "things_to_do",
      category: "retrieval_based",
      normalizedMessage: "agenda cultural y event calendar para hacer en parada 5 playa mansa este mes",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("agenda cultural y event calendar para hacer en parada 5 playa mansa este mes")],
    } as any);
    process.env.DEBUG_ROUTING = prev;

    expect(searchEvents).not.toHaveBeenCalled();
    expect(searchNearbyPlaces).not.toHaveBeenCalled();
    expect(res.promptKey).toBe("things_to_do");
    expect(res?.meta?.debug?.intentGroup).toBe("things_to_do");
    const msg = String(res?.messages?.[res.messages.length - 1]?.content || "");
    expect(msg).not.toMatch(/•/);
    expect(msg).not.toMatch(/\n\s*\d+\./);
    expect(msg.trim().endsWith("?")).toBe(true);
  });
});
