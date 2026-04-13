# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-PIPELINE-CREATE-LATERAL-DOMAIN-RESOLUTION-11

- Identificador: `FIX-PIPELINE-CREATE-LATERAL-DOMAIN-RESOLUTION-11`
- Nombre: `FIX-PIPELINE-CREATE-LATERAL-DOMAIN-RESOLUTION-11`
- Commit message: `FIX-PIPELINE-CREATE-LATERAL-DOMAIN-RESOLUTION-11 resolve lateral turns inside create without appending reservation continuation`
- Hash: `4bd76d8f7e31a09f4f0f11b65c0a8ba91d1c9e58`
- Descripción breve: Se corrige la resolución de laterales dentro de `create` para que se resuelvan en su dominio real sin agregar continuación textual de `reservation` en ese mismo turno.

## 2. DOC-CHATGPT-CAPSULE-TEMPLATE-AND-HANDOFF-REFINEMENT-02

- Identificador: `DOC-CHATGPT-CAPSULE-TEMPLATE-AND-HANDOFF-REFINEMENT-02`
- Nombre: `DOC-CHATGPT-CAPSULE-TEMPLATE-AND-HANDOFF-REFINEMENT-02`
- Commit message: `DOC-CHATGPT-CAPSULE-TEMPLATE-AND-HANDOFF-REFINEMENT-02 refine capsule template and handoff guide`
- Hash: `fb7d26a3d67694fa1194d9393f44a01ed7071b96`
- Descripción breve: Se refinan la plantilla de cápsula de contexto y la guía de handoff entre chat viejo y chat nuevo en ChatGPT.

## 3. DOC-ARCHITECTURE-FIXES-OPERATIONAL-RULE-RUNTIME-EVOLUTION-01

- Identificador: `DOC-ARCHITECTURE-FIXES-OPERATIONAL-RULE-RUNTIME-EVOLUTION-01`
- Nombre: `DOC-ARCHITECTURE-FIXES-OPERATIONAL-RULE-RUNTIME-EVOLUTION-01`
- Commit message: `DOC-ARCHITECTURE-FIXES-OPERATIONAL-RULE-RUNTIME-EVOLUTION-01 formalize operative rule for runtime-oriented fixes`
- Hash: `8850b45b85c68a5c3f7440e6fd448938d99edaf3`
- Descripción breve: Se formaliza una regla operativa para que cada fix del runtime no solo corrija el comportamiento observado, sino que deje la regla más explícita, más canónica y menos repartida.

## 4. FIX-PIPELINE-CREATE-PROPOSAL-CONFIRM-PAYLOAD-ALIGNMENT-10

- Identificador: `FIX-PIPELINE-CREATE-PROPOSAL-CONFIRM-PAYLOAD-ALIGNMENT-10`
- Nombre: `FIX-PIPELINE-CREATE-PROPOSAL-CONFIRM-PAYLOAD-ALIGNMENT-10`
- Commit message: `FIX-PIPELINE-CREATE-PROPOSAL-CONFIRM-PAYLOAD-ALIGNMENT-10 align final create payload with the latest quoted proposal`
- Hash: `cb95ddc8ca83676881380b026e2b9486500e58f3`
- Descripción breve: Se alinea la confirmación final de `create` con la última propuesta vigente, evitando que el payload confirmado arrastre valores stale desde `reservationSlots`.

## 5. FIX-PIPELINE-CANCEL-LATERAL-DOMAIN-RESOLUTION-09

- Identificador: `FIX-PIPELINE-CANCEL-LATERAL-DOMAIN-RESOLUTION-09`
- Nombre: `FIX-PIPELINE-CANCEL-LATERAL-DOMAIN-RESOLUTION-09`
- Commit message: `FIX-PIPELINE-CANCEL-LATERAL-DOMAIN-RESOLUTION-09 resolve amenities lateral inside cancel without falling back to reservation`
- Hash: `ca41dfdd52f663d411a52638d87d63d197cff4fe`
- Descripción breve: Se corrige la resolución de laterales de amenities dentro de `cancel`, evitando degradación a fallback de `reservation` y preservando la continuidad del contexto de cancelación.

## 6. DOC-CHATGPT-CONTEXT-HANDOFF-CAPSULE-WORKFLOW-01

- Identificador: `DOC-CHATGPT-CONTEXT-HANDOFF-CAPSULE-WORKFLOW-01`
- Nombre: `DOC-CHATGPT-CONTEXT-HANDOFF-CAPSULE-WORKFLOW-01`
- Commit message: `DOC-CHATGPT-CONTEXT-HANDOFF-CAPSULE-WORKFLOW-01 add capsule template and new chat handoff guide`
- Hash: `d1183d858962615b66ec67e43e96f3e64ee2fd0b`
- Descripción breve: Se versionan un template de cápsula de contexto y una guía de handoff entre chat viejo y chat nuevo en la app de ChatGPT.

## 7. FIX-PIPELINE-MODIFY-LATERAL-DOMAIN-RESOLUTION-08A

- Identificador: `FIX-PIPELINE-MODIFY-LATERAL-DOMAIN-RESOLUTION-08A`
- Nombre: `FIX-PIPELINE-MODIFY-LATERAL-DOMAIN-RESOLUTION-08A`
- Commit message: `FIX-PIPELINE-MODIFY-LATERAL-DOMAIN-RESOLUTION-08A resolve amenities lateral inside modify without falling back to reservation`
- Hash: `47c9f517cc1b800839dd085c15bac4a9f90356f4`
- Descripción breve: Se corrige la resolución de laterales de amenities dentro de `modify`, evitando degradación a fallback de `reservation` y preservando la continuidad simple del subflow.

## 8. FIX-PIPELINE-CREATE-NAME-GATING-09

- Identificador: `FIX-PIPELINE-CREATE-NAME-GATING-09`
- Nombre: `FIX-PIPELINE-CREATE-NAME-GATING-09`
- Commit message: `FIX-PIPELINE-CREATE-NAME-GATING-09 capture inline guestName and gate create when only the name is missing`
- Hash: `b6686cb8240b6c30b9de228c84b437ea4bbb8127`
- Descripción breve: Se corrige la captura y el gating de `guestName` en el flujo `create`, evitando caída a fallback genérico cuando el único faltante es el nombre del huésped.

## 9. FIX-PIPELINE-MODIFY-TARGET-CONTINUITY-07

- Identificador: `FIX-PIPELINE-MODIFY-TARGET-CONTINUITY-07`
- Nombre: `FIX-PIPELINE-MODIFY-TARGET-CONTINUITY-07`
- Commit message: `FIX-PIPELINE-MODIFY-TARGET-CONTINUITY-07 preserve modify target across compatible lateral turns`
- Hash: `11058f0e19a8ddb4741df137c48a0af92e854540`
- Descripción breve: Se preserva el target de reserva en `modify` ante interacciones laterales compatibles, evitando pérdida de foco y repregunta de selección.

## 10. FIX-PIPELINE-CREATE-VS-MODIFY-DOMINANCE-RESOLUTION-06

- Identificador: `FIX-PIPELINE-CREATE-VS-MODIFY-DOMINANCE-RESOLUTION-06`
- Nombre: `FIX-PIPELINE-CREATE-VS-MODIFY-DOMINANCE-RESOLUTION-06`
- Commit message: `FIX-PIPELINE-CREATE-VS-MODIFY-DOMINANCE-RESOLUTION-06 prefer explicit create over incompatible modify continuity`
- Hash: `97e788fc7bb0fa04fe31fe9c62d9cc3fd24003d9`
- Descripción breve: Se corrige la dominancia entre `create` explícito y continuidad previa de `modify`, asegurando que una nueva reserva con payload suficiente no sea degradada a modificación de una reserva existente.
