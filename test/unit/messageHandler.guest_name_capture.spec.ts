import { beforeEach, describe, expect, it, vi } from "vitest";

let currentState: any = null;
let guestRecord: any = null;
let hotelConfigRecord: any = null;
const storedMessages: any[] = [];

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
vi.mock("@/lib/handlers/pipeline/availability", async () => {
  const actual = await vi.importActual<typeof import("@/lib/handlers/pipeline/availability")>("@/lib/handlers/pipeline/availability");
  return {
    ...actual,
    runAvailabilityCheck: vi.fn(async (pre: any, slots: any, ciISO: string, coISO: string, options?: any) => {
      const holder = String(slots.guestName || "").trim();
      const guestName = String(pre?.guest?.name || "").trim();
      const vocative = guestName ? `${guestName}, ` : "";
      const nights = Math.max(1, Math.round((new Date(coISO).getTime() - new Date(ciISO).getTime()) / (24 * 60 * 60 * 1000)));
      const roomType = String(slots.roomType || "double").toLowerCase();
      const perNight = roomType === "triple" ? 130 : 100;
      const total = perNight * nights;
      const roomLabel = roomType === "triple" ? "triple" : "doble";
      if (options?.mode === "inquiry") {
        return {
          finalText: `${vocative}Tengo ${roomLabel} disponible. Tarifa por noche: ${perNight} USD.`,
          nextSlots: {
            ...slots,
            checkIn: ciISO,
            checkOut: coISO,
            roomType,
          },
          needsHandoff: false,
        };
      }
      return {
        finalText: `${vocative}Tengo ${roomLabel} disponible${holder ? ` para ${holder}` : ""}. Tarifa por noche: ${perNight} USD. Total ${nights} noche${nights === 1 ? "" : "s"}: ${total} USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.`,
        nextSlots: {
          ...slots,
          checkIn: ciISO,
          checkOut: coISO,
          roomType,
        },
        needsHandoff: false,
      };
    }),
  };
});
vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: vi.fn(async () => ({
      messages: [{ role: "assistant", content: "contenido generico" }],
      category: "retrieval_based",
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
  confirmAndCreate: vi.fn(async () => ({ ok: true, reservationId: "R-NEW-01", message: "ok" })),
  modifyReservation: vi.fn(async () => ({ ok: true, message: "ok" })),
}));
vi.mock("@/lib/prompts", () => ({
  defaultPrompt: "{{retrieved}}",
  curatedPrompts: {},
}));
vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(async () => hotelConfigRecord),
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
import { updateGuest } from "@/lib/db/guests";

function msg(content: string) {
  return {
    messageId: `m-${Math.random().toString(36).slice(2, 8)}`,
    hotelId: "hotel999",
    channel: "web",
    sender: "guest",
    content,
    timestamp: new Date().toISOString(),
    conversationId: "conv-guest-name-1",
    guestId: "g1",
    detectedLanguage: "es",
  } as any;
}

function lastReply(sendReply: any): string {
  return String(sendReply.mock.calls.at(-1)?.[0] || "");
}

describe("messageHandler guest conversational name capture", () => {
  beforeEach(() => {
    currentState = null;
    guestRecord = null;
    hotelConfigRecord = {
      hotelId: "hotel999",
      hotelName: "Hotel Demo",
      defaultLanguage: "es",
      timezone: "UTC",
      channelConfigs: {},
      users: [],
      lastUpdated: new Date().toISOString(),
      reservations: {},
    };
    storedMessages.length = 0;
    vi.clearAllMocks();
  });

  it("saludo sin branding mantiene fallback actual con hotelName", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("hola"), { mode: "automatic", sendReply });

    expect(lastReply(sendReply)).toBe("Hola, soy BegaIA, el asistente hotelero digital de Hotel Demo. ¿Cómo preferís que te llame?");
  });

  it("saludo con branding configurado usa assistantBranding del hotel", async () => {
    hotelConfigRecord.assistantBranding = {
      displayName: "Vera",
      roleLabel: "la asistente hotelera digital",
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("hola"), { mode: "automatic", sendReply });

    expect(lastReply(sendReply)).toBe("Hola, soy Vera, la asistente hotelera digital de Hotel Demo. ¿Cómo preferís que te llame?");
  });

  it("saludo sin hotelName usa fallback seguro del hotel", async () => {
    hotelConfigRecord.hotelName = undefined;
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("hola"), { mode: "automatic", sendReply });

    expect(lastReply(sendReply)).toBe("Hola, soy BegaIA, el asistente hotelero digital del hotel. ¿Cómo preferís que te llame?");
  });

  it("pide nombre en saludo inicial puro de guest nuevo y luego lo persiste", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("hola"), { mode: "automatic", sendReply });
    expect(lastReply(sendReply)).toBe("Hola, soy BegaIA, el asistente hotelero digital de Hotel Demo. ¿Cómo preferís que te llame?");

    await handleIncomingMessage(msg("Geronimo"), { mode: "automatic", sendReply });

    expect(lastReply(sendReply)).toBe("Encantado, Geronimo. ¿En qué puedo ayudarte hoy?");
    expect(guestRecord?.name).toBe("Geronimo");
    expect(guestRecord?.firstName).toBe("Geronimo");
    expect(updateGuest).toHaveBeenCalledWith("hotel999", "g1", expect.objectContaining({ name: "Geronimo" }));
  });

  it("guest conocido no vuelve a pedir nombre cuando saluda", async () => {
    guestRecord = {
      guestId: "g1",
      hotelId: "hotel999",
      name: "Geronimo",
      firstName: "Geronimo",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("hola"), { mode: "automatic", sendReply });

    expect(lastReply(sendReply)).toBe("Hola, Geronimo. ¿En qué puedo ayudarte hoy?");
  });

  it("si rechaza dar nombre no insiste y no bloquea el flujo", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("hola"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("prefiero no decirlo"), { mode: "automatic", sendReply });

    expect(lastReply(sendReply)).toBe("No hay problema. ¿En qué puedo ayudarte hoy?");
    expect(guestRecord?.name || "").toBe("");
  });

  it("saludo + captura + create explícito completo domina sobre verify y conserva vocativo + titular", async () => {
    hotelConfigRecord.assistantBranding = {
      displayName: "Vera",
      roleLabel: "la asistente hotelera digital",
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("hola"), { mode: "automatic", sendReply });
    expect(lastReply(sendReply)).toBe("Hola, soy Vera, la asistente hotelera digital de Hotel Demo. ¿Cómo preferís que te llame?");
    await handleIncomingMessage(msg("Ana"), { mode: "automatic", sendReply });
    await handleIncomingMessage(
      msg("quiero hacer una reserva para el dia 8/5/2026 al 10/5/2026, una triple, para 3 personas, a nombre de Raul Olivera"),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/^Ana,\s+tengo triple disponible para Raul Olivera\./i);
    expect(replyText).toMatch(/¿Confirmás la reserva\?/i);
    expect(replyText).not.toMatch(/c[oó]digo de reserva|corroborar tu reserva/i);
    expect(replyText).not.toMatch(/^Raul,\s+tengo/i);
  });

  it("saludo + captura + availability inquiry sigue como inquiry y no pide titular ni confirmación", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("hola"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("Sofia"), { mode: "automatic", sendReply });
    await handleIncomingMessage(
      msg("tiene disponible una doble para el dia 08/05/2026 al 10/05/2026"),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/^Sofia,\s+tengo doble disponible\./i);
    expect(replyText).not.toMatch(/a nombre de qui[eé]n|nombre y apellido/i);
    expect(replyText).not.toMatch(/confirm[aá]s la reserva|respond[eé]\s+[“"]?confirmar/i);
  });

  it("saludo + captura + availability inquiry con typo conserva inquiry y no pide titular", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("hola"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("Marcelo"), { mode: "automatic", sendReply });
    await handleIncomingMessage(
      msg("tiene diponible una doble para este fin de semana"),
      { mode: "automatic", sendReply }
    );

    const firstReply = lastReply(sendReply);
    if (/cu[aá]ntos hu[eé]spedes/i.test(firstReply)) {
      await handleIncomingMessage(msg("2"), { mode: "automatic", sendReply });
    }

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/^Marcelo,\s+tengo doble disponible\./i);
    expect(replyText).not.toMatch(/a nombre de qui[eé]n|nombre y apellido/i);
    expect(replyText).not.toMatch(/confirm[aá]s la reserva|respond[eé]\s+[“"]?confirmar/i);
  });
});
