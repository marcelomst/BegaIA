import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StableIntentGuardResult } from "@/lib/handlers/pipeline/stableIntentsGuard";

const { runStableIntentsGuardMock, recentMessages } = vi.hoisted(() => ({
  runStableIntentsGuardMock: vi.fn<() => Promise<StableIntentGuardResult>>(async () => ({
    matched: false,
    normalizedQuery: "",
    routingDecision: "no_match",
    hotelPolicyApplied: false,
  })),
  recentMessages: [] as any[],
}));

vi.mock("@/lib/db/messages", () => ({
  saveChannelMessageToAstra: vi.fn(async () => {}),
  getMessagesByConversation: vi.fn(async ({ hotelId, conversationId }: any) =>
    recentMessages.filter((message) =>
      message.hotelId === hotelId && message.conversationId === conversationId
    )
  ),
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
  resolveGuestState: vi.fn(() => undefined),
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
  detectEarlyCheckinQuestion: () => false,
  detectCheckinOrCheckoutTimeQuestion: () => null,
  buildLateCheckoutResponse: () => "Late checkout sujeto a disponibilidad.",
  buildEarlyCheckinResponse: () => "El early check-in esta sujeto a disponibilidad.",
  isPureAffirmative: () => false,
  askedToConfirmCheckTime: () => null,
}));
vi.mock("@/lib/agents/knowledgeBaseAgent", () => ({
  answerWithKnowledge: vi.fn(),
}));
vi.mock("@/lib/agents/retrieval_based", () => ({
  retrievalBased: vi.fn(),
}));
vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: vi.fn(),
  },
}));
vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(async () => ({
    hotelId: "hotel999",
    defaultLanguage: "es",
    rooms: [
      {
        name: "Doble",
        images: [{ url: "https://cdn.example.com/doble.jpg" }],
      },
    ],
  })),
}));
vi.mock("@/lib/categories/resolveCategory", () => ({
  resolveCategoryForHotel: vi.fn(async () => ({ content: undefined })),
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
import { retrievalBased } from "@/lib/agents/retrieval_based";
import { agentGraph } from "@/lib/agents";
import { debugLog } from "@/lib/utils/debugLog";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { resolveCategoryForHotel } from "@/lib/categories/resolveCategory";

describe("messageHandler routing observability baseline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recentMessages.length = 0;
    runStableIntentsGuardMock.mockResolvedValue({
      matched: false,
      normalizedQuery: "",
      routingDecision: "no_match",
      hotelPolicyApplied: false,
    });
  });

  it("propaga historial limitado al KB fastpath sólo para una referencia conversacional explícita", async () => {
    const content = "¿Te acordás con quién voy a alojarme?";
    recentMessages.push(
      {
        messageId: "history-human-1",
        hotelId: "hotel999",
        channel: "web",
        conversationId: "conv-recall-1",
        sender: "guest",
        role: "user",
        content: "Estoy pensando alojarme con mi esposa.",
        timestamp: "2026-11-13T10:00:00.000Z",
      },
      {
        messageId: "history-ai-1",
        hotelId: "hotel999",
        channel: "web",
        conversationId: "conv-recall-1",
        sender: "assistant",
        role: "ai",
        content: "Perfecto, ¿en qué puedo ayudarte?",
        timestamp: "2026-11-13T10:01:00.000Z",
      },
      {
        messageId: "history-current-1",
        hotelId: "hotel999",
        channel: "web",
        conversationId: "conv-recall-1",
        sender: "guest",
        role: "user",
        content,
        timestamp: "2026-11-13T10:02:00.000Z",
      },
    );
    vi.mocked(answerWithKnowledge).mockResolvedValue({
      ok: true,
      category: "retrieval_based",
      promptKey: "kb_general",
      answer: "Me comentaste que viajarías con tu esposa.",
      retrieved: [],
      debug: {},
    } as any);
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage({
      messageId: "recall-current-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content,
      timestamp: "2026-11-13T10:02:00.000Z",
      conversationId: "conv-recall-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    const kbArgs = vi.mocked(answerWithKnowledge).mock.calls[0]?.[0] as any;
    expect(kbArgs.conversationHistory).toHaveLength(2);
    expect(kbArgs.conversationHistory.map((message: any) => message._getType())).toEqual(["human", "ai"]);
    expect(kbArgs.conversationHistory[0]?.content).toContain("mi esposa");
    expect(kbArgs.conversationHistory.some((message: any) => message.content === content)).toBe(false);
    expect(sendReply).toHaveBeenCalledWith(expect.stringMatching(/esposa/i));
  });

  it("no propaga historial para una FAQ normal aunque existan turnos anteriores", async () => {
    const content = "¿A qué hora es el check-in?";
    recentMessages.push({
      messageId: "history-faq-1",
      hotelId: "hotel999",
      channel: "web",
      conversationId: "conv-faq-no-history-1",
      sender: "guest",
      role: "user",
      content: "Estoy pensando alojarme con mi esposa.",
      timestamp: "2026-11-13T10:00:00.000Z",
    });
    vi.mocked(answerWithKnowledge).mockResolvedValue({
      ok: true,
      category: "checkin_info",
      promptKey: "checkin_time",
      answer: "El check-in comienza a las 15:00.",
      retrieved: [],
      debug: {},
    } as any);

    await handleIncomingMessage({
      messageId: "faq-current-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content,
      timestamp: "2026-11-13T10:03:00.000Z",
      conversationId: "conv-faq-no-history-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply: vi.fn(async () => {}) });

    expect(vi.mocked(answerWithKnowledge).mock.calls[0]?.[0]).not.toHaveProperty("conversationHistory");
  });

  it("no propaga historial ni inventa acompañante cuando no existe antecedente humano", async () => {
    const content = "¿Te acordás con quién voy a alojarme?";
    recentMessages.push(
      {
        messageId: "history-ai-only-1",
        hotelId: "hotel999",
        channel: "web",
        conversationId: "conv-recall-no-antecedent-1",
        sender: "assistant",
        role: "ai",
        content: "¿En qué puedo ayudarte?",
        timestamp: "2026-11-13T10:00:00.000Z",
      },
      {
        messageId: "history-current-no-antecedent-1",
        hotelId: "hotel999",
        channel: "web",
        conversationId: "conv-recall-no-antecedent-1",
        sender: "guest",
        role: "user",
        content,
        timestamp: "2026-11-13T10:01:00.000Z",
      },
    );
    vi.mocked(answerWithKnowledge).mockResolvedValue({
      ok: true,
      category: "retrieval_based",
      promptKey: "kb_general",
      answer: "No tengo información previa sobre acompañantes.",
      retrieved: [],
      debug: {},
    } as any);
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage({
      messageId: "recall-current-no-antecedent-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content,
      timestamp: "2026-11-13T10:01:00.000Z",
      conversationId: "conv-recall-no-antecedent-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    expect(vi.mocked(answerWithKnowledge).mock.calls[0]?.[0]).not.toHaveProperty("conversationHistory");
    expect(sendReply).toHaveBeenCalledWith(expect.stringMatching(/no tengo información previa/i));
  });

  it.each(["email", "whatsapp"] as const)(
    "limita historial explícito a la misma conversación y canal en %s",
    async (channel) => {
      const content = "¿Te acordás con quién voy a alojarme?";
      const conversationId = `conv-recall-${channel}-1`;
      recentMessages.push(
        {
          messageId: `history-${channel}-same-1`,
          hotelId: "hotel999",
          channel,
          conversationId,
          sender: "guest",
          role: "user",
          content: "Te comenté que viajo con mi esposa.",
          timestamp: "2026-11-13T10:00:00.000Z",
        },
        {
          messageId: `history-${channel}-other-channel-1`,
          hotelId: "hotel999",
          channel: channel === "email" ? "whatsapp" : "email",
          conversationId,
          sender: "guest",
          role: "user",
          content: "Viajo con mi hermano.",
          timestamp: "2026-11-13T10:00:30.000Z",
        },
        {
          messageId: `history-${channel}-other-conversation-1`,
          hotelId: "hotel999",
          channel,
          conversationId: `${conversationId}-other`,
          sender: "guest",
          role: "user",
          content: "Viajo con mi hermana.",
          timestamp: "2026-11-13T10:00:45.000Z",
        },
        {
          messageId: `history-${channel}-current-1`,
          hotelId: "hotel999",
          channel,
          conversationId,
          sender: "guest",
          role: "user",
          content,
          timestamp: "2026-11-13T10:01:00.000Z",
        },
      );
      vi.mocked(answerWithKnowledge).mockResolvedValue({
        ok: true,
        category: "retrieval_based",
        promptKey: "kb_general",
        answer: "Me comentaste que viajarías con tu esposa.",
        retrieved: [],
        debug: {},
      } as any);

      await handleIncomingMessage({
        messageId: `recall-${channel}-current-1`,
        hotelId: "hotel999",
        channel,
        sender: "guest",
        content,
        timestamp: "2026-11-13T10:01:00.000Z",
        conversationId,
        guestId: "g1",
        detectedLanguage: "es",
      } as any, { mode: "automatic", sendReply: vi.fn(async () => {}) });

      const history = (vi.mocked(answerWithKnowledge).mock.calls[0]?.[0] as any).conversationHistory;
      expect(history.map((message: any) => message.content)).toEqual([
        "Te comenté que viajo con mi esposa.",
      ]);
    },
  );

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

  it.each([
    "que aeropuerto hay cerca del hotel",
    "cómo llego desde el aeropuerto al hotel",
    "hay taxi desde el aeropuerto",
    "hay bus desde el aeropuerto",
    "tienen transfer desde el aeropuerto",
    "airport near the hotel",
    "how do I get from the airport",
    "tem transfer do aeroporto",
  ])("prioriza arrivals_transport en el fast-path KB para: %s", async (content) => {
    vi.mocked(answerWithKnowledge).mockResolvedValue({
      ok: true,
      category: "retrieval_based",
      promptKey: "arrivals_transport",
      answer: "Transporte desde el aeropuerto.",
      retrieved: ["PDP 5 km; MVD 120 km; transfer, taxi y bus"],
      debug: {},
    } as any);

    await handleIncomingMessage({
      messageId: `obs-transport-${content}`,
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content,
      timestamp: new Date().toISOString(),
      conversationId: `conv-obs-transport-${content}`,
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply: vi.fn(async () => {}) });

    expect(answerWithKnowledge).toHaveBeenCalledWith(expect.objectContaining({
      question: content,
      override: {
        category: "retrieval_based",
        promptKey: "arrivals_transport",
      },
    }));
    expect(agentGraph.invoke).not.toHaveBeenCalled();
    expect(debugLog).toHaveBeenCalledWith(
      "[routing][decision]",
      expect.objectContaining({
        route_source: "knowledgeBaseAgent",
        early_return: true,
        final_category: "retrieval_based",
        final_prompt_key: "arrivals_transport",
      })
    );
  });

  it("mantiene nearby_points sin override de transporte para una consulta cercana legítima", async () => {
    const content = "qué lugares hay cerca del hotel";
    vi.mocked(answerWithKnowledge).mockResolvedValue({
      ok: true,
      category: "retrieval_based",
      promptKey: "nearby_points",
      answer: "Lugares cercanos al hotel.",
      retrieved: [],
      debug: {},
    } as any);

    await handleIncomingMessage({
      messageId: "obs-nearby-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content,
      timestamp: new Date().toISOString(),
      conversationId: "conv-obs-nearby-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply: vi.fn(async () => {}) });

    expect(answerWithKnowledge).toHaveBeenCalledWith(expect.objectContaining({
      question: content,
    }));
    expect(answerWithKnowledge).not.toHaveBeenCalledWith(expect.objectContaining({
      override: expect.anything(),
    }));
    expect(agentGraph.invoke).not.toHaveBeenCalled();
  });

  it("prioriza room_info_img con rich para consulta visual de habitaciones cuando hay imágenes", async () => {
    const content = "Que tipos de habitaciones tienen?";
    vi.mocked(retrievalBased).mockResolvedValue({
      messages: [{ role: "assistant", content: "Tenemos habitaciones doble y triple." }],
      meta: {
        rich: {
          type: "room-info-img",
          data: [
            {
              type: "Doble",
              icon: "🛏️",
              highlights: ["Capacidad: 2"],
              images: ["https://cdn.example.com/doble.jpg"],
            },
          ],
        },
      },
    } as any);

    const sendReply = vi.fn(async () => {});
    await handleIncomingMessage({
      messageId: "obs-room-img-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content,
      timestamp: new Date().toISOString(),
      conversationId: "conv-obs-room-img-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    expect(retrievalBased).toHaveBeenCalledWith(expect.objectContaining({
      hotelId: "hotel999",
      normalizedMessage: content,
      promptKey: "room_info_img",
      category: "retrieval_based",
    }));
    expect(answerWithKnowledge).not.toHaveBeenCalled();
    expect(agentGraph.invoke).not.toHaveBeenCalled();
    expect(debugLog).toHaveBeenCalledWith(
      "[routing][decision]",
      expect.objectContaining({
        route_source: "kb_precedence_policy",
        route_match: "room_inventory_visual_signal_with_images",
        early_return: true,
        final_category: "retrieval_based",
        final_prompt_key: "room_info_img",
      })
    );
  });

  it("no captura una intención de reserva como room_info_img", async () => {
    const content = "quiero reservar una doble";
    const localSendReply = vi.fn(async () => {});
    vi.mocked(answerWithKnowledge).mockResolvedValue({
      ok: false,
      category: "retrieval_based",
      answer: "",
    } as any);
    vi.mocked(agentGraph.invoke).mockResolvedValue({
      messages: [{ role: "assistant", content: "¿Cuál es la fecha de check-in?" }],
      category: "reservation",
      promptKey: "reservation_flow",
      reservationSlots: { roomType: "double" },
      meta: { debug: { route_source: "forced_llm_classifier", route_match: "reservation" } },
    } as any);

    await handleIncomingMessage({
      messageId: "obs-room-img-reservation-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content,
      timestamp: new Date().toISOString(),
      conversationId: "conv-obs-room-img-reservation-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply: localSendReply });

    expect(retrievalBased).not.toHaveBeenCalled();
    expect(answerWithKnowledge).not.toHaveBeenCalled();
    expect(localSendReply).toHaveBeenCalled();
  });

  it("no activa room_info_img cuando el hotel no tiene imágenes de habitaciones", async () => {
    vi.mocked(getHotelConfig).mockResolvedValueOnce({
      hotelId: "hotel999",
      defaultLanguage: "es",
      rooms: [{ name: "Doble", images: [] }],
    } as any);
    vi.mocked(answerWithKnowledge).mockResolvedValue({
      ok: true,
      category: "retrieval_based",
      promptKey: "room_info",
      answer: "Tenemos habitaciones doble y triple.",
      retrieved: [],
      debug: {},
    } as any);

    await handleIncomingMessage({
      messageId: "obs-room-no-img-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "Que tipos de habitaciones tienen?",
      timestamp: new Date().toISOString(),
      conversationId: "conv-obs-room-no-img-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply: vi.fn(async () => {}) });

    expect(retrievalBased).not.toHaveBeenCalled();
    expect(answerWithKnowledge).toHaveBeenCalled();
  });

  it("prioriza room_info_img cuando las imágenes están publicadas en KB vigente aunque hotel_config no las exponga", async () => {
    vi.mocked(getHotelConfig).mockResolvedValueOnce({
      hotelId: "hotel999",
      defaultLanguage: "es",
      rooms: [{ name: "Doble", images: [] }],
    } as any);
    vi.mocked(resolveCategoryForHotel).mockResolvedValueOnce({
      content: {
        body: [
          "Tipo: Habitación Doble",
          "Images:",
          " - /hotel999/rooms/doble.jpg",
          "Highlights: Vista al mar",
        ].join("\n"),
      },
    } as any);
    vi.mocked(retrievalBased).mockResolvedValue({
      messages: [{ role: "assistant", content: "Tenemos habitaciones con fotos." }],
      meta: {
        rich: {
          type: "room-info-img",
          data: [{ type: "Habitación Doble", images: ["/hotel999/rooms/doble.jpg"], highlights: ["Vista al mar"] }],
        },
      },
    } as any);

    await handleIncomingMessage({
      messageId: "obs-room-img-kb-published-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "mostrame habitaciones",
      timestamp: new Date().toISOString(),
      conversationId: "conv-obs-room-img-kb-published-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply: vi.fn(async () => {}) });

    expect(resolveCategoryForHotel).toHaveBeenCalledWith(expect.objectContaining({
      hotelId: "hotel999",
      category: "retrieval_based",
      promptKey: "room_info_img",
      desiredLang: "es",
    }));
    expect(retrievalBased).toHaveBeenCalledWith(expect.objectContaining({
      hotelId: "hotel999",
      normalizedMessage: "mostrame habitaciones",
      promptKey: "room_info_img",
      category: "retrieval_based",
    }));
    expect(answerWithKnowledge).not.toHaveBeenCalled();
    expect(debugLog).toHaveBeenCalledWith(
      "[routing][decision]",
      expect.objectContaining({
        route_source: "kb_precedence_policy",
        route_match: "room_inventory_visual_signal_with_images",
        early_return: true,
        final_category: "retrieval_based",
        final_prompt_key: "room_info_img",
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

  it("loggea decisión homogénea para availability inquiry con classifier forzado", async () => {
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
        decision_layer: "bodyLLM",
        route_source: "availability_inquiry_policy",
        route_match: "availability_collecting",
        early_return: true,
        used_llm_classifier: false,
        classifier_source: "heuristic",
        final_category: "availability_inquiry",
        final_prompt_key: null,
      })
    );
  });
});
