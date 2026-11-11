import { beforeEach, describe, expect, it, vi } from "vitest";

const stateByConversation = new Map<string, any>();
const persistedMessages = new Map<string, any>();
let persistedMessageSequence = 0;

async function readMessagesForTest({ hotelId, conversationId, limit }: any) {
  const messages = Array.from(persistedMessages.values())
    .filter((message: any) => message.hotelId === hotelId && message.conversationId === conversationId)
    .sort((left: any, right: any) =>
      String(right.timestamp || "").localeCompare(String(left.timestamp || "")) ||
      String(right.createdAt || "").localeCompare(String(left.createdAt || ""))
    );
  return typeof limit === "number" ? messages.slice(0, limit) : messages;
}

function cancellationScopeState() {
  return {
    hotelId: "hotel999",
    conversationId: "conv-cancel-scope",
    lastReservation: {
      reservationId: "RES123456",
      status: "created",
      createdAt: "2026-03-20T10:00:00.000Z",
      channel: "web",
      guestName: "Marcelo Martinez",
      roomType: "double",
      checkIn: "2026-03-21",
      checkOut: "2026-03-25",
      numGuests: "2",
    },
  };
}

vi.mock("@/lib/db/messages", () => ({
  saveChannelMessageToAstra: vi.fn(async (message: any) => {
    persistedMessageSequence += 1;
    persistedMessages.set(message.messageId, {
      ...message,
      createdAt: new Date(Date.UTC(2030, 0, 1, 0, 0, 0, persistedMessageSequence)).toISOString(),
    });
  }),
  getMessagesByConversation: vi.fn(readMessagesForTest),
  getMessageById: vi.fn(async (hotelId: string, messageId: string) => {
    const message = persistedMessages.get(messageId) ?? null;
    return message?.hotelId === hotelId ? message : null;
  }),
}));
vi.mock("@/lib/db/conversations", () => ({
  getOrCreateConversation: vi.fn(async () => {}),
  appendConversationReplyTrace: vi.fn(async () => {}),
  getConversationsForGuestPerspective: vi.fn(async () => [
    { conversationId: "conv-cancel-scope", hotelId: "hotel999", guestId: "g1" },
  ]),
}));
vi.mock("@/lib/db/guests", () => ({
  getGuest: vi.fn(async () => null),
  createGuest: vi.fn(async () => {}),
  updateGuest: vi.fn(async () => {}),
}));
vi.mock("@/lib/db/convState", () => ({
  isCancellationProviderExecutionEnabled: vi.fn(() => true),
  getConvState: vi.fn(async (_hotelId: string, conversationId: string) => {
    if (conversationId === "conv-cancel-scope") return cancellationScopeState();
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
  preparePendingCancellationAuthorization: vi.fn(async (_hotelId: string, conversationId: string, authorization: any) => {
    const current = stateByConversation.get(conversationId);
    if (!current) return { matched: false, modified: false, matchedCount: 0, modifiedCount: 0 };
    stateByConversation.set(conversationId, {
      ...current,
      pendingCancellation: { ...authorization, previewMessageId: null, awaitingConfirmation: false },
    });
    return { matched: true, modified: true, matchedCount: 1, modifiedCount: 1 };
  }),
  activatePendingCancellationAuthorization: vi.fn(async (_hotelId: string, conversationId: string, prepared: any, previewMessageId: string) => {
    const current = stateByConversation.get(conversationId);
    const pending = current?.pendingCancellation;
    if (!pending || pending.issuedForMessageId !== prepared.issuedForMessageId || pending.awaitingConfirmation !== false) {
      return { matched: false, modified: false, matchedCount: 0, modifiedCount: 0 };
    }
    stateByConversation.set(conversationId, {
      ...current,
      pendingCancellation: { ...pending, previewMessageId, awaitingConfirmation: true },
    });
    return { matched: true, modified: true, matchedCount: 1, modifiedCount: 1 };
  }),
  suspendPendingCancellationAuthorization: vi.fn(async (_hotelId: string, conversationId: string, active: any) => {
    const current = stateByConversation.get(conversationId);
    if (current?.pendingCancellation?.previewMessageId !== active.previewMessageId) {
      return { matched: false, modified: false, matchedCount: 0, modifiedCount: 0 };
    }
    stateByConversation.set(conversationId, {
      ...current,
      pendingCancellation: { ...current.pendingCancellation, awaitingConfirmation: false },
    });
    return { matched: true, modified: true, matchedCount: 1, modifiedCount: 1 };
  }),
  revokePendingCancellationAuthorizationIfCurrent: vi.fn(async (_hotelId: string, conversationId: string, active: any) => {
    const current = stateByConversation.get(conversationId);
    if (current?.pendingCancellation?.issuedForMessageId !== active.issuedForMessageId) {
      return { matched: false, modified: false, matchedCount: 0, modifiedCount: 0 };
    }
    const next = { ...current };
    delete next.pendingCancellation;
    stateByConversation.set(conversationId, next);
    return { matched: true, modified: true, matchedCount: 1, modifiedCount: 1 };
  }),
  consumePendingCancellationAuthorization: vi.fn(async (_hotelId: string, conversationId: string, active: any) => {
    const current = stateByConversation.get(conversationId);
    if (current?.pendingCancellation?.previewMessageId !== active.previewMessageId || current.pendingCancellation.awaitingConfirmation !== true) {
      return { matched: false, modified: false, matchedCount: 0, modifiedCount: 0 };
    }
    const next = { ...current };
    delete next.pendingCancellation;
    stateByConversation.set(conversationId, next);
    return { matched: true, modified: true, matchedCount: 1, modifiedCount: 1 };
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
  getReservation: vi.fn(async (hotelId: string, reservationId: string) => ({
    ok: true,
    reservation: {
      reservationId,
      hotelId,
      guestName: "Marcelo Martinez",
      roomType: "double",
      numGuests: 2,
      checkInDate: "2026-03-21",
      checkOutDate: "2026-03-25",
      status: "confirmed",
      currency: "USD",
      createdAt: "2026-03-20T10:00:00.000Z",
      updatedAt: "2026-03-20T10:00:00.000Z",
    },
  })),
  cancelReservation: vi.fn(async (_hotelId: string, _reservationId: string) => ({
    ok: true,
    message: "✅ Reserva cancelada.",
  })),
}));
vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: vi.fn(async (input: any) => {
      const text = String(input?.normalizedMessage || "").toLowerCase();
      if (/estacionamiento|parking/.test(text)) {
        return {
          messages: [{ role: "assistant", content: "Sí, el estacionamiento está incluido." }],
          category: "amenities_info",
          meta: {},
        };
      }
      return {
        messages: [{ role: "assistant", content: "Respuesta base" }],
        category: "reservation",
        meta: {},
      };
    }),
  },
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
    if (/estacionamiento|parking/.test(text)) {
      return {
        ok: true,
        category: "amenities_info",
        answer: "Sí, el estacionamiento está incluido.",
        promptKey: "parking",
        retrieved: [],
      };
    }
    return {
      ok: true,
      category: "retrieval_based",
      answer: "La política de cancelación depende de la tarifa.",
      retrieved: [],
    };
  }),
}));
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class { constructor(_c: any) {} async invoke() { return { content: "Respuesta base" }; } },
}));

import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import { cancelReservation, getReservation } from "@/lib/agents/reservations";
import { isCancellationProviderExecutionEnabled } from "@/lib/db/convState";
import { runWithConversationOwnership } from "@/lib/ownership/conversationOwnershipContext";

function msg(content: string, conversationId: string, detectedLanguage: "es" | "en" | "pt" = "es") {
  return {
    messageId: `m-${Math.random().toString(36).slice(2, 8)}`,
    hotelId: "hotel999",
    channel: "web",
    sender: "guest",
    content,
    timestamp: new Date().toISOString(),
    conversationId,
    guestId: "g1",
    detectedLanguage,
  } as any;
}

describe("messageHandler cancel reservation multiturn continuity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stateByConversation.clear();
    persistedMessages.clear();
    persistedMessageSequence = 0;
  });

  it("soporta intención -> código -> CONFIRMAR", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-cancel-flow-1";

    await handleIncomingMessage(msg("quiero cancelar mi reserva", conversationId), { mode: "automatic", sendReply });
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/c[oó]digo de reserva/i);

    await handleIncomingMessage(msg("RES123456", conversationId), { mode: "automatic", sendReply });
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/Código: RES123456[\s\S]*Titular: Marcelo Martinez[\s\S]*CONFIRMAR/i);
    expect(stateByConversation.get(conversationId)?.pendingCancellation).toMatchObject({
      reservationId: "RES123456",
      awaitingConfirmation: true,
      presentedFingerprint: expect.any(String),
    });

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });
    expect(cancelReservation).toHaveBeenCalledWith("hotel999", "RES123456");
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/Reserva cancelada/i);
    expect(stateByConversation.get(conversationId)?.pendingCancellation ?? null).toBeNull();
    expect(stateByConversation.get(conversationId)?.lastReservation).toMatchObject({
      reservationId: "RES123456",
      status: "cancelled",
    });
    expect(stateByConversation.get(conversationId)?.activeReservationContext).toMatchObject({
      kind: "reservation",
      reservationId: "RES123456",
      phase: "cancelled",
    });
  });

  it.each([
    ["es", "No cancelé tu reserva. Para gestionarla, contactá a recepción o al canal oficial del hotel."],
    ["en", "I did not cancel your reservation. To manage it, contact reception or the hotel's official channel."],
    ["pt", "Não cancelei sua reserva. Para gerenciá-la, entre em contato com a recepção ou com o canal oficial do hotel."],
  ] as const)("bloquea el efecto Cancel con ownership válido y copy seguro %s", async (lang, expectedCopy) => {
    const sendReply = vi.fn(async () => {});
    const conversationId = `conv-cancel-operational-gate-owned-${lang}`;
    await handleIncomingMessage(msg("cancelar RES123456", conversationId, lang), { mode: "automatic", sendReply });
    vi.mocked(cancelReservation).mockClear();
    vi.mocked(getReservation).mockClear();
    vi.mocked(isCancellationProviderExecutionEnabled).mockReturnValueOnce(false);

    await runWithConversationOwnership({
      hotelId: "hotel999",
      conversationId,
      guard: {
        contractVersion: "conversation-writer-guard-v1",
        token: "test-owned-cancel-gate-token",
        operationId: "test-owned-cancel-gate-operation",
        writerKind: "common_channel_turn",
        instanceId: "test-instance",
        buildId: "test-build",
        acquiredAt: "2026-11-06T10:00:00.000Z",
      },
    } as any, () => handleIncomingMessage(
      msg("CONFIRMAR", conversationId, lang),
      { mode: "automatic", sendReply },
    ));

    expect(cancelReservation).not.toHaveBeenCalled();
    expect(getReservation).not.toHaveBeenCalled();
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toBe(expectedCopy);
    expect(stateByConversation.get(conversationId)?.pendingCancellation ?? null).toBeNull();
    expect(stateByConversation.get(conversationId)?.lastReservation?.status).not.toBe("cancelled");
  });

  it("bloquea Cancel después de reemitir el preview de un pending legacy", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-cancel-operational-gate-legacy";
    stateByConversation.set(conversationId, {
      pendingCancellation: { reservationId: "RES123456", awaitingConfirmation: true },
      activeFlow: "cancel_reservation",
      desiredAction: "cancel",
      lastCategory: "cancel_reservation",
    });

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });
    expect(stateByConversation.get(conversationId)?.pendingCancellation).toMatchObject({
      reservationId: "RES123456",
      awaitingConfirmation: true,
      presentedFingerprint: expect.any(String),
    });
    vi.mocked(cancelReservation).mockClear();
    vi.mocked(getReservation).mockClear();
    vi.mocked(isCancellationProviderExecutionEnabled).mockReturnValueOnce(false);

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });

    expect(cancelReservation).not.toHaveBeenCalled();
    expect(getReservation).not.toHaveBeenCalled();
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toBe(
      "No cancelé tu reserva. Para gestionarla, contactá a recepción o al canal oficial del hotel.",
    );
    expect(stateByConversation.get(conversationId)?.pendingCancellation ?? null).toBeNull();
  });

  it("código + confirmación inline presenta material y exige un turno posterior", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-cancel-flow-2";

    await handleIncomingMessage(msg("cancelar RES123456 confirmar", conversationId), { mode: "automatic", sendReply });

    expect(cancelReservation).not.toHaveBeenCalled();
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/Código: RES123456[\s\S]*Operación: cancelar esta reserva[\s\S]*CONFIRMAR/i);

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });
    expect(cancelReservation).toHaveBeenCalledTimes(1);
  });

  it("persiste la cancelación por código dentro de reservationHistory sin dejar versión activa duplicada", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-cancel-flow-history-1";
    stateByConversation.set(conversationId, {
      reservationSlots: {
        guestName: "Marcelo Martinez",
        roomType: "double",
        checkIn: "2026-03-21",
        checkOut: "2026-03-25",
        numGuests: "2",
      },
      salesStage: "close",
      conversationStage: "reservation_confirmed",
      lastReservation: {
        reservationId: "RES999999",
        status: "created",
        createdAt: "2026-03-20T10:00:00.000Z",
        channel: "web",
      },
      reservationHistory: [
        {
          reservationId: "RES123456",
          status: "created",
          createdAt: "2026-03-19T10:00:00.000Z",
          channel: "web",
        },
        {
          reservationId: "RES999999",
          status: "created",
          createdAt: "2026-03-20T10:00:00.000Z",
          channel: "web",
        },
      ],
    });

    await handleIncomingMessage(msg("cancelar RES123456 confirmar", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });

    const st = stateByConversation.get(conversationId);
    const matching = (st?.reservationHistory || []).filter((item: any) => item?.reservationId === "RES123456");
    expect(matching).toHaveLength(1);
    expect(matching[0]).toMatchObject({
      reservationId: "RES123456",
      status: "cancelled",
    });
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

  it("responde amenities en cancel sin perder continuidad ni target", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-cancel-lateral-1";
    await handleIncomingMessage(msg("cancelar RES123456", conversationId), { mode: "automatic", sendReply });
    const presentedFingerprint = stateByConversation.get(conversationId)?.pendingCancellation?.presentedFingerprint;
    expect(presentedFingerprint).toEqual(expect.any(String));

    await handleIncomingMessage(msg("¿el estacionamiento está incluido?", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/estacionamiento|parking/i);
    expect(replyText).not.toMatch(/cancel|confirmar|c[oó]digo/i);
    const st = stateByConversation.get(conversationId);
    expect(st?.pendingCancellation).toMatchObject({
      reservationId: "RES123456",
      awaitingConfirmation: true,
      presentedFingerprint,
    });
    expect(st?.selectedReservationTarget).toMatchObject({ reservationId: "RES123456" });

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });
    expect(cancelReservation).toHaveBeenCalledWith("hotel999", "RES123456");
  });

  it("un pending legacy sin fingerprint solo genera un nuevo preview", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-cancel-legacy-pending";
    stateByConversation.set(conversationId, {
      pendingCancellation: { reservationId: "RES123456", awaitingConfirmation: true },
      activeFlow: "cancel_reservation",
      desiredAction: "cancel",
      lastCategory: "cancel_reservation",
    });

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });

    expect(cancelReservation).not.toHaveBeenCalled();
    expect(stateByConversation.get(conversationId)?.pendingCancellation).toMatchObject({
      reservationId: "RES123456",
      presentedFingerprint: expect.any(String),
    });
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/Código: RES123456[\s\S]*CONFIRMAR/i);
  });

  it("revalida la versión presentada y exige nueva confirmación si cambia", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-cancel-version-change";

    await handleIncomingMessage(msg("cancelar RES123456", conversationId), { mode: "automatic", sendReply });
    const changedProviderResult = {
      ok: true,
      reservation: {
        reservationId: "RES123456",
        hotelId: "hotel999",
        guestName: "Marcelo Martinez",
        roomType: "triple",
        numGuests: 3,
        checkInDate: "2026-03-22",
        checkOutDate: "2026-03-26",
        status: "confirmed",
        currency: "USD",
        createdAt: "2026-03-20T10:00:00.000Z",
        updatedAt: "2026-03-21T10:00:00.000Z",
      },
    } as any;
    vi.mocked(getReservation)
      .mockResolvedValueOnce(changedProviderResult)
      .mockResolvedValueOnce(changedProviderResult);

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });

    expect(cancelReservation).not.toHaveBeenCalled();
    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(/datos de la reserva cambiaron[\s\S]*Habitación: triple[\s\S]*Huéspedes: 3/i);

    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });
    expect(cancelReservation).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["provider nulo", { ok: false, error: "PROVIDER_RESERVATION_NOT_FOUND" }],
    ["hotel divergente", {
      ok: true,
      reservation: {
        reservationId: "RES123456",
        hotelId: "hotel-other",
        guestName: "Marcelo Martinez",
        roomType: "double",
        numGuests: 2,
        checkInDate: "2026-03-21",
        checkOutDate: "2026-03-25",
        status: "confirmed",
        currency: "USD",
        createdAt: "2026-03-20T10:00:00.000Z",
        updatedAt: "2026-03-20T10:00:00.000Z",
      },
    }],
    ["ID divergente", {
      ok: true,
      reservation: {
        reservationId: "RES-WRONG",
        hotelId: "hotel999",
        guestName: "Marcelo Martinez",
        roomType: "double",
        numGuests: 2,
        checkInDate: "2026-03-21",
        checkOutDate: "2026-03-25",
        status: "confirmed",
        currency: "USD",
        createdAt: "2026-03-20T10:00:00.000Z",
        updatedAt: "2026-03-20T10:00:00.000Z",
      },
    }],
    ["material legacy incompleto", {
      ok: true,
      reservation: {
        reservationId: "RES123456",
        hotelId: "hotel999",
        guestName: "Marcelo Martinez",
        roomType: "double",
        numGuests: null,
        checkInDate: "2026-03-21",
        checkOutDate: "2026-03-25",
        status: "confirmed",
        currency: "USD",
        createdAt: "2026-03-20T10:00:00.000Z",
        updatedAt: "2026-03-20T10:00:00.000Z",
      },
    }],
    ["versión temporal inválida", {
      ok: true,
      reservation: {
        reservationId: "RES123456",
        hotelId: "hotel999",
        guestName: "Marcelo Martinez",
        roomType: "double",
        numGuests: 2,
        checkInDate: "2026-03-21",
        checkOutDate: "2026-03-25",
        status: "confirmed",
        currency: "USD",
        createdAt: "2026-03-20T10:00:00.000Z",
        updatedAt: "invalid",
      },
    }],
  ])("falla cerrado ante %s", async (_label, providerResult) => {
    const sendReply = vi.fn(async () => {});
    const conversationId = `conv-cancel-fail-${_label}`;
    vi.mocked(getReservation).mockResolvedValueOnce(providerResult as any);

    await handleIncomingMessage(msg("cancelar RES123456", conversationId), { mode: "automatic", sendReply });

    expect(cancelReservation).not.toHaveBeenCalled();
    expect(stateByConversation.get(conversationId)?.pendingCancellation ?? null).toBeNull();
  });

  it.each(["cancelled", "pending"] as const)("no crea autorización para estado provider %s", async (status) => {
    const sendReply = vi.fn(async () => {});
    const conversationId = `conv-cancel-status-${status}`;
    vi.mocked(getReservation).mockResolvedValueOnce({
      ok: true,
      reservation: {
        reservationId: "RES123456",
        hotelId: "hotel999",
        guestName: "Marcelo Martinez",
        roomType: "double",
        numGuests: 2,
        checkInDate: "2026-03-21",
        checkOutDate: "2026-03-25",
        status,
        currency: "USD",
        createdAt: "2026-03-20T10:00:00.000Z",
        updatedAt: "2026-03-20T10:00:00.000Z",
      },
    } as any);

    await handleIncomingMessage(msg("cancelar RES123456", conversationId), { mode: "automatic", sendReply });

    expect(cancelReservation).not.toHaveBeenCalled();
    expect(stateByConversation.get(conversationId)?.pendingCancellation ?? null).toBeNull();
  });

  it.each([
    ["es", /Código: RES123456[\s\S]*Titular: Marcelo Martinez[\s\S]*Huéspedes: 2[\s\S]*Estado: Activa/i],
    ["en", /Code: RES123456[\s\S]*Guest: Marcelo Martinez[\s\S]*Guests: 2[\s\S]*Status: Active/i],
    ["pt", /Código: RES123456[\s\S]*Titular: Marcelo Martinez[\s\S]*Hóspedes: 2[\s\S]*Status: Ativa/i],
  ] as const)("presenta paridad material en %s", async (lang, expected) => {
    const sendReply = vi.fn(async () => {});
    const conversationId = `conv-cancel-lang-${lang}`;

    await handleIncomingMessage(msg("cancelar RES123456", conversationId, lang), { mode: "automatic", sendReply });

    expect(String((sendReply as any).mock.calls.at(-1)?.[0] || "")).toMatch(expected);
    expect(cancelReservation).not.toHaveBeenCalled();
  });

  it("CONFIRMAR repetido después de cancelar no produce una segunda mutación", async () => {
    const sendReply = vi.fn(async () => {});
    const conversationId = "conv-cancel-repeat-confirm";
    await handleIncomingMessage(msg("cancelar RES123456", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("CONFIRMAR", conversationId), { mode: "automatic", sendReply });

    expect(cancelReservation).toHaveBeenCalledTimes(1);
    expect(stateByConversation.get(conversationId)?.pendingCancellation ?? null).toBeNull();
  });
});
