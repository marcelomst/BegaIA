# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-ADMIN-GUESTS-PROFILE-NAME-READPATH-52

- Identificador: `FIX-ADMIN-GUESTS-PROFILE-NAME-READPATH-52`
- Nombre: `FIX-ADMIN-GUESTS-PROFILE-NAME-READPATH-52`
- Commit message: `FIX-ADMIN-GUESTS-PROFILE-NAME-READPATH-52`
- Hash: `38779d323d332bb2ef33892f5d82cc5208b0fc9f`
- Descripción breve: Se corrige el read-path de Admin/profile para priorizar el documento canónico más completo del guest cuando existen filas mínimas o duplicadas con el mismo `guestId`.

## 2. FIX-ADMIN-GUESTS-CONSOLIDATION-ACTIONS-51

- Identificador: `FIX-ADMIN-GUESTS-CONSOLIDATION-ACTIONS-51`
- Nombre: `FIX-ADMIN-GUESTS-CONSOLIDATION-ACTIONS-51`
- Commit message: `FIX-ADMIN-GUESTS-CONSOLIDATION-ACTIONS-51`
- Hash: `6e497edda46799467cfa64b8eccdf3f72690054d`
- Descripción breve: Se corrige la consolidación real de guests en Admin para tolerar merges sobre filas derivadas desde `conversations`, creando registros mínimos antes de consolidar.

## 3. FIX-ADMIN-GUESTS-CONVERSATION-LOAD-50

- Identificador: `FIX-ADMIN-GUESTS-CONVERSATION-LOAD-50`
- Nombre: `FIX-ADMIN-GUESTS-CONVERSATION-LOAD-50`
- Commit message: `FIX-ADMIN-GUESTS-CONVERSATION-LOAD-50`
- Hash: `720856d226bc3bb252a427617cc225b02a259c11`
- Descripción breve: Se restaura el read-path Admin/API de guests y conversaciones con degradación defensiva, fallback desde `conversations` y lectura canónica por `guestId` y aliases.

## 4. IMPLEMENT-CONVERSATIONAL-DISPLAY-NAME-READPATH-GOVERNANCE-49

- Identificador: `IMPLEMENT-CONVERSATIONAL-DISPLAY-NAME-READPATH-GOVERNANCE-49`
- Nombre: `IMPLEMENT-CONVERSATIONAL-DISPLAY-NAME-READPATH-GOVERNANCE-49`
- Commit message: `IMPLEMENT-CONVERSATIONAL-DISPLAY-NAME-READPATH-GOVERNANCE-49`
- Hash: `e4a8ae84b4cee416b1b4089b21b427884552f1a2`
- Descripción breve: Se introduce un read-path seguro de `conversationalDisplayName` desde el guest canónico para usar vocativo solo cuando exista identidad conversacional confiable.

## 5. FIX-CREATE-RELATIVE-WEEKDAY-RANGE-GENERALIZATION-47

- Identificador: `FIX-CREATE-RELATIVE-WEEKDAY-RANGE-GENERALIZATION-47`
- Nombre: `FIX-CREATE-RELATIVE-WEEKDAY-RANGE-GENERALIZATION-47`
- Commit message: `FIX-CREATE-RELATIVE-WEEKDAY-RANGE-GENERALIZATION-47`
- Hash: `2e0253963756a1e5d4c0d6b2ac3b10c65824f0d3`
- Descripción breve: Se generaliza la detección de rangos relativos consecutivos de weekdays en `create`, incluyendo conectores como `al`, `hasta`, `y` y variantes equivalentes.

## 6. FIX-CREATE-AVAILABILITY-SEQUENCING-UX-46

- Identificador: `FIX-CREATE-AVAILABILITY-SEQUENCING-UX-46`
- Nombre: `FIX-CREATE-AVAILABILITY-SEQUENCING-UX-46`
- Commit message: `FIX-CREATE-AVAILABILITY-SEQUENCING-UX-46`
- Hash: `9ae3467831f82a287ff07012efc134df1ba706c4`
- Descripción breve: Se corrige el sequencing entre `create` y `availability inquiry` para que un `create` explícito completo cotice directo y no pase por `Anoté nuevas fechas...`.

## 7. FIX-CREATE-RELATIVE-RANGE-ANOTHER-RESERVATION-45

- Identificador: `FIX-CREATE-RELATIVE-RANGE-ANOTHER-RESERVATION-45`
- Nombre: `FIX-CREATE-RELATIVE-RANGE-ANOTHER-RESERVATION-45`
- Commit message: `FIX-CREATE-RELATIVE-RANGE-ANOTHER-RESERVATION-45`
- Hash: `1be8a6279c6c18734c59cba3521c8f61c1374839`
- Descripción breve: Se corrige la ingestión de rangos relativos en `create`, incluyendo el branch de `otra reserva`, para no repreguntar fechas cuando `checkIn` y `checkOut` ya fueron absorbidos.

## 8. FIX-GUEST-RESERVATION-HOLDER-FALLBACK-GOVERNANCE-44

- Identificador: `FIX-GUEST-RESERVATION-HOLDER-FALLBACK-GOVERNANCE-44`
- Nombre: `FIX-GUEST-RESERVATION-HOLDER-FALLBACK-GOVERNANCE-44`
- Commit message: `FIX-GUEST-RESERVATION-HOLDER-FALLBACK-GOVERNANCE-44`
- Hash: `63d804ebddc2deaa9bf280467f2163e5ff5e1594`
- Descripción breve: Se corrige la gobernanza de identidad en reservas confirmadas para que el titular canónico por `reservationId` prevalezca sobre `reservationSlots.guestName`, ajustando además el wording de proposals.

## 9. DOC-PRESENTATION-CAPABILITY-MAP-43

- Identificador: `DOC-PRESENTATION-CAPABILITY-MAP-43`
- Nombre: `DOC-PRESENTATION-CAPABILITY-MAP-43`
- Commit message: `DOC-PRESENTATION-CAPABILITY-MAP-43`
- Hash: `66724edc737f73f0b69b2c8832b3ce8cf2b1acc0`
- Descripción breve: Se crea un mapa draft de capacidades reales y presentables de Begasist, separando capacidades seguras, pendientes y límites explícitos para materiales no técnicos.

## 10. DOC-PRESENTATION-NARRATIVE-BASE-42

- Identificador: `DOC-PRESENTATION-NARRATIVE-BASE-42`
- Nombre: `DOC-PRESENTATION-NARRATIVE-BASE-42`
- Commit message: `DOC-PRESENTATION-NARRATIVE-BASE-42`
- Hash: `d2387d2928af4c4b49e728e2573572d98fb4000f`
- Descripción breve: Se crea la narrativa base draft para piezas no técnicas de Begasist, ordenando posicionamiento, claims seguros, prudentes, prohibidos y guardrails comerciales.
