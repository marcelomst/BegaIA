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
        heuristic_role: "proposal",
        classifier_role: "correction_or_confirmation",
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
        heuristic_role: "proposal",
        classifier_role: "correction_or_confirmation",
        classifier_source: "llm",
        category: "retrieval_based",
        promptKey: "contact_support",
        intentSource: "llm",
      })
    );
    expect(debugLog).toHaveBeenCalledWith(
      "[routing][prompt_resolution]",
      expect.objectContaining({
        category: "support",
        desiredAction: undefined,
        resolution_source: "policy_prompt_resolver",
        resolved_prompt_key: "ambiguity_policy",
      })
    );
    expect(debugLog).toHaveBeenCalledWith(
      "[routing][prompt_resolution]",
      expect.objectContaining({
        category: "retrieval_based",
        desiredAction: undefined,
        resolution_source: "explicit_prompt_key",
        explicit_prompt_key: "contact_support",
        resolved_prompt_key: "contact_support",
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
        heuristic_role: "strong_signal",
        classifier_role: "not_used",
        classifier_source: "heuristic",
        escalation_signal: "NONE",
        escalation_reason: "heuristic_confidence_sufficient",
        heuristic_confidence: 0.99,
        heuristic_category: "reservation",
        heuristic_promptKey: "reservation_flow",
      })
    );
    expect(debugLog).toHaveBeenCalledWith(
      "[routing][prompt_resolution]",
      expect.objectContaining({
        category: "reservation",
        desiredAction: "create",
        resolution_source: "policy_prompt_resolver",
        resolved_prompt_key: "reservation_flow",
      })
    );
  });

  it("trata retrieval ambiguo como propuesta heuristica y escala para confirmar o corregir", async () => {
    vi.mocked(heuristicClassify).mockReturnValue({
      category: "retrieval_based",
      desiredAction: undefined,
      intentConfidence: 0.82,
      intentSource: "heuristic",
    });
    vi.mocked(classifyQuery).mockResolvedValue({
      category: "reservation",
      promptKey: "reservation_flow",
    });

    const res = await evaluateGraphRoutingPolicy({
      state: {
        normalizedMessage: "quisiera saber algo sobre opciones para alojarme",
        reservationSlots: {},
        meta: {},
        category: "other",
        hotelId: "hotel999",
        conversationId: "c3",
      },
      persistedConvState: null,
      debugRouting: true,
      forceLlmClassifier: false,
    });

    expect(classifyQuery).toHaveBeenCalledWith("quisiera saber algo sobre opciones para alojarme", "hotel999");
    expect(res.meta?.debug?.route_source).toBe("llm_classifier");
    expect(debugLog).toHaveBeenCalledWith(
      "[routing][llm_escalation_policy]",
      expect.objectContaining({
        event: "decision",
        should_escalate: true,
        heuristic_role: "proposal",
        classifier_role: "correction_or_confirmation",
        classifier_source: "llm",
        escalation_signal: "AMBIGUOUS_HEURISTIC_PROPOSAL",
        escalation_reason: "heuristic_generic_retrieval_requires_confirmation",
        heuristic_confidence: 0.82,
        heuristic_category: "retrieval_based",
        heuristic_promptKey: "ambiguity_policy",
      })
    );
  });

  it.each([
    "quiero saber si puedo modificar",
    "antes de modificar, ¿me recordás el precio?",
    "quiero cambiar si hay lugar",
  ])("en salesStage close no promueve desiredAction modify para consulta no ejecutable: %s", async (text) => {
    vi.mocked(heuristicClassify).mockReturnValue({
      category: "retrieval_based",
      desiredAction: undefined,
      intentConfidence: 0.99,
      intentSource: "heuristic",
    });

    const res = await evaluateGraphRoutingPolicy({
      state: {
        normalizedMessage: text,
        reservationSlots: {},
        meta: {},
        category: "other",
        hotelId: "hotel999",
        conversationId: "c-close-modify-inquiry",
        salesStage: "close",
      },
      persistedConvState: {
        salesStage: "close",
        conversationStage: "reservation_confirmed",
      },
      debugRouting: true,
      forceLlmClassifier: false,
    });

    expect(res.category).not.toBe("reservation");
    expect(res.desiredAction).toBeUndefined();
    expect(res.promptKey).not.toBe("modify_reservation");
  });

  it("en salesStage close mantiene modify ejecutable para 'quiero modificar la segunda reserva'", async () => {
    vi.mocked(heuristicClassify).mockReturnValue({
      category: "retrieval_based",
      desiredAction: undefined,
      intentConfidence: 0.99,
      intentSource: "heuristic",
    });

    const res = await evaluateGraphRoutingPolicy({
      state: {
        normalizedMessage: "quiero modificar la segunda reserva",
        reservationSlots: {},
        meta: {},
        category: "other",
        hotelId: "hotel999",
        conversationId: "c-close-modify-exec",
        salesStage: "close",
      },
      persistedConvState: {
        salesStage: "close",
        conversationStage: "reservation_confirmed",
      },
      debugRouting: true,
      forceLlmClassifier: false,
    });

    expect(res.category).toBe("reservation");
    expect(res.desiredAction).toBe("modify");
    expect(res.promptKey).toBe("modify_reservation");
  });
});
