// Path: /root/begasist/test/unit/messageHandler.autosend.safe_general.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Infra mocks
vi.mock("@/lib/astra_connection", async () => await import("../mocks/astra"));
vi.mock("@/lib/redis", async () => await import("../mocks/redis"));
vi.mock("@/lib/db/messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db_messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db/conversations", async () => await import("../mocks/db_conversations"));
vi.mock("@/lib/db_conversations", async () => await import("../mocks/db_conversations"));

// Mock agentGraph to return general safe categories
vi.mock("@/lib/agents", () => {
    return {
        agentGraph: {
            invoke: vi.fn(async (_args: any) => {
                const cat = (globalThis as any).__TEST_CATEGORY__ || "retrieval_based";
                const text = (globalThis as any).__TEST_TEXT__ || "Podés tomar un taxi o transfer desde el aeropuerto.";
                return { messages: [{ role: "assistant", content: text }], category: cat, reservationSlots: {} };
            }),
        },
    };
});

import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import { getCollection } from "../mocks/astra";

const BASE_MSG = {
    hotelId: "hotel999",
    channel: "web" as const,
    conversationId: "conv-auto-safe-1",
    messageId: "m-safe-1",
    sender: "guest",
    content: "¿Cómo llego desde el aeropuerto?",
    timestamp: new Date().toISOString(),
};

const PENDING_REGEX = /siendo revisada|revisada por un recepcionista|being reviewed by a receptionist/i;

describe("messageHandler autosend for safe general intents", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (globalThis as any).__TEST_TEXT__ = undefined;
        (globalThis as any).__TEST_CATEGORY__ = undefined;
    });

    it("retrieval_based en modo automatic: status 'sent' y no emite 'pendiente'", async () => {
        (globalThis as any).__TEST_CATEGORY__ = "retrieval_based";
        (globalThis as any).__TEST_TEXT__ = "Podés tomar un taxi, remis o transfer oficial desde el aeropuerto.";
        const sendReply = vi.fn(async (_t: string) => { });

        await handleIncomingMessage({ ...BASE_MSG }, { mode: "automatic", sendReply });

        const msgs = await getCollection("messages").findMany({ hotelId: BASE_MSG.hotelId, conversationId: BASE_MSG.conversationId });
        const ai = msgs.filter((m) => (m as any).sender === "assistant").at(-1)!;
        expect(ai.status).toBe("sent");

        expect(sendReply).toHaveBeenCalledTimes(1);
        const [arg] = sendReply.mock.calls[0];
        expect(String(arg)).not.toMatch(PENDING_REGEX);
        expect(String(arg)).toMatch(/taxi|transfer|remis/i);
    });

    it("directions_info en modo automatic: status 'sent' y no emite 'pendiente'", async () => {
        (globalThis as any).__TEST_CATEGORY__ = "directions_info";
        (globalThis as any).__TEST_TEXT__ = "Estamos a 20 minutos del aeropuerto; podés tomar taxi o transfer.";
        const sendReply = vi.fn(async (_t: string) => { });

        await handleIncomingMessage({ ...BASE_MSG, conversationId: "conv-auto-safe-2" }, { mode: "automatic", sendReply });

        const msgs = await getCollection("messages").findMany({ hotelId: BASE_MSG.hotelId, conversationId: "conv-auto-safe-2" });
        const ai = msgs.filter((m) => (m as any).sender === "assistant").at(-1)!;
        expect(ai.status).toBe("sent");

        expect(sendReply).toHaveBeenCalledTimes(1);
        const [arg] = sendReply.mock.calls[0];
        expect(String(arg)).not.toMatch(PENDING_REGEX);
        expect(String(arg)).toMatch(/minutos|taxi|transfer/i);
    });

    it("retrieval_based en modo supervised: status 'pending' y emite 'pendiente'", async () => {
        (globalThis as any).__TEST_CATEGORY__ = "retrieval_based";
        (globalThis as any).__TEST_TEXT__ = "Podés tomar un taxi o un transfer oficial.";
        const sendReply = vi.fn(async (_t: string) => { });

        await handleIncomingMessage({ ...BASE_MSG, conversationId: "conv-auto-safe-3" }, { mode: "supervised", sendReply });

        const msgs = await getCollection("messages").findMany({ hotelId: BASE_MSG.hotelId, conversationId: "conv-auto-safe-3" });
        const ai = msgs.filter((m) => (m as any).sender === "assistant").at(-1)!;
        expect(ai.status).toBe("pending");

        expect(sendReply).toHaveBeenCalledTimes(1);
        const [arg] = sendReply.mock.calls[0];
        expect(String(arg)).toMatch(PENDING_REGEX);
    });
});
