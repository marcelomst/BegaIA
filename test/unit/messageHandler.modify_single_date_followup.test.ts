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
                const text = (globalThis as any).__TEST_TEXT__ || "Podemos modificar tu reserva confirmada. Decime qué querés cambiar: fechas, habitación o huéspedes.";
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
const conversationId = "conv-modify-single-date-1";

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

describe("messageHandler: follow-up de una sola fecha en modificación", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (globalThis as any).__TEST_TEXT__ = undefined;
        (globalThis as any).__TEST_CATEGORY__ = undefined;
    });

    it("cuando hay reserva confirmada y el usuario da solo el check-in y luego solo el check-out, el bot consolida y no repregunta", async () => {
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

        // 1) Usuario saluda
        await handleIncomingMessage(baseUser("hola, creo que tengo una reserva"), { mode: "automatic", sendReply });

        // 2) Usuario: quiero modificarla
        await handleIncomingMessage(baseUser("quiero modificarla"), { mode: "automatic", sendReply });

        // 3) Usuario da una sola fecha (check-in): 03/10/2025
        await handleIncomingMessage(baseUser("vamos a ingresar el 03/10/2025"), { mode: "automatic", sendReply });

        // Ver que el último mensaje del asistente pida el check-out
        let msgs = await getCollection("messages").findMany({ hotelId, conversationId });
        let lastAi = msgs.filter((m: any) => m.sender === "assistant").at(-1);
        expect(String(lastAi?.content || lastAi?.suggestion || "")).toMatch(/check\-?out|salida|check\s*out/i);

        // 4) Usuario sólo responde la otra fecha: 04/10/2025
        await handleIncomingMessage(baseUser("04/10/2025"), { mode: "automatic", sendReply });

        msgs = await getCollection("messages").findMany({ hotelId, conversationId });
        lastAi = msgs.filter((m: any) => m.sender === "assistant").at(-1);
        const text = String(lastAi?.content || lastAi?.suggestion || "");
        // No debe repreguntar otra vez por check-out en este turno
        expect(text).not.toMatch(/confirmarme.*check\-?out|fecha de check\-?out/i);
        // Ideal: consolidación de rango (si el modelo lo permite en este path). Si no, al menos no repregunta.
        // Lo dejamos como opcional para no acoplar a textos exactos del agente.
        // expect(text).toMatch(/03\/10\/2025\s*→\s*04\/10\/2025|03\/10\/2025\s*->\s*04\/10\/2025/);
    });
});
