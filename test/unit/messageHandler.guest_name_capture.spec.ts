import { beforeEach, describe, expect, it, vi } from "vitest";
import { futureReservationDateRange } from "../utils/reservationDates";

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
      const guestName = String(pre?.guest?.firstName || pre?.guest?.name || "").trim();
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

function msg(content: string, overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  } as any;
}

function lastReply(sendReply: any): string {
  return String(sendReply.mock.calls.at(-1)?.[0] || "");
}

function futureBookingText(daysFromToday = 60, nights = 2) {
  const range = futureReservationDateRange(daysFromToday, nights);
  return {
    ...range,
    checkInOutText: `check-in ${range.checkInText}, check-out ${range.checkOutText}`,
    delAlText: `del ${range.rangeText}`,
  };
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

  it("usa Encantada cuando acknowledgementLabel está configurado", async () => {
    hotelConfigRecord.assistantBranding = {
      displayName: "Vera",
      roleLabel: "la asistente hotelera digital",
      acknowledgementLabel: "Encantada",
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("hola"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("Marcelo"), { mode: "automatic", sendReply });

    expect(lastReply(sendReply)).toBe("Encantada, Marcelo. ¿En qué puedo ayudarte hoy?");
  });

  it("usa Un gusto cuando acknowledgementLabel está configurado", async () => {
    hotelConfigRecord.assistantBranding = {
      displayName: "BegaIA",
      roleLabel: "el agente digital",
      acknowledgementLabel: "Un gusto",
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("hola"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("Marcelo"), { mode: "automatic", sendReply });

    expect(lastReply(sendReply)).toBe("Un gusto, Marcelo. ¿En qué puedo ayudarte hoy?");
  });

  it("sin assistantBranding el acknowledgement vuelve al fallback Encantado", async () => {
    hotelConfigRecord.assistantBranding = null;
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("hola"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("Marcelo"), { mode: "automatic", sendReply });

    expect(lastReply(sendReply)).toBe("Encantado, Marcelo. ¿En qué puedo ayudarte hoy?");
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

  it("la correccion explicita de identidad domina sobre routing de reserva y actualiza el guest canonico", async () => {
    guestRecord = {
      guestId: "g1",
      hotelId: "hotel999",
      name: "Ose",
      firstName: "Ose",
      aliases: ["whatsapp:+59891359375"],
    };
    currentState = {
      reservationSlots: { guestName: "Ana Rodríguez", roomType: "double" },
      lastProposal: { guestName: "Ana Rodríguez", proposalId: "P-1" },
      activeFlow: "reservation",
      desiredAction: "create",
    };
    const sendReply = vi.fn(async () => {});
    const { runAvailabilityCheck } = await import("@/lib/handlers/pipeline/availability");

    await handleIncomingMessage(msg("Me equivoqué en el nombre, mi nombre es Jose"), { mode: "automatic", sendReply });

    expect(lastReply(sendReply)).toBe("Perfecto, Jose. Corregí tu nombre. ¿En qué puedo ayudarte?");
    expect(guestRecord).toMatchObject({ guestId: "g1", name: "Jose", firstName: "Jose", aliases: ["whatsapp:+59891359375"] });
    expect(currentState).toMatchObject({
      reservationSlots: { guestName: "Ana Rodríguez", roomType: "double" },
      lastProposal: { guestName: "Ana Rodríguez", proposalId: "P-1" },
      activeFlow: "reservation",
      desiredAction: "create",
    });
    expect(runAvailabilityCheck).not.toHaveBeenCalled();
  });

  it.each([
    "Mi nombre no es Ose, es Jose",
    "Perdón, soy Jose",
    "Perdón, me llamo Jose",
    "Me llamo Jose, no Ose",
    "Quiero corregir mi nombre, es Jose",
    "El nombre está mal, soy Jose",
  ])("captura la variante correctiva de identidad: %s", async (content) => {
    guestRecord = { guestId: "g1", hotelId: "hotel999", name: "Ose", firstName: "Ose", aliases: ["web:guest"] };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg(content), { mode: "automatic", sendReply });

    expect(guestRecord).toMatchObject({ guestId: "g1", name: "Jose", firstName: "Jose", aliases: ["web:guest"] });
    expect(lastReply(sendReply)).toMatch(/^Perfecto, Jose\. Corregí tu nombre\./);
  });

  it("corrige identidad sin modificar el titular de una reserva confirmada ni abrir modify", async () => {
    guestRecord = { guestId: "g1", hotelId: "hotel999", name: "Ose", firstName: "Ose" };
    currentState = {
      reservationSlots: { guestName: "Ana Rodríguez", roomType: "double" },
      lastReservation: { reservationId: "R-1", guestName: "Ana Rodríguez" },
      salesStage: "close",
      conversationStage: "reservation_confirmed",
      modifyState: null,
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("Perdón, mi nombre es Jose"), { mode: "automatic", sendReply });

    expect(guestRecord).toMatchObject({ name: "Jose", firstName: "Jose" });
    expect(currentState.lastReservation.guestName).toBe("Ana Rodríguez");
    expect(currentState.reservationSlots.guestName).toBe("Ana Rodríguez");
    expect(currentState.modifyState).toBeNull();
    expect(lastReply(sendReply)).not.toMatch(/modificar|fechas|habitaci[oó]n|hu[eé]spedes/i);
  });

  it.each([
    "la reserva es a nombre de Ana",
    "quiero poner la reserva a nombre de Ana",
    "quiero cambiar el titular a Ana",
    "la habitación está a nombre de Ana",
    "quiero reservar a nombre de Ana Rodríguez",
    "¿Cuál es el nombre del hotel?",
  ])("no confunde holder o pregunta semantica con correccion de identidad: %s", async (content) => {
    guestRecord = { guestId: "g1", hotelId: "hotel999", name: "Ose", firstName: "Ose" };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg(content), { mode: "automatic", sendReply });

    expect(guestRecord).toMatchObject({ name: "Ose", firstName: "Ose" });
    expect(lastReply(sendReply)).not.toMatch(/Corregí tu nombre/i);
  });

  it("mantiene captura inicial e inline existente y usa el vocativo corregido despues", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("hola"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("ose"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("Me equivoque en el nombre, mi nombre es Jose"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("hola"), { mode: "automatic", sendReply });

    expect(guestRecord).toMatchObject({ name: "Jose", firstName: "Jose" });
    expect(lastReply(sendReply)).toBe("Hola, Jose. ¿En qué puedo ayudarte hoy?");
  });

  it("si rechaza dar nombre no insiste y no bloquea el flujo", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("hola"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("prefiero no decirlo"), { mode: "automatic", sendReply });

    expect(lastReply(sendReply)).toBe("No hay problema. ¿En qué puedo ayudarte hoy?");
    expect(guestRecord?.name || "").toBe("");
  });

  it("saludo + captura + create explícito completo domina sobre verify y conserva vocativo + titular", async () => {
    const dates = futureBookingText(60, 2);
    hotelConfigRecord.assistantBranding = {
      displayName: "Vera",
      roleLabel: "la asistente hotelera digital",
      acknowledgementLabel: "Encantada",
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("hola"), { mode: "automatic", sendReply });
    expect(lastReply(sendReply)).toBe("Hola, soy Vera, la asistente hotelera digital de Hotel Demo. ¿Cómo preferís que te llame?");
    await handleIncomingMessage(msg("Ana"), { mode: "automatic", sendReply });
    expect(lastReply(sendReply)).toBe("Encantada, Ana. ¿En qué puedo ayudarte hoy?");
    await handleIncomingMessage(
      msg(`quiero hacer una reserva para el dia ${dates.rangeText}, una triple, para 3 personas, a nombre de Raul Olivera`),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/^Ana,\s+tengo triple disponible para Raul Olivera\./i);
    expect(replyText).toMatch(/¿Confirmás la reserva\?/i);
    expect(replyText).not.toMatch(/c[oó]digo de reserva|corroborar tu reserva/i);
    expect(replyText).not.toMatch(/^Raul,\s+tengo/i);
  });

  it("saludo + captura + availability inquiry sigue como inquiry y no pide titular ni confirmación", async () => {
    const dates = futureBookingText(62, 2);
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("hola"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("Sofia"), { mode: "automatic", sendReply });
    await handleIncomingMessage(
      msg(`tiene disponible una doble para el dia ${dates.rangeText}`),
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

  it("captura actor inline 'soy' en web y separa display_name de guestName", async () => {
    const dates = futureBookingText(70, 2);
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg(`Hola, soy Martín P. Quisiera reservar una triple para tres personas, ${dates.checkInOutText}, a nombre de Ana Rodríguez.`),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/^Martín,\s+tengo triple disponible para Ana Rodríguez\./i);
    expect(replyText).not.toMatch(/¿Cómo preferís que te llame\?|a nombre de qui[eé]n/i);
    expect(guestRecord?.name).toBe("Martín P.");
    expect(guestRecord?.firstName).toBe("Martín");
    expect(currentState?.reservationSlots?.guestName).toBe("Ana Rodríguez");
  });

  it("captura actor inline de un solo nombre y lo persiste en el guest canónico visible para Admin", async () => {
    const dates = futureBookingText(72, 2);
    guestRecord = {
      guestId: "guest-canonical-1",
      hotelId: "hotel999",
      name: "",
      mode: "automatic",
      aliases: ["whatsapp:+59891359375"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg(
        `Hola, soy Martín. Quisiera reservar una triple ${dates.delAlText} para tres personas, a nombre de Ana Rodríguez.`,
        { channel: "whatsapp", guestId: "whatsapp:+59891359375", sender: "whatsapp:+59891359375", conversationId: "conv-inline-wa-canonical-es" }
      ),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/^Martín,\s+tengo triple disponible para Ana Rodríguez\./i);
    expect(guestRecord?.guestId).toBe("guest-canonical-1");
    expect(guestRecord?.name).toBe("Martín");
    expect(guestRecord?.firstName).toBe("Martín");
    expect(currentState?.reservationSlots?.guestName).toBe("Ana Rodríguez");
    expect(updateGuest).toHaveBeenCalledWith(
      "hotel999",
      "guest-canonical-1",
      expect.objectContaining({ name: "Martín", firstName: "Martín" })
    );
    expect(updateGuest).not.toHaveBeenCalledWith(
      "hotel999",
      "whatsapp:+59891359375",
      expect.objectContaining({ name: "Martín" })
    );
  });

  it("captura actor inline 'me llamo' en email sin handshake y preserva guestName", async () => {
    const dates = futureBookingText(74, 2);
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg(
        `Hola, me llamo Martín P. Quisiera reservar una triple para tres personas, ${dates.checkInOutText}, a nombre de Ana Rodríguez.`,
        { channel: "email", detectedLanguage: "es", conversationId: "conv-inline-email-es" }
      ),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/^Martín,\s+tengo triple disponible para Ana Rodríguez\./i);
    expect(replyText).not.toMatch(/¿Cómo preferís que te llame\?|a nombre de qui[eé]n/i);
    expect(guestRecord?.name).toBe("Martín P.");
    expect(currentState?.reservationSlots?.guestName).toBe("Ana Rodríguez");
  });

  it("captura actor inline en un body email multilinea y preserva guestName", async () => {
    const dates = futureBookingText(75, 2);
    const sendReply = vi.fn(async () => {});
    const { runAvailabilityCheck } = await import("@/lib/handlers/pipeline/availability");
    vi.mocked(runAvailabilityCheck).mockResolvedValueOnce({
      finalText: "Tengo triple disponible para Ana Rodríguez. Tarifa por noche: 130 USD. Total 2 noches: 260 USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.",
      nextSlots: {
        guestName: "Ana Rodríguez",
        roomType: "triple",
        checkIn: dates.checkInISO,
        checkOut: dates.checkOutISO,
        numGuests: "3",
      },
      needsHandoff: false,
    });

    await handleIncomingMessage(
      msg(
        `Hola, soy Martín P. Quisiera reservar una triple ${dates.delAlText} para\ntres personas, a nombre de Ana Rodríguez.`,
        { channel: "email", detectedLanguage: "es", conversationId: "conv-inline-email-multiline-es" }
      ),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/^Martín,\s+tengo triple disponible para Ana Rodríguez\./i);
    expect(replyText).not.toMatch(/^Ana,\s+tengo/i);
    expect(guestRecord?.name).toBe("Martín P.");
    expect(guestRecord?.firstName).toBe("Martín");
    expect(currentState?.reservationSlots?.guestName).toBe("Ana Rodríguez");
    expect(guestRecord?.name).not.toBe("Ana Rodríguez");
  });

  it("captura actor inline en email aunque el body llegue con prefijo estilo Gmail", async () => {
    const dates = futureBookingText(76, 2);
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg(
        `marcelomst123 jun 2026, 9:40 (hace 8 días)Hola, soy Martín P. Quisiera reservar una triple ${dates.delAlText} para\ntres personas, a nombre de Ana Rodríguez.`,
        { channel: "email", detectedLanguage: "es", conversationId: "conv-inline-email-gmail-noise-es" }
      ),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/^Martín,\s+tengo triple disponible para Ana Rodríguez\./i);
    expect(guestRecord?.name).toBe("Martín P.");
    expect(guestRecord?.firstName).toBe("Martín");
    expect(currentState?.reservationSlots?.guestName).toBe("Ana Rodríguez");
    expect(guestRecord?.name).not.toBe("Ana Rodríguez");
  });

  it("captura actor inline PT y guestName con 'em nome de' en web", async () => {
    const dates = futureBookingText(77, 2);
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg(
        `Meu nome é Martín P. Gostaria de reservar um quarto triplo para três pessoas, ${dates.checkInOutText}, em nome de Ana Rodríguez.`,
        { channel: "web", detectedLanguage: "pt", conversationId: "conv-inline-web-pt" }
      ),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/^Martín,\s+tengo triple disponible para Ana Rodríguez\./i);
    expect(replyText).not.toMatch(/como prefere que eu te chame|em nome de quem/i);
    expect(guestRecord?.name).toBe("Martín P.");
    expect(currentState?.reservationSlots?.guestName).toBe("Ana Rodríguez");
  });

  it("captura actor inline EN y guestName con 'under the name of' en whatsapp", async () => {
    const dates = futureBookingText(78, 2);
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg(
        `My name is Martin P. I would like to book a triple room for three people, ${dates.checkInOutText}, under the name of Ana Rodríguez.`,
        { channel: "whatsapp", detectedLanguage: "en", conversationId: "conv-inline-wa-en" }
      ),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/^Martin,\s+tengo triple disponible para Ana Rodríguez\./i);
    expect(replyText).not.toMatch(/what should i call you|what name should i use for the reservation/i);
    expect(guestRecord?.name).toBe("Martin P.");
    expect(currentState?.reservationSlots?.guestName).toBe("Ana Rodríguez");
  });

  it("no inventa display_name desde guestName cuando no hay autopresentación explícita", async () => {
    const dates = futureBookingText(80, 2);
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg(`Quisiera reservar una triple para tres personas, ${dates.checkInOutText}, a nombre de Ana Rodríguez.`),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/^Tengo triple disponible para Ana Rodríguez\./i);
    expect(replyText).not.toMatch(/^Ana,\s+tengo/i);
    expect(guestRecord?.name || "").toBe("");
    expect(currentState?.reservationSlots?.guestName).toBe("Ana Rodríguez");
  });

  it("después de confirmar no promociona guestName a display_name y conserva el actor conversacional", async () => {
    const dates = futureBookingText(82, 2);
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg(`Hola, soy Martín P. Quisiera reservar una triple para tres personas, ${dates.checkInOutText}, a nombre de Ana Rodríguez.`),
      { mode: "automatic", sendReply }
    );
    await handleIncomingMessage(msg("CONFIRMAR"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("Mostrame mis reservas"), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(guestRecord?.name).toBe("Martín P.");
    expect(replyText).toMatch(/^Martín,\s+estas son (?:tus reservas|las reservas de esta conversación):/i);
    expect(replyText).toMatch(/a nombre de Ana Rodríguez/i);
    expect(replyText).not.toMatch(/^Ana,\s+/i);
  });

  it("con proposal activa, pedir cambio de titular sin valor sigue en draft y pregunta por el nuevo titular", async () => {
    const dates = futureBookingText(84, 2);
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg(`Hola, soy Martín P. Quisiera reservar una triple para tres personas, ${dates.checkInOutText}, a nombre de Ana Revetria.`),
      { mode: "automatic", sendReply }
    );
    await handleIncomingMessage(msg("quiero cambiar el titular"), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/a nombre de qui[eé]n/i);
    expect(replyText).not.toMatch(/podemos modificar tu reserva confirmada|ok, vamos a modificar esta reserva/i);
    expect(currentState?.reservationSlots?.guestName).toBe("Ana Revetria");
    expect(currentState?.activeReservationContext).toMatchObject({ kind: "draft" });
    expect(currentState?.activeFlow).toBe("reservation");
    expect(currentState?.desiredAction).toBe("create");
    expect(guestRecord?.name).toBe("Martín P.");
    expect(guestRecord?.firstName).toBe("Martín");
  });

  it("captura el nuevo titular en el turno siguiente sin tocar la identidad del interlocutor", async () => {
    const dates = futureBookingText(86, 2);
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg(`Hola, soy Martín P. Quisiera reservar una triple para tres personas, ${dates.checkInOutText}, a nombre de Ana Revetria.`),
      { mode: "automatic", sendReply }
    );
    await handleIncomingMessage(msg("quiero cambiar el titular"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("Laura Gómez"), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(currentState?.reservationSlots?.guestName).toBe("Laura Gómez");
    expect(guestRecord?.name).toBe("Martín P.");
    expect(guestRecord?.firstName).toBe("Martín");
    expect(guestRecord?.guestId).toBe("g1");
    expect(replyText).toMatch(/^Mart[ií]n,\s+tengo triple disponible para Laura Gómez\./i);
    expect(replyText).not.toMatch(/¿a nombre de qui[eé]n/i);
  });

  it("acepta cambio inline del titular en draft quoted y preserva guestId y aliases", async () => {
    const dates = futureBookingText(88, 2);
    guestRecord = {
      guestId: "guest-canonical-1",
      hotelId: "hotel999",
      name: "Martín P.",
      firstName: "Martín",
      aliases: ["whatsapp:+59891359375", "email:martin@example.com"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg(
        `Quisiera reservar una triple para tres personas, ${dates.checkInOutText}, a nombre de Ana Revetria.`,
        { guestId: "guest-canonical-1", conversationId: "conv-holder-inline-1" }
      ),
      { mode: "automatic", sendReply }
    );
    await handleIncomingMessage(
      msg("quiero poner la reserva a nombre de Laura Gómez", { guestId: "guest-canonical-1", conversationId: "conv-holder-inline-1" }),
      { mode: "automatic", sendReply }
    );

    const replyText = lastReply(sendReply);
    expect(currentState?.reservationSlots?.guestName).toBe("Laura Gómez");
    expect(guestRecord?.guestId).toBe("guest-canonical-1");
    expect(guestRecord?.aliases).toEqual(["whatsapp:+59891359375", "email:martin@example.com"]);
    expect(guestRecord?.name).toBe("Martín P.");
    expect(replyText).toMatch(/^Mart[ií]n,\s+tengo triple disponible para Laura Gómez\./i);
    expect(replyText).not.toMatch(/a nombre de qui[eé]n/i);
  });

  it("rechaza follow-up metalingüístico y no convierte 'el nombre' en titular del draft", async () => {
    const dates = futureBookingText(90, 2);
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg(`Hola, soy Martín P. Quisiera reservar una triple para tres personas, ${dates.checkInOutText}, a nombre de Ana Revetria.`),
      { mode: "automatic", sendReply }
    );
    await handleIncomingMessage(msg("quiero cambiar el nombre"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("el nombre"), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/a nombre de qui[eé]n/i);
    expect(currentState?.reservationSlots?.guestName).toBe("Ana Revetria");
    expect(replyText).not.toMatch(/El Nombre|para el nombre/i);
    expect(guestRecord?.name).toBe("Martín P.");
  });
});
