# Conversation Binding by Guest Identity

## Contexto

Begasist evolucionó desde un modelo centrado en canal:

canal -> conversationId -> mensajes

hacia un modelo centrado en huésped:

canal -> alias -> guest_aliases -> guestId -> conversación -> mensajes

Esto permite que múltiples canales resuelvan a la misma conversación si pertenecen al mismo huésped.

## Regla de resolución de conversación

Prioridad:

1. `conversationId` explícito
2. conversación activa por `(hotelId + guestId)`
3. nueva conversación

## Cambios principales

### 1. Lookup por huésped

Función:

`findActiveConversationByGuestId({ hotelId, guestId })`

Ubicación:

`/root/begasist/lib/db/conversations.ts`

Responsabilidad:

- buscar conversaciones activas por `hotelId` y `guestId`
- ordenar por `lastUpdatedAt`
- devolver la más reciente activa

### 2. Pipeline de mensajes

Archivo:

`/root/begasist/lib/pipeline/handleChannelMessage.ts`

Flujo:

resolver identidad -> obtener guestId
↓
si conversationId explícito -> usarlo
↓
si no -> buscar conversación activa por guestId
↓
si existe -> reutilizar
↓
si no -> crear nueva conversación

### 3. API `/api/chat`

Archivo:

`/root/begasist/app/api/chat/route.ts`

El endpoint ya no genera `conversationId` automáticamente cuando no es enviado por el cliente y delega la resolución al pipeline.

## Beneficios

- conversaciones unificadas por huésped
- historial completo independiente del canal
- base técnica para inbox multicanal
- mejor seguimiento de interacciones

## Validación

Test de integración:

`test/integration/guestConversationBinding.spec.ts`

Casos:

1. reutilización de conversación entre canales con mismo `guestId`
2. prioridad de `conversationId` explícito sobre binding por huésped

## Commit técnico asociado

Commit: be5803a
