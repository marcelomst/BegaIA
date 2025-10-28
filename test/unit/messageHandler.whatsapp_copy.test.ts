import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.STRUCTURED_ENABLED = "false";
// Desactivar dispatch remoto por defecto para evitar dependencia de Redis en este test
process.env.WA_REMOTE_DISPATCH = '0';
// Forzar socket listo para simplificar branch (evita intento de publish + fallback)
vi.mock('@/lib/adapters/whatsappBaileysAdapter', () => ({
    isWhatsAppReady: () => true,
}));

vi.mock("@/lib/astra_connection", async () => await import("../mocks/astra"));
vi.mock("@/lib/redis", async () => await import("../mocks/redis"));
vi.mock("@/lib/db/messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db/conversations", async () => await import("../mocks/db_conversations"));

vi.mock("@/lib/agents", () => ({
    agentGraph: { invoke: vi.fn(async () => ({ messages: [{ role: "assistant", content: "" }], category: "retrieval_based" })) },
}));

// Mock WA copy sender to avoid real socket
vi.mock("@/lib/whatsapp/sendReservationCopyWA", () => ({
    sendReservationCopyWA: vi.fn(async () => { /* noop */ }),
}));

import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import { getCollection } from "../mocks/astra";

const hotelId = "hotel999";
const channel = "whatsapp" as const;
const guestId = "5491100000000@s.whatsapp.net";
const conversationId = `${hotelId}-whatsapp-${guestId}`;
const sendReply = vi.fn(async (_: string) => { });

const baseUser = (content: string) => ({
    hotelId,
    channel,
    conversationId,
    messageId: `m-${Math.random().toString(36).slice(2, 9)}`,
    sender: "guest" as const,
    role: "user" as const,
    content,
    guestId,
    timestamp: new Date().toISOString(),
});

describe("whatsapp copy flow", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("sends when user asks to send a copy via WhatsApp", async () => {
        await handleIncomingMessage({ ...baseUser("Mandame la copia por WhatsApp") } as any, { mode: "automatic", sendReply });
        const msgs = await getCollection("messages").findMany({ hotelId, conversationId });
        const lastAi = msgs.filter((m: any) => m.sender === "assistant").at(-1);
        const txt = String(lastAi?.content || lastAi?.suggestion || "");
        expect(txt).toMatch(/copia.*whats?app|copy via whatsapp/i);
    });

    it("from web: asks for number then sends after phone is provided", async () => {
        const webConv = `${hotelId}-web-guest-1`;
        // 1) Usuario en web pide la copia por WhatsApp
        await handleIncomingMessage({
            hotelId,
            channel: "web",
            conversationId: webConv,
            messageId: `m-${Math.random().toString(36).slice(2, 9)}`,
            sender: "guest",
            role: "user",
            content: "Mandame la copia por WhatsApp",
            timestamp: new Date().toISOString(),
        } as any, { mode: "automatic", sendReply });
        // 2) Usuario responde con un teléfono
        await handleIncomingMessage({
            hotelId,
            channel: "web",
            conversationId: webConv,
            messageId: `m-${Math.random().toString(36).slice(2, 9)}`,
            sender: "guest",
            role: "user",
            content: "+5491100000000",
            timestamp: new Date().toISOString(),
        } as any, { mode: "automatic", sendReply });

        const msgs = await getCollection("messages").findMany({ hotelId, conversationId: webConv });
        const lastAi = msgs.filter((m: any) => m.sender === "assistant").at(-1);
        const txt = String(lastAi?.content || lastAi?.suggestion || "");
        expect(txt).toMatch(/copia.*whats?app|copy via whatsapp/i);
    });
});
