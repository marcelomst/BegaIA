import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StableIntentGuardResult } from "@/lib/handlers/pipeline/stableIntentsGuard";

const { runStableIntentsGuardMock } = vi.hoisted(() => ({
  runStableIntentsGuardMock: vi.fn<() => Promise<StableIntentGuardResult>>(async () => ({
    matched: false,
    normalizedQuery: "",
    routingDecision: "no_match",
    hotelPolicyApplied: false,
  })),
}));

vi.mock("@/lib/db/messages", () => ({
  saveChannelMessageToAstra: vi.fn(async () => {}),
  getMessagesByConversation: vi.fn(async () => []),
}));
vi.mock("@/lib/db/conversations", () => ({
  getOrCreateConversation: vi.fn(async () => {}),
  appendConversationReplyTrace: vi.fn(async () => {}),
}));
vi.mock("@/lib/db/guests", () => ({
  getGuest: vi.fn(async () => null),
  createGuest: vi.fn(async () => {}),
  updateGuest: vi.fn(async () => {}),
}));
vi.mock("@/lib/db/convState", () => ({
  getConvState: vi.fn(async () => null),
  upsertConvState: vi.fn(async () => {}),
  CONVSTATE_VERSION: "test",
}));
vi.mock("@/lib/handlers/pipeline/availability", () => ({
  runAvailabilityCheck: vi.fn(async () => ({ finalText: "Disponibilidad OK", nextSlots: {}, needsHandoff: false })),
  isoToDDMMYYYY: (s: string) => s,
  getProposedAvailabilityRange: () => ({}),
  detectDateSideFromText: () => null,
  getLastUserDatesFromHistory: () => ({}),
  buildAskMissingDate: () => "¿Fecha faltante?",
  buildAskNewDates: () => "¿Nuevas fechas?",
  buildAskGuests: () => "¿Cantidad de huéspedes?",
  buildAskGuestName: () => "¿Nombre del huésped?",
  chooseRoomTypeForGuests: (rt: string | undefined) => ({ target: rt || "double", changed: false }),
  isAskAvailabilityStatusQuery: () => false,
  askedToVerifyAvailability: () => false,
  isPureConfirm: () => false,
  normalizeReservationIntent: () => ({ kind: "other", executable: false, normalizedText: "" }),
  detectLateCheckoutQuestion: () => false,
  detectCheckinOrCheckoutTimeQuestion: () => null,
  buildLateCheckoutResponse: () => "Late checkout sujeto a disponibilidad.",
  isPureAffirmative: () => false,
  askedToConfirmCheckTime: () => null,
}));
vi.mock("@/lib/agents/knowledgeBaseAgent", () => ({
  answerWithKnowledge: vi.fn(),
}));
vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: vi.fn(),
  },
}));
vi.mock("@/lib/prompts", () => ({
  defaultPrompt: "{{retrieved}}",
  curatedPrompts: {},
}));
vi.mock("@/lib/web/eventBus", () => ({ emitToConversation: vi.fn(() => {}) }));
vi.mock("@/lib/utils/debugLog", () => ({ debugLog: vi.fn() }));
vi.mock("@/lib/handlers/pipeline/stableIntentsGuard", () => ({
  runStableIntentsGuard: runStableIntentsGuardMock,
}));
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class { constructor(_c: any) {} async invoke() { return { content: "Respuesta base" }; } },
}));

import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import { answerWithKnowledge } from "@/lib/agents/knowledgeBaseAgent";
import { agentGraph } from "@/lib/agents";
import { debugLog } from "@/lib/utils/debugLog";

describe("messageHandler routing observability baseline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runStableIntentsGuardMock.mockResolvedValue({
      matched: false,
      normalizedQuery: "",
      routingDecision: "no_match",
      hotelPolicyApplied: false,
    });
  });

  it("loggea telemetría compacta cuando stable intent es servido", async () => {
    runStableIntentsGuardMock.mockResolvedValueOnce({
      matched: true,
      intentKey: "faq_wifi",
      detectedIntentKey: "faq_wifi",
      normalizedQuery: "wifi",
      response: "Wi-Fi gratis en todo el hotel.",
      routingDecision: "served",
      hotelPolicyApplied: true,
      policyEnabled: true,
      policySource: "hotel_config.semanticPolicy.stableIntents",
      responseSource: "amenities.wifiNotes",
    });

    await handleIncomingMessage({
      messageId: "obs-stable-served-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "wifi?",
      timestamp: new Date().toISOString(),
      conversationId: "conv-obs-stable-served-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply: vi.fn(async () => {}) });

    expect(debugLog).toHaveBeenCalledWith(
      "[routing][stable_intents_guard]",
      expect.objectContaining({
        routing_stage: "stable_intents_guard",
        routing_decision: "served",
        matched: true,
        matched_intent: "faq_wifi",
        hotel_policy_applied: true,
        policy_enabled: true,
        policy_source: "hotel_config.semanticPolicy.stableIntents",
        response_source: "amenities.wifiNotes",
      })
    );
    expect(debugLog).toHaveBeenCalledWith(
      "[routing][decision]",
      expect.objectContaining({
        decision_layer: "stable_intents_guard",
        route_source: "stable_intents_guard",
        route_match: "faq_wifi",
        early_return: true,
        used_llm_classifier: false,
        classifier_source: "heuristic",
        final_category: "amenities_info",
      })
    );
  });

  it("loggea stable intent bloqueado por policy y luego fallback al pipeline normal", async () => {
    runStableIntentsGuardMock.mockResolvedValueOnce({
      matched: false,
      detectedIntentKey: "faq_wifi",
      normalizedQuery: "wifi",
      routingDecision: "blocked_by_policy",
      hotelPolicyApplied: true,
      policyEnabled: false,
      policySource: "hotel_config.semanticPolicy.stableIntents",
      responseSource: "amenities.wifiNotes",
    });
    vi.mocked(answerWithKnowledge).mockResolvedValue({
      ok: true,
      category: "retrieval_based",
      promptKey: "kb_general",
      answer: "Contenido KB general",
      contentTitle: "KB",
      contentBody: "Body",
      retrieved: [],
      debug: {},
    } as any);

    await handleIncomingMessage({
      messageId: "obs-stable-blocked-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "wifi?",
      timestamp: new Date().toISOString(),
      conversationId: "conv-obs-stable-blocked-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply: vi.fn(async () => {}) });

    expect(debugLog).toHaveBeenCalledWith(
      "[routing][stable_intents_guard]",
      expect.objectContaining({
        routing_stage: "stable_intents_guard",
        routing_decision: "blocked_by_policy",
        matched: false,
        matched_intent: "faq_wifi",
        hotel_policy_applied: true,
        policy_enabled: false,
      })
    );
    expect(debugLog).toHaveBeenCalledWith(
      "[routing][decision]",
      expect.objectContaining({
        decision_layer: "bodyLLM",
        route_source: "knowledgeBaseAgent",
        route_match: "safe_kb_fastpath",
        early_return: true,
      })
    );
  });

  it("loggea decisión homogénea para fast-path de KB", async () => {
    vi.mocked(answerWithKnowledge).mockResolvedValue({
      ok: true,
      category: "retrieval_based",
      promptKey: "amenities_list",
      answer: "Tenemos piscina y desayuno.",
      contentTitle: "Amenities",
      contentBody: "Body",
      retrieved: [],
      debug: {},
    } as any);

    await handleIncomingMessage({
      messageId: "obs-kb-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "¿Tienen piscina?",
      timestamp: new Date().toISOString(),
      conversationId: "conv-obs-kb-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply: vi.fn(async () => {}) });

    expect(debugLog).toHaveBeenCalledWith(
      "[routing][decision]",
      expect.objectContaining({
        decision_layer: "bodyLLM",
        route_source: "knowledgeBaseAgent",
        route_match: "safe_kb_fastpath",
        early_return: true,
        used_llm_classifier: false,
        classifier_source: "heuristic",
        final_category: "retrieval_based",
        final_prompt_key: "amenities_list",
      })
    );
  });

  it("loggea no-match del stable guard antes de caer al flujo normal", async () => {
    vi.mocked(answerWithKnowledge).mockResolvedValue({
      ok: true,
      category: "retrieval_based",
      promptKey: "amenities_list",
      answer: "Tenemos piscina y desayuno.",
      contentTitle: "Amenities",
      contentBody: "Body",
      retrieved: [],
      debug: {},
    } as any);

    await handleIncomingMessage({
      messageId: "obs-stable-no-match-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "¿Tienen piscina?",
      timestamp: new Date().toISOString(),
      conversationId: "conv-obs-stable-no-match-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply: vi.fn(async () => {}) });

    expect(debugLog).toHaveBeenCalledWith(
      "[routing][stable_intents_guard]",
      expect.objectContaining({
        routing_stage: "stable_intents_guard",
        routing_decision: "no_match",
        matched: false,
        matched_intent: null,
        hotel_policy_applied: false,
      })
    );
  });

  it("loggea decisión homogénea para ruta del grafo con classifier forzado", async () => {
    vi.mocked(answerWithKnowledge).mockResolvedValue({
      ok: false,
      category: "retrieval_based",
      answer: "",
    } as any);
    vi.mocked(agentGraph.invoke).mockResolvedValue({
      messages: [{ role: "assistant", content: "¿Cuál es la fecha de check-in?" }],
      category: "reservation",
      promptKey: "reservation_flow",
      intentSource: "llm",
      reservationSlots: { roomType: "double" },
      meta: {
        debug: {
          route_source: "forced_llm_classifier",
          route_match: "FORCE_LLM_CLASSIFIER",
        },
      },
    } as any);

    await handleIncomingMessage({
      messageId: "obs-graph-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "Quiero consultar disponibilidad para una habitación doble",
      timestamp: new Date().toISOString(),
      conversationId: "conv-obs-graph-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply: vi.fn(async () => {}) });

    expect(debugLog).toHaveBeenCalledWith(
      "[routing][decision]",
      expect.objectContaining({
        decision_layer: "graph",
        route_source: "forced_llm_classifier",
        route_match: "FORCE_LLM_CLASSIFIER",
        early_return: false,
        used_llm_classifier: true,
        classifier_source: "forced_llm",
        final_category: "reservation",
        final_prompt_key: "reservation_flow",
      })
    );
  });
});
