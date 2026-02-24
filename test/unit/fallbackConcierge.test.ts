import { describe, it, expect, vi } from "vitest";
import { HumanMessage } from "@langchain/core/messages";

vi.mock("@/lib/utils/debugLog", () => ({ debugLog: () => {} }));

let mockContent = [
  "Edificio Isla de Gorriti",
  "Parada 25 - Playa Mansa",
  "Playa Parada 16",
  "- Parada 25 - Playa Mansa",
  "BUS - (0066)",
  "Rango: 4 feb 2026 00:00–11 feb 2026 23:59",
  "Ciudad: Punta del Este",
  "Search query: actividades punta del este",
  "• Playa y caminatas costeras",
  "1. Miradores al atardecer",
  "Circuito gastronómico local",
  "- Compras y paseo por zonas comerciales",
];

let lastSystemPrompt = "";
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class {
    invoke(messages: any[]) {
      const hasSystem = Array.isArray(messages) && messages.some((m) => m?.role === "system");
      const systemMsg = Array.isArray(messages) ? messages.find((m) => m?.role === "system") : null;
      lastSystemPrompt = systemMsg?.content ?? "";
      if (!hasSystem) return { content: "Lamentablemente, no tengo información específica." };
      return { content: mockContent.join("\n") };
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
import { getHotelConfig } from "@/lib/config/hotelConfig.server";

describe("fallback concierge when retrieval is empty", () => {
  it("returns general recommendations and an affinity question", async () => {
    (getHotelConfig as any).mockResolvedValueOnce({
      timezone: "America/Montevideo",
      city: "Punta del Este",
      country: "Uruguay",
    });
    const res = await retrievalBased({
      hotelId: "hotel999",
      promptKey: undefined,
      category: "retrieval_based",
      normalizedMessage: "que se puede hacer en punta del este en este mes como diversion",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("que se puede hacer en punta del este en este mes como diversion")],
    } as any);

    const msg = String(res?.messages?.[res.messages.length - 1]?.content || "");
    expect(msg).not.toMatch(/lamentablemente/i);
    expect(msg).not.toMatch(/no tengo información específica/i);
    expect(msg).not.toMatch(/•/);
    expect(msg).not.toMatch(/\n\s*\d+\./);
    expect(msg).toMatch(/(^|\n)BUS - \(0066\)/);
    expect(msg).toMatch(/(^|\n)Rango: 4 feb 2026 00:00–11 feb 2026 23:59/);
    expect(msg).toMatch(/(^|\n)Ciudad: Punta del Este/);
    expect(msg).toMatch(/(^|\n)Search query: actividades punta del este/);
    expect(msg).toMatch(/(^|\n)Edificio Isla de Gorriti/);
    expect(msg).toMatch(/(^|\n)Parada 25 - Playa Mansa/);
    expect(msg).toMatch(/(^|\n)Playa Parada 16/);
    expect(msg).not.toMatch(/(^|\n)-\s+BUS - \(0066\)/);
    expect(msg).not.toMatch(/(^|\n)-\s+Rango: 4 feb 2026 00:00–11 feb 2026 23:59/);
    expect(msg).not.toMatch(/(^|\n)-\s+Ciudad: Punta del Este/);
    expect(msg).not.toMatch(/(^|\n)-\s+Search query: actividades punta del este/);
    expect(msg).not.toMatch(/(^|\n)-\s+Edificio Isla de Gorriti/);
    expect(msg).not.toMatch(/(^|\n)-\s+Parada 25 - Playa Mansa/);
    expect(msg).not.toMatch(/(^|\n)-\s+Playa Parada 16/);
    const bulletCount = (msg.match(/(^|\n)\s*-\s+/g) || []).length;
    expect(bulletCount).toBeGreaterThanOrEqual(3);
    expect(msg).toContain("?");
    expect(msg.trim().endsWith("?")).toBe(true);
    expect(bulletCount).toBeLessThanOrEqual(8);
  });

  it("does not inject Punta del Este when hotel config is different", async () => {
    mockContent = [
      "• Playa y caminatas costeras",
      "1. Miradores al atardecer",
      "Circuito gastronómico local",
    ];
    (getHotelConfig as any).mockResolvedValueOnce({
      timezone: "America/Montevideo",
      city: "Piriápolis",
      country: "Uruguay",
    });
    const res = await retrievalBased({
      hotelId: "hotel999",
      promptKey: undefined,
      category: "retrieval_based",
      normalizedMessage: "¿Qué se puede hacer este mes?",
      retrievalLang: "es",
      originalLang: "es",
      messages: [new HumanMessage("¿Qué se puede hacer este mes?")],
    } as any);
    const msg = String(res?.messages?.[res.messages.length - 1]?.content || "");
    expect(msg).not.toMatch(/Punta del Este/i);
    expect(lastSystemPrompt).toMatch(/Ubicación: Piriápolis,\s*Uruguay/i);
  });
});
