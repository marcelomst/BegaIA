# 🏨 Hotel Assistant - Conversational Flow with LangGraph + LangChain

Este proyecto implementa un **asistente conversacional para hotelería** utilizando **LangGraph** y **LangChain**, modelando la lógica de decisión mediante un grafo de estados. Cada nodo representa una intención o acción específica del usuario durante una conversación.

---

## 🧠 Tecnologías utilizadas

- **LangGraph**: Para modelar flujos de conversación como grafos de estados.
- **LangChain**: Para construir, ejecutar y mantener agentes, cadenas, prompts e integraciones con modelos de lenguaje.
- **Next.js**: Frontend/servidor para interacción con el usuario.
- **WSL (Windows Subsystem for Linux)**: Entorno de desarrollo.
- **Vitest**: Para plan de tests.

---

## 🔁 Flujo Conversacional

```ts
const graph = new StateGraph(GraphState)
  .addNode("classify", classifyNode)
  .addNode("handle_reservation", handleReservationNode)
  .addNode("handle_cancellation", handleReservationNode)
  .addNode("handle_billing", handleBillingNode)
  .addNode("handle_support", handleSupportNode)
  .addNode("handle_retrieval_based", retrievalBasedNode)

  // 🔁 Transiciones
  .addEdge("__start__", "classify")
  .addConditionalEdges("classify", (state) => state.category, {
    reservation: "handle_reservation",
    cancellation: "handle_cancellation",
    billing: "handle_billing",
    support: "handle_support",
    retrieval_based: "handle_retrieval_based",
  })

  // 🔚 Finales
  .addEdge("handle_reservation", "__end__")
  .addEdge("handle_cancellation", "__end__")
  .addEdge("handle_billing", "__end__")
  .addEdge("handle_support", "__end__")
  .addEdge("handle_retrieval_based", "__end__");
## 📚 Descripción de nodos
- classifyNode: Usa LangChain para identificar la categoría del mensaje del usuario 
    (por   ejemplo, reserva, habitación, etc.).

- handle_reservation: Gestiona solicitudes de reserva.

- handle_cancellation: gestiona cancelaciones.

- handle_billing: Gestiona facturacion.

- handle_support: Responde a procedimientos como cancelaciones, check in, etc.

- handle_retrieval_based: Respuesta genericas de intenciones sin configurar.

## 🗂️ Ejemplos de flujo
Mensaje del usuario	Nodo que responde
"¿Qué tipos de habitaciones tienen?"	handle_retrieval_based
"Quiero reservar una habitación doble"	handle_reservation
"¿Qué comodidades ofrece el hotel?"	handle_retrieval_based
"¿Cuál es la política de cancelación?"	handle_support
"¿Aceptan mascotas extraterrestres?"	handle_retrieval_based
"Quiero cancelar mi resrva"	handle_cancellation
"Quiero pagar mi estadia "	handle_billing

## 🎯 Objetivo

Brindar un asistente virtual hotelero capaz de:

Responder preguntas frecuentes de forma rápida y precisa.

Automatizar tareas comunes como reservas y consultas.

Integrarse con otros sistemas mediante LangChain para escalabilidad y personalización.
##  📂 Estructura del Proyecto
.
├── README.md
├── app
│   ├── api
│   │   ├── chat
│   │   │   ├── route.ts
│   │   │   └── route.ts:Zone.Identifier
│   │   ├── email 
│   │   └── whatsapp
│   │       └── route.ts
│   ├── favicon.ico
│   ├── generatePDF.js
│   ├── globals.css
│   ├── layout.tsx
│   ├── lib
│   │   └── translation.ts
│   ├── page.tsx
│   └── taildocs.txt
├── arquitectura.txt
├── documentacion
├── ecosystem.config.js
├── eslint.config.mjs
├── estructura_del_proyecto.txt
├── generate_architecture.sh
├── google-chrome-stable_current_amd64.deb
├── info.txt
├── lib
│   ├── agents
│   │   ├── billing.ts
│   │   ├── defaultResponse.ts
│   │   ├── index.ts
│   │   ├── internal_support.ts
│   │   ├── reservations.ts
│   │   ├── retrieval_based.ts
│   │   └── services.ts
│   ├── classifier
│   │   └── index.ts
│   ├── config.ts
│   ├── entrypoints
│   │   ├── all.ts
│   │   ├── email.ts
│   │   └── whatsapp.ts
│   ├── pms
│   │   └── index.ts
│   ├── prompts
│   │   ├── index.ts
│   │   └── promptMetadata.ts
│   ├── retrieval
│   │   └── index.ts
│   ├── services
│   │   ├── email.ts
│   │   ├── whatsapp.ts
│   │   └── whatsappClient.ts
│   └── utils
│       └── debugLog.ts
├── next
├── next-env.d.ts
├── next.config.ts
├── output_cleaned.txt
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
├── public
│   ├── file.svg
│   ├── fonts
│   │   ├── geist-latin-ext.woff2
│   │   ├── geist-latin.woff2
│   │   ├── geist-mono-latin-ext.woff2
│   │   └── geist-mono-latin.woff2
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── scripts
│   └── testClassifier.ts
├── src
│   ├── app.ts
│   ├── config.ts
│   ├── hotel_agent_uml.uml
│   └── utils
├── tailwind.config.ts
├── test
│   ├── agents.test.ts
│   ├── chat.test.ts
│   ├── data
│   │   ├── 05-versions-space.pdf
│   │   └── 05-versions-space.pdf.txt
│   ├── presentacion.test.ts
│   ├── retrieval.test.ts
│   └── ui.test.tsx
├── testAstraConnection.ts
├── touch @types
│   └── rehype-raw.d.ts
├── tsconfig.json
├── tsconfig.tsbuildinfo
├── types
│   └── mailparser.d.ts
├── vector_cache
│   └── rooms_vectorstore.json
├── vitest.config.ts
└── vitest.setup.ts

27 directories, 74 files

##  Scripts claves

###📍 lib/agents/index.ts

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

console.log("🔧 Compilando grafo conversacional...");

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

  // Validación defensiva (promptKey debe estar autorizado para esa categoría)
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
async function retrievalBasedNode(state: typeof GraphState.State) {
  return await retrievalBased(state);
}

// 🕸️ Construcción del grafo de estados
const graph = new StateGraph(GraphState)
  .addNode("classify", classifyNode)
  .addNode("handle_reservation", handleReservationNode)
  .addNode("handle_cancellation", handleReservationNode)
  .addNode("handle_billing", handleBillingNode)
  .addNode("handle_support", handleSupportNode)
  .addNode("handle_retrieval_based", retrievalBasedNode)

  // 🔁 Transiciones
  .addEdge("__start__", "classify")
  .addConditionalEdges("classify", (state) => state.category, {
    reservation: "handle_reservation",
    cancellation: "handle_cancellation",
    billing: "handle_billing",
    support: "handle_support",
    retrieval_based: "handle_retrieval_based",
  })

  // 🔚 Finales
  .addEdge("handle_reservation", "__end__")
  .addEdge("handle_cancellation", "__end__")
  .addEdge("handle_billing", "__end__")
  .addEdge("handle_support", "__end__")
  .addEdge("handle_retrieval_based", "__end__");

console.log("✅ Grafo compilado con éxito.");

// 🚀 Exportar grafo compilado
export const agentGraph = graph.compile();

### 📍 lib/classifier/index.ts

import { ChatOpenAI } from "@langchain/openai";
import { promptMetadata } from "../prompts/promptMetadata";
import { debugLog } from "../utils/debugLog";

export type Classification = {
  category: string;
  promptKey?: string | null;
};

const classifierModel = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 0,
});

export async function classifyQuery(question: string): Promise<Classification> {
  const allowedCategories = Object.keys(promptMetadata).join(", ");
  const allPromptKeys = Object.entries(promptMetadata)
    .flatMap(([_, keys]) => keys)
    .filter(Boolean);

  const prompt = `
Dada la siguiente consulta del usuario, responde solo con un JSON válido con dos campos:

- "category": una de las siguientes: ${allowedCategories}
- "promptKey": si la categoría necesita un prompt curado especial, elige una de: [${allPromptKeys.join(", ")}]; si no, pon null.

Ejemplo de respuesta:
{
  "category": "retrieval_based",
  "promptKey": "room_info"
}

Consulta:
"${question}"
`.trim();

  const res = await classifierModel.invoke([{ role: "user", content: prompt }]);

  try {
    const parsed = JSON.parse(res.content as string);

    const category = parsed.category;
    const promptKey = parsed.promptKey;

    if (!promptMetadata[category]) {
      throw new Error(`❌ Categoría inválida detectada: ${category}`);
    }

    const isValidPrompt =
      promptKey === null || promptMetadata[category].includes(promptKey);

    if (!isValidPrompt) {
      throw new Error(`❌ Prompt key inválido: ${promptKey} para categoría: ${category}`);
    }

    debugLog("🧠 Clasificación final:", { category, promptKey });
    return { category, promptKey };
  } catch (e) {
    console.error("❌ Error al parsear o validar respuesta del clasificador:", res.content);
    return { category: "retrieval_based", promptKey: null };
  }
}

### /root/begasist/app/api/chat/route.ts

import { NextResponse } from "next/server";
import { agentGraph } from "/../lib/agents/index.ts";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { debugLog } from "../../../lib/utils/debugLog";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    debugLog("🔍 Consulta recibida:", query);

    const response = await agentGraph.invoke({
      messages: [new HumanMessage(query)],
    });

    // Buscar el último mensaje que sea un AIMessage y obtener su contenido
    const aiMessage = response.messages.findLast(
      (msg) => msg instanceof AIMessage
    ) as AIMessage | undefined;

    const responseText = aiMessage?.content || "No se encontró una respuesta.";

    debugLog("📌 Respuesta enviada:", responseText);

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error("⛔ Error en la API /api/chat:", error);
    return NextResponse.json(
      { response: "Ocurrió un error al procesar la solicitud." },
      { status: 500 }
    );
  }
}


## 🔧 Notas Técnicas

### 🎨 Tailwind CSS: versión recomendada

Este proyecto utiliza **Tailwind CSS `^3.4.1`**, ya que es la última versión completamente estable y compatible con:

- **Next.js 15**
- **Turbopack**
- Configuración simple (`postcss.config.cjs` sin plugins adicionales)
- Generación de estilos inmediata sin errores de CLI

```json
"devDependencies": {
  "tailwindcss": "^3.4.1",
  "postcss": "^8.4.38",
  "autoprefixer": "^10.4.17"
}```

## 🚀 Inicio del Sistema

Para poner en marcha todos los canales del asistente conversacional (web, email, WhatsApp y channel manager), seguí estos pasos en dos terminales separadas:

### 1️⃣ Terminal 1 – Iniciar canal web (interfaz por navegador)

bash

pnpm run dev
Esto levanta el frontend en Next.js, accesible desde http://localhost:3000 si estás en local. Ideal para pruebas por navegador.

### 2️⃣ Terminal 2 – Iniciar canales integrados (email, WhatsApp y channel manager)

bash

pnpm run start:all
Este comando ejecuta el entrypoint lib/entrypoints/all.ts, que inicia simultáneamente:

📧 Canal Email: escucha correos entrantes cada 15s y responde automáticamente.

💬 Canal WhatsApp: si ENABLE_WHATSAPP=true en .env, inicia el bot por WhatsApp.

🛰️ Channel Manager: simula nuevas reservas cada 15s y las pasa al asistente.

⚙️ El sistema está diseñado como una solución omnicanal, donde todos los mensajes entrantes, sin importar el origen, son procesados por el mismo grafo conversacional.