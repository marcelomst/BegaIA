// app/agents/billings.ts
import { AIMessage } from "@langchain/core/messages";
export function handleBilling() {
    return { messages: [new AIMessage("Handling billings query")] };
}
