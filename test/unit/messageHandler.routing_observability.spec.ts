import { beforeEach, describe, expect, it, vi } from "vitest";

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
  detectCheckinOrCheckoutTimeQuestion: () => null,
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
        final_promptKey: "amenities_list",
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
        final_promptKey: "reservation_flow",
      })
    );
  });
});
