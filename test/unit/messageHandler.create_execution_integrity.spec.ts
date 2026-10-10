import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    runAvailabilityCheck: vi.fn(async (pre: any, slots: any, ciISO: string, coISO: string) => {
      const holder = String(slots.guestName || "").trim();
      const guestName = String(pre?.guest?.name || "").trim();
      const vocative = guestName ? `${guestName}, ` : "";
      const displayDate = (iso: string) => String(iso).slice(0, 10).split("-").reverse().join("/");
      const guests = Number(slots.numGuests ?? slots.guests);
      return {
        finalText: `${vocative}Tengo doble disponible${holder ? ` para ${holder}` : ""}. Check-in: ${displayDate(ciISO)}. Check-out: ${displayDate(coISO)}. Huéspedes: ${guests} huéspedes. Tarifa por noche: 100 USD. Total 4 noches: 400 USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.`,
        nextSlots: {
          ...slots,
          checkIn: ciISO,
          checkOut: coISO,
          roomType: slots.roomType || "double",
        },
        needsHandoff: false,
      };
    }),
  };
});
vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: vi.fn(async (input: any) => {
      const text = String(input?.normalizedMessage || "").toLowerCase();
      const isTriple = /triple/.test(text);
      const normalizedMessage = String(input?.normalizedMessage || "").trim();
      const holder = String(
        input?.reservationSlots?.guestName ||
        (/^[A-Za-zÁÉÍÓÚáéíóúÑñ'’. -]{5,}$/.test(normalizedMessage) ? normalizedMessage : "")
      ).trim();
      const holderSuffix = holder ? ` para ${holder}` : "";
      return {
        messages: [{
          role: "assistant",
          content: isTriple
            ? `Tengo triple disponible${holderSuffix}. Tarifa por noche: 130 USD. Total 4 noches: 520 USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.`
            : `Tengo doble disponible${holderSuffix}. Tarifa por noche: 100 USD. Total 4 noches: 400 USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.`,
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
  confirmAndCreate: vi.fn(async (hotelId: string, slots: any) => {
    createdCount += 1;
    const reservationId = `R-NEW-0${createdCount}`;
    return {
      ok: true,
      reservationId,
      reservation: {
        reservationId,
        hotelId,
        guestName: slots.guestName,
        roomType: slots.roomType,
        numGuests: Number(slots.numGuests ?? slots.guests),
        checkInDate: slots.checkIn,
        checkOutDate: slots.checkOut,
        status: "confirmed",
        currency: "USD",
        priceTotal: 400,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      message: "ok",
    };
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
import { getGuest } from "@/lib/db/guests";
import { runAvailabilityCheck } from "@/lib/handlers/pipeline/availability";

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

function msgEmail(content: string) {
  return {
    ...msg(content),
    channel: "email",
    conversationId: "conv-create-integrity-email-1",
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
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("el branch de availability intermedio no persiste reservas y solo crea al confirmar explícitamente", async () => {
    (getGuest as any).mockResolvedValue({
      guestId: "g1",
      hotelId: "hotel999",
      name: "Geronimo",
      firstName: "Geronimo",
    });
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero reservar para el dia 01/5/2026 al 05/05/2026 para 2 personas, habitacion doble, a nombre de Ana Gomez"),
      { mode: "automatic", sendReply }
    );

    const emittedProposal = lastReply(sendReply);
    expect(emittedProposal).toMatch(/Geronimo,\s+tengo doble disponible para Ana Gomez/i);
    expect(emittedProposal).toMatch(/Check-in: 01\/05\/2026/i);
    expect(emittedProposal).toMatch(/Check-out: 05\/05\/2026/i);
    expect(emittedProposal).toMatch(/Huéspedes: 2 huéspedes/i);
    expect(emittedProposal).toMatch(/CONFIRMAR/i);
    expect(emittedProposal).not.toMatch(/Anot[eé] nuevas fechas/i);
    expect(currentState?.lastProposal?.text).toBe(emittedProposal);
    expect(currentState?.lastProposal?.available).toBe(true);
    expect(currentState?.reservationSlots).toMatchObject({
      guestName: "Ana Gomez",
      roomType: "double",
      checkIn: "2026-05-01",
      checkOut: "2026-05-05",
      numGuests: "2",
    });
    expect(currentState).toMatchObject({
      salesStage: "quote",
      desiredAction: "create",
      activeFlow: "reservation",
      conversationStage: "reservation_quoted",
      conversationFocus: { domain: "reservation", subFlow: "create", active: true },
      activeReservationContext: { kind: "draft", phase: "quoted" },
    });
    expect(currentState?.lastReservation).toBeUndefined();
    expect(currentState?.reservationHistory).toBeUndefined();
    expect(runAvailabilityCheck).toHaveBeenCalledTimes(1);

    await handleIncomingMessage(msg("sí"), { mode: "automatic", sendReply });

    expect(lastReply(sendReply)).toMatch(/propuesta lista|respond[eé]\s+\*\*confirmar\*\*/i);
    expect(confirmAndCreate).not.toHaveBeenCalled();
    expect(runAvailabilityCheck).toHaveBeenCalledTimes(1);
    expect(currentState?.lastReservation).toBeUndefined();
    expect(currentState?.reservationHistory).toBeUndefined();

    await handleIncomingMessage(msg("confirmar"), { mode: "automatic", sendReply });

    expect(confirmAndCreate).toHaveBeenCalledTimes(1);
    expect(runAvailabilityCheck).toHaveBeenCalledTimes(1);
    expect(lastReply(sendReply)).toMatch(/reserva confirmada para|reserva a nombre de/i);
    expect(lastReply(sendReply)).toMatch(/ana gomez/i);
    expect(lastReply(sendReply)).not.toMatch(/gracias,\s*ana/i);
    expect(lastReply(sendReply)).not.toMatch(/^ana,/i);
    expect(currentState?.reservationHistory).toHaveLength(1);
    expect(currentState?.lastReservation).toMatchObject({
      reservationId: "R-NEW-01",
      status: "created",
      checkIn: "2026-05-01",
      checkOut: "2026-05-05",
      roomType: "double",
      numGuests: 2,
      guestName: "Ana Gomez",
    });

    await handleIncomingMessage(msg("mostrame mis reservas"), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/R-NEW-01/);
    expect(replyText).not.toMatch(/sin fecha → sin fecha/i);
  });

  it("create incremental usa vocativo desde guest canónico y conserva el titular transaccional", async () => {
    (getGuest as any).mockResolvedValue({
      guestId: "g1",
      hotelId: "hotel999",
      name: "Geronimo",
      firstName: "Geronimo",
    });
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("quiero hacer una reserva"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("doble"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("6/5/2026 al 7/5/2026"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("2"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("Marcelo Martinez"), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/^Geronimo,\s+tengo doble disponible para Marcelo Martinez\./i);
    expect(replyText).toMatch(/¿Confirmás la reserva\?/i);
    expect(replyText).not.toMatch(/^Marcelo,\s+tengo/i);
  });

  it.each([
    "a nombre de Martin Pereira",
    "A nombre de Martin Pereira",
    "Martin Pereira",
  ])("preserva el guestName canónico de la propuesta al create confirmado: %s", async (holderInput) => {
    (getGuest as any).mockResolvedValue({
      guestId: "g1",
      hotelId: "hotel999",
      name: "Jose",
      firstName: "Jose",
    });
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("Quiero reservar una habitacion doble"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("para el 25/11/2026 al 27/11/2026"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("2 personas"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg(holderInput), { mode: "automatic", sendReply });

    const proposal = lastReply(sendReply);
    expect(proposal).toMatch(/^Jose,\s+tengo doble disponible para Martin Pereira\./i);
    expect(proposal).toMatch(/¿Confirmás la reserva\?/i);
    const proposalGuestName = currentState?.reservationSlots?.guestName;
    expect(proposalGuestName).toBe("Martin Pereira");

    await handleIncomingMessage(msg("confirmar"), { mode: "automatic", sendReply });

    expect(confirmAndCreate).toHaveBeenCalledTimes(1);
    const createPayload = (confirmAndCreate as any).mock.calls.at(-1)?.[1] || {};
    expect(createPayload.guestName).toBe(proposalGuestName);
    expect(lastReply(sendReply)).toMatch(/Reserva a nombre de \*\*Martin Pereira\*\*/i);
    expect(lastReply(sendReply)).not.toMatch(/Reserva a nombre de \*\*a nombre de Martin Pereira\*\*/i);
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

  it("en email rechaza checkOut explícito en pasado, conserva numGuests y no cotiza con un rango incoherente", async () => {
    vi.setSystemTime(new Date("2026-05-26T12:00:00.000Z"));
    const sendReply = vi.fn(async () => {});

    currentState = {
      reservationSlots: {
        roomType: "double",
        guestName: "Ana Gomez",
        checkIn: "2026-05-24",
      },
      salesStage: "qualify",
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
      lastCategory: "reservation",
    };

    await handleIncomingMessage(msgEmail("check out 25/5/2026, 2 personas"), { mode: "automatic", sendReply });

    const invalidReply = lastReply(sendReply);
    expect(invalidReply).not.toMatch(/tarifa por noche|confirm[aá]s la reserva|respond[eé]\s+[“"]?confirmar/i);
    expect(invalidReply).toMatch(/check-?out|fecha de check-out/i);
    expect(invalidReply).not.toMatch(/ya pas[oó].*check-?in|nueva fecha de check-?in/i);
    expect(currentState?.reservationSlots).toMatchObject({
      roomType: "double",
      guestName: "Ana Gomez",
    });
    expect(currentState?.reservationSlots?.checkOut).toBeUndefined();
    expect(confirmAndCreate).not.toHaveBeenCalled();
  });

  it("bloquea CONFIRMAR si el draft create quoted conserva un checkIn pasado", async () => {
    vi.setSystemTime(new Date("2026-05-26T12:00:00.000Z"));
    const sendReply = vi.fn(async () => {});

    currentState = {
      reservationSlots: {
        roomType: "double",
        guestName: "Ana Gomez",
        checkIn: "2026-05-24",
        checkOut: "2026-05-27",
        numGuests: "2",
      },
      lastProposal: {
        text: "Tengo doble disponible para Ana Gomez. Tarifa por noche: 100 USD. Total 3 noches: 300 USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.",
        available: true,
      },
      salesStage: "quote",
      conversationStage: "reservation_quoted",
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
        phase: "quoted",
        updatedAt: new Date().toISOString(),
      },
      lastCategory: "reservation",
    };

    await handleIncomingMessage(msgEmail("confirmar"), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/check-?in|fecha de check-in/i);
    expect(replyText).not.toMatch(/reserva confirmada|tarifa por noche/i);
    expect(confirmAndCreate).not.toHaveBeenCalled();
    expect(currentState?.reservationSlots).toMatchObject({
      roomType: "double",
      guestName: "Ana Gomez",
      numGuests: "2",
    });
    expect(currentState?.reservationSlots?.checkIn).toBeUndefined();
    expect(currentState?.reservationSlots?.checkOut).toBeUndefined();
  });

  it("si create espera checkOut, un 'check out' explícito inválido repregunta checkOut y no checkIn", async () => {
    vi.setSystemTime(new Date("2026-05-29T12:00:00.000Z"));
    const sendReply = vi.fn(async () => {});

    currentState = {
      reservationSlots: {
        roomType: "double",
        guestName: "Ana Gomez",
        checkIn: "2026-05-30",
      },
      salesStage: "qualify",
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
      lastCategory: "reservation",
    };

    await handleIncomingMessage(msg("check out 25/5/2026, 2 personas"), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/check-?out|fecha de check-out/i);
    expect(replyText).not.toMatch(/ya pas[oó].*check-?in|nueva fecha de check-?in/i);
    expect(replyText).not.toMatch(/tarifa por noche|confirm[aá]s la reserva|respond[eé]\s+[“"]?confirmar/i);
    expect(currentState?.reservationSlots).toMatchObject({
      roomType: "double",
      guestName: "Ana Gomez",
      checkIn: "2026-05-30",
    });
    expect(currentState?.reservationSlots?.checkOut).toBeUndefined();
    expect(confirmAndCreate).not.toHaveBeenCalled();
  });

  it("cuando create completa el draft tras reparación temporal, cotiza y no vuelve a pedir fechas", async () => {
    vi.setSystemTime(new Date("2026-06-03T12:00:00.000Z"));
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("Quiero hacer una reserva"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("una doble"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("Ana Gomez, check in 24/5/2026"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("05/06/2026"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("check out 25/5/2026, 2 personas"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("05/05/2026"), { mode: "automatic", sendReply });

    const invalidRetryReply = lastReply(sendReply);
    expect(invalidRetryReply).not.toMatch(/tarifa por noche|confirm[aá]s la reserva|CONFIRMAR/i);

    await handleIncomingMessage(msg("06/06/2026"), { mode: "automatic", sendReply });

    const finalReply = lastReply(sendReply);
    expect(finalReply).toMatch(/tarifa por noche|confirm[aá]s la reserva|disponible/i);
    expect(finalReply).not.toMatch(/fecha de check-?in|nueva fecha de check-?in/i);
    expect(finalReply).not.toMatch(/fecha de check-?out|nueva fecha de check-?out/i);
    expect(finalReply).not.toMatch(/anot[eé] nuevas fechas|posibles diferencias/i);
    expect(finalReply).not.toMatch(/reserva confirmada/i);
    expect(currentState?.lastProposal?.available).toBe(true);
    expect(currentState?.reservationSlots).toMatchObject({
      roomType: "double",
      guestName: "Ana Gomez",
      checkIn: "2026-06-05",
      checkOut: "2026-06-06",
      numGuests: "2",
    });
    expect(confirmAndCreate).not.toHaveBeenCalled();
  });

});
