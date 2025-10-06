import { describe, it, expect, vi, beforeEach } from "vitest";

// Evitar structured calls
process.env.STRUCTURED_ENABLED = "false";

vi.mock("@/lib/db/convState", () => ({ getConvState: vi.fn(), upsertConvState: vi.fn(), CONVSTATE_VERSION: "convstate-test" }));

import { agentGraph } from "@/lib/agents/graph";
import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import { getConvState } from "@/lib/db/convState";
import { getCollection } from "./mocks/astra";

const hotelId = "hotel999";
const channel = "web" as const;
const conversationId = "conv-e2e-modify-followup-1";

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
        timestamp: new Date().toISOString(),
    };
}

describe("E2E: modificación con una sola fecha y seguimiento", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("pide la fecha faltante tras una sola fecha y luego no repregunta", async () => {
        // Estado base: reserva confirmada
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

        // 1) Usuario: hola, tengo una reserva
        await handleIncomingMessage(msg("hola, creo que tengo una reserva"), { mode: "automatic", sendReply });
        // 2) Usuario: quiero modificarla
        await handleIncomingMessage(msg("quiero modificarla"), { mode: "automatic", sendReply });
        // 3) Usuario: una sola fecha
        await handleIncomingMessage(msg("vamos a ingresar el 03/10/2025"), { mode: "automatic", sendReply });
        // Ver respuesta: pide la fecha faltante (check-out)
        let all = await getCollection("messages").findMany({ hotelId, conversationId });
        let lastAi = all.filter((m: any) => m.sender === "assistant").at(-1);
        expect(String(lastAi?.content || lastAi?.suggestion || "")).toMatch(/check\-?out|salida|check\s*out/i);

        // 4) Usuario: responde la otra fecha
        await handleIncomingMessage(msg("04/10/2025"), { mode: "automatic", sendReply });
        all = await getCollection("messages").findMany({ hotelId, conversationId });
        lastAi = all.filter((m: any) => m.sender === "assistant").at(-1);
        const t = String(lastAi?.content || lastAi?.suggestion || "");
        // No debe repreguntar nuevamente por check-out
        expect(t).not.toMatch(/confirmarme.*check\-?out|fecha de check\-?out/i);
    });
});
