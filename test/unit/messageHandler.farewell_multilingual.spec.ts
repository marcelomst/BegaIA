import { beforeEach, describe, expect, it, vi } from "vitest";

let currentState: any = null;
let guestRecord: any = null;
const storedMessages: any[] = [];

const { agentInvoke, getHotelConfigMock, runAvailabilityCheckMock, cancelReservationMock } = vi.hoisted(() => ({
  agentInvoke: vi.fn(async () => ({
    messages: [{ role: "assistant", content: "Respuesta base" }],
    category: "reservation",
    meta: {},
  })),
  getHotelConfigMock: vi.fn(async () => ({
    hotelId: "hotel999",
    hotelName: "Hotel Demo",
    defaultLanguage: "es",
    assistantBranding: { displayName: "Vera" },
    channelConfigs: {},
  })),
  runAvailabilityCheckMock: vi.fn(async () => ({
    finalText: "Tengo doble disponible. Tarifa por noche: 100 USD.",
    nextSlots: {},
    needsHandoff: false,
  })),
  cancelReservationMock: vi.fn(async () => ({
    ok: true,
    message: "✅ Reserva cancelada.",
  })),
}));

vi.mock("@/lib/db/messages", () => ({
  saveChannelMessageToAstra: vi.fn(async (msg: any) => {
    storedMessages.push({ ...msg });
  }),
  getMessagesByConversation: vi.fn(async ({ hotelId, conversationId }: any) =>
    storedMessages.filter((msg) => msg.hotelId === hotelId && msg.conversationId === conversationId)
  ),
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
vi.mock("@/lib/agents/stateUpdaterAgent", () => ({
  updateConversationState: vi.fn(async (_hotelId: string, _conversationId: string, patch: any) => {
    currentState = { ...(currentState || {}), ...patch };
  }),
}));
vi.mock("@/lib/handlers/pipeline/availability", async () => {
  const actual = await vi.importActual<typeof import("@/lib/handlers/pipeline/availability")>("@/lib/handlers/pipeline/availability");
  return {
    ...actual,
    runAvailabilityCheck: runAvailabilityCheckMock,
  };
});
vi.mock("@/lib/agents/reservations", () => ({
  confirmAndCreate: vi.fn(async () => ({ ok: true, reservationId: "RES-FAREWELL-1", message: "ok" })),
  modifyReservation: vi.fn(async () => ({ ok: true, message: "ok" })),
  cancelReservation: cancelReservationMock,
}));
vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: agentInvoke,
  },
}));
vi.mock("@/lib/prompts", () => ({
  defaultPrompt: "{{retrieved}}",
  curatedPrompts: {},
}));
vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: getHotelConfigMock,
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
import { agentGraph } from "@/lib/agents";
import { runAvailabilityCheck } from "@/lib/handlers/pipeline/availability";
import { cancelReservation } from "@/lib/agents/reservations";

function msg(content: string, overrides: Record<string, unknown> = {}) {
  return {
    messageId: `m-${Math.random().toString(36).slice(2, 8)}`,
    hotelId: "hotel999",
    channel: "web",
    sender: "guest",
    content,
    timestamp: new Date().toISOString(),
    conversationId: "conv-farewell-1",
    guestId: "g1",
    detectedLanguage: "es",
    ...overrides,
  } as any;
}

function lastReply(sendReply: any): string {
  return String(sendReply.mock.calls.at(-1)?.[0] || "");
}

function seedGuest(name = "Carlos") {
  guestRecord = {
    guestId: "g1",
    hotelId: "hotel999",
    name,
    firstName: name.split(/\s+/)[0],
    mode: "automatic",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function seedReservationState(overrides: Record<string, unknown> = {}) {
  currentState = {
    hotelId: "hotel999",
    conversationId: "conv-farewell-1",
    reservationSlots: {
      guestName: "Laura Gómez",
      roomType: "double",
      checkIn: "2027-08-14",
      checkOut: "2027-08-16",
      numGuests: "2",
    },
    salesStage: "close",
    conversationStage: "reservation_confirmed",
    lastReservation: {
      reservationId: "RES-FAREWELL-OLD",
      status: "updated",
      guestName: "Laura Gómez",
      roomType: "double",
      checkIn: "2027-08-14",
      checkOut: "2027-08-16",
      numGuests: "2",
    },
    ...overrides,
  };
}

function seedHistoryMessage(content: string, overrides: Record<string, unknown> = {}) {
  storedMessages.push({
    messageId: `history-${storedMessages.length + 1}`,
    hotelId: "hotel999",
    channel: "web",
    conversationId: "conv-farewell-1",
    guestId: "g1",
    role: "user",
    sender: "guest",
    direction: "in",
    content,
    timestamp: new Date(Date.now() - 60_000).toISOString(),
    ...overrides,
  });
}

describe("messageHandler conversational farewell multilingual", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentState = null;
    guestRecord = null;
    storedMessages.length = 0;
    getHotelConfigMock.mockResolvedValue({
      hotelId: "hotel999",
      hotelName: "Hotel Demo",
      defaultLanguage: "es",
      assistantBranding: { displayName: "Vera" },
      channelConfigs: {},
    });
  });

  it("despedida después de modify confirmado no reabre modificación", async () => {
    seedGuest("Carlos");
    seedReservationState({
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
      conversationFocus: {
        domain: "reservation",
        subFlow: "modify",
        active: true,
        updatedAt: new Date().toISOString(),
      },
    });
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("chau"), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(replyText).toContain("¡Hasta pronto, Carlos!");
    expect(replyText).toContain("voy a estar acá para acompañarte");
    expect(replyText).not.toContain("Vera");
    expect(replyText).not.toMatch(/modificar|qu[eé] quer[eé]s cambiar|c[oó]digo de reserva/i);
    expect(agentGraph.invoke).not.toHaveBeenCalled();
    expect(runAvailabilityCheck).not.toHaveBeenCalled();
  });

  it("create activo + despedida no continúa create", async () => {
    seedGuest("Martin");
    seedHistoryMessage("Hello, my name is Martin. I would like to make a reservation.", {
      detectedLanguage: "en",
    });
    seedReservationState({
      salesStage: "quote",
      conversationStage: "reservation_draft",
      activeFlow: "reservation",
      desiredAction: "create",
      lastCategory: "reservation",
    });
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("BYE!", { detectedLanguage: "en" }), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(replyText).toContain("See you soon, Martin!");
    expect(replyText).toContain("I'll be here for you");
    expect(replyText).not.toContain("Vera");
    expect(replyText).not.toMatch(/check-in|check-out|room|guest|confirm/i);
    expect(agentGraph.invoke).not.toHaveBeenCalled();
    expect(runAvailabilityCheck).not.toHaveBeenCalled();
  });

  it("conversación en español + 'good by' mantiene farewell en español", async () => {
    seedGuest("Oscar");
    seedHistoryMessage("Hola soy Oscar, quiero hacer una reserva.", {
      detectedLanguage: "es",
    });
    seedReservationState({
      activeFlow: "reservation",
      desiredAction: "create",
      lastCategory: "reservation",
    });
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("good by", { detectedLanguage: "en" }), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(replyText).toContain("¡Hasta pronto, Oscar!");
    expect(replyText).toContain("voy a estar acá para acompañarte");
    expect(replyText).not.toMatch(/sigo con tu reserva|reservation|booking|confirm|modify|cancel/i);
    expect(agentGraph.invoke).not.toHaveBeenCalled();
    expect(runAvailabilityCheck).not.toHaveBeenCalled();
  });

  it("conversación en inglés + 'goodbye' responde farewell en inglés", async () => {
    seedGuest("John");
    seedHistoryMessage("My name is John, I would like to make a reservation for August 15th to August 18th, a double room, for two people, under the name of Peter Sailor.", {
      detectedLanguage: "en",
    });
    seedHistoryMessage("John, tengo doble disponible para Peter Sailor. Tarifa por noche: 100 USD. Total 3 noches: 300 USD. ¿Confirmás la reserva? Respondé “CONFIRMAR”.", {
      role: "ai",
      sender: "assistant",
      direction: "out",
      detectedLanguage: "es",
    });
    seedHistoryMessage("confirmar", {
      detectedLanguage: "es",
    });
    seedHistoryMessage("✅ ¡Reserva confirmada! Código RES-FAREWELL.", {
      role: "ai",
      sender: "assistant",
      direction: "out",
      detectedLanguage: "es",
    });
    seedReservationState({
      activeFlow: "reservation",
      desiredAction: "create",
      lastCategory: "reservation",
      reservationSlots: {
        guestName: "Peter Sailor",
        roomType: "double",
        checkIn: "2026-08-15",
        checkOut: "2026-08-18",
        numGuests: "2",
        locale: "es",
      },
    });
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("goodbye", { detectedLanguage: "es" }), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(replyText).toContain("See you soon, John!");
    expect(replyText).toContain("I'll be here for you");
    expect(replyText).not.toContain("¡Hasta pronto");
    expect(replyText).not.toContain("Peter Sailor");
    expect(replyText).not.toMatch(/sigo con tu reserva|Perfecto, sigo/i);
    expect(agentGraph.invoke).not.toHaveBeenCalled();
    expect(runAvailabilityCheck).not.toHaveBeenCalled();
  });

  it("conversación en portugués + 'tchau' responde farewell en portugués", async () => {
    seedGuest("João");
    seedHistoryMessage("Olá, me chamo João. Gostaria de fazer uma reserva.", {
      detectedLanguage: "pt",
    });
    seedReservationState({
      activeFlow: "reservation",
      desiredAction: "create",
      lastCategory: "reservation",
    });
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("tchau", { detectedLanguage: "es" }), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(replyText).toContain("Até breve, João!");
    expect(replyText).toContain("estarei aqui para acompanhar você");
    expect(replyText).not.toContain("¡Hasta pronto");
    expect(agentGraph.invoke).not.toHaveBeenCalled();
    expect(runAvailabilityCheck).not.toHaveBeenCalled();
  });

  it("cancel pendiente + despedida no cancela reserva", async () => {
    seedGuest("João");
    seedHistoryMessage("Olá, me chamo João. Gostaria de fazer uma reserva.", {
      detectedLanguage: "pt",
    });
    seedReservationState({
      pendingCancellation: {
        reservationId: "RES-CANCEL-1",
        awaitingConfirmation: true,
      },
      activeFlow: "cancel_reservation",
      desiredAction: "cancel",
      lastCategory: "cancel_reservation",
    });
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("Até breve.", { detectedLanguage: "pt" }), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(replyText).toContain("Até breve, João!");
    expect(replyText).toContain("estarei aqui para acompanhar você");
    expect(replyText).not.toContain("Vera");
    expect(replyText).not.toMatch(/cancelad|confirmar|reserva/i);
    expect(cancelReservation).not.toHaveBeenCalled();
  });

  it.each([
    ["web", "¡ADIÓS!"],
    ["email", "hasta pronto."],
    ["whatsapp", "Nos vemos!"],
  ] as const)("usa el guest conversacional como vocativo en %s y no el guestName transaccional", async (channel, content) => {
    seedGuest("Carlos");
    seedReservationState();
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg(content, {
        channel,
        conversationId: `conv-farewell-${channel}`,
      }),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toContain("¡Hasta pronto, Carlos!");
    expect(replyText).not.toContain("Laura");
    expect(agentGraph.invoke).not.toHaveBeenCalled();
  });

  it.each([
    ["es", "goodbye", "¡Hasta pronto! Fue un gusto ayudarte. Cuando quieras volver a consultar o planificar tu estadía, voy a estar acá para acompañarte."],
    ["en", "chau", "See you soon! It was a pleasure helping you. Whenever you want to ask something else or plan your stay, I'll be here for you."],
    ["pt", "bye", "Até breve! Foi um prazer ajudar. Quando quiser fazer outra consulta ou planejar sua estadia, estarei aqui para acompanhar você."],
  ] as const)("sin idioma conversacional resuelto usa hotel.defaultLanguage=%s", async (defaultLanguage, content, expected) => {
    guestRecord = null;
    currentState = null;
    getHotelConfigMock.mockResolvedValue({
      hotelId: "hotel999",
      hotelName: "Hotel Demo",
      defaultLanguage,
      assistantBranding: { displayName: "Vera" },
      channelConfigs: {},
    });
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg(content, {
        detectedLanguage: "en",
        conversationId: `conv-farewell-no-name-${defaultLanguage}`,
        guestId: `guest-no-name-${defaultLanguage}`,
      }),
      { mode: "automatic", sendReply }
    );

    expect(lastReply(sendReply)).toBe(expected);
    expect(lastReply(sendReply)).not.toContain("Vera");
    expect(agentGraph.invoke).not.toHaveBeenCalled();
  });
});
