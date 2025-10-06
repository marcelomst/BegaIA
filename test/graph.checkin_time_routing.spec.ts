import { describe, it, expect, vi, beforeEach } from "vitest";
import { AIMessage } from "@langchain/core/messages";

vi.mock("@/lib/db/convState", () => ({
    getConvState: vi.fn(),
    upsertConvState: vi.fn(),
}));

// Evitar llamadas reales a RAG/Embeddings
vi.mock("@/lib/agents/retrieval_based", () => ({
    retrievalBased: vi.fn(async (_state: any) => ({
        messages: [new AIMessage("[KB] horario check-in/out")],
        category: "retrieval_based",
    })),
}));

import { agentGraph } from "@/lib/agents/graph";
import { getConvState } from "@/lib/db/convState";

const hotelId = "hotel999";
const conversationId = "conv-time-1";

describe("classification: check-in/out time queries → retrieval_based", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getConvState as any).mockResolvedValue(null);
    });

    it("routes 'a qué hora es el check in' to retrieval_based (ES)", async () => {
        const res = await agentGraph.invoke({
            normalizedMessage: "a qué hora es el check in",
            detectedLanguage: "es",
            hotelId,
            conversationId,
            reservationSlots: {},
        });
        expect(res.category).toBe("retrieval_based");
    });

    it("routes 'What time is check-out?' to retrieval_based (EN)", async () => {
        const res = await agentGraph.invoke({
            normalizedMessage: "What time is check-out?",
            detectedLanguage: "en",
            hotelId,
            conversationId,
            reservationSlots: {},
        });
        expect(res.category).toBe("retrieval_based");
    });

    it("still routes to retrieval_based when salesStage is close", async () => {
        const res = await agentGraph.invoke({
            normalizedMessage: "a que hora es el check out",
            detectedLanguage: "es",
            hotelId,
            conversationId,
            reservationSlots: {},
            salesStage: "close",
        } as any);
        expect(res.category).toBe("retrieval_based");
    });
});
