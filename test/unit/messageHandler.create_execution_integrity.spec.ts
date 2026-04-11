import { beforeEach, describe, expect, it, vi } from "vitest";

let currentState: any = null;
let createdCount = 0;

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
vi.mock("@/lib/handlers/pipeline/availability", async () => {
  const actual = await vi.importActual<typeof import("@/lib/handlers/pipeline/availability")>("@/lib/handlers/pipeline/availability");
  return {
    ...actual,
    runAvailabilityCheck: vi.fn(async (_pre: any, slots: any, ciISO: string, coISO: string) => ({
      finalText: "Tengo doble disponible. Tarifa por noche: 100 USD. Total 4 noches: 400 USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.",
      nextSlots: {
        ...slots,
        checkIn: ciISO,
        checkOut: coISO,
        roomType: slots.roomType || "double",
      },
      needsHandoff: false,
    })),
  };
});
vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: vi.fn(async (input: any) => {
      const text = String(input?.normalizedMessage || "").toLowerCase();
      const isTriple = /triple/.test(text);
      return {
        messages: [{
          role: "assistant",
          content: isTriple
            ? "Tengo triple disponible. Tarifa por noche: 130 USD. Total 4 noches: 520 USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”."
            : "Tengo doble disponible. Tarifa por noche: 100 USD. Total 4 noches: 400 USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.",
        }],
        category: "reservation",
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
vi.mock("@/lib/agents/reservations", () => ({
  confirmAndCreate: vi.fn(async () => {
    createdCount += 1;
    return { ok: true, reservationId: `R-NEW-0${createdCount}`, message: "ok" };
  }),
  modifyReservation: vi.fn(async () => ({ ok: true, message: "ok" })),
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

function msg(content: string) {
  return {
    messageId: `m-${Math.random().toString(36).slice(2, 8)}`,
    hotelId: "hotel999",
    channel: "web",
    sender: "guest",
    content,
    timestamp: new Date().toISOString(),
    conversationId: "conv-create-integrity-1",
    guestId: "g1",
    detectedLanguage: "es",
  } as any;
}

function lastReply(sendReply: any): string {
  return String(sendReply.mock.calls.at(-1)?.[0] || "");
}

describe("messageHandler create execution integrity", () => {
  beforeEach(() => {
    currentState = null;
    createdCount = 0;
    vi.clearAllMocks();
  });

  it("el branch de availability intermedio no persiste reservas y el create final deja una sola reserva válida", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar para el dia 01/5/2026 al 05/05/2026 para 2 personas, habitacion doble, a nombre de Ana Gomez"),
      { mode: "automatic", sendReply }
    );

    expect(lastReply(sendReply)).toMatch(/Anot[eé] nuevas fechas: 01\/05\/2026 → 05\/05\/2026/i);
    expect(currentState?.lastReservation).toBeUndefined();
    expect(currentState?.reservationHistory).toBeUndefined();

    await handleIncomingMessage(msg("sí"), { mode: "automatic", sendReply });

    expect(lastReply(sendReply)).toMatch(/verifico disponibilidad|tarifa por noche|confirm[aá]s la reserva/i);
    expect(confirmAndCreate).not.toHaveBeenCalled();
    expect(currentState?.lastReservation).toBeUndefined();
    expect(currentState?.reservationHistory).toBeUndefined();

    await handleIncomingMessage(msg("confirmar"), { mode: "automatic", sendReply });

    expect(confirmAndCreate).toHaveBeenCalledTimes(1);
    expect(currentState?.reservationHistory).toHaveLength(1);
    expect(currentState?.lastReservation).toMatchObject({
      reservationId: "R-NEW-01",
      status: "created",
      checkIn: "2026-05-01",
      checkOut: "2026-05-05",
      roomType: "double",
      numGuests: "2",
      guestName: "Ana Gomez",
    });

    await handleIncomingMessage(msg("mostrame mis reservas"), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/R-NEW-01/);
    expect(replyText).not.toMatch(/sin fecha → sin fecha/i);
  });

  it("ignora residuos activos sin materializar al consolidar el history final del create", async () => {
    const sendReply = vi.fn(async () => {});
    currentState = {
      reservationSlots: {
        guestName: "Ana Gomez",
        roomType: "double",
        checkIn: "2026-05-01",
        checkOut: "2026-05-05",
        numGuests: "2",
      },
      salesStage: "quote",
      activeFlow: "reservation",
      desiredAction: "create",
      conversationFocus: {
        domain: "reservation",
        subFlow: "create",
        active: true,
        updatedAt: new Date().toISOString(),
      },
      lastProposal: {
        text: "Tengo doble disponible. Tarifa por noche: 100 USD. Total 4 noches: 400 USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.",
        available: true,
      },
      reservationHistory: [
        {
          reservationId: "RES-GHOST-01",
          status: "created",
          createdAt: "2026-05-01T10:00:00.000Z",
          channel: "web",
        },
      ],
      lastReservation: {
        reservationId: "RES-GHOST-01",
        status: "created",
        createdAt: "2026-05-01T10:00:00.000Z",
        channel: "web",
      },
    };

    await handleIncomingMessage(msg("confirmar"), { mode: "automatic", sendReply });

    expect(confirmAndCreate).toHaveBeenCalledTimes(1);
    expect(currentState?.reservationHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reservationId: "R-NEW-01",
          status: "created",
          checkIn: "2026-05-01",
          checkOut: "2026-05-05",
        }),
      ])
    );

    await handleIncomingMessage(msg("mostrame mis reservas"), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/R-NEW-01/);
    expect(replyText).not.toMatch(/RES-GHOST-01/);
    expect(replyText).not.toMatch(/sin fecha → sin fecha/i);
  });

  it("alinear propuesta y confirmación cuando el usuario cambia a triple", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar una doble del 10 al 15 de mayo de 2026 para 2 adultos a nombre de Marcelo Martinez"),
      { mode: "automatic", sendReply }
    );
    expect(lastReply(sendReply)).toMatch(/doble/i);

    await handleIncomingMessage(msg("triple"), { mode: "automatic", sendReply });
    expect(lastReply(sendReply)).toMatch(/triple/i);

    await handleIncomingMessage(msg("confirmar"), { mode: "automatic", sendReply });

    expect(confirmAndCreate).toHaveBeenCalledTimes(1);
    const payload = (confirmAndCreate as any).mock.calls.at(-1)?.[1] || {};
    expect(payload.roomType).toBe("triple");
    expect(String(payload.numGuests || "")).toBe("2");
    expect(payload.checkIn).toBe("2026-05-10");
    expect(payload.checkOut).toBe("2026-05-15");
  });
});
