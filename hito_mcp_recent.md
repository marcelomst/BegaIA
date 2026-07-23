# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. IMPROVE-ADMIN-INBOX-COMPACT-OPERATIONAL-UX-01

- Identificador: `IMPROVE-ADMIN-INBOX-COMPACT-OPERATIONAL-UX-01`
- Nombre: `IMPROVE-ADMIN-INBOX-COMPACT-OPERATIONAL-UX-01`
- Commit message: `IMPROVE-ADMIN-INBOX-COMPACT-OPERATIONAL-UX-01`
- Hash: `08af629c839810ef713483e4ac5d1a874df4e47e`
- Descripción breve: Compacta visualmente el Admin Inbox y las tabs de conversaciones del huésped, preserva señales operativas y acciones críticas con disclosure progresivo, y agrega cobertura frontend específica de accesibilidad e interacción.

## 2. DOC-CLOSE-COMMERCIAL-DEMO-VALIDATION-AND-PRESENTATION-READINESS-01

- Identificador: `DOC-CLOSE-COMMERCIAL-DEMO-VALIDATION-AND-PRESENTATION-READINESS-01`
- Nombre: `DOC-CLOSE-COMMERCIAL-DEMO-VALIDATION-AND-PRESENTATION-READINESS-01`
- Commit message: `DOC-CLOSE-COMMERCIAL-DEMO-VALIDATION-AND-PRESENTATION-READINESS-01`
- Hash: `9b2d2d165407d30f25b02149db5a68866471b1cb`
- Descripción breve: Cierra la validación comercial de demo y deja el material de presentación listo sobre baseline post dry run, con assets HTML versionados, narrativa compactada, límites comerciales preservados y roadmap sincronizado.

## 3. FIX-CONVERSATIONAL-FAREWELL-MULTILINGUAL-01

- Identificador: `FIX-CONVERSATIONAL-FAREWELL-MULTILINGUAL-01`
- Nombre: `FIX-CONVERSATIONAL-FAREWELL-MULTILINGUAL-01`
- Commit message: `FIX-CONVERSATIONAL-FAREWELL-MULTILINGUAL-01`
- Hash: `5e4f233f348acd3e76133604d822585cae978ea3`
- Descripción breve: Formaliza `farewell` como stable intent temprano, resuelve idioma confiable para despedidas multilingües y evita reabrir residualidad de `create`, `modify`, `cancel` o `availability` después de una despedida explícita.

## 4. FIX-KB-EACH-CONTEXTUAL-TOKEN-VALIDATION-01

- Identificador: `FIX-KB-EACH-CONTEXTUAL-TOKEN-VALIDATION-01`
- Nombre: `FIX-KB-EACH-CONTEXTUAL-TOKEN-VALIDATION-01`
- Commit message: `FIX-KB-EACH-CONTEXTUAL-TOKEN-VALIDATION-01`
- Hash: `ed3f47e8369c13afae5b90785bafe282389531f0`
- Descripción breve: Corrige la validación contextual de tokens dentro de bloques `[[each: ...]]`, preserva la validación raíz de `hotel_config` y agrega cobertura focal para separar tokens raíz de tokens contextuales.

## 5. FIX-EMAIL-SUPERVISED-APPROVAL-SENDS-OUTBOUND-REPLY-01

- Identificador: `FIX-EMAIL-SUPERVISED-APPROVAL-SENDS-OUTBOUND-REPLY-01`
- Nombre: `FIX-EMAIL-SUPERVISED-APPROVAL-SENDS-OUTBOUND-REPLY-01`
- Commit message: `FIX-EMAIL-SUPERVISED-APPROVAL-SENDS-OUTBOUND-REPLY-01`
- Hash: `cd1d8cdfe186ae4e65686896daa772a3a5ae789c`
- Descripción breve: Corrige el flujo end-to-end de aprobación supervisada de Email desde Admin, envía outbound real por SMTP, evita reenvíos duplicados y limpia replies quoted de Gmail antes de confirmar reservas por Email.

## 6. DOC-DEMO-SCRIPT-DRAFT-V5-KB-RICH-ROOMS-BASELINE-01

- Identificador: `DOC-DEMO-SCRIPT-DRAFT-V5-KB-RICH-ROOMS-BASELINE-01`
- Nombre: `DOC-DEMO-SCRIPT-DRAFT-V5-KB-RICH-ROOMS-BASELINE-01`
- Commit message: `docs: add demo script draft v5 post KB rich rooms`
- Hash: `f260a30781b0f409e80c1e520ce258e0159e87ae`
- Descripción breve: Incorpora un draft versionado del guion operativo de demo v5, actualizado al baseline posterior de KB/rich rooms y Admin preview visual, como base de trabajo para análisis comercial y medium dry run.

## 7. FIX-ADMIN-ROOM-INFO-IMG-RICH-PREVIEW-01

- Identificador: `FIX-ADMIN-ROOM-INFO-IMG-RICH-PREVIEW-01`
- Nombre: `FIX-ADMIN-ROOM-INFO-IMG-RICH-PREVIEW-01`
- Commit message: `FIX-ADMIN-ROOM-INFO-IMG-RICH-PREVIEW-01`
- Hash: `9f104a809e47577c7f21dd84a5c059c499f7d5f7`
- Descripción breve: Preserva el payload `rich` en mapper y DTO de canal, y agrega preview visual en Admin Inbox para `room-info-img` sin exigir paridad exacta con el carrusel del widget público.

## 8. FIX-ROOM-INFO-IMG-PUBLICATION-ROUTING-RICH-01

- Identificador: `FIX-ROOM-INFO-IMG-PUBLICATION-ROUTING-RICH-01`
- Nombre: `FIX-ROOM-INFO-IMG-PUBLICATION-ROUTING-RICH-01`
- Commit message: `FIX-ROOM-INFO-IMG-PUBLICATION-ROUTING-RICH-01`
- Hash: `f223802abd0e46b85b4c2b250d29d9dcf50e51df`
- Descripción breve: Formaliza el fastpath KB para `room_info_img`, asegura publicación rich renderizable en widget público, evita markdown crudo y preserva la continuidad hacia reserva cuando aparece intención de booking.

## 9. FIX-KB-FASTPATH-SHARED-PRECEDENCE-POLICY-01

- Identificador: `FIX-KB-FASTPATH-SHARED-PRECEDENCE-POLICY-01`
- Nombre: `FIX-KB-FASTPATH-SHARED-PRECEDENCE-POLICY-01`
- Commit message: `FIX-KB-FASTPATH-SHARED-PRECEDENCE-POLICY-01`
- Hash: `bbd36d193baedb55718c957819f990559b754b9e`
- Descripción breve: Introduce un helper compartido y puro de precedencia para fastpath KB, migra el override inline de `arrivals_transport` a policy determinística y preserva `nearby_points` y `billing` sin abrir refactor mayor.

## 10. DOC-ADR-KB-FASTPATH-PRECEDENCE-POLICY-01

- Identificador: `DOC-ADR-KB-FASTPATH-PRECEDENCE-POLICY-01`
- Nombre: `DOC-ADR-KB-FASTPATH-PRECEDENCE-POLICY-01`
- Commit message: `docs: add ADR for KB fastpath precedence policy target`
- Hash: `aa2727824d228e2b8cf845e024d69e028ee47515`
- Descripción breve: Introduce un ADR en estado `Proposed` para formalizar la política objetivo de precedencia del fastpath KB, separar `kb_precedence_policy` de `category_overrides` y documentar dirección futura sin implementación runtime.
