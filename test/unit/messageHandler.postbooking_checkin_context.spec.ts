import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.STRUCTURED_ENABLED = "false";

vi.mock("@/lib/astra_connection", async () => await import("../mocks/astra"));
vi.mock("@/lib/redis", async () => await import("../mocks/redis"));
vi.mock("@/lib/db/messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db_messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db/conversations", async () => await import("../mocks/db_conversations"));
vi.mock("@/lib/db_conversations", async () => await import("../mocks/db_conversations"));
vi.mock("@/lib/config/hotelConfig.server", () => ({
  getHotelConfig: vi.fn(async () => ({
    hotelName: "Hotel Demo",
    schedules: { checkIn: "14:00", checkOut: "11:00" },
  })),
}));
vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: vi.fn(async () => ({
      messages: [{ role: "assistant", content: "**🏨 Habitación Doble**\n¿Deseas que continúe con la reserva desde aquí?" }],
      category: "retrieval_based",
    })),
  },
}));
vi.mock("@/lib/agents/knowledgeBaseAgent", () => ({
  answerWithKnowledge: vi.fn(async () => ({
    ok: true,
    category: "retrieval_based",
    answer: "**🏨 Habitación Doble**\n¿Deseas que continúe con la reserva desde aquí?",
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

describe("messageHandler post-booking checkin context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function confirmedState(conversationId: string) {
    return {
      hotelId,
      conversationId,
      reservationSlots: {
        guestName: "Marcelo Martinez",
        roomType: "double",
        checkIn: "2026-03-21",
        checkOut: "2026-03-25",
        numGuests: "2",
      },
      lastReservation: {
        reservationId: "RES-AB12CD",
        status: "created",
        createdAt: new Date().toISOString(),
        channel,
      },
      salesStage: "close",
      updatedAt: new Date().toISOString(),
    };
  }

  it("con reserva confirmada, 'a que hora es el check in' responde horario contextual y no room_info", async () => {
    const conversationId = "conv-postbooking-checkin-1";
    (getConvState as any).mockResolvedValue(confirmedState(conversationId));

    await handleIncomingMessage(msg("a que hora es el check in", conversationId), { mode: "automatic", sendReply });

    const all = await getCollection("messages").findMany({ hotelId, conversationId });
    const lastAi = all.filter((m: any) => m.sender === "assistant").at(-1);
    const text = String(lastAi?.content || lastAi?.suggestion || "");

    expect(text).toMatch(/14:00/);
    expect(text).not.toMatch(/Habitaci[oó]n Doble|contin[uú]e con la reserva/i);
  });

  it("con reserva confirmada, 'tienen late check out?' responde checkout contextual y no vuelve a pedir fecha", async () => {
    const conversationId = "conv-postbooking-checkout-1";
    (getConvState as any).mockResolvedValue(confirmedState(conversationId));

    await handleIncomingMessage(msg("tienen late check out?", conversationId), { mode: "automatic", sendReply });

    const all = await getCollection("messages").findMany({ hotelId, conversationId });
    const lastAi = all.filter((m: any) => m.sender === "assistant").at(-1);
    const text = String(lastAi?.content || lastAi?.suggestion || "");

    expect(text).toMatch(/11:00|recepci[oó]n/i);
    expect(text).not.toMatch(/fecha de check-out|dd\/mm\/aaaa/i);
    expect(text).not.toMatch(/Habitaci[oó]n Doble|contin[uú]e con la reserva/i);
  });
});
