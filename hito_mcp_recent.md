# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-CREATE-AVAILABILITY-SEQUENCING-UX-46

- Identificador: `FIX-CREATE-AVAILABILITY-SEQUENCING-UX-46`
- Nombre: `FIX-CREATE-AVAILABILITY-SEQUENCING-UX-46`
- Commit message: `FIX-CREATE-AVAILABILITY-SEQUENCING-UX-46`
- Hash: `9ae3467831f82a287ff07012efc134df1ba706c4`
- Descripción breve: Se corrige el sequencing entre `create` y `availability inquiry` para que un `create` explícito completo cotice directo y no pase por `Anoté nuevas fechas...`.

## 2. FIX-CREATE-RELATIVE-RANGE-ANOTHER-RESERVATION-45

- Identificador: `FIX-CREATE-RELATIVE-RANGE-ANOTHER-RESERVATION-45`
- Nombre: `FIX-CREATE-RELATIVE-RANGE-ANOTHER-RESERVATION-45`
- Commit message: `FIX-CREATE-RELATIVE-RANGE-ANOTHER-RESERVATION-45`
- Hash: `1be8a6279c6c18734c59cba3521c8f61c1374839`
- Descripción breve: Se corrige la ingestión de rangos relativos en `create`, incluyendo el branch de `otra reserva`, para no repreguntar fechas cuando `checkIn` y `checkOut` ya fueron absorbidos.

## 3. FIX-GUEST-RESERVATION-HOLDER-FALLBACK-GOVERNANCE-44

- Identificador: `FIX-GUEST-RESERVATION-HOLDER-FALLBACK-GOVERNANCE-44`
- Nombre: `FIX-GUEST-RESERVATION-HOLDER-FALLBACK-GOVERNANCE-44`
- Commit message: `FIX-GUEST-RESERVATION-HOLDER-FALLBACK-GOVERNANCE-44`
- Hash: `63d804ebddc2deaa9bf280467f2163e5ff5e1594`
- Descripción breve: Se corrige la gobernanza de identidad en reservas confirmadas para que el titular canónico por `reservationId` prevalezca sobre `reservationSlots.guestName`, ajustando además el wording de proposals.

## 4. DOC-PRESENTATION-CAPABILITY-MAP-43

- Identificador: `DOC-PRESENTATION-CAPABILITY-MAP-43`
- Nombre: `DOC-PRESENTATION-CAPABILITY-MAP-43`
- Commit message: `DOC-PRESENTATION-CAPABILITY-MAP-43`
- Hash: `66724edc737f73f0b69b2c8832b3ce8cf2b1acc0`
- Descripción breve: Se crea un mapa draft de capacidades reales y presentables de Begasist, separando capacidades seguras, pendientes y límites explícitos para materiales no técnicos.

## 5. DOC-PRESENTATION-NARRATIVE-BASE-42

- Identificador: `DOC-PRESENTATION-NARRATIVE-BASE-42`
- Nombre: `DOC-PRESENTATION-NARRATIVE-BASE-42`
- Commit message: `DOC-PRESENTATION-NARRATIVE-BASE-42`
- Hash: `d2387d2928af4c4b49e728e2573572d98fb4000f`
- Descripción breve: Se crea la narrativa base draft para piezas no técnicas de Begasist, ordenando posicionamiento, claims seguros, prudentes, prohibidos y guardrails comerciales.

## 6. DOC-HITO-DISCIPLINA-PLANTILLAS-Y-APERTURA-CHAT-41

- Identificador: `DOC-HITO-DISCIPLINA-PLANTILLAS-Y-APERTURA-CHAT-41`
- Nombre: `DOC-HITO-DISCIPLINA-PLANTILLAS-Y-APERTURA-CHAT-41`
- Commit message: `DOC-HITO-DISCIPLINA-PLANTILLAS-Y-APERTURA-CHAT-41`
- Hash: `fd36f7334de724d60936690c2fd70b0965f72b59`
- Descripción breve: Se formaliza la disciplina de continuidad entre chats con una regla de orquestación low-token, una guía de apertura de chat nuevo y la plantilla obligatoria `HITO_TEMPLATE_V1`.

## 7. FIX-PENDING-PROPOSAL-CONFIRMATION-WITH-TEMPORAL-MODIFIER-40

- Identificador: `FIX-PENDING-PROPOSAL-CONFIRMATION-WITH-TEMPORAL-MODIFIER-40`
- Nombre: `FIX-PENDING-PROPOSAL-CONFIRMATION-WITH-TEMPORAL-MODIFIER-40`
- Commit message: `FIX-PENDING-PROPOSAL-CONFIRMATION-WITH-TEMPORAL-MODIFIER-40`
- Hash: `1c021baad49231a1725dd6d3f101617bd2b71531`
- Descripción breve: Se endurece la confirmación de proposals activas para que mensajes ambiguos con modificador temporal como `confirmar mañana` no disparen confirmación ni desvíen por error al flujo de fechas.

## 8. FIX-CONFIRMATION-PENDING-PROPOSAL-CORRECTIONS-39

- Identificador: `FIX-CONFIRMATION-PENDING-PROPOSAL-CORRECTIONS-39`
- Nombre: `FIX-CONFIRMATION-PENDING-PROPOSAL-CORRECTIONS-39`
- Commit message: `FIX-CONFIRMATION-PENDING-PROPOSAL-CORRECTIONS-39`
- Hash: `7761478f0a9574d2a99e291702a27ea3498ac8d4`
- Descripción breve: Se introduce gobernanza explícita sobre proposal pendiente previa a confirmación, endureciendo la confirmación, cortando loops con negación y recotizando correcciones válidas sin contaminar slots ajenos.

## 9. FIX-CREATE-RELATIVE-WEEKEND-RANGE-PARSING-38

- Identificador: `FIX-CREATE-RELATIVE-WEEKEND-RANGE-PARSING-38`
- Nombre: `FIX-CREATE-RELATIVE-WEEKEND-RANGE-PARSING-38`
- Commit message: `FIX-CREATE-RELATIVE-WEEKEND-RANGE-PARSING-38`
- Hash: `0506d8ccdee2c24e19349926b3877f571b9791f2`
- Descripción breve: Se corrige el parsing de rangos relativos de fin de semana en `create` explícito, absorbiendo `del sábado al domingo` y `este finde`, y preservando single-date como `checkIn` contextual sin generar rangos inválidos.

## 10. FIX-AVAILABILITY-HANDOFF-STRICT-AFFIRMATION-37

- Identificador: `FIX-AVAILABILITY-HANDOFF-STRICT-AFFIRMATION-37`
- Nombre: `FIX-AVAILABILITY-HANDOFF-STRICT-AFFIRMATION-37`
- Commit message: `FIX-AVAILABILITY-HANDOFF-STRICT-AFFIRMATION-37`
- Hash: `299929677943b21e4124888bef7fe1eb7573f266`
- Descripción breve: Se endurece el handoff desde `availability_inquiry` hacia `create` para aceptar solo intención explícita de reserva, agregando una aclaración para respuestas ambiguas y cobertura unitaria positiva/negativa.
