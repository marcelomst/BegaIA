import { describe, it, expect, vi } from "vitest";
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
  searchEvents: vi.fn(async () => []),
}));

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(async () => ({ timezone: "America/Montevideo" })),
}));

import { retrievalBased } from "@/lib/agents/retrieval_based";

describe("events city detection", () => {
  it("uses locality mentioned in query", async () => {
    const res = await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events",
      category: "retrieval_based",
      normalizedMessage: "¿Eventos hoy en Punta Colorada?",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("¿Eventos hoy en Punta Colorada?")],
    } as any);

    const msg = String(res?.messages?.[res.messages.length - 1]?.content || "");
    expect(msg).toMatch(/Ciudad:\s+Punta Colorada/);
    expect(msg).not.toMatch(/\(sin ciudad\)/);
  });
});
