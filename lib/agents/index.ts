/// fusión de:
// handleRoomInfoNode_001 F app/agents/index.ts F formattedPrompt_001

import { StateGraph } from "@langchain/langgraph";
import { classifyQuery } from "./classifier";
import { AIMessage } from "@langchain/core/messages";
import { pms } from "../pms";
import { loadDocuments } from "../retrieval/index";
import { ChatOpenAI } from "@langchain/openai";
import { createRetrieverTool } from "langchain/tools/retriever";
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { handleRoomInfoNode } from "./room_info";

// Definir el estado del grafo correctamente
export const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [] as BaseMessage[],
  }),
  category: Annotation<string>({
    reducer: (x, y) => y,
    default: () => "other",
  }),
});

// Cargar documentos y configurar herramientas
export const vectorStore = await loadDocuments();
const retriever = createRetrieverTool(vectorStore.asRetriever(), {
  name: "retrieve_hotel_info",
  description: "Search hotel FAQs and policies.",
});
export const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0 }).bindTools([retriever]);

// 🔹 Función para clasificar la consulta del usuario
async function classifyNode(state: typeof GraphState.State) {
  try {
    const contentText = typeof state.messages[0].content === "string" ? state.messages[0].content : "";
    const category = await classifyQuery(contentText);

    return { category };
  } catch (error) {
    console.error("⛔ Error en clasificación:", error);
    return { category: "other" }; // Retornar una categoría segura
  }
}

// 🔹 Función para manejar reservas en el PMS
async function handleReservationNode() {
  const response = pms.createReservation("John Doe", "Deluxe", "2024-06-01", "2024-06-05");
  return { messages: [new AIMessage({ content: "Reservation confirmed: ${response.id}"})] };
}


// 🔹 Función para manejar respuestas predeterminadas
async function defaultResponseNode() {
  return { messages: [new AIMessage("Lo siento, no entendí la solicitud. Inténtalo nuevamente.")] };
}

// 🔹 Construcción del grafo de estados
const graph = new StateGraph(GraphState)
  .addNode("classify", classifyNode)
  .addNode("handle_reservation", handleReservationNode)
  .addNode("handle_room_info", handleRoomInfoNode)
  .addNode("handle_amenities", async () => ({ messages: [new AIMessage("Aquí están nuestras comodidades.")] }))
  .addNode("handle_cancellation", async () => ({ messages: [new AIMessage("Detalles de cancelación...")] }))
  .addNode("default_response", defaultResponseNode)
  .addEdge("__start__", "classify")
  .addConditionalEdges("classify", (state) => state.category, {
    room_info: "handle_room_info",
    reservation: "handle_reservation",
    amenities: "handle_amenities",
    cancellation: "handle_cancellation",
    other: "default_response",
  })
  .addEdge("default_response", "__end__");

console.log("✅ Grafo compilado con éxito.");

// Exportar el grafo compilado
export const agentGraph = graph.compile();