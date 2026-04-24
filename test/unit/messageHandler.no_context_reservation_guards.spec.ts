import { beforeEach, describe, expect, it, vi } from "vitest";

let currentState: any = null;

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
  resolveGuestState: vi.fn(() => undefined),
}));
vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: vi.fn(async (input: any) => {
      const text = String(input?.normalizedMessage || "");
      if (/^marcelo martinez$/i.test(text)) {
        return {
          messages: [{
            role: "assistant",
            content: "Marcelo, tengo doble disponible. Tarifa por noche: 100 USD. Total 4 noches: 400 USD.\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”.",
          }],
          category: "reservation",
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
vi.mock("@/lib/agents/reservations", () => ({
  confirmAndCreate: vi.fn(async () => ({
    ok: true,
    reservationId: "R-NEW-01",
    message: "✅ Reserva creada. ID: R-NEW-01",
  })),
}));
vi.mock("@/lib/agents/stateUpdaterAgent", () => ({
  updateConversationState: vi.fn(async (_hotelId: string, _conversationId: string, patch: any) => {
    currentState = { ...(currentState || {}), ...patch };
  }),
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

function msg(content: string) {
  return {
    messageId: `m-${Math.random().toString(36).slice(2, 8)}`,
    hotelId: "hotel999",
    channel: "web",
    sender: "guest",
    content,
    timestamp: new Date().toISOString(),
    conversationId: "conv-no-context-1",
    guestId: "g1",
    detectedLanguage: "es",
  } as any;
}

describe("messageHandler guards sin contexto de reserva", () => {
  beforeEach(() => {
    currentState = null;
    vi.clearAllMocks();
  });

  it("mi reserva sin contexto no inventa reserva activa", async () => {
    const sendReply = vi.fn(async () => {});
    await handleIncomingMessage(msg("mi reserva"), { mode: "automatic", sendReply });
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/no encuentro una reserva activa|booking code|c[oó]digo de reserva/i);
    expect(replyText).not.toMatch(/todav[ií]a no tengo una propuesta lista para confirmar/i);
  });

  it("quiero cambiar mi reserva sin contexto pide código y no cae en nueva propuesta", async () => {
    const sendReply = vi.fn(async () => {});
    await handleIncomingMessage(msg("quiero cambiar mi reserva"), { mode: "automatic", sendReply });
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/c[oó]digo de reserva/i);
    expect(replyText).not.toMatch(/todav[ií]a no tengo una propuesta lista para confirmar/i);
  });

  it("quiero cancelar mi reserva sin contexto pide código y no cae en nueva propuesta", async () => {
    const sendReply = vi.fn(async () => {});
    await handleIncomingMessage(msg("quiero cancelar mi reserva"), { mode: "automatic", sendReply });
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/c[oó]digo de reserva/i);
    expect(replyText).not.toMatch(/todav[ií]a no tengo una propuesta lista para confirmar/i);
  });

  it("nueva reserva explícita con habitación y rango natural pide huéspedes y no pide código", async () => {
    const sendReply = vi.fn(async () => {});
    await handleIncomingMessage(
      msg("quiero reservar una habitación doble del 21 de mayo al 25 de mayo"),
      { mode: "automatic", sendReply }
    );
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/cu[aá]ntos hu[eé]spedes/i);
    expect(replyText).not.toMatch(/c[oó]digo de reserva/i);
    expect(replyText).not.toMatch(/todav[ií]a no tengo una propuesta lista para confirmar/i);
  });

  it("no activa create de forma prematura ante una consulta difusa de disponibilidad", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("hola, queria ver si hay disponibilidad"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/tipo de habitaci[oó]n|room type/i);
    expect(replyText).not.toMatch(/a nombre de qui[eé]n|cu[aá]ntos hu[eé]spedes|confirm[aá]s la reserva/i);
    expect(currentState?.activeFlow).not.toBe("reservation");
    expect(currentState?.desiredAction).not.toBe("create");
  });

  it("respeta sufficiency gating ante una petición vaga para este finde", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(
      msg("quiero algo para este finde"),
      { mode: "automatic", sendReply }
    );

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/tipo de habitaci[oó]n|room type|a nombre de qui[eé]n|cu[aá]ntos hu[eé]spedes/i);
    expect(replyText).toMatch(/fecha|check-?in|check-?out|aclar|confirm/i);
    expect(currentState?.activeFlow).not.toBe("reservation");
    expect(currentState?.desiredAction).not.toBe("create");
  });

  it("si preguntó huéspedes para una nueva reserva, un '2' continúa reservation y no entra en modify", async () => {
    const sendReply = vi.fn(async () => {});
    await handleIncomingMessage(
      msg("quiero reservar una habitación doble del 21 de mayo al 25 de mayo"),
      { mode: "automatic", sendReply }
    );
    await handleIncomingMessage(msg("2"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/qu[eé] campo de tu reserva deseas modificar|what would you like to change/i);
    expect(replyText).not.toMatch(/todav[ií]a no tengo una propuesta lista para confirmar/i);
    expect(currentState?.reservationSlots).toMatchObject({
      roomType: "double",
      checkIn: "2026-05-21",
      checkOut: "2026-05-25",
    });
    expect(String(currentState?.reservationSlots?.numGuests || "")).toBe("2");
    expect(currentState?.activeFlow).toBe("reservation");
    expect(currentState?.desiredAction).toBe("create");
  });

  it("si ya emitió una propuesta confirmable, 'confirmar' cierra la nueva reserva y no cae en fallback", async () => {
    const sendReply = vi.fn(async () => {});
    await handleIncomingMessage(
      msg("quiero reservar una habitación doble del 21 de mayo al 25 de mayo"),
      { mode: "automatic", sendReply }
    );
    await handleIncomingMessage(msg("2"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("Marcelo Martinez"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("confirmar"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(confirmAndCreate).toHaveBeenCalled();
    expect(replyText).not.toMatch(/todav[ií]a no tengo una propuesta lista para confirmar/i);
    expect(replyText).toMatch(/reserva creada|reserva confirmada|R-NEW-01/i);
  });

  it("tolera typo en confirmación dentro del flujo activo y no cae en fallback", async () => {
    const sendReply = vi.fn(async () => {});
    await handleIncomingMessage(
      msg("quiero reservar una habitación doble del 21 de mayo al 25 de mayo"),
      { mode: "automatic", sendReply }
    );
    await handleIncomingMessage(msg("2"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("Marcelo Martinez"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("conmfirmar"), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(confirmAndCreate).toHaveBeenCalled();
    expect(replyText).not.toMatch(/todav[ií]a no tengo una propuesta lista para confirmar|whatsapp|email/i);
    expect(replyText).toMatch(/reserva creada|reserva confirmada|R-NEW-01/i);
  });
});
