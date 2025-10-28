# 🏨 Hotel Assistant - Conversational Flow with LangGraph + LangChain

[![ci-core](https://github.com/marcelomst/BegaIA/actions/workflows/ci-core.yml/badge.svg?branch=main)](https://github.com/marcelomst/BegaIA/actions/workflows/ci-core.yml)

Este proyecto implementa un **asistente conversacional para hotelería** utilizando **LangGraph** y **LangChain**, modelando la lógica de decisión mediante un grafo de estados. Cada nodo representa una intención o acción específica del usuario durante una conversación.

---

## 🔎 Para desarrolladores

- Documentación técnica extendida y criterios de test: ver `README.dev.md`.
- Este README resume la arquitectura de alto nivel y añade secciones prácticas para correr y testear el core.

## ⚡ Quickstart

Ejecutar el frontend/API en modo desarrollo:

```bash
pnpm dev
```

Ejecutar el core de tests (rápidos y deterministas):

```bash
pnpm test:core
```

CI ejecuta este set en `ci-core.yml`.

## 🧪 Core Test Suite (resumen)

Incluye pruebas de alto valor y bajo costo de ejecución:

- Reservas: `graph.reservation.persist.spec.ts`, `graph.reservation.verify_and_snapshot.spec.ts`, `e2e.reservation.flow.spec.ts`, `agents.reservations.unit.spec.ts`.
- Señales/fechas: `graph.signals.chrono.spec.ts`, `chrono.layer.spec.ts`.
- Autosend seguro: `unit/messageHandler.autosend.snapshot_verify.test.ts` (snapshot, verify, close).
- Infra canal/idempotencia: `unit/universalChannelEventHandler.test.ts`, `unit/universalChannelEventHandler.idempotency.test.ts`, `unit/messageGuards.lwt.test.ts`.
- Integración liviana API: `integration/api_messages_by-conversation.test.ts`, `integration/api_chat.test.ts`.

Lo que queda fuera: pruebas lentas o con dependencias externas (van a `deprecated/` o jobs opt‑in).

## 📸 Snapshot/Verify de reservas (UX segura)

- El grafo reconoce pedidos de “corroborar/comprobar/averiguar” y responde con un snapshot de la reserva:
  - Si hay confirmada (`salesStage=close`): muestra “confirmada” y el código.
  - Si hay borrador/en curso: muestra estado “en curso (no confirmada)”.
- Estas respuestas se envían en “auto‑send” (no quedan en “pendiente/supervisión”).
- Cubierto por `messageHandler.autosend.snapshot_verify.test.ts`.

## 🔁 Idempotencia de `/api/chat`

El cliente puede enviar `messageId` propio. El servidor:

- Reutiliza ese `messageId` en el ACK inicial (`message.messageId`).
- En reintentos con el mismo `messageId`, no duplica el mensaje entrante y responde `200` con `deduped: true` y el mismo `messageId`.

Implementación y notas:

- La API mapea `messageId` → `sourceMsgId` del mensaje entrante, habilitando el dedupe por conversación.
- En replay, se detecta la condición idempotente y se retorna un ACK estable (sin disparar SSE adicional).
- Validado por `test/integration/api_chat.test.ts` (chequea `deduped: true` y reuse del `messageId`).

Ejemplo de ACK en replay idempotente:

```json
{
  "conversationId": "conv-123",
  "status": "sent",
  "message": {
    "hotelId": "hotel999",
    "conversationId": "conv-123",
    "channel": "web",
    "messageId": "msg-fixed-1",
    "status": "sent"
  },
  "lang": "es",
  "deduped": true
}
```

## 🧠 Tecnologías utilizadas

## 🧩 Endpoints principales (resumen)

- Documentación interactiva: `/api/docs` (Swagger UI) cargando `public/openapi.yaml`.

  - Incluye ejemplos de request/response por endpoint.

- POST `/api/chat`

  - Entrada: `{ hotelId?, channel?, conversationId?, guestId?, messageId?, content|text|query, mode? }`
  - Salida: `{ conversationId, status: "sent"|"pending", message: { messageId, status, suggestion? }, lang, deduped? }`
  - Notas: idempotente por `messageId` (ver sección anterior).
  - Ejemplo (request): `{ "channel": "web", "content": "Hola", "messageId": "msg-1" }`
  - Ejemplo (response): `{ "conversationId": "conv-1", "status": "sent", "message": {"messageId": "msg-1", "status": "sent"}, "lang": "es" }`

- GET `/api/messages/by-conversation?hotelId=&channelId=&conversationId=&guestId?`

  - Salida: `{ messages: ChannelMessage[] }` ordenados por `timestamp` ascendente.
  - Seguridad: si se pasa `guestId`, valida que la conversación pertenezca al huésped/hotel.
  - Ejemplo: `/api/messages/by-conversation?hotelId=hotel999&channelId=web&conversationId=conv-1`

- GET `/api/messages?channelId=`

  - Requiere usuario autenticado.
  - Salida: `{ messages: ChannelMessage[] }` del canal.
  - POST `/api/messages` permite actualizar `approvedResponse`, `status`, `respondedBy` de un mensaje.
  - Ejemplo (GET): `/api/messages?channelId=web`
  - Ejemplo (POST body): `{ "messageId": "m-1", "channel": "web", "status": "approved" }`

- GET `/api/health`

  - Healthcheck básico del servicio.
  - Ejemplo: `{ ok: true, ts: "2025-09-29T12:34:56.000Z", version: "0.1.0", commit: "abcdef1" }`

- GET `/api/meta`

  - Metadatos públicos no sensibles del servicio (útil para diagnósticos y despliegue).
  - Devuelve versión, commit (si está disponible), entorno, proveedores disponibles y flags de features.
  - Ejemplo:
    ```json
    {
      "ok": true,
      "version": "0.1.0",
      "commit": "abcdef1",
      "env": "development",
      "providers": { "openai": false, "groq": false },
      "features": {
        "autosendSafeIntents": true,
        "idempotentChatAck": true,
        "swaggerUi": true
      },
      "now": "2025-09-29T12:35:56.000Z"
    }
    ```

- GET `/api/conversations/list`

  - Lista conversaciones por hotel/usuario (detalle en código fuente).
  - Ejemplo: `/api/conversations/list?hotelId=hotel999&channel=web`

- GET `/api/conversations/state?hotelId=&conversationId=`

  - Entrada: `hotelId` opcional (por defecto `hotel999` o del usuario) y `conversationId` obligatorio.
  - Salida: `{ reservationSlots, lastReservation, lastProposal, salesStage, updatedAt }` del estado de la conversación.
  - Notas: valida que la conversación pertenezca al `hotelId` indicado.
  - Ejemplo: `/api/conversations/state?hotelId=hotel999&conversationId=conv-1`

- POST `/api/conversations/create`

  - Entrada: `{ hotelId, channel, guestId }` (campos requeridos).
  - Salida: `201` con el objeto `Conversation` creado.
  - Notas: requiere usuario autenticado.
  - Ejemplo (request): `{ "hotelId": "hotel999", "channel": "web", "guestId": "guest-1" }`
  - Ejemplo (response 201): `{ "conversationId": "conv-1", "hotelId": "hotel999", "guestId": "guest-1", "channel": "web", "lang": "es" }`

- **LangGraph**: Para modelar flujos de conversación como grafos de estados.
- **LangChain**: Para construir, ejecutar y mantener agentes, cadenas, prompts e integraciones con modelos de lenguaje.
- **Next.js**: Frontend/servidor para interacción con el usuario.
- **WSL (Windows Subsystem for Linux)**: Entorno de desarrollo.
- **Vitest**: Para plan de tests.

---

## � Métricas operativas

- Endpoint: GET `/api/diagnostics`
- Alcance: solo en desarrollo y test.
- Guarda de entorno: el endpoint responde 404 si `NODE_ENV === "production"` a menos que `DEBUG_BEGA === "1"`.
  - Regla exacta: `ALLOW_DIAG = NODE_ENV !== "production" || DEBUG_BEGA === "1"`.

Campos devueltos:

- `version`: versión del handler (MH_VERSION).
- `metrics` (snapshot en memoria):
  - `at`: timestamp de la captura.
  - `autosend_total`: total de decisiones de autosend registradas.
  - `autosend_by_reason`: conteo por motivo de autosend.
    - Claves: `snapshot_verify`, `close_stage`, `safe_category`, `supervised_pending`, `automatic_default`.
  - `autosend_by_category`: conteo por categoría inferida (dinámico, en minúsculas).
  - `supervised_ratio_window`: ventana de conteo `{ sent, pending }` según estado final del mensaje (`sent` vs `pending`).

Ejemplo de respuesta:

```json
{
  "ok": true,
  "version": "mh-2025-09-23-structured-01",
  "metrics": {
    "at": "2025-10-09T12:34:56.000Z",
    "autosend_total": 7,
    "autosend_by_reason": {
      "snapshot_verify": 3,
      "close_stage": 1,
      "safe_category": 2,
      "supervised_pending": 1,
      "automatic_default": 0
    },
    "autosend_by_category": {
      "reservation_snapshot": 2,
      "reservation_verify": 1,
      "retrieval_based": 2,
      "cancel_reservation": 1,
      "unknown": 1
    },
    "supervised_ratio_window": { "sent": 6, "pending": 1 }
  },
  "now": "2025-10-09T12:34:56.000Z"
}
```

Notas:

- Los contadores son in-memory (se reinician al reiniciar el proceso). Para pruebas automatizadas existe un `reset()` interno no expuesto por HTTP.
- Útil para diagnosticar razones de autosend y distribución por categorías durante sesiones de QA.

## �🗃️ Documentación histórica (DEPRECADA)

ATENCIÓN: Desde aquí y hasta el final, la documentación corresponde a un prototipo anterior y se mantiene solo como referencia histórica. No refleja la arquitectura y contratos actuales validados por la suite core ni el comportamiento documentado arriba (autosend, idempotencia, endpoints). Preferir las secciones superiores de este README y `README.dev.md`.

## 🔁 Flujo Conversacional

````ts
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

### 🌓 Modo oscuro y soporte temático en componentes
Componentes como DarkCard usan variables de CSS definidas en globals.css para adaptar automáticamente su estilo al tema claro u oscuro.

#### ✅ Reglas claves aplicadas
Se usan clases como bg-background, text-foreground, border, text-muted-foreground en lugar de colores fijos.

Estas clases se basan en variables definidas en globals.css:

:root {
  --background: #ffffff;
  --foreground: #171717;
  --border: #e5e7eb;
  --muted-foreground: #6b7280;
}

html.dark {
  --background: #0a0a0a;
  --foreground: #ededed;
  --border: #444;
  --muted-foreground: #a1a1aa;
}
El darkMode: "class" está activado en tailwind.config.js.

Se evita usar useTheme() o document.documentElement.className en los propios componentes, lo que garantiza compatibilidad total con SSR/CSR.

#### 🧩 Ejemplo correcto (DarkCard.tsx)

<Card className="bg-background text-foreground border border-border shadow-md rounded-2xl min-h-[220px] h-auto transition-colors duration-300">
  <CardContent className="p-6 flex flex-col justify-between h-full">
    <h2 className="text-xl font-semibold mb-2">{title}</h2>
    <p className="text-sm text-muted-foreground mb-4">{description}</p>
    {children}
  </CardContent>
</Card>

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

## Seguridad

🔒 Seguridad en endpoints de configuración
Al trabajar con endpoints dinámicos como /api/config/add?channel=..., es importante validar los valores permitidos para evitar:

Configuraciones no deseadas (inyección de propiedades).

Canales inexistentes o mal tipados.

Confusión o corrupción de datos en AstraDB.

### ✅ Recomendación aplicada
En el endpoint /api/config/add, se valida que el canal esté en la lista explícita de canales permitidos:

const allowedChannels = ["web", "email", "whatsapp", "channelManager"];
if (!allowedChannels.includes(channel)) {
  return NextResponse.json({ error: "Canal no permitido" }, { status: 400 });
}
Esta validación:

Previene registros maliciosos o accidentales.

Refuerza el control de configuración.

Mejora la integridad de los datos multihotel.


## ✅ Solución al modo dark/light inconsistente en los Cards (DarkCard)

**Problema:** El modo oscuro no se aplicaba correctamente en los componentes `DarkCard`, incluso cuando el `<html class="dark">` estaba activo.

**Causa raíz:** El componente base `Card` en `components/ui/card.tsx` tenía la clase fija `bg-white`, lo que forzaba fondo blanco incluso en modo oscuro.

**Solución:** Se reemplazó:

tsx
<div className="rounded-lg border bg-white shadow">
por:

<div className="rounded-lg border bg-background text-foreground shadow transition-colors duration-300">
Resultado: Los estilos ahora se heredan correctamente desde las variables CSS definidas en globals.css, y los Cards respetan el tema dark/light.

🕓 Última modificación: 2025-04-15 09:07:02


## 🧩 Panel de Canales – Supervisión y Configuración
El archivo /app/admin/channels/page.tsx se encarga de obtener la configuración de canales del hotel desde Astra DB (server-side) y delega la interfaz interactiva al componente cliente ChannelsClient.

📦 Diseño modular
Cada canal (Web, Email, WhatsApp, Channel Manager) tiene:

Estado de conexión (activo/inactivo)

Modo de operación (🧠 Automático / 🧍 Supervisado)

Botones de acción:

Cambiar modo

Activar/desactivar

Ver logs

💬 Visualización de mensajes por canal
La UI de cada canal incluye una lista de mensajes con:

Datos simulados (mock)

Scroll vertical (overflow-y-auto)

Paginación cliente-side

⚠️ Importante: Los mensajes simulados están comentados en el código (ChannelsClient.tsx) y se eliminarán una vez que se integren datos reales desde los canales.

🧪 Mock de mensajes
Cada canal tiene su función mock:

// ./mock-messages/web.ts
export const webMessages = [{ sender: "Usuario Web", ... }]
En ChannelsClient.tsx, estas funciones se importan pero están comentadas temporalmente:

ts
Copiar
Editar
// const webMessages = getWebMessages(); // simulación (desactivado)
Esto facilita:

🔁 Reemplazo progresivo por datos reales

📦 Mantenimiento de estructura consistente por canal

👨‍💻 Entendimiento claro para futuros desarrolladores

### 📲 Flujo de conversación para WhatsApp

Hemos definido un flujo seguro y escalable para manejar interacciones entre huéspedes (PAX) y el asistente hotelero a través de WhatsApp.

➡️ [Ver el flujo detallado de conversación de WhatsApp](./Whatsapp-Conversation-Flow.md)

### Sistema de caching en memoria para hotelPhoneMap
➡️ [Ver informe implementacion de cache](./cache_para_hotel_phone_map.md)

## 🛡️ Regla de Seguridad: SuperAdmin solo en "system"

### 🚨 Regla de Oro
**Nunca debe existir un usuario con `roleLevel: 0` fuera del hotel `system`.**
- El usuario “SuperAdmin Técnico” (`roleLevel: 0`) está reservado **solo** para el hotel especial `system`.
- Todos los hoteles operativos usan roles `roleLevel >= 10` (gerente, recepcionista, etc).

### 🔍 Validaciones implementadas
- **Creación de usuario**: Bloquea si se intenta crear un usuario con `roleLevel: 0` fuera de `system`.
- **Edición de usuario**: Bloquea si se intenta editar un usuario para que tenga `roleLevel: 0` fuera de `system`.
- **Eliminación de usuario**: Bloquea si se intenta eliminar un usuario con `roleLevel: 0` fuera de `system` (defensa extra).
- **Script de auditoría**: `/scripts/fix-rolelevel-zero.ts` verifica y limpia inconsistencias legacy.

### 🧩 Helper centralizado

```ts
// /lib/auth/checkRoleLevel.ts
export function isRoleLevelZeroAllowed(hotelId: string, roleLevel: number) {
  return !(roleLevel === 0 && hotelId !== "system");
}
````

### 📝 Nota para futuros desarrolladores

No modifiques esta lógica sin analizar implicancias de seguridad a nivel plataforma SaaS multihotel.
Los SuperAdmin (roleLevel: 0) solo existen en el hotel “system” para fines de administración técnica global.
¡Perfecto! Te armo un **ERD sencillo en ASCII** (para README) y te lo dejo listo para copiar/pegar/documentar la arquitectura de tu sistema Hotel Assistant multicanal. También incluyo breve explicación y recomendaciones para mantenerlo actualizado.

---

````md
## 🗂️ Organigrama de entidades y relaciones Hotel Assistant (ERD)

```text
┌────────────┐       ┌───────────┐      ┌───────────────┐
│   Hotel    │1─────N│   Guest   │1────N│  Conversation │1───N┐
└────────────┘       └───────────┘      └───────────────┘     │
   │   ▲                    │  ▲                │             │
   │   │                    │  │                │             │
   │   │                ┌───┘  └────────────┐   │             │
   │   │                │                   │   │             │
   ▼   │           ┌─────────┐        ┌───────────────┐       │
┌────────────┐     │  User   │        │ ChannelMessage│◀─────┘
│ HotelConfig│     └─────────┘        └───────────────┘
└────────────┘

Leyenda:
- 1────N: relación uno a muchos (ej: un hotel tiene muchos guests)
- Guest y User referencian hotelId
- Conversation une a Guest + canal + asunto
- ChannelMessage pertenece a una Conversation
```
````

---

### 📚 Descripción de entidades

- **Hotel**: Entidad principal, agrupa toda la información de cada hotel.
- **HotelConfig**: Configuración y modos de canal para cada hotel.
- **Guest**: Cliente/visitante. Puede tener varios canales (web, whatsapp, email, etc), y un modo de supervisión personalizado.
- **User**: Personal autenticado del hotel, con roles y permisos.
- **Conversation**: Hilo de conversación entre un guest y el hotel por un canal/tema.
- **ChannelMessage**: Mensajes enviados/recibidos en cada conversación (IA, recepcionista o guest).

### 📝 Notas de diseño

- El **modo de supervisión** del guest (`mode`) prevalece sobre el modo del canal.
- El guest puede tener un **nombre personalizado** para seguimiento, editable por el staff.
- El mismo guest puede comunicarse por varios canales bajo el mismo hotel.
- Los mensajes tienen `status`, `respondedBy`, y permiten tracking granular (quién, cuándo y cómo respondió).

---

### 🚩 Recomendaciones para mantener el ERD

- Actualizá este diagrama y la descripción si se agregan nuevas entidades o relaciones.
- Usá los nombres de campo en minúscula/camelCase como referencia a los modelos reales en `/types`.
- Si implementás features avanzados (multi-hotel admin, merge de guests cross-channel, etc), extendé el organigrama.

---

# Hotel Assistant – Project context

## Objetivo

Breve: Asistente conversacional hotelero basado en LangGraph + LangChain.  
Automatización omnicanal (web, email, WhatsApp, PMS).

## Estructura clave

- `/lib/agents/` → lógica de IA conversacional (graph + MCP)
- `/lib/classifier/` → clasificador de intenciones
- `/lib/prompts/` → prompts curados por dominio
- `/app/api/` → endpoints para canales web, email, whatsapp
- `/lib/handlers/` → messageHandler + universalChannelEventHandler (núcleo MCP real)
- `/lib/services/` → integración por canal (web, email, whatsapp, channelManager)
- `/lib/db/` → acceso a AstraDB (colecciones: `messages`, `conversations`, `hotel_config`)
- `/test/` → tests automatizados

## Laboratorio MCP (Multi-Channel Pipeline)

Implementamos un laboratorio con MCP real para manejar todo el ciclo de vida de un mensaje:

1. **Entrada unificada (`universalChannelEventHandler`)**

   - Normaliza mensajes de todos los canales en un `ChannelMessage`.
   - Hace NLU mínima (idioma, intención).
   - Invoca el `messageHandler` → graph LangGraph/LangChain.

2. **Persistencia estable (`messages.ts`)**

   - `saveMessageToAstra` / `updateMessageInAstra`.
   - `saveMessageIdempotent` con `originalMessageId` para idempotencia.
   - Campos extendidos: `guestId`, `conversationId`, `deliveredAt`, `deliveryAttempts`, `deliveryError`.

3. **Estados de conversación (`convState`)**

   - Slots de reserva (`guestName`, `roomType`, etc).
   - `lastCategory` y `promptKey`.

4. **Canales**

   - **Web**: frontend `/app/page.tsx` conectado a `/api/chat`, `/api/messages/by-conversation`, `/api/conversations/list`.
   - **Email**: IMAP/SMTP polling con filtros anti-spam, idempotencia por `messageId`, handler universal.
   - **WhatsApp**: basado en `whatsapp-web.js`, heartbeat, idempotencia doble (Redis + DB), poller para respuestas supervisadas.

5. **MCP defensivo**
   - `withTimeout` al invocar grafo.
   - `ruleBasedFallback` cuando el grafo falla o no responde.
   - Persistencia de estado antes/después de cada paso.

## Instrucciones para IA y desarrolladores

1. Para agregar nuevas intenciones, editar `/lib/agents/index.ts` y `/lib/prompts/`.
2. Para integrar un canal nuevo, extender `/lib/services/` y conectar a `universalChannelEventHandler`.
3. Para agregar tests, usar `/test/`.
4. Para dudas/propuestas, usar este README o `documentacion/`.

## 📝 Convención para manejo de archivos en ChatGPT Projects

_(se mantiene igual)_
