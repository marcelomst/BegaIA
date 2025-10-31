///home/marcelo/begasist/test/graph.reservation.verify_and_snapshot.spec.ts

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/convState", () => ({
    getConvState: vi.fn(),
    upsertConvState: vi.fn(),
}));

import { agentGraph } from "@/lib/agents/graph";
import { getConvState } from "@/lib/db/convState";

const hotelId = "hotel999";
const conversationId = "conv-verify-1";

describe("reservation verify/snapshot classification", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("routes to reservation_verify and asks for code when no confirmed booking and no progress", async () => {
        (getConvState as any).mockResolvedValueOnce(null);

        const res = await agentGraph.invoke({
            normalizedMessage: "creo que tengo una reserva confirmada, puedes corroborar?",
            detectedLanguage: "es",
            hotelId,
            conversationId,
            reservationSlots: {},
        });

        expect(res.category).toBe("reservation_verify");
        const txt = String(res.messages?.[0]?.content || "");
        expect(txt.toLowerCase()).toContain("código de reserva".toLowerCase());
    });

    it("shows in-progress snapshot when there is a draft (salesStage=quote) but no lastReservation", async () => {
        (getConvState as any).mockResolvedValueOnce({
            _id: `${hotelId}:${conversationId}`,
            hotelId,
            conversationId,
            reservationSlots: {
                guestName: "Marcelo Martinez",
                roomType: "double",
                checkIn: "2025-10-02T00:00:00Z",
                checkOut: "2025-10-04T00:00:00Z",
                numGuests: "2",
                locale: "es",
            },
            salesStage: "quote",
            updatedAt: new Date().toISOString(),
        });

        const res = await agentGraph.invoke({
            normalizedMessage: "creo que tengo una reserva confirmada, puedes corroborar?",
            detectedLanguage: "es",
            hotelId,
            conversationId,
            reservationSlots: {},
        });

        expect(res.category).toBe("reservation_snapshot");
        const txt = String(res.messages?.[0]?.content || "");
        expect(txt.toLowerCase()).toContain("en curso");
        expect(txt.toLowerCase()).toContain("no confirmada");
    });

    it("shows confirmed snapshot (with code) when lastReservation exists", async () => {
        (getConvState as any).mockResolvedValueOnce({
            _id: `${hotelId}:${conversationId}`,
            hotelId,
            conversationId,
            reservationSlots: {
                guestName: "Ana Gomez",
                roomType: "suite",
                checkIn: "2025-09-20T00:00:00Z",
                checkOut: "2025-09-22T00:00:00Z",
                numGuests: "2",
                locale: "es",
            },
            lastReservation: {
                reservationId: "R-ABC123",
                status: "created",
                createdAt: new Date().toISOString(),
                channel: "web",
            },
            salesStage: "close",
            updatedAt: new Date().toISOString(),
        });

        const res = await agentGraph.invoke({
            normalizedMessage: "creo que tengo una reserva confirmada, puedes corroborar?",
            detectedLanguage: "es",
            hotelId,
            conversationId,
            // No pasar reservationSlots para que el wiring no sobrescriba el persistido
        });

        expect(res.category).toBe("reservation_snapshot");
        const txt = String(res.messages?.[0]?.content || "");
        expect(txt.toLowerCase()).toContain("reserva confirmada");
        expect(txt).toContain("R-ABC123");
    });
});
