# Arquitectura

![Arquitectura Begasist](./architecture_diagram.png)

Este diagrama resume la arquitectura general de Begasist (SaaS multihotel):

- Inbound por canales (Web / WhatsApp / Email / Channel Manager)
- Normalización a `ChannelMessage`
- Persistencia (AstraDB)
- Orquestación (LangGraph)
- Respuesta (automática o supervisada)

## Contrato Twilio Inbound (vigente)

Routing inbound WhatsApp Twilio:

`Twilio inbound -> resolveHotelIdByTwilioTo(to) -> hotelId | unmapped`

Reglas:

- Si existe mapping `To -> hotelId`, el webhook procesa normalmente.
- Si no existe mapping, responde `ok/unmapped`.
- No existe fallback por variables de entorno.

## Politica Astra (vigente)

Begasist separa persistencia Astra en dos capas:

- Capa operacional SaaS (global y multihotel, con particion logica por `hotelId`), con preferencia por **Tables (CQL)** para entidades estables.
- Capa KB/retrieval (coleccion vectorial por hotel).

Detalle completo: [Politica Astra Persistence](./astra_persistence_policy.md)

## Guest Identity Persistence

La entidad `guest_aliases` se implementa como **Cassandra CQL Table** y no como Collection.

Esto alinea infraestructura física y acceso de código, evitando dependencia en índices automáticos de Astra Data API.

Detalle completo:

[Guest Aliases Table Adapter](./astra_guest_aliases_table_adapter.md)

## Conversation Binding by Guest Identity

Begasist resuelve conversaciones por identidad de huésped (`guestId`) en lugar de depender exclusivamente de `conversationId` generado por canal.

Prioridad de resolución:

1. `conversationId` explícito
2. conversación activa por `(hotelId + guestId)`
3. nueva conversación

Detalle completo:

[Conversation Binding by Guest Identity](./conversation_binding_guest_identity.md)

## Admin Inbox Unified by Guest Identity

Begasist permite que el panel admin consulte conversaciones unificadas por `guestId`, reutilizando la infraestructura de identidad transversal y binding de conversación.

Esto habilita una lectura multicanal coherente por huésped sin modificar el pipeline conversacional.

Detalle completo:

[Admin Inbox Unified by Guest Identity](./admin_inbox_unified.md)
