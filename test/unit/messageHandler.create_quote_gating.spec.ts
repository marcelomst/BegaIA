import { beforeEach, describe, expect, it, vi } from "vitest";

let currentState: any = null;

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
  getConvState: vi.fn(async () => currentState),
  upsertConvState: vi.fn(async (_hotelId: string, _conversationId: string, patch: any) => {
    currentState = { ...(currentState || {}), ...patch };
  }),
  CONVSTATE_VERSION: "test",
  resolveGuestState: vi.fn((st: any) => {
    if (!st) return undefined;
    if (st.salesStage === "close" || st.conversationStage === "reservation_confirmed") return "booked";
    if (st.reservationSlots || st.salesStage || st.conversationStage) return "prospect";
    return undefined;
  }),
}));
vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: vi.fn(async () => ({
      messages: [{
        role: "assistant",
        content: "Tengo doble disponible. Tarifa por noche: 100 USD. Total 5 noches: 500 USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.",
      }],
      category: "reservation",
      meta: {},
    })),
  },
}));
vi.mock("@/lib/agents/stateUpdaterAgent", () => ({
  updateConversationState: vi.fn(async (_hotelId: string, _conversationId: string, patch: any) => {
    currentState = { ...(currentState || {}), ...patch };
  }),
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

function msg(content: string) {
  return {
    messageId: `m-${Math.random().toString(36).slice(2, 8)}`,
    hotelId: "hotel999",
    channel: "web",
    sender: "guest",
    content,
    timestamp: new Date().toISOString(),
    conversationId: "conv-create-quote-gating-1",
    guestId: "g1",
    detectedLanguage: "es",
  } as any;
}

function lastReply(sendReply: any): string {
  return String(sendReply.mock.calls.at(-1)?.[0] || "");
}

describe("messageHandler create quote gating", () => {
  beforeEach(() => {
    currentState = null;
    vi.clearAllMocks();
  });

  it("con solo fechas no cotiza y pregunta huéspedes", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar del 10 al 15 de mayo de 2026"),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/cu[aá]ntos hu[eé]spedes/i);
    expect(replyText).not.toMatch(/tarifa por noche|confirm[aá]s la reserva|disponible/i);
    expect(currentState?.lastProposal ?? null).toBeNull();
  });

  it("con fechas, huéspedes y habitación pero sin nombre no cotiza y pide nombre", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar una doble del 10 al 15 de mayo de 2026 para 2 adultos"),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/a nombre de qui[eé]n|nombre y apellido/i);
    expect(replyText).not.toMatch(/tarifa por noche|confirm[aá]s la reserva|disponible/i);
    expect(currentState?.lastProposal ?? null).toBeNull();
  });

  it("con estado completo sí permite cotizar", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar una doble del 10 al 15 de mayo de 2026 para 2 adultos"),
      { mode: "automatic", sendReply }
    );
    expect(lastReply(sendReply)).toMatch(/a nombre de qui[eé]n|nombre y apellido/i);

    await handleIncomingMessage(
      msg("Marcelo Martinez"),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/tarifa por noche|confirm[aá]s la reserva|disponible/i);
    expect(currentState?.lastProposal?.available).toBe(true);
  });

  it("con create activo + fechas + 'sí' no cotiza y mantiene create sin contaminar modify", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero hacer otra reserva"),
      { mode: "automatic", sendReply }
    );
    await handleIncomingMessage(
      msg("10/06/2026 a 15/06/2026"),
      { mode: "automatic", sendReply }
    );

    expect(lastReply(sendReply)).toMatch(/cu[aá]ntos hu[eé]spedes/i);
    expect(lastReply(sendReply)).not.toMatch(/verifique disponibilidad|tarifa por noche|disponible/i);
    expect(currentState?.conversationFocus?.subFlow).toBe("create");
    expect(currentState?.lastCategory).toBe("reservation");
    expect(currentState?.pendingAvailabilityVerification ?? null).toBeNull();

    await handleIncomingMessage(
      msg("sí"),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/cu[aá]ntos hu[eé]spedes/i);
    expect(replyText).not.toMatch(/tarifa por noche|confirm[aá]s la reserva|disponible/i);
    expect(currentState?.conversationFocus?.subFlow).toBe("create");
    expect(currentState?.lastCategory).toBe("reservation");
    expect(currentState?.pendingAvailabilityVerification ?? null).toBeNull();
    expect(currentState?.lastProposal ?? null).toBeNull();
  });
});
