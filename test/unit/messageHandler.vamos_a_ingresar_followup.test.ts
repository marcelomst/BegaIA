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
const conversationId = "conv-vamos-ingresar-followup-1";

const sendReply = vi.fn(async (_t: string) => { });

function msg(content: string) {
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

describe("messageHandler: follow-up 'vamos a ingresar 03/10/2025' → luego '05/10/2025' consolida y no deriva", () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
    });

    it("pide check-out y luego confirma 03/10/2025 → 05/10/2025 sin retrieval", async () => {
        // Paso 1: usuario da solo el check-in (frase exacta del reporte)
        await handleIncomingMessage(msg("vamos a ingresar el 03/10/2025"), { mode: "automatic", sendReply });
        let all = await getCollection("messages").findMany({ hotelId, conversationId });
        let lastAi = all.filter((m: any) => m.sender === "assistant").at(-1);
        let txt = String(lastAi?.content || lastAi?.suggestion || "").toLowerCase();
        expect(txt).toMatch(/check-?out|salida/);

        // Paso 2: usuario responde con la fecha de check-out
        await handleIncomingMessage(msg("05/10/2025"), { mode: "automatic", sendReply });
        all = await getCollection("messages").findMany({ hotelId, conversationId });
        lastAi = all.filter((m: any) => m.sender === "assistant").at(-1);
        txt = String(lastAi?.content || lastAi?.suggestion || "");

        // Debe consolidar el rango y no desviarse a retrieval
        expect(txt).toMatch(/03\/10\/2025/);
        expect(txt).toMatch(/05\/10\/2025/);
        expect(txt.toLowerCase()).toMatch(/verifique disponibilidad|verificar a disponibilidade|check availability/);
        expect(txt.toLowerCase()).not.toMatch(/no tengo información|hotel dem[oó]/);
    });
});
