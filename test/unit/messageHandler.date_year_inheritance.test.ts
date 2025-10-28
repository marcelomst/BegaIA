import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.STRUCTURED_ENABLED = "false";

vi.mock("@/lib/astra_connection", async () => await import("../mocks/astra"));
vi.mock("@/lib/redis", async () => await import("../mocks/redis"));
vi.mock("@/lib/db/messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db_messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db/conversations", async () => await import("../mocks/db_conversations"));
vi.mock("@/lib/db_conversations", async () => await import("../mocks/db_conversations"));

vi.mock("@/lib/agents", () => {
  return {
    agentGraph: {
      invoke: vi.fn(async () => {
        const text = (globalThis as any).__TEST_TEXT__ || "Podemos modificar tu reserva confirmada. Dime qué quieres cambiar.";
        return { messages: [{ role: "assistant", content: text }], category: (globalThis as any).__TEST_CATEGORY__ || "reservation" };
      }),
    },
  };
});

import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import { getCollection } from "../mocks/astra";
import { getConvState } from "@/lib/db/convState";

vi.mock("@/lib/db/convState", () => ({
  getConvState: vi.fn(),
  upsertConvState: vi.fn(),
  CONVSTATE_VERSION: "convstate-test",
}));

const hotelId = "hotel999";
const channel = "web" as const;
const conversationId = "conv-year-inheritance-1";

const baseUser = (content: string) => ({
  hotelId,
  channel,
  conversationId,
  messageId: `m-${Math.random().toString(36).slice(2, 9)}`,
  sender: "guest" as const,
  role: "user" as const,
  content,
  timestamp: new Date().toISOString(),
});

const sendReply = vi.fn(async () => { });

/**
 * Escenario: Usuario da check-in con año completo (03/12/2025). Luego responde sólo "05/12" (sin año) como segunda fecha.
 * Se espera que el sistema herede 2025 y confirme rango 03/12/2025 → 05/12/2025 sin repreguntar.
 */

describe("messageHandler: herencia de año en segunda fecha sin año", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getConvState as any).mockResolvedValue({
      hotelId,
      conversationId,
      reservationSlots: {
        guestName: "Tester",
        roomType: "double",
        checkIn: "2025-11-30",
        checkOut: "2025-12-02",
        numGuests: "2",
      },
      salesStage: "close",
      updatedAt: new Date().toISOString(),
    });
  });

  it("hereda el año del check-in previo y confirma rango", async () => {
    // Usuario indica nuevo check-in explícito
    await handleIncomingMessage(baseUser("nuevo check in 03/12/2025"), { mode: "automatic", sendReply });

    // Usuario da sólo día/mes para el check-out
    await handleIncomingMessage(baseUser("05/12"), { mode: "automatic", sendReply });

    const msgs = await getCollection("messages").findMany({ hotelId, conversationId });
    const lastAi = msgs.filter((m: any) => m.sender === "assistant").at(-1);
    const txt = String(lastAi?.content || lastAi?.suggestion || "");
    // Debe contener rango completo con año heredado
    expect(txt).toMatch(/03\/12\/2025/);
    expect(txt).toMatch(/05\/12\/2025/);
    // No debe volver a pedir check-out
    expect(txt.toLowerCase()).not.toMatch(/fecha.*check\-?out|cu[aá]l es la fecha de check\-?out/);
  });
});
