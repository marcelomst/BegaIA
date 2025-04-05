import { StateGraph } from "@langchain/langgraph";
import { classifyQuery } from "../classifier";
import { AIMessage, HumanMessage, BaseMessage } from "@langchain/core/messages";
import { pms } from "../pms";
import { loadDocuments } from "../retrieval/index";
import { ChatOpenAI } from "@langchain/openai";
import { createRetrieverTool } from "langchain/tools/retriever";
import { Annotation } from "@langchain/langgraph";
import { retrievalBased } from "./retrieval_based";
import { franc } from "franc";
import { promptMetadata } from "../prompts/promptMetadata";
import { debugLog } from "../utils/debugLog";

debugLog("🔧 Compilando grafo conversacional...");

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

export const vectorStore = await loadDocuments();
const retriever = createRetrieverTool(vectorStore.asRetriever(), {
  name: "retrieve_hotel_info",
  description: "Search hotel FAQs and policies.",
});
export const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0 }).bindTools([retriever]);

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

  const detectedLang = franc(question, { minLength: 3 });

  let classification;
  try {
    classification = await classifyQuery(question);
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

async function handleReservationNode() {
  const response = pms.createReservation("John Doe", "Deluxe", "2024-06-01", "2024-06-05");
  return { messages: [new AIMessage(`Reserva confirmada: ${response.id}`)] };
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

const graph = new StateGraph(GraphState)
  .addNode("classify", classifyNode)
  .addNode("handle_reservation", handleReservationNode)
  .addNode("handle_cancellation", handleReservationNode)
  .addNode("handle_billing", handleBillingNode)
  .addNode("handle_support", handleSupportNode)
  .addNode("handle_retrieval_based", retrievalBasedNode)
  .addEdge("__start__", "classify")
  .addConditionalEdges("classify", (state) => state.category, {
    reservation: "handle_reservation",
    cancellation: "handle_cancellation",
    billing: "handle_billing",
    support: "handle_support",
    retrieval_based: "handle_retrieval_based",
  })
  .addEdge("handle_reservation", "__end__")
  .addEdge("handle_cancellation", "__end__")
  .addEdge("handle_billing", "__end__")
  .addEdge("handle_support", "__end__")
  .addEdge("handle_retrieval_based", "__end__");

debugLog("✅ Grafo compilado con éxito.");

export const agentGraph = graph.compile();
