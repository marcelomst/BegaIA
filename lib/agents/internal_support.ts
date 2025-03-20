// app/agents/internal_support.ts
import { AIMessage } from "@langchain/core/messages";
export function handleSupport() {
    return { messages: [new AIMessage("Handling support query")] };
}

