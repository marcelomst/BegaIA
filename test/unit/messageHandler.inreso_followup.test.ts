import { describe, it, expect, vi, beforeEach } from "vitest";

// Desactivar structured para este test (evita llamadas externas)
process.env.STRUCTURED_ENABLED = "false";

// Infra mocks
vi.mock("@/lib/astra_connection", async () => await import("../mocks/astra"));
vi.mock("@/lib/redis", async () => await import("../mocks/redis"));
vi.mock("@/lib/db/messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db_messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db/conversations", async () => await import("../mocks/db_conversations"));
vi.mock("@/lib/db_conversations", async () => await import("../mocks/db_conversations"));

// Mock agentGraph: devolvemos textos mínimos
vi.mock("@/lib/agents", () => {
    return {
        agentGraph: {
            invoke: vi.fn(async (_args: any) => {
                const text = (globalThis as any).__TEST_TEXT__ || "Ok, dime los cambios de fechas";
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
const conversationId = "conv-inreso-followup-1";

const baseUser = (content: string, ts?: string) => ({
    hotelId,
    channel,
    conversationId,
    messageId: `m-${Math.random().toString(36).slice(2, 9)}`,
    sender: "guest" as const,
    role: "user" as const,
    content,
    timestamp: ts || new Date().toISOString(),
});

const sendReply = vi.fn(async (_t: string) => { });

describe("messageHandler: typo 'inreso' debe ser interpretado como check-in en follow-up de una fecha", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (globalThis as any).__TEST_TEXT__ = undefined;
        (globalThis as any).__TEST_CATEGORY__ = undefined;
    });

    it("respeta 'inreso' como check-in y pide check-out si falta", async () => {
        (getConvState as any).mockResolvedValue({
            hotelId,
            conversationId,
            reservationSlots: {
                guestName: "Marcelo Martinez",
                roomType: "double",
                checkIn: "2025-10-02",
                checkOut: "2025-10-04",
                numGuests: "2",
            },
            salesStage: "close",
            updatedAt: new Date().toISOString(),
        });

        // Usuario indica check-in con typo y solo una fecha
        await handleIncomingMessage(baseUser("fecha de inreso: 03/10/2025"), { mode: "automatic", sendReply });

        const msgs = await getCollection("messages").findMany({ hotelId, conversationId });
        const lastAi = msgs.filter((m: any) => m.sender === "assistant").at(-1);
        const txt = String(lastAi?.content || lastAi?.suggestion || "").toLowerCase();

        // Debe pedir check-out, no insistir en check-in
        expect(txt).toMatch(/check\-?out|salida/);
        expect(txt).not.toMatch(/check\-?in/);
    });
});
