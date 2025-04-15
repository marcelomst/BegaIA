import "dotenv/config";
import { retrievalBased } from "../lib/agents/retrieval_based";
import { GraphState } from "../lib/agents";
import { classifyQuery } from "../lib/classifier";
import { HumanMessage } from "@langchain/core/messages";
import { franc } from "franc";
import { ChatOpenAI } from "@langchain/openai";
import { setRetrievalModel } from "../lib/agents/retrieval_based";

setRetrievalModel(new ChatOpenAI({ modelName: "gpt-4o", temperature: 0 }));

const userInputs = [
  "¿Qué incluye la habitación triple?",
  "¿Cuál es la política de cancelación?",
  "¿Tienen servicio de transporte al aeropuerto?"
];
const hotelId = "hotel123";

async function testRetrievalBatch(inputs: string[]) {
  for (const userInput of inputs) {
    const detectedLang = franc(userInput, { minLength: 3 });
    const { category, promptKey } = await classifyQuery(userInput);

    const initialState = {
      messages: [new HumanMessage(userInput)],
      category,
      promptKey,
      detectedLanguage: detectedLang,
      hotelId,
    };

    const result = await retrievalBased(initialState as any as typeof GraphState.State);

    const lastMsg = result.messages.findLast(
      (m) => m.constructor.name === "AIMessage" || m.constructor.name === "HumanMessage"
    );
    console.log("\n🧠 Respuesta del nodo retrievalBased para la entrada:");
    console.log(`Usuario: ${userInput}`);
    console.log(`Respuesta: ${lastMsg?.content}`);
  }
}

testRetrievalBatch(userInputs);
