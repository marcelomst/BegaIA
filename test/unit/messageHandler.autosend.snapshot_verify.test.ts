// Path: /root/begasist/test/unit/messageHandler.autosend.snapshot_verify.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Infra mocks
vi.mock("@/lib/astra_connection", async () => await import("../mocks/astra"));
vi.mock("@/lib/redis", async () => await import("../mocks/redis"));
vi.mock("@/lib/db/messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db_messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db/conversations", async () => await import("../mocks/db_conversations"));
vi.mock("@/lib/db_conversations", async () => await import("../mocks/db_conversations"));

// Mock agentGraph to return safe categories and optionally salesStage
vi.mock("@/lib/agents", () => {
    return {
        agentGraph: {
            invoke: vi.fn(async (_args: any) => {
                // category and messages are driven by test case via global flags
                const cat = (globalThis as any).__TEST_CATEGORY__ || "reservation_snapshot";
                const text = (globalThis as any).__TEST_TEXT__ || "📄 Snapshot de tu reserva.";
                const salesStage = (globalThis as any).__TEST_SALES_STAGE__;
                return { messages: [{ role: "assistant", content: text }], category: cat, reservationSlots: {}, salesStage };
            }),
        },
    };
});

import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import { getCollection } from "../mocks/astra";

const BASE_MSG = {
    hotelId: "hotel999",
    channel: "web" as const,
    conversationId: "conv-auto-1",
    messageId: "m-1",
    sender: "guest",
    content: "quiero verificar mi reserva",
    timestamp: new Date().toISOString(),
};

const PENDING_REGEX = /siendo revisada|revisada por un recepcionista|being reviewed by a receptionist/i;

describe("messageHandler autosend for snapshot/verify", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (globalThis as any).__TEST_TEXT__ = undefined;
        (globalThis as any).__TEST_CATEGORY__ = undefined;
        (globalThis as any).__TEST_SALES_STAGE__ = undefined;
    });

    it("reservation_snapshot: status 'sent' y no emite mensaje de pendiente", async () => {
        (globalThis as any).__TEST_CATEGORY__ = "reservation_snapshot";
        (globalThis as any).__TEST_TEXT__ = "✅ Reserva confirmada: R-0001";
        const sendReply = vi.fn(async (_t: string) => { });

        await handleIncomingMessage({ ...BASE_MSG }, { mode: "supervised", sendReply });

        const msgs = await getCollection("messages").findMany({ hotelId: BASE_MSG.hotelId, conversationId: BASE_MSG.conversationId });
        const ai = msgs.filter((m) => (m as any).sender === "assistant").at(-1)!;
        expect(ai.status).toBe("sent");

        // Solo se debe enviar la respuesta final, sin acuse de pendiente
        expect(sendReply).toHaveBeenCalledTimes(1);
        const [arg] = sendReply.mock.calls[0];
        expect(String(arg)).not.toMatch(PENDING_REGEX);
        expect(String(arg)).toMatch(/Reserva confirmada|Snapshot/i);
    });

    it("reservation_verify: status 'sent' y no emite mensaje de pendiente", async () => {
        (globalThis as any).__TEST_CATEGORY__ = "reservation_verify";
        (globalThis as any).__TEST_TEXT__ = "Para verificar tu reserva necesito el código o nombre + fechas";
        const sendReply = vi.fn(async (_t: string) => { });

        await handleIncomingMessage({ ...BASE_MSG, conversationId: "conv-auto-2" }, { mode: "supervised", sendReply });

        const msgs = await getCollection("messages").findMany({ hotelId: BASE_MSG.hotelId, conversationId: "conv-auto-2" });
        const ai = msgs.filter((m) => (m as any).sender === "assistant").at(-1)!;
        expect(ai.status).toBe("sent");

        expect(sendReply).toHaveBeenCalledTimes(1);
        const [arg] = sendReply.mock.calls[0];
        expect(String(arg)).not.toMatch(PENDING_REGEX);
        expect(String(arg)).toMatch(/código|fechas|verificar/i);
    });

    it("reservation (salesStage=close): status 'sent' y no emite mensaje de pendiente", async () => {
        (globalThis as any).__TEST_CATEGORY__ = "reservation";
        (globalThis as any).__TEST_SALES_STAGE__ = "close";
        (globalThis as any).__TEST_TEXT__ = "✅ Reserva confirmada y cerrada";
        const sendReply = vi.fn(async (_t: string) => { });

        await handleIncomingMessage({ ...BASE_MSG, conversationId: "conv-auto-3" }, { mode: "supervised", sendReply });

        const msgs = await getCollection("messages").findMany({ hotelId: BASE_MSG.hotelId, conversationId: "conv-auto-3" });
        const ai = msgs.filter((m) => (m as any).sender === "assistant").at(-1)!;
        expect(ai.status).toBe("sent");

        expect(sendReply).toHaveBeenCalledTimes(1);
        const [arg] = sendReply.mock.calls[0];
        expect(String(arg)).not.toMatch(PENDING_REGEX);
        expect(String(arg)).toMatch(/confirmada|cerrada|close/i);
    });
});
