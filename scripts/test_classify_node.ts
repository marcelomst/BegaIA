// scripts/test_classify_node.ts
// Script interactivo para probar el nodo de clasificación manualmente

import readline from "readline";
import { classifyNode } from "../lib/agents/graph";
import { HumanMessage } from "@langchain/core/messages";

// Estado mínimo simulado para el grafo
function buildTestState(question: string) {
    return {
        messages: [new HumanMessage(question)],
        normalizedMessage: question,
        category: "retrieval_based",
        sentiment: "neutral" as "neutral",
        preferredLanguage: "es",
        hotelId: "system",
        reservationSlots: {},
        meta: {},
        salesStage: "qualify" as "qualify",
        conversationId: "test-conv",
        desiredAction: undefined,
        detectedLanguage: "es",
        promptKey: null,
        intentConfidence: 1,
        intentSource: "heuristic" as "heuristic",
        lastOffer: null,
        upsellCount: 0,
    };
}


async function classifyNodeTest(question: string) {
    const state = buildTestState(question);
    const result = await classifyNode(state);
    // Huella de ruta: muestra los parámetros clave y la decisión tomada
    const trace = {
        input: question,
        detectedLanguage: state.detectedLanguage,
        hotelId: state.hotelId,
        reservationSlots: state.reservationSlots,
        output: result,
    };
    console.log("--- TRACE ---");
    console.dir(trace, { depth: 4 });
    return result;
}

// CLI interactivo
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.question("Ingresa tu pregunta para clasificar: ", async (input) => {
    await classifyNodeTest(input);
    rl.close();
});
