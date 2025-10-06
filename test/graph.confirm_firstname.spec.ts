import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/convState", () => {
    return {
        getConvState: vi.fn(),
        upsertConvState: vi.fn(),
    };
});

vi.mock("@/lib/agents/reservations", () => {
    return {
        fillSlotsWithLLM: vi.fn(),
        askAvailability: vi.fn(),
        confirmAndCreate: vi.fn(),
    };
});

import { agentGraph } from "@/lib/agents/graph";
import { getConvState } from "@/lib/db/convState";
import { confirmAndCreate } from "@/lib/agents/reservations";

describe("graph confirmation uses first name in thank-you", () => {
    const hotelId = "hotel999";
    const conversationId = "conv-firstname-1";

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("ES: gracias, <primer nombre>", async () => {
        (getConvState as any).mockResolvedValue({
            reservationSlots: {
                guestName: "María José López",
                roomType: "double",
                checkIn: "2025-10-10",
                checkOut: "2025-10-12",
                numGuests: "2",
                locale: "es",
            },
        });
        (confirmAndCreate as any).mockResolvedValue({ ok: true, reservationId: "R-XYZ" });

        const res = await agentGraph.invoke({
            normalizedMessage: "Confirmar",
            detectedLanguage: "es",
            hotelId,
            conversationId,
            reservationSlots: {},
        });

        const msg = String(res.messages?.[0]?.content || "");
        expect(msg).toMatch(/¡Gracias, María José!/);
    });
});
