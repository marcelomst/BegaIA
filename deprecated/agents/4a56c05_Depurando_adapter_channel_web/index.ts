// Path: /root/begasist/lib/agents/index.ts

import { StateGraph } from "@langchain/langgraph";
import { AIMessage, HumanMessage, BaseMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { createRetrieverTool } from "langchain/tools/retriever";
import { Annotation } from "@langchain/langgraph";
import { retrievalBased } from "./retrieval_based";
import { promptMetadata } from "../prompts/promptMetadata";
import { debugLog } from "../utils/debugLog";
import { searchFromAstra } from "../retrieval";
import { translateIfNeeded } from "@/lib/i18n/translateIfNeeded";
import { getHotelNativeLanguage } from "@/lib/config/hotelLanguage";
import { handleReservation } from "@/lib/agents/reservations";
import { handleClassify } from "./classify";

// ----------------------------
// Estado del grafo: SOLO recibe, no calcula idioma ni sentimiento
export const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [] as BaseMessage[],
  }),
  normalizedMessage: Annotation<string>({
    reducer: (x, y) => y,
    default: () => "",
  }),
  category: Annotation<string>({
    reducer: (x, y) => y,
    default: () => "other",
  }),
  detectedLanguage: Annotation<string>({
    reducer: (x, y) => y,
    default: () => "en", // Por defecto
  }),
  sentiment: Annotation<"positive" | "neutral" | "negative">({
    reducer: (x, y) => y,
    default: () => "neutral",
  }),
  preferredLanguage: Annotation<string>({
    reducer: (x, y) => y,
    default: () => "en",
  }),
  promptKey: Annotation<string | null>({
    reducer: (x, y) => y,
    default: () => null,
  }),
  hotelId: Annotation<string>({
    reducer: (x, y) => y,
    default: () => "hotel999",
  }),
  conversationId: Annotation<string | null>({
    reducer: (x, y) => y,
    default: () => null,
  }),
  meta: Annotation<Record<string, any>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  reservationSlots: Annotation<{
    guestName?: string;
    roomType?: string;
    checkIn?: string;
    checkOut?: string;
    numGuests?: string;
  }>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),

  // --- NUEVO: estado comercial para "vendedor experimentado"
  salesStage: Annotation<"qualify" | "quote" | "close" | "followup">({
    reducer: (_x, y) => y,
    default: () => "qualify",
  }),
  lastOffer: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  upsellCount: Annotation<number>({
    reducer: (x, y) => (typeof y === "number" ? y : x ?? 0),
    default: () => 0,
  }),
});

// ----------------------------
// Vector store y modelo (usado por retrievalBased)
export let vectorStore: any;
let retriever: any;
export let model: any;

export async function initializeVectorStore() {
  if (!vectorStore) {
    vectorStore = {
      asRetriever: () => ({
        getRelevantDocuments: async (query: string) => {
          const results = await searchFromAstra(query, "hotel999");
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
  return await handleClassify(state);
}

// ----------------------------
// Nodos funcionales (ejemplos)

async function handleSupportNode(state: typeof GraphState.State) {
  const sent = state.sentiment ?? "neutral";
  let reply = "";

  if (sent === "negative") {
    reply = "Lamento que estés teniendo una mala experiencia. ¿En qué puedo ayudarte para mejorar tu estancia?";
  } else if (sent === "positive") {
    reply = "¡Qué alegría saber que todo va bien! ¿Hay algo más en lo que te pueda ayudar?";
  } else {
    reply = "¿En qué puedo ayudarte? Nuestro equipo está disponible para asistirte.";
  }

  const originalLang = state.detectedLanguage ?? "en";
  const hotelLang = await getHotelNativeLanguage(state.hotelId);
  const replyToUser = await translateIfNeeded(reply, hotelLang, originalLang);
  return { messages: [new AIMessage(replyToUser)] };
}

export async function handleReservationNode(state: typeof GraphState.State) {
  // Delegamos en reservations.ts (ahí está la lógica comercial)
  return await handleReservation(state);
}

async function handleCancelReservationNode(state: typeof GraphState.State) {
  // Conservamos tu flujo actual en otro nodo específico si lo necesitás
  // (Se sugiere mover aquí el parsing real de cancelación cuando lo implementes)
  return { messages: [new AIMessage("Para ayudarte a cancelar, ¿me confirmás el código de reserva?")] };
}

async function handleAmenitiesionNode() {
  return { messages: [new AIMessage("Aquí están los detalles de amenities.")] };
}
async function handleBillingNode() {
  return { messages: [new AIMessage("Aquí están los detalles de facturación.")] };
}
async function retrievalBasedNode(state: typeof GraphState.State) {
  return await retrievalBased(state);
}

// ----------------------------
// Definición del grafo
const graph = new StateGraph(GraphState)
  .addNode("classify", classifyNode)
  .addNode("handle_reservation", handleReservationNode)
  .addNode("handle_cancel_reservation", handleCancelReservationNode)
  .addNode("handle_amenities", handleAmenitiesionNode)
  .addNode("handle_billing", handleBillingNode)
  .addNode("handle_support", handleSupportNode)
  .addNode("handle_retrieval_based", retrievalBasedNode)
  .addEdge("__start__", "classify")
  .addConditionalEdges("classify", (state) => state.category, {
    reservation: "handle_reservation",
    cancel_reservation: "handle_cancel_reservation",
    amenities: "handle_amenities",
    billing: "handle_billing",
    support: "handle_support",
    retrieval_based: "handle_retrieval_based",
  })
  .addEdge("handle_reservation", "__end__")
  .addEdge("handle_cancel_reservation", "__end__")
  .addEdge("handle_amenities", "__end__")
  .addEdge("handle_billing", "__end__")
  .addEdge("handle_support", "__end__")
  .addEdge("handle_retrieval_based", "__end__");

debugLog("✅ Grafo compilado con éxito.");
export const agentGraph = graph.compile();
