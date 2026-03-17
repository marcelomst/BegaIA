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

function msgWithLang(content: string, detectedLanguage: string, convId = conversationId) {
    return {
        ...msg(content),
        conversationId: convId,
        detectedLanguage,
    };
}

describe("messageHandler: afirmación tras '¿verifico disponibilidad?' debe confirmar acción con el rango", () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        const messages = getCollection("messages");
        const conversations = getCollection("conversations");
        for (const row of await messages.findMany({})) {
            await messages.deleteOne({ _id: row._id });
        }
        for (const row of await conversations.findMany({})) {
            await conversations.deleteOne({ _id: row._id });
        }
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
        expect(ack.toLowerCase()).toMatch(/verific(?:o|ar[ée])|check availability|verifique a disponibilidade/);
        expect(ack).toMatch(/03\/10\/2025/);
        expect(ack).toMatch(/05\/10\/2025/);
        // No debe ser un saludo genérico
        expect(ack).not.toMatch(/^hola, ¿en qué puedo ayudarte\?/i);
    });

    it("mantiene el follow-up afirmativo después de una corrección de check-in pasado y varios turns previos", async () => {
        const convId = "conv-affirm-verify-after-past-checkin";
        (getConvState as any).mockResolvedValue({
            hotelId,
            conversationId: convId,
            reservationSlots: {
                roomType: "double",
            },
            salesStage: "qualify",
            updatedAt: new Date().toISOString(),
        });

        await handleIncomingMessage({ ...msg("tienen disponibilidad para este fin de semana"), conversationId: convId }, { mode: "automatic", sendReply });
        await handleIncomingMessage({ ...msg("doble"), conversationId: convId }, { mode: "automatic", sendReply });
        await handleIncomingMessage({ ...msg("21/02/2026"), conversationId: convId }, { mode: "automatic", sendReply });
        await handleIncomingMessage({ ...msg("21/03/2026"), conversationId: convId }, { mode: "automatic", sendReply });
        await handleIncomingMessage({ ...msg("23/03/2026"), conversationId: convId }, { mode: "automatic", sendReply });
        await handleIncomingMessage({ ...msg("si"), conversationId: convId }, { mode: "automatic", sendReply });

        const all = await getCollection("messages").findMany({ hotelId, conversationId: convId });
        const lastAi = all.filter((m: any) => m.sender === "assistant").at(-1);
        const ack = String(lastAi?.content || lastAi?.suggestion || "");

        expect(ack.toLowerCase()).toMatch(/verific(?:o|ar[ée])|check availability|vou verificar a disponibilidade/);
        expect(ack).toMatch(/21\/03\/2026/);
        expect(ack).toMatch(/23\/03\/2026/);
        expect(ack).not.toMatch(/Playa Mansa|Puerto de Punta del Este|Casapueblo/i);
    });

    it("reconoce 'si' aunque el detector de idioma del turno corto no venga en español", async () => {
        const convId = "conv-affirm-verify-lang-drift";
        (getConvState as any).mockResolvedValue({
            hotelId,
            conversationId: convId,
            reservationSlots: {
                roomType: "double",
            },
            salesStage: "qualify",
            updatedAt: new Date().toISOString(),
        });

        await handleIncomingMessage({ ...msgWithLang("21/03/2026", "es", convId) }, { mode: "automatic", sendReply });
        await handleIncomingMessage({ ...msgWithLang("23/03/2026", "es", convId) }, { mode: "automatic", sendReply });
        await handleIncomingMessage({ ...msgWithLang("si", "en", convId) }, { mode: "automatic", sendReply });

        const all = await getCollection("messages").findMany({ hotelId, conversationId: convId });
        const lastAi = all.filter((m: any) => m.sender === "assistant").at(-1);
        const ack = String(lastAi?.content || lastAi?.suggestion || "");

        expect(ack.toLowerCase()).toMatch(/verific(?:o|ar[ée])/);
        expect(ack).toMatch(/21\/03\/2026/);
        expect(ack).toMatch(/23\/03\/2026/);
    });

    it("si el bot ofreció confirmar el horario de check-in y el usuario afirma, responde con el horario configurado", async () => {
        const convId = "conv-checktime-offer-1";
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
            salesStage: "close",
            updatedAt: new Date().toISOString(),
        });

        await getCollection("messages").insertOne({
            _id: "prev-ai-checktime-offer-1",
            messageId: "prev-ai-checktime-offer-1",
            hotelId,
            conversationId: convId,
            channel,
            sender: "assistant",
            role: "ai",
            content: "El check-in suele realizarse por la tarde. Si querés, puedo confirmar el horario exacto para tus fechas.",
            timestamp: new Date(Date.now() - 1000).toISOString(),
        });

        (globalThis as any).__TEST_TEXT__ = "Entendido.";
        await handleIncomingMessage({ ...msg("sí"), conversationId: convId }, { mode: "automatic", sendReply });

        const all = await getCollection("messages").findMany({ hotelId, conversationId: convId });
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

        await getCollection("messages").insertOne({
            _id: "prev-ai-checktime-offer-2",
            messageId: "prev-ai-checktime-offer-2",
            hotelId,
            conversationId: convId,
            channel,
            sender: "assistant",
            role: "ai",
            content: "El check-out suele ser por la mañana. Si querés, puedo confirmar el horario exacto para tus fechas.",
            timestamp: new Date(Date.now() - 1000).toISOString(),
        });

        (globalThis as any).__TEST_TEXT__ = "Entendido.";
        await handleIncomingMessage({ ...msg("sí por favor"), conversationId: convId }, { mode: "automatic", sendReply });

        const all = await getCollection("messages").findMany({ hotelId, conversationId: convId });
        const lastAi = all.filter((m: any) => m.sender === "assistant").at(-1);
        const text = String(lastAi?.content || lastAi?.suggestion || "").toLowerCase();
        expect(text).toMatch(/consulto\s+recepci[oó]n/);
    });
});
