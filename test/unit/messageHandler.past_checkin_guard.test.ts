import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.STRUCTURED_ENABLED = "false";

vi.mock("@/lib/astra_connection", async () => await import("../mocks/astra"));
vi.mock("@/lib/redis", async () => await import("../mocks/redis"));
vi.mock("@/lib/db/messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db_messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db/conversations", async () => await import("../mocks/db_conversations"));
vi.mock("@/lib/db_conversations", async () => await import("../mocks/db_conversations"));

vi.mock("@/lib/agents", () => ({
    agentGraph: {
        invoke: vi.fn(async () => ({ messages: [{ role: "assistant", content: "Entendido." }], category: "reservation" })),
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
const conversationId = "conv-past-checkin-1";
const sendReply = vi.fn(async (_t: string) => { });

function msg(content: string, convId = conversationId) {
    return {
        hotelId,
        channel,
        conversationId: convId,
        messageId: `m-${Math.random().toString(36).slice(2, 9)}`,
        sender: "guest" as const,
        role: "user" as const,
        content,
        detectedLanguage: "es",
        timestamp: new Date().toISOString(),
    };
}

describe("messageHandler: guard de check-in pasado en follow-up real", () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        const messages = getCollection("messages");
        const conversations = getCollection("conversations");
        for (const row of await messages.findMany({})) {
            await messages.deleteOne({ _id: row._id });
        }
        for (const row of await conversations.findMany({})) {
            await conversations.deleteOne({ _id: row._id });
        }
    });

    it("si el usuario informa un check-in pasado, no pide check-out y repregunta check-in", async () => {
        (getConvState as any).mockResolvedValue({
            hotelId,
            conversationId,
            reservationSlots: {
                roomType: "double",
            },
            salesStage: "qualify",
            updatedAt: new Date().toISOString(),
        });

        await getCollection("messages").insertOne({
            _id: "prev-ai-checkin",
            messageId: "prev-ai-checkin",
            hotelId,
            conversationId,
            channel,
            sender: "assistant",
            role: "ai",
            content: "¿Cuál es la fecha de check-in?",
            timestamp: new Date(Date.now() - 1000).toISOString(),
        });

        await handleIncomingMessage(msg("21/02/2026"), { mode: "automatic", sendReply });

        const all = await getCollection("messages").findMany({ hotelId, conversationId });
        const lastAi = all.filter((m: any) => m.sender === "assistant").at(-1);
        const text = String(lastAi?.content || lastAi?.suggestion || "");

        expect(text).toMatch(/ya pasó/i);
        expect(text).toMatch(/nueva fecha de check-in/i);
        expect(text).not.toMatch(/check-out/i);
    });

    it("si el usuario informa un check-in futuro válido, sigue pidiendo check-out", async () => {
        const convId = "conv-past-checkin-2";
        (getConvState as any).mockResolvedValue({
            hotelId,
            conversationId: convId,
            reservationSlots: {
                roomType: "double",
            },
            salesStage: "qualify",
            updatedAt: new Date().toISOString(),
        });

        await getCollection("messages").insertOne({
            _id: "prev-ai-checkin-2",
            messageId: "prev-ai-checkin-2",
            hotelId,
            conversationId: convId,
            channel,
            sender: "assistant",
            role: "ai",
            content: "¿Cuál es la fecha de check-in?",
            timestamp: new Date(Date.now() - 1000).toISOString(),
        });

        await handleIncomingMessage(msg("21/04/2026", convId), { mode: "automatic", sendReply });

        const all = await getCollection("messages").findMany({ hotelId, conversationId: convId });
        const lastAi = all.filter((m: any) => m.sender === "assistant").at(-1);
        const text = String(lastAi?.content || lastAi?.suggestion || "");

        expect(text).toMatch(/check-out/i);
    });

    it("si el usuario corrige una fecha pasada con una nueva válida, no reutiliza la fecha inválida anterior", async () => {
        const convId = "conv-past-checkin-3";
        (getConvState as any).mockResolvedValue({
            hotelId,
            conversationId: convId,
            reservationSlots: {
                roomType: "double",
            },
            salesStage: "qualify",
            updatedAt: new Date().toISOString(),
        });

        await getCollection("messages").insertOne({
            _id: "prev-ai-checkin-3",
            messageId: "prev-ai-checkin-3",
            hotelId,
            conversationId: convId,
            channel,
            sender: "assistant",
            role: "ai",
            content: "¿Cuál es la fecha de check-in?",
            timestamp: new Date(Date.now() - 2000).toISOString(),
        });

        await handleIncomingMessage(msg("21/02/2026", convId), { mode: "automatic", sendReply });
        await handleIncomingMessage(msg("21/03/2026", convId), { mode: "automatic", sendReply });

        const all = await getCollection("messages").findMany({ hotelId, conversationId: convId });
        const lastAi = all.filter((m: any) => m.sender === "assistant").at(-1);
        const text = String(lastAi?.content || lastAi?.suggestion || "");

        expect(text).toMatch(/check-out/i);
        expect(text).not.toMatch(/21\/02\/2026/);
        expect(text).not.toMatch(/anot[eé] nuevas fechas/i);
    });
});
