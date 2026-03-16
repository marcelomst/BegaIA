import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/messages", () => ({
  saveChannelMessageToAstra: vi.fn(async () => {}),
  getMessagesByConversation: vi.fn(async () => []),
}));
vi.mock("@/lib/db/conversations", () => ({
  getOrCreateConversation: vi.fn(async () => {}),
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
  detectCheckinOrCheckoutTimeQuestion: () => null,
  isPureAffirmative: () => false,
  askedToConfirmCheckTime: () => null,
}));
vi.mock("@/lib/agents/knowledgeBaseAgent", () => ({
  answerWithKnowledge: vi.fn(async () => ({
    ok: true,
    category: "retrieval_based",
    answer: "**🏨 Habitación Doble**\nAmenities descriptivos",
    contentTitle: "Tipos de habitaciones",
    contentBody: "body",
    retrieved: [],
  })),
}));
vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: vi.fn(async () => ({
      messages: [{ role: "assistant", content: "Para cotizar una habitación doble necesito las fechas de check-in y check-out." }],
      category: "reservation",
      promptKey: "reservation_flow",
      reservationSlots: { roomType: "double" },
      meta: {},
    })),
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
import { agentGraph } from "@/lib/agents";

describe("messageHandler pricing KB bypass", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("omite KB fastpath descriptivo para pricing transaccional y delega al flujo de reserva", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage({
      messageId: "pricing-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "Quisiera saber tarifas para una habitación doble",
      timestamp: new Date().toISOString(),
      conversationId: "conv-pricing-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    expect(agentGraph.invoke).toHaveBeenCalled();
    expect(sendReply).toHaveBeenCalled();

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toContain("check-in");
    expect(replyText).not.toContain("Amenities descriptivos");
  });
});
