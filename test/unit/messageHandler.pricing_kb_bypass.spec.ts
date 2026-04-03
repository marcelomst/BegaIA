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
import { getMessagesByConversation } from "@/lib/db/messages";

describe("messageHandler pricing KB bypass", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pricing puro no cae en KB descriptivo ni arranca collecting de reserva", async () => {
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

    expect(agentGraph.invoke).not.toHaveBeenCalled();
    expect(sendReply).toHaveBeenCalled();

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/cotiz|precio exacto/i);
    expect(replyText).not.toContain("Amenities descriptivos");
  });

  it("omite KB descriptivo cuando el usuario responde solo el roomType en follow-up transaccional", async () => {
    vi.mocked(getMessagesByConversation as any).mockResolvedValue([
      {
        messageId: "m1",
        hotelId: "hotel999",
        channel: "web",
        sender: "assistant",
        role: "ai",
        content: "¿Cuál es el tipo de habitación?",
        timestamp: new Date(Date.now() - 1000).toISOString(),
        conversationId: "conv-pricing-2",
      },
    ]);

    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage({
      messageId: "pricing-2",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "doble",
      timestamp: new Date().toISOString(),
      conversationId: "conv-pricing-2",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    expect(agentGraph.invoke).toHaveBeenCalled();
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toContain("check-in");
    expect(replyText).not.toContain("Amenities descriptivos");
  });

  it("omite KB descriptivo cuando el usuario responde solo la cantidad de huéspedes en follow-up transaccional", async () => {
    vi.mocked(getMessagesByConversation as any).mockResolvedValue([
      {
        messageId: "m1",
        hotelId: "hotel999",
        channel: "web",
        sender: "assistant",
        role: "ai",
        content: "¿Cuántos huéspedes se alojarán?",
        timestamp: new Date(Date.now() - 1000).toISOString(),
        conversationId: "conv-pricing-3",
      },
    ]);

    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage({
      messageId: "pricing-3",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "2",
      timestamp: new Date().toISOString(),
      conversationId: "conv-pricing-3",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    expect(agentGraph.invoke).toHaveBeenCalled();
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toContain("Amenities descriptivos");
  });

  it("omite KB descriptivo cuando el follow-up es numérico tras '¿Cuál es el número de huéspedes?'", async () => {
    vi.mocked(getMessagesByConversation as any).mockResolvedValue([
      {
        messageId: "m1",
        hotelId: "hotel999",
        channel: "web",
        sender: "assistant",
        role: "ai",
        content: "¿Cuál es el número de huéspedes?",
        timestamp: new Date(Date.now() - 1000).toISOString(),
        conversationId: "conv-pricing-5",
      },
    ]);

    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage({
      messageId: "pricing-5",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "2",
      timestamp: new Date().toISOString(),
      conversationId: "conv-pricing-5",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    expect(agentGraph.invoke).toHaveBeenCalled();
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toContain("Amenities descriptivos");
  });

  it("omite KB descriptivo cuando el usuario responde nombre completo en follow-up transaccional", async () => {
    vi.mocked(getMessagesByConversation as any).mockResolvedValue([
      {
        messageId: "m1",
        hotelId: "hotel999",
        channel: "web",
        sender: "assistant",
        role: "ai",
        content: "¿A nombre de quién sería la reserva? (nombre y apellido)",
        timestamp: new Date(Date.now() - 1000).toISOString(),
        conversationId: "conv-pricing-4",
      },
    ]);

    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage({
      messageId: "pricing-4",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "Marcelo Martinez",
      timestamp: new Date().toISOString(),
      conversationId: "conv-pricing-4",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    expect(agentGraph.invoke).toHaveBeenCalled();
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toContain("Amenities descriptivos");
  });
});
