# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. DOC-ARCHITECTURE-DOC-GOVERNANCE-TAXONOMY-01

- Identificador: `DOC-ARCHITECTURE-DOC-GOVERNANCE-TAXONOMY-01`
- Nombre: `DOC-ARCHITECTURE-DOC-GOVERNANCE-TAXONOMY-01`
- Commit message: `DOC-ARCHITECTURE-DOC-GOVERNANCE-TAXONOMY-01 align doc governance, taxonomy and ADR naming`
- Hash: `823c1a70dbe1df55bd578bd1a4891fed9ee64852`
- Descripción breve: Se ordena la gobernanza documental y la taxonomía de `docs/architecture/`, normalizando naming de ADRs y reforzando la separación entre operación, ADRs, arquitectura viva y artefactos derivados.

## 2. DOC-RESERVATION-TRUTH-HIERARCHY-AND-RUNTIME-PROJECTIONS-01

- Identificador: `DOC-RESERVATION-TRUTH-HIERARCHY-AND-RUNTIME-PROJECTIONS-01`
- Nombre: `DOC-RESERVATION-TRUTH-HIERARCHY-AND-RUNTIME-PROJECTIONS-01`
- Commit message: `DOC-RESERVATION-TRUTH-HIERARCHY-AND-RUNTIME-PROJECTIONS-01 formalize reservation truth hierarchy and runtime projections`
- Hash: `1588ef5359ce13ed7745e3aadd5b90582ae443bc`
- Descripción breve: Se formaliza en arquitectura viva la jerarquía actual de verdad y proyección de reservas dentro del runtime conversacional, sin refactorizar runtime.

## 3. DOC-ARCHITECTURE-MANUAL-STRESS-TEST-SERIES-01

- Identificador: `DOC-ARCHITECTURE-MANUAL-STRESS-TEST-SERIES-01`
- Nombre: `DOC-ARCHITECTURE-MANUAL-STRESS-TEST-SERIES-01`
- Commit message: `DOC-ARCHITECTURE-MANUAL-STRESS-TEST-SERIES-01 version manual stress test series`
- Hash: `2a4419f5f835ce5588dd41ab7c4b709ff9aef609`
- Descripción breve: Se versiona una serie mínima de tests manuales de estrés para validar replace, ambigüedad, arrastre de target, small talk y consistencia post-cancelación en el dominio `reservation`.

## 4. FIX-REFERENCE-AMBIGUOUS-ANAPHORA-GATING-01

- Identificador: `FIX-REFERENCE-AMBIGUOUS-ANAPHORA-GATING-01`
- Nombre: `FIX-REFERENCE-AMBIGUOUS-ANAPHORA-GATING-01`
- Commit message: `FIX-REFERENCE-AMBIGUOUS-ANAPHORA-GATING-01 block ambiguous 'esa' resolution without prior valid selection`
- Hash: `c0797154bdca9c1d5f596b1114cdd7bd45b69a8e`
- Descripción breve: Se corrige la resolución indebida de anáforas ambiguas como `esa` cuando no existe selección previa válida y hay múltiples reservas candidatas.

## 5. FIX-SNAPSHOT-TARGET-DATA-CONSISTENCY-01

- Identificador: `FIX-SNAPSHOT-TARGET-DATA-CONSISTENCY-01`
- Nombre: `FIX-SNAPSHOT-TARGET-DATA-CONSISTENCY-01`
- Commit message: `FIX-SNAPSHOT-TARGET-DATA-CONSISTENCY-01 sync reservationSlots after cancel to keep snapshot target data consistent`
- Hash: `3f8ec03987bc073f36a9f7a067d3c719948dc638`
- Descripción breve: Se corrige consistencia de snapshot posterior a cancelación, evitando mezcla de datos entre reservas cuando el snapshot se arma después de confirmar una cancelación.

## 6. FIX-MODIFY-CAPACITY-CONTRACT-TEST-ALIGNMENT-01

- Identificador: `FIX-MODIFY-CAPACITY-CONTRACT-TEST-ALIGNMENT-01`
- Nombre: `FIX-MODIFY-CAPACITY-CONTRACT-TEST-ALIGNMENT-01`
- Commit message: `FIX-MODIFY-CAPACITY-CONTRACT-TEST-ALIGNMENT-01 align tests with capacity guard before modify execution`
- Hash: `5b1ae5b7804c6ce551cc9f11f89e433084448fe3`
- Descripción breve: Se alinean tests con el contrato vigente de `modify` respecto a validación preventiva de capacidad antes de ejecutar cambios.

## 7. FIX-SNAPSHOT-FOLLOWUP-GATING-ACTION-EXCLUSION-01

- Identificador: `FIX-SNAPSHOT-FOLLOWUP-GATING-ACTION-EXCLUSION-01`
- Nombre: `FIX-SNAPSHOT-FOLLOWUP-GATING-ACTION-EXCLUSION-01`
- Commit message: `FIX-SNAPSHOT-FOLLOWUP-GATING-ACTION-EXCLUSION-01 exclude transactional intents from snapshot follow-up gating`
- Hash: `fce5683d6d4e633a47c5563672127c2dd80d3452`
- Descripción breve: Se corrige el gating de `snapshotFollowup` para evitar que follow-ups de vista secuestren inputs con intención transaccional, restaurando la separación correcta entre snapshot y acción.

## 8. TEST-SNAPSHOT-FOLLOWUP-PRECEDENCE-GUARD-01

- Identificador: `TEST-SNAPSHOT-FOLLOWUP-PRECEDENCE-GUARD-01`
- Nombre: `TEST-SNAPSHOT-FOLLOWUP-PRECEDENCE-GUARD-01`
- Commit message: `TEST-SNAPSHOT-FOLLOWUP-PRECEDENCE-GUARD-01 add guard suite for snapshot follow-up precedence`
- Hash: `444022c825aee0ca3e8799d5785ead19fec88c8d`
- Descripción breve: Se agrega una suite de guardrails para congelar por tests la precedencia de `snapshot follow-up` cuando existe contexto activo de reserva, evitando degradación a guidance de `modify` o routing genérico.

## 9. DOC-ARCHITECTURE-ROADMAP-ALIGNMENT-01

- Identificador: `DOC-ARCHITECTURE-ROADMAP-ALIGNMENT-01`
- Nombre: `DOC-ARCHITECTURE-ROADMAP-ALIGNMENT-01`
- Commit message: `DOC-ARCHITECTURE-ROADMAP-ALIGNMENT-01 align roadmap with closed runtime capabilities and residual debt`
- Hash: `68e98748406e9a77f35e39c60470f033dca11099`
- Descripción breve: Se alinea `docs/architecture/roadmap.md` con el estado real del sistema, eliminando pendientes fantasma y corrigiendo una desalineación que ya inducía decisiones equivocadas.

## 10. FIX-PIPELINE-MODIFY-SNAPSHOT-FOLLOWUP-ROUTING-01

- Identificador: `FIX-PIPELINE-MODIFY-SNAPSHOT-FOLLOWUP-ROUTING-01`
- Nombre: `FIX-PIPELINE-MODIFY-SNAPSHOT-FOLLOWUP-ROUTING-01`
- Commit message: `FIX-PIPELINE-MODIFY-SNAPSHOT-FOLLOWUP-ROUTING-01 prioritize active target snapshot over generic modify guidance`
- Hash: `54a140cfa62787ceea385c72a6154c606d52806c`
- Descripción breve: Se corrige el routing de follow-up post-modify para que pedidos como `mostrame como quedó` prioricen snapshot del target activo en lugar de reabrir guidance genérica de modificación.
