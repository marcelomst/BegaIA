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
    invoke: vi.fn(async (input: any) => {
      const text = String(input?.normalizedMessage || "").toLowerCase();
      if (/wifi/.test(text)) {
        return {
          messages: [{ role: "assistant", content: "Sí, tenemos wifi en todo el hotel." }],
          category: "amenities_info",
          meta: {},
        };
      }
      if (/factura|invoice/.test(text)) {
        return {
          messages: [{ role: "assistant", content: "Puedo ayudarte con la factura." }],
          category: "billing",
          meta: {},
        };
      }
      return {
        messages: [{ role: "assistant", content: "Podés escribirnos por WhatsApp o email para seguir." }],
        category: "retrieval_based",
        meta: {},
      };
    }),
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
  answerWithKnowledge: vi.fn(async ({ question }: any) => {
    const text = String(question || "").toLowerCase();
    if (/wifi/.test(text)) {
      return {
        ok: true,
        category: "amenities_info",
        answer: "Sí, tenemos wifi en todo el hotel.",
        promptKey: "amenities_list",
        retrieved: [],
      };
    }
    return {
      ok: true,
      category: "retrieval_based",
      answer: "Podés escribirnos por WhatsApp o email para seguir.",
      retrieved: [],
    };
  }),
}));
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class { constructor(_c: any) {} async invoke() { return { content: "Respuesta base" }; } },
}));

import { handleIncomingMessage } from "@/lib/handlers/messageHandler";

function msg(content: string, channel = "web") {
  return {
    messageId: `m-${Math.random().toString(36).slice(2, 8)}`,
    hotelId: "hotel999",
    channel,
    sender: "guest",
    content,
    timestamp: new Date().toISOString(),
    conversationId: "conv-domain-lock-1",
    guestId: "g1",
    detectedLanguage: "es",
  } as any;
}

describe("messageHandler domain lock de reservation", () => {
  beforeEach(() => {
    currentState = null;
    vi.clearAllMocks();
  });

  it("mantiene create flow para 'cuadruple' y no escapa a fallback", async () => {
    currentState = {
      activeFlow: "reservation",
      desiredAction: "create",
      lastCategory: "reservation",
      reservationSlots: {},
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("cuadruple"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/check-in|fecha/i);
    expect(replyText).not.toMatch(/whatsapp|email|turismo/i);
  });

  it("mantiene create flow para follow-up corto 'con desayuno'", async () => {
    currentState = {
      activeFlow: "reservation",
      desiredAction: "create",
      lastCategory: "reservation",
      reservationSlots: {
        roomType: "double",
        checkIn: "2026-04-21",
        checkOut: "2026-04-25",
      },
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("con desayuno"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/hu[eé]spedes/i);
    expect(replyText).not.toMatch(/whatsapp|email|turismo/i);
  });

  it("usa fallback local en create flow para input insuficiente y no cae al global", async () => {
    currentState = {
      activeFlow: "reservation",
      desiredAction: "create",
      lastCategory: "reservation",
      reservationSlots: {},
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("mmm"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/check-in|fecha/i);
    expect(replyText).not.toMatch(/whatsapp|email|turismo/i);
  });

  it("en email mantiene agrupados los faltantes restantes del create flow", async () => {
    currentState = {
      activeFlow: "reservation",
      desiredAction: "create",
      lastCategory: "reservation",
      reservationSlots: {
        checkIn: "2026-05-23",
        checkOut: "2026-05-25",
      },
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("Del 23/5/2026 al 25/05/2026", "email"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/tipo de habitaci[oó]n/i);
    expect(replyText).toMatch(/n[uú]mero de hu[eé]spedes/i);
    expect(replyText).toMatch(/nombre completo|nombre del hu[eé]sped/i);
    expect(replyText).not.toMatch(/^¿Cuántos huéspedes se alojarán\?$/i);
  });

  it("mantiene modify flow para '2 personas' y no vuelve al fallback", async () => {
    currentState = {
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
      activeReservationContext: { kind: "reservation", reservationId: "RES-OLD-01", updatedAt: new Date().toISOString() },
      reservationSlots: {
        roomType: "single",
        checkIn: "2026-04-21",
        checkOut: "2026-04-25",
        numGuests: "1",
      },
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("2 personas"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/hu[eé]spedes|cantidad/i);
    expect(replyText).not.toMatch(/qué te gustaría cambiar|whatsapp|email|turismo/i);
  });

  it("mantiene reservation domain para '3 noches' dentro de modify", async () => {
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

    await handleIncomingMessage(msg("3 noches"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/fechas exactas|check-in y check-out/i);
    expect(replyText).not.toMatch(/whatsapp|email|turismo/i);
  });

  it("usa fallback local en modify activo para input ambiguo y no sale al global", async () => {
    currentState = {
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
      activeReservationContext: { kind: "reservation", reservationId: "RES-OLD-01", updatedAt: new Date().toISOString() },
      modifyState: { activeField: "guests" },
      reservationSlots: {
        roomType: "single",
        checkIn: "2026-04-21",
        checkOut: "2026-04-25",
        numGuests: "1",
      },
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("mmm"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/nueva cantidad|hu[eé]spedes/i);
    expect(replyText).not.toMatch(/whatsapp|email|turismo/i);
  });

  it("mantiene snapshot continuity para 'esa' y no escapa a fallback global", async () => {
    currentState = {
      lastCategory: "reservation_snapshot",
      selectedReservationTarget: {
        reservationId: "RES-OLD-01",
        kind: "confirmed",
        source: "ordinal",
        resolutionMode: "strong",
        resolvedAt: new Date().toISOString(),
      },
      activeReservationContext: { kind: "reservation", reservationId: "RES-OLD-01", updatedAt: new Date().toISOString() },
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("esa"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/whatsapp|email|turismo/i);
  });

  it("usa aclaración local en post-snapshot con input débil", async () => {
    currentState = {
      lastCategory: "reservation_snapshot",
      selectedReservationTarget: {
        reservationId: "RES-OLD-01",
        kind: "confirmed",
        source: "ordinal",
        resolutionMode: "strong",
        resolvedAt: new Date().toISOString(),
      },
      activeReservationContext: { kind: "reservation", reservationId: "RES-OLD-01", updatedAt: new Date().toISOString() },
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("mmm"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/primera|segunda|[uú]ltima|c[oó]digo/i);
    expect(replyText).not.toMatch(/whatsapp|email|turismo/i);
  });

  it("usa fallback local en confirm activo para input no concluyente", async () => {
    currentState = {
      activeFlow: "reservation",
      desiredAction: "create",
      lastCategory: "reservation",
      salesStage: "quote",
      conversationStage: "reservation_quoted",
      reservationSlots: {
        roomType: "double",
        checkIn: "2026-04-21",
        checkOut: "2026-04-25",
        numGuests: "2",
        guestName: "Marcelo Martinez",
      },
      lastProposal: { text: "Tarifa por noche: 100 USD. ¿Confirmás la reserva?", available: true },
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("mmm"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/confirmar|cambiar/i);
    expect(replyText).not.toMatch(/whatsapp|email|turismo/i);
  });

  it("rompe el lock correctamente para '¿tienen wifi?'", async () => {
    currentState = {
      activeFlow: "reservation",
      desiredAction: "create",
      lastCategory: "reservation",
      reservationSlots: {
        roomType: "double",
      },
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("¿tienen wifi?"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/wi-?fi/i);
    expect(replyText).not.toMatch(/check-in|hu[eé]spedes|reserva/i);
  });

  it("rompe el lock correctamente para 'quiero factura'", async () => {
    currentState = {
      activeFlow: "reservation",
      desiredAction: "create",
      lastCategory: "reservation",
      reservationSlots: {
        roomType: "double",
      },
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("quiero factura"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/factura|comprobantes|monedas/i);
    expect(replyText).not.toMatch(/check-in|hu[eé]spedes|reserva/i);
  });
});
