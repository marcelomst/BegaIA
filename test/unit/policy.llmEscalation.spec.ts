import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/agents/helpers", () => ({
  heuristicClassify: vi.fn(),
  looksLikeName: vi.fn(() => false),
  looksRoomInfo: vi.fn(() => false),
  pickNearbyPromptKey: vi.fn(() => undefined),
}));

vi.mock("@/lib/classifier", () => ({
  classifyQuery: vi.fn(),
  isPureGreeting: vi.fn(() => false),
}));

vi.mock("@/lib/utils/debugLog", () => ({
  debugLog: vi.fn(),
}));

import { heuristicClassify } from "@/lib/agents/helpers";
import { evaluateGraphRoutingPolicy } from "@/lib/agents/classify/policy";
import { classifyQuery } from "@/lib/classifier";
import { debugLog } from "@/lib/utils/debugLog";

describe("policy llm escalation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("escala al classifier cuando la heuristica cae por debajo del umbral", async () => {
    vi.mocked(heuristicClassify).mockReturnValue({
      category: "support",
      desiredAction: undefined,
      intentConfidence: 0.4,
      intentSource: "heuristic",
    });
    vi.mocked(classifyQuery).mockResolvedValue({
      category: "support",
      promptKey: "contact_support",
    });

    const res = await evaluateGraphRoutingPolicy({
      state: {
        normalizedMessage: "no se bien que necesito pero tengo un problema",
        reservationSlots: {},
        meta: {},
        category: "other",
        hotelId: "hotel999",
        conversationId: "c1",
      },
      persistedConvState: null,
      debugRouting: true,
      forceLlmClassifier: false,
    });

    expect(classifyQuery).toHaveBeenCalledWith("no se bien que necesito pero tengo un problema", "hotel999");
    expect(res.meta?.debug?.route_source).toBe("llm_classifier");
    expect(debugLog).toHaveBeenCalledWith(
      "[routing][llm_escalation_policy]",
      expect.objectContaining({
        event: "decision",
        should_escalate: true,
        classifier_source: "llm",
        escalation_signal: "LOW_HEURISTIC_CONFIDENCE",
        escalation_reason: "heuristic_confidence_below_threshold",
        heuristic_confidence: 0.4,
        heuristic_category: "support",
      })
    );
    expect(debugLog).toHaveBeenCalledWith(
      "[routing][llm_escalation_policy]",
      expect.objectContaining({
        event: "result",
        should_escalate: true,
        classifier_source: "llm",
        category: "retrieval_based",
        promptKey: "contact_support",
        intentSource: "llm",
      })
    );
  });

  it("deja evidencia explicita cuando no escala y conserva la heuristica", async () => {
    vi.mocked(heuristicClassify).mockReturnValue({
      category: "reservation",
      desiredAction: "create",
      intentConfidence: 0.99,
      intentSource: "heuristic",
    });

    const res = await evaluateGraphRoutingPolicy({
      state: {
        normalizedMessage: "quiero reservar una habitación doble",
        reservationSlots: {},
        meta: {},
        category: "other",
        hotelId: "hotel999",
        conversationId: "c2",
      },
      persistedConvState: null,
      debugRouting: true,
      forceLlmClassifier: false,
    });

    expect(classifyQuery).not.toHaveBeenCalled();
    expect(res.category).toBe("reservation");
    expect(String(res.promptKey || "")).toBe("reservation_flow");
    expect(debugLog).toHaveBeenCalledWith(
      "[routing][llm_escalation_policy]",
      expect.objectContaining({
        event: "decision",
        should_escalate: false,
        classifier_source: "heuristic",
        escalation_signal: "NONE",
        escalation_reason: "heuristic_confidence_sufficient",
        heuristic_confidence: 0.99,
        heuristic_category: "reservation",
        heuristic_promptKey: "reservation_flow",
      })
    );
  });
});
