import { beforeEach, describe, expect, it, vi } from "vitest";

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

const confirmedState = {
  reservationSlots: {
    guestName: "Marcelo Martinez",
    roomType: "double",
    checkIn: "2026-04-10",
    checkOut: "2026-04-12",
    numGuests: "2",
  },
  salesStage: "close",
  conversationStage: "reservation_confirmed",
  lastReservation: {
    reservationId: "RES-BASE-01",
    status: "created",
    createdAt: "2026-03-20T10:00:00.000Z",
    channel: "web",
  },
};

vi.mock("@/lib/db/convState", () => ({
  getConvState: vi.fn(async () => confirmedState),
  upsertConvState: vi.fn(async () => {}),
  CONVSTATE_VERSION: "convstate-test",
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
vi.mock("@/lib/agents", () => ({
  agentGraph: { invoke: vi.fn(async () => ({ messages: [], category: "reservation", meta: {} })) },
}));
vi.mock("@/lib/agents/reservations", () => ({
  modifyReservation: vi.fn(async () => ({ ok: true, message: "ok" })),
  confirmAndCreate: vi.fn(async () => ({ ok: true, reservationId: "R-NEW-99", message: "ok" })),
}));
vi.mock("@/lib/agents/stateUpdaterAgent", () => ({
  updateConversationState: vi.fn(async () => {}),
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
vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(async () => ({
    hotelName: "Hotel Demo",
    schedules: { checkIn: "15:00", checkOut: "11:00" },
  })),
}));
vi.mock("@langchain/openai", () => ({
  ChatOpenAI: class { constructor(_c: any) {} async invoke() { return { content: "Respuesta base" }; } },
}));

import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import { agentGraph } from "@/lib/agents";
import { getConvState } from "@/lib/db/convState";
import { updateConversationState } from "@/lib/agents/stateUpdaterAgent";
import { modifyReservation } from "@/lib/agents/reservations";

describe("messageHandler multi reservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getConvState as any).mockResolvedValue({
      ...confirmedState,
      reservationSlots: { ...confirmedState.reservationSlots },
      lastReservation: { ...confirmedState.lastReservation },
    });
  });

  it("con reserva confirmada, 'quiero hacer otra reserva' abre un draft nuevo sin pisar la anterior", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage({
      messageId: "multi-1",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "quiero hacer otra reserva",
      timestamp: new Date().toISOString(),
      conversationId: "conv-multi-1",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    expect(agentGraph.invoke).not.toHaveBeenCalled();
    expect(updateConversationState).toHaveBeenCalledWith(
      "hotel999",
      "conv-multi-1",
      expect.objectContaining({
        activeFlow: "reservation",
        activeReservationContext: expect.objectContaining({
          kind: "draft",
          phase: "collecting",
        }),
        desiredAction: "create",
        salesStage: "qualify",
        lastCategory: "reservation",
        reservationHistory: [
          expect.objectContaining({
            reservationId: "RES-BASE-01",
            status: "created",
          }),
        ],
      })
    );
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/mantenemos la reserva actual|abrimos una nueva/i);
    expect(replyText).toMatch(/check-in y check-out|fechas/i);
  });

  it("con reserva confirmada, 'quiero reservar otra habitación' abre un draft nuevo y preserva la reserva previa", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage({
      messageId: "multi-2",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "quiero reservar otra habitación",
      timestamp: new Date().toISOString(),
      conversationId: "conv-multi-2",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    expect(agentGraph.invoke).not.toHaveBeenCalled();
    expect(updateConversationState).toHaveBeenCalledWith(
      "hotel999",
      "conv-multi-2",
      expect.objectContaining({
        activeFlow: "reservation",
        activeReservationContext: expect.objectContaining({
          kind: "draft",
          phase: "collecting",
        }),
        desiredAction: "create",
        salesStage: "qualify",
        reservationHistory: [
          expect.objectContaining({
            reservationId: "RES-BASE-01",
            status: "created",
          }),
        ],
      })
    );
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/mantenemos la reserva actual|abrimos una nueva/i);
    expect(replyText).toMatch(/check-in y check-out|fechas/i);
  });

  it("con aclaración explícita de nueva reserva mantiene la anterior y abre otra", async () => {
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage({
      messageId: "multi-3",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "es una nueva reserva, aquella está vigente, dejala que la voy a usar",
      timestamp: new Date().toISOString(),
      conversationId: "conv-multi-3",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    expect(agentGraph.invoke).not.toHaveBeenCalled();
    expect(updateConversationState).toHaveBeenCalledWith(
      "hotel999",
      "conv-multi-3",
      expect.objectContaining({
        activeFlow: "reservation",
        activeReservationContext: expect.objectContaining({
          kind: "draft",
          phase: "collecting",
        }),
        desiredAction: "create",
        salesStage: "qualify",
      })
    );
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/mantenemos la reserva actual|abrimos una nueva/i);
  });

  it("create explícito con payload suficiente rompe continuidad de modify y no actualiza la reserva previa", async () => {
    const sendReply = vi.fn(async () => {});
    (getConvState as any).mockResolvedValue({
      ...confirmedState,
      reservationSlots: { ...confirmedState.reservationSlots },
      lastReservation: { ...confirmedState.lastReservation },
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
      activeReservationContext: { kind: "reservation", reservationId: "RES-BASE-01", phase: "confirmed" },
      selectedReservationTarget: { reservationId: "RES-BASE-01", source: "active_focus", strength: "weak" },
    });

    await handleIncomingMessage({
      messageId: "multi-4",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "quiero hacer otra reserva para el dia 01/07/2026 al 10/07/2026, habitacion single, para 1 persona, a nombre de Raul Olivera",
      timestamp: new Date().toISOString(),
      conversationId: "conv-multi-4",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    expect(modifyReservation).not.toHaveBeenCalled();
    expect(updateConversationState).toHaveBeenCalledWith(
      "hotel999",
      "conv-multi-4",
      expect.objectContaining({
        lastCategory: "reservation",
        pendingAvailabilityVerification: {
          checkIn: "2026-07-01",
          checkOut: "2026-07-10",
        },
        reservationSlots: {
          checkIn: "2026-07-01",
          checkOut: "2026-07-10",
          guestName: "Raul Olivera",
          numGuests: "1",
          roomType: "single",
        },
      })
    );
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/actualizada|modificad/i);
  });

  it("otra reserva con rango relativo 'sabado al domingo proximo' ingiere fechas y no vuelve a pedirlas", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T12:00:00.000Z"));
    const sendReply = vi.fn(async () => {});
    (getConvState as any).mockResolvedValue({
      ...confirmedState,
      reservationSlots: { ...confirmedState.reservationSlots },
      lastReservation: { ...confirmedState.lastReservation },
      activeFlow: "modify_reservation",
      desiredAction: "modify",
      lastCategory: "modify_reservation",
      activeReservationContext: { kind: "reservation", reservationId: "RES-BASE-01", phase: "confirmed" },
      selectedReservationTarget: { reservationId: "RES-BASE-01", source: "active_focus", strength: "weak" },
    });

    await handleIncomingMessage({
      messageId: "multi-5",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "quiero hacer otra reserva para el sabado al domingo proximo, una triple, para 3 personas a nombre de Raul Olivera",
      timestamp: new Date().toISOString(),
      conversationId: "conv-multi-5",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    expect(modifyReservation).not.toHaveBeenCalled();
    expect(updateConversationState).toHaveBeenCalledWith(
      "hotel999",
      "conv-multi-5",
      expect.objectContaining({
        lastCategory: "reservation",
        reservationSlots: {
          checkIn: "2026-05-02",
          checkOut: "2026-05-03",
          guestName: "Raul Olivera",
          numGuests: "3",
          roomType: "triple",
        },
      })
    );
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/decime las fechas de check-?in y check-?out/i);
    expect(replyText).not.toMatch(/anot[eé] nuevas fechas|verifique disponibilidad/i);
    vi.useRealTimers();
  });

  it("otra reserva con rango relativo 'sábado al domingo próximo' soporta tildes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T12:00:00.000Z"));
    const sendReply = vi.fn(async () => {});
    (getConvState as any).mockResolvedValue({
      ...confirmedState,
      reservationSlots: { ...confirmedState.reservationSlots },
      lastReservation: { ...confirmedState.lastReservation },
    });

    await handleIncomingMessage({
      messageId: "multi-6",
      hotelId: "hotel999",
      channel: "web",
      sender: "guest",
      content: "quiero hacer otra reserva para el sábado al domingo próximo, una triple, para 3 personas a nombre de Raul Olivera",
      timestamp: new Date().toISOString(),
      conversationId: "conv-multi-6",
      guestId: "g1",
      detectedLanguage: "es",
    } as any, { mode: "automatic", sendReply });

    expect(updateConversationState).toHaveBeenCalledWith(
      "hotel999",
      "conv-multi-6",
      expect.objectContaining({
        reservationSlots: {
          checkIn: "2026-05-02",
          checkOut: "2026-05-03",
          guestName: "Raul Olivera",
          numGuests: "3",
          roomType: "triple",
        },
      })
    );
    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).not.toMatch(/decime las fechas de check-?in y check-?out/i);
    expect(replyText).not.toMatch(/anot[eé] nuevas fechas|verifique disponibilidad/i);
    vi.useRealTimers();
  });
});
