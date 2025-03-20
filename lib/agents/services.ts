// app/agents/services.ts
import { AIMessage } from "@langchain/core/messages";
export function handleServices() {
    return { messages: [new AIMessage("Handling services query")] };
}