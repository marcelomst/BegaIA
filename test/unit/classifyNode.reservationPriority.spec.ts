import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/agents/helpers", () => ({
  heuristicClassify: vi.fn(() => ({
    category: "reservation",
    desiredAction: "create",
    intentConfidence: 0.99,
    intentSource: "heuristic",
  })),
  looksRoomInfo: vi.fn(() => false),
  pickNearbyPromptKey: vi.fn(() => undefined),
}));

vi.mock("@/lib/classifier", () => ({
  classifyQuery: vi.fn(),
}));

vi.mock("@/lib/utils/debugLog", () => ({
  debugLog: vi.fn(),
}));

import { classifyNode } from "@/lib/agents/classifyNode";

describe("classifyNode reservation priority", () => {
  it("does not hijack availability weekend query into tourist_events", async () => {
    const res = await classifyNode({
      normalizedMessage: "quiero consultar disponibilidad para este fin de semana",
      reservationSlots: {},
      meta: {},
      category: "other",
      hotelId: "hotel999",
    } as any);

    expect(res.category).toBe("reservation");
    expect(String(res.promptKey || "")).toBe("reservation_flow");
  });
});
