# Channel Architecture

## 1. Propósito

Begasist implementa una arquitectura multicanal donde cada canal funciona como
capa de entrada/salida, mientras la lógica principal se concentra en el
pipeline conversacional.

Este diseño permite:

- múltiples canales de operación
- comportamiento coherente entre transportes
- trazabilidad común de mensajes y conversaciones
- identidad transversal por huésped

## 2. Principio central

`Canal != lógica`
`Canal = transporte`

En Begasist, el canal no define la lógica de negocio. Su responsabilidad es:

- recibir mensajes/eventos del transporte
- adaptar y normalizar payloads
- invocar el pipeline central
- entregar respuestas por el mismo transporte
- registrar metadatos específicos del canal

## 3. Canales contemplados

### Web

Canal interactivo HTTP utilizado por frontend.

Características:

- entrada vía `/api/chat`
- `guestId` persistente por navegador (formato `guest-${uuid}`)
- interacción síncrona request/response
- soporte de acuse/flujo pendiente en modo supervisado cuando aplica

### WhatsApp

Canal conversacional asincrónico orientado a mensajería.

Características:

- identidad primaria por alias telefónico (`whatsapp:*`)
- integración por webhook/proveedor del canal
- convergencia al mismo pipeline central, sin lógica de negocio paralela

### Email

Canal asincrónico basado en correo electrónico.

Características:

- identidad primaria por alias de email (`email:*`)
- entrada mediada por parser/adaptador de correo
- persistencia y binding alineados con guest identity

### Channel Manager

Canal externo/sistémico para integración operativa.

Características:

- recibe eventos o mensajes desde sistemas externos
- puede alimentar el pipeline o módulos operativos según caso de uso
- cuando aplica conversación de huésped, respeta el mismo modelo de identidad y
  persistencia

## 4. Flujo común de canal

Flujo conceptual compartido:

`Canal -> adaptación del payload -> ChannelMessage -> identity resolution -> conversation binding -> message pipeline -> response / supervision -> salida por canal`

Este flujo permite comportamiento uniforme independientemente del transporte.

## 5. Relación con identidad transversal

Los canales no son la identidad del huésped. La identidad se resuelve mediante:

- alias por canal
- `guestId`
- `guest_aliases`
- `guest_aliases_by_guest`

Relación conceptual:

`Web      -> web alias / guestId persistente`
`WhatsApp -> phone alias`
`Email    -> email alias`
`CM       -> external alias`
`          ↓`
`        guestId`

Referencia: `docs/architecture/guest_identity_model.md`.

## 6. Relación con el message pipeline

Todos los canales convergen hacia el pipeline central documentado en:

`docs/architecture/message_pipeline.md`

El pipeline central decide:

- continuidad conversacional
- persistencia operativa
- política de supervisión
- respuesta final

El canal sólo transporta entrada y salida del flujo.

## 7. Relación con Admin Panel

El Admin Panel debe representar la operación multicanal con foco en huésped, no
como silos por transporte.

Esto justifica:

- Inbox operativo
- dominio Guests
- perfil de huésped
- consultas unificadas por `guestId`

Referencia: `docs/architecture/admin_panel.md`.

## 8. Principios arquitectónicos

- canales intercambiables
- pipeline único
- identidad transversal de huésped
- separación entre transporte y dominio
- trazabilidad por `guestId` y `conversationId`
- multi-hotel explícito por `hotelId`

## 9. Relación con otros documentos

Este documento se complementa con:

- `docs/architecture/message_pipeline.md`
- `docs/architecture/guest_identity_model.md`
- `docs/architecture/conversation_binding_guest_identity.md`
- `docs/architecture/admin_panel.md`
- `hito_mcp.md` como Architecture Evolution Log
