# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. REFACTOR-RUNTIME-BRANCH-SIMPLIFICATION-23

- Identificador: `REFACTOR-RUNTIME-BRANCH-SIMPLIFICATION-23`
- Nombre: `REFACTOR-RUNTIME-BRANCH-SIMPLIFICATION-23`
- Commit message: `REFACTOR-RUNTIME-BRANCH-SIMPLIFICATION-23`
- Hash: `8cf7206f055ae8f7c95e49c41a933e8e6c88840d`
- Descripción breve: Se simplifican branches del runtime para el follow-up post-confirmación, extrayendo la resolución de snapshot confirmado a un helper puro y dejando efectos en el branch principal.

## 2. REFACTOR-RUNTIME-CONFIRMATION-GOVERNANCE-22

- Identificador: `REFACTOR-RUNTIME-CONFIRMATION-GOVERNANCE-22`
- Nombre: `REFACTOR-RUNTIME-CONFIRMATION-GOVERNANCE-22`
- Commit message: `REFACTOR-RUNTIME-CONFIRMATION-GOVERNANCE-22`
- Hash: `062211a6144bc68fb3e33fb4bbe0ae27222d80b6`
- Descripción breve: Se consolida la gobernanza de confirmación de `create` en un helper compartido usado por handler y graph, preservando confirmación explícita como único trigger de ejecución y evitando reapertura de `create` post-confirmación.

## 3. FEAT-ADMIN-DEMO-INVENTORY-OBSERVABILITY-19

- Identificador: `FEAT-ADMIN-DEMO-INVENTORY-OBSERVABILITY-19`
- Nombre: `FEAT-ADMIN-DEMO-INVENTORY-OBSERVABILITY-19`
- Commit message: `FEAT-ADMIN-DEMO-INVENTORY-OBSERVABILITY-19`
- Hash: `7a860c799b0be05149280fd89f2b67d43fb85627`
- Descripción breve: Se agrega una herramienta de observabilidad y control del inventario demo en memoria con UI, API, snapshot real del adapter y reset operativo por `hotelId`.

## 4. FIX-PIPELINE-CREATE-PREMATURE-EXECUTION-21

- Identificador: `FIX-PIPELINE-CREATE-PREMATURE-EXECUTION-21`
- Nombre: `FIX-PIPELINE-CREATE-PREMATURE-EXECUTION-21`
- Commit message: `FIX-PIPELINE-CREATE-PREMATURE-EXECUTION-21`
- Hash: `7220ace9c21e6158a647a545b2c1c5625f1968c0`
- Descripción breve: Se corrige la ejecución prematura y la duplicación en `create` mediante confirmación explícita de commit y un guard consistente entre handler y graph.

## 5. FIX-PIPELINE-MODIFY-DATES-SLOT-CORRECTION-18

- Identificador: `FIX-PIPELINE-MODIFY-DATES-SLOT-CORRECTION-18`
- Nombre: `FIX-PIPELINE-MODIFY-DATES-SLOT-CORRECTION-18`
- Commit message: `FIX-PIPELINE-MODIFY-DATES-SLOT-CORRECTION-18`
- Hash: `a270e2b02edb7cee654866aad8d203ce8e8dcf70`
- Descripción breve: Se corrige `modify.dates` para interpretar correcciones conversacionales sobre un rango ya completo y reemplazar el slot corregido sin degradar el subflow.

## 6. FIX-PIPELINE-MODIFY-DATES-CONTEXTUAL-ANCHORING-17

- Identificador: `FIX-PIPELINE-MODIFY-DATES-CONTEXTUAL-ANCHORING-17`
- Nombre: `FIX-PIPELINE-MODIFY-DATES-CONTEXTUAL-ANCHORING-17`
- Commit message: `FIX-PIPELINE-MODIFY-DATES-CONTEXTUAL-ANCHORING-17`
- Hash: `f95f095bcac31177b3e8f2836f60fc614f541b03`
- Descripción breve: Se corrige el anclaje contextual local para weekdays relativos cortos en `modify.dates` cuando existe `checkIn` parcial y falta `checkOut`.

## 7. FIX-PIPELINE-MODIFY-LATERAL-CONTINUITY-16

- Identificador: `FIX-PIPELINE-MODIFY-LATERAL-CONTINUITY-16`
- Nombre: `FIX-PIPELINE-MODIFY-LATERAL-CONTINUITY-16`
- Commit message: `FIX-PIPELINE-MODIFY-LATERAL-CONTINUITY-16`
- Hash: `4002b5e7946242a406192de386715be0b6ce69f0`
- Descripción breve: Se corrige la continuidad local de `modify.dates` después de un lateral FAQ puro, retomando desde el faltante contextual real en lugar de repreguntar ambas fechas.

## 8. DOC-ROADMAP-RUNTIME-BOUNDARIES-GOVERNANCE-UPDATE-01

- Identificador: `DOC-ROADMAP-RUNTIME-BOUNDARIES-GOVERNANCE-UPDATE-01`
- Nombre: `DOC-ROADMAP-RUNTIME-BOUNDARIES-GOVERNANCE-UPDATE-01`
- Commit message: `DOC-ROADMAP-RUNTIME-BOUNDARIES-GOVERNANCE-UPDATE-01`
- Hash: `3369b4d5ad85e046208a1ace0cf4867117bae494`
- Descripción breve: Se actualiza el estado real del roadmap, el checkpoint de entrada a Nivel 4 y las reglas de gobernanza para distinguir cambios locales frente a cambios estructurales del roadmap.

## 9. DOC-OPERATING-MODEL-AGENT-DISPATCH-AND-TOOLING-ALIGNMENT-01

- Identificador: `DOC-OPERATING-MODEL-AGENT-DISPATCH-AND-TOOLING-ALIGNMENT-01`
- Nombre: `DOC-OPERATING-MODEL-AGENT-DISPATCH-AND-TOOLING-ALIGNMENT-01`
- Commit message: `DOC-OPERATING-MODEL-AGENT-DISPATCH-AND-TOOLING-ALIGNMENT-01`
- Hash: `884b4b0244d079e2a69886841a7df7dc4988a776`
- Descripción breve: Se alinea el contrato operativo global con el dispatch explícito de agentes, la herramienta de cápsula, la puerta de entrada y el prompt de checkpoint arquitectónico.

## 10. FIX-PIPELINE-MODIFY-DATES-ENTRY-GOVERNANCE-15

- Identificador: `FIX-PIPELINE-MODIFY-DATES-ENTRY-GOVERNANCE-15`
- Nombre: `FIX-PIPELINE-MODIFY-DATES-ENTRY-GOVERNANCE-15`
- Commit message: `FIX-PIPELINE-MODIFY-DATES-ENTRY-GOVERNANCE-15 enter modify.dates directly when temporal signals are sufficient`
- Hash: `948c4574600481dbc8e151ea438e430f56e3d8bd`
- Descripción breve: Se corrige la entrada a `modify.dates` para que, ante señal temporal suficiente, el flujo entre directamente al subflow correcto y evite el menú genérico de `modify`.
