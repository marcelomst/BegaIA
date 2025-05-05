# 🏨 Hotel Assistant - Conversational Flow con LangGraph + LangChain

Este proyecto implementa un **asistente conversacional hotelero omnicanal**, capaz de operar en múltiples canales (web, email, WhatsApp, channelManager) utilizando **LangGraph**, **LangChain**, y una arquitectura escalable con almacenamiento en AstraDB.

---

## 🧠 Tecnologías principales

* **LangGraph**: Grafo conversacional modelado como FSM.
* **LangChain**: Agentes, prompts curados, vectorización y herramientas.
* **Next.js**: UI (SSR + CSR), API Routes, middleware.
* **Astra DB (DataStax)**: Base de datos vectorial y documentos multitenant.
* **Vitest / Playwright**: Testing unitario y de integración.
* **Tailwind CSS**: UI moderna, soporte dark/light.

---

## 🗺️ Estructura conversacional

```ts
const graph = new StateGraph(GraphState)
  .addNode("classify", classifyNode)
  .addNode("handle_reservation", handleReservationNode)
  .addNode("handle_cancellation", handleReservationNode)
  .addNode("handle_billing", handleBillingNode)
  .addNode("handle_support", handleSupportNode)
  .addNode("handle_retrieval_based", retrievalBasedNode)
  .addEdge("__start__", "classify")
  .addConditionalEdges("classify", (s) => s.category, {
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
```

---

## 🎯 Objetivos del sistema

* Responder automáticamente preguntas frecuentes del huésped
* Operar en múltiples canales (web, email, WhatsApp, etc.)
* Supervisar respuestas en modo "supervised" desde un panel admin
* Integrarse con fuentes dinámicas (crawling, PDFs, etc.)
* Proveer trazabilidad de mensajes y control de versiones

---

## 🗃️ Colecciones clave en AstraDB

### 1. `hotel_config`

Contiene la configuración por hotel (canales, zona horaria, idioma, usuarios):

```ts
{
  hotelId: "hotel123",
  hotelName: "Hotel Demó",
  timezone: "America/Montevideo",
  defaultLanguage: "spa",
  channelConfigs: { web, email, whatsapp, ... },
  users: [
    { email: "admin@hotel.com", roleLevel: 0, passwordHash: "..." }
  ]
}
```

### 2. `messages`

Mensajes de todos los canales, trazables por `messageId`, `conversationId`, `hotelId`.

### 3. `hotel123_collection` (o colección única `begaia`)

Base vectorizada por chunks + metadata para recuperación semántica.

---

## 🧩 Seguridad y autenticación

* Autenticación JWT + refresh token (cookie HttpOnly)
* Middleware global `/middleware.ts` que:

  * Valida token JWT
  * Redirige a `/login` si es inválido
  * Protege rutas `/admin/**` según `roleLevel`

Roles definidos:

```ts
export type RoleLevel = 0 | 10 | 20; // técnico, gerencial, estándar
```

---

## 👥 Flujo multicanal con supervisión

Cada canal opera en modo `automatic` o `supervised`, configurado por hotel.

En modo `supervised`:

* El asistente sugiere una respuesta
* El recepcionista aprueba, edita o rechaza desde `/admin/channels`
* El mensaje se marca como `sent`, `pending` o `rejected`

---

## 🚀 Inicio del sistema

Terminal 1:

```bash
pnpm run dev     # Canal web con Next.js
```

Terminal 2:

```bash
pnpm run start:all  # Email, WhatsApp, channelManager
```

---

## 🛠️ Administración

* `/admin` → Panel general (modo oscuro, sidebar, Tailwind)
* `/admin/channels` → Supervisión por canal (modo, logs, mensajes)
* `/login` → Autenticación y persistencia de sesión
* Refresh token → manejado automáticamente desde el cliente (`fetchWithRefresh`)

---

## 📄 Archivos clave

* `/lib/agents/index.ts`: definición de nodos y grafo
* `/lib/classifier/index.ts`: clasificador de categoría y promptKey
* `/lib/config/hotelConfig.server.ts`: acceso a `hotel_config`
* `/lib/services/channelMemory.ts`: caché en desarrollo
* `/lib/db/messages.ts`: persistencia en AstraDB
* `/lib/auth/jwt.ts`: generación y verificación JWT
* `/middleware.ts`: protección global de rutas admin

---

## ✅ Estado actual

* ✅ Frontend Next.js funcional
* ✅ Panel admin con autenticación JWT
* ✅ Canales funcionales (web completo, email básico)
* ✅ AstraDB conectado (config + mensajes)
* ✅ Vectorización y recuperación
* ⏳ Faltan: completar interfaces de email, WhatsApp, channelManager

---

Última actualización: 2025-05-02

¿Querés que lo actualice también en el archivo `README.md` real del proyecto?
