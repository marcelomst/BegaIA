import { beforeEach, describe, expect, it, vi } from "vitest";
import { futureMonthDayReservationRange } from "../utils/reservationDates";

let currentState: any = null;
let guestRecord: any = null;
let lastAvailabilityGuestSnapshot: { name?: string; firstName?: string } | null = null;
let lastAvailabilitySlotsSnapshot: Record<string, unknown> | null = null;
let persistedMessages: any[] = [];
let usePersistedHistory = false;

const runAvailabilityCheckMock = vi.hoisted(() =>
  vi.fn(async (pre: any, slots: any, ciISO: string, coISO: string) => {
    const roomLabel =
      String(slots.roomType || "double") === "double"
        ? pre?.lang === "pt"
          ? "duplo"
          : pre?.lang === "en"
            ? "double"
            : "doble"
        : String(slots.roomType || "double");
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
      finalText: `Tengo ${roomLabel} disponible para ${String(slots.guestName || "el huésped")}. Tarifa por noche: 100 USD. Total 2 noches: 200 USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.`,
      nextSlots: {
        ...slots,
        checkIn: ciISO,
        checkOut: coISO,
      },
      needsHandoff: false,
    };
  })
);

const agentGraphInvokeMock = vi.hoisted(() =>
  vi.fn(async () => ({
    messages: [{ role: "assistant", content: "Respuesta base" }],
    category: "reservation",
    meta: {},
  }))
);

const confirmAndCreateMock = vi.hoisted(() =>
  vi.fn(async () => ({ ok: true, reservationId: "R-WORD-DATES-01", message: "ok" }))
);

vi.mock("@/lib/db/messages", () => ({
  saveChannelMessageToAstra: vi.fn(async (message: any) => {
    persistedMessages.push({ ...message });
  }),
  getMessagesByConversation: vi.fn(async ({ hotelId, conversationId, limit }: any) => {
    if (!usePersistedHistory) return [];
    return persistedMessages
      .filter((message) => message.hotelId === hotelId && message.conversationId === conversationId)
      .slice(-limit);
  }),
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
    invoke: agentGraphInvokeMock,
  },
}));
vi.mock("@/lib/agents/stateUpdaterAgent", () => ({
  updateConversationState: vi.fn(async (_hotelId: string, _conversationId: string, patch: any) => {
    currentState = { ...(currentState || {}), ...patch };
  }),
}));
vi.mock("@/lib/agents/reservations", () => ({
  confirmAndCreate: confirmAndCreateMock,
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

function testCalendarDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function testSystemTime(year = 2026, monthIndex = 8, day = 24): Date {
  return new Date(Date.UTC(year, monthIndex, day, 15));
}

function msg(content: string, channel: "web" | "email" | "whatsapp" = "web", detectedLanguage: "es" | "pt" | "en" = "es") {
  return {
    messageId: `m-${Math.random().toString(36).slice(2, 8)}`,
    hotelId: "hotel999",
    channel,
    sender: channel === "whatsapp" ? "whatsapp:+59891359375" : "guest",
    content,
    timestamp: new Date().toISOString(),
    conversationId: `conv-word-dates-${channel}`,
    guestId: channel === "whatsapp" ? "whatsapp:+59891359375" : "g1",
    detectedLanguage,
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
    persistedMessages = [];
    usePersistedHistory = false;
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

  it("resuelve variante ES 'para el 27 hasta el 30 de Julio' y cotiza sin pedir check-out", async () => {
    const dates = futureMonthDayReservationRange(7, 27, 30);
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg(
        `Hola, soy Raul. Quiero hacer una reserva para el ${dates.wordRangeTextUntilEs}, una doble para 2 personas a nombre de Pep Guardiola.`,
        "web",
        "es"
      ),
      { mode: "automatic", sendReply }
    );

    const replies = replyTexts(sendReply);
    expect(runAvailabilityCheckMock).toHaveBeenCalledTimes(1);
    expect(lastAvailabilityGuestSnapshot?.name).toBe("Raul");
    expect(lastAvailabilitySlotsSnapshot).toMatchObject({
      guestName: "Pep Guardiola",
      roomType: "double",
      numGuests: "2",
      checkIn: dates.checkInISO,
      checkOut: dates.checkOutISO,
    });
    expect(replies[0] || "").toMatch(/Raul/i);
    expect(replies[0] || "").toMatch(/doble disponible/i);
    expect(replies[0] || "").toMatch(/Pep Guardiola/i);
    expect(replies.some((text) => /confirmarme también la fecha de check-?out|fecha de check-?out|Anot[eé] nuevas fechas|posibles diferencias/i.test(text))).toBe(false);
  });

  it("cotiza y persiste create completo aunque el rango válido no coincida con el guard de trazas", async () => {
    const prevUseGraph = process.env.USE_MH_FLOW_GRAPH;
    const prevUsePrePos = process.env.USE_PRE_POS_PIPELINE;
    const sendReply = vi.fn(async () => {});
    vi.useFakeTimers();
    vi.setSystemTime(testSystemTime(2026, 8, 22));
    const dates = futureMonthDayReservationRange(11, 10, 15);
    process.env.USE_MH_FLOW_GRAPH = "true";
    process.env.USE_PRE_POS_PIPELINE = "0";

    try {
      await handleIncomingMessage(
        msg(
          "Quiero hacer una reserva para el 10 de noviembre hasta el 15, a nombre de Jorge Lopez, una doble para dos personas",
          "web",
          "es"
        ),
        { mode: "automatic", sendReply }
      );

      const firstReply = lastReply(sendReply);
      expect(runAvailabilityCheckMock).toHaveBeenCalledTimes(1);
      expect(agentGraphInvokeMock).not.toHaveBeenCalled();
      expect(confirmAndCreateMock).not.toHaveBeenCalled();
      expect(firstReply).toMatch(/tengo doble disponible para Jorge Lopez/i);
      expect(firstReply).not.toMatch(/fecha de check-?out|fecha de check-?in|tipo de habitaci[oó]n|cantidad de hu[eé]spedes/i);
      expect(currentState).toMatchObject({
        activeFlow: "reservation",
        desiredAction: "create",
        salesStage: "quote",
        conversationStage: "reservation_quoted",
        reservationSlots: {
          checkIn: dates.checkInISO,
          checkOut: dates.checkOutISO,
          numGuests: "2",
          roomType: "double",
          guestName: "Jorge Lopez",
        },
      });

      await handleIncomingMessage(msg("15 de noviembre", "web", "es"), {
        mode: "automatic",
        sendReply,
      });

      expect(currentState?.reservationSlots).toMatchObject({
        checkIn: dates.checkInISO,
        checkOut: dates.checkOutISO,
        numGuests: "2",
        roomType: "double",
        guestName: "Jorge Lopez",
      });
      expect(confirmAndCreateMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      restoreEnv("USE_MH_FLOW_GRAPH", prevUseGraph);
      restoreEnv("USE_PRE_POS_PIPELINE", prevUsePrePos);
    }
  });

  it("rechaza el caso Guardian 31 de noviembre sin consultar disponibilidad ni generar propuesta", async () => {
    const guardianYear = 2026;
    const sendReply = vi.fn(async () => {});
    vi.useFakeTimers();
    vi.setSystemTime(testSystemTime(guardianYear));

    try {
      await handleIncomingMessage(
        msg(
          `Quiero reservar una doble para dos personas del 31 de noviembre al 3 de diciembre de ${guardianYear}, a nombre de Laura Perez.`,
          "web",
          "es"
        ),
        { mode: "automatic", sendReply }
      );

      const replyText = lastReply(sendReply);
      expect(replyText).toMatch(/fecha de check-?in no es v[aá]lida/i);
      expect(replyText).not.toMatch(/disponible|confirm[aá]s la reserva/i);
      expect(runAvailabilityCheckMock).not.toHaveBeenCalled();
      expect(confirmAndCreateMock).not.toHaveBeenCalled();
      expect(currentState).toMatchObject({
        salesStage: "qualify",
        reservationSlots: {
          checkOut: testCalendarDate(guardianYear, 12, 3),
          numGuests: "2",
          roomType: "double",
          guestName: "Laura Perez",
        },
        lastProposal: null,
      });
      expect(currentState?.reservationSlots?.checkIn).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    {
      name: "check-in imposible",
      text: `Quiero reservar una doble para dos personas del 31 de abril de ${2027} al 3 de mayo de ${2027}, a nombre de Laura Perez.`,
      invalidField: "checkIn",
      preservedField: "checkOut",
      preservedValue: testCalendarDate(2027, 5, 3),
    },
    {
      name: "check-out imposible",
      text: `Quiero reservar una doble para dos personas del 28 de noviembre de ${2026} al 31 de noviembre de ${2026}, a nombre de Laura Perez.`,
      invalidField: "checkOut",
      preservedField: "checkIn",
      preservedValue: testCalendarDate(2026, 11, 28),
    },
    {
      name: "29 de febrero en año no bisiesto",
      text: `Quiero reservar una doble para dos personas del 28 de febrero de ${2027} al 29 de febrero de ${2027}, a nombre de Laura Perez.`,
      invalidField: "checkOut",
      preservedField: "checkIn",
      preservedValue: testCalendarDate(2027, 2, 28),
    },
  ] as const)("rechaza $name y preserva los slots válidos", async ({ text, invalidField, preservedField, preservedValue }) => {
    const sendReply = vi.fn(async () => {});
    vi.useFakeTimers();
    vi.setSystemTime(testSystemTime());

    try {
      await handleIncomingMessage(msg(text, "web", "es"), { mode: "automatic", sendReply });

      expect(lastReply(sendReply)).toMatch(new RegExp(`fecha de ${invalidField === "checkIn" ? "check-?in" : "check-?out"} no es v[aá]lida`, "i"));
      expect(runAvailabilityCheckMock).not.toHaveBeenCalled();
      expect(confirmAndCreateMock).not.toHaveBeenCalled();
      expect(currentState?.reservationSlots?.[invalidField]).toBeUndefined();
      expect(currentState?.reservationSlots?.[preservedField]).toBe(preservedValue);
      expect(currentState?.reservationSlots).toMatchObject({
        numGuests: "2",
        roomType: "double",
        guestName: "Laura Perez",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("acepta 29 de febrero en año bisiesto", async () => {
    const leapYear = 2028;
    const sendReply = vi.fn(async () => {});
    vi.useFakeTimers();
    vi.setSystemTime(testSystemTime());

    try {
      await handleIncomingMessage(
        msg(
          `Quiero reservar una doble para dos personas del 28 de febrero de ${leapYear} al 29 de febrero de ${leapYear}, a nombre de Laura Perez.`,
          "web",
          "es"
        ),
        { mode: "automatic", sendReply }
      );

      expect(runAvailabilityCheckMock).toHaveBeenCalledTimes(1);
      expect(confirmAndCreateMock).not.toHaveBeenCalled();
      expect(lastReply(sendReply)).toMatch(/doble disponible para Laura Perez/i);
      expect(currentState?.reservationSlots).toMatchObject({
        checkIn: testCalendarDate(leapYear, 2, 28),
        checkOut: testCalendarDate(leapYear, 2, 29),
        numGuests: "2",
        roomType: "double",
        guestName: "Laura Perez",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("acepta la corrección del check-in inválido y cotiza preservando los demás slots", async () => {
    const guardianYear = 2026;
    const prevUseChrono = process.env.USE_CHRONO_LAYER;
    const sendReply = vi.fn(async () => {});
    vi.useFakeTimers();
    vi.setSystemTime(testSystemTime(guardianYear));
    usePersistedHistory = true;
    process.env.USE_CHRONO_LAYER = "1";

    try {
      await handleIncomingMessage(
        msg(
          `Quiero reservar una doble para dos personas del 31 de noviembre al 3 de diciembre de ${guardianYear}, a nombre de Laura Perez.`,
          "web",
          "es"
        ),
        { mode: "automatic", sendReply }
      );

      expect(runAvailabilityCheckMock).not.toHaveBeenCalled();
      expect(currentState?.reservationSlots).toMatchObject({
        checkOut: testCalendarDate(guardianYear, 12, 3),
        numGuests: "2",
        roomType: "double",
        guestName: "Laura Perez",
      });

      await handleIncomingMessage(msg(`30 de noviembre de ${guardianYear}`, "web", "es"), {
        mode: "automatic",
        sendReply,
      });

      expect(runAvailabilityCheckMock).toHaveBeenCalledTimes(1);
      expect(confirmAndCreateMock).not.toHaveBeenCalled();
      expect(lastReply(sendReply)).toMatch(/doble disponible para Laura Perez/i);
      expect(currentState?.reservationSlots).toMatchObject({
        checkIn: testCalendarDate(guardianYear, 11, 30),
        checkOut: testCalendarDate(guardianYear, 12, 3),
        numGuests: "2",
        roomType: "double",
        guestName: "Laura Perez",
      });
    } finally {
      vi.useRealTimers();
      restoreEnv("USE_CHRONO_LAYER", prevUseChrono);
    }
  });

  it("preserva el check-out al corregir un 29 de febrero inválido en año no bisiesto", async () => {
    const nonLeapYear = 2027;
    const prevUseChrono = process.env.USE_CHRONO_LAYER;
    const sendReply = vi.fn(async () => {});
    vi.useFakeTimers();
    vi.setSystemTime(testSystemTime());
    usePersistedHistory = true;
    process.env.USE_CHRONO_LAYER = "1";

    try {
      await handleIncomingMessage(
        msg(
          `Quiero reservar una doble para dos personas del 29 de febrero al 3 de marzo de ${nonLeapYear}, a nombre de Laura Perez.`,
          "web",
          "es"
        ),
        { mode: "automatic", sendReply }
      );

      expect(lastReply(sendReply)).toMatch(/fecha de check-?in no es v[aá]lida/i);
      expect(runAvailabilityCheckMock).not.toHaveBeenCalled();
      expect(currentState?.reservationSlots).toMatchObject({
        checkOut: testCalendarDate(nonLeapYear, 3, 3),
        numGuests: "2",
        roomType: "double",
        guestName: "Laura Perez",
      });
      expect(currentState?.reservationSlots?.checkIn).toBeUndefined();

      await handleIncomingMessage(msg("27 de febrero", "web", "es"), {
        mode: "automatic",
        sendReply,
      });

      expect(runAvailabilityCheckMock).toHaveBeenCalledTimes(1);
      expect(confirmAndCreateMock).not.toHaveBeenCalled();
      expect(lastReply(sendReply)).toMatch(/doble disponible para Laura Perez/i);
      expect(currentState?.reservationSlots).toMatchObject({
        checkIn: testCalendarDate(nonLeapYear, 2, 27),
        checkOut: testCalendarDate(nonLeapYear, 3, 3),
        numGuests: "2",
        roomType: "double",
        guestName: "Laura Perez",
      });
    } finally {
      vi.useRealTimers();
      restoreEnv("USE_CHRONO_LAYER", prevUseChrono);
    }
  });

  it("no usa el fast-path create persistente sobre contexto de reserva confirmada", async () => {
    const contextYear = 2026;
    const sendReply = vi.fn(async () => {});
    vi.useFakeTimers();
    vi.setSystemTime(testSystemTime(contextYear));
    currentState = {
      salesStage: "close",
      conversationStage: "reservation_confirmed",
      lastCategory: "reservation",
      lastReservation: {
        reservationId: "R-CONFIRMED-01",
        status: "created",
        checkIn: testCalendarDate(contextYear, 10, 10),
        checkOut: testCalendarDate(contextYear, 10, 12),
        roomType: "double",
        numGuests: "2",
        guestName: "Laura Perez",
      },
      activeReservationContext: {
        kind: "reservation",
        reservationId: "R-CONFIRMED-01",
        updatedAt: new Date().toISOString(),
      },
      reservationSlots: {
        checkIn: testCalendarDate(contextYear, 10, 10),
        checkOut: testCalendarDate(contextYear, 10, 12),
        roomType: "double",
        numGuests: "2",
        guestName: "Laura Perez",
        locale: "es",
      },
    };

    try {
      await handleIncomingMessage(
        msg(
          "Quiero hacer una reserva para el 10 de noviembre hasta el 15, a nombre de Jorge Lopez, una doble para dos personas",
          "web",
          "es"
        ),
        { mode: "automatic", sendReply }
      );

      expect(runAvailabilityCheckMock).toHaveBeenCalledTimes(1);
      expect(runAvailabilityCheckMock).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({
          checkIn: testCalendarDate(contextYear, 11, 10),
          checkOut: testCalendarDate(contextYear, 11, 15),
          guestName: "Jorge Lopez",
        }),
        testCalendarDate(contextYear, 11, 10),
        testCalendarDate(contextYear, 11, 15),
        { persistConvState: false }
      );
      expect(confirmAndCreateMock).not.toHaveBeenCalled();
      expect(currentState?.lastReservation?.reservationId).toBe("R-CONFIRMED-01");
    } finally {
      vi.useRealTimers();
    }
  });

  it("resuelve variante PT con 'até' y cotiza sin pedir check-out", async () => {
    const dates = futureMonthDayReservationRange(8, 25, 27);
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg(
        `Quero reservar um quarto duplo de ${dates.wordRangeTextPtAte} para duas pessoas, em nome de Pep Guardiola.`,
        "web",
        "pt"
      ),
      { mode: "automatic", sendReply }
    );

    const replies = replyTexts(sendReply);
    expect(runAvailabilityCheckMock).toHaveBeenCalledTimes(1);
    expect(lastAvailabilitySlotsSnapshot).toMatchObject({
      guestName: "Pep Guardiola",
      roomType: "double",
      numGuests: "2",
      checkIn: dates.checkInISO,
      checkOut: dates.checkOutISO,
    });
    expect(replies[0] || "").toMatch(/duplo disponible|duplo dispon/i);
    expect(replies[0] || "").toMatch(/Pep Guardiola/i);
    expect(replies.some((text) => /check-?out|Anot[eé] novas fechas|Anotei as novas datas|pos[ií]veis diferen/i.test(text))).toBe(false);
  });

  it("resuelve variante EN from/to y cotiza sin pedir check-out", async () => {
    const dates = futureMonthDayReservationRange(8, 25, 27);
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg(
        `Hi, I am Raul. I want to book a double room for two people from ${dates.wordRangeTextEnFromTo} under the name of Pep Guardiola.`,
        "web",
        "en"
      ),
      { mode: "automatic", sendReply }
    );

    const replies = replyTexts(sendReply);
    expect(runAvailabilityCheckMock).toHaveBeenCalledTimes(1);
    expect(lastAvailabilityGuestSnapshot?.name).toBe("Raul");
    expect(lastAvailabilitySlotsSnapshot).toMatchObject({
      guestName: "Pep Guardiola",
      roomType: "double",
      numGuests: "2",
      checkIn: dates.checkInISO,
      checkOut: dates.checkOutISO,
    });
    expect(replies[0] || "").toMatch(/Raul/i);
    expect(replies[0] || "").toMatch(/double disponible|double available/i);
    expect(replies[0] || "").toMatch(/Pep Guardiola/i);
    expect(replies.some((text) => /check-?out date|fecha de check-?out|Anot[eé] nuevas fechas|posibles diferencias/i.test(text))).toBe(false);
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
