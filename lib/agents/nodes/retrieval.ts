import { retrievalBased } from "@/lib/agents/retrieval_based";
import type { GraphState } from "../graphState";

export async function retrievalBasedNode(state: typeof GraphState.State) {
    return await retrievalBased(state);
}
