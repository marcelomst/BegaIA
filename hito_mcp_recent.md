# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FEAT-RUNTIME-GUEST-NAME-CAPTURE-ON-GREETING-56

- Identificador: `FEAT-RUNTIME-GUEST-NAME-CAPTURE-ON-GREETING-56`
- Nombre: `FEAT-RUNTIME-GUEST-NAME-CAPTURE-ON-GREETING-56`
- Commit message: `FEAT-RUNTIME-GUEST-NAME-CAPTURE-ON-GREETING-56`
- Hash: `57bf0f245272a8adb6ff1b1055a20a4b62069b9f`
- Descripción breve: Se implementa una captura mínima de `guest.name` en el saludo inicial de un guest nuevo, persistiéndolo sobre el guest canónico y preservando el path correcto de `create` explícito.

## 2. FIX-RUNTIME-GUEST-RESERVATION-SNAPSHOT-AFTER-MERGE-55

- Identificador: `FIX-RUNTIME-GUEST-RESERVATION-SNAPSHOT-AFTER-MERGE-55`
- Nombre: `FIX-RUNTIME-GUEST-RESERVATION-SNAPSHOT-AFTER-MERGE-55`
- Commit message: `FIX-RUNTIME-GUEST-RESERVATION-SNAPSHOT-AFTER-MERGE-55`
- Hash: `72e9d2ae9a4589208dc6e69f6826257b7954e0fb`
- Descripción breve: Se agrega un fallback de solo lectura para snapshot/listado de reservas post-merge usando el guest canónico consolidado cuando la conversación actual no tiene historial local.

## 3. FIX-AVAILABILITY-INQUIRY-AFTER-RESERVATION-CONTEXT-54

- Identificador: `FIX-AVAILABILITY-INQUIRY-AFTER-RESERVATION-CONTEXT-54`
- Nombre: `FIX-AVAILABILITY-INQUIRY-AFTER-RESERVATION-CONTEXT-54`
- Commit message: `FIX-AVAILABILITY-INQUIRY-AFTER-RESERVATION-CONTEXT-54`
- Hash: `c18e9e43862c6ad9a5b14538bacbdbe9428bc8a1`
- Descripción breve: Se corrige la precedencia contextual para que una consulta pura de disponibilidad después de una reserva siga el flujo de `availability inquiry` y no derive a `modify`.

## 4. FIX-RUNTIME-CONVERSATIONAL-DISPLAY-NAME-PROPOSAL-PATHS-53

- Identificador: `FIX-RUNTIME-CONVERSATIONAL-DISPLAY-NAME-PROPOSAL-PATHS-53`
- Nombre: `FIX-RUNTIME-CONVERSATIONAL-DISPLAY-NAME-PROPOSAL-PATHS-53`
- Commit message: `FIX-RUNTIME-CONVERSATIONAL-DISPLAY-NAME-PROPOSAL-PATHS-53`
- Hash: `d6c2bd23bec3f3f27de38eec5bc60eebf48e557f`
- Descripción breve: Se asegura el uso de `conversationalDisplayName` desde guest canónico en proposal paths seguros, manteniendo tono neutro sin guest conocido y sin reutilizar `reservationHolderName` como vocativo.

## 5. FIX-ADMIN-GUESTS-PROFILE-NAME-READPATH-52

- Identificador: `FIX-ADMIN-GUESTS-PROFILE-NAME-READPATH-52`
- Nombre: `FIX-ADMIN-GUESTS-PROFILE-NAME-READPATH-52`
- Commit message: `FIX-ADMIN-GUESTS-PROFILE-NAME-READPATH-52`
- Hash: `38779d323d332bb2ef33892f5d82cc5208b0fc9f`
- Descripción breve: Se corrige el read-path de Admin/profile para priorizar el documento canónico más completo del guest cuando existen filas mínimas o duplicadas con el mismo `guestId`.

## 6. FIX-ADMIN-GUESTS-CONSOLIDATION-ACTIONS-51

- Identificador: `FIX-ADMIN-GUESTS-CONSOLIDATION-ACTIONS-51`
- Nombre: `FIX-ADMIN-GUESTS-CONSOLIDATION-ACTIONS-51`
- Commit message: `FIX-ADMIN-GUESTS-CONSOLIDATION-ACTIONS-51`
- Hash: `6e497edda46799467cfa64b8eccdf3f72690054d`
- Descripción breve: Se corrige la consolidación real de guests en Admin para tolerar merges sobre filas derivadas desde `conversations`, creando registros mínimos antes de consolidar.

## 7. FIX-ADMIN-GUESTS-CONVERSATION-LOAD-50

- Identificador: `FIX-ADMIN-GUESTS-CONVERSATION-LOAD-50`
- Nombre: `FIX-ADMIN-GUESTS-CONVERSATION-LOAD-50`
- Commit message: `FIX-ADMIN-GUESTS-CONVERSATION-LOAD-50`
- Hash: `720856d226bc3bb252a427617cc225b02a259c11`
- Descripción breve: Se restaura el read-path Admin/API de guests y conversaciones con degradación defensiva, fallback desde `conversations` y lectura canónica por `guestId` y aliases.

## 8. IMPLEMENT-CONVERSATIONAL-DISPLAY-NAME-READPATH-GOVERNANCE-49

- Identificador: `IMPLEMENT-CONVERSATIONAL-DISPLAY-NAME-READPATH-GOVERNANCE-49`
- Nombre: `IMPLEMENT-CONVERSATIONAL-DISPLAY-NAME-READPATH-GOVERNANCE-49`
- Commit message: `IMPLEMENT-CONVERSATIONAL-DISPLAY-NAME-READPATH-GOVERNANCE-49`
- Hash: `e4a8ae84b4cee416b1b4089b21b427884552f1a2`
- Descripción breve: Se introduce un read-path seguro de `conversationalDisplayName` desde el guest canónico para usar vocativo solo cuando exista identidad conversacional confiable.

## 9. FIX-CREATE-RELATIVE-WEEKDAY-RANGE-GENERALIZATION-47

- Identificador: `FIX-CREATE-RELATIVE-WEEKDAY-RANGE-GENERALIZATION-47`
- Nombre: `FIX-CREATE-RELATIVE-WEEKDAY-RANGE-GENERALIZATION-47`
- Commit message: `FIX-CREATE-RELATIVE-WEEKDAY-RANGE-GENERALIZATION-47`
- Hash: `2e0253963756a1e5d4c0d6b2ac3b10c65824f0d3`
- Descripción breve: Se generaliza la detección de rangos relativos consecutivos de weekdays en `create`, incluyendo conectores como `al`, `hasta`, `y` y variantes equivalentes.

## 10. FIX-CREATE-AVAILABILITY-SEQUENCING-UX-46

- Identificador: `FIX-CREATE-AVAILABILITY-SEQUENCING-UX-46`
- Nombre: `FIX-CREATE-AVAILABILITY-SEQUENCING-UX-46`
- Commit message: `FIX-CREATE-AVAILABILITY-SEQUENCING-UX-46`
- Hash: `9ae3467831f82a287ff07012efc134df1ba706c4`
- Descripción breve: Se corrige el sequencing entre `create` y `availability inquiry` para que un `create` explícito completo cotice directo y no pase por `Anoté nuevas fechas...`.
