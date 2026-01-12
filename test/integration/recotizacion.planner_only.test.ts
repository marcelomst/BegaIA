import { describe, it, expect, vi } from "vitest";

// Validaremos solo el comportamiento del planner/grafo (fuente única)
// verificando texto final, conv_state y payload a askAvailability.

// Forzamos modo sin llamadas externas
process.env.STRUCTURED_ENABLED = "false";

// Infra mocks compartidos
vi.mock("@/lib/astra_connection", async () => await import("../mocks/astra"));
vi.mock("@/lib/redis", async () => await import("../mocks/redis"));
vi.mock("@/lib/db/messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db_messages", async () => await import("../mocks/db_messages"));
vi.mock("@/lib/db/conversations", async () => await import("../mocks/db_conversations"));
vi.mock("@/lib/db_conversations", async () => await import("../mocks/db_conversations"));
// Mock convState para espiar lecturas/escrituras de estado
vi.mock("@/lib/db/convState", () => ({
    getConvState: vi.fn(),
    upsertConvState: vi.fn(),
    CONVSTATE_VERSION: "convstate-test",
}));

// Mock agentGraph: el handler/graph ejecuta la lógica; devolvemos texto mínimo
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

// Mock de askAvailability para controlar recotización
vi.mock("@/lib/agents/reservations", () => ({
    askAvailability: vi.fn(),
}));

import { getCollection } from "../mocks/astra";

const hotelId = "hotel999";
const channel = "web" as const;

function buildMsg(conversationId: string, content: string) {
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

async function runScenarioOnce(
    conversationId: string,
    initialState: any,
    availabilityResponse: any,
    userUtterance: string
) {
    // Forzamos planner + grafo + auditoría
    process.env.USE_ORCHESTRATOR_AGENT = "1";
    process.env.USE_MH_FLOW_GRAPH = "1";
    process.env.USE_PRE_POS_PIPELINE = "1";

    // Reiniciar módulos para que los flags se tomen desde import
    vi.resetModules();

    // Re-importar mocks de convState y askAvailability en este ciclo
    const convStateMod = await import("@/lib/db/convState");
    const { getConvState, upsertConvState } = convStateMod as any;

    const reservationsMod = await import("@/lib/agents/reservations");
    const { askAvailability } = reservationsMod as any;

    // Configurar estado previo y respuesta de disponibilidad
    (getConvState as any).mockResolvedValueOnce(initialState);
    (askAvailability as any).mockResolvedValueOnce(availabilityResponse);

    // Importar handler con estos flags activos
    const { handleIncomingMessage } = await import("@/lib/handlers/messageHandler");

    const sendReply = vi.fn(async (_t: string) => { });
    await handleIncomingMessage(buildMsg(conversationId, userUtterance), { mode: "automatic", sendReply });

    // Capturar último texto enviado por el asistente
    const all = await getCollection("messages").findMany({ hotelId, conversationId });
    const lastAi = all.filter((m: any) => m.sender === "assistant").at(-1);
    let text = String(lastAi?.content || lastAi?.suggestion || "");
    if (!text && sendReply.mock.calls.length > 0) {
        const lastCall = sendReply.mock.calls.at(-1);
        text = String(lastCall?.[0] || "");
    }

    // Capturar patch persistido a conv_state para esta conversación
    const calls = (upsertConvState as any).mock.calls as any[][];
    const lastForConv = [...calls].reverse().find((c) => c?.[1] === conversationId);
    const patch = lastForConv?.[2] ?? {};

    // También exponer payload de disponibilidad de esta corrida
    const askCalls = (askAvailability as any).mock.calls as any[][];
    const lastAsk = [...askCalls].reverse().find((c) => c?.[0] === hotelId);
    const askPayload = lastAsk?.[1];

    return { text, patch, askPayload };
}

describe("Recotización (planner)", () => {
    it("2 → 3 huéspedes, ajusta a triple y recotiza: texto, payload y conv_state correctos", async () => {
        const baseState = {
            hotelId,
            conversationId: "conv-requote-planner-1",
            reservationSlots: {
                guestName: "Marcelo Martinez",
                roomType: "double",
                checkIn: "2025-10-02",
                checkOut: "2025-10-04",
                numGuests: "2",
            },
            salesStage: "close",
            updatedAt: new Date().toISOString(),
        };

        const availability = {
            ok: true,
            available: true,
            proposal: "Tengo triple disponible. Tarifa por noche: 150 USD.",
            options: [{ roomType: "triple", pricePerNight: 150, currency: "USD", availability: 2 }],
        };

        const planner = await runScenarioOnce(
            baseState.conversationId,
            baseState,
            availability,
            "somos 3 huéspedes"
        );

        // Texto: ACK de ajuste + propuesta
        expect(planner.text).toMatch(/Actualicé la capacidad a\s*3 huésped\(es\)/);
        expect(planner.text).toMatch(/ajusté el tipo a\s*triple/i);
        expect(planner.text).toMatch(/Tengo triple disponible\. Tarifa por noche: 150 USD\./);

        // Payload askAvailability coherente (ajuste a triple y 3 pax)
        expect(planner.askPayload).toMatchObject({ roomType: "triple", numGuests: "3", checkIn: "2025-10-02", checkOut: "2025-10-04" });

        // conv_state persistido (slots relevantes)
        const slotsPlanner = planner.patch?.reservationSlots || {};
        expect(slotsPlanner.roomType).toBe("triple");
        expect(slotsPlanner.numGuests).toBe("3");
        expect(slotsPlanner.checkIn).toBe("2025-10-02");
        expect(slotsPlanner.checkOut).toBe("2025-10-04");
    });

    it("1 → 2 huéspedes, mantiene double y recotiza: texto, payload y conv_state correctos", async () => {
        const baseState = {
            hotelId,
            conversationId: "conv-requote-planner-2",
            reservationSlots: {
                guestName: "Marcelo Martinez",
                roomType: "double",
                checkIn: "2025-10-02",
                checkOut: "2025-10-04",
                numGuests: "1",
            },
            salesStage: "close",
            updatedAt: new Date().toISOString(),
        };

        const availability = {
            ok: true,
            available: true,
            proposal: "Tengo double disponible. Tarifa por noche: 120 USD.",
            options: [{ roomType: "double", pricePerNight: 120, currency: "USD", availability: 2 }],
        };

        const planner = await runScenarioOnce(
            baseState.conversationId,
            baseState,
            availability,
            "somos 2 huéspedes"
        );

        // Texto: ACK sin cambio de tipo + propuesta
        expect(planner.text).toMatch(/Actualicé la capacidad a\s*2 huésped\(es\)\./);
        expect(planner.text).not.toMatch(/ajusté el tipo a/i);
        // La versión planner localiza "double" → "doble" en español; aceptamos ambas variantes.
        expect(planner.text).toMatch(/Tengo (double|doble) disponible\. Tarifa por noche: 120 USD\./);

        // Payload askAvailability coherente (mantiene double y 2 pax)
        expect(planner.askPayload).toMatchObject({ roomType: "double", numGuests: "2", checkIn: "2025-10-02", checkOut: "2025-10-04" });

        // conv_state persistido (slots relevantes)
        const slotsPlanner = planner.patch?.reservationSlots || {};
        expect(slotsPlanner.roomType).toBe("double");
        expect(slotsPlanner.numGuests).toBe("2");
        expect(slotsPlanner.checkIn).toBe("2025-10-02");
        expect(slotsPlanner.checkOut).toBe("2025-10-04");
    });
});
