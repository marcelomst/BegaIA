import { StateGraph } from "@langchain/langgraph";
import { classifyQuery } from "../classifier";
import { AIMessage, HumanMessage, BaseMessage } from "@langchain/core/messages";
import { pms } from "../pms";
import { ChatOpenAI } from "@langchain/openai";
import { createRetrieverTool } from "langchain/tools/retriever";
import { Annotation } from "@langchain/langgraph";
import { retrievalBased } from "./retrieval_based";
import { franc } from "franc";
import { promptMetadata } from "../prompts/promptMetadata";
import { debugLog } from "../utils/debugLog";
import { searchFromAstra } from "../retrieval";
import { detectLanguage } from "../utils/language";


process.env.OPENAI_LOG = "off";
debugLog("🔧 Compilando grafo conversacional...");

// ----------------------------
// Estado del grafo
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
  hotelId: Annotation<string>({
    reducer: (x, y) => y,
    default: () => "hotel123",
  }),
});

// ----------------------------
// Vector store y modelo (usado por retrievalBased)
export let vectorStore: any;
let retriever: any;
export let model: any;

export async function initializeVectorStore() {
  if (!vectorStore) {
    // Simula un retriever a partir de AstraDB
    vectorStore = {
      asRetriever: () => ({
        getRelevantDocuments: async (query: string) => {
          const results = await searchFromAstra(query, "hotel123");
          return results.map((text) => ({
            pageContent: text,
            metadata: {},
          }));
        },
      }),
    };

    retriever = createRetrieverTool(vectorStore.asRetriever(), {
      name: "retrieve_hotel_info",
      description: "Search hotel FAQs and policies.",
    });

    model = new ChatOpenAI({ model: "gpt-4o", temperature: 0 }).bindTools([retriever]);
    debugLog("✅ Vector store inicializado desde AstraDB (sin Puppeteer)");
  }
}

// ----------------------------
// Nodo de clasificación
export async function classifyNode(state: typeof GraphState.State) {
  const lastUserMessage = state.messages.findLast((m) => m instanceof HumanMessage);
  const question = typeof lastUserMessage?.content === "string" ? lastUserMessage.content.trim() : "";

  if (!question) {
    return {
      ...state,
      category: "retrieval_based",
      promptKey: null,
      messages: [
        ...state.messages,
        new AIMessage("Consulta vacía o no válida. Intenta reformular tu pregunta."),
      ],
    };
  }

  const detectedLang = detectLanguage(question);


  let classification;
  try {
    classification = await classifyQuery(question);
    debugLog("🔀 Clasificación detectada:", classification);
  } catch (e) {
    console.error("❌ Error clasificando la consulta:", e);
    classification = { category: "retrieval_based", promptKey: null };
  }

  const { category, promptKey } = classification;
  const validPromptKeys = promptMetadata[category] || [];
  const finalPromptKey = validPromptKeys.includes(promptKey || "") ? promptKey : null;

  debugLog("🧠 Clasificación final:", { category, promptKey: finalPromptKey });

  return {
    ...state,
    category,
    promptKey: finalPromptKey,
    detectedLanguage: detectedLang || process.env.SYSTEM_NATIVE_LANGUAGE,
    messages: [
      ...state.messages,
      new AIMessage(`Consulta clasificada como: ${category}${finalPromptKey ? ` (🧠 promptKey: ${finalPromptKey})` : ""}`),
    ],
  };
}

// ----------------------------
// Nodos funcionales del grafo
async function handleReservationNode() {
  const response = pms.createReservation("John Doe", "Deluxe", "2024-06-01", "2024-06-05");
  return { messages: [new AIMessage(`Reserva confirmada: ${response.id}`)] };
}
async function handleAmenitiesionNode() {
  return { messages: [new AIMessage("Aquí están los detalles de amenities.")] };
}
async function handleBillingNode() {
  return { messages: [new AIMessage("Aquí están los detalles de facturación.")] };
}
async function handleSupportNode() {
  return { messages: [new AIMessage("¿En qué puedo ayudarte? Nuestro equipo está disponible para asistirte.")] };
}
async function retrievalBasedNode(state: typeof GraphState.State) {
  return await retrievalBased(state);
}

// ----------------------------
// Definición del grafo
const graph = new StateGraph(GraphState)
  .addNode("classify", classifyNode)
  .addNode("handle_reservation", handleReservationNode)
  .addNode("handle_amenities", handleAmenitiesionNode)
  .addNode("handle_billing", handleBillingNode)
  .addNode("handle_support", handleSupportNode)
  .addNode("handle_retrieval_based", retrievalBasedNode)
  .addEdge("__start__", "classify")
  .addConditionalEdges("classify", (state) => state.category, {
    reservation: "handle_reservation",
    amenities: "handle_amenities",
    billing: "handle_billing",
    support: "handle_support",
    retrieval_based: "handle_retrieval_based",
  })
  .addEdge("handle_reservation", "__end__")
  .addEdge("handle_amenities", "__end__")
  .addEdge("handle_billing", "__end__")
  .addEdge("handle_support", "__end__")
  .addEdge("handle_retrieval_based", "__end__");

debugLog("✅ Grafo compilado con éxito.");
export const agentGraph = graph.compile();
