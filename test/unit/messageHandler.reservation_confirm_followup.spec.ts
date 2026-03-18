import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/messages", () => ({
  saveChannelMessageToAstra: vi.fn(async () => {}),
  getMessagesByConversation: vi.fn(async () => [
    {
      messageId: "m1",
      hotelId: "hotel999",
      channel: "web",
      sender: "assistant",
      role: "ai",
      content: "¿Confirmás la reserva? Respondé “CONFIRMAR”.",
      timestamp: new Date(Date.now() - 1000).toISOString(),
      conversationId: "conv-confirm-1",
    },
  ]),
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
    salesStage: "quote",
  })),
  upsertConvState: vi.fn(async () => {}),
  CONVSTATE_VERSION: "test",
}));
vi.mock("@/lib/agents/reservations", () => ({
  confirmAndCreate: vi.fn(async () => ({
    ok: true,
    reservationId: "R-0001",
    message: "✅ Reserva creada. ID: R-0001",
  })),
}));
vi.mock("@/lib/agents", () => ({
  agentGraph: { invoke: vi.fn(async () => ({ messages: [], category: "reservation", meta: {} })) },
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
    answer: "contenido generico",
    retrieved: [],
  })),
}));
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class { constructor(_c: any) {} async invoke() { return { content: "Respuesta base" }; } },
}));

import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import { confirmAndCreate } from "@/lib/agents/reservations";

describe("messageHandler reservation confirm follow-up", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    "CONFIRMAR",
    "comfirmar",
    "confimar",
    "dale",
    "ok hacelo",
  ])("cierra la reserva cuando el usuario responde %s después de la oferta explícita", async (userInput) => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage({
      messageId: "confirm-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: userInput,
      timestamp: new Date().toISOString(),
      conversationId: "conv-confirm-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    expect(confirmAndCreate).toHaveBeenCalled();
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/Reserva confirmada|R-0001/i);
    expect(replyText).not.toContain("contenido generico");
  });

  it("no confirma la reserva con un negativo explícito como 'no confirmes todavía'", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage({
      messageId: "confirm-neg-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "no confirmes todavía",
      timestamp: new Date().toISOString(),
      conversationId: "conv-confirm-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    expect(confirmAndCreate).not.toHaveBeenCalled();
  });
});
