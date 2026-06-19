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
  resolveGuestState: (st: any) => {
    if (!st) return undefined;
    if (st.guestState === "prospect" || st.guestState === "booked" || st.guestState === "in_house") {
      return st.guestState;
    }
    if (st.lastReservation?.status === "created" || st.lastReservation?.status === "updated") {
      return "booked";
    }
    if (st.salesStage === "close" || st.conversationStage === "reservation_confirmed") {
      return "booked";
    }
    if (st.reservationSlots || st.salesStage || st.conversationStage) {
      return "prospect";
    }
    return undefined;
  },
}));
vi.mock("@/lib/agents", () => ({
  agentGraph: { invoke: vi.fn(async () => ({ messages: [{ role: "assistant", content: "Respuesta base" }], category: "reservation", meta: {} })) },
}));
vi.mock("@/lib/agents/reservations", () => ({
  modifyReservation: vi.fn(async () => ({
    ok: true,
    message: "✅ Modificada RES-TEST",
  })),
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
import { modifyReservation } from "@/lib/agents/reservations";

describe("messageHandler modify/cancel intent normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    "modify booking",
    "modificar reserva",
    "quiero cambiar mi reserva",
    "edit booking",
  ])("usa la normalización determinista para entrar en modo modificación con %s", async (content) => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage({
      messageId: "modify-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content,
      timestamp: new Date().toISOString(),
      conversationId: "conv-modify-1",
      guestId: "g1",
      detectedLanguage: /modify/i.test(content) ? "en" : "es",
    } as any, { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/what would you like to change|modify your confirmed booking|qué te gustaría cambiar|modificar tu reserva confirmada/i);
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

  it.each([
    "hola, tengo una reserva",
    "reserva",
    "buenas",
    "si modifico, me cobran?",
  ])("no activa menú genérico de modificación para %s", async (content) => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage({
      messageId: "modify-q-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content,
      timestamp: new Date().toISOString(),
      conversationId: "conv-modify-q-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/qué te gustaría cambiar|podemos modificar tu reserva confirmada|cu[aá]l quer[eé]s modificar/i);
  });

  it("responde una guía informativa para consulta de factibilidad de modify", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage({
      messageId: "modify-inquiry-can-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "quiero saber si puedo modificar",
      timestamp: new Date().toISOString(),
      conversationId: "conv-modify-inquiry-can-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/qu[eé] dato de la reserva deseas modificar|qu[eé] te gustar[ií]a cambiar|podemos modificar tu reserva confirmada|cu[aá]l quer[eé]s modificar|en qu[eé] puedo ayudarte/i);
    expect(replyText).toMatch(/pod[eé]s modificar|reserva activa/i);
  });

  it("responde una guía informativa para consulta de precio previa a modify", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage({
      messageId: "modify-inquiry-price-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "antes de modificar, ¿me recordás el precio?",
      timestamp: new Date().toISOString(),
      conversationId: "conv-modify-inquiry-price-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/qu[eé] dato de la reserva deseas modificar|qu[eé] te gustar[ií]a cambiar|podemos modificar tu reserva confirmada|cu[aá]l quer[eé]s modificar|en qu[eé] puedo ayudarte/i);
    expect(replyText).toMatch(/de cu[aá]l reserva|precio/i);
  });

  it("responde una guía informativa para consulta condicional de disponibilidad antes de modify", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage({
      messageId: "modify-inquiry-availability-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "quiero cambiar si hay lugar",
      timestamp: new Date().toISOString(),
      conversationId: "conv-modify-inquiry-availability-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/qu[eé] dato de la reserva deseas modificar|qu[eé] te gustar[ií]a cambiar|podemos modificar tu reserva confirmada|cu[aá]l quer[eé]s modificar|en qu[eé] puedo ayudarte/i);
    expect(replyText).toMatch(/qu[eé] cambio quer[eé]s consultar|habitaci[oó]n|fechas|hu[eé]spedes/i);
  });

  it("no ejecuta modify con un 'ok' fuera de awaitingConfirmation", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage({
      messageId: "modify-ok-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "ok",
      timestamp: new Date().toISOString(),
      conversationId: "conv-modify-ok-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    expect(modifyReservation).not.toHaveBeenCalled();
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/modificada/i);
  });
});
