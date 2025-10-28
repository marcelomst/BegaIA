// Centraliza el tipo GraphState para los handlers modularizados
import { Annotation } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";

export const GraphState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({ reducer: (x, y) => x.concat(y), default: () => [] }),
    normalizedMessage: Annotation<string>({ reducer: (_x, y) => y, default: () => "" }),
    category: Annotation<string>({ reducer: (_x, y) => y, default: () => "other" }),
    detectedLanguage: Annotation<string>({ reducer: (_x, y) => y, default: () => "es" }),
    sentiment: Annotation<"positive" | "neutral" | "negative">({ reducer: (_x, y) => y, default: () => "neutral" }),
    preferredLanguage: Annotation<string>({ reducer: (_x, y) => y, default: () => "es" }),
    promptKey: Annotation<string | null>({ reducer: (_x, y) => y, default: () => null }),
    hotelId: Annotation<string>({ reducer: (_x, y) => y, default: () => "hotel999" }),
    conversationId: Annotation<string | null>({ reducer: (_x, y) => y, default: () => null }),
    meta: Annotation<Record<string, any>>({ reducer: (x, y) => ({ ...x, ...y }), default: () => ({}) }),
    reservationSlots: Annotation<{ guestName?: string; roomType?: string; checkIn?: string; checkOut?: string; numGuests?: number | string; }>({
        reducer: (x, y) => ({ ...x, ...y }),
        default: () => ({}),
    }),
    intentConfidence: Annotation<number>({ reducer: (_x, y) => y, default: () => 0.0 }),
    intentSource: Annotation<"heuristic" | "llm" | "embedding">({ reducer: (_x, y) => y, default: () => "heuristic" }),
    desiredAction: Annotation<"create" | "modify" | "cancel" | undefined>({ reducer: (_x, y) => y, default: () => undefined }),
    salesStage: Annotation<"qualify" | "quote" | "close" | "followup">({ reducer: (_x, y) => y, default: () => "qualify" }),
    lastOffer: Annotation<string | null>({ reducer: (_x, y) => y, default: () => null }),
    upsellCount: Annotation<number>({ reducer: (x, y) => (typeof y === "number" ? y : x ?? 0), default: () => 0 }),
});
