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

// Mock agentGraph: devolvemos textos mínimos, la lógica que nos interesa está en body/post-processing
vi.mock("@/lib/agents", () => {
    return {
        agentGraph: {
            invoke: vi.fn(async (_args: any) => {
                const text = (globalThis as any).__TEST_TEXT__ || "Entendido, dime qué deseas modificar.";
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
const conversationId = "conv-new-dates-ask-both-1";

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

describe("messageHandler: cuando dice 'nuevas fechas' sin fechas, el bot pide ambas", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (globalThis as any).__TEST_TEXT__ = undefined;
        (globalThis as any).__TEST_CATEGORY__ = undefined;
    });

    it("pide explícitamente check-in y check-out si no detecta ninguna fecha", async () => {
        // Estado con reserva confirmada
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

        await handleIncomingMessage(baseUser("nuevas fechas"), { mode: "automatic", sendReply });

        const msgs = await getCollection("messages").findMany({ hotelId, conversationId });
        const lastAi = msgs.filter((m: any) => m.sender === "assistant").at(-1);
        const txt = String(lastAi?.content || lastAi?.suggestion || "").toLowerCase();

        // Debe pedir ambas fechas (check-in y check-out)
        expect(txt).toMatch(/check\-?in/);
        expect(txt).toMatch(/check\-?out|salida/);
    });

    it("EN: 'new dates' sin fechas → pide check-in y check-out", async () => {
        (getConvState as any).mockResolvedValue({
            hotelId,
            conversationId: conversationId + "-en",
            reservationSlots: {
                guestName: "John Doe",
                roomType: "double",
                checkIn: "2025-10-02",
                checkOut: "2025-10-04",
                numGuests: "2",
            },
            salesStage: "close",
            updatedAt: new Date().toISOString(),
        });

        await handleIncomingMessage({
            hotelId,
            channel,
            conversationId: conversationId + "-en",
            messageId: `m-${Math.random().toString(36).slice(2, 9)}`,
            sender: "guest",
            role: "user",
            content: "new dates",
            detectedLanguage: "en",
            timestamp: new Date().toISOString(),
        } as any, { mode: "automatic", sendReply });

        const msgs = await getCollection("messages").findMany({ hotelId, conversationId: conversationId + "-en" });
        const lastAi = msgs.filter((m: any) => m.sender === "assistant").at(-1);
        const txt = String(lastAi?.content || lastAi?.suggestion || "").toLowerCase();
        expect(txt).toMatch(/check\-?in/);
        expect(txt).toMatch(/check\-?out/);
    });

    it("PT: 'datas novas' sin datas → pede check-in e check-out", async () => {
        (getConvState as any).mockResolvedValue({
            hotelId,
            conversationId: conversationId + "-pt",
            reservationSlots: {
                guestName: "João Silva",
                roomType: "double",
                checkIn: "2025-10-02",
                checkOut: "2025-10-04",
                numGuests: "2",
            },
            salesStage: "close",
            updatedAt: new Date().toISOString(),
        });

        await handleIncomingMessage({
            hotelId,
            channel,
            conversationId: conversationId + "-pt",
            messageId: `m-${Math.random().toString(36).slice(2, 9)}`,
            sender: "guest",
            role: "user",
            content: "datas novas",
            detectedLanguage: "pt",
            timestamp: new Date().toISOString(),
        } as any, { mode: "automatic", sendReply });

        const msgs = await getCollection("messages").findMany({ hotelId, conversationId: conversationId + "-pt" });
        const lastAi = msgs.filter((m: any) => m.sender === "assistant").at(-1);
        const txt = String(lastAi?.content || lastAi?.suggestion || "").toLowerCase();
        expect(txt).toMatch(/check\-?in|entrada/);
        expect(txt).toMatch(/check\-?out|sa[ií]da/);
    });
});
