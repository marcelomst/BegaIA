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
                // category libre; la respuesta de texto será sobreescrita por post-proc si hace falta
                const text = (globalThis as any).__TEST_TEXT__ || "Perfecto, dime qué deseas modificar de tu reserva.";
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
const conversationId = "conv-confirm-both-dates-1";

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

describe("messageHandler: cuando el usuario da ambas fechas, confirma y no deriva a contacto", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (globalThis as any).__TEST_TEXT__ = undefined;
        (globalThis as any).__TEST_CATEGORY__ = undefined;
    });

    it("con reserva confirmada y rango completo en un solo mensaje → confirma el rango y evita handoff", async () => {
        // Estado con reserva confirmada existente
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

        // Mensaje del usuario con rango completo (ES)
        await handleIncomingMessage({
            ...baseUser("del 03/10/2025 al 05/10/2025"),
            detectedLanguage: "es",
        } as any, { mode: "automatic", sendReply });

        const msgs = await getCollection("messages").findMany({ hotelId, conversationId });
        const lastAi = msgs.filter((m: any) => m.sender === "assistant").at(-1);
        const txt = String(lastAi?.content || lastAi?.suggestion || "").toLowerCase();

        // Debe mencionar ambas fechas en formato dd/mm/aaaa (confirmación del rango)
        expect(txt).toMatch(/03\/10\/2025/);
        expect(txt).toMatch(/05\/10\/2025/);

        // No debe sugerir contactar al hotel (anti-derivación)
        expect(txt).not.toMatch(/contact(a|e|ar|o|os)|comunica(?:te|rse)|tel[eé]fono|whatsapp|correo|email/);
    });
});
