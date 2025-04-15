// scripts/test-retrieval-wifi.ts
import "dotenv/config";
import { retrievalBased } from "../lib/agents/retrieval_based";
import { HumanMessage } from "@langchain/core/messages";

const userInput = "tienen wifi";
const hotelId = "hotel123";

async function main() {
  const state = {
    messages: [new HumanMessage(userInput)],
    category: "retrieval_based",
    promptKey: "room_info",
    detectedLanguage: "spa", // Forzamos español
    hotelId,
  };

  const result = await retrievalBased(state as any); // 👈 evitamos el tipo GraphState
  const lastMsg = result.messages.findLast((m) => m.constructor.name === "AIMessage");
  console.log("\n🧠 Respuesta con context de Astra:");
  console.log(lastMsg?.content);
}

main();
