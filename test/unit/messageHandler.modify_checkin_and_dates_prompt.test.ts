import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.STRUCTURED_ENABLED = "false";

// Infra mocks
vi.mock("@/lib/astra_connection", async () => await import("../mocks/astra"));
vi.mock("@/lib/redis", async () => await import("../mocks/redis"));
vi.mock("@/lib/db/messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db_messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db/conversations", async () => await import("../mocks/db_conversations"));
vi.mock("@/lib/db_conversations", async () => await import("../mocks/db_conversations"));

// Mock agentGraph minimal
vi.mock("@/lib/agents", () => ({
    agentGraph: {
        invoke: vi.fn(async () => ({ messages: [{ role: "assistant", content: "¿Qué cambio deseas realizar?" }], category: "reservation" })),
    },
}));

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
const sendReply = vi.fn(async (_t: string) => { });

function baseUser(conversationId: string, content: string) {
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

describe("messageHandler: prompts for specific date(s) when user mentions check-in or just 'fechas'", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getConvState as any).mockResolvedValue({
            hotelId,
            conversationId: "conv-x",
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
    });

    it("cuando dice 'quiero modificar el check in' → pide la nueva fecha de check-in", async () => {
        const conversationId = "conv-mod-checkin-ask";
        await handleIncomingMessage(baseUser(conversationId, "quiero modificar el check in"), { mode: "automatic", sendReply });
        const msgs = await getCollection("messages").findMany({ hotelId, conversationId });
        const lastAi = msgs.filter((m: any) => m.sender === "assistant").at(-1);
        const txt = String(lastAi?.content || lastAi?.suggestion || "").toLowerCase();
        expect(txt).toMatch(/check-?in/);
        expect(txt).toMatch(/dd\/mm\/aaaa/);
        expect(txt).not.toMatch(/check-?out/);
    });

    it("cuando dice solo 'fechas' → pide check-in y check-out", async () => {
        const conversationId = "conv-just-fechas-ask-both";
        await handleIncomingMessage(baseUser(conversationId, "fechas"), { mode: "automatic", sendReply });
        const msgs = await getCollection("messages").findMany({ hotelId, conversationId });
        const lastAi = msgs.filter((m: any) => m.sender === "assistant").at(-1);
        const txt = String(lastAi?.content || lastAi?.suggestion || "").toLowerCase();
        expect(txt).toMatch(/check-?in/);
        expect(txt).toMatch(/check-?out/);
        expect(txt).toMatch(/dd\/mm\/aaaa/);
    });
});
