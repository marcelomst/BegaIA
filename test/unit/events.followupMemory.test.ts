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

let convStateStore: any = null;
vi.mock("@/lib/db/convState", () => ({
  getConvState: vi.fn(async () => convStateStore),
  upsertConvState: vi.fn(async (_hotelId: string, _conversationId: string, patch: any) => {
    convStateStore = { ...(convStateStore || {}), ...patch };
  }),
}));

import { retrievalBased } from "@/lib/agents/retrieval_based";
import { getConvState, upsertConvState } from "@/lib/db/convState";

describe("events follow-up memory", () => {
  it("persists city and reuses it on follow-ups", async () => {
    convStateStore = null;
    const res1 = await retrievalBased({
      hotelId: "hotel999",
      conversationId: "c1",
      promptKey: "tourist_events",
      category: "retrieval_based",
      normalizedMessage: "Eventos hoy en Piriápolis",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("Eventos hoy en Piriápolis")],
    } as any);

    const msg1 = String(res1?.messages?.[res1.messages.length - 1]?.content || "");
    expect(msg1).toMatch(/Ciudad:\s+Piriápolis/);
    expect(upsertConvState).toHaveBeenCalled();
    expect((await getConvState("hotel999", "c1"))?.lastEventCity).toBe("Piriápolis");

    const res2 = await retrievalBased({
      hotelId: "hotel999",
      conversationId: "c1",
      promptKey: "tourist_events",
      category: "retrieval_based",
      normalizedMessage: "¿Y este fin de semana?",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("¿Y este fin de semana?")],
    } as any);

    const msg2 = String(res2?.messages?.[res2.messages.length - 1]?.content || "");
    expect(msg2).toMatch(/Ciudad:\s+Piriápolis/);
  });

  it("promotes to _img on follow-up with photos and keeps city", async () => {
    const res3 = await retrievalBased({
      hotelId: "hotel999",
      conversationId: "c1",
      promptKey: "tourist_events",
      category: "retrieval_based",
      normalizedMessage: "¿Y con fotos?",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("¿Y con fotos?")],
    } as any);

    const msg3 = String(res3?.messages?.[res3.messages.length - 1]?.content || "");
    expect(msg3).toMatch(/Ciudad:\s+Piriápolis/);
    expect(msg3).not.toMatch(/Lamentablemente/i);
    expect((await getConvState("hotel999", "c1"))?.lastEventPromptKey).toBe("tourist_events_img");
  });
});
