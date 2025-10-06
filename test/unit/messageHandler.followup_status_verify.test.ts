// /home/marcelo/begasist/test/unit/messageHandler.followup_status_verify.test.ts

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

// Mock directo de askAvailability para controlar el resultado
vi.mock("@/lib/agents/reservations", () => {
    return {
        askAvailability: vi.fn(async (_hotelId: string, _slots: any) => ({
            ok: true,
            available: true,
            proposal: "", // dejar vacío para que el handler enriquezca con total
            options: [{ roomType: "double", pricePerNight: 120, currency: "USD" }],
        })),
    };
});

import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import { getCollection } from "../mocks/astra";
import { getConvState, upsertConvState } from "@/lib/db/convState";

vi.mock("@/lib/db/convState", () => ({
    getConvState: vi.fn(),
    upsertConvState: vi.fn(),
    CONVSTATE_VERSION: "convstate-test",
}));

const hotelId = "hotel999";
const channel = "web" as const;
const conversationId = "conv-followup-status-1";

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

describe("messageHandler: follow-up de estado ('pudiste confirmar?') ejecuta verificación y responde", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("cuando hay un rango propuesto en el historial, corre disponibilidad y devuelve propuesta + línea de confirmación", async () => {
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

        // Paso 1: usuario aporta ambas fechas → el bot anota y pregunta si verifica
        await handleIncomingMessage(msg("ingresamos el 03/10/2025 y salimos el 05/10/2025"), { mode: "automatic", sendReply });

        // Paso 2: usuario pregunta estado "pudiste confirmar?" → debe ejecutar disponibilidad inline
        await handleIncomingMessage(msg("pudiste confirmar?"), { mode: "automatic", sendReply });

        const all = await getCollection("messages").findMany({ hotelId, conversationId });
        const lastAi = all.filter((m: any) => m.sender === "assistant").at(-1);
        const text = String(lastAi?.content || lastAi?.suggestion || "");
        // Debe incluir la propuesta enriquecida y una línea de confirmación
        expect(text).toMatch(/Tengo\s+doble\s+disponible/i);
        expect(text).toMatch(/Total\s+2\s+noches:\s*240\s+USD/i);
        expect(text).toMatch(/CONFIRMAR/i);

        // Persistió lastProposal y salesStage adecuado
        expect(upsertConvState).toHaveBeenCalled();
        const call = (upsertConvState as any).mock.calls.at(-1);
        expect(call?.[0]).toBe(hotelId);
        expect(call?.[1]).toBe(conversationId);
        const payload = call?.[2];
        expect(payload?.lastProposal?.available).toBe(true);
        expect(payload?.salesStage).toBe("quote");
    });

    it("si faltan fechas, pide explícitamente la que falta en lugar de derivar", async () => {
        const convId = "conv-followup-status-2";
        (getConvState as any).mockResolvedValue({
            hotelId,
            conversationId: convId,
            reservationSlots: {
                guestName: "Marcelo Martinez",
                roomType: "double",
                checkIn: "2025-10-03",
                checkOut: undefined,
                numGuests: "2",
            },
            salesStage: "close",
            updatedAt: new Date().toISOString(),
        });

        await handleIncomingMessage({ ...msg("pudiste confirmar?"), conversationId: convId }, { mode: "automatic", sendReply });

        const all = await getCollection("messages").findMany({ hotelId, conversationId: convId });
        const lastAi = all.filter((m: any) => m.sender === "assistant").at(-1);
        const text = String(lastAi?.content || lastAi?.suggestion || "");
        // Debe pedir check-out en español (buildAskMissingDate)
        expect(text.toLowerCase()).toMatch(/check-out/);
    });

    it("cuando available=false con alternativas, persiste suggestedRoomType del options[0]", async () => {
        const convId = "conv-followup-suggest-1";
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

        // Reconfigurar mock para este caso: available=false con alternativas
        const { askAvailability } = await import("@/lib/agents/reservations");
        (askAvailability as any).mockResolvedValueOnce({
            ok: true,
            available: false,
            proposal: "No hay para double, alternativas: twin.",
            options: [{ roomType: "twin", pricePerNight: 90, currency: "USD" }],
        });

        await handleIncomingMessage({ ...msg("pudiste confirmar?"), conversationId: convId }, { mode: "automatic", sendReply });

        expect(upsertConvState).toHaveBeenCalled();
        const call = (upsertConvState as any).mock.calls.find((c: any[]) => c?.[1] === convId);
        const payload = call?.[2];
        expect(payload?.lastProposal?.available).toBe(false);
        expect(payload?.lastProposal?.suggestedRoomType).toBe("twin");
        expect(payload?.lastProposal?.suggestedPricePerNight).toBe(90);
    });

    it("debounce de handoff: en dos fallos consecutivos no duplica el aviso a recepción", async () => {
        const convId = "conv-followup-debounce-1";
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

        // 1er intento: simular error técnico (ok:false)
        const { askAvailability } = await import("@/lib/agents/reservations");
        (askAvailability as any).mockResolvedValueOnce({
            ok: false,
            available: false,
            proposal: "", // dejar que el handler construya mensaje genérico de error + handoff
            options: [],
        });
        await handleIncomingMessage({ ...msg("pudiste confirmar?"), conversationId: convId }, { mode: "automatic", sendReply });

        // 2do intento (otro fallo). No debe repetir la misma línea de handoff.
        (askAvailability as any).mockResolvedValueOnce({
            ok: false,
            available: false,
            proposal: "",
            options: [],
        });
        await handleIncomingMessage({ ...msg("pudiste confirmar?"), conversationId: convId }, { mode: "automatic", sendReply });

        const all = await getCollection("messages").findMany({ hotelId, conversationId: convId });
        const aiMsgs = all.filter((m: any) => m.sender === "assistant");
        const lastTwo = aiMsgs.slice(-2).map((m: any) => String(m.content || m.suggestion || ""));

        // Primera respuesta debe contener la línea de handoff
        expect(lastTwo[0].toLowerCase()).toMatch(/recepcion|receptionist|humano|human|contato|contacto/);
        // Segunda respuesta NO debe repetirla (debounce)
        expect(lastTwo[1].toLowerCase()).not.toMatch(/recepcion|receptionist|humano|human|contato|contacto/);
    });
});
