# Test Suite – Begasist

> Guía corta y práctica para entender, ejecutar y mantener los tests del repo.

## Índice

* [Tipos de tests](#tipos-de-tests)
* [Estructura](#estructura)
* [Cómo ejecutar](#cómo-ejecutar)
* [Entorno de pruebas](#entorno-de-pruebas)
* [Mocks y utilidades](#mocks-y-utilidades)

  * [Mock de Astra (in-memory)](#mock-de-astra-in-memory)
  * [Mensajes (db\_messages)](#mensajes-db_messages)
  * [Guard de idempotencia](#guard-de-idempotencia)
  * [Adapter web / SSE](#adapter-web--sse)
* [Flujos clave cubiertos](#flujos-clave-cubiertos)

  * [messageHandler: persistencia, idempotencia y supervised](#messagehandler-persistencia-idempotencia-y-supervised)
  * [/api/chat: ACK estable + SSE](#apichat-ack-estable--sse)
  * [/api/messages/by-conversation: orden ascendente](#apimessagesby-conversation-orden-ascendente)
  * [universalChannelEventHandler: normalización y dedupe](#universalchanneleventhandler-normalización-y-dedupe)
* [Convenciones](#convenciones)
* [Solución de problemas](#solución-de-problemas)
* [Cobertura](#cobertura)
* [Añadir nuevos tests / canales](#añadir-nuevos-tests--canales)
* [Snippets útiles](#snippets-útiles)

---

## Tipos de tests

* **Unit tests**

  * Aíslan una unidad (handler, guard, util) con mocks/spies.
  * Ej.: `messageHandler.*.test.ts`, `universalChannelEventHandler.*.test.ts`, `messageGuards.*.test.ts`.
* **Integration tests**

  * Golpean endpoints/entrypoints con mocks mínimos y aserciones en el contrato.
  * Ej.: `api_chat.test.ts`, `api_messages_by-conversation.test.ts`.

## Estructura

```
/test
  /integration
    api_chat.test.ts
    api_messages_by-conversation.test.ts
  /mocks
    astra.ts            # InMemory DB + colecciones
    db_messages.ts      # API de persistencia de mensajes (mock)
    webAdapter.ts       # Adapter web simulado
  /services
    channelMemory.test.ts
  /unit
    messageGuards.lwt.test.ts
    messageHandler.test.ts
    messageHandler.fastpath.test.ts
    universalChannelEventHandler.test.ts
    universalChannelEventHandler.idempotency.test.ts
```

## Cómo ejecutar

```bash
pnpm vitest run            # corrida única
pnpm vitest                # modo watch interactivo
pnpm vitest --coverage     # con cobertura
```

> Sugerido: usar Node LTS y PNPM. Los tests no requieren red ni credenciales reales.

## Entorno de pruebas

* `.env` cargado mediante `dotenv` en algunos tests. Se mockean dependencias externas.
* El **fast-path de tests** del `messageHandler` evita llamadas a LLM y a playbooks (ver logs: `🧪 [graph] TEST fast-path activo`).

## Mocks y utilidades

### Mock de Astra (in-memory)

* Archivo: `test/mocks/astra.ts`.
* Expone `getCollection(name)` con API mínima: `findOne`, `findMany`, `insertOne`, `updateOne`.
* Ideal para asserts simples de persistencia y para no acoplar tests a un motor real.

### Mensajes (db\_messages)

* Archivo: `test/mocks/db_messages.ts`.
* Implementa:

  * `saveChannelMessageToAstra(doc)` → upsert por `_id/messageId`.
  * `updateMessageInAstra(hotelId, messageId, changes)`.
  * `getMessagesByConversation({ hotelId, conversationId, channel?, limit? })`.
  * `getMessages(hotelId, channel, limit?)`.
  * `getMessageByOriginalId(id)` / `getMessageById(id)`.
* **Orden**: los listados se devuelven ASC por `timestamp/createdAt`.

### Guard de idempotencia

* Módulo mockeado: `@/lib/db/messageGuards`.
* Para evitar el error `Cannot access 'guardMock' before initialization` se usa **`vi.hoisted`** en los tests que lo necesitan.
* Ejemplo en `universalChannelEventHandler.idempotency.test.ts`.

### Adapter web / SSE

* El `webAdapter` está mockeado para no depender del front. Sólo loguea y permite probar que el handler **intenta** emitir SSE.
* `/app/api/chat/route.ts` devuelve un **ACK JSON estable** (status 200) independiente del SSE para que el widget/cliente siempre tenga una respuesta.

## Flujos clave cubiertos

### messageHandler: persistencia, idempotencia y supervised

* **Persiste** el mensaje entrante y permite inspección vía colección `messages`.
* **Idempotente** por `messageId`: reenviar el mismo no duplica.
* **Supervised**: cuando el modo es `supervised`, el status resulta `pending` y se incluye una `suggestion` (borrador) en la respuesta del endpoint.

### /api/chat: ACK estable + SSE

* Siempre devuelve 200 con un objeto `{ conversationId, status, message: { messageId, status, suggestion? } }`.
* Si hay adapter disponible, se "emite" por SSE (mock). El test verifica el **contrato de ACK** y no depende del SSE para pasar.

### /api/messages/by-conversation: orden ascendente

* Comprueba que el endpoint retorna los mensajes **ordenados por fecha ascendente**.

### universalChannelEventHandler: normalización y dedupe

* Suite `universalChannelEventHandler.test.ts` valida **normalización y delegación** (se espía `handleIncomingMessage`, no se cuentan docs en DB).
* Suite `universalChannelEventHandler.idempotency.test.ts` valida el **dedupe por `sourceMsgId`**:

  * Primera llamada `applied: true` → delega.
  * Segunda `applied: false` → **no** delega.
  * Simulación de concurrencia usando `mockResolvedValueOnce`.

## Convenciones

* Alias `@/` para imports relativos a `root`.
* Nombres de tests en **español** y descriptivos del comportamiento.
* Evitar asserts frágiles (p.ej. conteo de documentos) cuando la intención es comprobar **delegación**: usar spies (`toHaveBeenCalledTimes`, inspeccionar el primer argumento, etc.).
* Mantener los tests **independientes** (no comparten estado) y sin red.

## Solución de problemas

* **`Cannot access 'guardMock' before initialization`**

  * Causa: `vi.mock` es hoisted; si referenciás un mock definido abajo, rompe.
  * Fix: envolver creación del mock con `vi.hoisted(() => ({ ... }))` y luego `vi.mock('module', () => ({ ... }))`.

* **`c.find is not a function`**

  * Causa: mock de colección incompleto o código que espera un driver real.
  * Fix: usar fast-path en tests y/o completar API mínima del mock (`findOne`, `findMany`, `insertOne`, `updateOne`).

* **TypeScript: `Expected 0 type arguments, but got 1`**

  * Causa: pasar genéricos a funciones sin tipo (untyped) en mocks.
  * Fix: remover genéricos y/o tipar correctamente las funciones de util/mocks.

* **El widget muestra error** durante tests de integración

  * Los endpoints devuelven 200 con ACK aunque falle SSE; si se cambia esto, los tests pueden romper.

## Cobertura

Generar cobertura:

```bash
pnpm vitest --coverage
```

> Tip: configurar umbrales en `vitest.config.ts` sólo cuando la suite esté estable, para no introducir fricción en PRs iniciales.

## Añadir nuevos tests / canales

1. **Canal nuevo**

   * Añadir adapter (mock) en `test/mocks/` si emite por SSE o requiere envío de reply.
   * Extender `getAdapter`/registro si aplica.
2. **Endpoint nuevo**

   * Crear test de integración que verifique **contrato** (status, payload mínimo) y no dependa de efectos colaterales.
3. **Handler nuevo**

   * Unit test con spies/mocks. Evitar dependencias con red/DB reales.

## Snippets útiles

### Hoisted mock del guard

```ts
import { vi } from "vitest";

const { guardMock } = vi.hoisted(() => ({ guardMock: vi.fn(async () => ({ applied: true })) }));
vi.mock("@/lib/db/messageGuards", () => ({ guardInboundOnce: guardMock }));
```

### Spy de delegación

```ts
const mhSpy = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/lib/handlers/messageHandler", () => ({ handleIncomingMessage: mhSpy }));

// ... ejecutar handler y luego:
expect(mhSpy).toHaveBeenCalledTimes(1);
const [msg] = (mhSpy as any).mock.calls[0];
expect(msg.role).toBe("user");
```

### ACK esperado de /api/chat (supervised)

```json
{
  "conversationId": "conv-abc123",
  "status": "pending",
  "message": {
    "messageId": "web:conv-abc123",
    "status": "pending",
    "suggestion": "【TEST】borrador de respuesta"
  }
}
```

---

**Última palabra:** Mantener los tests enfocados en el **comportamiento observable** (contratos, delegación, idempotencia) reduce el acople y los vuelve mucho más estables. ¡Que siempre estén en verde! ✅
