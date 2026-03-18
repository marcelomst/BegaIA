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
  getConvState: vi.fn(async () => ({
    reservationSlots: {
      guestName: "Marcelo Martinez",
      roomType: "double",
      checkIn: "2026-03-21",
      checkOut: "2026-03-25",
      numGuests: "2",
    },
    salesStage: "close",
    conversationStage: "reservation_confirmed",
  })),
  upsertConvState: vi.fn(async () => {}),
  CONVSTATE_VERSION: "test",
}));
vi.mock("@/lib/agents", () => ({
  agentGraph: { invoke: vi.fn(async () => ({ messages: [{ role: "assistant", content: "Respuesta base" }], category: "reservation", meta: {} })) },
}));
vi.mock("@/lib/agents/stateUpdaterAgent", () => ({
  updateConversationState: vi.fn(async () => {}),
}));
vi.mock("@/lib/prompts", () => ({
  defaultPrompt: "{{retrieved}}",
  curatedPrompts: {},
}));
vi.mock("@/lib/web/eventBus", () => ({ emitToConversation: vi.fn(() => {}) }));
vi.mock("@/lib/utils/debugLog", () => ({ debugLog: vi.fn() }));
vi.mock("@/lib/agents/knowledgeBaseAgent", () => ({
  answerWithKnowledge: vi.fn(async () => ({
    ok: true,
    category: "retrieval_based",
    answer: "La política de cancelación depende de la tarifa.",
    retrieved: [],
  })),
}));
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class { constructor(_c: any) {} async invoke() { return { content: "Respuesta base" }; } },
}));

import { handleIncomingMessage } from "@/lib/handlers/messageHandler";

describe("messageHandler modify/cancel intent normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("usa la normalización determinista para entrar en modo modificación con 'modify booking'", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage({
      messageId: "modify-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "modify booking",
      timestamp: new Date().toISOString(),
      conversationId: "conv-modify-1",
      guestId: "g1",
      detectedLanguage: "en",
    } as any, { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/what would you like to change|modify your confirmed booking/i);
  });

  it("no entra en cancelación ejecutable con 'si cancelo, me cobran?'", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage({
      messageId: "cancel-q-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "si cancelo, me cobran?",
      timestamp: new Date().toISOString(),
      conversationId: "conv-cancel-q-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/c[oó]digo de reserva|respond[eé]\s+\*\*confirmar\*\*/i);
  });
});
