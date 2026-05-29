import { beforeEach, describe, expect, it, vi } from "vitest";
import { agentGraph } from "@/lib/agents";
import { answerWithKnowledge } from "@/lib/agents/knowledgeBaseAgent";

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
      const text = String(input?.normalizedMessage || "").toLowerCase();
      if (/pileta|piscina|pool/.test(text)) {
        return {
          messages: [{ role: "assistant", content: "Sí, tenemos pileta climatizada." }],
          category: "amenities_info",
          meta: {},
        };
      }
      if (/wifi|wi[- ]?fi/.test(text)) {
        return {
          messages: [{ role: "assistant", content: "Sí, hay wifi incluido." }],
          category: "amenities_info",
          meta: {},
        };
      }
      if (/estacionamiento|parking/.test(text)) {
        return {
          messages: [{ role: "assistant", content: "Sí, el estacionamiento está incluido." }],
          category: "amenities_info",
          meta: {},
        };
      }
      if (/cancel/.test(text)) {
        return {
          messages: [{ role: "assistant", content: "Para cancelar necesito identificar la reserva." }],
          category: "cancel_reservation",
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
vi.mock("@/lib/agents/stateUpdaterAgent", () => ({
  updateConversationState: vi.fn(async (_hotelId: string, _conversationId: string, patch: any) => {
    currentState = { ...(currentState || {}), ...patch };
  }),
}));
vi.mock("@/lib/agents/reservations", () => ({
  cancelReservation: vi.fn(async (_hotelId: string, reservationId: string) => ({
    ok: true,
    message: `✅ Cancelada ${reservationId}`,
  })),
  modifyReservation: vi.fn(async (_hotelId: string, reservationId: string, snapshot: any) => ({
    ok: true,
    message: `✅ Modificada ${reservationId}`,
    snapshot,
  })),
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
    if (/pileta|piscina|pool/.test(text)) {
      return {
        ok: true,
        category: "amenities_info",
        answer: "Sí, tenemos pileta climatizada.",
        promptKey: "pool_gym_spa",
        retrieved: [],
      };
    }
    if (/wifi|wi[- ]?fi/.test(text)) {
      return {
        ok: true,
        category: "amenities_info",
        answer: "Sí, hay wifi incluido.",
        promptKey: "wifi",
        retrieved: [],
      };
    }
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
      answer: "Respuesta base",
      retrieved: [],
    };
  }),
}));
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class { constructor(_c: any) {} async invoke() { return { content: "Respuesta base" }; } },
}));

import { handleIncomingMessage } from "@/lib/handlers/messageHandler";

function msg(content: string) {
  return {
    messageId: `m-${Math.random().toString(36).slice(2, 8)}`,
    hotelId: "hotel999",
    channel: "web",
    sender: "guest",
    content,
    timestamp: new Date().toISOString(),
    conversationId: "conv-focus-governance-1",
    guestId: "g1",
    detectedLanguage: "es",
  } as any;
}

function lastReply(sendReply: any): string {
  return String(sendReply.mock.calls.at(-1)?.[0] || "");
}

describe("messageHandler focus governance", () => {
  beforeEach(() => {
    currentState = null;
    vi.clearAllMocks();
  });

  it("persiste focus create y continúa el flujo con datos válidos", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("quiero reservar del 10 al 15 de mayo de 2027"), { mode: "automatic", sendReply });

    expect(currentState?.conversationFocus).toMatchObject({
      domain: "reservation",
      subFlow: "create",
      active: true,
    });
    expect(lastReply(sendReply)).toMatch(/cu[aá]ntos hu[eé]spedes/i);

    await handleIncomingMessage(msg("2 adultos"), { mode: "automatic", sendReply });

    expect(currentState?.conversationFocus).toMatchObject({
      domain: "reservation",
      subFlow: "create",
      active: true,
    });
    expect(lastReply(sendReply)).toMatch(/tipo de habitaci[oó]n/i);
  });

  it("permite una interrupción lateral de amenities sin perder el foco create", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("quiero reservar del 10 al 15 de mayo de 2027"), { mode: "automatic", sendReply });
    await handleIncomingMessage(msg("¿tienen pileta?"), { mode: "automatic", sendReply });

    expect(lastReply(sendReply)).toMatch(/pileta|piscina|pool/i);
    expect(lastReply(sendReply)).not.toMatch(/para seguir con la reserva|cu[aá]ntos hu[eé]spedes|tipo de habitaci[oó]n/i);
    expect(currentState?.conversationFocus).toMatchObject({
      domain: "reservation",
      subFlow: "create",
      active: true,
    });

    await handleIncomingMessage(msg("2 adultos"), { mode: "automatic", sendReply });

    expect(lastReply(sendReply)).toMatch(/tipo de habitaci[oó]n/i);
    expect(currentState?.conversationFocus).toMatchObject({
      domain: "reservation",
      subFlow: "create",
      active: true,
    });
  });

  it("lateral en create no dispara continuidad y luego reengancha el faltante", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("quiero reservar del 1 al 5 de mayo de 2027 para 2 personas"), { mode: "automatic", sendReply });
    vi.mocked(agentGraph.invoke).mockResolvedValueOnce({
      messages: [{ role: "assistant", content: "¿Cuál es el tipo de habitación?" }],
      category: "reservation",
      meta: {},
    } as any);
    await handleIncomingMessage(msg("¿el wifi está incluido?"), { mode: "automatic", sendReply });

    expect(lastReply(sendReply)).toMatch(/wifi|wi[- ]?fi/i);
    expect(lastReply(sendReply)).not.toMatch(/tipo de habitaci[oó]n|cu[aá]ntos hu[eé]spedes|a nombre de/i);
    expect(currentState?.lastCategory).toBe("amenities_info");
    expect(currentState?.conversationFocus).toMatchObject({
      domain: "reservation",
      subFlow: "create",
      active: true,
    });

    await handleIncomingMessage(msg("sí, continuar"), { mode: "automatic", sendReply });

    expect(lastReply(sendReply)).toMatch(/tipo de habitaci[oó]n/i);
    expect(currentState?.conversationFocus).toMatchObject({
      domain: "reservation",
      subFlow: "create",
      active: true,
    });
  });

  it("lateral puro en create usa failsafe si KB falla y bloquea graph transaccional", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("quiero reservar del 1 al 5 de mayo de 2027 para 2 personas"), { mode: "automatic", sendReply });
    vi.mocked(agentGraph.invoke).mockClear();
    vi.mocked(answerWithKnowledge).mockRejectedValueOnce(new Error("kb down"));
    vi.mocked(agentGraph.invoke).mockResolvedValueOnce({
      messages: [{ role: "assistant", content: "¿Cuál es el tipo de habitación?" }],
      category: "reservation",
      meta: {},
    } as any);

    await handleIncomingMessage(msg("¿el wifi está incluido?"), { mode: "automatic", sendReply });

    expect(lastReply(sendReply)).toMatch(/wifi|wi[- ]?fi/i);
    expect(lastReply(sendReply)).not.toMatch(/tipo de habitaci[oó]n|cu[aá]ntos hu[eé]spedes|a nombre de/i);
    expect(vi.mocked(agentGraph.invoke)).not.toHaveBeenCalled();
    expect(currentState?.lastCategory).toBe("amenities_info");
    expect(currentState?.conversationFocus).toMatchObject({
      domain: "reservation",
      subFlow: "create",
      active: true,
    });

    await handleIncomingMessage(msg("sí, continuar"), { mode: "automatic", sendReply });

    expect(lastReply(sendReply)).toMatch(/tipo de habitaci[oó]n/i);
  });

  it("cambia de create a cancel cuando el usuario lo pide explícitamente", async () => {
    const sendReply = vi.fn(async () => {});
    currentState = {
      reservationSlots: {
        checkIn: "2027-05-10",
        checkOut: "2027-05-15",
        numGuests: "2",
      },
      conversationFocus: {
        domain: "reservation",
        subFlow: "create",
        active: true,
        updatedAt: new Date().toISOString(),
      },
      activeFlow: "reservation",
      desiredAction: "create",
      lastCategory: "reservation",
      lastReservation: {
        reservationId: "RES-100",
        status: "created",
        createdAt: "2026-03-25T10:00:00.000Z",
        channel: "web",
      },
      reservationHistory: [
        {
          reservationId: "RES-100",
          status: "created",
          createdAt: "2026-03-25T10:00:00.000Z",
          channel: "web",
        },
      ],
      activeReservationContext: {
        kind: "reservation",
        reservationId: "RES-100",
        phase: "confirmed",
        updatedAt: "2026-03-25T10:00:00.000Z",
      },
    };

    await handleIncomingMessage(msg("cancelá mi reserva"), { mode: "automatic", sendReply });

    expect(currentState?.lastCategory).toBe("cancel_reservation");
    expect(currentState?.conversationFocus?.subFlow === "cancel" || currentState?.conversationFocus == null).toBe(true);
    expect(
      currentState?.pendingCancellation?.reservationId === "RES-100" ||
      currentState?.lastReservation?.reservationId === "RES-100"
    ).toBe(true);
    expect(lastReply(sendReply)).toMatch(/confirmar|cancel/i);
  });

  it("mantiene focus modify durante una interrupción lateral y luego retoma la modificación", async () => {
    const sendReply = vi.fn(async () => {});
    currentState = {
      reservationSlots: {
        guestName: "Marcelo Martinez",
        roomType: "double",
        checkIn: "2027-05-10",
        checkOut: "2027-05-15",
        numGuests: "2",
      },
      conversationFocus: {
        domain: "reservation",
        subFlow: "modify",
        active: true,
        updatedAt: new Date().toISOString(),
      },
      modifyState: {
        activeField: "guests",
        updatedAt: new Date().toISOString(),
      },
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
      activeReservationContext: {
        kind: "reservation",
        reservationId: "RES-200",
        phase: "confirmed",
        updatedAt: "2026-03-25T10:00:00.000Z",
      },
      selectedReservationTarget: {
        reservationId: "RES-200",
        source: "active_focus",
        strength: "weak",
      },
    };

    await handleIncomingMessage(msg("¿tienen pileta?"), { mode: "automatic", sendReply });

    expect(lastReply(sendReply)).toMatch(/pileta|piscina|pool/i);
    expect(lastReply(sendReply)).toMatch(/para seguir con la modificaci[oó]n|nueva cantidad de hu[eé]spedes/i);
    expect(currentState?.conversationFocus).toMatchObject({
      domain: "reservation",
      subFlow: "modify",
      active: true,
    });

    await handleIncomingMessage(msg("sí, seguí con el cambio"), { mode: "automatic", sendReply });

    const followupText = lastReply(sendReply);
    expect(followupText).not.toMatch(/¿?cu[aá]l quer[eé]s|c[oó]digo de reserva/i);
    expect(currentState?.activeReservationContext?.reservationId).toBe("RES-200");

    await handleIncomingMessage(msg("3 personas"), { mode: "automatic", sendReply });

    expect(lastReply(sendReply)).toMatch(/no admite|cambiar a|habitaci[oó]n/i);
    expect(currentState?.lastCategory).toBe("modify_reservation");
    expect(currentState?.conversationFocus?.subFlow === "modify" || currentState?.conversationFocus == null).toBe(true);
  });

  it("responde amenities en modify y evita fallback de reserva", async () => {
    const sendReply = vi.fn(async () => {});
    currentState = {
      reservationSlots: {
        checkIn: "2027-05-10",
        checkOut: "2027-05-15",
        numGuests: "2",
        roomType: "double",
      },
      conversationFocus: {
        domain: "reservation",
        subFlow: "modify",
        active: true,
        updatedAt: new Date().toISOString(),
      },
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
      selectedReservationTarget: {
        reservationId: "RES-200",
        kind: "reservation",
      },
      activeReservationContext: {
        kind: "reservation",
        reservationId: "RES-200",
        phase: "confirmed",
        updatedAt: new Date().toISOString(),
      },
    };

    await handleIncomingMessage(msg("¿el estacionamiento está incluido?"), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/estacionamiento|parking/i);
    expect(replyText).not.toMatch(/tarifa|cotiz|a nombre de qui[eé]n/i);
    expect(currentState?.conversationFocus?.subFlow).toBe("modify");
  });

  it("no reengancha de forma redundante si el turno lateral ya trae el dato pendiente", async () => {
    const sendReply = vi.fn(async () => {});
    currentState = {
      reservationSlots: {
        checkIn: "2027-05-10",
        checkOut: "2027-05-15",
      },
      conversationFocus: {
        domain: "reservation",
        subFlow: "create",
        active: true,
        updatedAt: new Date().toISOString(),
      },
      activeFlow: "reservation",
      desiredAction: "create",
      lastCategory: "reservation",
    };

    await handleIncomingMessage(msg("¿tienen pileta para 2 adultos?"), { mode: "automatic", sendReply });

    const replyText = lastReply(sendReply);
    expect(replyText).toMatch(/tipo de habitaci[oó]n/i);
    expect(replyText).not.toMatch(/para seguir con la reserva.*cu[aá]ntos hu[eé]spedes/i);
    expect(currentState?.conversationFocus).toMatchObject({
      domain: "reservation",
      subFlow: "create",
      active: true,
    });
  });
});
