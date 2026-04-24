# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-CREATE-CONTEXTUAL-DATE-FOLLOWUP-33

- Identificador: `FIX-CREATE-CONTEXTUAL-DATE-FOLLOWUP-33`
- Nombre: `FIX-CREATE-CONTEXTUAL-DATE-FOLLOWUP-33`
- Commit message: `FIX-CREATE-CONTEXTUAL-DATE-FOLLOWUP-33`
- Hash: `d3bc86b34fde60dd3ccc48bd87912d7f1bf3c45a`
- Descripción breve: Se corrige `create` para absorber una única fecha contextual relativa o explícita cuando el runtime espera `checkIn` o `checkOut`, persistiendo el draft parcial antes de decidir el siguiente prompt y evitando repreguntas del mismo slot.

## 2. REFACTOR-RUNTIME-REFERENCE-RESOLUTION-ALIGNMENT-32

- Identificador: `REFACTOR-RUNTIME-REFERENCE-RESOLUTION-ALIGNMENT-32`
- Nombre: `REFACTOR-RUNTIME-REFERENCE-RESOLUTION-ALIGNMENT-32`
- Commit message: `REFACTOR-RUNTIME-REFERENCE-RESOLUTION-ALIGNMENT-32`
- Hash: `8728ac3d86aee21e1b062a8c2540096fda31b8ea`
- Descripción breve: Se explicita el boundary del slice reference resolution en `messageHandler`, separando el resultado de decisión de su consumo posterior sin mover lógica fuera del runtime local ni cambiar comportamiento observable.

## 3. REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-4

- Identificador: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-4`
- Nombre: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-4`
- Commit message: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-4`
- Hash: `0aafb17817f53ea57fd6f3a33a19d9d312c7edef`
- Descripción breve: Se estabilizan expectations de tests de `create` frente a rollover/calendario mediante actualización de fixtures de mes y uso de asserts menos frágiles para fechas.

## 4. REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-3

- Identificador: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-3`
- Nombre: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-3`
- Commit message: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-3`
- Hash: `942d54314c41ba139ee72ee5c51e54e64fc9973d`
- Descripción breve: Se agrega un sufficiency gating local en `messageHandler` para evitar activación prematura de `create` ante consultas vagas de disponibilidad o pedidos ambiguos para fin de semana.

## 5. REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-2

- Identificador: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-2`
- Nombre: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-2`
- Commit message: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-2`
- Hash: `6c3a7578d9a4f39a59d21f68eee06c8af089eb64`
- Descripción breve: Se ajusta la precedencia del Fast-path 0 en `create` para priorizar rangos válidos y evitar que el corredor normal de quote/confirmación sea secuestrado por el atajo de fechas, incluyendo corrección contextual de rango corto dentro de `create`.

## 6. REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-1

- Identificador: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-1`
- Nombre: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-1`
- Commit message: `REFACTOR-RUNTIME-INTENT-SIGNAL-NORMALIZATION-26-HITO-1`
- Hash: `3c8ba8ab3cafee4fbe9110206a0ec59244dcceb7`
- Descripción breve: Se consolidan checks equivalentes de contexto `create` en `messageHandler` mediante el helper `isCreateContextActive(pre)`, sin alterar fast-paths, guards vagos ni tests.

## 7. FIX-CREATE-GUESTNAME-FALSE-POSITIVE-25

- Identificador: `FIX-CREATE-GUESTNAME-FALSE-POSITIVE-25`
- Nombre: `FIX-CREATE-GUESTNAME-FALSE-POSITIVE-25`
- Commit message: `FIX-CREATE-GUESTNAME-FALSE-POSITIVE-25`
- Hash: `0aefcc79ccc802a221c5a021286ce97d4ce6aefd`
- Descripción breve: Se corrigen falsos positivos en extracción de `guestName` en `create` mediante endurecimiento del validador canónico `isSafeGuestName`.

## 8. FIX-CREATE-FIRST-TURN-FULL-SLOT-PARSING-24

- Identificador: `FIX-CREATE-FIRST-TURN-FULL-SLOT-PARSING-24`
- Nombre: `FIX-CREATE-FIRST-TURN-FULL-SLOT-PARSING-24`
- Commit message: `FIX-CREATE-FIRST-TURN-FULL-SLOT-PARSING-24`
- Hash: `fa8cd789db9ee254421d65de3c0545ea40ee9c95`
- Descripción breve: Se corrige el parsing de rango `dd/mm` sin año en el primer turno de `create` mediante reutilización de `extractDateRangeFromTextLight` con guard explícito.

## 9. REFACTOR-RUNTIME-BRANCH-SIMPLIFICATION-23

- Identificador: `REFACTOR-RUNTIME-BRANCH-SIMPLIFICATION-23`
- Nombre: `REFACTOR-RUNTIME-BRANCH-SIMPLIFICATION-23`
- Commit message: `REFACTOR-RUNTIME-BRANCH-SIMPLIFICATION-23`
- Hash: `8cf7206f055ae8f7c95e49c41a933e8e6c88840d`
- Descripción breve: Se simplifican branches del runtime para el follow-up post-confirmación, extrayendo la resolución de snapshot confirmado a un helper puro y dejando efectos en el branch principal.

## 10. REFACTOR-RUNTIME-CONFIRMATION-GOVERNANCE-22

- Identificador: `REFACTOR-RUNTIME-CONFIRMATION-GOVERNANCE-22`
- Nombre: `REFACTOR-RUNTIME-CONFIRMATION-GOVERNANCE-22`
- Commit message: `REFACTOR-RUNTIME-CONFIRMATION-GOVERNANCE-22`
- Hash: `062211a6144bc68fb3e33fb4bbe0ae27222d80b6`
- Descripción breve: Se consolida la gobernanza de confirmación de `create` en un helper compartido usado por handler y graph, preservando confirmación explícita como único trigger de ejecución y evitando reapertura de `create` post-confirmación.
