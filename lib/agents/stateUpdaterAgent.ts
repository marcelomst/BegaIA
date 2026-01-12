// Path: /root/begasist/lib/agents/stateUpdaterAgent.ts
import { upsertConvState } from "@/lib/db/convState";

export async function updateConversationState(hotelId: string, conversationId: string, patch: any) {
    return upsertConvState(hotelId, conversationId, patch);
}
