# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-ADMIN-ROOM-INFO-IMG-RICH-PREVIEW-01

- Identificador: `FIX-ADMIN-ROOM-INFO-IMG-RICH-PREVIEW-01`
- Nombre: `FIX-ADMIN-ROOM-INFO-IMG-RICH-PREVIEW-01`
- Commit message: `FIX-ADMIN-ROOM-INFO-IMG-RICH-PREVIEW-01`
- Hash: `9f104a809e47577c7f21dd84a5c059c499f7d5f7`
- Descripción breve: Preserva el payload `rich` en mapper y DTO de canal, y agrega preview visual en Admin Inbox para `room-info-img` sin exigir paridad exacta con el carrusel del widget público.

## 2. FIX-ROOM-INFO-IMG-PUBLICATION-ROUTING-RICH-01

- Identificador: `FIX-ROOM-INFO-IMG-PUBLICATION-ROUTING-RICH-01`
- Nombre: `FIX-ROOM-INFO-IMG-PUBLICATION-ROUTING-RICH-01`
- Commit message: `FIX-ROOM-INFO-IMG-PUBLICATION-ROUTING-RICH-01`
- Hash: `f223802abd0e46b85b4c2b250d29d9dcf50e51df`
- Descripción breve: Formaliza el fastpath KB para `room_info_img`, asegura publicación rich renderizable en widget público, evita markdown crudo y preserva la continuidad hacia reserva cuando aparece intención de booking.

## 3. FIX-KB-FASTPATH-SHARED-PRECEDENCE-POLICY-01

- Identificador: `FIX-KB-FASTPATH-SHARED-PRECEDENCE-POLICY-01`
- Nombre: `FIX-KB-FASTPATH-SHARED-PRECEDENCE-POLICY-01`
- Commit message: `FIX-KB-FASTPATH-SHARED-PRECEDENCE-POLICY-01`
- Hash: `bbd36d193baedb55718c957819f990559b754b9e`
- Descripción breve: Introduce un helper compartido y puro de precedencia para fastpath KB, migra el override inline de `arrivals_transport` a policy determinística y preserva `nearby_points` y `billing` sin abrir refactor mayor.

## 4. DOC-ADR-KB-FASTPATH-PRECEDENCE-POLICY-01

- Identificador: `DOC-ADR-KB-FASTPATH-PRECEDENCE-POLICY-01`
- Nombre: `DOC-ADR-KB-FASTPATH-PRECEDENCE-POLICY-01`
- Commit message: `docs: add ADR for KB fastpath precedence policy target`
- Hash: `aa2727824d228e2b8cf845e024d69e028ee47515`
- Descripción breve: Introduce un ADR en estado `Proposed` para formalizar la política objetivo de precedencia del fastpath KB, separar `kb_precedence_policy` de `category_overrides` y documentar dirección futura sin implementación runtime.

## 5. FIX-MESSAGEHANDLER-KB-FASTPATH-ARRIVALS-TRANSPORT-ROUTING-01

- Identificador: `FIX-MESSAGEHANDLER-KB-FASTPATH-ARRIVALS-TRANSPORT-ROUTING-01`
- Nombre: `FIX-MESSAGEHANDLER-KB-FASTPATH-ARRIVALS-TRANSPORT-ROUTING-01`
- Commit message: `FIX-MESSAGEHANDLER-KB-FASTPATH-ARRIVALS-TRANSPORT-ROUTING-01`
- Hash: `f5e32cdfd21216d83ea6f665d77f3bbed5bbd5bc`
- Descripción breve: Corrige la precedencia del fastpath KB para señales de aeropuerto/transporte, fuerza `retrieval_based/arrivals_transport` con override completo, amplía mínimamente `RE_TRANSPORT` y preserva `nearby_points` y el bypass del graph cuando KB resuelve.

## 6. FIX-KB-VERSION-INDEX-VECTOR-SYNC-ARRIVALS-TRANSPORT-01

- Identificador: `FIX-KB-VERSION-INDEX-VECTOR-SYNC-ARRIVALS-TRANSPORT-01`
- Nombre: `FIX-KB-VERSION-INDEX-VECTOR-SYNC-ARRIVALS-TRANSPORT-01`
- Commit message: `FIX-KB-VERSION-INDEX-VECTOR-SYNC-ARRIVALS-TRANSPORT-01`
- Hash: `def7bab5891f0056becf237e23c45d62dd26a445`
- Descripción breve: Corrige la consistencia entre `hotel_content`, `hotel_version_index` y metadata vectorial, preserva `sourceVersion` en vectorización puntual y agrega trazabilidad explícita `sourceVersion/vectorVersion` para retrieval de `arrivals_transport`.

## 7. FIX-ADMIN-INBOX-SUPERVISED-EDIT-PREFILL-01

- Identificador: `FIX-ADMIN-INBOX-SUPERVISED-EDIT-PREFILL-01`
- Nombre: `FIX-ADMIN-INBOX-SUPERVISED-EDIT-PREFILL-01`
- Commit message: `FIX-ADMIN-INBOX-SUPERVISED-EDIT-PREFILL-01`
- Hash: `b410824f1feb10174ec860a93a86e979e0a84bd5`
- Descripción breve: Corrige el prefill y las acciones del Inbox supervisado web en Admin, permite aprobar sin editar, valida el binding por `messageId` contra el pending correcto y entrega la respuesta al widget web vía SSE.

## 8. FIX-DEMO-ADMIN-CHANNELS-READPATH-AND-MOCK-DATA-01

- Identificador: `FIX-DEMO-ADMIN-CHANNELS-READPATH-AND-MOCK-DATA-01`
- Nombre: `FIX-DEMO-ADMIN-CHANNELS-READPATH-AND-MOCK-DATA-01`
- Commit message: `FIX-DEMO-ADMIN-CHANNELS-READPATH-AND-MOCK-DATA-01`
- Hash: `6d4190cef9367cff15aebfb85027f2b52e6be60c`
- Descripción breve: Elimina mock data engañosa del home Admin, lee el estado real de canales desde `/api/config`, trata explícitamente canales no configurados o transaccionales y pule la UI de branding, sidebar, theme y Guests sin tocar runtime conversacional.

## 9. FIX-EMAIL-INLINE-CONVERSATIONAL-ACTOR-PARITY-01

- Identificador: `FIX-EMAIL-INLINE-CONVERSATIONAL-ACTOR-PARITY-01`
- Nombre: `FIX-EMAIL-INLINE-CONVERSATIONAL-ACTOR-PARITY-01`
- Commit message: `FIX-EMAIL-INLINE-CONVERSATIONAL-ACTOR-PARITY-01`
- Hash: `58af388c0b6b4cf05fcf0b53462e7c843daa416e`
- Descripción breve: Alinea Email con Web/WhatsApp en captura de actor conversacional inline, persiste el actor sobre el guest canónico resuelto, corrige el vocativo same-turn en `create` y cubre variantes multilinea y Gmail-like.

## 10. FIX-MULTI-RESERVATION-CREATE-QUOTE-VOCATIVE-REGRESSION-01
- Identificador: `FIX-MULTI-RESERVATION-CREATE-QUOTE-VOCATIVE-REGRESSION-01`
- Nombre: `FIX-MULTI-RESERVATION-CREATE-QUOTE-VOCATIVE-REGRESSION-01`
- Commit message: `FIX-MULTI-RESERVATION-CREATE-QUOTE-VOCATIVE-REGRESSION-01`
- Hash: `ea0f482fa54b1589be526f5168c68aa13e9fc6d8`
- Descripción breve: Repara fixtures temporales fronterizos en `multi_reservation`, reemplaza fechas absolutas por helper dinámico existente y destraba la suite completa sin tocar runtime productivo.
