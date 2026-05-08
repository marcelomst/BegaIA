# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. DOC-PRESENTATION-USE-CASES-DEMO-SELECTION-BEGAIA-62

- Identificador: `DOC-PRESENTATION-USE-CASES-DEMO-SELECTION-BEGAIA-62`
- Nombre: `DOC-PRESENTATION-USE-CASES-DEMO-SELECTION-BEGAIA-62`
- Commit message: `DOC-PRESENTATION-USE-CASES-DEMO-SELECTION-BEGAIA-62`
- Hash: `e90402f18ac12bf376f42d4082e0f917ffb15e69`
- Descripción breve: Se crea el documento fuente draft para selección de casos de uso y recorridos de demo no técnica de `BegaIA`, con claims seguros y límites comerciales explícitos.

## 2. DOC-DEMO-PRESENTATION-RESYNC-BEGAIA-61

- Identificador: `DOC-DEMO-PRESENTATION-RESYNC-BEGAIA-61`
- Nombre: `DOC-DEMO-PRESENTATION-RESYNC-BEGAIA-61`
- Commit message: `DOC-DEMO-PRESENTATION-RESYNC-BEGAIA-61`
- Hash: `fda64cc150c3432b58d0ac982e4b2a16b0bd44f4`
- Descripción breve: Se resincronizan los documentos de presentación/demo para usar `BegaIA` como branding externo y actualizar narrativa y capability map al estado real validado hasta el hito 60.

## 3. FEAT-ASSISTANT-BRANDING-ACKNOWLEDGEMENT-COPY-60

- Identificador: `FEAT-ASSISTANT-BRANDING-ACKNOWLEDGEMENT-COPY-60`
- Nombre: `FEAT-ASSISTANT-BRANDING-ACKNOWLEDGEMENT-COPY-60`
- Commit message: `FEAT-ASSISTANT-BRANDING-ACKNOWLEDGEMENT-COPY-60`
- Hash: `249ca2ca2f36f11915645f8baa5486bdc2e171cc`
- Descripción breve: Se extiende `assistantBranding` con `acknowledgementLabel` como copy controlado, fallback seguro a `Encantado` y limpieza canónica completa al vaciar branding base.

## 4. FEAT-ADMIN-ASSISTANT-BRANDING-UI-59

- Identificador: `FEAT-ADMIN-ASSISTANT-BRANDING-UI-59`
- Nombre: `FEAT-ADMIN-ASSISTANT-BRANDING-UI-59`
- Commit message: `FEAT-ADMIN-ASSISTANT-BRANDING-UI-59`
- Hash: `e7bc0c32a7f0466254c8ddbe6e25e00a33cebeb1`
- Descripción breve: Se agrega mantenimiento operativo desde la UI canónica de edición de hotel para `assistantBranding`, con validación centralizada, preview compartido con runtime y fallback seguro.

## 5. FEAT-HOTEL-ASSISTANT-BRANDING-CONFIG-58

- Identificador: `FEAT-HOTEL-ASSISTANT-BRANDING-CONFIG-58`
- Nombre: `FEAT-HOTEL-ASSISTANT-BRANDING-CONFIG-58`
- Commit message: `FEAT-HOTEL-ASSISTANT-BRANDING-CONFIG-58`
- Hash: `a55fc61ea67dc132e407998716815655312a35a7`
- Descripción breve: Se agrega configuración básica y opcional de branding textual del asistente por hotel mediante `assistantBranding`, con fallback seguro a `BegaIA` y `el asistente hotelero digital`.

## 6. FIX-AVAILABILITY-INQUIRY-TYPO-TOLERANCE-57

- Identificador: `FIX-AVAILABILITY-INQUIRY-TYPO-TOLERANCE-57`
- Nombre: `FIX-AVAILABILITY-INQUIRY-TYPO-TOLERANCE-57`
- Commit message: `FIX-AVAILABILITY-INQUIRY-TYPO-TOLERANCE-57`
- Hash: `a8a0c044db91e81d73ec27cea2dd365f11947a2f`
- Descripción breve: Se agrega tolerancia mínima y explícita a typos frecuentes de disponibilidad para que sigan el flujo de `availability inquiry` sin abrir `create`.

## 7. FEAT-RUNTIME-GUEST-NAME-CAPTURE-ON-GREETING-56

- Identificador: `FEAT-RUNTIME-GUEST-NAME-CAPTURE-ON-GREETING-56`
- Nombre: `FEAT-RUNTIME-GUEST-NAME-CAPTURE-ON-GREETING-56`
- Commit message: `FEAT-RUNTIME-GUEST-NAME-CAPTURE-ON-GREETING-56`
- Hash: `57bf0f245272a8adb6ff1b1055a20a4b62069b9f`
- Descripción breve: Se implementa una captura mínima de `guest.name` en el saludo inicial de un guest nuevo, persistiéndolo sobre el guest canónico y preservando el path correcto de `create` explícito.

## 8. FIX-RUNTIME-GUEST-RESERVATION-SNAPSHOT-AFTER-MERGE-55

- Identificador: `FIX-RUNTIME-GUEST-RESERVATION-SNAPSHOT-AFTER-MERGE-55`
- Nombre: `FIX-RUNTIME-GUEST-RESERVATION-SNAPSHOT-AFTER-MERGE-55`
- Commit message: `FIX-RUNTIME-GUEST-RESERVATION-SNAPSHOT-AFTER-MERGE-55`
- Hash: `72e9d2ae9a4589208dc6e69f6826257b7954e0fb`
- Descripción breve: Se agrega un fallback de solo lectura para snapshot/listado de reservas post-merge usando el guest canónico consolidado cuando la conversación actual no tiene historial local.

## 9. FIX-AVAILABILITY-INQUIRY-AFTER-RESERVATION-CONTEXT-54

- Identificador: `FIX-AVAILABILITY-INQUIRY-AFTER-RESERVATION-CONTEXT-54`
- Nombre: `FIX-AVAILABILITY-INQUIRY-AFTER-RESERVATION-CONTEXT-54`
- Commit message: `FIX-AVAILABILITY-INQUIRY-AFTER-RESERVATION-CONTEXT-54`
- Hash: `c18e9e43862c6ad9a5b14538bacbdbe9428bc8a1`
- Descripción breve: Se corrige la precedencia contextual para que una consulta pura de disponibilidad después de una reserva siga el flujo de `availability inquiry` y no derive a `modify`.

## 10. FIX-RUNTIME-CONVERSATIONAL-DISPLAY-NAME-PROPOSAL-PATHS-53

- Identificador: `FIX-RUNTIME-CONVERSATIONAL-DISPLAY-NAME-PROPOSAL-PATHS-53`
- Nombre: `FIX-RUNTIME-CONVERSATIONAL-DISPLAY-NAME-PROPOSAL-PATHS-53`
- Commit message: `FIX-RUNTIME-CONVERSATIONAL-DISPLAY-NAME-PROPOSAL-PATHS-53`
- Hash: `d6c2bd23bec3f3f27de38eec5bc60eebf48e557f`
- Descripción breve: Se asegura el uso de `conversationalDisplayName` desde guest canónico en proposal paths seguros, manteniendo tono neutro sin guest conocido y sin reutilizar `reservationHolderName` como vocativo.
