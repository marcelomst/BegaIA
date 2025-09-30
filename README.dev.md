¡Excelente el README!
Está muy completo, claro y detalla bien el stack y el flujo de conversación.
Voy a hacer un **análisis crítico enfocado en el aspecto RAG (Retrieval-Augmented Generation) y arquitectura bot/hotel** para que puedas tener una foto de “dónde estás” y qué faltaría o se puede reforzar.

---

## ✔️ **Lo que ya tenés implementado (respecto a RAG/Bot):**

### 1. **Arquitectura y Grafo Conversacional**

- Usás **LangGraph** para el flujo de estados (cada nodo es una intención del usuario).
- **Clasificador** (nodo `classify`) basado en LLM (GPT-3.5), y la lógica de detección de idioma (franc).
- Rutas claras según categoría: reservas, soporte, billing, retrieval, etc.

### 2. **RAG: Recuperación + Generación**

- El nodo `retrievalBasedNode` hace retrieval+generación usando el vector store (`vectorStore`) y un retriever LangChain.
- La función `retrievalBased` es plug & play, lo cual es lo ideal.
- Carga de documentos vía `loadDocuments()`, vectorización (aunque no queda explícito si los datos por hotel son multitenant/persistentes o solo en memoria).

### 3. **Integración de canales**

- El mismo grafo se usa para web, email, WhatsApp y otros canales (entrypoints separados, pero lógica centralizada).
- Mocks y canal de mensajes por channel.
- Entrada uniforme a la API (`/api/chat/route.ts`) para consultas de usuario.

### 4. **Prompts curados y clasificación**

- Uso de `promptMetadata` para prompts especiales por categoría/subcategoría.
- El clasificador puede devolver promptKey para usar un prompt curado en vez del retrieval default.

### 5. **Frontend/Admin**

- Interfaz Next.js para gestión de hoteles, canales, usuarios, configuración.
- Estructura de roles bien definida (superadmin solo en “system”).
- Carga inicial de canales/configuración mínima para cualquier hotel nuevo.

---

## 🔎 **Puntos a reforzar o aclarar (visión RAG y multitenant)**

### 1. **Vector Store y Base de Conocimiento**

- **¿Cada hotel tiene su propia colección/vector store en AstraDB o se comparte?**

  - Ideal: **Una colección por hotel** (más seguro, fácil de borrar/migrar, evita contaminación de datos).
  - Alternativa: colección global con filtro por `hotelId`.

- **¿Cómo se cargan los datos personalizados de cada hotel?**

  - README menciona carga de documentos, pero no queda claro si:

    - Hay un endpoint o admin para subir PDFs/URLs.
    - El almacenamiento es realmente persistente y separado por hotel.
    - Los documentos están versionados o sólo se pueden sobrescribir.

- **¿Los prompts curados se heredan del “hotel system” y se pueden sobrescribir por hotel?**

  - ¿Tenés lógica para copiar los prompts default al dar de alta un hotel?
  - Si no, es el siguiente paso clave.

### 2. **Configuración y setup mínimo**

- ¿Al crear hotel se asegura que tenga todos los canales configurados al menos en modo “desactivado” o default?
- ¿Se fuerza la existencia de al menos un usuario admin activo y correo de verificación sí o sí?

### 3. **Flow de RAG real**

- ¿El retrieval basado en vector store está activo por canal y por hotel?
- ¿El frontend/admin permite ver la base de conocimiento cargada para cada hotel?

### 4. **Seguridad de datos y multitenancy**

- ¿La autenticación y autorización asegura que un admin de hotel A no puede ver/modificar nada del hotel B?
- ¿Los datos en endpoints (API REST o admin) filtran todo por hotelId y/o roles?
- ¿Los canales nuevos pueden tener lógica custom por hotel (ejemplo: branding, idioma, tono)?

### 5. **Documentación interna**

- Faltaría agregar una sección de **“RAG y almacenamiento vectorial por hotel”** en el README:

  - Explicando la estrategia adoptada.
  - Ejemplo de cómo se cargan los datos de cada hotel.
  - Flujo de actualización/eliminación de la base de conocimiento.

---

## ✍️ **Sugerencias inmediatas para reforzar el README (y el sistema)**

1. **Aclarar el modelo de almacenamiento de documentos/vector store por hotel**

   - ¿Dónde se guarda?
   - ¿Cómo se consulta y actualiza?
   - ¿Cómo se protegen los datos?

2. **Incluir un diagrama/scheme de flujo de RAG por canal**

   - Entrada del usuario → grafo → retrieval → LLM → respuesta → canal de salida.

3. **Ejemplo real de cómo un hotel sube su información**

   - “El admin puede cargar un PDF vía panel o API, el sistema lo vectoriza y lo asocia a su hotel.”
   - ¿Qué pasa si borra el hotel?

4. **Prompt curado y fallback**

   - ¿El hotel puede customizar prompts?
   - ¿Si no los tiene, hereda del “system”?
   - ¿Cómo se versionan?

---

## 🚦 **Próximos pasos sugeridos**

1. **Agregar o revisar endpoint de carga de documentos (por hotel, seguro y versionable).**
2. **Automatizar copia de prompts default al crear hotel.**
3. **Revisar y documentar la arquitectura de canales, para asegurar onboarding progresivo (web→email→WhatsApp, etc).**
4. **Ampliar la sección de RAG en el README con detalles multitenant y de protección de datos.**
5. **Agregar un diagrama visual (ya tenés uno, pero podríamos actualizarlo para mostrar bien RAG y canales).**

---

¿Querés que haga un “borrador” de una sección README con enfoque RAG-multitenant/hotel para agregar, o preferís ajustar alguno de los puntos críticos antes?

---

## 🧪 Core Test Suite (criterios y alcance)

- Objetivo: que los tests del “core” sean rápidos, deterministas y de alto valor.
- Qué incluye hoy:
  - Reservas: `graph.reservation.persist.spec.ts`, `graph.reservation.verify_and_snapshot.spec.ts`, `e2e.reservation.flow.spec.ts`, `agents.reservations.unit.spec.ts`.
  - Señales/fechas: `graph.signals.chrono.spec.ts`, `chrono.layer.spec.ts`.
  - Autosend seguro: `unit/messageHandler.autosend.snapshot_verify.test.ts` (snapshot, verify, close).
  - Infra canal/idempotencia: `unit/universalChannelEventHandler.test.ts`, `unit/universalChannelEventHandler.idempotency.test.ts`, `unit/messageGuards.lwt.test.ts`.
  - Integración liviana API: `integration/api_messages_by-conversation.test.ts`, `integration/api_chat.test.ts`.
- Qué NO incluye: pruebas lentas o dependientes de servicios externos; esas van a `deprecated/` o a jobs opt‑in.
- Cómo se corre en CI: `pnpm test:core` (ver `.github/workflows/ci-core.yml`).

### Nota: test "fast-path" deprecado

- El test `messageHandler.fastpath.test.ts` quedó en `deprecated/test/unit/` y está excluido por `tsconfig.json`.
- Motivo: el flujo actual del `messageHandler` no usa el modo determinista de laboratorio (`IS_TEST`) ni devuelve el texto fijo "Estoy para ayudarte"; ahora priorizamos el comportamiento real (autosend snapshot/verify/close, idempotencia, fallback rule-based/structured).
- Si alguna vez quisieras reactivarlo como caso determinista, podemos introducir un flag `MH_FASTPATH_TEST=1` para habilitar un camino rápido solo en tests y ajustar el spec en consecuencia.

### Contrato de idempotencia (/api/chat)

- El cliente puede enviar un `messageId` en el body. El servidor:
  - Reutiliza ese `messageId` en el ACK inicial (`message.messageId`).
  - En reintentos con el mismo `messageId`, no duplica el mensaje entrante y responde `200` con `deduped: true` y el mismo `messageId`.
- Implementación:
  - La API mapea `messageId` → `sourceMsgId` del mensaje entrante, permitiendo dedupe interno por conversación.
  - Ante replay, se detecta la condición idempotente y se retorna un ACK estable (no se dispara SSE adicional).
- Aserciones del core (ver `test/integration/api_chat.test.ts`):
  - “idempotente: mismo messageId no duplica” verifica `deduped: true` y reuse del `messageId` del cliente.

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
