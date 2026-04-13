# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-PIPELINE-CREATE-LATERAL-PURITY-REFINEMENT-13

- Identificador: `FIX-PIPELINE-CREATE-LATERAL-PURITY-REFINEMENT-13`
- Nombre: `FIX-PIPELINE-CREATE-LATERAL-PURITY-REFINEMENT-13`
- Commit message: `FIX-PIPELINE-CREATE-LATERAL-PURITY-REFINEMENT-13 persist pure lateral category inside create without falling back to reservation`
- Hash: `21c1430e2913c6503a4f44f7a66184fb88f04da3`
- Descripción breve: Se corrige la pureza del dominio lateral dentro de `create`, haciendo que un turno lateral puro quede persistido con su categoría lateral real y no con trazas de `reservation`.

## 2. EXP-PIPELINE-CREATE-LATERAL-PARITY-02-REVALIDATION

- Identificador: `EXP-PIPELINE-CREATE-LATERAL-PARITY-02-REVALIDATION`
- Nombre: `EXP-PIPELINE-CREATE-LATERAL-PARITY-02-REVALIDATION`
- Commit message: `EXP-PIPELINE-CREATE-LATERAL-PARITY-02-REVALIDATION tighten post-fix parity evidence for create lateral continuity`
- Hash: `28e3a5d427f5a572b6743b79adaab8b925edc0a6`
- Descripción breve: Se endurece la evidencia experimental del escenario de lateral puro en `create`, revalidando de forma explícita el estado observado después de `FIX-PIPELINE-CREATE-LATERAL-CONTINUITY-REFINEMENT-12`.

## 3. FIX-PIPELINE-CREATE-LATERAL-CONTINUITY-REFINEMENT-12

- Identificador: `FIX-PIPELINE-CREATE-LATERAL-CONTINUITY-REFINEMENT-12`
- Nombre: `FIX-PIPELINE-CREATE-LATERAL-CONTINUITY-REFINEMENT-12`
- Commit message: `FIX-PIPELINE-CREATE-LATERAL-CONTINUITY-REFINEMENT-12 resume the pending create field after a pure lateral turn`
- Hash: `ba1345179d15ba8bf3470ed0591de4d4fd317c78`
- Descripción breve: Se refina la continuidad de `create` para que, después de un lateral puro, el turno siguiente pueda reenganchar explícitamente el faltante pendiente si el usuario expresa continuación afirmativa.

## 4. EXP-PIPELINE-CREATE-LATERAL-PARITY-02

- Identificador: `EXP-PIPELINE-CREATE-LATERAL-PARITY-02`
- Nombre: `EXP-PIPELINE-CREATE-LATERAL-PARITY-02`
- Commit message: `EXP-PIPELINE-CREATE-LATERAL-PARITY-02 collect contextual parity evidence for create lateral handling`
- Hash: `60144597cbefce5ebc86ac7898fee56e3ba16b2e`
- Descripción breve: Se agrega una suite experimental aislada para recolectar evidencia contextual de paridad entre `messageHandler` y `mhFlowGraph` en el escenario de `create` activo e incompleto con lateral puro y reenganche básico.

## 5. EXP-PIPELINE-FAQ-GRAPH-PARITY-01

- Identificador: `EXP-PIPELINE-FAQ-GRAPH-PARITY-01`
- Nombre: `EXP-PIPELINE-FAQ-GRAPH-PARITY-01`
- Commit message: `EXP-PIPELINE-FAQ-GRAPH-PARITY-01 collect parity evidence between messageHandler and mhFlowGraph for FAQ domains`
- Hash: `ce461fa0d78ba1b5e465177ea72dcba1a4ab2e72`
- Descripción breve: Se agrega una suite experimental aislada para recolectar evidencia auditable de paridad entre `messageHandler` y `mhFlowGraph` en dominios FAQ, amenities y policies.

## 6. FIX-PIPELINE-CREATE-LATERAL-DOMAIN-RESOLUTION-11

- Identificador: `FIX-PIPELINE-CREATE-LATERAL-DOMAIN-RESOLUTION-11`
- Nombre: `FIX-PIPELINE-CREATE-LATERAL-DOMAIN-RESOLUTION-11`
- Commit message: `FIX-PIPELINE-CREATE-LATERAL-DOMAIN-RESOLUTION-11 resolve lateral turns inside create without appending reservation continuation`
- Hash: `4bd76d8f7e31a09f4f0f11b65c0a8ba91d1c9e58`
- Descripción breve: Se corrige la resolución de laterales dentro de `create` para que se resuelvan en su dominio real sin agregar continuación textual de `reservation` en ese mismo turno.

## 7. DOC-CHATGPT-CAPSULE-TEMPLATE-AND-HANDOFF-REFINEMENT-02

- Identificador: `DOC-CHATGPT-CAPSULE-TEMPLATE-AND-HANDOFF-REFINEMENT-02`
- Nombre: `DOC-CHATGPT-CAPSULE-TEMPLATE-AND-HANDOFF-REFINEMENT-02`
- Commit message: `DOC-CHATGPT-CAPSULE-TEMPLATE-AND-HANDOFF-REFINEMENT-02 refine capsule template and handoff guide`
- Hash: `fb7d26a3d67694fa1194d9393f44a01ed7071b96`
- Descripción breve: Se refinan la plantilla de cápsula de contexto y la guía de handoff entre chat viejo y chat nuevo en ChatGPT.

## 8. DOC-ARCHITECTURE-FIXES-OPERATIONAL-RULE-RUNTIME-EVOLUTION-01

- Identificador: `DOC-ARCHITECTURE-FIXES-OPERATIONAL-RULE-RUNTIME-EVOLUTION-01`
- Nombre: `DOC-ARCHITECTURE-FIXES-OPERATIONAL-RULE-RUNTIME-EVOLUTION-01`
- Commit message: `DOC-ARCHITECTURE-FIXES-OPERATIONAL-RULE-RUNTIME-EVOLUTION-01 formalize operative rule for runtime-oriented fixes`
- Hash: `8850b45b85c68a5c3f7440e6fd448938d99edaf3`
- Descripción breve: Se formaliza una regla operativa para que cada fix del runtime no solo corrija el comportamiento observado, sino que deje la regla más explícita, más canónica y menos repartida.

## 9. FIX-PIPELINE-CREATE-PROPOSAL-CONFIRM-PAYLOAD-ALIGNMENT-10

- Identificador: `FIX-PIPELINE-CREATE-PROPOSAL-CONFIRM-PAYLOAD-ALIGNMENT-10`
- Nombre: `FIX-PIPELINE-CREATE-PROPOSAL-CONFIRM-PAYLOAD-ALIGNMENT-10`
- Commit message: `FIX-PIPELINE-CREATE-PROPOSAL-CONFIRM-PAYLOAD-ALIGNMENT-10 align final create payload with the latest quoted proposal`
- Hash: `cb95ddc8ca83676881380b026e2b9486500e58f3`
- Descripción breve: Se alinea la confirmación final de `create` con la última propuesta vigente, evitando que el payload confirmado arrastre valores stale desde `reservationSlots`.

## 10. FIX-PIPELINE-CANCEL-LATERAL-DOMAIN-RESOLUTION-09

- Identificador: `FIX-PIPELINE-CANCEL-LATERAL-DOMAIN-RESOLUTION-09`
- Nombre: `FIX-PIPELINE-CANCEL-LATERAL-DOMAIN-RESOLUTION-09`
- Commit message: `FIX-PIPELINE-CANCEL-LATERAL-DOMAIN-RESOLUTION-09 resolve amenities lateral inside cancel without falling back to reservation`
- Hash: `ca41dfdd52f663d411a52638d87d63d197cff4fe`
- Descripción breve: Se corrige la resolución de laterales de amenities dentro de `cancel`, evitando degradación a fallback de `reservation` y preservando la continuidad del contexto de cancelación.
