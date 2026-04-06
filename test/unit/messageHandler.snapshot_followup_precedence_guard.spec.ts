import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.STRUCTURED_ENABLED = "false";

const stateByConversation = new Map<string, any>();

vi.mock("@/lib/astra_connection", async () => await import("../mocks/astra"));
vi.mock("@/lib/redis", async () => await import("../mocks/redis"));
vi.mock("@/lib/db/messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db_messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db/conversations", async () => await import("../mocks/db_conversations"));
vi.mock("@/lib/db_conversations", async () => await import("../mocks/db_conversations"));
vi.mock("@/lib/db/convState", () => ({
  getConvState: vi.fn(async (_hotelId: string, conversationId: string) => stateByConversation.get(conversationId) ?? null),
  upsertConvState: vi.fn(async () => {}),
  resolveGuestState: vi.fn(() => "booked"),
  CONVSTATE_VERSION: "convstate-test",
}));
vi.mock("@/lib/agents/stateUpdaterAgent", () => ({
  updateConversationState: vi.fn(async (hotelId: string, conversationId: string, patch: any) => {
    const prev = stateByConversation.get(conversationId) ?? {
      hotelId,
      conversationId,
      updatedAt: new Date().toISOString(),
    };
    stateByConversation.set(conversationId, { ...prev, ...patch });
  }),
}));
vi.mock("@/lib/agents", () => ({
  agentGraph: {
    invoke: vi.fn(async () => ({
      messages: [{ role: "assistant", content: "Respuesta LLM" }],
      category: "retrieval_based",
      meta: {},
    })),
  },
}));
vi.mock("@/lib/agents/knowledgeBaseAgent", () => ({
  answerWithKnowledge: vi.fn(async () => ({
    ok: true,
    category: "retrieval_based",
    answer: "contenido generico",
    retrieved: [],
  })),
}));
vi.mock("@/lib/prompts", () => ({
  defaultPrompt: "{{retrieved}}",
  curatedPrompts: {},
}));
vi.mock("@/lib/web/eventBus", () => ({ emitToConversation: vi.fn(() => {}) }));
vi.mock("@/lib/utils/debugLog", () => ({ debugLog: vi.fn() }));

import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import { updateConversationState } from "@/lib/agents/stateUpdaterAgent";
import { agentGraph } from "@/lib/agents";
import { answerWithKnowledge } from "@/lib/agents/knowledgeBaseAgent";

const hotelId = "hotel999";
const channel = "web" as const;

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

function seedSnapshotState(conversationId: string, overrides: Record<string, any> = {}) {
  stateByConversation.set(conversationId, {
    hotelId,
    conversationId,
    activeFlow: "modify_reservation",
    desiredAction: "modify",
    lastCategory: "modify_reservation",
    modifyState: { activeField: "guests" },
    selectedReservationTarget: {
      reservationId: "RES-A1",
      kind: "confirmed",
      source: "ordinal",
      resolutionMode: "strong",
      resolvedAt: new Date().toISOString(),
    },
    activeReservationContext: { kind: "reservation", reservationId: "RES-A1", updatedAt: new Date().toISOString() },
    reservationHistory: [
      {
        reservationId: "RES-A1",
        status: "created",
        createdAt: "2026-05-01T00:00:00.000Z",
        guestName: "Marcelo Martinez",
        roomType: "double",
        numGuests: "2",
        checkIn: "2026-05-01",
        checkOut: "2026-05-05",
        channel,
      },
    ],
    updatedAt: new Date().toISOString(),
    ...overrides,
  });
}

describe("messageHandler snapshot follow-up precedence guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stateByConversation.clear();
  });

  it.each([
    "mostrame cómo quedó",
    "ver resultado",
    "esa",
    "detalle",
    "cómo quedó",
  ])("prioriza snapshot sobre modify para '%s' con selectedReservationTarget", async (content) => {
    const conversationId = `conv-snapshot-precedence-selected-${content}`;
    seedSnapshotState(conversationId);
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg(content, conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/resumen de tu reserva|c[oó]digo:|habitaci[oó]n|fechas/i);
    expect(replyText).not.toMatch(/que cambio|cambio quer[eé]s|modificaci[oó]n|cambiar/i);
    expect(replyText).not.toMatch(/contenido generico|Respuesta LLM/i);
    expect((agentGraph as any).invoke).not.toHaveBeenCalled();
    expect((answerWithKnowledge as any)).not.toHaveBeenCalled();
    const st = stateByConversation.get(conversationId);
    expect(st?.lastCategory).toBe("reservation_snapshot");
  });

  it("usa activeReservationContext cuando no hay selectedReservationTarget", async () => {
    const conversationId = "conv-snapshot-precedence-active-only";
    seedSnapshotState(conversationId, { selectedReservationTarget: null });
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("detalle", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/resumen de tu reserva|c[oó]digo:|fechas/i);
    expect(replyText).not.toMatch(/cambio quer[eé]s|modificaci[oó]n/i);
    const st = stateByConversation.get(conversationId);
    expect(st?.lastCategory).toBe("reservation_snapshot");
  });

  it("mantiene precedencia de snapshot con contexto previo compatible", async () => {
    const conversationId = "conv-snapshot-precedence-prev-category";
    seedSnapshotState(conversationId, { lastCategory: "reservation_snapshot" });
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("esa", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/resumen de tu reserva|c[oó]digo:|fechas/i);
    expect(replyText).not.toMatch(/cambio quer[eé]s|modificaci[oó]n/i);
  });

  it("no cae en routing genérico aun con modifyState activo", async () => {
    const conversationId = "conv-snapshot-precedence-no-fallback";
    seedSnapshotState(conversationId, { modifyState: { activeField: "roomType" } });
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("mostrame como quedo", conversationId), { mode: "automatic", sendReply });

    const replyText = String((sendReply as any).mock.calls.at(-1)?.[0] || "");
    expect(replyText).toMatch(/resumen de tu reserva|c[oó]digo:|fechas/i);
    expect(replyText).not.toMatch(/contenido generico|Respuesta LLM/i);
  });

  it("no deja modifyState activo tras snapshot follow-up", async () => {
    const conversationId = "conv-snapshot-precedence-clears-modify";
    seedSnapshotState(conversationId);
    const sendReply = vi.fn(async () => {});

    await handleIncomingMessage(msg("ver resultado", conversationId), { mode: "automatic", sendReply });

    const st = stateByConversation.get(conversationId);
    expect(st?.modifyState).toBeNull();
    expect((updateConversationState as any)).toHaveBeenCalled();
  });
});
