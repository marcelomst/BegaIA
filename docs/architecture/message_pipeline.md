# Message Pipeline

## 1. Propósito

El message pipeline de Begasist centraliza el procesamiento conversacional
multicanal en una única ruta de dominio.

Objetivos principales:

- desacoplar transporte (Web, WhatsApp, Email, Channel Manager) de lógica de negocio
- unificar identidad de huésped por `guestId`
- mantener continuidad conversacional por `conversationId`
- aplicar política operativa de envío (`automatic` / `supervised`)

Implementación principal:

- `/root/begasist/lib/pipeline/handleChannelMessage.ts`

## 2. Punto de entrada canónico

Para canal Web y clientes HTTP, la entrada canónica es:

- `/root/begasist/app/api/chat/route.ts`

Este endpoint:

- normaliza input externo (`hotelId`, `channel`, `guestId`, `conversationId`, `query`)
- aplica defaults de seguridad
- delega a `handleChannelMessage(...)`
- aplica política de entrega con `decideDeliveryPolicy(...)`
- devuelve un contrato uniforme para frontend/admin

## 3. Flujo lógico del pipeline

Flujo de alto nivel:

`Inbound canal -> normalización -> resolveGuestIdentity -> bind conversación -> handleIncomingMessage -> delivery policy -> response API`

Secuencia principal en `handleChannelMessage(...)`:

1. validación mínima de input (`hotelId`, `query`)
2. resolución de identidad por `resolveGuestIdentity(...)`
3. binding conversacional por prioridad:
   1. `conversationId` explícito
   2. conversación activa por `(hotelId, guestId)`
   3. nueva conversación `conv-${uuid}`
4. determinación de modo operativo (`automatic` / `supervised`)
5. creación del mensaje inbound normalizado (`ChannelMessage`)
6. ejecución de handler central (`handleIncomingMessage`)
7. lectura del último mensaje AI para construir salida API

## 4. Identidad de huésped

La identidad se resuelve en:

- `/root/begasist/lib/pipeline/resolveGuestIdentity.ts`

Reglas:

- construye alias por canal (`web:*`, `whatsapp:*`, `email:*`)
- busca alias existente en `guest_aliases`
- si encuentra huésped legacy, realiza backfill idempotente de alias
- si no existe, crea asociación nueva mediante `ensureGuestAlias(...)`

Resultado:

- el pipeline opera con `guestId` canónico, no con identificadores de transporte

## 5. Continuidad conversacional

El pipeline privilegia continuidad por huésped:

- si llega `conversationId`, lo respeta
- si no llega, intenta reusar conversación activa por `guestId`
- si no existe, crea una nueva

Este comportamiento alinea operación multicanal con modelo guest-centric.

## 6. Política de supervisión y estado

El modo operativo final puede venir de:

- `mode` explícito en input
- configuración de canal en `hotel_config`
- fallback `automatic`

Estado inicial:

- `supervised` -> `pending`
- `automatic` -> `sent`

La política de riesgo se modela en:

- `/root/begasist/lib/pipeline/riskPolicy.ts`

donde `riskPolicy` preserva decisiones explícitas del supervisor y solo promueve
casos LOW en supervisado cuando aplica.

## 7. Política de entrega API

Luego del pipeline, `/api/chat` aplica:

- `decideDeliveryPolicy(...)` en `/root/begasist/lib/pipeline/deliveryPolicy`

Responsabilidad:

- decidir si se entrega respuesta final al cliente
- o acuse de pendiente cuando la conversación queda supervisada

Contrato de salida típico:

- `conversationId`
- `status`
- `response` (si corresponde)
- `suggestedReply` (si queda pendiente)
- `message` (metadata operativa)

## 8. Persistencia operativa

El pipeline persiste estado en la capa operacional SaaS (Astra/Cassandra):

- `messages`
- `conversations`
- `conv_state`
- `guests`
- `guest_aliases`
- `guest_aliases_by_guest`

La separación entre capa operacional y KB se documenta en:

- `docs/architecture/astra_persistence_policy.md`

## 9. Reglas e invariantes

Invariantes del pipeline:

- `hotelId` y `query` son obligatorios en entrada canónica
- el transporte no define identidad final: la define `guestId` resuelto
- `conversationId` explícito tiene prioridad sobre binding implícito
- la respuesta API se emite con formato consistente independientemente del canal

## 10. Relación con otros documentos

Este documento se complementa con:

- `docs/architecture/guest_identity_model.md`
- `docs/architecture/conversation_binding_guest_identity.md`
- `docs/architecture/pipeline_decision.md`
- `docs/architecture/admin_inbox_unified.md`
