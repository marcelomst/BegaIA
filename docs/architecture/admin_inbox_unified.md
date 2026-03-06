# Admin Inbox Unified by Guest Identity

## Contexto

Begasist evolucionó desde un modelo administrativo más acoplado a `conversationId` hacia una vista de lectura orientada por huésped.

La infraestructura previa ya permitía:

- identidad transversal mediante `guest_aliases`
- binding de conversación por `guestId`

Este hito introduce una vista administrativa unificada por identidad de huésped.

## Objetivo

Permitir que el panel admin consulte y muestre conversaciones unificadas por `guestId`, sin alterar el pipeline conversacional.

## Lookup por huésped

Helper incorporado:

`getConversationsByGuestId({ hotelId, guestId })`

Ubicación:

`/root/begasist/lib/db/conversations.ts`

Responsabilidad:

- buscar conversaciones por `hotelId + guestId`
- ordenar por `lastUpdatedAt DESC`
- devolver la lista de conversaciones del huésped

## Endpoint admin

Archivo:

`/root/begasist/app/api/admin/conversations/route.ts`

Capacidades:

### Caso 1 — búsqueda por `conversationId`

Mantiene compatibilidad con el flujo anterior:

`GET /api/admin/conversations?hotelId=...&conversationId=...`

### Caso 2 — búsqueda por `guestId`

Nueva capacidad:

`GET /api/admin/conversations?hotelId=...&guestId=...`

Devuelve todas las conversaciones del huésped.

### Caso 3 — fallback por hotel / canal

Mantiene soporte para listados generales.

## Respuesta enriquecida

El endpoint devuelve, por conversación:

- `guestId`
- `conversationId`
- `channel`
- `lastMessage`
- `lastUpdatedAt`
- `subject`
- `status`

La prioridad para `lastMessage` es:

approvedResponse -> suggestion -> content

## UI admin

Se adaptó la UI admin para consumir `/api/admin/conversations` y mostrar por conversación:

- Guest ID
- Conversation ID
- Channel
- Last message
- UpdatedAt

## Beneficios

- visibilidad multicanal por huésped
- mejor trazabilidad de interacciones
- base para inbox unificado más potente
- preparación para perfil de huésped / CRM liviano

## Validación

Test de integración:

`test/integration/api_admin_conversations.test.ts`

Casos cubiertos:

1. retorno de conversaciones unificadas por `guestId`
2. inclusión de `lastMessage`
3. compatibilidad con búsqueda explícita por `conversationId`

## Commit técnico asociado

Commit: 76dbaf9
