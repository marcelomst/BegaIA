// 📍 lib/agents/index.ts

import { StateGraph } from "@langchain/langgraph";
import { classifyQuery } from "../classifier";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { pms } from "../pms";
import { loadDocuments } from "../retrieval/index";
import { ChatOpenAI } from "@langchain/openai";
import { createRetrieverTool } from "langchain/tools/retriever";
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { handleDefaultWithContext } from "./default_with_context";
import { franc } from "franc";

// 🧠 Estado global del grafo
export const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [] as BaseMessage[],
  }),
  category: Annotation<string>({
    reducer: (x, y) => y,
    default: () => "other",
  }),
  detectedLanguage: Annotation<string>({
    reducer: (x, y) => y,
    default: () => "en",
  }),
  promptKey: Annotation<string | null>({
    reducer: (x, y) => y,
    default: () => null,
  }),
});

// 📚 Cargar documentos y herramientas de recuperación
export const vectorStore = await loadDocuments();
const retriever = createRetrieverTool(vectorStore.asRetriever(), {
  name: "retrieve_hotel_info",
  description: "Search hotel FAQs and policies.",
});
export const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0 }).bindTools([retriever]);

// 🔍 Nodo: Clasificador de intención + detección de idioma
export async function classifyNode(state: any) {
  const lastUserMessage = state.messages.findLast((m: any) => m instanceof HumanMessage);
  const question = typeof lastUserMessage?.content === "string" ? lastUserMessage.content.trim() : "";
  const detectedLang = franc(question, { minLength: 3 });

  const { category, promptKey } = await classifyQuery(question);

  return {
    ...state,
    category,
    promptKey,
    detectedLanguage: detectedLang || process.env.SYSTEM_NATIVE_LANGUAGE,
    messages: [
      ...state.messages,
      new AIMessage(`Consulta clasificada como: ${category}`),
    ],
  };
}

// 📅 Nodo: Gestión de reservas (también maneja cancelaciones)
async function handleReservationNode() {
  const response = pms.createReservation("John Doe", "Deluxe", "2024-06-01", "2024-06-05");
  return { messages: [new AIMessage(`Reserva confirmada: ${response.id}`)] };
}

// 💳 Nodo: Facturación
async function handleBillingNode() {
  return { messages: [new AIMessage("Aquí están los detalles de facturación.")] };
}

// 🛟 Nodo: Soporte
async function handleSupportNode() {
  return { messages: [new AIMessage("¿En qué puedo ayudarte? Nuestro equipo está disponible para asistirte.")] };
}

// 🤖 Nodo: IA + recuperación de contexto
async function defaultWithContextNode(state: typeof GraphState.State) {
  return await handleDefaultWithContext(state);
}

// 🕸️ Construcción del grafo de estados
const graph = new StateGraph(GraphState)
  .addNode("classify", classifyNode)
  .addNode("handle_reservation", handleReservationNode)
  .addNode("handle_cancellation", handleReservationNode) // misma lógica que reservas
  .addNode("handle_billing", handleBillingNode)
  .addNode("handle_support", handleSupportNode)
  .addNode("handle_default_with_context", defaultWithContextNode)

  // 🔁 Transiciones
  .addEdge("__start__", "classify")
  .addConditionalEdges("classify", (state) => state.category, {
    reservation: "handle_reservation",
    cancellation: "handle_cancellation",
    billing: "handle_billing",
    support: "handle_support",
    other: "handle_default_with_context",
  })

  // 🔚 Finales
  .addEdge("handle_reservation", "__end__")
  .addEdge("handle_cancellation", "__end__")
  .addEdge("handle_billing", "__end__")
  .addEdge("handle_support", "__end__")
  .addEdge("handle_default_with_context", "__end__");

console.log("✅ Grafo compilado con éxito.");

// 🚀 Exportar grafo compilado
export const agentGraph = graph.compile();
