import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/agents/nodes/reservationSnapshot", () => ({ handleReservationSnapshotNode: vi.fn() }));
vi.mock("@/lib/agents/nodes/reservationVerify", () => ({ handleReservationVerifyNode: vi.fn() }));
vi.mock("@/lib/agents/nodes/amenities", () => ({ handleAmenitiesNode: vi.fn() }));
vi.mock("@/lib/agents/nodes/billing", () => ({ handleBillingNode: vi.fn() }));
vi.mock("@/lib/agents/nodes/support", () => ({ handleSupportNode: vi.fn() }));
vi.mock("@/lib/agents/nodes/retrieval", () => ({ retrievalBasedNode: vi.fn() }));
vi.mock("@/lib/agents/nodes", () => ({ handleReservationNode: vi.fn() }));
vi.mock("@/lib/agents/nodes/cancelReservation", () => ({ handleCancelReservationNode: vi.fn() }));
vi.mock("@/lib/agents/nodes/reservationModify", () => ({
  askModifyFieldNode: vi.fn(),
  askNewValueNode: vi.fn(),
  confirmModificationNode: vi.fn(),
}));
vi.mock("@/lib/db/convState", () => ({ getConvState: vi.fn() }));
vi.mock("@/lib/classifier", () => ({ classifyQuery: vi.fn() }));
vi.mock("@/lib/utils/debugLog", () => ({ debugLog: vi.fn() }));

import { classifyNode } from "@/lib/agents/graph";

describe("classifyNode routing debug", () => {
  beforeEach(() => {
    process.env.DEBUG_ROUTING = "1";
  });

  it("routes EN things_to_do with images and emits heuristic_things_to_do debug", async () => {
    const res = await classifyNode({
      normalizedMessage: "nightlife plans with photos",
      originalLang: "en",
      detectedLanguage: "en",
      category: "other",
      promptKey: undefined,
      reservationSlots: {},
      meta: {},
      messages: [],
      hotelId: "hotel999",
      conversationId: "c1",
    } as any);

    expect(res.category).toBe("retrieval_based");
    expect(res.promptKey).toBe("things_to_do_en_img");
    expect(res.meta?.debug?.route_source).toBe("heuristic_things_to_do");
  });

  it("routes explicit events and emits heuristic_events debug", async () => {
    const res = await classifyNode({
      normalizedMessage: "agenda de eventos hoy en punta del este",
      originalLang: "es",
      detectedLanguage: "es",
      category: "other",
      promptKey: undefined,
      reservationSlots: {},
      meta: {},
      messages: [],
      hotelId: "hotel999",
      conversationId: "c1",
    } as any);

    expect(res.category).toBe("retrieval_based");
    expect(res.promptKey).toBe("tourist_events");
    expect(res.meta?.debug?.route_source).toBe("heuristic_events");
  });

  it("prioritizes nearby routing over things_to_do when location-nearby signal is present", async () => {
    const res = await classifyNode({
      normalizedMessage: "puntos cercanos, qué hay para hacer con fotos en parada 5 playa mansa",
      originalLang: "es",
      detectedLanguage: "es",
      category: "other",
      promptKey: undefined,
      reservationSlots: {},
      meta: {},
      messages: [],
      hotelId: "hotel999",
      conversationId: "c1",
    } as any);

    expect(res.category).toBe("retrieval_based");
    expect(String(res.promptKey || "")).toMatch(/^nearby_points/);
    expect(res.meta?.debug?.route_source).toBe("heuristic_nearby");
  });

  it("routes seasonal non-event queries to things_to_do", async () => {
    const res = await classifyNode({
      normalizedMessage: "que se puede hacer este mes en punta del este",
      originalLang: "es",
      detectedLanguage: "es",
      category: "other",
      promptKey: undefined,
      reservationSlots: {},
      meta: {},
      messages: [],
      hotelId: "hotel999",
      conversationId: "c1",
    } as any);

    expect(res.category).toBe("retrieval_based");
    expect(String(res.promptKey || "")).toMatch(/^things_to_do/);
    expect(res.meta?.debug?.route_source).toBe("heuristic_things_to_do");
  });

  it("routes explicit events even with seasonal phrasing", async () => {
    const res = await classifyNode({
      normalizedMessage: "eventos este mes en punta del este",
      originalLang: "es",
      detectedLanguage: "es",
      category: "other",
      promptKey: undefined,
      reservationSlots: {},
      meta: {},
      messages: [],
      hotelId: "hotel999",
      conversationId: "c1",
    } as any);

    expect(res.category).toBe("retrieval_based");
    expect(String(res.promptKey || "")).toBe("tourist_events");
    expect(res.meta?.debug?.route_source).toBe("heuristic_events");
  });

  it("prioritizes reservation availability over weekend events phrasing", async () => {
    const res = await classifyNode({
      normalizedMessage: "quiero consultar disponibilidad para este fin de semana",
      originalLang: "es",
      detectedLanguage: "es",
      category: "other",
      promptKey: undefined,
      reservationSlots: {},
      meta: {},
      messages: [],
      hotelId: "hotel999",
      conversationId: "c1",
    } as any);

    expect(res.category).toBe("reservation");
    expect(String(res.promptKey || "")).toBe("reservation_flow");
  });
});
