// /home/marcelo/begasist/test/unit/messageHandler.availability_affirm_ack.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";

const { convStateStore, getConvStateMock, upsertConvStateMock } = vi.hoisted(() => {
    const store = new Map<string, any>();
    return {
        convStateStore: store,
        getConvStateMock: vi.fn(async (hotelId: string, conversationId: string) => {
            return store.get(`${hotelId}:${conversationId}`) ?? null;
        }),
        upsertConvStateMock: vi.fn(async (hotelId: string, conversationId: string, patch: any) => {
            const key = `${hotelId}:${conversationId}`;
            const prev = store.get(key) ?? { hotelId, conversationId };
            const next = { ...prev, ...patch, hotelId, conversationId };
            store.set(key, next);
            return next;
        }),
    };
});

// Desactivar structured para este test (evita llamadas externas)
process.env.STRUCTURED_ENABLED = "false";

// Infra mocks
vi.mock("@/lib/astra_connection", async () => await import("../mocks/astra"));
vi.mock("@/lib/redis", async () => await import("../mocks/redis"));
vi.mock("@/lib/db/messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db_messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db/conversations", async () => await import("../mocks/db_conversations"));
vi.mock("@/lib/db_conversations", async () => await import("../mocks/db_conversations"));

vi.mock("@/lib/handlers/pipeline/availability", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/handlers/pipeline/availability")>();
    return {
        ...actual,
        runAvailabilityCheck: vi.fn(async (pre: any, slots: any, ciISO: string, coISO: string) => ({
            finalText:
                pre?.lang === "es"
                    ? `Disponibilidad confirmada para ${actual.isoToDDMMYYYY(ciISO)} → ${actual.isoToDDMMYYYY(coISO)}.`
                    : `Availability confirmed for ${ciISO} → ${coISO}.`,
            nextSlots: { ...slots, checkIn: ciISO, checkOut: coISO },
            needsHandoff: false,
        })),
    };
});

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
    getConvState: getConvStateMock,
    upsertConvState: upsertConvStateMock,
    resolveGuestState: vi.fn(() => undefined),
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
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));
        vi.clearAllMocks();
        convStateStore.clear();
        const messages = getCollection("messages");
        const conversations = getCollection("conversations");
        for (const row of await messages.findMany({})) {
            await messages.deleteOne({ _id: row._id });
        }
        for (const row of await conversations.findMany({})) {
            await conversations.deleteOne({ _id: row._id });
        }
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("flujo: usuario envía ambas fechas → bot pregunta si verifica → usuario afirma → bot confirma verificación con el rango", async () => {
        convStateStore.set(`${hotelId}:${conversationId}`, {
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
        convStateStore.set(`${hotelId}:${convId}`, {
            hotelId,
            conversationId: convId,
            reservationSlots: {
                roomType: "double",
                checkIn: "2026-03-21",
                checkOut: "2026-03-23",
            },
            pendingAvailabilityVerification: {
                checkIn: "2026-03-21",
                checkOut: "2026-03-23",
            },
            salesStage: "qualify",
            updatedAt: new Date().toISOString(),
        });

        await getCollection("messages").insertOne({
            _id: "prev-ai-verify-after-past-checkin",
            messageId: "prev-ai-verify-after-past-checkin",
            hotelId,
            conversationId: convId,
            channel,
            sender: "assistant",
            role: "ai",
            content: "Anoté nuevas fechas: 21/03/2026 → 23/03/2026. ¿Deseás que verifique disponibilidad y posibles diferencias?",
            timestamp: new Date(Date.now() - 1000).toISOString(),
        });

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
        convStateStore.set(`${hotelId}:${convId}`, {
            hotelId,
            conversationId: convId,
            reservationSlots: {
                roomType: "double",
                checkIn: "2026-03-21",
                checkOut: "2026-03-23",
            },
            pendingAvailabilityVerification: {
                checkIn: "2026-03-21",
                checkOut: "2026-03-23",
            },
            salesStage: "qualify",
            updatedAt: new Date().toISOString(),
        });

        await getCollection("messages").insertOne({
            _id: "prev-ai-verify-lang-drift",
            messageId: "prev-ai-verify-lang-drift",
            hotelId,
            conversationId: convId,
            channel,
            sender: "assistant",
            role: "ai",
            content: "Anoté nuevas fechas: 21/03/2026 → 23/03/2026. ¿Deseás que verifique disponibilidad y posibles diferencias?",
            timestamp: new Date(Date.now() - 1000).toISOString(),
        });

        await handleIncomingMessage({ ...msgWithLang("si", "en", convId) }, { mode: "automatic", sendReply });

        const all = await getCollection("messages").findMany({ hotelId, conversationId: convId });
        const lastAi = all.filter((m: any) => m.sender === "assistant").at(-1);
        const ack = String(lastAi?.content || lastAi?.suggestion || "");

        expect(ack.toLowerCase()).toMatch(/verific(?:o|ar[ée])|check availability|vou verificar a disponibilidade/);
        expect(ack).toMatch(/21\/03\/2026/);
        expect(ack).toMatch(/23\/03\/2026/);
    });

    it("si el bot ofreció confirmar el horario de check-in y el usuario afirma, responde con el horario configurado", async () => {
        const convId = "conv-checktime-offer-1";
        convStateStore.set(`${hotelId}:${convId}`, {
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
        convStateStore.set(`${hotelId}:${convId}`, {
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
