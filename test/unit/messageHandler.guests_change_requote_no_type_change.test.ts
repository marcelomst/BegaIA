import { describe, it, expect, vi, beforeEach } from "vitest";

// Desactivar structured para este test (evita llamadas externas)
process.env.STRUCTURED_ENABLED = "false";
// Activar planner/orquestador para este flujo
process.env.USE_ORCHESTRATOR_AGENT = "1";
process.env.USE_MH_FLOW_GRAPH = "1";
process.env.USE_PRE_POS_PIPELINE = "1";

// Infra mocks
vi.mock("@/lib/astra_connection", async () => await import("../mocks/astra"));
vi.mock("@/lib/redis", async () => await import("../mocks/redis"));
vi.mock("@/lib/db/messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db_messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db/conversations", async () => await import("../mocks/db_conversations"));
vi.mock("@/lib/db_conversations", async () => await import("../mocks/db_conversations"));

// Mock agentGraph para respuesta mínima; el handler se encarga del flujo
vi.mock("@/lib/agents", () => {
    return {
        agentGraph: {
            invoke: vi.fn(async (_args: any) => {
                const text = (globalThis as any).__TEST_TEXT__ || "Entendido.";
                return { messages: [{ role: "assistant", content: text }], category: (globalThis as any).__TEST_CATEGORY__ || "reservation" };
            }),
        },
    };
});

// Mock de askAvailability para controlar el cálculo
vi.mock("@/lib/agents/reservations", () => ({
    askAvailability: vi.fn(),
}));

import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import { getCollection } from "../mocks/astra";
import { getConvState } from "@/lib/db/convState";
import { askAvailability } from "@/lib/agents/reservations";

vi.mock("@/lib/db/convState", () => ({
    getConvState: vi.fn(),
    upsertConvState: vi.fn(),
    CONVSTATE_VERSION: "convstate-test",
}));

const hotelId = "hotel999";
const channel = "web" as const;
const conversationId = "conv-guests-change-requote-2";

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

describe("messageHandler: cambio de huéspedes sin cambio de tipo → ack y recotiza", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("cuando el usuario pasa de 1 a 2 huéspedes en 'double', mantiene 'double', reconoce el cambio y recotiza", async () => {
        // Reafirmar flags por si otros tests los modificaron
        process.env.USE_ORCHESTRATOR_AGENT = "1";
        process.env.USE_MH_FLOW_GRAPH = "1";
        process.env.USE_PRE_POS_PIPELINE = "1";
        // Estado previo: reserva confirmada con double para 1 pax, fechas conocidas
        (getConvState as any).mockResolvedValue({
            hotelId,
            conversationId,
            reservationSlots: {
                guestName: "Marcelo Martinez",
                roomType: "double",
                checkIn: "2025-10-02",
                checkOut: "2025-10-04",
                numGuests: "1",
            },
            salesStage: "close",
            updatedAt: new Date().toISOString(),
        });

        // Mock de disponibilidad para 2 pax en 'double' → 120 USD/noche
        (askAvailability as any).mockResolvedValueOnce({
            ok: true,
            available: true,
            proposal: "Tengo double disponible. Tarifa por noche: 120 USD.",
            options: [
                { roomType: "double", pricePerNight: 120, currency: "USD", availability: 2 },
            ],
        });

        // Usuario indica nueva cantidad de huéspedes que no requiere cambio de tipo
        await handleIncomingMessage(msg("somos 2 huéspedes"), { mode: "automatic", sendReply });

        // Verificamos el último mensaje del asistente
        const all = await getCollection("messages").findMany({ hotelId, conversationId });
        const lastAi = all.filter((m: any) => m.sender === "assistant").at(-1);
        const txt = String(lastAi?.content || lastAi?.suggestion || "");

        // Debe reconocer el ajuste de capacidad, pero no decir que ajustó el tipo
        expect(txt.toLowerCase()).toMatch(/actualic[eé]\s+la\s+capacidad\s+a\s*2/);
        expect(txt.toLowerCase()).not.toMatch(/ajust[eé]\s+el\s+tipo\s+a/);

        // Debe incluir recotización con total de 2 noches (120 x 2 = 240)
        expect(txt).toMatch(/Tarifa por noche: 120 USD/i);
        expect(txt).toMatch(/Total\s+2\s+noches:\s*240\s+USD/i);

        // Y debe invitar a confirmar
        expect(txt).toMatch(/¿Confirmás la reserva\?|Confirma a reserva|Do you confirm the booking/i);

        // Verificar el payload usado para disponibilidad: 2 pax y tipo 'double'
        expect((askAvailability as any).mock.calls.length).toBe(1);
        const callArgs = (askAvailability as any).mock.calls[0];
        expect(callArgs[0]).toBe(hotelId);
        expect(callArgs[1]).toMatchObject({
            roomType: "double",
            numGuests: "2",
            checkIn: "2025-10-02",
            checkOut: "2025-10-04",
        });
    });
});
