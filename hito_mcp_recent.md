# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-PIPELINE-MODIFY-LATERAL-CONTINUITY-16

- Identificador: `FIX-PIPELINE-MODIFY-LATERAL-CONTINUITY-16`
- Nombre: `FIX-PIPELINE-MODIFY-LATERAL-CONTINUITY-16`
- Commit message: `FIX-PIPELINE-MODIFY-LATERAL-CONTINUITY-16`
- Hash: `4002b5e7946242a406192de386715be0b6ce69f0`
- Descripción breve: Se corrige la continuidad local de `modify.dates` después de un lateral FAQ puro, retomando desde el faltante contextual real en lugar de repreguntar ambas fechas.

## 2. DOC-ROADMAP-RUNTIME-BOUNDARIES-GOVERNANCE-UPDATE-01

- Identificador: `DOC-ROADMAP-RUNTIME-BOUNDARIES-GOVERNANCE-UPDATE-01`
- Nombre: `DOC-ROADMAP-RUNTIME-BOUNDARIES-GOVERNANCE-UPDATE-01`
- Commit message: `DOC-ROADMAP-RUNTIME-BOUNDARIES-GOVERNANCE-UPDATE-01`
- Hash: `3369b4d5ad85e046208a1ace0cf4867117bae494`
- Descripción breve: Se actualiza el estado real del roadmap, el checkpoint de entrada a Nivel 4 y las reglas de gobernanza para distinguir cambios locales frente a cambios estructurales del roadmap.

## 3. DOC-OPERATING-MODEL-AGENT-DISPATCH-AND-TOOLING-ALIGNMENT-01

- Identificador: `DOC-OPERATING-MODEL-AGENT-DISPATCH-AND-TOOLING-ALIGNMENT-01`
- Nombre: `DOC-OPERATING-MODEL-AGENT-DISPATCH-AND-TOOLING-ALIGNMENT-01`
- Commit message: `DOC-OPERATING-MODEL-AGENT-DISPATCH-AND-TOOLING-ALIGNMENT-01`
- Hash: `884b4b0244d079e2a69886841a7df7dc4988a776`
- Descripción breve: Se alinea el contrato operativo global con el dispatch explícito de agentes, la herramienta de cápsula, la puerta de entrada y el prompt de checkpoint arquitectónico.

## 4. FIX-PIPELINE-MODIFY-DATES-ENTRY-GOVERNANCE-15

- Identificador: `FIX-PIPELINE-MODIFY-DATES-ENTRY-GOVERNANCE-15`
- Nombre: `FIX-PIPELINE-MODIFY-DATES-ENTRY-GOVERNANCE-15`
- Commit message: `FIX-PIPELINE-MODIFY-DATES-ENTRY-GOVERNANCE-15 enter modify.dates directly when temporal signals are sufficient`
- Hash: `948c4574600481dbc8e151ea438e430f56e3d8bd`
- Descripción breve: Se corrige la entrada a `modify.dates` para que, ante señal temporal suficiente, el flujo entre directamente al subflow correcto y evite el menú genérico de `modify`.

## 5. FIX-PIPELINE-VERIFY-PENDING-SNAPSHOT-CONTINUITY-14

- Identificador: `FIX-PIPELINE-VERIFY-PENDING-SNAPSHOT-CONTINUITY-14`
- Nombre: `FIX-PIPELINE-VERIFY-PENDING-SNAPSHOT-CONTINUITY-14`
- Commit message: `FIX-PIPELINE-VERIFY-PENDING-SNAPSHOT-CONTINUITY-14 prioritize verify pending continuation over create affirmative follow-up`
- Hash: `8c81f9bcd56f08ec7ce16aea99a742605527242a`
- Descripción breve: Se corrige la precedencia entre `verify pending` y la continuidad afirmativa de `create`, para que verify domine cuando corresponde y no se corte por faltantes de create no pertinentes en ese punto.

## 6. TEST-PIPELINE-GRAPH-PARITY-FIXTURE-ALIGNMENT-01

- Identificador: `TEST-PIPELINE-GRAPH-PARITY-FIXTURE-ALIGNMENT-01`
- Nombre: `TEST-PIPELINE-GRAPH-PARITY-FIXTURE-ALIGNMENT-01`
- Commit message: `TEST-PIPELINE-GRAPH-PARITY-FIXTURE-ALIGNMENT-01 align graph parity test fixtures with typed channel and timestamp`
- Hash: `8ed48023903c5f768e2d540c12d30e297f6e21f9`
- Descripción breve: Se alinean los fixtures compartidos de tests de parity con el shape esperado del mensaje, usando `channel` tipado y `timestamp`.

## 7. EXP-PIPELINE-CREATE-LATERAL-PARITY-02-FINAL

- Identificador: `EXP-PIPELINE-CREATE-LATERAL-PARITY-02-FINAL`
- Nombre: `EXP-PIPELINE-CREATE-LATERAL-PARITY-02-FINAL`
- Commit message: `EXP-PIPELINE-CREATE-LATERAL-PARITY-02-FINAL record PARIDAD_OK after create lateral fixes 12 and 13`
- Hash: `79aa03242cf4c5323a25af4b48c5761f17b7f9a6`
- Descripción breve: Se registra la evidencia final de `PARIDAD_OK` para el escenario de lateral puro en `create`, luego de los fixes 12 y 13.

## 8. FIX-PIPELINE-CREATE-LATERAL-PURITY-REFINEMENT-13

- Identificador: `FIX-PIPELINE-CREATE-LATERAL-PURITY-REFINEMENT-13`
- Nombre: `FIX-PIPELINE-CREATE-LATERAL-PURITY-REFINEMENT-13`
- Commit message: `FIX-PIPELINE-CREATE-LATERAL-PURITY-REFINEMENT-13 persist pure lateral category inside create without falling back to reservation`
- Hash: `21c1430e2913c6503a4f44f7a66184fb88f04da3`
- Descripción breve: Se corrige la pureza del dominio lateral dentro de `create`, haciendo que un turno lateral puro quede persistido con su categoría lateral real y no con trazas de `reservation`.

## 9. EXP-PIPELINE-CREATE-LATERAL-PARITY-02-REVALIDATION

- Identificador: `EXP-PIPELINE-CREATE-LATERAL-PARITY-02-REVALIDATION`
- Nombre: `EXP-PIPELINE-CREATE-LATERAL-PARITY-02-REVALIDATION`
- Commit message: `EXP-PIPELINE-CREATE-LATERAL-PARITY-02-REVALIDATION tighten post-fix parity evidence for create lateral continuity`
- Hash: `28e3a5d427f5a572b6743b79adaab8b925edc0a6`
- Descripción breve: Se endurece la evidencia experimental del escenario de lateral puro en `create`, revalidando de forma explícita el estado observado después de `FIX-PIPELINE-CREATE-LATERAL-CONTINUITY-REFINEMENT-12`.

## 10. FIX-PIPELINE-CREATE-LATERAL-CONTINUITY-REFINEMENT-12

- Identificador: `FIX-PIPELINE-CREATE-LATERAL-CONTINUITY-REFINEMENT-12`
- Nombre: `FIX-PIPELINE-CREATE-LATERAL-CONTINUITY-REFINEMENT-12`
- Commit message: `FIX-PIPELINE-CREATE-LATERAL-CONTINUITY-REFINEMENT-12 resume the pending create field after a pure lateral turn`
- Hash: `ba1345179d15ba8bf3470ed0591de4d4fd317c78`
- Descripción breve: Se refina la continuidad de `create` para que, después de un lateral puro, el turno siguiente pueda reenganchar explícitamente el faltante pendiente si el usuario expresa continuación afirmativa.
