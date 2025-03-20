// app/agents/defaultResponse.ts
import { AIMessage } from "@langchain/core/messages";
export function defaultResponse() {
    return { messages: [new AIMessage("Handling default respponse query")] };
}
