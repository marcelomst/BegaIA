import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.STRUCTURED_ENABLED = "false";

vi.mock("@/lib/astra_connection", async () => await import("../mocks/astra"));
vi.mock("@/lib/redis", async () => await import("../mocks/redis"));
vi.mock("@/lib/db/messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db/conversations", async () => await import("../mocks/db_conversations"));

vi.mock("@/lib/agents", () => ({
    agentGraph: { invoke: vi.fn(async () => ({ messages: [{ role: "assistant", content: "" }], category: "retrieval_based" })) },
}));

// Mock sendReservationCopy to avoid real SMTP
vi.mock("@/lib/email/sendReservationCopy", () => ({
    sendReservationCopy: vi.fn(async () => { /* noop */ }),
}));

// Habilitar envío (simulado) para la prueba
process.env.EMAIL_SENDING_ENABLED = "true";

// Mock hotel config email channel
vi.mock("@/lib/config/hotelConfig.server", () => ({
    getHotelConfig: vi.fn(async (_hotelId: string) => ({
        hotelName: "Hotel Demo",
        channelConfigs: {
            email: { smtpHost: "smtp.example.com", smtpPort: 587, dirEmail: "noreply@example.com", password: "x", enabled: true, mode: "supervised" },
        },
    })),
}));

import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import { getCollection } from "../mocks/astra";

const hotelId = "hotel999";
const channel = "web" as const;
const conversationId = "conv-email-copy-1";
const sendReply = vi.fn(async (_: string) => { });

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

describe("email copy flow", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("asks for email address when user requests a copy without providing one", async () => {
        await handleIncomingMessage({ ...baseUser("¿Me podés enviar una copia por correo?") } as any, { mode: "automatic", sendReply });
        const msgs = await getCollection("messages").findMany({ hotelId, conversationId });
        const lastAi = msgs.filter((m: any) => m.sender === "assistant").at(-1);
        const txt = String(lastAi?.content || lastAi?.suggestion || "");
        expect(txt).toMatch(/correo|e-?mail|email/i);
    });

    it("sends when email is present inline", async () => {
        await handleIncomingMessage({ ...baseUser("Enviá una copia al email cliente@test.com") } as any, { mode: "automatic", sendReply });
        const msgs = await getCollection("messages").findMany({ hotelId, conversationId });
        const lastAi = msgs.filter((m: any) => m.sender === "assistant").at(-1);
        const txt = String(lastAi?.content || lastAi?.suggestion || "");
        expect(txt).toMatch(/envi[eé]|sent|enviei/i);
        expect(txt).toMatch(/cliente@test.com/);
    });
});
