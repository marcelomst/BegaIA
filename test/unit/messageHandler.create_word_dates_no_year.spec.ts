import { beforeEach, describe, expect, it, vi } from "vitest";
import { futureMonthDayReservationRange } from "../utils/reservationDates";

let currentState: any = null;
let guestRecord: any = null;
let lastAvailabilityGuestSnapshot: { name?: string; firstName?: string } | null = null;
let lastAvailabilitySlotsSnapshot: Record<string, unknown> | null = null;

const runAvailabilityCheckMock = vi.hoisted(() =>
  vi.fn(async (pre: any, slots: any, ciISO: string, coISO: string) => {
    lastAvailabilityGuestSnapshot = {
      name: String(pre?.guest?.name || ""),
      firstName: String(pre?.guest?.firstName || ""),
    };
    lastAvailabilitySlotsSnapshot = {
      ...slots,
      checkIn: ciISO,
      checkOut: coISO,
    };
    return {
      finalText: `Tengo ${String(slots.roomType || "double")} disponible para ${String(slots.guestName || "el huésped")}. Tarifa por noche: 100 USD. Total 2 noches: 200 USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.`,
      nextSlots: {
        ...slots,
        checkIn: ciISO,
        checkOut: coISO,
      },
      needsHandoff: false,
    };
  })
);

vi.mock("@/lib/db/messages", () => ({
  saveChannelMessageToAstra: vi.fn(async () => {}),
  getMessagesByConversation: vi.fn(async () => []),
}));
vi.mock("@/lib/db/conversations", () => ({
  getOrCreateConversation: vi.fn(async () => {}),
  appendConversationReplyTrace: vi.fn(async () => {}),
}));
vi.mock("@/lib/db/guests", () => ({
  getGuest: vi.fn(async () => guestRecord),
  createGuest: vi.fn(async (guest: any) => {
    guestRecord = { ...guest };
    return guestRecord;
  }),
  updateGuest: vi.fn(async (_hotelId: string, _guestId: string, patch: any) => {
    guestRecord = {
      ...(guestRecord || { guestId: "g1", hotelId: "hotel999" }),
      ...patch,
    };
  }),
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
vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: vi.fn(async () => ({
      messages: [{ role: "assistant", content: "Respuesta base" }],
      category: "reservation",
      meta: {},
    })),
  },
}));
vi.mock("@/lib/agents/stateUpdaterAgent", () => ({
  updateConversationState: vi.fn(async (_hotelId: string, _conversationId: string, patch: any) => {
    currentState = { ...(currentState || {}), ...patch };
  }),
}));
vi.mock("@/lib/agents/reservations", () => ({
  confirmAndCreate: vi.fn(async () => ({ ok: true, reservationId: "R-WORD-DATES-01", message: "ok" })),
  modifyReservation: vi.fn(async () => ({ ok: true, message: "ok" })),
}));
vi.mock("@/lib/handlers/pipeline/availability", async () => {
  const actual = await vi.importActual<typeof import("@/lib/handlers/pipeline/availability")>("@/lib/handlers/pipeline/availability");
  return {
    ...actual,
    runAvailabilityCheck: runAvailabilityCheckMock,
  };
});
vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(async () => ({
    hotelId: "hotel999",
    hotelName: "Hotel Demo",
    defaultLanguage: "es",
    timezone: "America/Montevideo",
    channelConfigs: {},
    users: [],
    reservations: {},
  })),
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

function restoreEnv(name: string, value: string | undefined) {
  if (typeof value === "undefined") {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

function msg(content: string, channel: "web" | "email" | "whatsapp" = "web") {
  return {
    messageId: `m-${Math.random().toString(36).slice(2, 8)}`,
    hotelId: "hotel999",
    channel,
    sender: channel === "whatsapp" ? "whatsapp:+59891359375" : "guest",
    content,
    timestamp: new Date().toISOString(),
    conversationId: `conv-word-dates-${channel}`,
    guestId: channel === "whatsapp" ? "whatsapp:+59891359375" : "g1",
    detectedLanguage: "es",
  } as any;
}

function lastReply(sendReply: any): string {
  return String(sendReply.mock.calls.at(-1)?.[0] || "");
}

function replyTexts(sendReply: any): string[] {
  return sendReply.mock.calls.map((call: unknown) => {
    const args = call as unknown[] | undefined;
    return String(args?.[0] ?? "");
  });
}

describe("messageHandler create word dates without explicit year", () => {
  beforeEach(() => {
    currentState = null;
    guestRecord = null;
    lastAvailabilityGuestSnapshot = null;
    lastAvailabilitySlotsSnapshot = null;
    vi.clearAllMocks();
  });

  it.each(["web", "email", "whatsapp"] as const)(
    "resuelve rango en palabras sin año y cotiza en create para canal %s",
    async (channel) => {
      const dates = futureMonthDayReservationRange(7, 25, 27);
      const sendReply = vi.fn(async () => {});

      await handleIncomingMessage(
        msg(
          `Hola, soy Martín P. Quisiera reservar una triple del ${dates.wordRangeText} para tres personas, a nombre de Ana Rodríguez.`,
          channel
        ),
        { mode: "automatic", sendReply }
      );

      const replyText = lastReply(sendReply);
      expect(replyText).toMatch(/tengo triple disponible para Ana Rodríguez/i);
      expect(replyText).toMatch(/confirm[aá]s la reserva/i);
      expect(replyText).not.toMatch(/confirmarme.*check-?out|fecha de check-?out/i);
      expect(replyText).not.toMatch(/Anot[eé] nuevas fechas|posibles diferencias|cambio de fechas/i);
      expect(currentState?.reservationSlots).toMatchObject({
        roomType: "triple",
        numGuests: "3",
        guestName: "Ana Rodríguez",
        checkIn: dates.checkInISO,
        checkOut: dates.checkOutISO,
      });
      expect(runAvailabilityCheckMock).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({
          roomType: "triple",
          numGuests: "3",
          guestName: "Ana Rodríguez",
        }),
        dates.checkInISO,
        dates.checkOutISO
      );
    }
  );

  it("sin saludo no contamina create con copy de modify", async () => {
    const dates = futureMonthDayReservationRange(7, 25, 27);
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg(`Quiero reservar una triple del ${dates.wordRangeText} para tres personas, a nombre de Ana Rodríguez.`),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/tengo triple disponible para Ana Rodríguez/i);
    expect(replyText).not.toMatch(/Anot[eé] nuevas fechas|posibles diferencias|cambio de fechas/i);
    expect(currentState?.activeFlow).toBe("reservation");
    expect(currentState?.desiredAction).toBe("create");
  });

  it("con typo en reservar sigue cotizando como create y no cae en copy de modify", async () => {
    const dates = futureMonthDayReservationRange(7, 25, 27);
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg(`Quiero eservar una triple del ${dates.wordRangeText} para tres personas, a nombre de Ana Rodríguez.`),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/tengo triple disponible para Ana Rodríguez/i);
    expect(replyText).toMatch(/confirm[aá]s la reserva/i);
    expect(replyText).not.toMatch(/Anot[eé] nuevas fechas|posibles diferencias|cambio de fechas/i);
    expect(currentState?.reservationSlots).toMatchObject({
      roomType: "triple",
      numGuests: "3",
      guestName: "Ana Rodríguez",
      checkIn: dates.checkInISO,
      checkOut: dates.checkOutISO,
    });
  });

  it("atribuye follow-up de fecha única en palabras al checkOut pendiente y preserva slots", async () => {
    const dates = futureMonthDayReservationRange(7, 25, 27);
    currentState = {
      activeFlow: "reservation",
      desiredAction: "create",
      lastCategory: "reservation",
      salesStage: "qualify",
      conversationStage: "reservation_collecting",
      reservationSlots: {
        roomType: "triple",
        numGuests: "3",
        guestName: "Ana Rodríguez",
        checkIn: dates.checkInISO,
        locale: "es",
      },
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg(dates.singleCheckoutText),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/tengo triple disponible para Ana Rodríguez/i);
    expect(replyText).not.toMatch(/tipo de habitaci[oó]n|check-?in|fecha de check-?in/i);
    expect(currentState?.reservationSlots).toMatchObject({
      roomType: "triple",
      numGuests: "3",
      guestName: "Ana Rodríguez",
      checkIn: dates.checkInISO,
      checkOut: dates.checkOutISO,
    });
  });

  it("resuelve actor inline distinto del guestName y cotiza sin pedir check-out", async () => {
    const dates = futureMonthDayReservationRange(8, 25, 27);
    const sendReply = vi.fn(async () => {});
    currentState = {
      activeFlow: "reservation",
      desiredAction: "create",
      conversationFocus: {
        domain: "reservation",
        subFlow: "create",
        active: true,
        updatedAt: new Date().toISOString(),
      },
      activeReservationContext: {
        kind: "draft",
        phase: "collecting",
        updatedAt: new Date().toISOString(),
      },
      reservationSlots: {
        guestName: "Martín Perez",
        roomType: "triple",
        checkIn: dates.checkInISO,
        numGuests: "3",
        locale: "es",
      },
      salesStage: "qualify",
      conversationStage: "reservation_collecting",
    };

    await handleIncomingMessage(
      msg(
        `Hola, soy Martín Perez. Quisiera reservar una triple del ${dates.wordRangeText} para tres personas, a nombre de Sergio Botana.`,
        "web"
      ),
      { mode: "automatic", sendReply }
    );

    const replies = replyTexts(sendReply);
    const replyText = replies.at(-1) || "";
    expect(guestRecord?.name).toBe("Martín Perez");
    expect(runAvailabilityCheckMock).toHaveBeenCalledTimes(1);
    expect(lastAvailabilityGuestSnapshot?.name).toBe("Martín Perez");
    expect(lastAvailabilitySlotsSnapshot).toMatchObject({
      guestName: "Sergio Botana",
      roomType: "triple",
      numGuests: "3",
      checkIn: dates.checkInISO,
      checkOut: dates.checkOutISO,
    });
    expect(replies[0] || "").toMatch(/Martín/i);
    expect(replies[0] || "").toMatch(/triple disponible/i);
    expect(replies[0] || "").toMatch(/Sergio Botana/i);
    expect(replies.some((text) => /confirmarme también la fecha de check-?out|fecha de check-?out|Anot[eé] nuevas fechas|posibles diferencias/i.test(text))).toBe(false);
    expect(replyText).toMatch(/^Martín,\s+tengo triple disponible para Sergio Botana\./i);
    expect(replyText).toMatch(/Tarifa por noche: 100 USD\./i);
    expect(replyText).toMatch(/Total 2 noches: 200 USD\./i);
    expect(replyText).not.toMatch(/fecha de check-?out/i);
    expect(replyText).not.toMatch(/Anot[eé] nuevas fechas|posibles diferencias|cambio de fechas/i);
    expect(currentState?.reservationSlots).toMatchObject({
      roomType: "triple",
      numGuests: "3",
      guestName: "Sergio Botana",
      checkIn: dates.checkInISO,
      checkOut: dates.checkOutISO,
    });
    expect(guestRecord?.name).toBe("Martín Perez");
  });

  it("con grafo activo no pide check-out si nextSlots ya contiene checkOut", async () => {
    const prevUseGraph = process.env.USE_MH_FLOW_GRAPH;
    const prevUsePrePos = process.env.USE_PRE_POS_PIPELINE;
    const prevTrace = process.env.CREATE_WORD_DATES_TRACE;
    process.env.USE_MH_FLOW_GRAPH = "true";
    process.env.USE_PRE_POS_PIPELINE = "0";
    process.env.CREATE_WORD_DATES_TRACE = "1";
    try {
      const dates = futureMonthDayReservationRange(8, 25, 27);
      const sendReply = vi.fn(async () => {});
      currentState = {
        activeFlow: "reservation",
        desiredAction: "create",
        conversationFocus: {
          domain: "reservation",
          subFlow: "create",
          active: true,
          updatedAt: new Date().toISOString(),
        },
        activeReservationContext: {
          kind: "draft",
          phase: "collecting",
          updatedAt: new Date().toISOString(),
        },
        reservationSlots: {
          guestName: "Martín Perez",
          roomType: "triple",
          checkIn: dates.checkInISO,
          numGuests: "3",
          locale: "es",
        },
        salesStage: "qualify",
        conversationStage: "reservation_collecting",
      };

      await handleIncomingMessage(
        msg(
          `Hola, soy Martín Perez. Quisiera reservar una triple del ${dates.wordRangeText} para tres personas, a nombre de Sergio Botana.`,
          "web"
        ),
        { mode: "automatic", sendReply }
      );

      const replies = replyTexts(sendReply);
      expect(replies[0] || "").toMatch(/Martín/i);
      expect(replies[0] || "").toMatch(/triple disponible/i);
      expect(replies[0] || "").toMatch(/Sergio Botana/i);
      expect(replies.some((text) => /confirmarme también la fecha de check-?out|fecha de check-?out|Anot[eé] nuevas fechas|posibles diferencias/i.test(text))).toBe(false);
      expect(currentState?.reservationSlots).toMatchObject({
        roomType: "triple",
        numGuests: "3",
        guestName: "Sergio Botana",
        checkIn: dates.checkInISO,
        checkOut: dates.checkOutISO,
      });
    } finally {
      restoreEnv("USE_MH_FLOW_GRAPH", prevUseGraph);
      restoreEnv("USE_PRE_POS_PIPELINE", prevUsePrePos);
      restoreEnv("CREATE_WORD_DATES_TRACE", prevTrace);
    }
  });
});
