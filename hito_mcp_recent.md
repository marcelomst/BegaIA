# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-4

- Identificador: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-4`
- Nombre: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-4`
- Commit message: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-4`
- Hash: `0aafb17817f53ea57fd6f3a33a19d9d312c7edef`
- Descripción breve: Se estabilizan expectations de tests de `create` frente a rollover/calendario mediante actualización de fixtures de mes y uso de asserts menos frágiles para fechas.

## 2. REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-3

- Identificador: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-3`
- Nombre: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-3`
- Commit message: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-3`
- Hash: `942d54314c41ba139ee72ee5c51e54e64fc9973d`
- Descripción breve: Se agrega un sufficiency gating local en `messageHandler` para evitar activación prematura de `create` ante consultas vagas de disponibilidad o pedidos ambiguos para fin de semana.

## 3. REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-2

- Identificador: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-2`
- Nombre: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-2`
- Commit message: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-2`
- Hash: `6c3a7578d9a4f39a59d21f68eee06c8af089eb64`
- Descripción breve: Se ajusta la precedencia del Fast-path 0 en `create` para priorizar rangos válidos y evitar que el corredor normal de quote/confirmación sea secuestrado por el atajo de fechas, incluyendo corrección contextual de rango corto dentro de `create`.

## 4. REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-1

- Identificador: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-1`
- Nombre: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-1`
- Commit message: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-1`
- Hash: `3c8ba8ab3cafee4fbe9110206a0ec59244dcceb7`
- Descripción breve: Se consolidan checks equivalentes de contexto `create` en `messageHandler` mediante el helper `isCreateContextActive(pre)`, sin alterar fast-paths, guards vagos ni tests.

## 5. FIX-CREATE-GUESTNAME-FALSE-POSITIVE-25

- Identificador: `FIX-CREATE-GUESTNAME-FALSE-POSITIVE-25`
- Nombre: `FIX-CREATE-GUESTNAME-FALSE-POSITIVE-25`
- Commit message: `FIX-CREATE-GUESTNAME-FALSE-POSITIVE-25`
- Hash: `0aefcc79ccc802a221c5a021286ce97d4ce6aefd`
- Descripción breve: Se corrigen falsos positivos en extracción de `guestName` en `create` mediante endurecimiento del validador canónico `isSafeGuestName`.

## 6. FIX-CREATE-FIRST-TURN-FULL-SLOT-PARSING-24

- Identificador: `FIX-CREATE-FIRST-TURN-FULL-SLOT-PARSING-24`
- Nombre: `FIX-CREATE-FIRST-TURN-FULL-SLOT-PARSING-24`
- Commit message: `FIX-CREATE-FIRST-TURN-FULL-SLOT-PARSING-24`
- Hash: `fa8cd789db9ee254421d65de3c0545ea40ee9c95`
- Descripción breve: Se corrige el parsing de rango `dd/mm` sin año en el primer turno de `create` mediante reutilización de `extractDateRangeFromTextLight` con guard explícito.

## 7. REFACTOR-RUNTIME-BRANCH-SIMPLIFICATION-23

- Identificador: `REFACTOR-RUNTIME-BRANCH-SIMPLIFICATION-23`
- Nombre: `REFACTOR-RUNTIME-BRANCH-SIMPLIFICATION-23`
- Commit message: `REFACTOR-RUNTIME-BRANCH-SIMPLIFICATION-23`
- Hash: `8cf7206f055ae8f7c95e49c41a933e8e6c88840d`
- Descripción breve: Se simplifican branches del runtime para el follow-up post-confirmación, extrayendo la resolución de snapshot confirmado a un helper puro y dejando efectos en el branch principal.

## 8. REFACTOR-RUNTIME-CONFIRMATION-GOVERNANCE-22

- Identificador: `REFACTOR-RUNTIME-CONFIRMATION-GOVERNANCE-22`
- Nombre: `REFACTOR-RUNTIME-CONFIRMATION-GOVERNANCE-22`
- Commit message: `REFACTOR-RUNTIME-CONFIRMATION-GOVERNANCE-22`
- Hash: `062211a6144bc68fb3e33fb4bbe0ae27222d80b6`
- Descripción breve: Se consolida la gobernanza de confirmación de `create` en un helper compartido usado por handler y graph, preservando confirmación explícita como único trigger de ejecución y evitando reapertura de `create` post-confirmación.

## 9. FEAT-ADMIN-DEMO-INVENTORY-OBSERVABILITY-19

- Identificador: `FEAT-ADMIN-DEMO-INVENTORY-OBSERVABILITY-19`
- Nombre: `FEAT-ADMIN-DEMO-INVENTORY-OBSERVABILITY-19`
- Commit message: `FEAT-ADMIN-DEMO-INVENTORY-OBSERVABILITY-19`
- Hash: `7a860c799b0be05149280fd89f2b67d43fb85627`
- Descripción breve: Se agrega una herramienta de observabilidad y control del inventario demo en memoria con UI, API, snapshot real del adapter y reset operativo por `hotelId`.

## 10. FIX-PIPELINE-CREATE-PREMATURE-EXECUTION-21

- Identificador: `FIX-PIPELINE-CREATE-PREMATURE-EXECUTION-21`
- Nombre: `FIX-PIPELINE-CREATE-PREMATURE-EXECUTION-21`
- Commit message: `FIX-PIPELINE-CREATE-PREMATURE-EXECUTION-21`
- Hash: `7220ace9c21e6158a647a545b2c1c5625f1968c0`
- Descripción breve: Se corrige la ejecución prematura y la duplicación en `create` mediante confirmación explícita de commit y un guard consistente entre handler y graph.
