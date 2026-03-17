import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
import { classifyQuery } from "@/lib/classifier";
import { debugLog } from "@/lib/utils/debugLog";

describe("classifyNode routing debug", () => {
  const prevDebugRouting = process.env.DEBUG_ROUTING;
  const prevForceLlmClassifier = process.env.FORCE_LLM_CLASSIFIER;

  beforeEach(() => {
    process.env.DEBUG_ROUTING = "1";
    delete process.env.FORCE_LLM_CLASSIFIER;
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (prevDebugRouting === undefined) delete process.env.DEBUG_ROUTING;
    else process.env.DEBUG_ROUTING = prevDebugRouting;

    if (prevForceLlmClassifier === undefined) delete process.env.FORCE_LLM_CLASSIFIER;
    else process.env.FORCE_LLM_CLASSIFIER = prevForceLlmClassifier;
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

  it("uses forced LLM classifier branch when flag is enabled", async () => {
    process.env.FORCE_LLM_CLASSIFIER = "1";
    vi.mocked(classifyQuery).mockResolvedValue({
      category: "support",
      promptKey: "contact_support",
    });

    const res = await classifyNode({
      normalizedMessage: "necesito ayuda con un problema",
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

    expect(classifyQuery).toHaveBeenCalled();
    expect(res.category).toBe("support");
    expect(String(res.promptKey || "")).toBe("contact_support");
    expect(res.meta?.debug?.route_source).toBe("forced_llm_classifier");
    expect(res.meta?.debug?.route_match).toBe("FORCE_LLM_CLASSIFIER");
    expect(debugLog).toHaveBeenCalledWith(
      "[routing][forced_llm_classifier]",
      expect.objectContaining({
        event: "attempt",
        route_source: "forced_llm_classifier",
        route_match: "FORCE_LLM_CLASSIFIER",
      })
    );
    expect(debugLog).toHaveBeenCalledWith(
      "[routing][forced_llm_classifier]",
      expect.objectContaining({
        event: "result",
        route_source: "forced_llm_classifier",
        route_match: "FORCE_LLM_CLASSIFIER",
        category: "support",
        promptKey: "contact_support",
      })
    );
  });

  it("falls back to heuristic when forced LLM classifier fails", async () => {
    process.env.FORCE_LLM_CLASSIFIER = "true";
    vi.mocked(classifyQuery).mockRejectedValue(new Error("llm-down"));

    const res = await classifyNode({
      normalizedMessage: "quiero reservar una habitación doble",
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

    expect(classifyQuery).toHaveBeenCalled();
    expect(res.category).toBe("reservation");
    expect(String(res.promptKey || "")).toBe("reservation_flow");
    expect(debugLog).toHaveBeenCalledWith(
      "[routing][forced_llm_classifier]",
      expect.objectContaining({
        event: "fallback",
        route_source: "forced_llm_classifier_fallback",
        route_match: "FORCE_LLM_CLASSIFIER",
        error: "llm-down",
      })
    );
  });

  it("logs guardrail preemption when force flag is enabled but a prior route resolves first", async () => {
    process.env.FORCE_LLM_CLASSIFIER = "1";

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

    expect(classifyQuery).not.toHaveBeenCalled();
    expect(res.category).toBe("retrieval_based");
    expect(String(res.promptKey || "")).toBe("tourist_events");
    expect(debugLog).toHaveBeenCalledWith(
      "[routing][forced_llm_classifier]",
      expect.objectContaining({
        event: "guardrail_preempted",
        route_source: "forced_llm_classifier_guardrail",
        route_match: "FORCE_LLM_CLASSIFIER",
        route_guardrail_preempted: true,
        guardrail_route_source: "heuristic_events",
        guardrail_route_match: "wantsEvents",
        category: "retrieval_based",
        promptKey: "tourist_events",
      })
    );
  });
});
