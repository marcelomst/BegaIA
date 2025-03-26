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
  .addNode("handle_room_info", async (state) => await handleRoomInfoNode(state))
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
## 📚 Descripción de nodos
- classifyNode: Usa LangChain para identificar la categoría del mensaje del usuario 
    (por   ejemplo, reserva, habitación, etc.).

- handle_reservation: Gestiona solicitudes de reserva.

- handle_room_info: Responde con detalles sobre tipos de habitaciones.

- handle_amenities: Devuelve una lista de comodidades ofrecidas por el hotel.

- handle_cancellation: Proporciona políticas de cancelación.

- default_response: Respuesta genérica para casos no contemplados.

## 🗂️ Ejemplos de flujo
Mensaje del usuario	Nodo que responde
"¿Qué tipos de habitaciones tienen?"	handle_room_info
"Quiero reservar una habitación doble"	handle_reservation
"¿Qué comodidades ofrece el hotel?"	handle_amenities
"¿Cuál es la política de cancelación?"	handle_cancellation
"¿Aceptan mascotas extraterrestres?"	default_response

## 🎯 Objetivo

Brindar un asistente virtual hotelero capaz de:

Responder preguntas frecuentes de forma rápida y precisa.

Automatizar tareas comunes como reservas y consultas.

Integrarse con otros sistemas mediante LangChain para escalabilidad y personalización.

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
}
