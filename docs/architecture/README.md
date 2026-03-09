# Begasist Architecture Overview

Este directorio contiene la documentación arquitectónica estable del sistema
Begasist.

El objetivo de esta documentación es describir cómo está diseñado el sistema,
independientemente de la secuencia histórica de cambios.

Para comprender la evolución del sistema debe consultarse también:

`hito_mcp.md`

que funciona como Architecture Evolution Log del proyecto.

## Organización de la documentación

La arquitectura del sistema se documenta por dominios funcionales.

Cada archivo describe un subsistema específico.

Ejemplo de dominios documentados:

- Admin Panel
- Channels
- Guest Identity
- Knowledge Base
- MCP / Channel Manager
- Message Pipeline
- Multi-hotel SaaS architecture

## Documentos disponibles

### Admin Panel

`admin_panel.md`

Describe la arquitectura del panel administrativo del sistema, incluyendo:

- organización por dominios funcionales
- modelo guest-centric
- separación Inbox / Guests
- herramientas administrativas
- evolución inicial documentada en `UI-ADMIN-01`

### Arquitectura general

`architecture_diagram.png`

Resume la arquitectura general de Begasist (SaaS multihotel):

- inbound por canales (Web / WhatsApp / Email / Channel Manager)
- normalización a `ChannelMessage`
- persistencia (AstraDB)
- orquestación (LangGraph)
- respuesta (automática o supervisada)

### Twilio inbound routing

`twilio_inbound_contract.md`

Documenta el contrato de routing inbound de WhatsApp Twilio:

`Twilio inbound -> resolveHotelIdByTwilioTo(to) -> hotelId | unmapped`

### Persistencia Astra

`astra_persistence_policy.md`

Describe la separación entre capa operacional SaaS y capa KB/retrieval.

### Guest aliases en CQL

`astra_guest_aliases_table_adapter.md`

Documenta la implementación de `guest_aliases` como tabla Cassandra CQL.

### Binding de conversación por huésped

`conversation_binding_guest_identity.md`

Documenta la resolución de conversación por identidad (`guestId`) con prioridad:

1. `conversationId` explícito
2. conversación activa por `(hotelId + guestId)`
3. nueva conversación

### Inbox admin unificado

`admin_inbox_unified.md`

Documenta la consulta admin unificada por `guestId` sobre infraestructura
multicanal.

### Modelo de identidad de huéspedes

`guest_identity_model.md`

Describe el modelo transversal de identidad (`guests`, `guest_aliases`,
`guest_aliases_by_guest`) y su impacto operativo.

## Relación con el Architecture Evolution Log

La documentación en este directorio describe el estado estructural del sistema.

La evolución histórica del sistema se documenta en:

`hito_mcp.md`

donde cada entrada corresponde a un hito técnico significativo asociado a uno o
más commits del repositorio.

Esto permite mantener trazabilidad entre:

- decisiones arquitectónicas
- implementación en código
- documentación técnica

## Filosofía de documentación

Begasist mantiene dos niveles complementarios de documentación.

### Arquitectura estable

Ubicada en:

`docs/architecture/`

Describe cómo está diseñado el sistema.

### Evolución arquitectónica

Ubicada en:

`hito_mcp.md`

Describe cómo evolucionó el sistema a lo largo del tiempo.

Este enfoque permite mantener una arquitectura clara incluso cuando el sistema
evoluciona mediante múltiples hitos técnicos.
