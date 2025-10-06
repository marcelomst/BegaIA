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

// Mock agentGraph para no depender del LLM; el post-procesamiento/handlers hacen el trabajo
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

// Mock de askAvailability para controlar la recotización
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
const conversationId = "conv-guests-change-requote-1";

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

describe("messageHandler: cambio de huéspedes autoajusta tipo y recotiza en el mismo turno", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("cuando el usuario pasa de 2 a 3 huéspedes con fechas conocidas, ajusta a 'triple', reconoce el cambio y recotiza con total", async () => {
        // Estado previo: reserva confirmada con double para 2 pax, fechas conocidas
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

        // Mock de disponibilidad para 3 pax en 'triple' → 150 USD/noche
        (askAvailability as any).mockResolvedValueOnce({
            ok: true,
            available: true,
            proposal: "Tengo triple disponible. Tarifa por noche: 150 USD.",
            options: [
                { roomType: "triple", pricePerNight: 150, currency: "USD", availability: 2 },
            ],
        });

        // Usuario indica nueva cantidad de huéspedes
        await handleIncomingMessage(msg("somos 3 huéspedes"), { mode: "automatic", sendReply });

        // Verificamos el último mensaje del asistente
        const all = await getCollection("messages").findMany({ hotelId, conversationId });
        const lastAi = all.filter((m: any) => m.sender === "assistant").at(-1);
        const txt = String(lastAi?.content || lastAi?.suggestion || "");

        // Debe reconocer el ajuste de capacidad y del tipo de habitación → "ajusté el tipo a triple"
        expect(txt.toLowerCase()).toMatch(/actualic[eé]\s+la\s+capacidad\s+a\s*3/);
        expect(txt.toLowerCase()).toMatch(/ajust[eé]\s+el\s+tipo\s+a\s+triple/);

        // Debe incluir recotización con total de 2 noches
        expect(txt).toMatch(/Tarifa por noche: 150 USD/i);
        expect(txt).toMatch(/Total\s+2\s+noches:\s*300\s+USD/i);

        // Y debe invitar a confirmar
        expect(txt).toMatch(/¿Confirmás la reserva\?|Confirma a reserva|Do you confirm the booking/i);

        // Verificar el payload usado para disponibilidad: 3 pax y tipo 'triple'
        expect((askAvailability as any).mock.calls.length).toBe(1);
        const callArgs = (askAvailability as any).mock.calls[0];
        // callArgs = [hotelId, snapshot]
        expect(callArgs[0]).toBe(hotelId);
        expect(callArgs[1]).toMatchObject({
            roomType: "triple",
            numGuests: "3",
            checkIn: "2025-10-02",
            checkOut: "2025-10-04",
        });
    });
});
