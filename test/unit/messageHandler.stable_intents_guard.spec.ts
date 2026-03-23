import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.STRUCTURED_ENABLED = "false";

const { agentInvoke } = vi.hoisted(() => ({
  agentInvoke: vi.fn(async () => ({
    messages: [{ role: "assistant", content: "**🏨 Habitación Doble**\n¿Deseás que continúe con la reserva desde aquí?" }],
    category: "retrieval_based",
  })),
}));

const { getHotelConfigMock } = vi.hoisted(() => ({
  getHotelConfigMock: vi.fn(async () => ({
    hotelName: "Hotel Demo",
    schedules: { checkIn: "15:00", checkOut: "11:00", breakfast: "07:00 - 10:30" },
    amenities: {
      wifiNotes: "Wi-Fi gratis en todo el hotel. La clave se entrega al hacer check-in.",
      parkingNotes: "Estacionamiento sujeto a disponibilidad en el predio.",
    },
  })),
}));

vi.mock("@/lib/astra_connection", async () => await import("../mocks/astra"));
vi.mock("@/lib/redis", async () => await import("../mocks/redis"));
vi.mock("@/lib/db/messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db_messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db/conversations", async () => await import("../mocks/db_conversations"));
vi.mock("@/lib/db_conversations", async () => await import("../mocks/db_conversations"));
vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: getHotelConfigMock,
}));
vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: agentInvoke,
  },
}));
vi.mock("@/lib/agents/knowledgeBaseAgent", () => ({
  answerWithKnowledge: vi.fn(async () => ({
    ok: true,
    category: "retrieval_based",
    answer: "**🏨 Habitación Doble**\n¿Deseás que continúe con la reserva desde aquí?",
    retrieved: [],
  })),
}));
vi.mock("@/lib/db/convState", () => ({
  getConvState: vi.fn(),
  upsertConvState: vi.fn(),
  CONVSTATE_VERSION: "convstate-test",
}));

import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import { getCollection } from "../mocks/astra";
import { getConvState } from "@/lib/db/convState";

const hotelId = "hotel999";
const channel = "web" as const;
const sendReply = vi.fn(async (_t: string) => {});

function msg(content: string, conversationId: string) {
  return {
    hotelId,
    channel,
    conversationId,
    messageId: `m-${Math.random().toString(36).slice(2, 9)}`,
    sender: "guest" as const,
    role: "user" as const,
    content,
    detectedLanguage: "es",
    timestamp: new Date().toISOString(),
  };
}

async function lastAssistantText(conversationId: string) {
  const all = await getCollection("messages").findMany({ hotelId, conversationId });
  const lastAi = all.filter((m: any) => m.sender === "assistant").at(-1);
  return String(lastAi?.content || lastAi?.suggestion || "");
}

describe("messageHandler stable intents guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getConvState as any).mockResolvedValue(null);
    getHotelConfigMock.mockReset();
    getHotelConfigMock.mockResolvedValue({
      hotelName: "Hotel Demo",
      schedules: { checkIn: "15:00", checkOut: "11:00", breakfast: "07:00 - 10:30" },
      amenities: {
        wifiNotes: "Wi-Fi gratis en todo el hotel. La clave se entrega al hacer check-in.",
        parkingNotes: "Estacionamiento sujeto a disponibilidad en el predio.",
      },
    });
  });

  it("sin contexto, 'a que hora es el check in' responde FAQ estable y no reserva", async () => {
    const conversationId = "conv-stable-checkin-1";

    await handleIncomingMessage(msg("a que hora es el check in", conversationId), { mode: "automatic", sendReply });

    const text = await lastAssistantText(conversationId);
    expect(text).toMatch(/15:00/);
    expect(text).not.toMatch(/Habitaci[oó]n Doble|contin[uú]e con la reserva/i);
    expect(agentInvoke).not.toHaveBeenCalled();
  });

  it("tolera typo simple en 'check iin' y mantiene respuesta determinista", async () => {
    const conversationId = "conv-stable-checkin-2";

    await handleIncomingMessage(msg("a que hora es el check iin", conversationId), { mode: "automatic", sendReply });

    const text = await lastAssistantText(conversationId);
    expect(text).toMatch(/15:00/);
    expect(text).not.toMatch(/Habitaci[oó]n Doble|contin[uú]e con la reserva/i);
    expect(agentInvoke).not.toHaveBeenCalled();
  });

  it("con contexto transaccional activo, el stable intent gana precedencia", async () => {
    const conversationId = "conv-stable-checkin-3";
    (getConvState as any).mockResolvedValue({
      hotelId,
      conversationId,
      salesStage: "quote",
      reservationSlots: {
        roomType: "doble",
        checkIn: "2026-04-10",
        checkOut: "2026-04-12",
        numGuests: 2,
      },
      updatedAt: new Date().toISOString(),
    });

    await handleIncomingMessage(msg("check-in?", conversationId), { mode: "automatic", sendReply });

    const text = await lastAssistantText(conversationId);
    expect(text).toMatch(/15:00/);
    expect(text).not.toMatch(/Habitaci[oó]n Doble|contin[uú]e con la reserva|reserva/i);
    expect(agentInvoke).not.toHaveBeenCalled();
  });

  it("mantiene checkout estándar como FAQ estable", async () => {
    const conversationId = "conv-stable-checkout-1";

    await handleIncomingMessage(msg("a qué hora es el check-out", conversationId), { mode: "automatic", sendReply });

    const text = await lastAssistantText(conversationId);
    expect(text).toMatch(/11:00/);
    expect(text).not.toMatch(/late check-out|recepci[oó]n/i);
    expect(agentInvoke).not.toHaveBeenCalled();
  });

  it("con contexto transaccional activo, 'wifi?' gana precedencia y no deriva a reserva", async () => {
    const conversationId = "conv-stable-wifi-1";
    (getConvState as any).mockResolvedValue({
      hotelId,
      conversationId,
      salesStage: "quote",
      reservationSlots: {
        roomType: "doble",
        checkIn: "2026-04-10",
        checkOut: "2026-04-12",
        numGuests: 2,
      },
      updatedAt: new Date().toISOString(),
    });

    await handleIncomingMessage(msg("wifi?", conversationId), { mode: "automatic", sendReply });

    const text = await lastAssistantText(conversationId);
    expect(text).toMatch(/wifi|wi-fi|clave/i);
    expect(text).not.toMatch(/Habitaci[oó]n Doble|contin[uú]e con la reserva|reserva/i);
    expect(agentInvoke).not.toHaveBeenCalled();
  });

  it("con contexto transaccional activo, 'hay parking?' gana precedencia y no deriva a reserva", async () => {
    const conversationId = "conv-stable-parking-1";
    (getConvState as any).mockResolvedValue({
      hotelId,
      conversationId,
      salesStage: "quote",
      reservationSlots: {
        roomType: "doble",
        checkIn: "2026-04-10",
        checkOut: "2026-04-12",
        numGuests: 2,
      },
      updatedAt: new Date().toISOString(),
    });

    await handleIncomingMessage(msg("hay parking?", conversationId), { mode: "automatic", sendReply });

    const text = await lastAssistantText(conversationId);
    expect(text).toMatch(/parking|estacionamiento/i);
    expect(text).not.toMatch(/Habitaci[oó]n Doble|contin[uú]e con la reserva|reserva/i);
    expect(agentInvoke).not.toHaveBeenCalled();
  });

  it("con temporalidad suave, parking sigue en dominio hotelero y no deriva a eventos", async () => {
    const cases = [
      "quiero parking para mañana",
      "necesito parking mañana",
      "hay parking mañana?",
    ];

    for (const [index, content] of cases.entries()) {
      const conversationId = `conv-stable-parking-tomorrow-${index + 1}`;

      await handleIncomingMessage(msg(content, conversationId), { mode: "automatic", sendReply });

      const text = await lastAssistantText(conversationId);
      expect(text).toMatch(/parking|estacionamiento/i);
      expect(text).not.toMatch(/evento|agenda|punta del este/i);
      expect(agentInvoke).not.toHaveBeenCalled();
    }
  });

  it("con contexto transaccional activo, 'desayuno?' gana precedencia y no deriva a reserva", async () => {
    const conversationId = "conv-stable-breakfast-1";
    (getConvState as any).mockResolvedValue({
      hotelId,
      conversationId,
      salesStage: "quote",
      reservationSlots: {
        roomType: "doble",
        checkIn: "2026-04-10",
        checkOut: "2026-04-12",
        numGuests: 2,
      },
      updatedAt: new Date().toISOString(),
    });

    await handleIncomingMessage(msg("desayuno?", conversationId), { mode: "automatic", sendReply });

    const text = await lastAssistantText(conversationId);
    expect(text).toMatch(/desayuno|07:00 - 10:30/i);
    expect(text).not.toMatch(/Habitaci[oó]n Doble|contin[uú]e con la reserva|reserva/i);
    expect(agentInvoke).not.toHaveBeenCalled();
  });

  it("no secuestra intents transaccionales reales de reserva", async () => {
    const conversationId = "conv-stable-negative-1";

    await handleIncomingMessage(msg("quiero reservar una habitación para mañana", conversationId), { mode: "automatic", sendReply });

    const text = await lastAssistantText(conversationId);
    expect(text).not.toMatch(/15:00|11:00/);
    expect(text).toMatch(/fecha|habitaci[oó]n|reserva|booking/i);
  });

  it("no captura frases enriquecidas como 'necesito wifi para trabajar durante mi estadía'", async () => {
    const conversationId = "conv-stable-negative-2";

    await handleIncomingMessage(msg("necesito wifi para trabajar durante mi estadía", conversationId), { mode: "automatic", sendReply });

    const text = await lastAssistantText(conversationId);
    expect(text).not.toMatch(/clave se entrega al hacer check-in|estacionamiento sujeto a disponibilidad|07:00 - 10:30/i);
  });

  it("si el hotel deshabilita wifi, el guard no responde y sigue el pipeline", async () => {
    const conversationId = "conv-stable-wifi-disabled-1";
    (getConvState as any).mockResolvedValue({
      hotelId,
      conversationId,
      salesStage: "quote",
      reservationSlots: {
        roomType: "doble",
        checkIn: "2026-04-10",
        checkOut: "2026-04-12",
        numGuests: 2,
      },
      updatedAt: new Date().toISOString(),
    });
    getHotelConfigMock.mockResolvedValueOnce({
      hotelName: "Hotel Demo",
      schedules: { checkIn: "15:00", checkOut: "11:00", breakfast: "07:00 - 10:30" },
      amenities: {
        wifiNotes: "Wi-Fi gratis en todo el hotel. La clave se entrega al hacer check-in.",
      },
      semanticPolicy: {
        stableIntents: {
          faq_wifi: {
            enabled: false,
            responseSource: "amenities.wifiNotes",
          },
        },
      },
    });

    await handleIncomingMessage(msg("wifi?", conversationId), { mode: "automatic", sendReply });

    const text = await lastAssistantText(conversationId);
    expect(text).not.toMatch(/clave se entrega al hacer check-in/i);
    expect(text).toMatch(/Habitaci[oó]n Doble|contin[uú]e con la reserva/i);
  });
});
