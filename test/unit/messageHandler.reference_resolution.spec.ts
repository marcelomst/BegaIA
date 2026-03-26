import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

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
  getConvState: vi.fn(async (_hotelId: string, conversationId: string) => stateByConversation.get(conversationId) ?? null),
  upsertConvState: vi.fn(async () => {}),
  CONVSTATE_VERSION: "convstate-test",
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
      updatedAt: new Date().toISOString(),
    };
    stateByConversation.set(conversationId, { ...prev, ...patch });
  }),
}));
vi.mock("@/lib/agents/reservations", () => ({
  modifyReservation: vi.fn(async (_hotelId: string, reservationId: string, snapshot: any) => ({
    ok: true,
    message: `✅ Modificada ${reservationId}`,
    snapshot,
  })),
  cancelReservation: vi.fn(async (_hotelId: string, reservationId: string) => ({
    ok: true,
    message: `✅ Cancelada ${reservationId}`,
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
    answer: "contenido generico",
    retrieved: [],
  })),
}));
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class { constructor(_c: any) {} async invoke() { return { content: "Respuesta base" }; } },
}));

import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import { cancelReservation, modifyReservation } from "@/lib/agents/reservations";

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

function baseMultiReservationState(overrides: Record<string, any> = {}) {
  return {
    reservationSlots: {
      guestName: "Marcelo Martinez",
      roomType: "double",
      checkIn: "2026-03-28",
      checkOut: "2026-03-30",
      numGuests: "2",
    },
    salesStage: "close",
    conversationStage: "reservation_confirmed",
    lastReservation: {
      reservationId: "RES-NEW-02",
      status: "created",
      createdAt: "2026-03-22T10:00:00.000Z",
      channel: "web",
      guestName: "Marcelo Martinez",
      roomType: "double",
      checkIn: "2026-03-28",
      checkOut: "2026-03-30",
      numGuests: "2",
    },
    reservationHistory: [
      {
        reservationId: "RES-OLD-01",
        status: "created",
        createdAt: "2026-03-20T10:00:00.000Z",
        channel: "web",
        guestName: "Marcelo Martinez",
        roomType: "single",
        checkIn: "2026-03-24",
        checkOut: "2026-03-26",
        numGuests: "1",
      },
      {
        reservationId: "RES-NEW-02",
        status: "created",
        createdAt: "2026-03-22T10:00:00.000Z",
        channel: "web",
        guestName: "Marcelo Martinez",
        roomType: "double",
        checkIn: "2026-03-28",
        checkOut: "2026-03-30",
        numGuests: "2",
      },
    ],
    activeReservationContext: {
      kind: "reservation",
      reservationId: "RES-NEW-02",
      phase: "confirmed",
      updatedAt: "2026-03-22T10:00:00.000Z",
    },
    updatedAt: "2026-03-22T10:00:00.000Z",
    ...overrides,
  };
}

describe("messageHandler reference resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T12:00:00.000Z"));
    stateByConversation.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resuelve 'modificá la nueva' y entra al flujo de modificación sin pedir código", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-new-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(
      msg("modificá la nueva 24/03/2026 al 26/03/2026", conversationId),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(replyText).toMatch(/anot[eé] nuevas fechas|verifique disponibilidad|posibles diferencias/i);
    expect(replyText).not.toMatch(/c[oó]digo de reserva/i);
  });

  it("resuelve 'cancelá la otra' hacia la reserva no activa cuando solo hay una alternativa clara", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-other-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("cancelá la otra", conversationId), { mode: "automatic", sendReply });

    expect(cancelReservation).not.toHaveBeenCalled();
    expect(stateByConversation.get(conversationId)?.pendingCancellation).toMatchObject({
      reservationId: "RES-OLD-01",
      awaitingConfirmation: true,
    });
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/CONFIRMAR/i);
  });

  it("resuelve 'modificá la de mañana' cuando la fecha relativa identifica una sola reserva", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-tomorrow-1";
    stateByConversation.set(
      conversationId,
      baseMultiReservationState({
        activeReservationContext: {
          kind: "reservation",
          reservationId: "RES-OLD-01",
          phase: "confirmed",
          updatedAt: "2026-03-20T10:00:00.000Z",
        },
      })
    );

    await handleIncomingMessage(
      msg("modificá la de mañana 24/03/2026 al 27/03/2026", conversationId),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(replyText).toMatch(/anot[eé] nuevas fechas|verifique disponibilidad|posibles diferencias/i);
    expect(replyText).not.toMatch(/c[oó]digo de reserva/i);
  });

  it("cuando la referencia es ambigua no inventa y pide aclaración", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-ambiguous-1";
    stateByConversation.set(
      conversationId,
      baseMultiReservationState({
        reservationHistory: [
          {
            reservationId: "RES-OLD-01",
            status: "created",
            createdAt: "2026-03-20T10:00:00.000Z",
            channel: "web",
          },
          {
            reservationId: "RES-MID-02",
            status: "created",
            createdAt: "2026-03-21T10:00:00.000Z",
            channel: "web",
          },
          {
            reservationId: "RES-NEW-03",
            status: "created",
            createdAt: "2026-03-22T10:00:00.000Z",
            channel: "web",
          },
        ],
        lastReservation: {
          reservationId: "RES-NEW-03",
          status: "created",
          createdAt: "2026-03-22T10:00:00.000Z",
          channel: "web",
        },
        activeReservationContext: {
          kind: "reservation",
          reservationId: "RES-NEW-03",
          phase: "confirmed",
          updatedAt: "2026-03-22T10:00:00.000Z",
        },
      })
    );

    await handleIncomingMessage(msg("cancelá la otra", conversationId), { mode: "automatic", sendReply });

    expect(cancelReservation).not.toHaveBeenCalled();
    expect(stateByConversation.get(conversationId)?.pendingCancellation).toBeUndefined();
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/reserva nueva|anterior|fecha espec/i);
  });

  it("resuelve 'cancelá la segunda' usando reservationHistory ordenado", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-second-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("cancelá la segunda", conversationId), { mode: "automatic", sendReply });

    expect(cancelReservation).not.toHaveBeenCalled();
    expect(stateByConversation.get(conversationId)?.pendingCancellation).toMatchObject({
      reservationId: "RES-NEW-02",
      awaitingConfirmation: true,
    });
  });

  it("resuelve 'mostrame la primera reserva' con snapshot textual sin abrir nueva reserva", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-snapshot-first-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("quiero que me muestres la primer reserva", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/24\/03\/2026 → 26\/03\/2026|single/i);
    expect(replyText).not.toMatch(/abrimos una nueva|check-in y check-out/i);
  });

  it("resuelve 'mostrame la última' con snapshot textual", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-snapshot-last-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("mostrame la última", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/28\/03\/2026 → 30\/03\/2026|double/i);
    expect(replyText).not.toMatch(/abrimos una nueva|check-in y check-out/i);
  });

  it("mantiene foco referencial y resuelve 'modificá esa' después de 'mostrame la segunda'", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-anaphora-modify-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("mostrame la segunda", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("modificá esa", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/qué te gustaría cambiar|modificar tu reserva confirmada/i);
    expect(stateByConversation.get(conversationId)?.selectedReservationTarget).toMatchObject({
      reservationId: "RES-NEW-02",
      source: "anaphora",
    });
  });

  it("mantiene continuidad fuerte: 'mostrame la primera' + 'cambiar huéspedes' avanza sobre la misma reserva", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-snapshot-field-followup-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("mostrame la primera", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("cambiar huéspedes", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/nueva cantidad de hu[eé]spedes|qué te gustaría cambiar/i);
    expect(stateByConversation.get(conversationId)?.selectedReservationTarget).toMatchObject({
      reservationId: "RES-OLD-01",
    });
  });

  it("resuelve 'modificá la primera' sin pedir código y prioriza el ordinal sobre el foco", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-first-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(
      msg("modificá la primera 24/03/2026 al 26/03/2026", conversationId),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(replyText).toMatch(/anot[eé] nuevas fechas|verifique disponibilidad|posibles diferencias/i);
    expect(replyText).not.toMatch(/c[oó]digo de reserva/i);
  });

  it("mantiene el target al elegir 'cambiar huéspedes' después de 'modificá la primera reserva'", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-field-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("modificá la primera reserva", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("cambiar huéspedes", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/nueva cantidad de hu[eé]spedes/i);
    expect(replyText).not.toMatch(/qu[eé] te gustar[ií]a cambiar de tu reserva/i);
    expect(stateByConversation.get(conversationId)?.activeReservationContext).toMatchObject({
      kind: "reservation",
      reservationId: "RES-OLD-01",
      phase: "confirmed",
    });
    expect(stateByConversation.get(conversationId)?.selectedReservationTarget).toMatchObject({
      reservationId: "RES-OLD-01",
    });
  });

  it("reemplaza el target si el usuario corrige de 'la primera' a 'la segunda'", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-target-switch-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("modificá la primera", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("no, la segunda", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/qué te gustaría cambiar|modificar tu reserva confirmada/i);
    expect(stateByConversation.get(conversationId)?.selectedReservationTarget).toMatchObject({
      reservationId: "RES-NEW-02",
      source: "ordinal",
    });
  });

  it("limpia selectedReservationTarget al cambiar a un dominio no transaccional", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-clear-domain-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("mostrame la primera reserva", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("¿tienen wifi?", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/reserva actual|check-in|check-out|cancelar/i);
    expect(stateByConversation.get(conversationId)?.selectedReservationTarget ?? null).toBeNull();
  });

  it("limpia selectedReservationTarget cuando el usuario inicia una nueva reserva", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-clear-create-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("modificá la primera", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("quiero hacer una nueva reserva", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/nueva|check-in|check-out|fechas/i);
    expect(stateByConversation.get(conversationId)?.selectedReservationTarget ?? null).toBeNull();
  });

  it("usa selectedReservationTarget para cancelar después de snapshot: 'mostrame la primera' + 'cancelala'", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-snapshot-cancel-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("mostrame la primera", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("cancelala", conversationId), { mode: "automatic", sendReply });

    expect(stateByConversation.get(conversationId)?.pendingCancellation).toMatchObject({
      reservationId: "RES-OLD-01",
      awaitingConfirmation: true,
    });
    expect(stateByConversation.get(conversationId)?.selectedReservationTarget).toMatchObject({
      reservationId: "RES-OLD-01",
    });
  });

  it("resuelve 'modificá la última' con tres reservas tomando la más nueva por createdAt", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-last-1";
    stateByConversation.set(
      conversationId,
      baseMultiReservationState({
        reservationHistory: [
          {
            reservationId: "RES-OLD-01",
            status: "created",
            createdAt: "2026-03-20T10:00:00.000Z",
            channel: "web",
            checkIn: "2026-03-24",
            checkOut: "2026-03-26",
          },
          {
            reservationId: "RES-MID-02",
            status: "created",
            createdAt: "2026-03-21T10:00:00.000Z",
            channel: "web",
            checkIn: "2026-03-27",
            checkOut: "2026-03-29",
          },
          {
            reservationId: "RES-NEW-03",
            status: "created",
            createdAt: "2026-03-22T10:00:00.000Z",
            channel: "web",
            checkIn: "2026-03-30",
            checkOut: "2026-04-01",
          },
        ],
        lastReservation: {
          reservationId: "RES-NEW-03",
          status: "created",
          createdAt: "2026-03-22T10:00:00.000Z",
          channel: "web",
          checkIn: "2026-03-30",
          checkOut: "2026-04-01",
        },
        activeReservationContext: {
          kind: "reservation",
          reservationId: "RES-MID-02",
          phase: "confirmed",
          updatedAt: "2026-03-22T10:00:00.000Z",
        },
      })
    );

    await handleIncomingMessage(
      msg("modificá la última 31/03/2026 al 02/04/2026", conversationId),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(replyText).toMatch(/anot[eé] nuevas fechas|verifique disponibilidad|posibles diferencias/i);
    expect(replyText).not.toMatch(/c[oó]digo de reserva/i);
  });

  it("si hay reservationId explícito y ordinal en el mismo mensaje, gana el id", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-id-over-ordinal-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("cancelá la segunda RES-OLD-01", conversationId), { mode: "automatic", sendReply });

    expect(stateByConversation.get(conversationId)?.pendingCancellation).toMatchObject({
      reservationId: "RES-OLD-01",
      awaitingConfirmation: true,
    });
  });

  it("resuelve 'cancelá esa' por activeReservationContext cuando el deíctico es puro", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-that-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("cancelá esa", conversationId), { mode: "automatic", sendReply });

    expect(stateByConversation.get(conversationId)?.pendingCancellation).toMatchObject({
      reservationId: "RES-NEW-02",
      awaitingConfirmation: true,
    });
  });

  it("en 'cancelá esa última' el ordinal explícito gana sobre el foco activo", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-that-last-1";
    stateByConversation.set(
      conversationId,
      baseMultiReservationState({
        reservationHistory: [
          {
            reservationId: "RES-OLD-01",
            status: "created",
            createdAt: "2026-03-20T10:00:00.000Z",
            channel: "web",
          },
          {
            reservationId: "RES-MID-02",
            status: "created",
            createdAt: "2026-03-21T10:00:00.000Z",
            channel: "web",
          },
          {
            reservationId: "RES-NEW-03",
            status: "created",
            createdAt: "2026-03-22T10:00:00.000Z",
            channel: "web",
          },
        ],
        lastReservation: {
          reservationId: "RES-NEW-03",
          status: "created",
          createdAt: "2026-03-22T10:00:00.000Z",
          channel: "web",
        },
        activeReservationContext: {
          kind: "reservation",
          reservationId: "RES-MID-02",
          phase: "confirmed",
          updatedAt: "2026-03-22T10:00:00.000Z",
        },
      })
    );

    await handleIncomingMessage(msg("cancelá esa última", conversationId), { mode: "automatic", sendReply });

    expect(stateByConversation.get(conversationId)?.pendingCancellation).toMatchObject({
      reservationId: "RES-NEW-03",
      awaitingConfirmation: true,
    });
  });

  it("con una sola reserva, 'la segunda' pide aclaración", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-second-ambiguous-1";
    stateByConversation.set(
      conversationId,
      baseMultiReservationState({
        reservationHistory: [
          {
            reservationId: "RES-ONLY-01",
            status: "created",
            createdAt: "2026-03-22T10:00:00.000Z",
            channel: "web",
          },
        ],
        lastReservation: {
          reservationId: "RES-ONLY-01",
          status: "created",
          createdAt: "2026-03-22T10:00:00.000Z",
          channel: "web",
        },
        activeReservationContext: {
          kind: "reservation",
          reservationId: "RES-ONLY-01",
          phase: "confirmed",
          updatedAt: "2026-03-22T10:00:00.000Z",
        },
      })
    );

    await handleIncomingMessage(msg("cancelá la segunda", conversationId), { mode: "automatic", sendReply });

    expect(cancelReservation).not.toHaveBeenCalled();
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/reserva nueva|anterior|fecha espec/i);
  });

  it("sin reservas conocidas, 'la primera' pide aclaración", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-first-empty-1";
    stateByConversation.set(conversationId, {
      updatedAt: "2026-03-22T10:00:00.000Z",
    });

    await handleIncomingMessage(msg("modificá la primera", conversationId), { mode: "automatic", sendReply });

    expect(modifyReservation).not.toHaveBeenCalled();
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/reserva nueva|anterior|fecha espec/i);
  });

  it("mantiene no regresión para 'cancelá la anterior'", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-previous-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("cancelá la anterior", conversationId), { mode: "automatic", sendReply });

    expect(stateByConversation.get(conversationId)?.pendingCancellation).toMatchObject({
      reservationId: "RES-OLD-01",
      awaitingConfirmation: true,
    });
  });
});
