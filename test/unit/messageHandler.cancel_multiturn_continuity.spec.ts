import { beforeEach, describe, expect, it, vi } from "vitest";

const stateByConversation = new Map<string, any>();

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
  getConvState: vi.fn(async (_hotelId: string, conversationId: string) => {
    return stateByConversation.get(conversationId) ?? {
      reservationSlots: {
        guestName: "Marcelo Martinez",
        roomType: "double",
        checkIn: "2026-03-21",
        checkOut: "2026-03-25",
        numGuests: "2",
      },
      salesStage: "close",
      conversationStage: "reservation_confirmed",
      lastCategory: null,
      activeFlow: null,
    };
  }),
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
vi.mock("@/lib/agents/stateUpdaterAgent", () => ({
  updateConversationState: vi.fn(async (hotelId: string, conversationId: string, patch: any) => {
    const prev = stateByConversation.get(conversationId) ?? {
      hotelId,
      conversationId,
      reservationSlots: {
        guestName: "Marcelo Martinez",
        roomType: "double",
        checkIn: "2026-03-21",
        checkOut: "2026-03-25",
        numGuests: "2",
      },
      salesStage: "close",
      conversationStage: "reservation_confirmed",
      lastCategory: null,
      activeFlow: null,
    };
    stateByConversation.set(conversationId, { ...prev, ...patch });
  }),
}));
vi.mock("@/lib/agents/reservations", () => ({
  cancelReservation: vi.fn(async (_hotelId: string, _reservationId: string) => ({
    ok: true,
    message: "✅ Reserva cancelada.",
  })),
}));
vi.mock("@/lib/agents", () => ({
  agentGraph: { invoke: vi.fn(async () => ({ messages: [{ role: "assistant", content: "Respuesta base" }], category: "reservation", meta: {} })) },
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
import { cancelReservation } from "@/lib/agents/reservations";

function msg(content: string, conversationId: string) {
  return {
    messageId: `m-${Math.random().toString(36).slice(2, 8)}`,
    hotelId: "hotel999",
    channel: "web",
    sender: "guest",
    content,
    timestamp: new Date().toISOString(),
    conversationId,
    guestId: "g1",
    detectedLanguage: "es",
  } as any;
}

describe("messageHandler cancel reservation multiturn continuity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stateByConversation.clear();
  });

  it("soporta intención -> código -> CONFIRMAR", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-cancel-flow-1";

    await handleIncomingMessage(msg("quiero cancelar mi reserva", conversationId), { mode: "automatic", sendReply });
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/c[oó]digo de reserva/i);

    await handleIncomingMessage(msg("RES123456", conversationId), { mode: "automatic", sendReply });
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/CONFIRMAR/i);
    expect(stateByConversation.get(conversationId)?.pendingCancellation).toMatchObject({
      reservationId: "RES123456",
      awaitingConfirmation: true,
    });

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });
    expect(cancelReservation).toHaveBeenCalledWith("hotel999", "RES123456");
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/Reserva cancelada/i);
    expect(stateByConversation.get(conversationId)?.pendingCancellation).toBeNull();
    expect(stateByConversation.get(conversationId)?.lastReservation).toMatchObject({
      reservationId: "RES123456",
      status: "cancelled",
    });
  });

  it("mantiene el flujo compacto cuando llega código + confirmación en el mismo turno", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-cancel-flow-2";

    await handleIncomingMessage(msg("cancelar RES123456 confirmar", conversationId), { mode: "automatic", sendReply });

    expect(cancelReservation).toHaveBeenCalledWith("hotel999", "RES123456");
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/Reserva cancelada/i);
  });

  it.each([
    "no canceles todavía",
    "RES123456",
    "si cancelo, me cobran?",
  ])("no ejecuta cancelación con %s", async (content) => {
    const sendReply = vi.fn(async () => {});
    const conversationId = `conv-cancel-neg-${content}`;

    await handleIncomingMessage(msg(content, conversationId), { mode: "automatic", sendReply });

    expect(cancelReservation).not.toHaveBeenCalled();
  });
});
