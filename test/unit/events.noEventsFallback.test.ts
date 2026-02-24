import { describe, it, expect, vi } from "vitest";
import { HumanMessage } from "@langchain/core/messages";

vi.mock("@/lib/utils/debugLog", () => ({ debugLog: () => {} }));

vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class {
    invoke(messages: any[]) {
      const hasSystem = Array.isArray(messages) && messages.some((m) => m?.role === "system");
      if (!hasSystem) return { content: "" };
      return { content: "" };
    }
  },
}));

vi.mock("@/lib/poi/searchEvents", () => ({
  searchEvents: vi.fn(async () => []),
}));

vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(async () => ({ timezone: "America/Montevideo", city: "Punta del Este" })),
}));

import { retrievalBased } from "@/lib/agents/retrieval_based";

describe("events no-events fallback", () => {
  it("uses template fallback text when no events", async () => {
    const prev = process.env.DEBUG_ROUTING;
    process.env.DEBUG_ROUTING = "1";
    const res = await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events",
      category: "retrieval_based",
      normalizedMessage: "eventos este fin de semana",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("eventos este fin de semana")],
    } as any);

    const msg = String(res?.messages?.[res.messages.length - 1]?.content || "");
    expect(msg).toMatch(/fuentes actualizadas/i);
    const tail = msg.split(/\n\nEventos:\n/).slice(1).join("\n\nEventos:\n");
    expect(tail).not.toMatch(/2026|\b(feb|ene|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)\b/i);
    expect(msg).not.toMatch(/\?\s*$/);
    expect(res?.meta?.debug?.intentGroup).toBe("events");
    expect(res?.meta?.debug?.carouselCount ?? 0).toBe(0);
    process.env.DEBUG_ROUTING = prev;
  });

  it("does not inject Punta del Este when hotel config is different", async () => {
    const prev = process.env.DEBUG_ROUTING;
    process.env.DEBUG_ROUTING = "1";
    const { getHotelConfig } = await import("@/lib/config/hotelConfig.server");
    (getHotelConfig as any).mockResolvedValueOnce({
      timezone: "America/Montevideo",
      city: "Piriápolis",
      country: "Uruguay",
    });
    const res = await retrievalBased({
      hotelId: "hotel999",
      promptKey: "tourist_events",
      category: "retrieval_based",
      normalizedMessage: "eventos este fin de semana",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("eventos este fin de semana")],
    } as any);
    const msg = String(res?.messages?.[res.messages.length - 1]?.content || "");
    expect(msg).not.toMatch(/Punta del Este/i);
    expect(msg).not.toMatch(/\?\s*$/);
    expect(res?.meta?.debug?.intentGroup).toBe("events");
    expect(res?.meta?.debug?.carouselCount ?? 0).toBe(0);
    process.env.DEBUG_ROUTING = prev;
  });
});
