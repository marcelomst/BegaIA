// /home/marcelo/begasist/test/unit/messageHandler.availability_affirm_ack.test.ts

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

// Mock de configuración de hotel para devolver horarios de check-in/out
vi.mock("@/lib/config/hotelConfig.server", () => {
    return {
        getHotelConfig: vi.fn(async (_hotelId: string) => ({
            hotelName: "Hotel Demo",
            policies: { checkInTime: "14:00", checkOutTime: "11:00" },
        })),
    };
});

// Mock agentGraph: devolvemos textos mínimos; el post-procesamiento se encarga de la UX que validamos
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

import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import { getCollection } from "../mocks/astra";
import { getConvState } from "@/lib/db/convState";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";

vi.mock("@/lib/db/convState", () => ({
    getConvState: vi.fn(),
    upsertConvState: vi.fn(),
    CONVSTATE_VERSION: "convstate-test",
}));

const hotelId = "hotel999";
const channel = "web" as const;
const conversationId = "conv-affirm-verify-1";

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

describe("messageHandler: afirmación tras '¿verifico disponibilidad?' debe confirmar acción con el rango", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("flujo: usuario envía ambas fechas → bot pregunta si verifica → usuario afirma → bot confirma verificación con el rango", async () => {
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

        // Paso 1: usuario da el rango completo
        await handleIncomingMessage(msg("ingresamos el 03/10/2025 y salimos el 05/10/2025"), { mode: "automatic", sendReply });

        // Paso 2: el bot debió preguntar si verifica disponibilidad
        let all = await getCollection("messages").findMany({ hotelId, conversationId });
        let lastAi = all.filter((m: any) => m.sender === "assistant").at(-1);
        const q = String(lastAi?.content || lastAi?.suggestion || "").toLowerCase();
        expect(q).toMatch(/verifique disponibilidad|verificar a disponibilidade|check availability/);

        // Paso 3: usuario afirma
        await handleIncomingMessage(msg("si por favor"), { mode: "automatic", sendReply });

        all = await getCollection("messages").findMany({ hotelId, conversationId });
        lastAi = all.filter((m: any) => m.sender === "assistant").at(-1);
        const ack = String(lastAi?.content || lastAi?.suggestion || "");

        // Debe confirmar que verificará para el mismo rango dd/mm/aaaa
        expect(ack.toLowerCase()).toMatch(/verific(?:o|ar[ée])/);
        expect(ack).toMatch(/03\/10\/2025/);
        expect(ack).toMatch(/05\/10\/2025/);
        // No debe ser un saludo genérico
        expect(ack).not.toMatch(/^hola, ¿en qué puedo ayudarte\?/i);
    });

    it("si el bot ofreció confirmar el horario de check-in y el usuario afirma, responde con el horario configurado", async () => {
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

        // 1) El asistente ofrece confirmar horario exacto de check-in
        (globalThis as any).__TEST_TEXT__ = "El check-in suele realizarse por la tarde. Si querés, puedo confirmar el horario exacto para tus fechas.";
        await handleIncomingMessage(msg("¿a qué hora es el check-in?"), { mode: "automatic", sendReply });

        // 2) Usuario afirma → debe responder con el horario configurado (14:00)
        (globalThis as any).__TEST_TEXT__ = "Entendido.";
        await handleIncomingMessage(msg("sí"), { mode: "automatic", sendReply });

        const all = await getCollection("messages").findMany({ hotelId, conversationId });
        const lastAi = all.filter((m: any) => m.sender === "assistant").at(-1);
        const text = String(lastAi?.content || lastAi?.suggestion || "");
        expect(text).toMatch(/check-in comienza a las 14:00/i);
    });

    it("si el bot ofreció confirmar horario pero el hotel no tiene horas configuradas, responde con 'consulto recepción'", async () => {
        const convId = "conv-checktime-fallback-1";
        (getConvState as any).mockResolvedValue({
            hotelId,
            conversationId: convId,
            reservationSlots: {
                guestName: "Marcelo Martinez",
                roomType: "double",
                checkIn: "2025-10-02",
                checkOut: "2025-10-04",
                numGuests: "2",
            },
            salesStage: "quote",
            updatedAt: new Date().toISOString(),
        });

        // Forzar que getHotelConfig no devuelva horarios en ambas llamadas de este flujo
        (getHotelConfig as any).mockResolvedValue({ hotelName: "Hotel Demo" });

        (globalThis as any).__TEST_TEXT__ = "El check-out suele ser por la mañana. Si querés, puedo confirmar el horario exacto para tus fechas.";
        await handleIncomingMessage({ ...msg("¿a qué hora es el check-out?"), conversationId: convId }, { mode: "automatic", sendReply });

        (globalThis as any).__TEST_TEXT__ = "Entendido.";
        await handleIncomingMessage({ ...msg("sí por favor"), conversationId: convId }, { mode: "automatic", sendReply });

        const all = await getCollection("messages").findMany({ hotelId, conversationId: convId });
        const lastAi = all.filter((m: any) => m.sender === "assistant").at(-1);
        const text = String(lastAi?.content || lastAi?.suggestion || "").toLowerCase();
        expect(text).toMatch(/consulto\s+recepci[oó]n/);
    });
});
