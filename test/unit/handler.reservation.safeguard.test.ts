import { describe, it, expect, vi } from "vitest";
import { handleReservationNode } from "@/lib/agents/nodes/reservation";

vi.mock("@/lib/agents/reservations", () => ({
    fillSlotsWithLLM: vi.fn().mockResolvedValue({ need: "question", question: "undefined", partial: { guestName: "Marcelo Martinez", locale: "es" } })
}));

const state: any = {
    hotelId: "hotel999",
    conversationId: "conv-test-1",
    normalizedMessage: "Marcelo Martinez",
    detectedLanguage: "es",
    reservationSlots: {},
    messages: [],
    category: "other",
    sentiment: "neutral" as "neutral",
    preferredLanguage: "es",
    promptKey: null,
    meta: {},
    intentConfidence: 0.0,
    intentSource: "heuristic",
    desiredAction: undefined,
    salesStage: "qualify",
    lastOffer: null,
    upsellCount: 0,
};

describe("handleReservationNode safeguard", () => {
    it("reemplaza 'undefined' por pregunta canónica", async () => {
        const res = await handleReservationNode(state);
        expect(String(res.messages?.[0]?.content)).toMatch(/habitación/);
    });
});
