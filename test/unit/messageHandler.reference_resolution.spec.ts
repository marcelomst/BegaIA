import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const stateByConversation = new Map<string, any>();

vi.mock("@/lib/db/messages", () => ({
  saveChannelMessageToAstra: vi.fn(async () => {}),
  getMessagesByConversation: vi.fn(async () => []),
}));
vi.mock("@/lib/db/conversations", () => ({
  getOrCreateConversation: vi.fn(async () => {}),
  appendConversationReplyTrace: vi.fn(async () => {}),
  getConversationsForGuestPerspective: vi.fn(async () => []),
}));
vi.mock("@/lib/db/guests", () => ({
  getGuest: vi.fn(async () => null),
  createGuest: vi.fn(async () => {}),
  updateGuest: vi.fn(async () => {}),
  findGuestByAnyId: vi.fn(async () => null),
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
  askAvailability: vi.fn(async (_hotelId: string, snapshot: any) => ({
    ok: true,
    available: true,
    proposal: `Tengo ${snapshot.roomType || "doble"} disponible. Tarifa por noche: 100 USD. Total 2 noches: 200 USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.`,
    options: [{ roomType: snapshot.roomType || "double", pricePerNight: 100, currency: "USD" }],
  })),
  confirmAndCreate: vi.fn(async () => ({
    ok: true,
    reservationId: "RES-CREATED-NEW",
    message: "created",
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
import { askAvailability, cancelReservation, confirmAndCreate, modifyReservation } from "@/lib/agents/reservations";
import { getConversationsForGuestPerspective } from "@/lib/db/conversations";
import { findGuestByAnyId, getGuest } from "@/lib/db/guests";

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

function baseThreeReservationState(overrides: Record<string, any> = {}) {
  return baseMultiReservationState({
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
        reservationId: "RES-MID-02",
        status: "created",
        createdAt: "2026-03-21T10:00:00.000Z",
        channel: "web",
        guestName: "Marcelo Martinez",
        roomType: "double",
        checkIn: "2026-03-28",
        checkOut: "2026-03-30",
        numGuests: "2",
      },
      {
        reservationId: "RES-NEW-03",
        status: "created",
        createdAt: "2026-03-22T10:00:00.000Z",
        channel: "web",
        guestName: "Marcelo Martinez",
        roomType: "triple",
        checkIn: "2026-04-02",
        checkOut: "2026-04-05",
        numGuests: "3",
      },
    ],
    lastReservation: {
      reservationId: "RES-NEW-03",
      status: "created",
      createdAt: "2026-03-22T10:00:00.000Z",
      channel: "web",
      guestName: "Marcelo Martinez",
      roomType: "triple",
      checkIn: "2026-04-02",
      checkOut: "2026-04-05",
      numGuests: "3",
    },
    activeReservationContext: {
      kind: "reservation",
      reservationId: "RES-NEW-03",
      phase: "confirmed",
      updatedAt: "2026-03-22T10:00:00.000Z",
    },
    ...overrides,
  });
}

function baseSingleReservationState(overrides: Record<string, any> = {}) {
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
      reservationId: "RES-ONLY-01",
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
        reservationId: "RES-ONLY-01",
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
    activeReservationContext: null,
    selectedReservationTarget: null,
    updatedAt: "2026-03-22T10:00:00.000Z",
    ...overrides,
  };
}

function baseAmbiguousModifyState(overrides: Record<string, any> = {}) {
  return {
    reservationSlots: {
      guestName: "Laura Gómez",
      roomType: "double",
      checkIn: "2026-08-15",
      checkOut: "2026-08-17",
      numGuests: "2",
    },
    salesStage: "close",
    conversationStage: "reservation_confirmed",
    reservationHistory: [
      {
        reservationId: "RES-6543E5",
        status: "created",
        createdAt: "2026-08-01T10:00:00.000Z",
        channel: "web",
        guestName: "Martín Pérez",
        roomType: "simple",
        checkIn: "2026-08-20",
        checkOut: "2026-08-22",
        numGuests: "1",
      },
      {
        reservationId: "RES-C386D0",
        status: "created",
        createdAt: "2026-08-02T10:00:00.000Z",
        channel: "web",
        guestName: "Ana Rodríguez",
        roomType: "triple",
        checkIn: "2026-08-25",
        checkOut: "2026-08-27",
        numGuests: "3",
      },
      {
        reservationId: "RES-403A89",
        status: "created",
        createdAt: "2026-08-03T10:00:00.000Z",
        channel: "web",
        guestName: "Laura Gómez",
        roomType: "double",
        checkIn: "2026-08-15",
        checkOut: "2026-08-17",
        numGuests: "2",
      },
    ],
    lastReservation: {
      reservationId: "RES-403A89",
      status: "created",
      createdAt: "2026-08-03T10:00:00.000Z",
      channel: "web",
      guestName: "Laura Gómez",
      roomType: "double",
      checkIn: "2026-08-15",
      checkOut: "2026-08-17",
      numGuests: "2",
    },
    activeReservationContext: {
      kind: "reservation",
      reservationId: "RES-403A89",
      phase: "confirmed",
      updatedAt: "2026-08-03T10:00:00.000Z",
    },
    updatedAt: "2026-08-03T10:00:00.000Z",
    ...overrides,
  };
}

describe("messageHandler reference resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T12:00:00.000Z"));
    stateByConversation.clear();
    (getGuest as any).mockResolvedValue(null);
    (findGuestByAnyId as any).mockResolvedValue(null);
    (getConversationsForGuestPerspective as any).mockResolvedValue([]);
  });

  afterEach(() => {
    delete process.env.USE_CHRONO_LAYER;
    delete (globalThis as any).__chronoImport;
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
    expect(replyText).toMatch(/antes de aplicar el cambio/i);
    expect(replyText).toMatch(/reserva res-new-02/i);
    expect(replyText).toMatch(/fechas: .*24\/03\/2026.*26\/03\/2026/i);
    expect(replyText).toMatch(/confirm[aá]s estos cambios/i);
    expect(replyText).not.toMatch(/anot[eé] nuevas fechas|confirm[aá]s la reserva/i);
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
    expect(replyText).toMatch(/antes de aplicar el cambio/i);
    expect(replyText).toMatch(/reserva res-old-01/i);
    expect(replyText).toMatch(/fechas: .*24\/03\/2026.*27\/03\/2026/i);
    expect(replyText).toMatch(/confirm[aá]s estos cambios/i);
    expect(replyText).not.toMatch(/anot[eé] nuevas fechas|confirm[aá]s la reserva/i);
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

  it("en snapshot usa el titular correcto sin convertirlo en vocativo conversacional", async () => {
    (getGuest as any).mockResolvedValue({
      guestId: "g1",
      hotelId: "hotel999",
      name: "Marcelo Martinez",
      firstName: "Marcelo",
    });
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-snapshot-holder-1";
    stateByConversation.set(
      conversationId,
      baseSingleReservationState({
        reservationSlots: {
          guestName: "Ana Gomez",
          roomType: "double",
          checkIn: "2026-03-28",
          checkOut: "2026-03-30",
          numGuests: "2",
        },
        lastReservation: {
          reservationId: "RES-ONLY-01",
          status: "created",
          createdAt: "2026-03-22T10:00:00.000Z",
          channel: "web",
          guestName: "Ana Gomez",
          roomType: "double",
          checkIn: "2026-03-28",
          checkOut: "2026-03-30",
          numGuests: "2",
        },
        reservationHistory: [
          {
            reservationId: "RES-ONLY-01",
            status: "created",
            createdAt: "2026-03-22T10:00:00.000Z",
            channel: "web",
            guestName: "Ana Gomez",
            roomType: "double",
            checkIn: "2026-03-28",
            checkOut: "2026-03-30",
            numGuests: "2",
          },
        ],
      })
    );

    await handleIncomingMessage(msg("mostrame mi reserva", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/nombre:\s+ana gomez/i);
    expect(replyText).not.toMatch(/^ana,/i);
  });

  it("lista 'mis reservas' con orden estable", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-list-1";
    stateByConversation.set(conversationId, baseThreeReservationState());

    await handleIncomingMessage(msg("mis reservas", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/estas son las reservas/i);
    expect(replyText).toMatch(/1\.\s+RES-OLD-01/i);
    expect(replyText).toMatch(/2\.\s+RES-MID-02/i);
    expect(replyText).toMatch(/3\.\s+RES-NEW-03/i);
  });

  it("usa vocativo conversacional en listado scoped a conversación cuando existe nombre confiable", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-list-conversation-vocative-1";
    stateByConversation.set(conversationId, baseThreeReservationState());
    (getGuest as any).mockResolvedValue({
      guestId: "g1",
      hotelId: "hotel999",
      name: "Marcelo Martinez",
      firstName: "Marcelo",
      aliases: [],
      mode: "automatic",
    });

    await handleIncomingMessage(msg("mis reservas", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/^Marcelo,\s+estas son las reservas de esta conversación:/i);
    expect(replyText).not.toMatch(/este hu[eé]sped|reservas asociadas/i);
    expect(replyText).not.toMatch(/^Raul|^Pedro|^Marcelo Martinez,/i);
  });

  it("en listado scoped a conversación sin nombre confiable no inventa vocativo", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-list-conversation-no-name-1";
    stateByConversation.set(conversationId, baseThreeReservationState());

    await handleIncomingMessage(msg("mis reservas", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/^Estas son las reservas de esta conversación:/i);
    expect(replyText).not.toMatch(/^[A-ZÁÉÍÓÚÑ][^\n]*,\s+estas son las reservas de esta conversación:/i);
    expect(replyText).not.toMatch(/este hu[eé]sped|reservas asociadas/i);
  });

  it("no usa el titular de una reserva como vocativo en listado scoped a conversación", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-list-conversation-holder-1";
    stateByConversation.set(conversationId, baseThreeReservationState({
      reservationHistory: [
        {
          reservationId: "RES-HOLDER-01",
          status: "created",
          createdAt: "2026-03-20T10:00:00.000Z",
          channel: "web",
          guestName: "Oscar Tabarez",
          roomType: "single",
          checkIn: "2026-03-24",
          checkOut: "2026-03-26",
          numGuests: "1",
        },
      ],
      lastReservation: {
        reservationId: "RES-HOLDER-01",
        status: "created",
        createdAt: "2026-03-20T10:00:00.000Z",
        channel: "web",
        guestName: "Oscar Tabarez",
        roomType: "single",
        checkIn: "2026-03-24",
        checkOut: "2026-03-26",
        numGuests: "1",
      },
    }));

    await handleIncomingMessage(msg("mis reservas", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/^Estas son las reservas de esta conversación:/i);
    expect(replyText).toMatch(/a nombre de Oscar Tabarez/i);
    expect(replyText).not.toMatch(/^Oscar Tabarez,/i);
    expect(replyText).not.toMatch(/este hu[eé]sped|reservas asociadas/i);
  });

  it("si la conversación actual no tiene reservas, usa el guest canónico consolidado para listar reservas absorbidas", async () => {
    const sendReply = vi.fn(async () => {});
    const currentConversationId = "conv-ref-list-merged-current-1";
    const absorbedConversationId = "conv-ref-list-merged-absorbed-1";

    stateByConversation.set(currentConversationId, {
      hotelId: "hotel999",
      conversationId: currentConversationId,
      updatedAt: "2026-05-06T12:00:00.000Z",
    });
    stateByConversation.set(absorbedConversationId, {
      hotelId: "hotel999",
      conversationId: absorbedConversationId,
      updatedAt: "2026-05-06T12:01:00.000Z",
      reservationHistory: [
        {
          reservationId: "RES-274B9C",
          status: "created",
          createdAt: "2026-05-01T10:00:00.000Z",
          channel: "web",
          guestName: "Raul Olivera",
          roomType: "double",
          checkIn: "2026-05-07",
          checkOut: "2026-05-08",
          numGuests: "2",
        },
      ],
      lastReservation: {
        reservationId: "RES-274B9C",
        status: "created",
        createdAt: "2026-05-01T10:00:00.000Z",
        channel: "web",
        guestName: "Raul Olivera",
        roomType: "double",
        checkIn: "2026-05-07",
        checkOut: "2026-05-08",
        numGuests: "2",
      },
      salesStage: "close",
      conversationStage: "reservation_confirmed",
    });

    (getGuest as any).mockImplementation(async (_hotelId: string, guestId: string) => {
      if (guestId === "guest-secondary-merged-1") {
        return {
          guestId,
          hotelId: "hotel999",
          tags: ["merged", "merged-into:guest-primary-merged-1"],
          aliases: ["web:guest-secondary-merged-1"],
        };
      }
      if (guestId === "guest-primary-merged-1") {
        return {
          guestId,
          hotelId: "hotel999",
          name: "Geronimo",
          aliases: ["web:guest-secondary-merged-1", "web:guest-primary-merged-1"],
          mode: "automatic",
        };
      }
      return null;
    });
    (findGuestByAnyId as any).mockResolvedValue(null);
    (getConversationsForGuestPerspective as any).mockResolvedValue([
      { conversationId: currentConversationId, hotelId: "hotel999", guestId: "guest-primary-merged-1", channel: "web" },
      { conversationId: absorbedConversationId, hotelId: "hotel999", guestId: "guest-primary-merged-1", channel: "web" },
    ]);

    await handleIncomingMessage(
      {
        ...msg("mostrame mis reservas", currentConversationId),
        guestId: "guest-secondary-merged-1",
      },
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/Geronimo,\s+estas son tus reservas:/i);
    expect(replyText).toMatch(/tus reservas/i);
    expect(replyText).toMatch(/RES-274B9C/i);
    expect(replyText).toMatch(/a nombre de Raul Olivera/i);
    expect(replyText).toMatch(/hu[ée]spedes: 2/i);
    expect(replyText).not.toContain("huésped(es)");
    expect(replyText).not.toContain("huesped(es)");
    expect(replyText).not.toMatch(/este hu[eé]sped/i);
    expect(replyText).not.toMatch(/reservas asociadas/i);
    expect(replyText).not.toMatch(/esta conversación/i);
    expect(replyText).not.toMatch(/^Raul,/i);
  });

  it("con guest consolidado y reservas en WhatsApp + Email lista ambas y deduplica por reservationId", async () => {
    const sendReply = vi.fn(async () => {});
    const currentConversationId = "conv-ref-list-merged-whatsapp-1";
    const emailConversationId = "conv-ref-list-merged-email-1";

    stateByConversation.set(currentConversationId, {
      hotelId: "hotel999",
      conversationId: currentConversationId,
      updatedAt: "2026-06-11T10:00:00.000Z",
      reservationHistory: [
        {
          reservationId: "RES-WA-001",
          status: "created",
          createdAt: "2026-06-01T10:00:00.000Z",
          channel: "whatsapp",
          guestName: "Raul Sanchez",
          roomType: "double",
          checkIn: "2026-06-11",
          checkOut: "2026-06-12",
          numGuests: "2",
        },
      ],
      lastReservation: {
        reservationId: "RES-WA-001",
        status: "created",
        createdAt: "2026-06-01T10:00:00.000Z",
        channel: "whatsapp",
        guestName: "Raul Sanchez",
        roomType: "double",
        checkIn: "2026-06-11",
        checkOut: "2026-06-12",
        numGuests: "2",
      },
      salesStage: "close",
      conversationStage: "reservation_confirmed",
    });
    stateByConversation.set(emailConversationId, {
      hotelId: "hotel999",
      conversationId: emailConversationId,
      updatedAt: "2026-06-11T10:05:00.000Z",
      reservationHistory: [
        {
          reservationId: "RES-EMAIL-002",
          status: "created",
          createdAt: "2026-06-02T09:00:00.000Z",
          channel: "email",
          guestName: "Pedro Picapiedra",
          roomType: "triple",
          checkIn: "2026-06-13",
          checkOut: "2026-06-14",
          numGuests: "3",
        },
        {
          reservationId: "RES-WA-001",
          status: "created",
          createdAt: "2026-06-01T10:00:00.000Z",
          channel: "whatsapp",
          guestName: "Raul Sanchez",
          roomType: "double",
          checkIn: "2026-06-11",
          checkOut: "2026-06-12",
          numGuests: "2",
        },
      ],
      lastReservation: {
        reservationId: "RES-EMAIL-002",
        status: "created",
        createdAt: "2026-06-02T09:00:00.000Z",
        channel: "email",
        guestName: "Pedro Picapiedra",
        roomType: "triple",
        checkIn: "2026-06-13",
        checkOut: "2026-06-14",
        numGuests: "3",
      },
      salesStage: "close",
      conversationStage: "reservation_confirmed",
    });

    (getGuest as any).mockImplementation(async (_hotelId: string, guestId: string) => {
      if (guestId === "guest-whatsapp-merged-1") {
        return {
          guestId,
          hotelId: "hotel999",
          tags: ["merged", "merged-into:guest-canonical-merged-1"],
          aliases: ["whatsapp:+59898835914"],
        };
      }
      if (guestId === "guest-canonical-merged-1") {
        return {
          guestId,
          hotelId: "hotel999",
          name: "Asistencial",
          aliases: ["whatsapp:+59898835914", "email:marcelomst1@gmail.com"],
          mode: "automatic",
        };
      }
      return null;
    });
    (findGuestByAnyId as any).mockResolvedValue(null);
    (getConversationsForGuestPerspective as any).mockResolvedValue([
      { conversationId: currentConversationId, hotelId: "hotel999", guestId: "guest-canonical-merged-1", channel: "whatsapp" },
      { conversationId: emailConversationId, hotelId: "hotel999", guestId: "guest-canonical-merged-1", channel: "email" },
    ]);

    await handleIncomingMessage(
      {
        ...msg("me muestras mis reservas", currentConversationId),
        channel: "whatsapp",
        guestId: "guest-whatsapp-merged-1",
      },
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/Asistencial,\s+estas son tus reservas:/i);
    expect(replyText).toMatch(/tus reservas/i);
    expect(replyText).toMatch(/RES-WA-001/i);
    expect(replyText).toMatch(/RES-EMAIL-002/i);
    expect(replyText).toMatch(/Raul Sanchez/i);
    expect(replyText).toMatch(/Pedro Picapiedra/i);
    expect(replyText).not.toMatch(/este hu[eé]sped/i);
    expect(replyText).not.toMatch(/reservas asociadas/i);
    expect(replyText).not.toMatch(/esta conversación/i);
    expect(replyText.match(/RES-WA-001/g)?.length).toBe(1);
  });

  it("guest-wide reservation list falls back to interlocutor copy without a conversational display name", async () => {
    const sendReply = vi.fn(async () => {});
    const currentConversationId = "conv-ref-list-merged-no-display-name-1";
    const absorbedConversationId = "conv-ref-list-merged-no-display-name-2";

    stateByConversation.set(currentConversationId, {
      hotelId: "hotel999",
      conversationId: currentConversationId,
      updatedAt: "2026-05-06T12:00:00.000Z",
    });
    stateByConversation.set(absorbedConversationId, {
      hotelId: "hotel999",
      conversationId: absorbedConversationId,
      updatedAt: "2026-05-06T12:01:00.000Z",
      reservationHistory: [
        {
          reservationId: "RES-NONAME-01",
          status: "created",
          createdAt: "2026-05-01T10:00:00.000Z",
          channel: "web",
          guestName: "Raul Olivera",
          roomType: "double",
          checkIn: "2026-05-07",
          checkOut: "2026-05-08",
          numGuests: "2",
        },
      ],
      lastReservation: {
        reservationId: "RES-NONAME-01",
        status: "created",
        createdAt: "2026-05-01T10:00:00.000Z",
        channel: "web",
        guestName: "Raul Olivera",
        roomType: "double",
        checkIn: "2026-05-07",
        checkOut: "2026-05-08",
        numGuests: "2",
      },
      salesStage: "close",
      conversationStage: "reservation_confirmed",
    });

    (getGuest as any).mockResolvedValue({
      guestId: "guest-no-display-name-1",
      hotelId: "hotel999",
      aliases: ["web:guest-no-display-name-1"],
      mode: "automatic",
    });
    (findGuestByAnyId as any).mockResolvedValue(null);
    (getConversationsForGuestPerspective as any).mockResolvedValue([
      { conversationId: currentConversationId, hotelId: "hotel999", guestId: "guest-no-display-name-1", channel: "web" },
      { conversationId: absorbedConversationId, hotelId: "hotel999", guestId: "guest-no-display-name-1", channel: "web" },
    ]);

    await handleIncomingMessage(
      {
        ...msg("mostrame mis reservas", currentConversationId),
        guestId: "guest-no-display-name-1",
      },
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/^Estas son tus reservas:/i);
    expect(replyText).toMatch(/tus reservas/i);
    expect(replyText).toMatch(/RES-NONAME-01/i);
    expect(replyText).not.toMatch(/este hu[eé]sped/i);
    expect(replyText).not.toMatch(/reservas asociadas/i);
  });

  it("después de un listado guest-wide consolidado, 'quiero modificar la segunda reserva' usa la misma lista mostrada", async () => {
    const sendReply = vi.fn(async () => {});
    const currentConversationId = "conv-ref-list-merged-modify-second-1";
    const emailConversationId = "conv-ref-list-merged-modify-second-email-1";
    const whatsappConversationId = "conv-ref-list-merged-modify-second-wa-1";

    stateByConversation.set(currentConversationId, {
      hotelId: "hotel999",
      conversationId: currentConversationId,
      updatedAt: "2026-06-16T10:00:00.000Z",
      reservationHistory: [
        {
          reservationId: "RES-DCD7C8",
          status: "created",
          createdAt: "2026-06-14T10:00:00.000Z",
          channel: "web",
          guestName: "Raul Carsoglio",
          roomType: "triple",
          checkIn: "2026-06-17",
          checkOut: "2026-06-20",
          numGuests: "3",
        },
      ],
      lastReservation: {
        reservationId: "RES-DCD7C8",
        status: "created",
        createdAt: "2026-06-14T10:00:00.000Z",
        channel: "web",
        guestName: "Raul Carsoglio",
        roomType: "triple",
        checkIn: "2026-06-17",
        checkOut: "2026-06-20",
        numGuests: "3",
      },
      salesStage: "close",
      conversationStage: "reservation_confirmed",
    });
    stateByConversation.set(emailConversationId, {
      hotelId: "hotel999",
      conversationId: emailConversationId,
      updatedAt: "2026-06-16T10:05:00.000Z",
      reservationHistory: [
        {
          reservationId: "RES-456E82",
          status: "created",
          createdAt: "2026-06-15T10:00:00.000Z",
          channel: "email",
          guestName: "Pep Guardiola",
          roomType: "double",
          checkIn: "2026-06-16",
          checkOut: "2026-06-17",
          numGuests: "2",
        },
      ],
      lastReservation: {
        reservationId: "RES-456E82",
        status: "created",
        createdAt: "2026-06-15T10:00:00.000Z",
        channel: "email",
        guestName: "Pep Guardiola",
        roomType: "double",
        checkIn: "2026-06-16",
        checkOut: "2026-06-17",
        numGuests: "2",
      },
      salesStage: "close",
      conversationStage: "reservation_confirmed",
    });
    stateByConversation.set(whatsappConversationId, {
      hotelId: "hotel999",
      conversationId: whatsappConversationId,
      updatedAt: "2026-06-16T10:06:00.000Z",
      reservationHistory: [
        {
          reservationId: "RES-C040F5",
          status: "created",
          createdAt: "2026-06-16T10:00:00.000Z",
          channel: "whatsapp",
          guestName: "Pedro Picapiedra",
          roomType: "double",
          checkIn: "2026-06-17",
          checkOut: "2026-06-20",
          numGuests: "2",
        },
      ],
      lastReservation: {
        reservationId: "RES-C040F5",
        status: "created",
        createdAt: "2026-06-16T10:00:00.000Z",
        channel: "whatsapp",
        guestName: "Pedro Picapiedra",
        roomType: "double",
        checkIn: "2026-06-17",
        checkOut: "2026-06-20",
        numGuests: "2",
      },
      salesStage: "close",
      conversationStage: "reservation_confirmed",
    });

    (getGuest as any).mockImplementation(async (_hotelId: string, guestId: string) => {
      if (guestId === "guest-canonical-list-modify-1") {
        return {
          guestId,
          hotelId: "hotel999",
          name: "Geronimo",
          aliases: ["web:g1", "email:pep@example.com", "whatsapp:+59898835914"],
          mode: "automatic",
        };
      }
      return null;
    });
    (findGuestByAnyId as any).mockResolvedValue(null);
    (getConversationsForGuestPerspective as any).mockResolvedValue([
      { conversationId: currentConversationId, hotelId: "hotel999", guestId: "guest-canonical-list-modify-1", channel: "web" },
      { conversationId: emailConversationId, hotelId: "hotel999", guestId: "guest-canonical-list-modify-1", channel: "email" },
      { conversationId: whatsappConversationId, hotelId: "hotel999", guestId: "guest-canonical-list-modify-1", channel: "whatsapp" },
    ]);

    await handleIncomingMessage(
      {
        ...msg("mostrame mis reservas", currentConversationId),
        guestId: "g1",
      },
      { mode: "automatic", sendReply }
    );
    await handleIncomingMessage(
      {
        ...msg("quiero modificar la segunda reserva", currentConversationId),
        guestId: "g1",
      },
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/RES-456E82/i);
    expect(replyText).toMatch(/pep guardiola/i);
    expect(replyText).toMatch(/qué te gustaría cambiar|fechas, habitación o cantidad de huéspedes/i);
    expect(replyText).not.toMatch(/ten[eé]s 1 reserva/i);
    expect(replyText).not.toMatch(/no encontr[eé] una reserva segunda/i);
    expect(stateByConversation.get(currentConversationId)?.selectedReservationTarget).toMatchObject({
      reservationId: "RES-456E82",
      source: "ordinal",
    });
  });

  it("después de un listado guest-wide consolidado, 'quiero modificar la última reserva' respeta el orden mostrado", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-list-merged-modify-last-1";
    stateByConversation.set(conversationId, {
      hotelId: "hotel999",
      conversationId,
      updatedAt: "2026-06-16T10:00:00.000Z",
      reservationHistory: [
        {
          reservationId: "RES-DCD7C8",
          status: "created",
          createdAt: "2026-06-14T10:00:00.000Z",
          channel: "web",
          guestName: "Raul Carsoglio",
          roomType: "triple",
          checkIn: "2026-06-17",
          checkOut: "2026-06-20",
          numGuests: "3",
        },
        {
          reservationId: "RES-456E82",
          status: "created",
          createdAt: "2026-06-15T10:00:00.000Z",
          channel: "email",
          guestName: "Pep Guardiola",
          roomType: "double",
          checkIn: "2026-06-16",
          checkOut: "2026-06-17",
          numGuests: "2",
        },
        {
          reservationId: "RES-C040F5",
          status: "created",
          createdAt: "2026-06-16T10:00:00.000Z",
          channel: "whatsapp",
          guestName: "Pedro Picapiedra",
          roomType: "double",
          checkIn: "2026-06-17",
          checkOut: "2026-06-20",
          numGuests: "2",
        },
      ],
      lastReservation: {
        reservationId: "RES-C040F5",
        status: "created",
        createdAt: "2026-06-16T10:00:00.000Z",
        channel: "whatsapp",
        guestName: "Pedro Picapiedra",
        roomType: "double",
        checkIn: "2026-06-17",
        checkOut: "2026-06-20",
        numGuests: "2",
      },
      salesStage: "close",
      conversationStage: "reservation_confirmed",
    });

    await handleIncomingMessage(msg("mis reservas", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("quiero modificar la última reserva", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/RES-C040F5/i);
    expect(replyText).toMatch(/pedro picapiedra/i);
    expect(replyText).not.toMatch(/RES-DCD7C8/i);
    expect(stateByConversation.get(conversationId)?.selectedReservationTarget).toMatchObject({
      reservationId: "RES-C040F5",
      source: "ordinal",
    });
  });

  it("si no hay reservas en la conversación ni en el guest consolidado, responde fallback honesto", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-list-merged-empty-1";
    stateByConversation.set(conversationId, {
      hotelId: "hotel999",
      conversationId,
      updatedAt: "2026-05-06T12:05:00.000Z",
    });

    (getGuest as any).mockResolvedValue({
      guestId: "guest-primary-empty-1",
      hotelId: "hotel999",
      name: "Geronimo",
      aliases: ["web:guest-empty-1"],
      mode: "automatic",
    });
    (findGuestByAnyId as any).mockResolvedValue(null);
    (getConversationsForGuestPerspective as any).mockResolvedValue([
      { conversationId, hotelId: "hotel999", guestId: "guest-primary-empty-1", channel: "web" },
    ]);

    await handleIncomingMessage(msg("mostrame mis reservas", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/Geronimo,\s+no encontr[eé] reservas para mostrarte\./i);
    expect(replyText).not.toMatch(/este hu[eé]sped/i);
    expect(replyText).not.toMatch(/reservas asociadas/i);
    expect(replyText).not.toMatch(/esta conversación/i);
  });

  it("resuelve 'la tercera' después de listar reservas", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-third-1";
    stateByConversation.set(conversationId, baseThreeReservationState());

    await handleIncomingMessage(msg("mis reservas", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("la tercera", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/RES-NEW-03|02\/04\/2026 → 05\/04\/2026|triple/i);
  });

  it("si la tercera no existe pide aclaración segura", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-third-missing-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("la tercera", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/no encontr[eé].*tercera|primera|segunda/i);
  });

  it("si la cuarta no existe no ejecuta cancelación y pide aclaración segura", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-fourth-cancel-missing-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("cancelá la cuarta", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(replyText).toMatch(/no encontr[eé].*cuarta|primera|segunda/i);
    expect(stateByConversation.get(conversationId)?.pendingCancellation ?? null).toBeNull();
  });

  it("si la cuarta no existe no entra en modify", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-fourth-modify-missing-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("modificá la cuarta", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(replyText).toMatch(/no encontr[eé].*cuarta|primera|segunda/i);
    expect(stateByConversation.get(conversationId)?.desiredAction).not.toBe("modify");
  });

  it("con múltiples reservas, 'modificá mi reserva' no ejecuta y pide aclaración", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-ambiguous-modify-my-booking-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("modificá mi reserva", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(replyText).toMatch(/varias reservas|primera|segunda|c[oó]digo/i);
    expect(stateByConversation.get(conversationId)?.modifyState ?? null).toBeNull();
  });

  it("con múltiples reservas, 'cancelá mi reserva' no cancela y pide aclaración", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-ambiguous-cancel-my-booking-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("cancelá mi reserva", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(replyText).toMatch(/varias reservas|primera|segunda|c[oó]digo/i);
  });

  it("después de gating ambiguo, 'la segunda' permite continuar correctamente", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-ambiguous-then-second-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("modificá mi reserva", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("la segunda", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/RES-NEW-02|28\/03\/2026 → 30\/03\/2026|double/i);
  });

  it("con una sola reserva, 'modificá mi reserva' funciona normalmente", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-single-modify-my-booking-1";
    stateByConversation.set(conversationId, baseMultiReservationState({
      reservationHistory: [baseMultiReservationState().reservationHistory[0]],
      lastReservation: baseMultiReservationState().reservationHistory[0],
      activeReservationContext: {
        kind: "reservation",
        reservationId: "RES-OLD-01",
        phase: "confirmed",
        updatedAt: "2026-03-20T10:00:00.000Z",
      },
    }));

    await handleIncomingMessage(msg("modificá mi reserva", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/qu[eé] te gustar[ií]a cambiar|fechas|hu[eé]spedes/i);
  });

  it("permite continuidad segura después de referencia fuera de rango: 'la cuarta' luego 'la segunda'", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-fourth-then-second-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("la cuarta", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("la segunda", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/RES-NEW-02|28\/03\/2026 → 30\/03\/2026|double/i);
  });

  it("marca reservas canceladas como canceladas en el listado", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-list-cancelled-1";
    stateByConversation.set(
      conversationId,
      baseThreeReservationState({
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
            reservationId: "RES-MID-02",
            status: "cancelled",
            createdAt: "2026-03-23T10:00:00.000Z",
            channel: "web",
            guestName: "Marcelo Martinez",
            roomType: "double",
            checkIn: "2026-03-28",
            checkOut: "2026-03-30",
            numGuests: "2",
          },
          {
            reservationId: "RES-NEW-03",
            status: "created",
            createdAt: "2026-03-22T10:00:00.000Z",
            channel: "web",
            guestName: "Marcelo Martinez",
            roomType: "triple",
            checkIn: "2026-04-02",
            checkOut: "2026-04-05",
            numGuests: "3",
          },
        ],
        lastReservation: {
          reservationId: "RES-MID-02",
          status: "cancelled",
          createdAt: "2026-03-23T10:00:00.000Z",
          channel: "web",
          guestName: "Marcelo Martinez",
          roomType: "double",
          checkIn: "2026-03-28",
          checkOut: "2026-03-30",
          numGuests: "2",
        },
      })
    );

    await handleIncomingMessage(msg("mis reservas", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/RES-MID-02.*cancelada/i);
  });

  it("deduplica por reservationId y conserva la versión más reciente como estado canónico", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-canonical-dedupe-1";
    stateByConversation.set(
      conversationId,
      baseMultiReservationState({
        reservationHistory: [
          {
            reservationId: "RES-DUPE-01",
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
            reservationId: "RES-DUPE-01",
            status: "cancelled",
            createdAt: "2026-03-22T10:00:00.000Z",
            channel: "web",
            guestName: "Marcelo Martinez",
            roomType: "single",
            checkIn: "2026-03-24",
            checkOut: "2026-03-26",
            numGuests: "1",
          },
        ],
        lastReservation: {
          reservationId: "RES-DUPE-01",
          status: "cancelled",
          createdAt: "2026-03-22T10:00:00.000Z",
          channel: "web",
          guestName: "Marcelo Martinez",
          roomType: "single",
          checkIn: "2026-03-24",
          checkOut: "2026-03-26",
          numGuests: "1",
        },
      })
    );

    await handleIncomingMessage(msg("mis reservas", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText.match(/RES-DUPE-01/g)?.length).toBe(1);
    expect(replyText).toMatch(/cancelada/i);
  });

  it("ambiguity gating usa solo reservas accionables del estado canónico", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-canonical-actionable-1";
    stateByConversation.set(
      conversationId,
      baseMultiReservationState({
        reservationHistory: [
          {
            reservationId: "RES-ACTIVE-01",
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
            reservationId: "RES-CANCELLED-02",
            status: "cancelled",
            createdAt: "2026-03-22T10:00:00.000Z",
            channel: "web",
            guestName: "Marcelo Martinez",
            roomType: "double",
            checkIn: "2026-03-28",
            checkOut: "2026-03-30",
            numGuests: "2",
          },
        ],
        lastReservation: {
          reservationId: "RES-ACTIVE-01",
          status: "created",
          createdAt: "2026-03-20T10:00:00.000Z",
          channel: "web",
          guestName: "Marcelo Martinez",
          roomType: "single",
          checkIn: "2026-03-24",
          checkOut: "2026-03-26",
          numGuests: "1",
        },
        activeReservationContext: {
          kind: "reservation",
          reservationId: "RES-ACTIVE-01",
          phase: "confirmed",
          updatedAt: "2026-03-20T10:00:00.000Z",
        },
      })
    );

    await handleIncomingMessage(msg("modificá mi reserva", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/qu[eé] te gustar[ií]a cambiar|fechas|hu[eé]spedes/i);
    expect(replyText).not.toMatch(/varias reservas/i);
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
    expect(replyText).toMatch(/antes de aplicar el cambio/i);
    expect(replyText).toMatch(/reserva res-old-01/i);
    expect(replyText).toMatch(/confirm[aá]s estos cambios/i);
    expect(replyText).not.toMatch(/anot[eé] nuevas fechas|confirm[aá]s la reserva/i);
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

  it("persiste subestado de huéspedes y aplica el cambio sin volver al menú genérico", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-guests-substate-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("modificá la primera reserva", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("cambiar huéspedes", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("2 personas", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(replyText).toMatch(/no admite|cambiar a|habitaci[oó]n/i);
    expect(replyText).not.toMatch(/qu[eé] te gustar[ií]a cambiar|nueva cantidad de hu[eé]spedes/i);
    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      activeField: "roomType",
    });
  });

  it("secuencia roomType y huéspedes cuando el pedido de modify trae múltiples campos sin valores y exige preview antes de ejecutar", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-multifield-sequence-1";
    stateByConversation.set(conversationId, baseSingleReservationState());

    await handleIncomingMessage(
      msg("modificá la primera reserva, tipo de habitación y cantidad de huéspedes", conversationId),
      { mode: "automatic", sendReply }
    );

    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/tipo de habitaci[oó]n|qu[eé] tipo/i);
    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      activeField: "roomType",
      pendingFields: ["guests"],
    });

    await handleIncomingMessage(msg("triple", conversationId), { mode: "automatic", sendReply });

    expect(modifyReservation).not.toHaveBeenCalled();
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/cantidad de hu[eé]spedes/i);
    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      activeField: "guests",
      pendingFields: [],
    });

    await handleIncomingMessage(msg("3 personas", conversationId), { mode: "automatic", sendReply });

    const previewReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(previewReply).toMatch(/antes de aplicar el cambio/i);
    expect(previewReply).toMatch(/confirm[aá]s estos cambios/i);
    expect(previewReply).toMatch(/habitaci[oó]n: .*triple/i);
    expect(previewReply).toMatch(/hu[eé]spedes: .*3/i);
    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      awaitingConfirmation: true,
      pendingPatch: expect.objectContaining({
        reservationId: "RES-ONLY-01",
        roomType: "triple",
        numGuests: "3",
      }),
    });

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });

    expect(modifyReservation).toHaveBeenCalledWith(
      "hotel999",
      "RES-ONLY-01",
      expect.objectContaining({
        guestName: "Marcelo Martinez",
        roomType: "triple",
        numGuests: "3",
      }),
      "web"
    );
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/modificada res-only-01/i);
  });

  it("recognizes unaccented composite modify request and keeps guests pending until the guest count is provided", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-composite-unaccented-1";
    stateByConversation.set(conversationId, {
      reservationSlots: {
        guestName: "Pep Guardiola",
        roomType: "double",
        checkIn: "2026-06-18",
        checkOut: "2026-06-20",
        numGuests: "2",
        locale: "es",
      },
      salesStage: "close",
      conversationStage: "reservation_confirmed",
      reservationHistory: [
        {
          reservationId: "RES-2FA6CD",
          status: "created",
          createdAt: "2026-06-10T10:00:00.000Z",
          channel: "web",
          guestName: "Pedro Picapiedra",
          roomType: "double",
          checkIn: "2026-06-18",
          checkOut: "2026-06-20",
          numGuests: "2",
        },
        {
          reservationId: "RES-6AE3E6",
          status: "created",
          createdAt: "2026-06-11T10:00:00.000Z",
          channel: "web",
          guestName: "Raul Carsoglio",
          roomType: "triple",
          checkIn: "2026-06-18",
          checkOut: "2026-06-20",
          numGuests: "3",
        },
        {
          reservationId: "RES-4BCEA9",
          status: "created",
          createdAt: "2026-06-12T10:00:00.000Z",
          channel: "web",
          guestName: "Pep Guardiola",
          roomType: "double",
          checkIn: "2026-06-18",
          checkOut: "2026-06-20",
          numGuests: "2",
        },
      ],
      lastReservation: {
        reservationId: "RES-4BCEA9",
        status: "created",
        createdAt: "2026-06-12T10:00:00.000Z",
        channel: "web",
        guestName: "Pep Guardiola",
        roomType: "double",
        checkIn: "2026-06-18",
        checkOut: "2026-06-20",
        numGuests: "2",
      },
      activeReservationContext: {
        kind: "reservation",
        reservationId: "RES-4BCEA9",
        phase: "confirmed",
        updatedAt: "2026-06-12T10:00:00.000Z",
      },
      updatedAt: "2026-06-12T10:00:00.000Z",
    });

    await handleIncomingMessage(msg("queria modificar la segunda reserva", conversationId), { mode: "automatic", sendReply });
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/RES-6AE3E6/i);

    await handleIncomingMessage(msg("cambiar habitacion y huespedes", conversationId), { mode: "automatic", sendReply });

    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/tipo de habitaci[oó]n|qu[eé] tipo/i);
    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      activeField: "roomType",
      pendingFields: ["guests"],
    });

    await handleIncomingMessage(msg("doble", conversationId), { mode: "automatic", sendReply });

    const afterRoomReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(afterRoomReply).not.toMatch(/reserva actualizada correctamente|modificada/i);
    expect(afterRoomReply).toMatch(/cantidad de hu[eé]spedes/i);
    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      activeField: "guests",
      pendingFields: [],
    });

    await handleIncomingMessage(msg("quiero cambiar a 2 personas", conversationId), { mode: "automatic", sendReply });

    const previewReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(previewReply).toMatch(/antes de aplicar el cambio/i);
    expect(previewReply).toMatch(/reserva res-6ae3e6/i);
    expect(previewReply).toMatch(/habitaci[oó]n: .*triple.*doble|habitaci[oó]n: .*doble/i);
    expect(previewReply).toMatch(/hu[eé]spedes: .*2/i);
    expect(previewReply).not.toMatch(/check-?out|fecha de check-out|um quarto|quer mudar/i);
  });

  it("capacity guard after modify preserves Spanish even if the current turn is detected as Portuguese", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-capacity-language-1";
    stateByConversation.set(conversationId, {
      reservationSlots: {
        guestName: "Raul Carsoglio",
        roomType: "double",
        checkIn: "2026-06-18",
        checkOut: "2026-06-20",
        numGuests: "3",
        locale: "es",
      },
      salesStage: "close",
      conversationStage: "reservation_confirmed",
      activeReservationContext: {
        kind: "reservation",
        reservationId: "RES-6AE3E6",
        phase: "confirmed",
        updatedAt: "2026-06-12T10:00:00.000Z",
      },
      selectedReservationTarget: {
        reservationId: "RES-6AE3E6",
        kind: "confirmed",
        source: "active_focus",
        resolutionMode: "weak",
        resolvedAt: "2026-06-12T10:00:00.000Z",
      },
      modifyState: {
        activeField: "guests",
        pendingFields: [],
        updatedAt: "2026-06-12T10:00:00.000Z",
      },
      lastCategory: "modify_reservation",
      updatedAt: "2026-06-12T10:00:00.000Z",
    });

    await handleIncomingMessage(
      {
        ...msg("4 personas", conversationId),
        detectedLanguage: "pt",
      },
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/una habitaci[oó]n doble no admite 4 hu[eé]sped/i);
    expect(replyText).not.toMatch(/um quarto|quer mudar|h[oó]spede/i);
    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      activeField: "roomType",
    });
  });

  it("muestra preview con reservationId cuando el mismo turno trae roomType y huéspedes", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-direct-id-payload-1";
    stateByConversation.set(conversationId, baseSingleReservationState());

    await handleIncomingMessage(
      msg("modificá RES-ONLY-01 a triple para 3 personas", conversationId),
      { mode: "automatic", sendReply }
    );

    const previewReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(previewReply).toMatch(/antes de aplicar el cambio/i);
    expect(previewReply).toMatch(/reserva res-only-01/i);
    expect(previewReply).toMatch(/confirm[aá]s estos cambios/i);
    expect(previewReply).not.toMatch(/qu[eé] te gustar[ií]a cambiar|c[oó]digo de reserva/i);
  });

  it.each([
    "codigo RES-403A89",
    "código RES-403A89",
    "RES-403A89",
  ])("recover modify ambiguity by reservationId with %s", async (content) => {
    const sendReply = vi.fn(async () => {});
    const conversationId = `conv-ref-modify-code-recovery-${content.replace(/\W+/g, "-").toLowerCase()}`;
    stateByConversation.set(conversationId, baseAmbiguousModifyState());

    await handleIncomingMessage(msg("Quiero cambiar una reserva", conversationId), { mode: "automatic", sendReply });

    const firstReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(firstReply).toMatch(/varias reservas|cu[aá]l quer[eé]s modificar|c[oó]digo/i);
    expect(stateByConversation.get(conversationId)?.lastCategory).toBe("modify_reservation");

    await handleIncomingMessage(msg(content, conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/RES-403A89/i);
    expect(replyText).toMatch(/Ok, vamos a modificar esta reserva|Podemos modificar tu reserva confirmada/i);
    expect(replyText).toMatch(/Laura Gómez/i);
    expect(replyText).toMatch(/qué te gustaría cambiar|cambiar fechas|cambiar habitación|cambiar huéspedes/i);
    expect(replyText).not.toMatch(/¿En qué puedo ayudarte\?|fallback/i);
    expect(stateByConversation.get(conversationId)?.selectedReservationTarget).toMatchObject({
      reservationId: "RES-403A89",
    });
    expect(stateByConversation.get(conversationId)?.modifyState ?? null).toBeNull();
  });

  it("rejects unknown reservationId during modify ambiguity recovery", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-code-unknown-1";
    stateByConversation.set(conversationId, baseAmbiguousModifyState());

    await handleIncomingMessage(msg("Quiero cambiar una reserva", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("codigo RES-NOEXISTE", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/no encontr[eé].*c[oó]digo|otro c[oó]digo|primera, segunda o tercera/i);
    expect(replyText).not.toMatch(/¿En qu[eé] puedo ayudarte\?/i);
    expect(stateByConversation.get(conversationId)?.lastCategory).toBe("modify_reservation");
  });

  it("rejects cancelled reservationId during modify ambiguity recovery", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-code-cancelled-1";
    stateByConversation.set(
      conversationId,
      baseAmbiguousModifyState({
        reservationHistory: [
          {
            reservationId: "RES-6543E5",
            status: "created",
            createdAt: "2026-08-01T10:00:00.000Z",
            channel: "web",
            guestName: "Martín Pérez",
            roomType: "simple",
            checkIn: "2026-08-20",
            checkOut: "2026-08-22",
            numGuests: "1",
          },
          {
            reservationId: "RES-CANCEL-01",
            status: "cancelled",
            createdAt: "2026-08-03T10:00:00.000Z",
            channel: "web",
            guestName: "Laura Gómez",
            roomType: "double",
            checkIn: "2026-08-15",
            checkOut: "2026-08-17",
            numGuests: "2",
          },
        ],
        lastReservation: {
          reservationId: "RES-CANCEL-01",
          status: "cancelled",
          createdAt: "2026-08-03T10:00:00.000Z",
          channel: "web",
          guestName: "Laura Gómez",
          roomType: "double",
          checkIn: "2026-08-15",
          checkOut: "2026-08-17",
          numGuests: "2",
        },
        activeReservationContext: {
          kind: "reservation",
          reservationId: "RES-CANCEL-01",
          phase: "cancelled",
          updatedAt: "2026-08-03T10:00:00.000Z",
        },
      })
    );

    await handleIncomingMessage(msg("Quiero cambiar una reserva", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("RES-CANCEL-01", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/no encuentro una reserva activa para aplicar esa modificación|no encuentro una reserva activa/i);
    expect(replyText).not.toMatch(/¿En qu[eé] puedo ayudarte\?/i);
    expect(stateByConversation.get(conversationId)?.lastCategory).toBe("modify_reservation");
  });

  it("muestra preview con ordinal cuando el mismo turno trae roomType, huéspedes y fechas", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-direct-ordinal-payload-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(
      msg("modificá la segunda reserva a triple para 3 personas del 29/03/2026 al 31/03/2026", conversationId),
      { mode: "automatic", sendReply }
    );

    const previewReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(previewReply).toMatch(/antes de aplicar el cambio/i);
    expect(previewReply).toMatch(/reserva res-new-02/i);
    expect(previewReply).toMatch(/fechas: .*29\/03\/2026.*31\/03\/2026/i);
    expect(previewReply).not.toMatch(/qu[eé] te gustar[ií]a cambiar|c[oó]digo de reserva/i);
  });

  it("persiste subestado de fechas y mantiene continuidad sin volver al menú genérico", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-dates-substate-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("modificá la primera reserva", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("cambiar fechas", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("25/03/2026 al 27/03/2026", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(replyText).toMatch(/antes de aplicar el cambio/i);
    expect(replyText).toMatch(/fechas: 24\/03\/2026.*26\/03\/2026.*25\/03\/2026.*27\/03\/2026/i);
    expect(replyText).toMatch(/confirm[aá]s estos cambios/i);
    expect(replyText).not.toMatch(/anot[eé] nuevas fechas|confirm[aá]s la reserva/i);
    expect(replyText).not.toMatch(/qu[eé] cambio aplico|qu[eé] te gustar[ií]a cambiar/i);
    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      awaitingConfirmation: true,
      pendingPatch: expect.objectContaining({
        reservationId: "RES-OLD-01",
        checkIn: "2026-03-25",
        checkOut: "2026-03-27",
      }),
    });
  });

  it("persiste modify al abrir el menú y cierra fechas con 'ingreso el jueves' + 'el domingo'", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-dates-entry-1";
    stateByConversation.set(conversationId, baseSingleReservationState());
    process.env.USE_CHRONO_LAYER = "1";
    (globalThis as any).__chronoImport = async () => ({
      es: {
        parse: (text: string) => /\bjueves\b/i.test(text)
          ? [{ start: { date: () => new Date("2026-04-16T00:00:00.000Z") } }]
          : /\bdomingo\b/i.test(text)
            ? [{ start: { date: () => new Date("2026-04-19T00:00:00.000Z") } }]
          : [],
      },
    });

    await handleIncomingMessage(msg("quiero cambiar mi reserva", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("ingreso el jueves", conversationId), { mode: "automatic", sendReply });

    const partialReplyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(partialReplyText).toMatch(/check-out|fecha de check-out|salida/i);
    expect(partialReplyText).not.toMatch(/nueva fecha de check-in/i);

    await handleIncomingMessage(msg("el domingo", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/antes de aplicar el cambio/i);
    expect(replyText).toMatch(/fechas: 28\/03\/2026.*30\/03\/2026.*16\/04\/2026.*19\/04\/2026/i);
    expect(replyText).not.toMatch(/anot[eé] nuevas fechas/i);
    expect(replyText).not.toMatch(/verifique disponibilidad|posibles diferencias/i);
    expect(replyText).not.toMatch(/confirm[aá]s la reserva/i);
    expect(replyText).not.toMatch(/check-out|fecha de check-out|salida/i);
    expect(replyText).not.toMatch(/qu[eé] te gustar[ií]a cambiar|cambiar hu[eé]spedes|cambiar habitaci[oó]n/i);
    expect(stateByConversation.get(conversationId)?.reservationSlots).toMatchObject({
      checkIn: "2026-04-16",
      checkOut: "2026-04-19",
    });
  });

  it("consume 'el domingo' como check-out contextual cuando modify.dates ya tiene check-in parcial", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-dates-entry-contextual-1";
    stateByConversation.set(conversationId, baseMultiReservationState({
      reservationSlots: {
        ...baseMultiReservationState().reservationSlots,
        checkIn: "2026-04-16",
        checkOut: undefined,
      },
      modifyState: { activeField: "dates", updatedAt: "2026-04-10T10:00:00.000Z" },
      conversationFocus: { domain: "reservation", subFlow: "modify", active: true, updatedAt: "2026-04-10T10:00:00.000Z" },
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
    }));
    process.env.USE_CHRONO_LAYER = "1";
    (globalThis as any).__chronoImport = async () => ({
      es: {
        parse: (text: string) => /\bdomingo\b/i.test(text)
          ? [{ start: { date: () => new Date("2026-04-19T00:00:00.000Z") } }]
          : [],
      },
    });

    await handleIncomingMessage(msg("el domingo", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/antes de aplicar el cambio/i);
    expect(replyText).not.toMatch(/anot[eé] nuevas fechas/i);
    expect(replyText).not.toMatch(/verifique disponibilidad|posibles diferencias/i);
    expect(replyText).not.toMatch(/confirm[aá]s la reserva/i);
    expect(replyText).not.toMatch(/check-out|fecha de check-out|salida/i);
    expect(stateByConversation.get(conversationId)?.reservationSlots).toMatchObject({
      checkIn: "2026-04-16",
      checkOut: "2026-04-19",
    });
  });

  it("modify dates muestra preview único sin confirmación intermedia de disponibilidad", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-dates-preview-single-confirm-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("quiero alterar la primera", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("cambiar fechas", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("21/06/2026 al 22/06/2026", conversationId), { mode: "automatic", sendReply });

    const previewReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(previewReply).toMatch(/antes de aplicar el cambio/i);
    expect(previewReply).toMatch(/confirm[aá]s estos cambios/i);
    expect(previewReply).toMatch(/24\/03\/2026.*26\/03\/2026.*21\/06\/2026.*22\/06\/2026/i);
    expect(previewReply).not.toMatch(/anot[eé] nuevas fechas/i);
    expect(previewReply).not.toMatch(/verifique disponibilidad|posibles diferencias/i);
    expect(previewReply).not.toMatch(/confirm[aá]s la reserva/i);
    expect(previewReply).not.toMatch(/reserva actualizada correctamente/i);
    expect(modifyReservation).not.toHaveBeenCalled();

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });

    expect(modifyReservation).toHaveBeenCalledWith(
      "hotel999",
      "RES-OLD-01",
      expect.objectContaining({
        checkIn: "2026-06-21",
        checkOut: "2026-06-22",
      }),
      "web"
    );
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/reserva actualizada correctamente|modificada/i);
  });

  it("consume '18/4/2026' como check-out contextual cuando modify.dates ya espera la salida", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-dates-entry-structured-1";
    stateByConversation.set(conversationId, baseMultiReservationState({
      reservationSlots: {
        ...baseMultiReservationState().reservationSlots,
        checkIn: "2026-04-16",
        checkOut: undefined,
      },
      modifyState: { activeField: "dates", updatedAt: "2026-04-10T10:00:00.000Z" },
      conversationFocus: { domain: "reservation", subFlow: "modify", active: true, updatedAt: "2026-04-10T10:00:00.000Z" },
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
    }));

    await handleIncomingMessage(msg("18/4/2026", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/antes de aplicar el cambio/i);
    expect(replyText).toMatch(/fechas: 28\/03\/2026.*30\/03\/2026.*16\/04\/2026.*18\/04\/2026/i);
    expect(replyText).toMatch(/confirm[aá]s estos cambios/i);
    expect(replyText).not.toMatch(/anot[eé] nuevas fechas/i);
    expect(replyText).not.toMatch(/confirm[aá]s la reserva/i);
    expect(replyText).not.toMatch(/check-out|fecha de check-out|salida/i);
    expect(stateByConversation.get(conversationId)?.reservationSlots).toMatchObject({
      checkIn: "2026-04-16",
      checkOut: "2026-04-18",
    });
  });

  it("mantiene continuidad en modify.dates después de un lateral FAQ y retoma desde el faltante real", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-dates-lateral-continuity-1";
    stateByConversation.set(conversationId, baseSingleReservationState());
    process.env.USE_CHRONO_LAYER = "1";
    (globalThis as any).__chronoImport = async () => ({
      es: {
        parse: (text: string) => /\bjueves\b/i.test(text)
          ? [{ start: { date: () => new Date("2026-04-16T00:00:00.000Z") } }]
          : /\bdomingo\b/i.test(text)
            ? [{ start: { date: () => new Date("2026-04-19T00:00:00.000Z") } }]
            : [],
      },
    });

    await handleIncomingMessage(msg("quiero cambiar mi reserva", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("ingreso el jueves", conversationId), { mode: "automatic", sendReply });

    expect(stateByConversation.get(conversationId)).toMatchObject({
      modifyState: { activeField: "dates" },
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      conversationFocus: { subFlow: "modify", active: true },
      reservationSlots: { checkIn: "2026-04-16", checkOut: undefined },
    });
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/check-out|fecha de check-out|salida/i);

    await handleIncomingMessage(msg("¿el desayuno está incluido?", conversationId), { mode: "automatic", sendReply });

    const faqReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(faqReply).toMatch(/desayuno|incluido|tarifa/i);
    expect(stateByConversation.get(conversationId)).toMatchObject({
      modifyState: { activeField: "dates" },
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      conversationFocus: { subFlow: "modify", active: true },
      reservationSlots: { checkIn: "2026-04-16", checkOut: undefined },
    });

    await handleIncomingMessage(msg("sí, continuar", conversationId), { mode: "automatic", sendReply });

    const continueReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(continueReply).toMatch(/check-out|fecha de check-out|salida/i);
    expect(continueReply).not.toMatch(/nuevo check-in y check-out|qu[eé] cambio aplico|qu[eé] te gustar[ií]a cambiar/i);

    await handleIncomingMessage(msg("el domingo", conversationId), { mode: "automatic", sendReply });

    const finalReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(finalReply).toMatch(/antes de aplicar el cambio/i);
    expect(finalReply).toMatch(/fechas: 28\/03\/2026.*30\/03\/2026.*16\/04\/2026.*19\/04\/2026/i);
    expect(finalReply).toMatch(/confirm[aá]s estos cambios/i);
    expect(finalReply).not.toMatch(/anot[eé] nuevas fechas/i);
    expect(finalReply).not.toMatch(/confirm[aá]s la reserva/i);
    expect(finalReply).not.toMatch(/check-out|fecha de check-out|salida/i);
    expect(stateByConversation.get(conversationId)?.reservationSlots).toMatchObject({
      checkIn: "2026-04-16",
      checkOut: "2026-04-19",
    });
  });

  it("reancla 'domingo' al primer domingo posterior al check-in parcial en modify.dates", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-dates-context-anchor-sunday-1";
    stateByConversation.set(conversationId, baseMultiReservationState({
      reservationSlots: {
        ...baseMultiReservationState().reservationSlots,
        checkIn: "2026-04-23",
        checkOut: undefined,
      },
      modifyState: { activeField: "dates", updatedAt: "2026-04-10T10:00:00.000Z" },
      conversationFocus: { domain: "reservation", subFlow: "modify", active: true, updatedAt: "2026-04-10T10:00:00.000Z" },
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
    }));
    process.env.USE_CHRONO_LAYER = "1";
    (globalThis as any).__chronoImport = async () => ({
      es: {
        parse: (text: string) => /\bdomingo\b/i.test(text)
          ? [{ start: { date: () => new Date("2026-04-19T00:00:00.000Z") } }]
          : [],
      },
    });

    await handleIncomingMessage(msg("el domingo", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/antes de aplicar el cambio/i);
    expect(replyText).toMatch(/fechas: 28\/03\/2026.*30\/03\/2026.*23\/04\/2026.*26\/04\/2026/i);
    expect(replyText).toMatch(/confirm[aá]s estos cambios/i);
    expect(replyText).not.toMatch(/anot[eé] nuevas fechas/i);
    expect(stateByConversation.get(conversationId)?.reservationSlots).toMatchObject({
      checkIn: "2026-04-23",
      checkOut: "2026-04-26",
    });
  });

  it("reancla 'lunes' al primer lunes posterior al check-in parcial en modify.dates", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-dates-context-anchor-monday-1";
    stateByConversation.set(conversationId, baseMultiReservationState({
      reservationSlots: {
        ...baseMultiReservationState().reservationSlots,
        checkIn: "2026-04-24",
        checkOut: undefined,
      },
      modifyState: { activeField: "dates", updatedAt: "2026-04-10T10:00:00.000Z" },
      conversationFocus: { domain: "reservation", subFlow: "modify", active: true, updatedAt: "2026-04-10T10:00:00.000Z" },
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
    }));
    process.env.USE_CHRONO_LAYER = "1";
    (globalThis as any).__chronoImport = async () => ({
      es: {
        parse: (text: string) => /\blunes\b/i.test(text)
          ? [{ start: { date: () => new Date("2026-04-20T00:00:00.000Z") } }]
          : [],
      },
    });

    await handleIncomingMessage(msg("el lunes", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/antes de aplicar el cambio/i);
    expect(replyText).toMatch(/fechas: 28\/03\/2026.*30\/03\/2026.*24\/04\/2026.*27\/04\/2026/i);
    expect(replyText).toMatch(/confirm[aá]s estos cambios/i);
    expect(replyText).not.toMatch(/anot[eé] nuevas fechas/i);
    expect(stateByConversation.get(conversationId)?.reservationSlots).toMatchObject({
      checkIn: "2026-04-24",
      checkOut: "2026-04-27",
    });
  });

  it("no reancla fechas explícitas y mantiene los casos existentes de modify.dates", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-dates-context-anchor-explicit-1";
    stateByConversation.set(conversationId, baseMultiReservationState({
      reservationSlots: {
        ...baseMultiReservationState().reservationSlots,
        checkIn: "2026-04-23",
        checkOut: undefined,
      },
      modifyState: { activeField: "dates", updatedAt: "2026-04-10T10:00:00.000Z" },
      conversationFocus: { domain: "reservation", subFlow: "modify", active: true, updatedAt: "2026-04-10T10:00:00.000Z" },
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
    }));

    await handleIncomingMessage(msg("18/4/2026", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/antes de aplicar el cambio/i);
    expect(replyText).toMatch(/fechas: 28\/03\/2026.*30\/03\/2026.*23\/04\/2026.*18\/04\/2026/i);
    expect(replyText).toMatch(/confirm[aá]s estos cambios/i);
    expect(replyText).not.toMatch(/anot[eé] nuevas fechas/i);
    expect(stateByConversation.get(conversationId)?.reservationSlots).toMatchObject({
      checkIn: "2026-04-23",
      checkOut: "2026-04-18",
    });
  });

  it("corrige el check-out en modify.dates con 'no, quise decir el martes' sin perder el check-in", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-dates-correction-direct-1";
    stateByConversation.set(conversationId, baseMultiReservationState({
      reservationSlots: {
        ...baseMultiReservationState().reservationSlots,
        checkIn: "2026-04-23",
        checkOut: "2026-04-26",
      },
      modifyState: { activeField: "dates", updatedAt: "2026-04-10T10:00:00.000Z" },
      conversationFocus: { domain: "reservation", subFlow: "modify", active: true, updatedAt: "2026-04-10T10:00:00.000Z" },
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
    }));
    process.env.USE_CHRONO_LAYER = "1";
    (globalThis as any).__chronoImport = async () => ({
      es: {
        parse: (text: string) => /\bmartes\b/i.test(text)
          ? [{ start: { date: () => new Date("2026-04-21T00:00:00.000Z") } }]
          : [],
      },
    });

    await handleIncomingMessage(msg("no, quise decir el martes", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/antes de aplicar el cambio/i);
    expect(replyText).toMatch(/fechas: 28\/03\/2026.*30\/03\/2026.*23\/04\/2026.*28\/04\/2026/i);
    expect(replyText).toMatch(/confirm[aá]s estos cambios/i);
    expect(replyText).not.toMatch(/anot[eé] nuevas fechas/i);
    expect(replyText).not.toMatch(/confirm[aá]s la reserva/i);
    expect(replyText).not.toMatch(/check-in y check-out|fecha de check-out|salida/i);
    expect(stateByConversation.get(conversationId)?.reservationSlots).toMatchObject({
      checkIn: "2026-04-23",
      checkOut: "2026-04-28",
    });
  });

  it("corrige el check-out en modify.dates con 'perdón, el martes' sin requerir 'no' explícito", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-dates-correction-soft-1";
    stateByConversation.set(conversationId, baseMultiReservationState({
      reservationSlots: {
        ...baseMultiReservationState().reservationSlots,
        checkIn: "2026-04-23",
        checkOut: "2026-04-26",
      },
      modifyState: { activeField: "dates", updatedAt: "2026-04-10T10:00:00.000Z" },
      conversationFocus: { domain: "reservation", subFlow: "modify", active: true, updatedAt: "2026-04-10T10:00:00.000Z" },
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
    }));
    process.env.USE_CHRONO_LAYER = "1";
    (globalThis as any).__chronoImport = async () => ({
      es: {
        parse: (text: string) => /\bmartes\b/i.test(text)
          ? [{ start: { date: () => new Date("2026-04-21T00:00:00.000Z") } }]
          : [],
      },
    });

    await handleIncomingMessage(msg("perdón, el martes", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/antes de aplicar el cambio/i);
    expect(replyText).toMatch(/fechas: 28\/03\/2026.*30\/03\/2026.*23\/04\/2026.*28\/04\/2026/i);
    expect(replyText).toMatch(/confirm[aá]s estos cambios/i);
    expect(replyText).not.toMatch(/anot[eé] nuevas fechas/i);
    expect(stateByConversation.get(conversationId)?.reservationSlots).toMatchObject({
      checkIn: "2026-04-23",
      checkOut: "2026-04-28",
    });
  });

  it("no corrige slots en modify.dates cuando no hay marcador conversacional de corrección", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-dates-correction-guard-1";
    stateByConversation.set(conversationId, baseMultiReservationState({
      reservationSlots: {
        ...baseMultiReservationState().reservationSlots,
        checkIn: "2026-04-23",
        checkOut: "2026-04-26",
      },
      modifyState: { activeField: "dates", updatedAt: "2026-04-10T10:00:00.000Z" },
      conversationFocus: { domain: "reservation", subFlow: "modify", active: true, updatedAt: "2026-04-10T10:00:00.000Z" },
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
    }));
    process.env.USE_CHRONO_LAYER = "1";
    (globalThis as any).__chronoImport = async () => ({
      es: {
        parse: (text: string) => /\bmartes\b/i.test(text)
          ? [{ start: { date: () => new Date("2026-04-21T00:00:00.000Z") } }]
          : [],
      },
    });

    await handleIncomingMessage(msg("el martes", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/anot[eé] nuevas fechas|verifique disponibilidad|posibles diferencias/i);
    expect(stateByConversation.get(conversationId)?.reservationSlots).toMatchObject({
      checkIn: "2026-04-23",
      checkOut: "2026-04-26",
    });
  });

  it("no aplica la corrección de modify.dates cuando el flujo activo es create", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-dates-correction-create-guard-1";
    stateByConversation.set(conversationId, {
      reservationSlots: {
        guestName: "Marcelo Martinez",
        checkIn: "2026-04-23",
        checkOut: "2026-04-26",
        numGuests: "2",
      },
      salesStage: "quote",
      conversationStage: "reservation_in_progress",
      activeFlow: "create_reservation",
      desiredAction: "create",
      conversationFocus: { domain: "reservation", subFlow: "create", active: true, updatedAt: "2026-04-10T10:00:00.000Z" },
      updatedAt: "2026-04-10T10:00:00.000Z",
    });
    process.env.USE_CHRONO_LAYER = "1";
    (globalThis as any).__chronoImport = async () => ({
      es: {
        parse: (text: string) => /\bmartes\b/i.test(text)
          ? [{ start: { date: () => new Date("2026-04-21T00:00:00.000Z") } }]
          : [],
      },
    });

    await handleIncomingMessage(msg("perdón, el martes", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/anot[eé] nuevas fechas|verifique disponibilidad|posibles diferencias/i);
    expect(stateByConversation.get(conversationId)?.activeFlow).toBe("create_reservation");
    expect(stateByConversation.get(conversationId)?.modifyState).toBeUndefined();
  });

  it("entra por relato largo a modify.dates y evita el menú genérico", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-dates-entry-2";
    stateByConversation.set(conversationId, baseMultiReservationState());
    process.env.USE_CHRONO_LAYER = "1";
    (globalThis as any).__chronoImport = async () => ({
      es: {
        parse: (text: string) => /\bjueves\b/i.test(text)
          ? [{ start: { date: () => new Date("2026-03-26T00:00:00.000Z") } }]
          : /\bmañana\b/i.test(text)
            ? [{ start: { date: () => new Date("2026-03-24T00:00:00.000Z") } }]
            : [],
      },
    });

    await handleIncomingMessage(msg("modificá la primera reserva", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(
      msg("Tengo una reserva registrada para mañana pero recién podría llegar el jueves, ¿será que se puede cambiar?", conversationId),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/check-out|fecha de check-out|salida/i);
    expect(replyText).not.toMatch(/nueva fecha de check-in/i);
    expect(replyText).not.toMatch(/qu[eé] te gustar[ií]a cambiar|cambiar hu[eé]spedes|cambiar habitaci[oó]n/i);
    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      activeField: "dates",
    });
  });

  it("mantiene continuidad de target en modify hasta la confirmación final y no crea una reserva nueva", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-execution-integrity-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("quiero cambiar mi reserva", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("la segunda", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("cambiame la fecha", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("10/04/2026 a 12/04/2026", conversationId), { mode: "automatic", sendReply });

    const previewReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(askAvailability).toHaveBeenCalledWith(
      "hotel999",
      expect.objectContaining({
        guestName: "Marcelo Martinez",
        roomType: "double",
        numGuests: "2",
        checkIn: "2026-04-10",
        checkOut: "2026-04-12",
      })
    );
    expect(previewReply).toMatch(/antes de aplicar el cambio/i);
    expect(previewReply).toMatch(/confirm[aá]s estos cambios/i);
    expect(previewReply).toMatch(/tarifa por noche|disponible/i);
    expect(previewReply).toMatch(/disponibilidad: .*disponible/i);
    expect(previewReply).not.toMatch(/- tengo .* disponible/i);
    expect(previewReply).not.toMatch(/anot[eé] nuevas fechas/i);
    expect(previewReply).not.toMatch(/confirm[aá]s la reserva/i);
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(stateByConversation.get(conversationId)?.conversationFocus).toMatchObject({ subFlow: "modify" });
    expect(stateByConversation.get(conversationId)?.lastCategory).toBe("modify_reservation");
    expect(stateByConversation.get(conversationId)?.selectedReservationTarget).toMatchObject({ reservationId: "RES-NEW-02" });

    await handleIncomingMessage(msg("confirmar", conversationId), { mode: "automatic", sendReply });

    expect(confirmAndCreate).not.toHaveBeenCalled();
    expect(modifyReservation).toHaveBeenCalledWith(
      "hotel999",
      "RES-NEW-02",
      expect.objectContaining({
        guestName: "Marcelo Martinez",
        roomType: "double",
        numGuests: "2",
        checkIn: "2026-04-10",
        checkOut: "2026-04-12",
      }),
      "web"
    );
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/modificada res-new-02/i);
    expect(stateByConversation.get(conversationId)?.selectedReservationTarget).toMatchObject({ reservationId: "RES-NEW-02" });
    expect(stateByConversation.get(conversationId)?.lastReservation).toMatchObject({
      reservationId: "RES-NEW-02",
      status: "updated",
      roomType: "double",
      numGuests: "2",
      checkIn: "2026-04-10",
      checkOut: "2026-04-12",
    });
  });

  it("no ejecuta modify si el usuario rechaza el preview", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-preview-reject-1";
    stateByConversation.set(conversationId, baseSingleReservationState());

    await handleIncomingMessage(
      msg("modificá RES-ONLY-01 a triple para 3 personas", conversationId),
      { mode: "automatic", sendReply }
    );

    expect(modifyReservation).not.toHaveBeenCalled();
    await handleIncomingMessage(msg("no", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(replyText).toMatch(/no apliqu[eé] cambios|sigue igual/i);
    expect(stateByConversation.get(conversationId)?.modifyState ?? null).toBeNull();
  });

  it("permite corregir el patch antes de confirmar y refresca el preview", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-preview-correction-1";
    stateByConversation.set(conversationId, baseSingleReservationState());

    await handleIncomingMessage(
      msg("modificá RES-ONLY-01 a triple para 3 personas", conversationId),
      { mode: "automatic", sendReply }
    );
    expect(modifyReservation).not.toHaveBeenCalled();

    await handleIncomingMessage(msg("mejor para 2 personas", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(replyText).toMatch(/antes de aplicar el cambio/i);
    expect(replyText).not.toMatch(/hu[eé]spedes:/i);
    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      awaitingConfirmation: true,
      pendingPatch: expect.objectContaining({
        reservationId: "RES-ONLY-01",
        roomType: "triple",
      }),
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
    expect(replyText).toMatch(/antes de aplicar el cambio/i);
    expect(replyText).toMatch(/reserva res-new-03/i);
    expect(replyText).toMatch(/fechas: .*31\/03\/2026.*02\/04\/2026/i);
    expect(replyText).toMatch(/confirm[aá]s estos cambios/i);
    expect(replyText).not.toMatch(/anot[eé] nuevas fechas|confirm[aá]s la reserva/i);
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

  it("mantiene continuidad post-listado: 'mis reservas' + 'mostrame la segunda' + 'cancelá esa'", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-list-followup-cancel-1";
    stateByConversation.set(conversationId, baseThreeReservationState());

    await handleIncomingMessage(msg("mis reservas", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("mostrame la segunda", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("cancelá esa", conversationId), { mode: "automatic", sendReply });

    expect(stateByConversation.get(conversationId)?.pendingCancellation).toMatchObject({
      reservationId: "RES-MID-02",
      awaitingConfirmation: true,
    });
  });

  it("refleja cancelación confirmada en el estado canónico y en el snapshot posterior", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-cancel-integrity-1";
    stateByConversation.set(conversationId, baseThreeReservationState());

    await handleIncomingMessage(msg("mostrame la segunda", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("cancelá esa", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("confirmar", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("mis reservas", conversationId), { mode: "automatic", sendReply });

    const st = stateByConversation.get(conversationId);
    const cancelledRecords = (st?.reservationHistory || []).filter((item: any) => item?.reservationId === "RES-MID-02");
    expect(cancelReservation).toHaveBeenCalledWith("hotel999", "RES-MID-02");
    expect(cancelledRecords).toHaveLength(1);
    expect(cancelledRecords[0]).toMatchObject({
      reservationId: "RES-MID-02",
      status: "cancelled",
    });
    expect(st?.lastReservation).toMatchObject({
      reservationId: "RES-MID-02",
      status: "cancelled",
    });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/RES-MID-02 .*cancelada/i);
    expect(replyText).not.toMatch(/RES-MID-02 .*activa/i);
  });

  it("snapshot post-cancel no mezcla datos entre reservas", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-cancel-snapshot-consistency-1";
    stateByConversation.set(conversationId, {
      reservationSlots: {
        guestName: "Raul Olivera",
        roomType: "double",
        checkIn: "2026-06-01",
        checkOut: "2026-06-05",
        numGuests: "2",
      },
      reservationHistory: [
        {
          reservationId: "RES-A1",
          status: "created",
          createdAt: "2026-03-20T10:00:00.000Z",
          channel: "web",
          guestName: "Marcelo Martinez",
          roomType: "single",
          checkIn: "2026-05-01",
          checkOut: "2026-05-05",
          numGuests: "1",
        },
        {
          reservationId: "RES-B2",
          status: "created",
          createdAt: "2026-03-21T10:00:00.000Z",
          channel: "web",
          guestName: "Raul Olivera",
          roomType: "double",
          checkIn: "2026-06-01",
          checkOut: "2026-06-05",
          numGuests: "2",
        },
      ],
      lastReservation: {
        reservationId: "RES-B2",
        status: "created",
        createdAt: "2026-03-21T10:00:00.000Z",
        channel: "web",
        guestName: "Raul Olivera",
        roomType: "double",
        checkIn: "2026-06-01",
        checkOut: "2026-06-05",
        numGuests: "2",
      },
      activeReservationContext: {
        kind: "reservation",
        reservationId: "RES-B2",
        phase: "confirmed",
        updatedAt: "2026-03-21T10:00:00.000Z",
      },
      updatedAt: "2026-03-21T10:00:00.000Z",
    });

    await handleIncomingMessage(msg("cancelá RES-A1", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("confirmar", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("mostrame esa", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/RES-A1/i);
    expect(replyText).toMatch(/Marcelo Martinez/i);
    expect(replyText).toMatch(/01\/05\/2026 → 05\/05\/2026/i);
    expect(replyText).not.toMatch(/Raul Olivera|01\/06\/2026 → 05\/06\/2026/i);
  });

  it("snapshot follow-up usa el titular canónico de la reserva seleccionada y no el guestName del draft activo", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-canonical-holder-snapshot-1";
    stateByConversation.set(conversationId, {
      reservationSlots: {
        guestName: "Ana Draft",
        roomType: "triple",
        checkIn: "2026-07-10",
        checkOut: "2026-07-12",
        numGuests: "3",
      },
      reservationHistory: [
        {
          reservationId: "RES-A1",
          status: "created",
          createdAt: "2026-03-20T10:00:00.000Z",
          channel: "web",
          guestName: "Marcelo Martinez",
          roomType: "single",
          checkIn: "2026-05-01",
          checkOut: "2026-05-05",
          numGuests: "1",
        },
        {
          reservationId: "RES-B2",
          status: "created",
          createdAt: "2026-03-21T10:00:00.000Z",
          channel: "web",
          guestName: "Raul Olivera",
          roomType: "double",
          checkIn: "2026-06-01",
          checkOut: "2026-06-05",
          numGuests: "2",
        },
      ],
      lastReservation: {
        reservationId: "RES-B2",
        status: "created",
        createdAt: "2026-03-21T10:00:00.000Z",
        channel: "web",
        guestName: "Raul Olivera",
        roomType: "double",
        checkIn: "2026-06-01",
        checkOut: "2026-06-05",
        numGuests: "2",
      },
      activeReservationContext: {
        kind: "reservation",
        reservationId: "RES-A1",
        phase: "confirmed",
        updatedAt: "2026-03-22T10:00:00.000Z",
      },
      selectedReservationTarget: {
        reservationId: "RES-A1",
        kind: "reservation",
        source: "active_focus",
        resolutionMode: "weak",
      },
      updatedAt: "2026-03-22T10:00:00.000Z",
    });

    await handleIncomingMessage(msg("mostrame esa", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/RES-A1/i);
    expect(replyText).toMatch(/Marcelo Martinez/i);
    expect(replyText).not.toMatch(/Ana Draft|Raul Olivera/i);
  });

  it("snapshot after modify preserves Spanish language even if the current turn is detected as Portuguese", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-snapshot-language-after-modify-1";
    stateByConversation.set(conversationId, {
      reservationSlots: {
        guestName: "Marcelo Bielsa",
        roomType: "triple",
        checkIn: "2026-06-20",
        checkOut: "2026-06-21",
        numGuests: "2",
        locale: "es",
      },
      salesStage: "close",
      conversationStage: "reservation_confirmed",
      lastCategory: "modify_reservation",
      lastReservation: {
        reservationId: "RES-C90F5E",
        status: "updated",
        createdAt: "2026-06-12T10:00:00.000Z",
        channel: "web",
        guestName: "Marcelo Bielsa",
        roomType: "triple",
        checkIn: "2026-06-20",
        checkOut: "2026-06-21",
        numGuests: "2",
      },
      reservationHistory: [
        {
          reservationId: "RES-C90F5E",
          status: "updated",
          createdAt: "2026-06-12T10:00:00.000Z",
          channel: "web",
          guestName: "Marcelo Bielsa",
          roomType: "triple",
          checkIn: "2026-06-20",
          checkOut: "2026-06-21",
          numGuests: "2",
        },
      ],
      activeReservationContext: {
        kind: "reservation",
        reservationId: "RES-C90F5E",
        phase: "confirmed",
        updatedAt: "2026-06-12T10:00:00.000Z",
      },
      selectedReservationTarget: {
        reservationId: "RES-C90F5E",
        kind: "confirmed",
        source: "active_focus",
        resolutionMode: "weak",
        resolvedAt: "2026-06-12T10:00:00.000Z",
      },
      updatedAt: "2026-06-12T10:00:00.000Z",
    });

    await handleIncomingMessage(
      {
        ...msg("mostrame como quedo la reserva modificada", conversationId),
        detectedLanguage: "pt",
      },
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toContain("Este es el resumen de tu reserva:");
    expect(replyText).toContain("- Código: RES-C90F5E");
    expect(replyText).toContain("- Estado: Activa");
    expect(replyText).toContain("- Nombre: Marcelo Bielsa");
    expect(replyText).toContain("- Habitación: triple");
    expect(replyText).toContain("- Fechas: 20/06/2026 → 21/06/2026");
    expect(replyText).toContain("- Huéspedes: 2");
    expect(replyText).not.toContain("Este é");
    expect(replyText).not.toContain("Quarto");
    expect(replyText).not.toContain("Datas");
    expect(replyText).not.toContain("Nome");
  });

  it("modify usa el titular canónico del target y no el guestName residual del draft", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-canonical-holder-modify-1";
    stateByConversation.set(conversationId, {
      reservationSlots: {
        guestName: "Ana Draft",
        roomType: "single",
        checkIn: "2026-05-01",
        checkOut: "2026-05-05",
        numGuests: "1",
      },
      reservationHistory: [
        {
          reservationId: "RES-A1",
          status: "created",
          createdAt: "2026-03-20T10:00:00.000Z",
          channel: "web",
          guestName: "Marcelo Martinez",
          roomType: "single",
          checkIn: "2026-05-01",
          checkOut: "2026-05-05",
          numGuests: "1",
        },
      ],
      lastReservation: {
        reservationId: "RES-A1",
        status: "created",
        createdAt: "2026-03-20T10:00:00.000Z",
        channel: "web",
        guestName: "Marcelo Martinez",
        roomType: "single",
        checkIn: "2026-05-01",
        checkOut: "2026-05-05",
        numGuests: "1",
      },
      activeReservationContext: {
        kind: "reservation",
        reservationId: "RES-A1",
        phase: "confirmed",
        updatedAt: "2026-03-22T10:00:00.000Z",
      },
      selectedReservationTarget: {
        reservationId: "RES-A1",
        kind: "reservation",
        source: "active_focus",
        resolutionMode: "weak",
      },
      modifyState: {
        activeField: "roomType",
        reservationId: "RES-A1",
      },
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
      updatedAt: "2026-03-22T10:00:00.000Z",
    });

    await handleIncomingMessage(msg("triple", conversationId), { mode: "automatic", sendReply });

    const previewReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(previewReply).toMatch(/antes de aplicar el cambio/i);
    expect(previewReply).toMatch(/triple/i);

    await handleIncomingMessage(msg("confirmar", conversationId), { mode: "automatic", sendReply });

    expect(modifyReservation).toHaveBeenCalledWith(
      "hotel999",
      "RES-A1",
      expect.objectContaining({
        guestName: "Marcelo Martinez",
        roomType: "triple",
      }),
      "web"
    );
    const usedSnapshot = (modifyReservation as any).mock.calls.at(-1)?.[2];
    expect(usedSnapshot?.guestName).toBe("Marcelo Martinez");
    expect(usedSnapshot?.guestName).not.toBe("Ana Draft");
  });

  it("resuelve 'cancelá esa' por activeReservationContext cuando el deíctico es puro", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-that-1";
    stateByConversation.set(conversationId, baseMultiReservationState());

    await handleIncomingMessage(msg("cancelá esa", conversationId), { mode: "automatic", sendReply });

    expect(stateByConversation.get(conversationId)?.pendingCancellation).toBeUndefined();
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/precisi[oó]n|cu[aá]l|c[oó]digo|la primera|la segunda/i);
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
    expect(replyText).toMatch(/no encontr[eé].*segunda|primera/i);
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
    expect(replyText).toMatch(/no encontr[eé].*referencia|pasame el c[oó]digo|mostrame tus reservas/i);
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

  it("auto-resuelve la única reserva activa en modify sin pedir desambiguación", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-single-modify-auto-1";
    stateByConversation.set(conversationId, baseSingleReservationState());

    await handleIncomingMessage(msg("cambiame a triple", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/cu[aá]l reserva|pasame el c[oó]digo|la primera o la segunda/i);
    expect(stateByConversation.get(conversationId)?.selectedReservationTarget).toMatchObject({
      reservationId: "RES-ONLY-01",
    });
    expect(stateByConversation.get(conversationId)?.activeReservationContext).toMatchObject({
      kind: "reservation",
      reservationId: "RES-ONLY-01",
    });
  });

  it("mantiene continuidad posterior con 'somos 3' sobre el mismo target único", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-single-modify-continuity-1";
    stateByConversation.set(conversationId, baseSingleReservationState());

    await handleIncomingMessage(msg("cambiame a triple", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("somos 3", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/cu[aá]l reserva|pasame el c[oó]digo|la primera o la segunda/i);
    expect(replyText).toMatch(/nueva cantidad de hu[eé]spedes|quer[eé]s cambiar algo m[aá]s/i);
    expect(stateByConversation.get(conversationId)?.reservationSlots).toMatchObject({
      roomType: "triple",
      numGuests: "3",
    });
    expect(stateByConversation.get(conversationId)?.selectedReservationTarget).toMatchObject({
      reservationId: "RES-ONLY-01",
    });
    expect(stateByConversation.get(conversationId)?.activeReservationContext).toMatchObject({
      kind: "reservation",
      reservationId: "RES-ONLY-01",
    });
  });

  it("resuelve 'esa' cuando solo existe una reserva activa candidata", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-single-anaphora-1";
    stateByConversation.set(conversationId, baseSingleReservationState());

    await handleIncomingMessage(msg("modificá esa", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/cu[aá]l reserva|pasame el c[oó]digo/i);
    expect(stateByConversation.get(conversationId)?.selectedReservationTarget).toMatchObject({
      reservationId: "RES-ONLY-01",
      source: "anaphora",
    });
  });

  it("resuelve 'la única que tengo' cuando solo existe una reserva activa candidata", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-single-unique-1";
    stateByConversation.set(conversationId, baseSingleReservationState());

    await handleIncomingMessage(msg("modificá la única que tengo", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/cu[aá]l reserva|pasame el c[oó]digo/i);
    expect(stateByConversation.get(conversationId)?.selectedReservationTarget).toMatchObject({
      reservationId: "RES-ONLY-01",
    });
  });

  it("resuelve 'la primera' cuando solo existe una reserva activa candidata", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-single-first-1";
    stateByConversation.set(conversationId, baseSingleReservationState());

    await handleIncomingMessage(msg("modificá la primera", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/cu[aá]l reserva|pasame el c[oó]digo/i);
    expect(stateByConversation.get(conversationId)?.selectedReservationTarget).toMatchObject({
      reservationId: "RES-ONLY-01",
      source: "ordinal",
    });
  });

  it("con múltiples reservas sigue pidiendo desambiguación en modify", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-multi-still-ambiguous-1";
    stateByConversation.set(conversationId, baseMultiReservationState({ activeReservationContext: null, selectedReservationTarget: null }));

    await handleIncomingMessage(msg("cambiame a triple", conversationId), { mode: "automatic", sendReply });

    expect(modifyReservation).not.toHaveBeenCalled();
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/varias reservas|cu[aá]l quer[eé]s modificar|la primera o la segunda/i);
  });

  it("con múltiples reservas no abre selección de modify para una consulta de factibilidad", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-multi-modify-inquiry-1";
    stateByConversation.set(conversationId, baseMultiReservationState({ activeReservationContext: null, selectedReservationTarget: null }));

    await handleIncomingMessage(msg("quiero saber si puedo modificar", conversationId), { mode: "automatic", sendReply });

    expect(modifyReservation).not.toHaveBeenCalled();
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/varias reservas|cu[aá]l quer[eé]s modificar|la primera o la segunda/i);
    expect(replyText).not.toMatch(/qué te gustaría cambiar|podemos modificar tu reserva confirmada/i);
    expect(replyText).not.toMatch(/en qu[eé] puedo ayudarte/i);
    expect(replyText).toMatch(/pod[eé]s modificar|reserva activa/i);
  });

  it("con reserva ya enfocada no abre el menú de modify para una consulta previa sobre precio", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-selected-modify-price-inquiry-1";
    stateByConversation.set(conversationId, baseMultiReservationState({
      activeReservationContext: {
        kind: "reservation",
        reservationId: "RES-NEW-02",
        reservationStatus: "created",
      },
      selectedReservationTarget: {
        reservationId: "RES-NEW-02",
        source: "ordinal",
        confidence: "strong",
      },
      desiredAction: "view",
      conversationFocus: { domain: "reservation", subFlow: "snapshot" },
    }));

    await handleIncomingMessage(msg("antes de modificar, ¿me recordás el precio?", conversationId), { mode: "automatic", sendReply });

    expect(modifyReservation).not.toHaveBeenCalled();
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/qué te gustaría cambiar|podemos modificar tu reserva confirmada|ok, vamos a modificar esta reserva/i);
    expect(replyText).not.toMatch(/en qu[eé] puedo ayudarte/i);
    expect(replyText).toMatch(/de cu[aá]l reserva|precio/i);
  });

  it("preserva dominancia de proposal activa frente a una reserva histórica al pedir un cambio genérico", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-proposal-dominance-historical-1";
    stateByConversation.set(conversationId, {
      reservationSlots: {
        guestName: "Martín Pérez",
        roomType: "single",
        checkIn: "2026-08-20",
        checkOut: "2026-08-22",
        numGuests: "1",
      },
      salesStage: "quote",
      conversationStage: "reservation_quoted",
      lastProposal: {
        available: true,
        proposal: "Martín, tengo simple disponible para Martín Pérez.",
      },
      lastReservation: {
        reservationId: "RES-DE83D2",
        status: "created",
        createdAt: "2026-08-01T10:00:00.000Z",
        channel: "web",
        guestName: "Martín Pérez",
        roomType: "double",
        checkIn: "2026-08-10",
        checkOut: "2026-08-12",
        numGuests: "2",
      },
      reservationHistory: [
        {
          reservationId: "RES-DE83D2",
          status: "created",
          createdAt: "2026-08-01T10:00:00.000Z",
          channel: "web",
          guestName: "Martín Pérez",
          roomType: "double",
          checkIn: "2026-08-10",
          checkOut: "2026-08-12",
          numGuests: "2",
        },
      ],
      activeReservationContext: {
        kind: "draft",
        phase: "quoted",
        updatedAt: "2026-08-13T10:00:00.000Z",
      },
    });

    await handleIncomingMessage(msg("quiero cambiar a nombre de quien va la reserva", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const currentState = stateByConversation.get(conversationId);
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(replyText).not.toMatch(/RES-DE83D2|ok, vamos a modificar esta reserva|podemos modificar tu reserva confirmada/i);
    expect(replyText).toMatch(/nueva reserva en curso|qu[eé] quer[eé]s cambiar/i);
    expect(currentState?.selectedReservationTarget ?? null).toBeNull();
    expect(currentState?.activeReservationContext).toMatchObject({ kind: "draft" });
    expect(currentState?.activeFlow).toBe("reservation");
    expect(currentState?.desiredAction).toBe("create");
  });

  it("con proposal activa y sin confirmadas no fabrica un target confirmado al pedir cambio genérico", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-proposal-dominance-no-confirmed-1";
    stateByConversation.set(conversationId, {
      reservationSlots: {
        guestName: "Martín Pérez",
        roomType: "single",
        checkIn: "2026-08-20",
        checkOut: "2026-08-22",
        numGuests: "1",
      },
      salesStage: "quote",
      conversationStage: "reservation_quoted",
      lastProposal: {
        available: true,
        proposal: "Martín, tengo simple disponible para Martín Pérez.",
      },
      lastReservation: null,
      reservationHistory: [],
      activeReservationContext: {
        kind: "draft",
        phase: "quoted",
        updatedAt: "2026-08-13T10:00:00.000Z",
      },
    });

    await handleIncomingMessage(msg("quiero cambiar nombre", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const currentState = stateByConversation.get(conversationId);
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(replyText).not.toMatch(/podemos modificar tu reserva confirmada|pasame el c[oó]digo|ok, vamos a modificar esta reserva/i);
    expect(replyText).toMatch(/nueva reserva en curso|qu[eé] quer[eé]s cambiar/i);
    expect(currentState?.selectedReservationTarget ?? null).toBeNull();
    expect(currentState?.activeReservationContext).toMatchObject({ kind: "draft" });
  });

  it("preserva el modify legítimo cuando solo existe una reserva confirmada", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-proposal-dominance-legit-modify-1";
    stateByConversation.set(conversationId, baseSingleReservationState());

    await handleIncomingMessage(msg("quiero cambiar mi reserva", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const currentState = stateByConversation.get(conversationId);
    expect(replyText).toMatch(/qu[eé] te gustar[ií]a cambiar|podemos modificar tu reserva confirmada/i);
    expect(currentState?.selectedReservationTarget).toMatchObject({ reservationId: "RES-ONLY-01" });
    expect(currentState?.activeReservationContext).toMatchObject({ kind: "reservation", reservationId: "RES-ONLY-01" });
    expect(currentState?.activeFlow).toBe("modify_reservation");
  });

  it("si el usuario referencia explícitamente una reserva confirmada mantiene el modify contractual aunque haya draft activo", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-proposal-dominance-explicit-code-1";
    stateByConversation.set(conversationId, {
      reservationSlots: {
        guestName: "Martín Pérez",
        roomType: "single",
        checkIn: "2026-08-20",
        checkOut: "2026-08-22",
        numGuests: "1",
      },
      salesStage: "quote",
      conversationStage: "reservation_quoted",
      lastProposal: {
        available: true,
        proposal: "Martín, tengo simple disponible para Martín Pérez.",
      },
      lastReservation: {
        reservationId: "RES-DE83D2",
        status: "created",
        createdAt: "2026-08-01T10:00:00.000Z",
        channel: "web",
        guestName: "Martín Pérez",
        roomType: "double",
        checkIn: "2026-08-10",
        checkOut: "2026-08-12",
        numGuests: "2",
      },
      reservationHistory: [
        {
          reservationId: "RES-DE83D2",
          status: "created",
          createdAt: "2026-08-01T10:00:00.000Z",
          channel: "web",
          guestName: "Martín Pérez",
          roomType: "double",
          checkIn: "2026-08-10",
          checkOut: "2026-08-12",
          numGuests: "2",
        },
      ],
      activeReservationContext: {
        kind: "draft",
        phase: "quoted",
        updatedAt: "2026-08-13T10:00:00.000Z",
      },
    });

    await handleIncomingMessage(msg("quiero modificar mi reserva RES-DE83D2", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const currentState = stateByConversation.get(conversationId);
    expect(replyText).toMatch(/RES-DE83D2|qu[eé] te gustar[ií]a cambiar|podemos modificar tu reserva confirmada/i);
    expect(currentState?.selectedReservationTarget).toMatchObject({ reservationId: "RES-DE83D2" });
    expect(currentState?.activeReservationContext).toMatchObject({ kind: "reservation", reservationId: "RES-DE83D2" });
    expect(currentState?.activeFlow).toBe("modify_reservation");
  });
});
