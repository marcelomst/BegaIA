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
  resolveGuestState: vi.fn(() => undefined),
}));
vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: vi.fn(async () => ({
      messages: [{ role: "assistant", content: "Respuesta base" }],
      category: "reservation",
      meta: {},
    })),
  },
}));
vi.mock("@/lib/agents/reservations", () => ({
  confirmAndCreate: vi.fn(async () => ({ ok: true, reservationId: "R-NEW-01", message: "ok" })),
  modifyReservation: vi.fn(async () => ({ ok: true, message: "ok" })),
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
  answerWithKnowledge: vi.fn(async () => ({ ok: true, category: "retrieval_based", answer: "contenido generico", retrieved: [] })),
}));
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class { constructor(_c: any) {} async invoke() { return { content: "Respuesta base" }; } },
}));

import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import { confirmAndCreate, modifyReservation } from "@/lib/agents/reservations";

function msg(content: string) {
  return {
    messageId: `m-${Math.random().toString(36).slice(2, 8)}`,
    hotelId: "hotel999",
    channel: "web",
    sender: "guest",
    content,
    timestamp: new Date().toISOString(),
    conversationId: "conv-date-coherence-1",
    guestId: "g1",
    detectedLanguage: "es",
  } as any;
}

describe("messageHandler date coherence", () => {
  beforeEach(() => {
    currentState = null;
    vi.clearAllMocks();
  });

  it("bloquea create flow con fechas invertidas", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("quiero reservar una habitación doble del 25/04/2026 al 21/04/2026"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/fechas no son v[aá]lidas|check-out debe ser posterior/i);
    expect(replyText).not.toMatch(/cu[aá]ntos hu[eé]spedes|confirm[aá]s la reserva/i);
    expect(confirmAndCreate).not.toHaveBeenCalled();
  });

  it("mantiene create flow normal con fechas válidas", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("quiero reservar una habitación doble del 21/04/2026 al 25/04/2026"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/fechas no son v[aá]lidas|check-out debe ser posterior/i);
    expect(replyText).toMatch(/21\/04\/2026|25\/04\/2026|hu[eé]spedes|verifique disponibilidad/i);
  });

  it("bloquea misma fecha en create flow", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("quiero reservar una habitación doble del 21/04/2026 al 21/04/2026"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/fechas no son v[aá]lidas|check-out debe ser posterior/i);
    expect(confirmAndCreate).not.toHaveBeenCalled();
  });

  it("bloquea fechas invertidas en raw sin corregirlas automáticamente", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("quiero reservar 10/05/2026 05/05/2026"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/fechas parecen inconsistentes|check-out debe ser posterior/i);
    expect(replyText).not.toMatch(/10\/05\/2026 → 05\/05\/2026|05\/05\/2026 → 10\/05\/2026|disponible|tarifa/i);
    expect(confirmAndCreate).not.toHaveBeenCalled();
  });

  it("bloquea formato de fecha inválido en raw", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("quiero reservar del 004/05/2026 al 10/05/2026"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/fecha ingresada no es v[aá]lida|pod[eé]s corregirla/i);
    expect(replyText).not.toMatch(/disponible|tarifa|confirm[aá]s la reserva/i);
    expect(confirmAndCreate).not.toHaveBeenCalled();
  });

  it("bloquea modify flow con fechas inválidas y no aplica cambios", async () => {
    currentState = {
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
      activeReservationContext: { kind: "reservation", reservationId: "RES-OLD-01", updatedAt: new Date().toISOString() },
      reservationSlots: {
        roomType: "double",
        checkIn: "2026-04-21",
        checkOut: "2026-04-25",
        numGuests: "2",
      },
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("cambiar fechas al 25/04/2026 al 21/04/2026"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/fechas no son v[aá]lidas|check-out debe ser posterior/i);
    expect(modifyReservation).not.toHaveBeenCalled();
  });
});
