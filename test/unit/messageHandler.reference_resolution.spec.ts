import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const stateByConversation = new Map<string, any>();
const conversationMocks = vi.hoisted(() => ({
  getConversationsForGuestPerspective: vi.fn(async (_input?: unknown) => []),
}));
const hotelConfigMocks = vi.hoisted(() => ({
  getHotelConfig: vi.fn(async () => ({ timezone: "UTC" })),
}));

vi.mock("@/lib/db/messages", () => ({
  saveChannelMessageToAstra: vi.fn(async () => {}),
  getMessagesByConversation: vi.fn(async () => []),
}));
vi.mock("@/lib/db/conversations", () => ({
  getOrCreateConversation: vi.fn(async () => {}),
  appendConversationReplyTrace: vi.fn(async () => {}),
  getConversationsForGuestPerspective: conversationMocks.getConversationsForGuestPerspective,
  getConversationsByGuestId: vi.fn(async (input: any) =>
    conversationMocks.getConversationsForGuestPerspective(input),
  ),
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
vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: hotelConfigMocks.getHotelConfig,
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
  modifyReservation: vi.fn(async (_hotelId: string, reservationId: string, patch: any) => {
    const states = Array.from(stateByConversation.values());
    const records = states.flatMap((state: any) => [
      ...(Array.isArray(state?.reservationHistory) ? state.reservationHistory : []),
      state?.lastReservation,
    ]).filter(Boolean);
    const current = records.find((record: any) => record.reservationId === reservationId) || {};
    return {
      ok: true,
      message: `✅ Modificada ${reservationId}`,
      reservation: {
        reservationId,
        hotelId: _hotelId,
        guestName: patch.guestName ?? current.guestName ?? "Marcelo Martinez",
        roomType: patch.roomType ?? current.roomType ?? "double",
        numGuests: patch.numGuests !== undefined
          ? Number(patch.numGuests)
          : Object.prototype.hasOwnProperty.call(current, "numGuests")
            ? current.numGuests == null ? null : Number(current.numGuests)
            : null,
        checkInDate: patch.checkIn ?? current.checkIn ?? "2026-10-02",
        checkOutDate: patch.checkOut ?? current.checkOut ?? "2026-10-04",
        status: "confirmed",
        currency: "USD",
        priceTotal: 240,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    };
  }),
  quoteReservationModification: vi.fn(async (_hotelId: string, reservationId: string, snapshot: any) => ({
    available: true,
    reservationId,
    patch: { roomType: snapshot.roomType, guests: Number(snapshot.numGuests), checkInDate: snapshot.checkIn, checkOutDate: snapshot.checkOut },
    currency: "USD",
    priceTotal: 240,
    pricePerNight: 120,
    quoteId: "quote-test-240",
    quoteVersion: "version-test-1",
  })),
  askAvailability: vi.fn(async (_hotelId: string, snapshot: any) => ({
    ok: true,
    available: true,
    proposal: `Tengo ${snapshot.roomType || "doble"} disponible. Tarifa por noche: 100 USD. Total 2 noches: 200 USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.`,
    options: [{ roomType: snapshot.roomType || "double", pricePerNight: 100, currency: "USD" }],
  })),
  confirmAndCreate: vi.fn(async (hotelId: string, snapshot: any) => ({
    ok: true,
    reservationId: "RES-CREATED-NEW",
    reservation: {
      reservationId: "RES-CREATED-NEW",
      hotelId,
      guestName: snapshot.guestName,
      roomType: snapshot.roomType,
      numGuests: Number(snapshot.numGuests),
      checkInDate: snapshot.checkIn,
      checkOutDate: snapshot.checkOut,
      status: "confirmed",
      currency: "USD",
      priceTotal: 200,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
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
import { extractGuests, extractSlotsFromText } from "@/lib/agents/helpers";
import { askAvailability, cancelReservation, confirmAndCreate, modifyReservation, quoteReservationModification } from "@/lib/agents/reservations";
import { getConversationsByGuestId, getConversationsForGuestPerspective } from "@/lib/db/conversations";
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

function baseActiveGuestsModifyState(pendingFields: Array<"roomType" | "dates"> = []) {
  return baseSingleReservationState({
    activeReservationContext: {
      kind: "reservation",
      reservationId: "RES-ONLY-01",
      phase: "confirmed",
      updatedAt: "2026-03-22T10:00:00.000Z",
    },
    selectedReservationTarget: {
      reservationId: "RES-ONLY-01",
      kind: "confirmed",
      source: "active_focus",
      resolutionMode: "weak",
      resolvedAt: "2026-03-22T10:00:00.000Z",
    },
    modifyState: {
      activeField: "guests",
      pendingFields,
      updatedAt: "2026-03-22T10:00:00.000Z",
    },
    conversationFocus: {
      domain: "reservation",
      subFlow: "modify",
      active: true,
      updatedAt: "2026-03-22T10:00:00.000Z",
    },
    activeFlow: "modify_reservation",
    desiredAction: "modify",
    lastCategory: "modify_reservation",
  });
}

function baseStalePresentedCancellationState(overrides: Record<string, any> = {}) {
  return baseMultiReservationState({
    reservationHistory: [
      {
        reservationId: "RES-STALE-01",
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
        reservationId: "RES-ACTIVE-02",
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
        reservationId: "RES-STALE-01",
        status: "cancelled",
        createdAt: "2026-03-22T10:00:00.000Z",
        channel: "web",
      },
    ],
    lastReservation: {
      reservationId: "RES-STALE-01",
      status: "cancelled",
      createdAt: "2026-03-22T10:00:00.000Z",
      channel: "web",
    },
    activeReservationContext: {
      kind: "reservation",
      reservationId: "RES-ACTIVE-02",
      phase: "confirmed",
      updatedAt: "2026-03-21T10:00:00.000Z",
    },
    lastPresentedReservations: {
      guestId: "g1",
      presentedAt: "2026-03-21T12:00:00.000Z",
      reservations: [
        {
          reservationId: "RES-STALE-01",
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
          reservationId: "RES-ACTIVE-02",
          status: "created",
          createdAt: "2026-03-21T10:00:00.000Z",
          channel: "web",
          guestName: "Marcelo Martinez",
          roomType: "double",
          checkIn: "2026-03-28",
          checkOut: "2026-03-30",
          numGuests: "2",
        },
      ],
    },
    ...overrides,
  });
}

function baseTemporalReservationState(overrides: Record<string, any> = {}) {
  const reservation = (reservationId: string, checkIn: string, checkOut: string) => ({
    reservationId,
    status: "created",
    createdAt: `${checkIn}T10:00:00.000Z`,
    channel: "web",
    guestName: "Marcelo Martinez",
    roomType: "double",
    checkIn,
    checkOut,
    numGuests: "2",
  });
  return baseSingleReservationState({
    reservationHistory: [
      reservation("RES-HIST-01", "2026-03-18", "2026-03-20"),
      reservation("RES-OVERLAP-02", "2026-03-22", "2026-03-24"),
      reservation("RES-FUTURE-04", "2026-03-27", "2026-03-29"),
      reservation("RES-FUTURE-03", "2026-03-25", "2026-03-26"),
    ],
    lastReservation: reservation("RES-FUTURE-03", "2026-03-25", "2026-03-26"),
    ...overrides,
  });
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

async function preparePendingModifyPreview(
  conversationId: string,
  sendReply: ReturnType<typeof vi.fn>,
  options: {
    initialState?: any;
    request?: string;
    expectedPatch?: Record<string, unknown>;
  } = {}
) {
  stateByConversation.set(conversationId, options.initialState ?? baseSingleReservationState());
  await handleIncomingMessage(
    msg(options.request ?? "modificá RES-ONLY-01 a triple para 3 personas", conversationId),
    { mode: "automatic", sendReply }
  );
  expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
    awaitingConfirmation: true,
    pendingPatch: expect.objectContaining(options.expectedPatch ?? {
      reservationId: "RES-ONLY-01",
      roomType: "triple",
      numGuests: "3",
    }),
  });
  sendReply.mockClear();
  (askAvailability as any).mockClear();
  (cancelReservation as any).mockClear();
  (confirmAndCreate as any).mockClear();
  (modifyReservation as any).mockClear();
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
    hotelConfigMocks.getHotelConfig.mockResolvedValue({ timezone: "UTC" });
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

  it("bloquea la cancelación ordinal cuando la presentación está stale y el canonical state ya la canceló", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-cancel-stale-presented-1";
    stateByConversation.set(conversationId, baseStalePresentedCancellationState());

    await handleIncomingMessage(msg("cancelá la primera", conversationId), { mode: "automatic", sendReply });

    const currentState = stateByConversation.get(conversationId);
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(currentState?.pendingCancellation ?? null).toBeNull();
    expect(replyText).toMatch(/no encuentro una reserva activa para cancelar/i);
    expect(currentState?.reservationHistory.filter((item: any) => item.reservationId === "RES-STALE-01")).toHaveLength(2);
    expect(currentState?.reservationHistory.at(-1)).toMatchObject({
      reservationId: "RES-STALE-01",
      status: "cancelled",
    });
  });

  it("mantiene seleccionable por ordinal la reserva activa junto a una presentación stale", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-cancel-stale-presented-active-1";
    stateByConversation.set(conversationId, baseStalePresentedCancellationState());

    await handleIncomingMessage(msg("cancelá la segunda", conversationId), { mode: "automatic", sendReply });

    expect(cancelReservation).not.toHaveBeenCalled();
    expect(stateByConversation.get(conversationId)?.pendingCancellation).toMatchObject({
      reservationId: "RES-ACTIVE-02",
      awaitingConfirmation: true,
    });
  });

  it("revalida una cancelación pendiente antes de confirmar contra el provider", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-cancel-stale-pending-1";
    stateByConversation.set(conversationId, baseStalePresentedCancellationState({
      pendingCancellation: { reservationId: "RES-STALE-01", awaitingConfirmation: true },
      activeFlow: "cancel_reservation",
      desiredAction: "cancel",
    }));

    await handleIncomingMessage(msg("confirmar", conversationId), { mode: "automatic", sendReply });

    const currentState = stateByConversation.get(conversationId);
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(currentState?.pendingCancellation ?? null).toBeNull();
    expect(replyText).toMatch(/no encuentro una reserva activa para cancelar/i);
  });

  it("mantiene la cancelación normal de una reserva activa", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-cancel-canonical-active-1";
    stateByConversation.set(conversationId, baseSingleReservationState());

    await handleIncomingMessage(msg("cancelá RES-ONLY-01", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("confirmar", conversationId), { mode: "automatic", sendReply });

    expect(cancelReservation).toHaveBeenCalledWith("hotel999", "RES-ONLY-01");
    expect(stateByConversation.get(conversationId)?.pendingCancellation ?? null).toBeNull();
  });

  it("ordena el listado por relación temporal sin alterar el status material", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-temporal-list-order-1";
    stateByConversation.set(conversationId, baseTemporalReservationState());

    await handleIncomingMessage(msg("mostrame mis reservas", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const presentedIds = stateByConversation.get(conversationId)?.lastPresentedReservations?.reservations
      .map((reservation: any) => reservation.reservationId);
    expect(replyText.indexOf("RES-OVERLAP-02")).toBeLessThan(replyText.indexOf("RES-FUTURE-03"));
    expect(replyText.indexOf("RES-FUTURE-03")).toBeLessThan(replyText.indexOf("RES-FUTURE-04"));
    expect(replyText.indexOf("RES-FUTURE-04")).toBeLessThan(replyText.indexOf("RES-HIST-01"));
    expect(replyText).toMatch(/RES-HIST-01.*activa.*histórica/i);
    expect(presentedIds).toEqual(["RES-OVERLAP-02", "RES-FUTURE-03", "RES-FUTURE-04", "RES-HIST-01"]);
    expect(stateByConversation.get(conversationId)?.reservationHistory[0]).toMatchObject({
      reservationId: "RES-HIST-01",
      status: "created",
    });
    expect(replyText).not.toMatch(/expired|completed|checked_out/i);
  });

  it("usa el día local del hotel y no clasifica checkout de hoy como histórico", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-temporal-timezone-boundary-1";
    vi.setSystemTime(new Date("2026-03-23T02:00:00.000Z"));
    hotelConfigMocks.getHotelConfig.mockResolvedValue({ timezone: "America/Montevideo" });
    stateByConversation.set(conversationId, baseSingleReservationState({
      reservationHistory: [{
        reservationId: "RES-CHECKOUT-TODAY-01",
        status: "created",
        createdAt: "2026-03-20T10:00:00.000Z",
        channel: "web",
        guestName: "Marcelo Martinez",
        roomType: "double",
        checkIn: "2026-03-20",
        checkOut: "2026-03-22",
        numGuests: "2",
      }],
      lastReservation: {
        reservationId: "RES-CHECKOUT-TODAY-01",
        status: "created",
        createdAt: "2026-03-20T10:00:00.000Z",
        channel: "web",
      },
    }));

    await handleIncomingMessage(msg("mostrame mis reservas", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/RES-CHECKOUT-TODAY-01.*activa.*en curso/i);
    expect(replyText).not.toMatch(/histórica/i);
  });

  it("persiste sólo las reservas visibles para que los ordinales no resuelvan un registro sin payload", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-temporal-visible-presentation-1";
    const reservation = (reservationId: string, checkIn: string, checkOut: string) => ({
      reservationId,
      status: "created",
      createdAt: `${checkIn}T10:00:00.000Z`,
      channel: "web",
      guestName: "Marcelo Martinez",
      roomType: "double",
      checkIn,
      checkOut,
      numGuests: "2",
    });
    stateByConversation.set(conversationId, baseSingleReservationState({
      reservationHistory: [
        reservation("RES-VISIBLE-01", "2026-03-22", "2026-03-24"),
        { reservationId: "RES-INVISIBLE-02", status: "created", createdAt: "2026-03-23T10:00:00.000Z", channel: "web" },
        reservation("RES-VISIBLE-03", "2026-03-25", "2026-03-27"),
      ],
      lastReservation: reservation("RES-VISIBLE-03", "2026-03-25", "2026-03-27"),
    }));

    await handleIncomingMessage(msg("mostrame mis reservas", conversationId), { mode: "automatic", sendReply });

    const listReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const presentedIds = stateByConversation.get(conversationId)?.lastPresentedReservations?.reservations
      .map((reservation: any) => reservation.reservationId);
    expect(listReply).toMatch(/RES-VISIBLE-01.*RES-VISIBLE-03/is);
    expect(listReply).not.toMatch(/RES-INVISIBLE-02/i);
    expect(presentedIds).toEqual(["RES-VISIBLE-01", "RES-VISIBLE-03"]);

    await handleIncomingMessage(msg("mostrame la segunda", conversationId), { mode: "automatic", sendReply });
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/RES-VISIBLE-03/i);

    await handleIncomingMessage(msg("mostrame la tercera", conversationId), { mode: "automatic", sendReply });
    const thirdReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(thirdReply).toMatch(/no encontr[eé].*tercera|primera|segunda/i);
    expect(thirdReply).not.toMatch(/RES-INVISIBLE-02/i);
  });

  it("conserva el ordinal de una histórica previamente presentada y delega modify/cancel al provider", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-temporal-historical-operability-1";
    const cancelConversationId = "conv-ref-temporal-historical-cancel-1";
    stateByConversation.set(conversationId, baseTemporalReservationState());

    await handleIncomingMessage(msg("mostrame mis reservas", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("mostrame la última", conversationId), { mode: "automatic", sendReply });
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/RES-HIST-01/i);

    await handleIncomingMessage(msg("modificá RES-HIST-01 habitación triple", conversationId), { mode: "automatic", sendReply });
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/antes de aplicar el cambio|confirm[aá]s estos cambios/i);

    stateByConversation.set(cancelConversationId, baseTemporalReservationState());
    await handleIncomingMessage(msg("cancelá RES-HIST-01", cancelConversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("confirmar", cancelConversationId), { mode: "automatic", sendReply });
    expect(cancelReservation).toHaveBeenCalledWith("hotel999", "RES-HIST-01");
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

  it("preserva referencias ordinales guest-wide sin copiar estado histórico al modificar", async () => {
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
          checkIn: "2026-06-15",
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
      if (guestId === "g1" || guestId === "guest-canonical-list-modify-1") {
        return {
          guestId: "guest-canonical-list-modify-1",
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
        ...msg("la primera", currentConversationId),
        guestId: "g1",
      },
      { mode: "automatic", sendReply }
    );
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/RES-DCD7C8|Raul Carsoglio/i);

    await handleIncomingMessage(
      {
        ...msg("la segunda", currentConversationId),
        guestId: "g1",
      },
      { mode: "automatic", sendReply }
    );
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/RES-456E82|Pep Guardiola/i);

    await handleIncomingMessage(
      {
        ...msg("la última", currentConversationId),
        guestId: "g1",
      },
      { mode: "automatic", sendReply }
    );
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/RES-C040F5|Pedro Picapiedra/i);

    await handleIncomingMessage(
      {
        ...msg("quiero alterar la primera", currentConversationId),
        guestId: "g1",
      },
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const currentState = stateByConversation.get(currentConversationId);
    expect(replyText).toMatch(/RES-DCD7C8/i);
    expect(replyText).toMatch(/Raul Carsoglio/i);
    expect(replyText).toMatch(/qué te gustaría cambiar|fechas, habitación o cantidad de huéspedes/i);
    expect(currentState?.lastPresentedReservations).toMatchObject({
      guestId: "guest-canonical-list-modify-1",
      reservations: [
        { reservationId: "RES-DCD7C8" },
        { reservationId: "RES-456E82" },
        { reservationId: "RES-C040F5" },
      ],
    });
    expect(currentState?.reservationHistory).toEqual([
      expect.objectContaining({ reservationId: "RES-DCD7C8" }),
    ]);
    expect(currentState?.reservationHistory).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ reservationId: "RES-456E82" })]),
    );
    expect(currentState?.lastReservation).toMatchObject({ reservationId: "RES-DCD7C8" });
    expect(currentState?.salesStage).toBe("close");
    expect(currentState?.selectedReservationTarget).toMatchObject({
      reservationId: "RES-DCD7C8",
      source: "ordinal",
    });

    await handleIncomingMessage(
      {
        ...msg("cambiar fechas", currentConversationId),
        guestId: "g1",
      },
      { mode: "automatic", sendReply }
    );
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/cu[aá]les.*nuevas fechas/i);

    await handleIncomingMessage(
      {
        ...msg("25/09/2027 al 27/09/2027", currentConversationId),
        guestId: "g1",
      },
      { mode: "automatic", sendReply }
    );
    const previewReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(previewReply).toMatch(/antes de aplicar el cambio/i);
    expect(previewReply).toMatch(/Huéspedes: 3 -> 3|Titular: Raul Carsoglio -> Raul Carsoglio|Fechas: 15\/06\/2026 → 20\/06\/2026 => 25\/09\/2027 → 27\/09\/2027/i);
    expect(stateByConversation.get(currentConversationId)?.modifyState).toMatchObject({
      awaitingConfirmation: true,
      pendingPatch: {
        reservationId: "RES-DCD7C8",
        checkIn: "2027-09-25",
        checkOut: "2027-09-27",
      },
    });

    await handleIncomingMessage(
      {
        ...msg("CONFIRMAR", currentConversationId),
        guestId: "g1",
      },
      { mode: "automatic", sendReply }
    );
    expect(modifyReservation).toHaveBeenCalledWith(
      "hotel999",
      "RES-DCD7C8",
      expect.objectContaining({
        checkIn: "2027-09-25",
        checkOut: "2027-09-27",
      }),
      "web",
    );
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/Modificada RES-DCD7C8/i);
  });

  it("no reutiliza referencias presentadas por otro guest", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-presented-other-guest-1";
    stateByConversation.set(conversationId, {
      hotelId: "hotel999",
      conversationId,
      lastPresentedReservations: {
        guestId: "guest-owner-1",
        presentedAt: "2026-06-16T10:00:00.000Z",
        reservations: [{
          reservationId: "RES-PRIVATE-OWNER-1",
          status: "created",
          createdAt: "2026-06-15T10:00:00.000Z",
          channel: "email",
          guestName: "Otra Persona",
          roomType: "double",
          checkIn: "2026-07-01",
          checkOut: "2026-07-03",
          numGuests: "2",
        }],
      },
    });
    (getGuest as any).mockResolvedValue({ guestId: "guest-other-1", hotelId: "hotel999", name: "Invitado Distinto" });
    (findGuestByAnyId as any).mockResolvedValue({ guestId: "guest-owner-1", hotelId: "hotel999", name: "Otra Persona" });

    await handleIncomingMessage(
      { ...msg("la primera", conversationId), guestId: "guest-other-1" },
      { mode: "automatic", sendReply },
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/RES-PRIVATE-OWNER-1|Otra Persona/i);
    expect(replyText).toMatch(/no encontr[eé] reservas|pasame el c[oó]digo|mostrame tus reservas/i);
  });

  it("preserva referencias presentadas cuando el ID web transiciona al mismo guest canonico", async () => {
    const sendReply = vi.fn(async () => {});
    const currentConversationId = "conv-ref-alias-transition-current-1";
    const firstSourceConversationId = "conv-ref-alias-transition-source-1";
    const secondSourceConversationId = "conv-ref-alias-transition-source-2";
    const webGuestId = "web:g1";
    const canonicalGuestId = "guest-canonical-transition-1";

    stateByConversation.set(firstSourceConversationId, {
      hotelId: "hotel999",
      conversationId: firstSourceConversationId,
      reservationHistory: [{
        reservationId: "RES-7FE5B4",
        status: "created",
        createdAt: "2026-08-31T10:00:00.000Z",
        channel: "web",
        guestName: "Ana Perez",
        roomType: "double",
        checkIn: "2026-09-08",
        checkOut: "2026-09-15",
        numGuests: "2",
      }],
    });
    stateByConversation.set(secondSourceConversationId, {
      hotelId: "hotel999",
      conversationId: secondSourceConversationId,
      reservationHistory: [{
        reservationId: "RES-BA2303",
        status: "created",
        createdAt: "2026-08-31T10:01:00.000Z",
        channel: "email",
        guestName: "Laura Gómez",
        roomType: "suite",
        checkIn: "2026-09-20",
        checkOut: "2026-09-23",
        numGuests: "2",
      }],
    });

    let currentGuest = {
      guestId: webGuestId,
      hotelId: "hotel999",
      name: "Ana Perez",
      aliases: [webGuestId],
      mode: "automatic",
    };
    (getGuest as any).mockImplementation(async (_hotelId: string, guestId: string) => {
      if (guestId === webGuestId) return currentGuest;
      return null;
    });
    (findGuestByAnyId as any).mockImplementation(async (_hotelId: string, guestId: string) =>
      guestId === webGuestId
        ? { guestId: canonicalGuestId, hotelId: "hotel999", aliases: [webGuestId], mode: "automatic" }
        : null,
    );
    (getConversationsForGuestPerspective as any).mockResolvedValue([
      { conversationId: currentConversationId, hotelId: "hotel999", guestId: webGuestId, channel: "web" },
      { conversationId: firstSourceConversationId, hotelId: "hotel999", guestId: canonicalGuestId, channel: "web" },
      { conversationId: secondSourceConversationId, hotelId: "hotel999", guestId: canonicalGuestId, channel: "email" },
    ]);

    await handleIncomingMessage(
      { ...msg("mostrame mi reserva", currentConversationId), guestId: webGuestId },
      { mode: "automatic", sendReply },
    );

    const presentedState = stateByConversation.get(currentConversationId);
    expect(presentedState?.lastPresentedReservations).toMatchObject({
      guestId: canonicalGuestId,
      reservations: [
        { reservationId: "RES-7FE5B4" },
        { reservationId: "RES-BA2303" },
      ],
    });
    stateByConversation.set(currentConversationId, {
      ...presentedState,
      reservationHistory: [
        stateByConversation.get(firstSourceConversationId)?.reservationHistory?.[0],
        stateByConversation.get(secondSourceConversationId)?.reservationHistory?.[0],
      ],
    });

    // The next inbound message is resolved after identity consolidation.
    currentGuest = {
      guestId: canonicalGuestId,
      hotelId: "hotel999",
      name: "Ana Perez",
      aliases: [webGuestId],
      mode: "automatic",
    };
    await handleIncomingMessage(
      { ...msg("quiero modificar la primera", currentConversationId), guestId: webGuestId },
      { mode: "automatic", sendReply },
    );

    const firstReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const firstState = stateByConversation.get(currentConversationId);
    expect(firstReply).toMatch(/RES-7FE5B4|qu[eé] te gustar[ií]a cambiar|podemos modificar/i);
    expect(firstState?.selectedReservationTarget).toMatchObject({
      reservationId: "RES-7FE5B4",
      source: "ordinal",
    });
    expect(firstState?.lastReservation ?? null).toBeNull();

    await handleIncomingMessage(
      { ...msg("quiero modificar la segunda", currentConversationId), guestId: webGuestId },
      { mode: "automatic", sendReply },
    );
    expect(stateByConversation.get(currentConversationId)?.selectedReservationTarget).toMatchObject({
      reservationId: "RES-BA2303",
      source: "ordinal",
    });

    await handleIncomingMessage(
      { ...msg("el codigo es: RES-7FE5B4", currentConversationId), guestId: webGuestId },
      { mode: "automatic", sendReply },
    );
    expect(stateByConversation.get(currentConversationId)?.selectedReservationTarget).toMatchObject({
      reservationId: "RES-7FE5B4",
      source: "explicit_id",
    });

    await handleIncomingMessage(
      { ...msg("quiero modificar RES-7FE5B4", currentConversationId), guestId: webGuestId },
      { mode: "automatic", sendReply },
    );
    expect(stateByConversation.get(currentConversationId)?.selectedReservationTarget).toMatchObject({
      reservationId: "RES-7FE5B4",
      source: "explicit_id",
    });
  });

  it("conserva un contexto presentado legado cuando su alias prueba el mismo guest canonico", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-alias-transition-legacy-1";
    stateByConversation.set(conversationId, {
      hotelId: "hotel999",
      conversationId,
      lastPresentedReservations: {
        guestId: "web:legacy-guest-1",
        presentedAt: "2026-08-31T10:00:00.000Z",
        reservations: [{
          reservationId: "RES-LEGACY-1",
          status: "created",
          createdAt: "2026-08-31T10:00:00.000Z",
          guestName: "Ana Perez",
          roomType: "double",
          checkIn: "2026-09-08",
          checkOut: "2026-09-15",
          numGuests: "2",
        }],
      },
    });
    (getGuest as any).mockResolvedValue({ guestId: "guest-canonical-legacy-1", hotelId: "hotel999", name: "Ana Perez" });
    (findGuestByAnyId as any).mockImplementation(async (_hotelId: string, guestId: string) =>
      guestId === "web:legacy-guest-1"
        ? { guestId: "guest-canonical-legacy-1", hotelId: "hotel999", aliases: ["web:legacy-guest-1"] }
        : null,
    );

    await handleIncomingMessage(
      { ...msg("quiero modificar la primera", conversationId), guestId: "guest-canonical-legacy-1" },
      { mode: "automatic", sendReply },
    );

    expect(stateByConversation.get(conversationId)?.selectedReservationTarget).toMatchObject({
      reservationId: "RES-LEGACY-1",
      source: "ordinal",
    });
  });

  it("no conserva referencias presentadas si no hay evidencia de que el nuevo ID sea el mismo guest", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-alias-transition-unknown-1";
    stateByConversation.set(conversationId, {
      hotelId: "hotel999",
      conversationId,
      lastPresentedReservations: {
        guestId: "web:guest-owner-unknown",
        presentedAt: "2026-08-31T10:00:00.000Z",
        reservations: [{ reservationId: "RES-PRIVATE-UNKNOWN", status: "created", guestName: "Privado" }],
      },
    });
    (getGuest as any).mockResolvedValue({ guestId: "guest-current-unknown", hotelId: "hotel999", name: "Otro" });
    (findGuestByAnyId as any).mockResolvedValue(null);

    await handleIncomingMessage(
      { ...msg("quiero modificar la primera", conversationId), guestId: "guest-current-unknown" },
      { mode: "automatic", sendReply },
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/RES-PRIVATE-UNKNOWN|Privado/i);
    expect(replyText).toMatch(/no encontr[eé] reservas|pasame el c[oó]digo|mostrame tus reservas/i);
  });

  it("conserva la referencia guest-wide de un snapshot singular para modificarla sin copiar historial", async () => {
    const sendReply = vi.fn(async () => {});
    const currentConversationId = "conv-ref-single-snapshot-current-1";
    const sourceConversationId = "conv-ref-single-snapshot-source-1";
    stateByConversation.set(sourceConversationId, {
      hotelId: "hotel999",
      conversationId: sourceConversationId,
      reservationHistory: [{
        reservationId: "RES-SINGLE-01",
        status: "created",
        createdAt: "2026-06-15T10:00:00.000Z",
        channel: "email",
        guestName: "Ana Perez",
        roomType: "double",
        checkIn: "2026-07-01",
        checkOut: "2026-07-03",
        numGuests: "2",
      }],
      lastReservation: {
        reservationId: "RES-SINGLE-01",
        status: "created",
        createdAt: "2026-06-15T10:00:00.000Z",
        channel: "email",
        guestName: "Ana Perez",
        roomType: "double",
        checkIn: "2026-07-01",
        checkOut: "2026-07-03",
        numGuests: "2",
      },
      salesStage: "close",
      conversationStage: "reservation_confirmed",
    });
    (getGuest as any).mockResolvedValue({
      guestId: "guest-single-snapshot-1",
      hotelId: "hotel999",
      name: "Martin Perez",
      aliases: ["web:g1", "email:martin@example.com"],
      mode: "automatic",
    });
    (getConversationsForGuestPerspective as any).mockResolvedValue([
      { conversationId: currentConversationId, hotelId: "hotel999", guestId: "guest-single-snapshot-1", channel: "web" },
      { conversationId: sourceConversationId, hotelId: "hotel999", guestId: "guest-single-snapshot-1", channel: "email" },
    ]);

    await handleIncomingMessage(msg("mostrame mi reserva", currentConversationId), { mode: "automatic", sendReply });

    const snapshotReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const snapshotState = stateByConversation.get(currentConversationId);
    expect(snapshotReply).toMatch(/RES-SINGLE-01|Ana Perez/i);
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(snapshotState?.lastPresentedReservations).toMatchObject({
      guestId: "guest-single-snapshot-1",
      reservations: [expect.objectContaining({ reservationId: "RES-SINGLE-01", guestName: "Ana Perez" })],
    });
    expect(snapshotState?.selectedReservationTarget ?? null).toBeNull();
    expect(snapshotState?.reservationHistory ?? []).toEqual([]);
    expect(snapshotState?.lastReservation ?? null).toBeNull();
    stateByConversation.set(currentConversationId, {
      ...snapshotState,
      lastReservation: stateByConversation.get(sourceConversationId)?.lastReservation,
    });

    await handleIncomingMessage(msg("quiero modificarla", currentConversationId), { mode: "automatic", sendReply });

    const modifyReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const modifyState = stateByConversation.get(currentConversationId);
    expect(modifyReply).toMatch(/RES-SINGLE-01/i);
    expect(modifyReply).toMatch(/Ana Perez/i);
    expect(modifyReply).toMatch(/qué te gustaría cambiar|fechas, habitación o cantidad de huéspedes/i);
    expect(modifyReply).not.toMatch(/decime qué reserva|pasame el código/i);
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(modifyState?.selectedReservationTarget).toMatchObject({
      reservationId: "RES-SINGLE-01",
    });
    expect(modifyState?.reservationSlots?.guestName).toBe("Ana Perez");

    await handleIncomingMessage(msg("cambiar fechas", currentConversationId), { mode: "automatic", sendReply });
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/cu[aá]les.*nuevas fechas/i);

    await handleIncomingMessage(msg("02/10/2026 al 04/10/2026", currentConversationId), { mode: "automatic", sendReply });
    const previewReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(previewReply).toMatch(/RES-SINGLE-01/i);
    expect(previewReply).toMatch(/Fechas: 01\/07\/2026 → 03\/07\/2026 => 02\/10\/2026 → 04\/10\/2026/i);
    expect(previewReply).toMatch(/Nuevo precio total: 240 USD/i);
    expect(previewReply).not.toMatch(/Precio anterior:\s*-\s*USD/i);
    expect((previewReply.match(/Tarifa por noche:/gi) || [])).toHaveLength(1);
    expect(quoteReservationModification).toHaveBeenCalledWith(
      "hotel999", "RES-SINGLE-01", expect.objectContaining({ checkIn: "2026-10-02", checkOut: "2026-10-04" }),
    );
    expect((quoteReservationModification as any).mock.calls.at(-1)?.[2]?.numGuests).toBeUndefined();
    expect(previewReply).not.toMatch(/Titular: -|Huéspedes: -|Fechas: -/i);
    expect(stateByConversation.get(currentConversationId)?.modifyState).toMatchObject({
      awaitingConfirmation: true,
      pendingPatch: expect.objectContaining({ reservationId: "RES-SINGLE-01", checkIn: "2026-10-02", checkOut: "2026-10-04", quoteId: "quote-test-240", quoteVersion: "version-test-1", priceTotal: 240 }),
    });

    await handleIncomingMessage(msg("CONFIRMAR", currentConversationId), { mode: "automatic", sendReply });
    const modifySuccessReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(modifyReservation).toHaveBeenCalledWith(
      "hotel999",
      "RES-SINGLE-01",
      expect.objectContaining({
        checkIn: "2026-10-02",
        checkOut: "2026-10-04",
        quoteId: "quote-test-240",
        quoteVersion: "version-test-1",
      }),
      "web",
    );
    expect(stateByConversation.get(currentConversationId)?.lastReservation).toMatchObject({
      reservationId: "RES-SINGLE-01",
      status: "updated",
      guestName: "Ana Perez",
      roomType: "double",
      numGuests: 2,
      checkIn: "2026-10-02",
      checkOut: "2026-10-04",
    });
    expect(modifySuccessReply).toMatch(/✅.*RES-SINGLE-01/i);
    expect(modifySuccessReply).toMatch(/Ana Perez/i);
    expect(modifySuccessReply).toMatch(/Habitación: doble/i);
    expect(modifySuccessReply).toMatch(/Check-in: 02\/10\/2026/i);
    expect(modifySuccessReply).toMatch(/Check-out: 04\/10\/2026/i);
    expect(modifySuccessReply).toMatch(/Huéspedes: 2/i);
    expect(modifySuccessReply).toMatch(/Total: 240 USD/i);

    await handleIncomingMessage(msg("mostrame mi reserva", currentConversationId), { mode: "automatic", sendReply });
    const postModifySnapshot = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(postModifySnapshot).toMatch(/RES-SINGLE-01|Ana Perez/i);
    expect(postModifySnapshot).toMatch(/Ana Perez/i);
    expect(postModifySnapshot).toMatch(/double|doble/i);
    expect(postModifySnapshot).toMatch(/2/);
    expect(postModifySnapshot).toMatch(/02\/10\/2026.*04\/10\/2026/i);
  });

  it("renueva una quote stale y exige una segunda confirmacion antes de modificar", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-stale-requote-1";
    stateByConversation.set(conversationId, baseSingleReservationState());
    const quoteA = {
      available: true, reservationId: "RES-ONLY-01",
      patch: { roomType: "double", guests: 2, checkInDate: "2026-04-10", checkOutDate: "2026-04-13" },
      currency: "USD", priceTotal: 360, pricePerNight: 120, quoteId: "quote-A", quoteVersion: "version-A",
    };
    const quoteB = { ...quoteA, priceTotal: 420, pricePerNight: 140, quoteId: "quote-B", quoteVersion: "version-B" };
    (quoteReservationModification as any)
      .mockResolvedValueOnce(quoteA)
      .mockResolvedValueOnce(quoteB);
    (modifyReservation as any)
      .mockRejectedValueOnce(new Error("QUOTE_STALE"))
      .mockResolvedValueOnce({
        ok: true,
        message: "✅ Modificada RES-ONLY-01",
        reservation: {
          reservationId: "RES-ONLY-01", hotelId: "hotel999", guestName: "Marcelo Martinez",
          roomType: "double", numGuests: 2, checkInDate: "2026-04-10", checkOutDate: "2026-04-13",
          status: "confirmed", currency: "USD", priceTotal: 420,
          createdAt: "2026-03-22T10:00:00.000Z", updatedAt: "2026-03-23T12:00:00.000Z",
        },
      });

    await handleIncomingMessage(msg("quiero modificar RES-ONLY-01", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("cambiar fechas", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("10/04/2026 al 13/04/2026", conversationId), { mode: "automatic", sendReply });

    expect(stateByConversation.get(conversationId)?.modifyState?.pendingPatch).toMatchObject({
      quoteId: "quote-A", quoteVersion: "version-A", priceTotal: 360,
    });

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });
    const staleReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const stateAfterStale = stateByConversation.get(conversationId);
    expect(modifyReservation).toHaveBeenNthCalledWith(1,
      "hotel999", "RES-ONLY-01", expect.objectContaining({ quoteId: "quote-A", quoteVersion: "version-A" }), "web",
    );
    expect(staleReply).toMatch(/tarifa cambi[oó]|confirm[aá]s estos cambios/i);
    expect(staleReply).not.toMatch(/Reserva actualizada correctamente|Modificada RES-ONLY-01/i);
    expect(quoteReservationModification).toHaveBeenCalledTimes(2);
    expect(stateAfterStale?.modifyState?.pendingPatch).toMatchObject({
      quoteId: "quote-B", quoteVersion: "version-B", priceTotal: 420,
    });
    expect(stateAfterStale?.lastReservation).toMatchObject({
      reservationId: "RES-ONLY-01", status: "created", checkIn: "2026-03-28", checkOut: "2026-03-30",
      guestName: "Marcelo Martinez", roomType: "double", numGuests: "2",
    });
    expect((modifyReservation as any).mock.calls).toHaveLength(1);

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });
    const successReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(modifyReservation).toHaveBeenNthCalledWith(2,
      "hotel999", "RES-ONLY-01", expect.objectContaining({ quoteId: "quote-B", quoteVersion: "version-B" }), "web",
    );
    expect(successReply).toMatch(/Modificada RES-ONLY-01/i);
    expect(stateByConversation.get(conversationId)?.lastReservation).toMatchObject({
      reservationId: "RES-ONLY-01", status: "updated", checkIn: "2026-04-10", checkOut: "2026-04-13",
      guestName: "Marcelo Martinez", roomType: "double", numGuests: 2,
    });
    await expect((modifyReservation as any).mock.results[1].value).resolves.toMatchObject({
      reservation: { reservationId: "RES-ONLY-01", priceTotal: 420, currency: "USD" },
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
    expect(quoteReservationModification).toHaveBeenLastCalledWith(
      "hotel999",
      "RES-ONLY-01",
      expect.objectContaining({ roomType: "triple", numGuests: "3" })
    );
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
        roomType: "triple",
        numGuests: "3",
      }),
      "web"
    );
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/modificada res-only-01/i);
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/Marcelo Martinez.*Habitación: triple.*Check-in: 28\/03\/2026.*Check-out: 30\/03\/2026.*Huéspedes: 3.*Total: 240 USD/is);
  });

  it("[TRACE 8 ETAPAS] '3 para una triple' preserva tres huéspedes durante todo modify", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-numguests-trace-eight-stages";
    const messageText = "3 para una triple";
    const initialState = baseActiveGuestsModifyState();
    stateByConversation.set(conversationId, initialState);
    (modifyReservation as any).mockResolvedValueOnce({
      ok: true,
      message: "✅ Modificada RES-ONLY-01",
      reservation: {
        reservationId: "RES-ONLY-01",
        hotelId: "hotel999",
        guestName: "Marcelo Martinez",
        roomType: "triple",
        numGuests: 3,
        checkInDate: "2026-03-28",
        checkOutDate: "2026-03-30",
        status: "confirmed",
        currency: "USD",
        priceTotal: 240,
        createdAt: "2026-03-22T10:00:00.000Z",
        updatedAt: "2026-03-23T12:00:00.000Z",
      },
    });

    const explicitSlots = extractSlotsFromText(messageText, "es");
    const fallbackGuests = extractGuests(messageText);
    await handleIncomingMessage(msg(messageText, conversationId), { mode: "automatic", sendReply });

    const previewReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const previewState = stateByConversation.get(conversationId);
    const quoteCandidate = (quoteReservationModification as any).mock.calls.at(-1)?.[2];
    const pendingPatch = previewState?.modifyState?.pendingPatch;

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });

    const providerPayload = (modifyReservation as any).mock.calls.at(-1)?.[2];
    const providerResult = await (modifyReservation as any).mock.results.at(-1)?.value;
    const persistedState = stateByConversation.get(conversationId);
    const immediateReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");

    await handleIncomingMessage(msg("mostrame mi reserva", conversationId), { mode: "automatic", sendReply });
    const readbackReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");

    const trace = {
      stage1_input_and_state: {
        message: messageText,
        activeField: (initialState as any).modifyState.activeField,
        canonicalRoomType: initialState.lastReservation.roomType,
        canonicalNumGuests: initialState.lastReservation.numGuests,
      },
      stage2_explicit_extraction: {
        roomType: explicitSlots.roomType,
        numGuests: explicitSlots.numGuests,
        fallbackNumGuests: fallbackGuests,
      },
      stage3_modify_candidate: {
        roomType: quoteCandidate?.roomType,
        numGuests: quoteCandidate?.numGuests,
      },
      stage4_pending_patch: {
        roomType: pendingPatch?.roomType,
        numGuests: pendingPatch?.numGuests,
      },
      stage5_preview_and_quote: {
        quotedNumGuests: quoteCandidate?.numGuests,
        showsRoomTransition: /habitaci[oó]n:.*doble.*triple/i.test(previewReply),
        showsGuestTransition: /hu[eé]spedes:.*2.*3/i.test(previewReply),
      },
      stage6_provider_payload: {
        roomType: providerPayload?.roomType,
        numGuests: providerPayload?.numGuests,
      },
      stage7_provider_result: {
        roomType: providerResult?.reservation?.roomType,
        numGuests: providerResult?.reservation?.numGuests,
      },
      stage8_persistence_and_readback: {
        persistedRoomType: persistedState?.lastReservation?.roomType,
        persistedNumGuests: persistedState?.lastReservation?.numGuests,
        immediateShowsThree: /hu[eé]spedes:\s*3/i.test(immediateReply),
        readbackShowsThree: /hu[eé]spedes:\s*3/i.test(readbackReply),
      },
    };

    expect(trace).toEqual({
      stage1_input_and_state: {
        message: messageText,
        activeField: "guests",
        canonicalRoomType: "double",
        canonicalNumGuests: "2",
      },
      stage2_explicit_extraction: {
        roomType: "triple",
        numGuests: "3",
        fallbackNumGuests: "3",
      },
      stage3_modify_candidate: { roomType: "triple", numGuests: "3" },
      stage4_pending_patch: { roomType: "triple", numGuests: "3" },
      stage5_preview_and_quote: {
        quotedNumGuests: "3",
        showsRoomTransition: true,
        showsGuestTransition: true,
      },
      stage6_provider_payload: { roomType: "triple", numGuests: "3" },
      stage7_provider_result: { roomType: "triple", numGuests: 3 },
      stage8_persistence_and_readback: {
        persistedRoomType: "triple",
        persistedNumGuests: 3,
        immediateShowsThree: true,
        readbackShowsThree: true,
      },
    });
  });

  it("[pendingFields roomType] '3 en una triple' conserva ambos cambios", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-numguests-pending-room";
    stateByConversation.set(conversationId, baseActiveGuestsModifyState(["roomType"]));

    await handleIncomingMessage(msg("3 en una triple", conversationId), { mode: "automatic", sendReply });

    expect(quoteReservationModification).toHaveBeenCalledWith(
      "hotel999",
      "RES-ONLY-01",
      expect.objectContaining({ roomType: "triple", numGuests: "3" })
    );
    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      awaitingConfirmation: true,
      pendingPatch: expect.objectContaining({ roomType: "triple", numGuests: "3" }),
    });
  });

  it.each([
    { messageText: "Triple para 3 personas", slug: "explicit-personas" },
    { messageText: "Somos 3 y queremos una triple", slug: "somos" },
    { messageText: "3 huéspedes en habitación triple", slug: "huespedes" },
    { messageText: "Quiero una triple para tres personas", slug: "spelled-personas" },
  ])("[NUMGUESTS TRACE] '$messageText' llega al preview con tres huéspedes y habitación triple", async ({ messageText, slug }) => {
    const sendReply = vi.fn(async () => {});
    const conversationId = `conv-ref-modify-numguests-positive-${slug}`;
    stateByConversation.set(conversationId, baseActiveGuestsModifyState());

    await handleIncomingMessage(msg(messageText, conversationId), { mode: "automatic", sendReply });

    expect(quoteReservationModification).toHaveBeenCalledWith(
      "hotel999",
      "RES-ONLY-01",
      expect.objectContaining({ roomType: "triple", numGuests: "3" })
    );
    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      awaitingConfirmation: true,
      pendingPatch: expect.objectContaining({ roomType: "triple", numGuests: "3" }),
    });
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/habitaci[oó]n:.*triple.*hu[eé]spedes:.*3/is);
  });

  it("[NUMGUESTS TRACE][no-op] una reserva ya triple para tres no genera un patch ficticio", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-numguests-no-op";
    const tripleReservation = {
      ...baseSingleReservationState().lastReservation,
      roomType: "triple",
      numGuests: "3",
    };
    stateByConversation.set(conversationId, {
      ...baseActiveGuestsModifyState(),
      reservationSlots: {
        ...baseSingleReservationState().reservationSlots,
        roomType: "triple",
        numGuests: "3",
      },
      reservationHistory: [tripleReservation],
      lastReservation: tripleReservation,
    });

    await handleIncomingMessage(msg("Triple para 3 personas", conversationId), { mode: "automatic", sendReply });

    expect(quoteReservationModification).not.toHaveBeenCalled();
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(stateByConversation.get(conversationId)?.modifyState?.pendingPatch).toBeUndefined();
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/no detect[eé] un cambio concreto/i);
  });

  it("[NUMGUESTS TRACE][payload omitido] acepta que el provider conserve dos cuando no se enviaron huéspedes", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-numguests-provider-preserved";
    stateByConversation.set(conversationId, baseSingleReservationState());

    await handleIncomingMessage(msg("quiero modificar RES-ONLY-01", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("cambiar tipo de habitación", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("triple", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });

    const providerPatch = (modifyReservation as any).mock.calls.at(-1)?.[2];
    expect(providerPatch.numGuests).toBeUndefined();
    expect(stateByConversation.get(conversationId)?.lastReservation).toMatchObject({
      reservationId: "RES-ONLY-01",
      status: "updated",
      roomType: "triple",
      numGuests: 2,
    });
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/hu[eé]spedes:\s*2/i);
  });

  it("M3 compone huéspedes y habitación explícitos con activeField guests producido por el runtime", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-m3-runtime-active-guests";
    stateByConversation.set(conversationId, baseSingleReservationState());

    await handleIncomingMessage(msg("Quiero modificar mi reserva", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("Quiero modificar los huéspedes", conversationId), { mode: "automatic", sendReply });

    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      activeField: "guests",
      pendingFields: [],
    });
    expect(quoteReservationModification).not.toHaveBeenCalled();

    await handleIncomingMessage(msg("3 personas y habitación triple", conversationId), { mode: "automatic", sendReply });

    const previewReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(quoteReservationModification).toHaveBeenCalledWith(
      "hotel999",
      "RES-ONLY-01",
      expect.objectContaining({ roomType: "triple", numGuests: "3" })
    );
    expect(previewReply).toMatch(/antes de aplicar el cambio/i);
    expect(previewReply).toMatch(/habitaci[oó]n: .*triple/i);
    expect(previewReply).toMatch(/hu[eé]spedes: .*3/i);
    expect(previewReply).not.toMatch(/no admite|cambiar a otra habitaci[oó]n/i);
    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      awaitingConfirmation: true,
      pendingPatch: expect.objectContaining({
        reservationId: "RES-ONLY-01",
        roomType: "triple",
        numGuests: "3",
      }),
    });
    expect(modifyReservation).not.toHaveBeenCalled();
  });

  it("M4 cotiza, previsualiza y confirma ambos campos con activeField roomType producido por el runtime", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-m4-runtime-active-room";
    stateByConversation.set(conversationId, baseSingleReservationState());

    await handleIncomingMessage(msg("Quiero modificar mi reserva", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("Quiero cambiar habitación", conversationId), { mode: "automatic", sendReply });

    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      activeField: "roomType",
      pendingFields: [],
    });
    expect(quoteReservationModification).not.toHaveBeenCalled();

    await handleIncomingMessage(msg("Habitación triple para 3 personas", conversationId), { mode: "automatic", sendReply });

    const previewReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(quoteReservationModification).toHaveBeenCalledWith(
      "hotel999",
      "RES-ONLY-01",
      expect.objectContaining({ roomType: "triple", numGuests: "3" })
    );
    expect(previewReply).toMatch(/antes de aplicar el cambio/i);
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
    expect(modifyReservation).not.toHaveBeenCalled();

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });

    expect(modifyReservation).toHaveBeenCalledWith(
      "hotel999",
      "RES-ONLY-01",
      expect.objectContaining({ roomType: "triple", numGuests: "3" }),
      "web"
    );
    expect(stateByConversation.get(conversationId)?.reservationSlots).toMatchObject({
      roomType: "triple",
      numGuests: 3,
    });
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/Huéspedes: 3/i);
  });

  it("M1 preserva el número breve contextual hasta completar una habitación compatible", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-m1-short-number-runtime";
    stateByConversation.set(conversationId, baseSingleReservationState());

    await handleIncomingMessage(msg("Quiero modificar mi reserva", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("Quiero modificar los huéspedes", conversationId), { mode: "automatic", sendReply });
    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      activeField: "guests",
      pendingFields: [],
    });

    await handleIncomingMessage(msg("3", conversationId), { mode: "automatic", sendReply });

    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/no admite|cambiar a|habitaci[oó]n/i);
    expect(stateByConversation.get(conversationId)?.reservationSlots).toMatchObject({ numGuests: "3" });
    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      activeField: "roomType",
      pendingFields: [],
    });
    expect(quoteReservationModification).not.toHaveBeenCalled();

    await handleIncomingMessage(msg("triple", conversationId), { mode: "automatic", sendReply });

    expect(quoteReservationModification).toHaveBeenCalledWith(
      "hotel999",
      "RES-ONLY-01",
      expect.objectContaining({ roomType: "triple", numGuests: "3" })
    );
    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      awaitingConfirmation: true,
      pendingPatch: expect.objectContaining({
        reservationId: "RES-ONLY-01",
        roomType: "triple",
        numGuests: "3",
      }),
    });
  });

  it("M5 conserva ambos campos solicitados al responder 3 y luego triple", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-m5-runtime-queued-fields";
    stateByConversation.set(conversationId, baseSingleReservationState());

    await handleIncomingMessage(msg("Quiero modificar mi reserva", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("Quiero modificar huéspedes y habitación", conversationId), { mode: "automatic", sendReply });
    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      activeField: "guests",
      pendingFields: ["roomType"],
    });

    await handleIncomingMessage(msg("3", conversationId), { mode: "automatic", sendReply });
    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      activeField: "roomType",
      pendingFields: [],
    });
    expect(stateByConversation.get(conversationId)?.reservationSlots).toMatchObject({ numGuests: "3" });

    await handleIncomingMessage(msg("triple", conversationId), { mode: "automatic", sendReply });

    expect(quoteReservationModification).toHaveBeenCalledWith(
      "hotel999",
      "RES-ONLY-01",
      expect.objectContaining({ roomType: "triple", numGuests: "3" })
    );
    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      awaitingConfirmation: true,
      pendingPatch: expect.objectContaining({
        reservationId: "RES-ONLY-01",
        roomType: "triple",
        numGuests: "3",
      }),
    });
  });

  it("preserva huéspedes acumulados al completar roomType después de una incompatibilidad de capacidad", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-multifield-guests-first-1";
    stateByConversation.set(conversationId, baseSingleReservationState({
      activeReservationContext: {
        kind: "reservation",
        reservationId: "RES-ONLY-01",
        phase: "confirmed",
        updatedAt: "2026-03-22T10:00:00.000Z",
      },
      selectedReservationTarget: {
        reservationId: "RES-ONLY-01",
        kind: "confirmed",
        source: "active_focus",
        resolutionMode: "weak",
        resolvedAt: "2026-03-22T10:00:00.000Z",
      },
      modifyState: {
        activeField: "guests",
        pendingFields: ["roomType"],
        updatedAt: "2026-03-22T10:00:00.000Z",
      },
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
    }));

    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      activeField: "guests",
      pendingFields: ["roomType"],
    });

    await handleIncomingMessage(msg("3 personas", conversationId), { mode: "automatic", sendReply });

    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/no admite|cambiar a|habitaci[oó]n/i);
    expect(stateByConversation.get(conversationId)?.reservationSlots).toMatchObject({ numGuests: "3" });
    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({ activeField: "roomType" });

    await handleIncomingMessage(msg("triple", conversationId), { mode: "automatic", sendReply });

    const previewReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(quoteReservationModification).toHaveBeenLastCalledWith(
      "hotel999",
      "RES-ONLY-01",
      expect.objectContaining({ roomType: "triple", numGuests: "3" })
    );
    expect(previewReply).toMatch(/antes de aplicar el cambio/i);
    expect(previewReply).toMatch(/habitaci[oó]n: .*triple/i);
    expect(previewReply).toMatch(/hu[eé]spedes: .*3/i);
    expect(previewReply).not.toMatch(/nueva cantidad de hu[eé]spedes|qu[eé] tipo de habitaci[oó]n/i);
    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      awaitingConfirmation: true,
      pendingPatch: expect.objectContaining({
        reservationId: "RES-ONLY-01",
        roomType: "triple",
        numGuests: "3",
      }),
    });

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });

    const providerPatch = (modifyReservation as any).mock.calls.at(-1)?.[2];
    expect(providerPatch).toEqual({
      roomType: "triple",
      numGuests: "3",
      checkIn: undefined,
      checkOut: undefined,
      quoteId: "quote-test-240",
      quoteVersion: "version-test-1",
    });
  });

  it.each([
    { activeField: "roomType", pendingFields: ["guests"], label: "roomType activo" },
    { activeField: "guests", pendingFields: ["roomType"], label: "guests activo" },
  ] as const)("consume activeField y pendingFields satisfechos en el mismo turno: $label", async ({ activeField, pendingFields }) => {
    const sendReply = vi.fn(async () => {});
    const conversationId = `conv-ref-modify-multifield-same-turn-${activeField}`;
    stateByConversation.set(conversationId, baseSingleReservationState({
      activeReservationContext: {
        kind: "reservation",
        reservationId: "RES-ONLY-01",
        phase: "confirmed",
        updatedAt: "2026-03-22T10:00:00.000Z",
      },
      selectedReservationTarget: {
        reservationId: "RES-ONLY-01",
        kind: "confirmed",
        source: "active_focus",
        resolutionMode: "weak",
        resolvedAt: "2026-03-22T10:00:00.000Z",
      },
      modifyState: {
        activeField,
        pendingFields: [...pendingFields],
        updatedAt: "2026-03-22T10:00:00.000Z",
      },
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
    }));

    await handleIncomingMessage(msg("triple para 3 personas", conversationId), { mode: "automatic", sendReply });

    const previewReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(previewReply).toMatch(/antes de aplicar el cambio/i);
    expect(previewReply).toMatch(/habitaci[oó]n: .*triple/i);
    expect(previewReply).toMatch(/hu[eé]spedes: .*3/i);
    expect(previewReply).not.toMatch(/nueva cantidad de hu[eé]spedes|qu[eé] tipo de habitaci[oó]n/i);
    expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
      awaitingConfirmation: true,
      pendingPatch: expect.objectContaining({
        reservationId: "RES-ONLY-01",
        roomType: "triple",
        numGuests: "3",
      }),
    });
  });

  it("conserva availability y quote al completar dates junto con otro campo de la cola", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-multifield-dates-same-turn";
    stateByConversation.set(conversationId, baseSingleReservationState({
      activeReservationContext: {
        kind: "reservation",
        reservationId: "RES-ONLY-01",
        phase: "confirmed",
        updatedAt: "2026-03-22T10:00:00.000Z",
      },
      selectedReservationTarget: {
        reservationId: "RES-ONLY-01",
        kind: "confirmed",
        source: "active_focus",
        resolutionMode: "weak",
        resolvedAt: "2026-03-22T10:00:00.000Z",
      },
      modifyState: {
        activeField: "roomType",
        pendingFields: ["dates"],
        updatedAt: "2026-03-22T10:00:00.000Z",
      },
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
    }));

    await handleIncomingMessage(
      msg("triple del 10/04/2026 al 13/04/2026", conversationId),
      { mode: "automatic", sendReply }
    );

    const previewReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(askAvailability).toHaveBeenCalledWith(
      "hotel999",
      expect.objectContaining({ roomType: "triple", checkIn: "2026-04-10", checkOut: "2026-04-13" })
    );
    expect(quoteReservationModification).toHaveBeenCalledWith(
      "hotel999",
      "RES-ONLY-01",
      expect.objectContaining({ roomType: "triple", checkIn: "2026-04-10", checkOut: "2026-04-13" })
    );
    expect(previewReply).toMatch(/antes de aplicar el cambio/i);
    expect(previewReply).toMatch(/10\/04\/2026.*13\/04\/2026/i);
    expect(stateByConversation.get(conversationId)?.modifyState?.pendingPatch).toMatchObject({
      reservationId: "RES-ONLY-01",
      roomType: "triple",
      checkIn: "2026-04-10",
      checkOut: "2026-04-13",
    });
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
      reservationHistory: [{
        reservationId: "RES-6AE3E6",
        status: "created",
        createdAt: "2026-06-12T10:00:00.000Z",
        channel: "web",
        guestName: "Raul Carsoglio",
        roomType: "double",
        checkIn: "2026-06-18",
        checkOut: "2026-06-20",
        numGuests: "3",
      }],
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
    expect(stateByConversation.get(conversationId)?.modifyState?.awaitingConfirmation).not.toBe(true);
    expect(stateByConversation.get(conversationId)?.modifyState?.pendingPatch).toBeUndefined();
    expect(quoteReservationModification).not.toHaveBeenCalled();
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
    "Código: RES-403A89",
    "reserva RES-403A89",
    "RES-403A89",
    "quiero modificar RES-403A89",
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
      numGuests: 2,
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

  it.each([
    ["Descartá los cambios", "discard"],
    ["Quiero cancelar los cambios", "cancel-changes"],
    ["Quiero cancelar los cambios de mi reserva", "cancel-booking-changes"],
    ["Cambié de idea, descartá los cambios", "changed-mind-discard"],
    ["Cambié de idea, dejá la reserva como estaba", "keep-original"],
    ["Cancelá el cambio", "cancel-change"],
  ])("[M6] %s descarta exclusivamente el preview pendiente", async (rejectionText, suffix) => {
    const sendReply = vi.fn(async () => {});
    const conversationId = `conv-ref-m6-discard-${suffix}`;
    await preparePendingModifyPreview(conversationId, sendReply);
    const stateBeforeDiscard = stateByConversation.get(conversationId);
    const canonicalLastReservation = stateBeforeDiscard?.lastReservation;
    const canonicalReservationHistory = stateBeforeDiscard?.reservationHistory;

    await handleIncomingMessage(msg(rejectionText, conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const currentState = stateByConversation.get(conversationId);
    expect(replyText).toMatch(/no apliqu[eé] cambios|sigue igual/i);
    expect(currentState?.modifyState ?? null).toBeNull();
    expect(currentState?.pendingCancellation ?? null).toBeNull();
    expect(currentState?.reservationSlots).toMatchObject({ roomType: "double", numGuests: "2" });
    expect(currentState?.lastProposal ?? null).toBeNull();
    expect(currentState?.pendingAvailabilityVerification ?? null).toBeNull();
    expect(currentState?.lastReservation).toEqual(canonicalLastReservation);
    expect(currentState?.reservationHistory).toEqual(canonicalReservationHistory);
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(modifyReservation).not.toHaveBeenCalled();

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(modifyReservation).not.toHaveBeenCalled();
  });

  it("[FIX-CANCEL-SCOPE/M6-01] después de descartar el preview, cancelar los cambios no prepara cancelación", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-cancel-changes-after-discard";
    await preparePendingModifyPreview(conversationId, sendReply);

    await handleIncomingMessage(msg("Descartá los cambios", conversationId), { mode: "automatic", sendReply });
    sendReply.mockClear();

    await handleIncomingMessage(msg("Quiero cancelar los cambios", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const currentState = stateByConversation.get(conversationId);
    expect(replyText).toMatch(/no (?:hay|quedan).*cambios|cambios pendientes|qu[eé] quer[eé]s cancelar/i);
    expect(currentState?.modifyState ?? null).toBeNull();
    expect(currentState?.pendingCancellation ?? null).toBeNull();
    expect(currentState?.lastReservation).toMatchObject({
      reservationId: "RES-ONLY-01",
      status: "created",
      roomType: "double",
      numGuests: "2",
    });
    expect(askAvailability).not.toHaveBeenCalled();
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(confirmAndCreate).not.toHaveBeenCalled();
    expect(modifyReservation).not.toHaveBeenCalled();

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(modifyReservation).not.toHaveBeenCalled();
  });

  it("[FIX-CANCEL-SCOPE/M6-06] Cancelar con foco débil pide objeto y no deja confirmación ejecutable", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-bare-cancel-weak-focus";
    stateByConversation.set(conversationId, baseSingleReservationState({
      activeReservationContext: {
        kind: "reservation",
        reservationId: "RES-ONLY-01",
        phase: "confirmed",
        updatedAt: "2026-03-22T10:00:00.000Z",
      },
      selectedReservationTarget: {
        reservationId: "RES-ONLY-01",
        kind: "reservation",
        source: "active_focus",
        resolutionMode: "weak",
      },
    }));

    await handleIncomingMessage(msg("Cancelar", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const currentState = stateByConversation.get(conversationId);
    expect(replyText).toMatch(/qu[eé] quer[eé]s cancelar|qu[eé] operaci[oó]n|reserva.*cambios|cambios.*reserva/i);
    expect(currentState?.pendingCancellation ?? null).toBeNull();
    expect(currentState?.conversationFocus ?? null).toBeNull();
    expect(currentState?.activeFlow ?? null).toBeNull();
    expect(currentState?.desiredAction).toBeUndefined();
    expect(askAvailability).not.toHaveBeenCalled();
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(confirmAndCreate).not.toHaveBeenCalled();
    expect(modifyReservation).not.toHaveBeenCalled();

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(modifyReservation).not.toHaveBeenCalled();
  });

  it("[M6] 'Quiero cancelar mi reserva' abandona el preview y exige confirmación antes de cancelar", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-m6-cancel-reservation-with-preview";
    await preparePendingModifyPreview(conversationId, sendReply);

    await handleIncomingMessage(msg("Quiero cancelar mi reserva", conversationId), { mode: "automatic", sendReply });

    const currentState = stateByConversation.get(conversationId);
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/reserva RES-ONLY-01.*CONFIRMAR/i);
    expect(currentState?.modifyState ?? null).toBeNull();
    expect(currentState?.pendingCancellation).toMatchObject({
      reservationId: "RES-ONLY-01",
      awaitingConfirmation: true,
    });
    expect(currentState?.reservationSlots).toMatchObject({ roomType: "double", numGuests: "2" });
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(modifyReservation).not.toHaveBeenCalled();

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });
    expect(cancelReservation).toHaveBeenCalledWith("hotel999", "RES-ONLY-01");
    expect(modifyReservation).not.toHaveBeenCalled();
  });

  it("[M6] 'Quiero cancelar esa reserva' usa el target activo del preview guest-wide y continúa hasta confirmar cancel", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-m6-cancel-presented-preview";
    await preparePendingModifyPreview(conversationId, sendReply, {
      initialState: {
        hotelId: "hotel999",
        conversationId,
        lastReservation: {
          reservationId: "RES-7427EB",
          status: "created",
          createdAt: "2026-03-22T10:00:00.000Z",
          channel: "web",
          guestName: "Marcelo Martinez",
          roomType: "single",
          checkIn: "2026-03-28",
          checkOut: "2026-03-30",
          numGuests: "1",
        },
        lastPresentedReservations: {
          guestId: "g1",
          presentedAt: "2026-03-23T11:00:00.000Z",
          reservations: [{
            reservationId: "RES-7427EB",
            status: "created",
            createdAt: "2026-03-22T10:00:00.000Z",
            channel: "web",
            guestName: "Marcelo Martinez",
            roomType: "single",
            checkIn: "2026-03-28",
            checkOut: "2026-03-30",
            numGuests: "1",
          }],
        },
        updatedAt: "2026-03-23T11:00:00.000Z",
      },
      request: "modificá RES-7427EB a triple para 3 personas",
      expectedPatch: { reservationId: "RES-7427EB", roomType: "triple", numGuests: "3" },
    });

    const previewState = stateByConversation.get(conversationId);
    expect(previewState?.reservationHistory ?? []).toEqual([]);
    expect(previewState?.lastReservation).toMatchObject({
      reservationId: "RES-7427EB",
      status: "created",
      roomType: "single",
      numGuests: "1",
    });
    expect(previewState?.lastPresentedReservations?.reservations).toEqual([
      expect.objectContaining({ reservationId: "RES-7427EB", status: "created" }),
    ]);

    await handleIncomingMessage(msg("Quiero cancelar esa reserva", conversationId), { mode: "automatic", sendReply });

    const cancellationState = stateByConversation.get(conversationId);
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/reserva RES-7427EB.*CONFIRMAR/i);
    expect(cancellationState?.modifyState ?? null).toBeNull();
    expect(cancellationState?.pendingCancellation).toMatchObject({
      reservationId: "RES-7427EB",
      awaitingConfirmation: true,
    });
    expect(cancellationState?.reservationSlots).toMatchObject({ roomType: "single", numGuests: "1" });
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(modifyReservation).not.toHaveBeenCalled();

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });
    expect(cancelReservation).toHaveBeenCalledWith("hotel999", "RES-7427EB");
    expect(modifyReservation).not.toHaveBeenCalled();
  });

  it("[M6] 'Quiero cancelar mi reserva' sin preview conserva el corredor cancel", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-m6-cancel-reservation-without-preview";
    stateByConversation.set(conversationId, baseSingleReservationState({
      activeReservationContext: {
        kind: "reservation",
        reservationId: "RES-ONLY-01",
        phase: "confirmed",
        updatedAt: "2026-03-22T10:00:00.000Z",
      },
    }));

    await handleIncomingMessage(msg("Quiero cancelar mi reserva", conversationId), { mode: "automatic", sendReply });

    expect(stateByConversation.get(conversationId)?.pendingCancellation).toMatchObject({
      reservationId: "RES-ONLY-01",
      awaitingConfirmation: true,
    });
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(modifyReservation).not.toHaveBeenCalled();
  });

  it("[M6] objetos contradictorios invalidan el preview y solicitan aclaración", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-m6-conflicting-objects";
    await preparePendingModifyPreview(conversationId, sendReply);

    await handleIncomingMessage(
      msg("Cancelá los cambios y la reserva", conversationId),
      { mode: "automatic", sendReply }
    );

    const currentState = stateByConversation.get(conversationId);
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/cancelar el cambio pendiente o la reserva/i);
    expect(currentState?.modifyState ?? null).toBeNull();
    expect(currentState?.pendingCancellation ?? null).toBeNull();
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(modifyReservation).not.toHaveBeenCalled();
  });

  it("[M6] un target que quedó inactivo falla cerrado al confirmar el preview", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-m6-inactive-preview-target";
    await preparePendingModifyPreview(conversationId, sendReply);
    const stateWithPreview = stateByConversation.get(conversationId);
    stateByConversation.set(conversationId, {
      ...stateWithPreview,
      lastReservation: {
        ...stateWithPreview.lastReservation,
        status: "cancelled",
        createdAt: "2026-03-23T11:00:00.000Z",
      },
      reservationHistory: [
        ...stateWithPreview.reservationHistory,
        {
          ...stateWithPreview.lastReservation,
          status: "cancelled",
          createdAt: "2026-03-23T11:00:00.000Z",
        },
      ],
    });

    await handleIncomingMessage(msg("Sí", conversationId), { mode: "automatic", sendReply });

    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/no encuentro una reserva activa/i);
    expect(stateByConversation.get(conversationId)?.modifyState ?? null).toBeNull();
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(modifyReservation).not.toHaveBeenCalled();
  });

  it("[M6] 'Sí' con preview confirma únicamente la modificación pendiente", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-m6-confirm-modify";
    await preparePendingModifyPreview(conversationId, sendReply);

    await handleIncomingMessage(msg("Sí", conversationId), { mode: "automatic", sendReply });

    expect(modifyReservation).toHaveBeenCalledWith(
      "hotel999",
      "RES-ONLY-01",
      expect.objectContaining({ roomType: "triple", numGuests: "3" }),
      "web"
    );
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(stateByConversation.get(conversationId)?.modifyState ?? null).toBeNull();
  });

  it.each([
    ["Quiero cancelar esa reserva", "deictic"],
    ["Cancelá mi reserva", "possessive"],
  ])("[CONTRACT C1/T1] %s descarta el preview y prepara cancelación sin ejecutar operaciones externas", async (cancelText, suffix) => {
    const sendReply = vi.fn(async () => {});
    const conversationId = `conv-ref-modify-cancel-precedence-t1-${suffix}`;
    await preparePendingModifyPreview(conversationId, sendReply);

    await handleIncomingMessage(msg(cancelText, conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const currentState = stateByConversation.get(conversationId);
    expect(replyText).toMatch(/descart[eé] el cambio pendiente/i);
    expect(replyText).toMatch(/reserva RES-ONLY-01.*CONFIRMAR/i);
    expect(currentState?.modifyState ?? null).toBeNull();
    expect(currentState?.pendingCancellation).toMatchObject({
      reservationId: "RES-ONLY-01",
      awaitingConfirmation: true,
    });
    expect(currentState?.selectedReservationTarget).toMatchObject({ reservationId: "RES-ONLY-01" });
    expect(currentState?.activeReservationContext).toMatchObject({ kind: "reservation", reservationId: "RES-ONLY-01" });
    expect(currentState?.conversationFocus).toMatchObject({ domain: "reservation", subFlow: "cancel", active: true });
    expect(currentState?.activeFlow).toBe("cancel_reservation");
    expect(currentState?.desiredAction).toBe("cancel");
    expect(currentState?.reservationSlots).toMatchObject({ roomType: "double", numGuests: "2" });
    expect(currentState?.lastReservation).toMatchObject({ reservationId: "RES-ONLY-01", roomType: "double", numGuests: "2" });
    expect(askAvailability).not.toHaveBeenCalled();
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(confirmAndCreate).not.toHaveBeenCalled();
    expect(modifyReservation).not.toHaveBeenCalled();
  });

  it.each([
    ["Cancelá el cambio", "change"],
    ["Cancelá la modificación", "modification"],
  ])("[CONTRACT C1/T2] %s descarta solamente el patch", async (rejectionText, suffix) => {
    const sendReply = vi.fn(async () => {});
    const conversationId = `conv-ref-modify-cancel-precedence-t2-${suffix}`;
    await preparePendingModifyPreview(conversationId, sendReply);

    await handleIncomingMessage(msg(rejectionText, conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const currentState = stateByConversation.get(conversationId);
    expect(replyText).toMatch(/no apliqu[eé] cambios|sigue igual/i);
    expect(currentState?.modifyState ?? null).toBeNull();
    expect(currentState?.pendingCancellation ?? null).toBeNull();
    expect(currentState?.conversationFocus ?? null).toBeNull();
    expect(currentState?.activeFlow ?? null).toBeNull();
    expect(currentState?.desiredAction).toBeUndefined();
    expect(currentState?.reservationSlots).toMatchObject({ roomType: "double", numGuests: "2" });
    expect(currentState?.lastReservation).toMatchObject({ reservationId: "RES-ONLY-01", roomType: "double", numGuests: "2" });
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(modifyReservation).not.toHaveBeenCalled();

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(modifyReservation).not.toHaveBeenCalled();
  });

  it("[CONTRACT C1/T3] 'Cancelar' sin objeto pide aclaración y bloquea CONFIRMAR", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-cancel-precedence-t3";
    await preparePendingModifyPreview(conversationId, sendReply);

    await handleIncomingMessage(msg("Cancelar", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const currentState = stateByConversation.get(conversationId);
    expect(replyText).toMatch(/cancelar el cambio pendiente o la reserva/i);
    expect(currentState?.modifyState ?? null).toBeNull();
    expect(currentState?.pendingCancellation ?? null).toBeNull();
    expect(currentState?.selectedReservationTarget).toMatchObject({ reservationId: "RES-ONLY-01" });
    expect(currentState?.conversationFocus ?? null).toBeNull();
    expect(currentState?.activeFlow ?? null).toBeNull();
    expect(currentState?.desiredAction).toBeUndefined();
    expect(currentState?.reservationSlots).toMatchObject({ roomType: "double", numGuests: "2" });
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(modifyReservation).not.toHaveBeenCalled();

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(modifyReservation).not.toHaveBeenCalled();
  });

  it("[CONTRACT C1/T4] después del cambio de intención, CONFIRMAR ejecuta solamente cancel", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-cancel-precedence-t4";
    await preparePendingModifyPreview(conversationId, sendReply);
    await handleIncomingMessage(msg("Quiero cancelar esa reserva", conversationId), { mode: "automatic", sendReply });
    sendReply.mockClear();

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const currentState = stateByConversation.get(conversationId);
    expect(cancelReservation).toHaveBeenCalledWith("hotel999", "RES-ONLY-01");
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(replyText).toMatch(/Cancelada RES-ONLY-01/i);
    expect(currentState?.modifyState ?? null).toBeNull();
    expect(currentState?.pendingCancellation ?? null).toBeNull();
    expect(currentState?.lastReservation).toMatchObject({ reservationId: "RES-ONLY-01", status: "cancelled", roomType: "double", numGuests: "2" });
  });

  it("[CONTRACT C1/T5] CONFIRMAR sin intención competidora conserva la ejecución válida de modify", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-cancel-precedence-t5";
    await preparePendingModifyPreview(conversationId, sendReply);

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });

    expect(modifyReservation).toHaveBeenCalledWith(
      "hotel999",
      "RES-ONLY-01",
      expect.objectContaining({ roomType: "triple", numGuests: "3" }),
      "web"
    );
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/Modificada RES-ONLY-01/i);
    expect(stateByConversation.get(conversationId)?.modifyState ?? null).toBeNull();
  });

  it("[CONTRACT C1/T6] una FAQ pura preserva el preview pendiente", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-cancel-precedence-t6";
    await preparePendingModifyPreview(conversationId, sendReply);

    await handleIncomingMessage(msg("¿Tienen wifi?", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const currentState = stateByConversation.get(conversationId);
    expect(replyText).toMatch(/wi-?fi/i);
    expect(currentState?.modifyState).toMatchObject({
      awaitingConfirmation: true,
      pendingPatch: expect.objectContaining({ reservationId: "RES-ONLY-01", roomType: "triple", numGuests: "3" }),
    });
    expect(currentState?.pendingCancellation ?? null).toBeNull();
    expect(currentState?.selectedReservationTarget).toMatchObject({ reservationId: "RES-ONLY-01" });
    expect(currentState?.activeReservationContext).toMatchObject({ kind: "reservation", reservationId: "RES-ONLY-01" });
    expect(currentState?.conversationFocus).toMatchObject({ domain: "reservation", subFlow: "modify", active: true });
    expect(currentState?.reservationSlots).toMatchObject({ roomType: "triple", numGuests: "3" });
    expect(currentState?.lastReservation).toMatchObject({ reservationId: "RES-ONLY-01", roomType: "double", numGuests: "2" });
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(modifyReservation).not.toHaveBeenCalled();
  });

  it("[CONTRACT C1/target-switch] una cancelación con código explícito reemplaza el target del preview", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-cancel-target-switch";
    await preparePendingModifyPreview(conversationId, sendReply, {
      initialState: baseMultiReservationState(),
      request: "modificá RES-OLD-01 a triple para 2 personas",
      expectedPatch: { reservationId: "RES-OLD-01", roomType: "triple", numGuests: "2" },
    });

    await handleIncomingMessage(msg("Quiero cancelar RES-NEW-02", conversationId), { mode: "automatic", sendReply });

    const currentState = stateByConversation.get(conversationId);
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/reserva RES-NEW-02.*CONFIRMAR/i);
    expect(currentState?.modifyState ?? null).toBeNull();
    expect(currentState?.pendingCancellation).toMatchObject({ reservationId: "RES-NEW-02", awaitingConfirmation: true });
    expect(currentState?.selectedReservationTarget).toMatchObject({ reservationId: "RES-NEW-02", source: "explicit_id" });
    expect(currentState?.activeReservationContext).toMatchObject({ reservationId: "RES-NEW-02", phase: "confirmed" });
    expect(currentState?.reservationSlots).toMatchObject({ roomType: "double", numGuests: "2", checkIn: "2026-03-28", checkOut: "2026-03-30" });
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(modifyReservation).not.toHaveBeenCalled();
  });

  it("[CONTRACT C1/ambiguous] una referencia ambigua invalida el preview sin habilitar cancelación", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-cancel-ambiguous";
    await preparePendingModifyPreview(conversationId, sendReply, {
      initialState: baseThreeReservationState(),
      request: "modificá RES-MID-02 a triple para 3 personas",
      expectedPatch: { reservationId: "RES-MID-02", roomType: "triple", numGuests: "3" },
    });

    await handleIncomingMessage(msg("Quiero cancelar la otra", conversationId), { mode: "automatic", sendReply });

    const currentState = stateByConversation.get(conversationId);
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/precisi[oó]n|c[oó]digo|fecha/i);
    expect(currentState?.modifyState ?? null).toBeNull();
    expect(currentState?.pendingCancellation ?? null).toBeNull();
    expect(currentState?.selectedReservationTarget ?? null).toBeNull();
    expect(currentState?.reservationSlots).toMatchObject({ roomType: "double", numGuests: "2", checkIn: "2026-03-28", checkOut: "2026-03-30" });
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(modifyReservation).not.toHaveBeenCalled();

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(modifyReservation).not.toHaveBeenCalled();
  });

  it("[CONTRACT C1/conflict] confirmaciones incompatibles fallan cerrado", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-modify-cancel-conflicting-confirmations";
    await preparePendingModifyPreview(conversationId, sendReply);
    const stateWithConflict = stateByConversation.get(conversationId);
    stateByConversation.set(conversationId, {
      ...stateWithConflict,
      pendingCancellation: { reservationId: "RES-ONLY-01", awaitingConfirmation: true },
    });

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });

    const currentState = stateByConversation.get(conversationId);
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/confirmaciones incompatibles|suspend[ií] ambas/i);
    expect(currentState?.modifyState ?? null).toBeNull();
    expect(currentState?.pendingCancellation ?? null).toBeNull();
    expect(currentState?.selectedReservationTarget ?? null).toBeNull();
    expect(currentState?.reservationSlots).toMatchObject({ roomType: "double", numGuests: "2" });
    expect(cancelReservation).not.toHaveBeenCalled();
    expect(modifyReservation).not.toHaveBeenCalled();
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
    expect(quoteReservationModification).toHaveBeenCalledTimes(2);
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

  it("rehidrata una reserva local degradada sin cambiar de ID ni usar otra reserva del huésped", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-degraded-local-snapshot-1";
    stateByConversation.set(conversationId, {
      reservationSlots: { checkIn: "2026-11-08", checkOut: "2026-11-09" },
      salesStage: "close",
      conversationStage: "reservation_confirmed",
      lastReservation: {
        reservationId: "RES-X",
        status: "updated",
        createdAt: "2026-10-01T10:00:00.000Z",
        channel: "web",
      },
      reservationHistory: [
        {
          reservationId: "RES-X", status: "created", createdAt: "2026-09-01T10:00:00.000Z", channel: "web",
          guestName: "Ana Perez", roomType: "double", checkIn: "2026-09-08", checkOut: "2026-09-15", numGuests: "2",
        },
        {
          reservationId: "RES-OTHER", status: "created", createdAt: "2026-09-02T10:00:00.000Z", channel: "web",
          guestName: "Laura Gomez", roomType: "suite", checkIn: "2026-12-01", checkOut: "2026-12-05", numGuests: "4",
        },
      ],
      lastPresentedReservations: {
        guestId: "g1", presentedAt: "2026-10-02T10:00:00.000Z", reservations: [
          { reservationId: "RES-OTHER", status: "created", createdAt: "2026-09-02T10:00:00.000Z", channel: "email", guestName: "Laura Gomez", roomType: "suite", checkIn: "2026-12-01", checkOut: "2026-12-05", numGuests: "4" },
        ],
      },
    });

    await handleIncomingMessage(msg("mostrame mi reserva", conversationId), { mode: "automatic", sendReply });

    const reply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(reply).toContain("RES-X");
    expect(reply).toContain("Ana Perez");
    expect(reply).toContain("doble");
    expect(reply).toContain("08/11/2026");
    expect(reply).toContain("09/11/2026");
    expect(reply).toContain("Huéspedes: 2");
    expect(reply).not.toMatch(/RES-OTHER|Laura Gomez|suite/);
    expect(conversationMocks.getConversationsForGuestPerspective).not.toHaveBeenCalled();
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
        roomType: "triple",
      }),
      "web"
    );
    const persisted = stateByConversation.get(conversationId)?.lastReservation;
    expect(persisted?.guestName).toBe("Marcelo Martinez");
    expect(persisted?.guestName).not.toBe("Ana Draft");
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
    expect(replyText).toMatch(/a nombre de qui[eé]n/i);
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
    expect(replyText).toMatch(/a nombre de qui[eé]n/i);
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

  it("bloquea cambio de titular sobre reserva confirmada sin abrir el menú genérico de modify", async () => {
    (getGuest as any).mockResolvedValue({
      guestId: "g1",
      hotelId: "hotel999",
      name: "Martín Pérez",
      firstName: "Martín",
      aliases: [],
    });
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-confirmed-holder-guard-1";
    stateByConversation.set(
      conversationId,
      baseSingleReservationState({
        reservationSlots: {
          guestName: "Laura Gómez",
          roomType: "double",
          checkIn: "2026-08-20",
          checkOut: "2026-08-22",
          numGuests: "2",
        },
        lastReservation: {
          reservationId: "RES-ONLY-01",
          status: "created",
          createdAt: "2026-08-01T10:00:00.000Z",
          channel: "web",
          guestName: "Laura Gómez",
          roomType: "double",
          checkIn: "2026-08-20",
          checkOut: "2026-08-22",
          numGuests: "2",
        },
        reservationHistory: [
          {
            reservationId: "RES-ONLY-01",
            status: "created",
            createdAt: "2026-08-01T10:00:00.000Z",
            channel: "web",
            guestName: "Laura Gómez",
            roomType: "double",
            checkIn: "2026-08-20",
            checkOut: "2026-08-22",
            numGuests: "2",
          },
        ],
      })
    );

    await handleIncomingMessage(msg("quiero cambiar el titular", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const currentState = stateByConversation.get(conversationId);
    expect(modifyReservation).not.toHaveBeenCalled();
    expect(replyText).toMatch(/por ahora no puedo cambiar el titular de una reserva confirmada/i);
    expect(replyText).not.toMatch(/podemos modificar tu reserva confirmada|qu[eé] te gustar[ií]a cambiar|cambiar fechas|cambiar habitaci[oó]n|cambiar hu[eé]spedes/i);
    expect(currentState?.reservationSlots?.guestName).toBe("Laura Gómez");
    expect(currentState?.selectedReservationTarget).toMatchObject({ reservationId: "RES-ONLY-01" });
    expect(currentState?.activeReservationContext).toMatchObject({ kind: "reservation", reservationId: "RES-ONLY-01" });
    expect(currentState?.modifyState ?? null).toBeNull();
    expect(currentState?.activeFlow ?? null).not.toBe("modify_reservation");
  });

  it("mantiene el modify legítimo de fechas después del guard de titular sobre confirmada", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-ref-confirmed-holder-guard-negative-1";
    stateByConversation.set(conversationId, baseSingleReservationState());

    await handleIncomingMessage(msg("quiero cambiar las fechas", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const currentState = stateByConversation.get(conversationId);
    expect(replyText).not.toMatch(/por ahora no puedo cambiar el titular de una reserva confirmada/i);
    expect(replyText).toMatch(/nuevas fechas|check-in y check-out|cu[aá]les ser[ií]an las nuevas fechas/i);
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

  it.each([
    ["web", "web", "RES-WEB-CONTINUITY-01"],
    ["web", "whatsapp", "RES-WEB-TO-WHATSAPP-01"],
    ["whatsapp", "web", "RES-WHATSAPP-CONTINUITY-01"],
    ["email", "web", "RES-EMAIL-CONTINUITY-01"],
  ])("recupera una reserva %s desde una conversación %s nueva del mismo guest", async (sourceChannel, currentChannel, reservationId) => {
    const sendReply = vi.fn(async () => {});
    const currentConversationId = `conv-current-${sourceChannel}`;
    const sourceConversationId = `conv-source-${sourceChannel}`;
    stateByConversation.set(currentConversationId, { hotelId: "hotel999", conversationId: currentConversationId, updatedAt: "2026-09-01T10:00:00.000Z" });
    stateByConversation.set(sourceConversationId, {
      hotelId: "hotel999",
      conversationId: sourceConversationId,
      updatedAt: "2026-09-01T09:00:00.000Z",
      reservationHistory: [{
        reservationId,
        status: "created",
        createdAt: "2026-09-01T09:00:00.000Z",
        channel: sourceChannel,
        guestName: "Jorge Sanchez",
        roomType: "double",
        checkIn: "2026-10-10",
        checkOut: "2026-10-12",
        numGuests: "2",
      }],
    });
    (getGuest as any).mockResolvedValue({ guestId: "guest-canonical-continuity-1", hotelId: "hotel999", name: "Raul" });
    (getConversationsByGuestId as any).mockResolvedValue([
      { conversationId: currentConversationId, hotelId: "hotel999", guestId: "guest-canonical-continuity-1", channel: currentChannel },
      { conversationId: sourceConversationId, hotelId: "hotel999", guestId: "guest-canonical-continuity-1", channel: sourceChannel },
    ]);

    await handleIncomingMessage(
      { ...msg("mostrame mi reserva", currentConversationId), channel: currentChannel as any, guestId: "guest-canonical-continuity-1" },
      { mode: "automatic", sendReply },
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const currentState = stateByConversation.get(currentConversationId);
    expect(replyText).toMatch(new RegExp(reservationId, "i"));
    expect(replyText).toMatch(/Jorge Sanchez/i);
    expect(getConversationsByGuestId).toHaveBeenCalledWith({ hotelId: "hotel999", guestId: "guest-canonical-continuity-1" });
    expect(currentState?.reservationHistory).toBeUndefined();
    expect(currentState?.lastReservation).toBeUndefined();
    expect(currentState?.activeFlow).not.toBe("modify_reservation");
  });

  it("consulta por el guest canónico después de merge y no expone reservas de otro guest", async () => {
    const sendReply = vi.fn(async () => {});
    const currentConversationId = "conv-current-merged-continuity";
    const sourceConversationId = "conv-source-merged-continuity";
    stateByConversation.set(currentConversationId, { hotelId: "hotel999", conversationId: currentConversationId, updatedAt: "2026-09-01T10:00:00.000Z" });
    stateByConversation.set(sourceConversationId, {
      hotelId: "hotel999",
      conversationId: sourceConversationId,
      updatedAt: "2026-09-01T09:00:00.000Z",
      lastReservation: {
        reservationId: "RES-MERGED-ONLY-01", status: "created", createdAt: "2026-09-01T09:00:00.000Z", channel: "email",
        guestName: "Jorge Sanchez", roomType: "double", checkIn: "2026-10-10", checkOut: "2026-10-12", numGuests: "2",
      },
    });
    (getGuest as any).mockImplementation(async (_hotelId: string, guestId: string) => {
      if (guestId === "guest-secondary-continuity-1") {
        return { guestId, hotelId: "hotel999", tags: ["merged", "merged-into:guest-primary-continuity-1"] };
      }
      if (guestId === "guest-primary-continuity-1") {
        return { guestId, hotelId: "hotel999", name: "Raul" };
      }
      return null;
    });
    (getConversationsByGuestId as any).mockResolvedValue([
      { conversationId: currentConversationId, hotelId: "hotel999", guestId: "guest-primary-continuity-1", channel: "web" },
      { conversationId: sourceConversationId, hotelId: "hotel999", guestId: "guest-primary-continuity-1", channel: "email" },
    ]);

    await handleIncomingMessage(
      { ...msg("mostrame mi reserva", currentConversationId), guestId: "guest-secondary-continuity-1" },
      { mode: "automatic", sendReply },
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/RES-MERGED-ONLY-01/i);
    expect(getConversationsByGuestId).toHaveBeenCalledWith({ hotelId: "hotel999", guestId: "guest-primary-continuity-1" });
  });

  it("con varias reservas externas desambigua y excluye canceladas sin seleccionar modify", async () => {
    const sendReply = vi.fn(async () => {});
    const currentConversationId = "conv-current-ambiguous-continuity";
    const sourceConversationId = "conv-source-ambiguous-continuity";
    stateByConversation.set(currentConversationId, { hotelId: "hotel999", conversationId: currentConversationId, updatedAt: "2026-09-01T10:00:00.000Z" });
    stateByConversation.set(sourceConversationId, {
      hotelId: "hotel999",
      conversationId: sourceConversationId,
      updatedAt: "2026-09-01T09:00:00.000Z",
      reservationHistory: [
        { reservationId: "RES-ACTIVE-A", status: "created", createdAt: "2026-09-01T08:00:00.000Z", channel: "web", guestName: "Jorge", roomType: "double", checkIn: "2026-10-10", checkOut: "2026-10-12", numGuests: "2" },
        { reservationId: "RES-ACTIVE-B", status: "created", createdAt: "2026-09-01T09:00:00.000Z", channel: "email", guestName: "Jorge", roomType: "double", checkIn: "2026-11-10", checkOut: "2026-11-12", numGuests: "2" },
        { reservationId: "RES-CANCELLED", status: "cancelled", createdAt: "2026-09-01T09:30:00.000Z", channel: "email", guestName: "Jorge", roomType: "double", checkIn: "2026-12-10", checkOut: "2026-12-12", numGuests: "2" },
      ],
    });
    (getGuest as any).mockResolvedValue({ guestId: "guest-canonical-ambiguous-1", hotelId: "hotel999" });
    (getConversationsByGuestId as any).mockResolvedValue([
      { conversationId: currentConversationId, hotelId: "hotel999", guestId: "guest-canonical-ambiguous-1", channel: "web" },
      { conversationId: sourceConversationId, hotelId: "hotel999", guestId: "guest-canonical-ambiguous-1", channel: "email" },
    ]);

    await handleIncomingMessage(
      { ...msg("mostrame mi reserva", currentConversationId), guestId: "guest-canonical-ambiguous-1" },
      { mode: "automatic", sendReply },
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const currentState = stateByConversation.get(currentConversationId);
    expect(replyText).toMatch(/m[aá]s de una reserva|cu[aá]l quer[eé]s revisar/i);
    expect(replyText).toMatch(/RES-ACTIVE-A|RES-ACTIVE-B/i);
    expect(replyText).not.toMatch(/RES-CANCELLED/i);
    expect(currentState?.selectedReservationTarget).toBeUndefined();
    expect(currentState?.activeFlow).not.toBe("modify_reservation");
  });

  it("preserva null autoritativo y no revive numGuests stale desde reservationSlots", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-null-guest-authority";
    const historical = baseSingleReservationState().lastReservation;
    stateByConversation.set(conversationId, baseSingleReservationState({
      reservationSlots: { ...baseSingleReservationState().reservationSlots, numGuests: "4" },
      reservationHistory: [{ ...historical, numGuests: "4" }],
      lastReservation: {
        ...historical,
        status: "updated",
        createdAt: "2026-03-23T10:00:00.000Z",
        numGuests: null,
      },
    }));

    await handleIncomingMessage(msg("mostrame mi reserva", conversationId), { mode: "automatic", sendReply });

    const reply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(reply).not.toMatch(/4\s*(hu[eé]spedes?|guests?|h[oó]spedes?)/i);
  });

  it("modify con numGuests canónico null no incorpora el valor stale al preview ni al pendingPatch", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-null-guest-modify-preview-authority";
    const canonicalNullReservation = {
      ...baseSingleReservationState().lastReservation,
      numGuests: null,
    };
    stateByConversation.set(conversationId, baseSingleReservationState({
      reservationSlots: { ...baseSingleReservationState().reservationSlots, numGuests: "4" },
      reservationHistory: [canonicalNullReservation],
      lastReservation: canonicalNullReservation,
      activeReservationContext: {
        kind: "reservation",
        reservationId: "RES-ONLY-01",
        phase: "confirmed",
        updatedAt: "2026-03-22T10:00:00.000Z",
      },
      selectedReservationTarget: {
        reservationId: "RES-ONLY-01",
        kind: "confirmed",
        source: "active_focus",
        resolutionMode: "weak",
        resolvedAt: "2026-03-22T10:00:00.000Z",
      },
      modifyState: {
        activeField: "roomType",
        pendingFields: [],
        updatedAt: "2026-03-22T10:00:00.000Z",
      },
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
    }));

    await handleIncomingMessage(msg("triple", conversationId), { mode: "automatic", sendReply });

    const previewReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    const pendingPatch = stateByConversation.get(conversationId)?.modifyState?.pendingPatch;
    expect(previewReply).toMatch(/antes de aplicar el cambio/i);
    expect(previewReply).not.toMatch(/hu[eé]spedes:.*4/i);
    expect(pendingPatch).toMatchObject({ reservationId: "RES-ONLY-01", roomType: "triple" });
    expect(pendingPatch).not.toHaveProperty("numGuests");
    expect((quoteReservationModification as any).mock.calls.at(-1)?.[2]?.numGuests).toBeUndefined();
  });

  it("proyecta numGuests desde provider tras modify lateral y no envía el snapshot stale", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-provider-guest-authority";
    stateByConversation.set(conversationId, baseSingleReservationState());
    (modifyReservation as any).mockResolvedValueOnce({
      ok: true,
      message: "✅ Modificada RES-ONLY-01",
      reservation: {
        reservationId: "RES-ONLY-01", hotelId: "hotel999", guestName: "Marcelo Martinez",
        roomType: "triple", numGuests: 4, checkInDate: "2026-03-28", checkOutDate: "2026-03-30",
        status: "confirmed", currency: "USD", priceTotal: 300,
        createdAt: "2026-03-22T10:00:00.000Z", updatedAt: "2026-03-23T10:00:00.000Z",
      },
    });

    await handleIncomingMessage(msg("quiero modificar RES-ONLY-01", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("cambiar tipo de habitación", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("triple", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });

    const providerPatch = (modifyReservation as any).mock.calls.at(-1)?.[2];
    const successReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(providerPatch.numGuests).toBeUndefined();
    expect(stateByConversation.get(conversationId)?.reservationSlots?.numGuests).toBe(4);
    expect(stateByConversation.get(conversationId)?.lastReservation?.numGuests).toBe(4);
    expect(stateByConversation.get(conversationId)?.lastReservation?.status).toBe("updated");
    expect(successReply).toMatch(/RES-ONLY-01/i);
    expect(successReply).toMatch(/Marcelo Martinez/i);
    expect(successReply).toMatch(/Habitación: triple/i);
    expect(successReply).toMatch(/Check-in: 28\/03\/2026/i);
    expect(successReply).toMatch(/Check-out: 30\/03\/2026/i);
    expect(successReply).toMatch(/Huéspedes: 4/i);
    expect(successReply).toMatch(/Total: 300 USD/i);
    expect(successReply).not.toMatch(/Huéspedes: 2/i);
  });

  it("post-modify preserva numGuests null del provider sin revivir el snapshot", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-provider-null-guest-authority";
    stateByConversation.set(conversationId, baseSingleReservationState());
    (modifyReservation as any).mockResolvedValueOnce({
      ok: true,
      message: "✅ Modificada RES-ONLY-01",
      reservation: {
        reservationId: "RES-ONLY-01", hotelId: "hotel999", guestName: "Marcelo Martinez",
        roomType: "triple", numGuests: null, checkInDate: "2026-03-28", checkOutDate: "2026-03-30",
        status: "confirmed", currency: "USD", priceTotal: 300,
        createdAt: "2026-03-22T10:00:00.000Z", updatedAt: "2026-03-23T10:00:00.000Z",
      },
    });

    await handleIncomingMessage(msg("quiero modificar RES-ONLY-01", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("cambiar tipo de habitación", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("triple", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });

    const successReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(stateByConversation.get(conversationId)?.reservationSlots).toHaveProperty("numGuests", null);
    expect(stateByConversation.get(conversationId)?.lastReservation).toHaveProperty("numGuests", null);
    expect(successReply).toMatch(/RES-ONLY-01|Marcelo Martinez|Habitación: triple/i);
    expect(successReply).not.toMatch(/Huéspedes:/i);
  });

  it("post-modify no compone éxito cuando el provider falla", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-provider-modify-failure";
    stateByConversation.set(conversationId, baseSingleReservationState());
    (modifyReservation as any).mockResolvedValueOnce({ ok: false, message: "No pude modificar la reserva." });

    await handleIncomingMessage(msg("quiero modificar RES-ONLY-01", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("cambiar tipo de habitación", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("triple", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });

    const failureReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(failureReply).toBe("No pude modificar la reserva.");
    expect(failureReply).not.toMatch(/✅|actualizada correctamente|Modificada RES/i);
    expect(stateByConversation.get(conversationId)?.lastReservation?.status).toBe("created");
  });

  it("post-modify rechaza una Reservation cuyo id no coincide con el target", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-provider-modify-id-mismatch";
    stateByConversation.set(conversationId, baseSingleReservationState());
    (modifyReservation as any).mockResolvedValueOnce({
      ok: true,
      message: "✅ Modificada RES-OTHER-99",
      reservation: {
        reservationId: "RES-OTHER-99", hotelId: "hotel999", guestName: "Otra Persona",
        roomType: "triple", numGuests: 2, checkInDate: "2026-03-28", checkOutDate: "2026-03-30",
        status: "confirmed", currency: "USD", priceTotal: 300,
        createdAt: "2026-03-22T10:00:00.000Z", updatedAt: "2026-03-23T10:00:00.000Z",
      },
    });

    await handleIncomingMessage(msg("quiero modificar RES-ONLY-01", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("cambiar tipo de habitación", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("triple", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });

    const failureReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(failureReply).toMatch(/No pude validar la reserva actualizada/i);
    expect(failureReply).not.toMatch(/✅|RES-OTHER-99/i);
    expect(stateByConversation.get(conversationId)?.lastReservation).toMatchObject({
      reservationId: "RES-ONLY-01",
      status: "created",
    });
  });

  describe("canonical read status and completeness characterization matrix", () => {
    const completeRecord = (reservationId: string, overrides: Record<string, any> = {}) => ({
      reservationId,
      status: "created",
      createdAt: "2026-03-22T10:00:00.000Z",
      channel: "web",
      guestName: "Ana Canonical",
      roomType: "double",
      checkIn: "2026-04-10",
      checkOut: "2026-04-12",
      numGuests: "2",
      ...overrides,
    });

    const stateWithSingleRecord = (record: Record<string, any>, overrides: Record<string, any> = {}) => ({
      hotelId: "hotel999",
      reservationSlots: {
        guestName: record.guestName,
        roomType: record.roomType,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        numGuests: record.numGuests,
      },
      salesStage: "close",
      conversationStage: "reservation_confirmed",
      reservationHistory: [record],
      lastReservation: record,
      activeReservationContext: null,
      selectedReservationTarget: null,
      updatedAt: "2026-03-23T10:00:00.000Z",
      ...overrides,
    });

    it("[FIX-CANONICAL-STATUS-ACTIONABILITY-01][authority_boundary] presented-only no autoriza Modify", async () => {
      const sendReply = vi.fn(async () => {});
      const conversationId = "conv-presented-only-cannot-authorize-modify";
      const presentedOnly = completeRecord("RES-PRESENTED-ONLY", {
        hotelId: "hotel999",
        guestName: "Paula Presentada",
      });
      stateByConversation.set(conversationId, {
        hotelId: "hotel999",
        conversationId,
        lastPresentedReservations: {
          guestId: "g1",
          presentedAt: "2026-03-23T11:00:00.000Z",
          reservations: [presentedOnly],
        },
      });

      await handleIncomingMessage(
        msg("Modificá RES-PRESENTED-ONLY a triple", conversationId),
        { mode: "automatic", sendReply },
      );

      const state = stateByConversation.get(conversationId);
      const reply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
      expect(state?.selectedReservationTarget).toMatchObject({
        reservationId: "RES-PRESENTED-ONLY",
        source: "explicit_id",
      });
      expect(reply).toMatch(/no se puede modificar|no puedo modificar|inactiva/i);
      expect(reply).not.toMatch(/qu[eé] te gustar[ií]a cambiar|nueva cantidad|nuevo tipo|confirm[aá]s estos cambios/i);
      expect(quoteReservationModification).not.toHaveBeenCalled();
      expect(modifyReservation).not.toHaveBeenCalled();
      expect(cancelReservation).not.toHaveBeenCalled();
      expect(state?.modifyState ?? null).toBeNull();
      expect(state?.modifyState?.awaitingConfirmation).not.toBe(true);
      expect(state?.modifyState?.pendingPatch).toBeUndefined();
      expect(state?.lastReservation).toBeUndefined();
    });

    it("[FIX-CANONICAL-STATUS-ACTIONABILITY-01][authority_boundary] canonical parcial más slots no autoriza Modify", async () => {
      const sendReply = vi.fn(async () => {});
      const conversationId = "conv-partial-canonical-slots-cannot-authorize-modify";
      const partialCanonical = {
        hotelId: "hotel999",
        reservationId: "RES-PARTIAL-SLOTS",
        status: "created",
        createdAt: "2026-03-22T10:00:00.000Z",
        channel: "web",
      };
      stateByConversation.set(conversationId, {
        hotelId: "hotel999",
        conversationId,
        lastReservation: partialCanonical,
        reservationSlots: {
          guestName: "Sofía Slots",
          roomType: "double",
          checkIn: "2026-04-10",
          checkOut: "2026-04-12",
          numGuests: "2",
        },
        activeReservationContext: {
          kind: "reservation",
          reservationId: "RES-PARTIAL-SLOTS",
          phase: "confirmed",
          updatedAt: "2026-03-22T10:00:00.000Z",
        },
        lastPresentedReservations: {
          guestId: "g1",
          presentedAt: "2026-03-23T11:00:00.000Z",
          reservations: [{ ...partialCanonical }],
        },
      });

      await handleIncomingMessage(
        msg("Modificá RES-PARTIAL-SLOTS a triple", conversationId),
        { mode: "automatic", sendReply },
      );

      const state = stateByConversation.get(conversationId);
      const reply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
      expect(state?.selectedReservationTarget).toMatchObject({
        reservationId: "RES-PARTIAL-SLOTS",
        source: "explicit_id",
      });
      expect(reply).toMatch(/no se puede modificar|no puedo modificar|inactiva/i);
      expect(reply).not.toMatch(/qu[eé] te gustar[ií]a cambiar|nueva cantidad|nuevo tipo|confirm[aá]s estos cambios/i);
      expect(quoteReservationModification).not.toHaveBeenCalled();
      expect(modifyReservation).not.toHaveBeenCalled();
      expect(cancelReservation).not.toHaveBeenCalled();
      expect(state?.modifyState ?? null).toBeNull();
      expect(state?.modifyState?.awaitingConfirmation).not.toBe(true);
      expect(state?.modifyState?.pendingPatch).toBeUndefined();
      expect(state?.lastReservation).toEqual(partialCanonical);
      expect(state?.lastReservation?.roomType).toBeUndefined();
      expect(state?.lastReservation?.checkIn).toBeUndefined();
      expect(state?.lastReservation?.checkOut).toBeUndefined();
      expect(state?.lastReservation?.numGuests).toBeUndefined();
    });

    it("[OBS-M6-02][presented_cancelled_status_lost] [A] una reserva cancelada presentada no habilita Modify", async () => {
      const sendReply = vi.fn(async () => {});
      const conversationId = "conv-matrix-a-cancelled-presented";
      const cancelled = completeRecord("RES-MATRIX-A", { status: "cancelled" });
      stateByConversation.set(conversationId, {
        hotelId: "hotel999",
        conversationId,
        lastPresentedReservations: {
          guestId: "g1",
          presentedAt: "2026-03-23T11:00:00.000Z",
          reservations: [cancelled],
        },
      });

      await handleIncomingMessage(msg("modificá la primera reserva", conversationId), { mode: "automatic", sendReply });

      const state = stateByConversation.get(conversationId);
      const reply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
      expect.soft(reply).toMatch(/cancelada|no se puede modificar|inactiva/i);
      expect(state?.selectedReservationTarget).toMatchObject({ reservationId: "RES-MATRIX-A" });
      expect(state?.modifyState ?? null).toBeNull();
      expect(quoteReservationModification).not.toHaveBeenCalled();
      expect(modifyReservation).not.toHaveBeenCalled();
      expect(cancelReservation).not.toHaveBeenCalled();
    });

    it("[OBS-M6-02][post_list_cancelled_status_lost] [B] una cancelación reciente domina a la versión activa antigua del mismo ID", async () => {
      const sendReply = vi.fn(async () => {});
      const conversationId = "conv-matrix-b-recent-cancelled";
      const active = completeRecord("RES-MATRIX-B", { createdAt: "2026-03-20T10:00:00.000Z" });
      const cancelled = {
        reservationId: "RES-MATRIX-B",
        status: "cancelled",
        createdAt: "2026-03-22T10:00:00.000Z",
        channel: "web",
      };
      stateByConversation.set(conversationId, stateWithSingleRecord(cancelled, {
        reservationSlots: {},
        reservationHistory: [active, cancelled],
      }));

      await handleIncomingMessage(msg("mis reservas", conversationId), { mode: "automatic", sendReply });
      const listReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
      expect(listReply).toMatch(/RES-MATRIX-B .*cancelada/i);
      expect(listReply).toMatch(/Ana Canonical|doble|10\/04\/2026/i);

      sendReply.mockClear();
      await handleIncomingMessage(msg("modificá RES-MATRIX-B a triple", conversationId), { mode: "automatic", sendReply });
      expect.soft(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/cancelada|no se puede modificar|inactiva/i);
      expect.soft(quoteReservationModification).not.toHaveBeenCalled();
      expect(modifyReservation).not.toHaveBeenCalled();
    });

    it("[B] una versión activa estrictamente más reciente domina a una cancelación anterior", async () => {
      const sendReply = vi.fn(async () => {});
      const conversationId = "conv-matrix-b-recent-active";
      const cancelled = completeRecord("RES-MATRIX-B-ACTIVE", {
        status: "cancelled",
        createdAt: "2026-03-20T10:00:00.000Z",
      });
      const active = completeRecord("RES-MATRIX-B-ACTIVE", {
        status: "updated",
        createdAt: "2026-03-22T10:00:00.000Z",
      });
      stateByConversation.set(conversationId, stateWithSingleRecord(active, {
        reservationHistory: [cancelled, active],
      }));

      await handleIncomingMessage(
        msg("modificá RES-MATRIX-B-ACTIVE a triple", conversationId),
        { mode: "automatic", sendReply },
      );

      expect(quoteReservationModification).toHaveBeenCalledWith(
        "hotel999",
        "RES-MATRIX-B-ACTIVE",
        expect.objectContaining({ roomType: "triple" }),
      );
      expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
        awaitingConfirmation: true,
        pendingPatch: expect.objectContaining({ reservationId: "RES-MATRIX-B-ACTIVE" }),
      });
      expect(modifyReservation).not.toHaveBeenCalled();
    });

    it("[C] created y updated son los estados conv_state reconocidos como accionables", async () => {
      const sendReply = vi.fn(async () => {});
      const conversationId = "conv-matrix-c-recognized-conv-status";
      const created = completeRecord("RES-MATRIX-C-CREATED", { createdAt: "2026-03-20T10:00:00.000Z" });
      const updated = completeRecord("RES-MATRIX-C-UPDATED", {
        status: "updated",
        createdAt: "2026-03-21T10:00:00.000Z",
        guestName: "Beatriz Updated",
      });
      stateByConversation.set(conversationId, {
        hotelId: "hotel999",
        conversationId,
        reservationHistory: [created, updated],
        lastReservation: updated,
        reservationSlots: {},
      });

      await handleIncomingMessage(msg("mis reservas", conversationId), { mode: "automatic", sendReply });
      const listReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
      expect(listReply).toMatch(/RES-MATRIX-C-CREATED .*activa/i);
      expect(listReply).toMatch(/RES-MATRIX-C-UPDATED .*activa/i);

      await handleIncomingMessage(
        msg("modificá RES-MATRIX-C-CREATED a triple para 3 personas", conversationId),
        { mode: "automatic", sendReply },
      );
      expect(quoteReservationModification).toHaveBeenCalledWith(
        "hotel999",
        "RES-MATRIX-C-CREATED",
        expect.objectContaining({ roomType: "triple", numGuests: "3" }),
      );
      expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
        awaitingConfirmation: true,
        pendingPatch: expect.objectContaining({ reservationId: "RES-MATRIX-C-CREATED" }),
      });
      expect(modifyReservation).not.toHaveBeenCalled();
    });

    for (const statusCase of [
      { label: "desconocido", status: "provider_unknown" },
      { label: "ausente", status: undefined },
      { label: "provider pending sin transformar", status: "pending" },
      { label: "provider confirmed sin transformar", status: "confirmed" },
    ]) {
      it(`[OBS-M6-02][status_fail_open] [C] status ${statusCase.label} no debe listarse como activo`, async () => {
        const sendReply = vi.fn(async () => {});
        const conversationId = `conv-matrix-c-list-${String(statusCase.status || "missing")}`;
        const record = completeRecord(`RES-MATRIX-C-${String(statusCase.status || "MISSING").toUpperCase()}`, {
          status: statusCase.status,
        });
        stateByConversation.set(conversationId, stateWithSingleRecord(record));

        await handleIncomingMessage(msg("mis reservas", conversationId), { mode: "automatic", sendReply });

        const reply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
        expect(reply).not.toMatch(/\bactiva\b/i);
      });

      it(`[OBS-M6-02][status_fail_open] [C] status ${statusCase.label} no debe cotizar Modify`, async () => {
        const sendReply = vi.fn(async () => {});
        const conversationId = `conv-matrix-c-modify-${String(statusCase.status || "missing")}`;
        const reservationId = `RES-MATRIX-C-${String(statusCase.status || "MISSING").toUpperCase()}`;
        const record = completeRecord(reservationId, { status: statusCase.status });
        stateByConversation.set(conversationId, stateWithSingleRecord(record));

        await handleIncomingMessage(
          msg(`modificá ${reservationId} a triple para 3 personas`, conversationId),
          { mode: "automatic", sendReply },
        );

        expect.soft(quoteReservationModification).not.toHaveBeenCalled();
        expect.soft(stateByConversation.get(conversationId)?.modifyState ?? null).toBeNull();
        expect(modifyReservation).not.toHaveBeenCalled();
        expect(cancelReservation).not.toHaveBeenCalled();
        expect(confirmAndCreate).not.toHaveBeenCalled();
      });
    }

    it("[D] descartar un preview conserva el registro completo y limpia el subestado Modify", async () => {
      const sendReply = vi.fn(async () => {});
      const conversationId = "conv-matrix-d-discard-complete";
      const original = completeRecord("RES-MATRIX-D", {
        guestName: "Diana Completa",
        roomType: "double",
        checkIn: "2026-05-10",
        checkOut: "2026-05-14",
        numGuests: "2",
      });
      const initialState = stateWithSingleRecord(original);
      stateByConversation.set(conversationId, initialState);

      const turns = [
        "modificá RES-MATRIX-D a triple para 3 personas",
        "Descartá los cambios",
        "Mostrame esa reserva",
      ];
      await handleIncomingMessage(msg(turns[0], conversationId), { mode: "automatic", sendReply });
      expect(stateByConversation.get(conversationId)?.modifyState).toMatchObject({
        awaitingConfirmation: true,
        pendingPatch: expect.objectContaining({ reservationId: "RES-MATRIX-D", roomType: "triple", numGuests: "3" }),
      });
      expect(quoteReservationModification).toHaveBeenCalledTimes(1);
      expect(modifyReservation).not.toHaveBeenCalled();

      await handleIncomingMessage(msg(turns[1], conversationId), { mode: "automatic", sendReply });
      const discardedState = stateByConversation.get(conversationId);
      expect(discardedState?.modifyState ?? null).toBeNull();
      expect(discardedState?.pendingCancellation ?? null).toBeNull();
      expect(discardedState?.pendingAvailabilityVerification ?? null).toBeNull();
      expect(discardedState?.lastProposal ?? null).toBeNull();
      expect(discardedState?.lastReservation).toEqual(original);
      expect(discardedState?.reservationHistory).toEqual([original]);
      expect(discardedState?.reservationSlots).toMatchObject({
        guestName: "Diana Completa",
        roomType: "double",
        checkIn: "2026-05-10",
        checkOut: "2026-05-14",
        numGuests: "2",
      });

      await handleIncomingMessage(msg(turns[2], conversationId), { mode: "automatic", sendReply });
      const detailReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
      expect(detailReply).toMatch(/RES-MATRIX-D/i);
      expect(detailReply).toMatch(/Diana Completa/i);
      expect(detailReply).toMatch(/Habitación: doble/i);
      expect(detailReply).toMatch(/10\/05\/2026 → 14\/05\/2026/i);
      expect(detailReply).toMatch(/Huéspedes: 2/i);
      expect(modifyReservation).not.toHaveBeenCalled();
      expect(cancelReservation).not.toHaveBeenCalled();
      expect(confirmAndCreate).not.toHaveBeenCalled();
    });

    it("[E] el registro reciente parcial completa undefined desde la versión histórica y preserva null autoritativo", async () => {
      const sendReply = vi.fn(async () => {});
      const conversationId = "conv-matrix-e-partial-recent";
      const historical = completeRecord("RES-MATRIX-E", {
        createdAt: "2026-03-20T10:00:00.000Z",
        guestName: "Elena Histórica",
        roomType: "suite",
        checkIn: "2026-06-01",
        checkOut: "2026-06-05",
        numGuests: "4",
      });
      const recentPartial = {
        reservationId: "RES-MATRIX-E",
        status: "updated",
        createdAt: "2026-03-22T10:00:00.000Z",
        channel: "web",
        numGuests: null,
      };
      stateByConversation.set(conversationId, stateWithSingleRecord(recentPartial, {
        reservationSlots: {},
        reservationHistory: [historical, recentPartial],
      }));

      await handleIncomingMessage(msg("mostrame mi reserva", conversationId), { mode: "automatic", sendReply });

      const reply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
      expect(reply).toMatch(/RES-MATRIX-E|Elena Histórica|suite|01\/06\/2026 → 05\/06\/2026/i);
      expect(reply).not.toMatch(/Huéspedes:\s*4/i);
      expect(stateByConversation.get(conversationId)?.lastReservation).toHaveProperty("numGuests", null);
    });

    it("[F] la selección presentada no sobrescribe null local autoritativo", async () => {
      const sendReply = vi.fn(async () => {});
      const conversationId = "conv-matrix-f-null-authority";
      const localPartial = {
        reservationId: "RES-MATRIX-F",
        status: "created",
        createdAt: "2026-03-22T10:00:00.000Z",
        channel: "web",
        numGuests: null,
      };
      const presentedComplete = completeRecord("RES-MATRIX-F", {
        createdAt: "2026-03-21T10:00:00.000Z",
        guestName: "Fabiana Presentada",
        roomType: "double",
        checkIn: "2026-07-10",
        checkOut: "2026-07-12",
        numGuests: "2",
      });
      stateByConversation.set(conversationId, stateWithSingleRecord(localPartial, {
        reservationSlots: {},
        lastPresentedReservations: {
          guestId: "g1",
          presentedAt: "2026-03-23T11:00:00.000Z",
          reservations: [presentedComplete],
        },
      }));

      await handleIncomingMessage(msg("modificá la primera reserva a triple", conversationId), { mode: "automatic", sendReply });

      expect(stateByConversation.get(conversationId)?.selectedReservationTarget).toMatchObject({ reservationId: "RES-MATRIX-F" });
      expect((quoteReservationModification as any).mock.calls.at(-1)?.[2]?.numGuests).toBeUndefined();
      expect(stateByConversation.get(conversationId)?.lastReservation).toHaveProperty("numGuests", null);
      expect(modifyReservation).not.toHaveBeenCalled();
    });

    it.fails("[EXPECTED-FAIL][OBS-M6-07][discard_restores_local_partial] [F] el descarte conserva completitud presentada válida del mismo hotelId + reservationId", async () => {
      const sendReply = vi.fn(async () => {});
      const conversationId = "conv-matrix-f-discard-completeness";
      const localPartial = {
        reservationId: "RES-MATRIX-F-DISCARD",
        status: "created",
        createdAt: "2026-03-22T10:00:00.000Z",
        channel: "web",
      };
      const presentedComplete = completeRecord("RES-MATRIX-F-DISCARD", {
        createdAt: "2026-03-21T10:00:00.000Z",
        guestName: "Felipe Presentado",
        roomType: "double",
        checkIn: "2026-07-20",
        checkOut: "2026-07-23",
        numGuests: "2",
      });
      stateByConversation.set(conversationId, stateWithSingleRecord(localPartial, {
        reservationSlots: {},
        lastPresentedReservations: {
          guestId: "g1",
          presentedAt: "2026-03-23T11:00:00.000Z",
          reservations: [presentedComplete],
        },
      }));

      await handleIncomingMessage(
        msg("modificá la primera reserva a triple para 3 personas", conversationId),
        { mode: "automatic", sendReply },
      );
      expect(stateByConversation.get(conversationId)?.selectedReservationTarget).toMatchObject({
        reservationId: "RES-MATRIX-F-DISCARD",
      });
      expect((quoteReservationModification as any).mock.calls.at(-1)?.[2]).toMatchObject({
        roomType: "triple",
        numGuests: "3",
      });
      const stateBeforeDiscard = stateByConversation.get(conversationId);
      expect(stateBeforeDiscard?.reservationSlots).toMatchObject({
        guestName: "Felipe Presentado",
        roomType: "triple",
        checkIn: "2026-07-20",
        checkOut: "2026-07-23",
        numGuests: "3",
      });
      expect(stateBeforeDiscard?.lastReservation).toMatchObject({
        reservationId: "RES-MATRIX-F-DISCARD",
        status: "created",
      });

      await handleIncomingMessage(msg("Descartá los cambios", conversationId), { mode: "automatic", sendReply });
      const stateAfterDiscard = stateByConversation.get(conversationId);
      expect(stateAfterDiscard?.modifyState ?? null).toBeNull();
      expect.soft(stateAfterDiscard?.reservationSlots).toMatchObject({
        guestName: "Felipe Presentado",
        roomType: "double",
        checkIn: "2026-07-20",
        checkOut: "2026-07-23",
        numGuests: "2",
      });

      await handleIncomingMessage(msg("Mostrame esa reserva", conversationId), { mode: "automatic", sendReply });
      const detailReply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
      expect(detailReply).toMatch(/Código: RES-MATRIX-F-DISCARD/i);
      expect(detailReply).toMatch(/Estado: Activa/i);
      expect.soft(detailReply).toMatch(/Felipe Presentado|Habitación: doble|20\/07\/2026 → 23\/07\/2026|Huéspedes: 2/i);
      expect(modifyReservation).not.toHaveBeenCalled();
      expect(cancelReservation).not.toHaveBeenCalled();
    });

    it("[G] dos reservas similares conservan identidad y campos sin contaminación cross-ID", async () => {
      const sendReply = vi.fn(async () => {});
      const conversationId = "conv-matrix-g-cross-id";
      const first = completeRecord("RES-MATRIX-G-A", {
        createdAt: "2026-03-20T10:00:00.000Z",
        guestName: "Gabriela Uno",
        roomType: "single",
        checkIn: "2026-08-10",
        checkOut: "2026-08-12",
        numGuests: "1",
      });
      const second = completeRecord("RES-MATRIX-G-B", {
        createdAt: "2026-03-21T10:00:00.000Z",
        guestName: "Gabriela Dos",
        roomType: "double",
        checkIn: "2026-08-10",
        checkOut: "2026-08-12",
        numGuests: "2",
      });
      stateByConversation.set(conversationId, {
        hotelId: "hotel999",
        conversationId,
        reservationHistory: [first, second],
        lastReservation: second,
        reservationSlots: {},
      });

      await handleIncomingMessage(msg("mostrame la segunda reserva", conversationId), { mode: "automatic", sendReply });

      const reply = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
      expect(stateByConversation.get(conversationId)?.selectedReservationTarget).toMatchObject({ reservationId: "RES-MATRIX-G-B" });
      expect(reply).toMatch(/RES-MATRIX-G-B|Gabriela Dos|Habitación: doble|Huéspedes: 2/i);
      expect(reply).not.toMatch(/RES-MATRIX-G-A|Gabriela Uno|Habitación: simple|Huéspedes: 1/i);
    });

    it("[G] una versión del mismo reservationId perteneciente a otro hotel no contamina la autoridad local", async () => {
      const sendReply = vi.fn(async () => {});
      const conversationId = "conv-matrix-g-cross-hotel";
      const localActive = completeRecord("RES-MATRIX-G-HOTEL", {
        hotelId: "hotel999",
        createdAt: "2026-03-20T10:00:00.000Z",
      });
      const foreignCancelled = completeRecord("RES-MATRIX-G-HOTEL", {
        hotelId: "hotel-other",
        status: "cancelled",
        createdAt: "2026-03-23T10:00:00.000Z",
      });
      stateByConversation.set(conversationId, stateWithSingleRecord(localActive, {
        reservationHistory: [localActive, foreignCancelled],
      }));

      await handleIncomingMessage(
        msg("modificá RES-MATRIX-G-HOTEL a triple", conversationId),
        { mode: "automatic", sendReply },
      );

      expect(quoteReservationModification).toHaveBeenCalledWith(
        "hotel999",
        "RES-MATRIX-G-HOTEL",
        expect.objectContaining({ roomType: "triple" }),
      );
      expect(modifyReservation).not.toHaveBeenCalled();
      expect(cancelReservation).not.toHaveBeenCalled();
    });

    it("[H] fechas históricas no cambian por sí solas el status activo ni la accionabilidad vigente", async () => {
      const sendReply = vi.fn(async () => {});
      const conversationId = "conv-matrix-h-historical-active";
      const historicalActive = completeRecord("RES-MATRIX-H", {
        checkIn: "2026-03-01",
        checkOut: "2026-03-03",
      });
      stateByConversation.set(conversationId, stateWithSingleRecord(historicalActive));

      await handleIncomingMessage(msg("mis reservas", conversationId), { mode: "automatic", sendReply });
      expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/RES-MATRIX-H .*activa.*histórica/i);

      await handleIncomingMessage(msg("modificá RES-MATRIX-H a triple", conversationId), { mode: "automatic", sendReply });
      expect(quoteReservationModification).toHaveBeenCalledWith(
        "hotel999",
        "RES-MATRIX-H",
        expect.objectContaining({ roomType: "triple" }),
      );
      expect(modifyReservation).not.toHaveBeenCalled();
    });

    for (const timestampCase of [
      { label: "timestamp igual", createdAt: "2026-03-22T10:00:00.000Z" },
      { label: "timestamp ausente", createdAt: undefined },
    ]) {
      it(`[OBS-M6-02][status_tie_order] ${timestampCase.label} contradictorio debe fallar cerrado sin depender del orden`, async () => {
        const active = completeRecord("RES-MATRIX-TIE", { createdAt: timestampCase.createdAt });
        const cancelled = completeRecord("RES-MATRIX-TIE", {
          status: "cancelled",
          createdAt: timestampCase.createdAt,
        });

        for (const [suffix, history] of [
          ["active-last", [cancelled, active]],
          ["cancelled-last", [active, cancelled]],
        ] as const) {
          const sendReply = vi.fn(async () => {});
          const conversationId = `conv-matrix-tie-${suffix}-${timestampCase.createdAt ? "equal" : "missing"}`;
          stateByConversation.set(conversationId, {
            hotelId: "hotel999",
            conversationId,
            reservationHistory: history,
            reservationSlots: {},
          });
          (quoteReservationModification as any).mockClear();

          await handleIncomingMessage(
            msg("modificá RES-MATRIX-TIE a triple", conversationId),
            { mode: "automatic", sendReply },
          );

          expect.soft(quoteReservationModification).not.toHaveBeenCalled();
          expect.soft(stateByConversation.get(conversationId)?.modifyState ?? null).toBeNull();
          expect(modifyReservation).not.toHaveBeenCalled();
        }
      });
    }
  });
});
