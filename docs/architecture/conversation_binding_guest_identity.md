# Conversation Binding by Guest Identity

## Contexto

Begasist evolucionó desde un modelo centrado en canal:

canal -> conversationId -> mensajes

hacia un modelo centrado en huésped:

canal -> alias -> guest_aliases -> guestId -> conversación -> mensajes

Esto permite que múltiples canales resuelvan a la misma conversación si
pertenecen al mismo huésped, sin convertir identificadores aportados por el
cliente en autoridad.

## Regla de resolución de conversación

La resolución exige un binding autorizado entre hotel, conversación y sujeto.
Para Guest Web, la autoridad deriva exclusivamente de la capability y del grant
persistido server-side. Un `conversationId`, `guestId` o locator aportado por el
cliente no autoriza acceso por sí solo.

Reglas:

1. validar capability Guest y grant persistido
2. validar el binding `(hotelId + conversationId + sujeto)`
3. reutilizar la conversación sólo cuando el binding está autorizado
4. crear y persistir una nueva conversación antes de firmar la capability
5. rechazar acceso cruzado de hotel, conversación o sujeto

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

resolver identidad y capability
↓
validar grant y binding hotel-conversación-sujeto
↓
si el binding está autorizado -> reutilizar
↓
si no existe -> persistir conversación y grant antes de firmar

### 3. API `/api/chat`

Archivo:

`/root/begasist/app/api/chat/route.ts`

El endpoint usa la identidad Guest server-side y exige autorización persistida
para resolver continuidad. `messageId` y `sourceMsgId` sostienen idempotencia
durable tenant-scoped.

### 4. Bootstrap e historial Guest Web

Los endpoints de bootstrap e historial aplican la misma autoridad:

- bootstrap persiste conversación y grant antes de firmar la capability
- history sólo devuelve mensajes del binding autorizado
- el locator por pestaña/hotel es un índice local y no una credencial
- un pending turn persistido permite reconciliar releases inciertos sin
  duplicar efectos

## Beneficios

- continuidad Guest Web autorizada y aislada por hotel
- historial completo independiente del canal
- base técnica para inbox multicanal
- mejor seguimiento de interacciones

## Validación

La validación del hito `GUEST-WEB-CONVERSATION-CAPABILITY-01` cubre continuidad
de cuatro turnos, aislamiento, persist-before-sign, history autorizado,
idempotencia, ownership, reconciliación y revocación CAS con readback
concluyente.

## Commit técnico asociado

Binding original: `be5803a`

Capability Guest Web segura: `92c0ee8592867f41ab66694a55ad4b63b791aa9a`
