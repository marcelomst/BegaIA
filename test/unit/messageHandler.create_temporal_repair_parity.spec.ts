import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const messageStore: any[] = [];
const convStateStore = new Map<string, any>();
let createdCount = 0;

vi.mock("@/lib/db/messages", () => ({
  saveChannelMessageToAstra: vi.fn(async (msg: any) => {
    messageStore.push({ ...msg });
  }),
  getMessagesByConversation: vi.fn(async ({ hotelId, conversationId }: any) =>
    messageStore.filter((m) => m.hotelId === hotelId && m.conversationId === conversationId)
  ),
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

vi.mock("@/lib/db/convState", async () => {
  const actual = await vi.importActual<typeof import("@/lib/db/convState")>("@/lib/db/convState");
  return {
    ...actual,
    getConvState: vi.fn(async (hotelId: string, conversationId: string) => {
      return convStateStore.get(`${hotelId}:${conversationId}`) ?? null;
    }),
    upsertConvState: vi.fn(async (hotelId: string, conversationId: string, patch: any) => {
      const key = `${hotelId}:${conversationId}`;
      const prev = convStateStore.get(key) || {
        _id: key,
        hotelId,
        conversationId,
      };
      const next = { ...prev };
      const patchHasReservationDraftSignals =
        patch?.salesStage === "qualify" ||
        patch?.salesStage === "followup" ||
        patch?.activeFlow === "reservation" ||
        patch?.lastProposal ||
        patch?.reservationSlots;
      const derivedConversationStage =
        "conversationStage" in (patch || {})
          ? patch.conversationStage
          : patch?.desiredAction === "cancel" || patch?.activeFlow === "cancel_reservation"
            ? "reservation_cancelling"
            : patch?.desiredAction === "modify"
              ? "reservation_modifying"
              : patch?.lastReservation?.status === "created" || patch?.salesStage === "close"
                ? "reservation_confirmed"
                : patch?.salesStage === "quote"
                  ? "reservation_quoted"
                  : patchHasReservationDraftSignals
                    ? "reservation_collecting"
                    : undefined;
      const derivedConversationFocus =
        "conversationFocus" in (patch || {})
          ? patch.conversationFocus
          : patch?.desiredAction === "cancel" || patch?.activeFlow === "cancel_reservation"
            ? { domain: "reservation", subFlow: "cancel", active: true, updatedAt: new Date().toISOString() }
            : patch?.desiredAction === "modify" || patch?.activeFlow === "modify_reservation"
              ? { domain: "reservation", subFlow: "modify", active: true, updatedAt: new Date().toISOString() }
              : patch?.desiredAction === "create" ||
                  patch?.activeFlow === "reservation" ||
                  patch?.salesStage === "qualify" ||
                  patch?.salesStage === "quote" ||
                  patch?.salesStage === "followup" ||
                  patch?.reservationSlots ||
                  patch?.activeReservationContext?.kind === "draft"
                ? { domain: "reservation", subFlow: "create", active: true, updatedAt: new Date().toISOString() }
                : undefined;

      for (const [field, value] of Object.entries(patch || {})) {
        if (field === "reservationSlots" || field === "updatedAt") continue;
        if (value === null || typeof value === "undefined") {
          delete (next as any)[field];
          continue;
        }
        (next as any)[field] = value;
      }

      if ("reservationSlots" in (patch || {})) {
        const patchSlots = { ...(patch?.reservationSlots || {}) };
        const slotKeys = ["guestName", "roomType", "checkIn", "checkOut", "numGuests", "locale"] as const;
        const prevSlots = { ...(prev.reservationSlots || {}) };
        const nextSlots = { ...prevSlots };
        for (const slotKey of slotKeys) {
          const value = patchSlots[slotKey];
          if (value === undefined || value === null || value === "") {
            delete nextSlots[slotKey];
          } else {
            nextSlots[slotKey] = String(value);
          }
        }
        if (Object.keys(nextSlots).length > 0) {
          next.reservationSlots = nextSlots;
        } else {
          delete next.reservationSlots;
        }
      }

      if (typeof derivedConversationStage !== "undefined") {
        next.conversationStage = derivedConversationStage;
      }
      if (typeof derivedConversationFocus !== "undefined") {
        if (derivedConversationFocus === null) {
          delete next.conversationFocus;
        } else {
          next.conversationFocus = derivedConversationFocus;
        }
      }

      next.updatedAt = new Date().toISOString();
      convStateStore.set(key, next);
      return next;
    }),
    resolveGuestState: vi.fn((st: any) => {
      if (!st) return undefined;
      if (st.salesStage === "close" || st.conversationStage === "reservation_confirmed") return "booked";
      if (st.reservationSlots || st.salesStage || st.conversationStage) return "prospect";
      return undefined;
    }),
    CONVSTATE_VERSION: "test",
  };
});

const runAvailabilityCheck = vi.fn(async (pre: any, slots: any, ciISO: string, coISO: string) => {
  const holder = String(slots.guestName || "").trim();
  const guestName = String(pre?.guest?.name || "").trim();
  const vocative = guestName ? `${guestName}, ` : "";
  return {
    finalText: `${vocative}Tengo doble disponible${holder ? ` para ${holder}` : ""}. Tarifa por noche: 100 USD. Total 4 noches: 400 USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.`,
    nextSlots: {
      ...slots,
      checkIn: ciISO,
      checkOut: coISO,
      roomType: slots.roomType || "double",
    },
    needsHandoff: false,
  };
});

vi.mock("@/lib/handlers/pipeline/availability", async () => {
  const actual = await vi.importActual<typeof import("@/lib/handlers/pipeline/availability")>("@/lib/handlers/pipeline/availability");
  return {
    ...actual,
    runAvailabilityCheck,
  };
});

vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: vi.fn(async (input: any) => {
      const text = String(input?.normalizedMessage || "").toLowerCase();
      const holder = String(
        input?.reservationSlots?.guestName ||
        (/^[A-Za-zÁÉÍÓÚáéíóúÑñ'’. -]{5,}$/.test(String(input?.normalizedMessage || "").trim())
          ? String(input.normalizedMessage).trim()
          : "")
      ).trim();
      return {
        messages: [{
          role: "assistant",
          content: `Tengo doble disponible${holder ? ` para ${holder}` : ""}. Tarifa por noche: 100 USD. Total 4 noches: 400 USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.`,
        }],
        category: /reserv|doble|check|personas|ana gomez/i.test(text) ? "reservation" : "retrieval_based",
        meta: {},
      };
    }),
  },
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

const hotelId = "hotel999";
const conversationId = "conv-create-temporal-repair-parity-1";
const sendReply = vi.fn(async () => {});
const prevEnv = {
  USE_MH_FLOW_GRAPH: process.env.USE_MH_FLOW_GRAPH,
  USE_ORCHESTRATOR_AGENT: process.env.USE_ORCHESTRATOR_AGENT,
  USE_PRE_POS_PIPELINE: process.env.USE_PRE_POS_PIPELINE,
  STRUCTURED_ENABLED: process.env.STRUCTURED_ENABLED,
};

let handleIncomingMessage: typeof import("@/lib/handlers/messageHandler").handleIncomingMessage;
let confirmAndCreate: typeof import("@/lib/agents/reservations").confirmAndCreate;

function msg(content: string) {
  return {
    messageId: `m-${Math.random().toString(36).slice(2, 8)}`,
    hotelId,
    channel: "web",
    sender: "guest",
    content,
    timestamp: new Date().toISOString(),
    conversationId,
    guestId: "g1",
    detectedLanguage: "es",
  } as any;
}

function currentState() {
  return convStateStore.get(`${hotelId}:${conversationId}`) ?? null;
}

function lastReply() {
  return String(sendReply.mock.calls.at(-1)?.[0] || "");
}

describe("messageHandler create temporal repair parity", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T12:00:00.000Z"));
    messageStore.length = 0;
    convStateStore.clear();
    createdCount = 0;
    vi.clearAllMocks();
    vi.resetModules();
    process.env.USE_MH_FLOW_GRAPH = "0";
    process.env.USE_ORCHESTRATOR_AGENT = "0";
    process.env.USE_PRE_POS_PIPELINE = "0";
    process.env.STRUCTURED_ENABLED = "false";
    handleIncomingMessage = (await import("@/lib/handlers/messageHandler")).handleIncomingMessage;
    confirmAndCreate = (await import("@/lib/agents/reservations")).confirmAndCreate;
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env.USE_MH_FLOW_GRAPH = prevEnv.USE_MH_FLOW_GRAPH;
    process.env.USE_ORCHESTRATOR_AGENT = prevEnv.USE_ORCHESTRATOR_AGENT;
    process.env.USE_PRE_POS_PIPELINE = prevEnv.USE_PRE_POS_PIPELINE;
    process.env.STRUCTURED_ENABLED = prevEnv.STRUCTURED_ENABLED;
  });

  it("reproduce el replay manual y preserva el draft válido ante un check out explícito inválido", async () => {
    await handleIncomingMessage(msg("Quiero hacer una reserva"), { mode: "automatic", sendReply });

    const stAfterTurn1 = currentState();
    expect(stAfterTurn1?.conversationFocus).toMatchObject({
      domain: "reservation",
      subFlow: "create",
      active: true,
    });
    expect(stAfterTurn1?.conversationStage).toBe("reservation_collecting");
    expect(stAfterTurn1?.salesStage).toBe("qualify");

    await handleIncomingMessage(msg("Un doble"), { mode: "automatic", sendReply });

    const stAfterTurn2 = currentState();
    expect(stAfterTurn2?.reservationSlots).toMatchObject({
      roomType: "double",
      locale: "es",
    });
    expect(stAfterTurn2?.activeFlow).toBe("reservation");
    expect(stAfterTurn2?.desiredAction).toBe("create");
    expect(stAfterTurn2?.lastCategory).toBe("reservation");

    await handleIncomingMessage(msg("Ana Gomez, check in 24/5/2026"), { mode: "automatic", sendReply });

    const turn3Reply = lastReply();
    expect(turn3Reply).toMatch(/ya pas[oó].*check-?in|nueva fecha de check-?in/i);
    const stAfterTurn3 = currentState();
    expect(stAfterTurn3?.reservationSlots).toMatchObject({
      roomType: "double",
      guestName: "Ana Gomez",
    });
    expect(stAfterTurn3?.reservationSlots?.checkIn).toBeUndefined();
    expect(stAfterTurn3?.reservationSlots?.checkOut).toBeUndefined();

    await handleIncomingMessage(msg("04/6/2026"), { mode: "automatic", sendReply });

    const turn4Reply = lastReply();
    expect(turn4Reply).toMatch(/check-?out|fecha de check-out/i);
    const stAfterTurn4 = currentState();
    expect(stAfterTurn4?.reservationSlots).toMatchObject({
      roomType: "double",
      guestName: "Ana Gomez",
      checkIn: "2026-06-04",
    });
    expect(stAfterTurn4?.reservationSlots?.checkOut).toBeUndefined();

    await handleIncomingMessage(msg("check out 25/5/2026, 2 personas"), { mode: "automatic", sendReply });

    const turn5Reply = lastReply();
    expect(turn5Reply).toMatch(/check-?out|fecha de check-out/i);
    expect(turn5Reply).not.toMatch(/ya pas[oó].*check-?in|nueva fecha de check-?in/i);
    expect(turn5Reply).not.toMatch(/tarifa por noche|confirm[aá]s la reserva|respond[eé]\s+[“"]?confirmar/i);

    const stAfterTurn5 = currentState();
    expect(stAfterTurn5?.reservationSlots).toMatchObject({
      roomType: "double",
      guestName: "Ana Gomez",
      checkIn: "2026-06-04",
      numGuests: "2",
    });
    expect(stAfterTurn5?.reservationSlots?.checkOut).toBeUndefined();
    expect(stAfterTurn5?.lastProposal).toBeUndefined();
    expect(runAvailabilityCheck).not.toHaveBeenCalled();
    expect(confirmAndCreate).not.toHaveBeenCalled();

    await handleIncomingMessage(msg("05/06/2026"), { mode: "automatic", sendReply });

    const turn6Reply = lastReply();
    expect(turn6Reply).toMatch(/tarifa por noche|confirm[aá]s la reserva|CONFIRMAR/i);
    expect(turn6Reply).not.toMatch(/anot[eé] nuevas fechas|posibles diferencias/i);
    expect(turn6Reply).not.toMatch(/a nombre de qui[eé]n|nombre y apellido/i);
    expect(turn6Reply).not.toMatch(/la fecha de check-in .* ya pas[oó]/i);
    expect(turn6Reply).not.toMatch(/cu[aá]l ser[ií]a la nueva fecha de check-?in/i);

    const stAfterTurn6 = currentState();
    expect(stAfterTurn6?.reservationSlots).toMatchObject({
      roomType: "double",
      guestName: "Ana Gomez",
      checkIn: "2026-06-04",
      checkOut: "2026-06-05",
      numGuests: "2",
    });
    expect(stAfterTurn6?.lastProposal?.available).toBe(true);
  });
});
