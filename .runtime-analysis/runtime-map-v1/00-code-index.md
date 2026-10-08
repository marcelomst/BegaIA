// Path: .runtime-analysis/runtime-map-v1/00-code-index.md

# Runtime Map V1 — Code Index

## Propósito

Este archivo asocia el Runtime Map V1 con evidencia de código real.

No define todavía `box_id` definitivos.  
No reemplaza el `00-box-index.md`.  
No autoriza refactor.  
No modifica arquitectura.

Su objetivo es servir como puente entre:

```text
mapas human-friendly
  ↓
rangos reales de código
  ↓
box-index machine-friendly
  ↓
hitos técnicos con alcance controlado
```

---

## Regla principal

```text
box_id = estable
code_refs = recalculables
```

Este archivo registra `code_refs` actuales para el working tree analizado.

Si `messageHandler.ts` cambia, este archivo debe refrescarse antes de usar sus rangos como evidencia para un hito técnico.

Para el hito actual:

```yaml
code_refs_status: fresh
runtime_map_refresh_required: false
conceptual_change: false
evidence_refresh: true
runtime_map:
  applies: true
  conceptual_change: false
  evidence_refresh: true
  code_refs_status: fresh
  refresh_required: false
```

Por eso:

- los rangos top-level de `messageHandler.ts` se recalculan para el estado nuevo
- los rangos top-level entregados por Guardian quedan frescos
- se preservan los `box_id` y el mapa conceptual
- se registran las cajas tocadas y revisadas sin ampliar el alcance técnico

---

## Snapshot base

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: 16b88e2c9893480e1d36072f7f4eb1d2b82f66ee
messageHandler_lines: 13298
working_tree_status: clean_before_evidence_refresh
analysis_scope: commit_16b88e2c9893480e1d36072f7f4eb1d2b82f66ee
baseline_status: pilot_readiness_runtime_map_evidence_refreshed
known_manual_bug: none
```

---

## Suite histórica informada (no reejecutada en este refresh)

```text
focal Guardian: 20/20 PASS
result: pass
paridad reportada: 66/66 PASS
result: pass
core reportado: 1086/1086 PASS
result: pass
ts-check
result: pass
```

Nota:

```text
Los tests históricos en verde no implican ausencia de bugs funcionales ni se
atribuyen al refresh documental actual. Este hito no modifica runtime ni tests.
```

---

## Evidencia focal actual: create, modify y persistenceReply

```yaml
hito_id: PILOT-READINESS-RESERVATION-RESPONSE-COMPLETENESS-01
technical_commit: 16b88e2c9893480e1d36072f7f4eb1d2b82f66ee
scope_real:
  - proposal_completeness
  - lastProposal_consistency
  - post_modify_completeness
runtime_boxes_audit:
  touched:
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.modify
    - runtime.messageHandler.persistenceReply
  reviewed:
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot
  forbidden_touched: []
  undeclared_touched: []
  parity_tests:
    status: present
    details:
      - 7 focal files passed
      - 191 focal tests passed
      - response_completeness_failures: 0
  code_refs_status: fresh
  runtime_map_refresh_required: false
  verdict: valid
top_level_code_refs:
  preLLM: L4953-L5165
  bodyLLM: L5824-L12434
  posLLM: L12929-L12970
  handleIncomingMessage: L12974-L13298
evidence_source: guardian_scan
focal_refs:
  buildInvalidUpdatedReservationReply: L2278-L2282
  buildModifySuccessReply: L2284-L2331
  executeModifyReservationWithSnapshot: L2333-L2399
  runAvailabilityCheck: lib/handlers/pipeline/availability.ts:L549-L703
authority_order:
  - provider_reservation
  - runtime_projection
  - snapshot
```

## Evidencia focal histórica del refresh anterior

Los rangos internos siguientes quedan anclados al commit
`59c7f39c95eb2ccea2b1ab74b9490449148642b8`; no se presentan como rangos
recalculados por el Guardian scan actual.

```yaml
hito_id: PILOT-READINESS-RUNTIME-MAP-EVIDENCE-REFRESH-01
runtime_boxes_evidence_refreshed:
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.modify
  - runtime.messageHandler.persistenceReply
top_level_code_refs:
  preLLM: L4860-L5072
  bodyLLM: L5731-L12340
  posLLM: L12835-L12876
  handleIncomingMessage: L12880-L13204
internal_code_refs_status: historical_at_commit
risk_tags:
  - state_preservation
  - persistence
  - reservation_update_execution
  - canonical_dominance
  - stale_state
  - quote_gating
  - confirmation_gating
  - create_vs_modify_contamination
  - slot_attribution
  - provider_result_projection
  - null_preservation
  - provider_contract
  - schema_compatibility
create_code_refs:
  capture_normalization:
    - { file: lib/handlers/messageHandler.ts, label: compact_path, range: L1038-L1059 }
    - { file: lib/handlers/messageHandler.ts, label: preLLM_path, range: L4917-L4939 }
    - { file: lib/handlers/messageHandler.ts, label: toStrictSlots, range: L3271-L3280 }
    - { file: lib/handlers/messageHandler.ts, label: mergeReservationSlots, range: L3282-L3295 }
    - { file: lib/handlers/messageHandler.ts, label: create_ingress_gating, range: L11646-L11719 }
  confirmation:
    - { file: lib/handlers/messageHandler.ts, label: context_detection, range: L9878-L9901 }
    - { file: lib/handlers/messageHandler.ts, label: explicit_CONFIRMAR_guard, range: L10214-L10231 }
    - { file: lib/handlers/messageHandler.ts, label: create_confirmation_execution, range: L10519-L10555 }
  provider_call:
    - { file: lib/handlers/messageHandler.ts, label: confirmAndCreate_call, range: L10554-L10555 }
    - { file: lib/agents/reservations.ts, label: confirmAndCreate, range: L518-L543 }
    - { file: lib/tools/mcp.ts, label: createReservationTool, range: L266-L275 }
  post_create_projection:
    - { file: lib/handlers/messageHandler.ts, label: createdReservation, range: L10559-L10569 }
    - { file: lib/handlers/messageHandler.ts, label: reservationHistory_merge, range: L10570-L10581 }
    - { file: lib/handlers/messageHandler.ts, label: canonical_merge_for_reply, range: L10582-L10586 }
    - { file: lib/handlers/messageHandler.ts, label: reservationSlots_persistence, range: L10587-L10595 }
    - { file: lib/handlers/messageHandler.ts, label: lastReservation_persistence, range: L10598 }
    - { file: lib/handlers/messageHandler.ts, label: canonical_reply_projection, range: L10608-L10617 }
    - { file: lib/handlers/messageHandler.ts, label: observable_reply, range: L10619-L10638 }
modify_code_refs:
  pending_patch:
    - { file: lib/handlers/messageHandler.ts, label: buildModifyPreviewPatch, range: L1281-L1295 }
    - { file: lib/handlers/messageHandler.ts, label: applyModifyPreviewPatch, range: L1297-L1310 }
  preview:
    - { file: lib/handlers/messageHandler.ts, label: buildModifyPreviewReply, range: L1334-L1407 }
    - { file: lib/handlers/messageHandler.ts, label: persistModifyPreviewContext, range: L1482-L1525 }
    - { file: lib/handlers/messageHandler.ts, label: modify_ingress_state, range: L11390-L11567 }
  confirmation:
    - { file: lib/handlers/messageHandler.ts, label: preview_confirmation_gate, range: L10282-L10365 }
    - { file: lib/handlers/messageHandler.ts, label: execution_call, range: L10365-L10367 }
  execution_provider:
    - { file: lib/handlers/messageHandler.ts, label: persistModifyExecutionContext, range: L2254-L2270 }
    - { file: lib/handlers/messageHandler.ts, label: executeModifyReservationWithSnapshot, range: L2272-L2318 }
    - { file: lib/handlers/messageHandler.ts, label: provider_call, range: L2277-L2285 }
    - { file: lib/handlers/messageHandler.ts, label: provider_result_reception, range: L2295-L2296 }
    - { file: lib/handlers/messageHandler.ts, label: post_update_persistence, range: L2297-L2316 }
  provider_chain:
    - { file: lib/agents/reservations.ts, range: L550-L578 }
    - { file: lib/tools/mcp.ts, range: L277-L295 }
    - { file: lib/mcp/channelManagerAdapter.ts, range: L164-L185 }
persistence_reply_code_refs:
  distributed_box: true
  refs:
    - { file: lib/handlers/messageHandler.ts, label: transactional_create_persistence_and_reply, range: L10556-L10638 }
    - { file: lib/handlers/messageHandler.ts, label: transactional_modify_persistence, range: L2297-L2317 }
    - { file: lib/handlers/messageHandler.ts, label: common_output_boundary, range: L13017-L13203 }
    - { file: lib/handlers/messageHandler.ts, label: common_message_persistence, range: L13138-L13188 }
    - { file: lib/handlers/messageHandler.ts, label: channel_reply_emission, range: L13189-L13202 }
canonical_merge_evidence:
  buildReservationCanonicalState: L2464-L2514
  mergeSameReservation: L2472-L2480
  null_semantics_point:
    range: L2479
    expression: "numGuests: preferred.numGuests ?? base.numGuests"
  canonical_record_selection: L2482-L2503
  current_non_authoritative_projection:
    range: L2313
    expression: "numGuests: snapshot.numGuests"
external_dependencies:
  provider_mcp:
    taxonomy: outside_runtime_boxes
    role: physical_boundary_for_future_technical_hito
  astra:
    field: demo_cm_reservations.num_guests
    type: int
    nullable: true
    existence_status: external_dependency_not_asserted
```

---

## Evidencia de cierre diferido

`FIX-RUNTIME-RESERVATION-SNAPSHOT-COMPLETENESS-AFTER-MODIFY-01` queda cerrado
contra el commit `3bb821a3240fcf92aebae3424ebde4ba92699780`. Sus code refs se
conservan como evidencia histórica porque la baseline actual `16b88e2c9893480e1d36072f7f4eb1d2b82f66ee`
es posterior.

```yaml
historical_code_refs:
  - box_id: runtime.messageHandler.bodyLLM.operationalCorridors.reservation.modify
    file: lib/handlers/messageHandler.ts
    refs:
      - L7307
      - L10037
  - box_id: runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot
    file: lib/handlers/messageHandler.ts
    refs:
      - L7671
      - L10526
  - box_id: runtime.messageHandler.canonicalReservationReadPath
    file: lib/handlers/messageHandler.ts
    refs:
      - L2402
      - L2527
  - box_id: runtime.graph.reservationSnapshot
    file: lib/agents/nodes/reservationSnapshot.ts
    refs:
      - L43-L68
      - L198
```

---

## Fuentes de evidencia usadas

```text
.runtime-analysis/function-size-map.mjs
.runtime-analysis/messageHandler_function_size_map.md
.runtime-analysis/analyze-bodyLLM.mjs
.runtime-analysis/bodyLLM_internal_scan.md
.runtime-analysis/runtime-map-v1/01-phase-1-evidence-summary.md
```

---

## 1. Archivo principal

```yaml
file: lib/handlers/messageHandler.ts
total_lines: 13298
role: runtime_conversacional_principal
confidence: high
```

Lectura:

```text
messageHandler.ts sigue siendo el runtime principal vigente en el working tree
del hito `PILOT-READINESS-RESERVATION-RESPONSE-COMPLETENESS-01`.
```

---

## 2. Funciones clave detectadas

| Función                              |       Rango | Líneas | Confianza | Lectura                                    |
| ------------------------------------ | ----------: | -----: | --------- | ------------------------------------------ |
| `buildReservationCanonicalState`     | L2464-L2514 |     51 | high      | Proyección canónica de estado de reserva   |
| `resolveReservationReference`        | L3143-L3251 |    109 | high      | Resolución de referencia a reserva         |
| `detectDominantTurnDomain`           | L3484-L3543 |     60 | high      | Detección de dominio dominante             |
| `getReservationDomainLockSignal`     | L3816-L3851 |     36 | high      | Señal de domain lock para reservas         |
| `shouldUseReservationLocalFallback`  | L3988-L4039 |     52 | high      | Decisión de fallback local de reservas     |
| `buildReservationLocalFallbackReply` | L4041-L4176 |    136 | high      | Construcción de fallback local de reservas |
| `assessReservationDateCoherence`     | L4178-L4191 |     14 | high      | Evaluación de coherencia temporal          |
| `tryStructuredAnalyze`               | L4670-L4797 |    128 | high      | Análisis estructurado semántico            |
| `preLLM`                             | L4953-L5165 |    213 | high      | Preparación de contexto y estado           |
| `bodyLLM`                            | L5824-L12434 |   6611 | high      | Sub-runtime dominante                      |
| `posLLM`                             | L12929-L12970 |     42 | high      | Verificación / verdict / cierre            |
| `handleIncomingMessage`              | L12974-L13298 |    325 | high      | Entrypoint público del runtime             |

---

## 3. Etapas principales del runtime

### handleIncomingMessage

```yaml
name: handleIncomingMessage
range: L12974-L13298
lines: 325
confidence: high
role: public_entrypoint
```

Lectura:

```text
Puerta pública hacia el runtime conversacional.
Aunque es pequeño, es importante como frontera de entrada.
```

---

### preLLM

```yaml
name: preLLM
range: L4953-L5165
lines: 213
confidence: high
role: context_preparation
```

Responsabilidad conceptual:

```text
preparar contexto
recuperar estado conversacional
preparar historial
construir señales previas
entregar input enriquecido a bodyLLM
```

---

### bodyLLM

```yaml
name: bodyLLM
range: L5824-L12434
lines: 6611
confidence: high
role: dominant_sub_runtime
```

Responsabilidad conceptual:

```text
decidir la ruta operacional dominante
coordinar corredores internos
leer y escribir estado conversacional
aplicar compuertas
generar respuesta candidata
activar fallback o graph/classifier/policy cuando corresponde
```

Observación:

```text
bodyLLM no debe entenderse como "una llamada al LLM".
En el estado actual funciona como sub-runtime operacional.
```

---

### posLLM

```yaml
name: posLLM
range: L12929-L12970
lines: 42
confidence: high
role: post_runtime_verification
```

Responsabilidad conceptual:

```text
verdict
supervisión
cierre final
salida hacia canal
```

---

## 4. Helpers relevantes previos a bodyLLM

Estos helpers no están dentro del rango físico de `bodyLLM`, pero influyen en su decisión operacional.

### buildReservationCanonicalState

```yaml
name: buildReservationCanonicalState
range: L2123-L2623
confidence: high
related_boxes:
  - reservation.snapshot
  - reservation.modify
  - reservation.create
```

Lectura:

```text
Construye una visión canónica del estado de reserva.
Puede ser relevante para snapshot, confirmación, modificación y respuestas post-booking.
```

---

### resolveReservationReference

```yaml
name: resolveReservationReference
range: L2624-L2963
confidence: high
related_boxes:
  - reservation.modify
  - reservation.cancel
  - reservation.snapshot
```

Lectura:

```text
Resuelve a qué reserva se refiere el huésped.
Crítico para evitar modificar o cancelar la reserva equivocada.
```

---

### detectDominantTurnDomain

```yaml
name: detectDominantTurnDomain
range: L2964-L3247
confidence: high
related_boxes:
  - bodyLLM.turnDecision
```

Lectura:

```text
Aporta señales para decidir qué dominio domina el turno.
No debe confundirse con ejecución del dominio.
```

---

### getReservationDomainLockSignal

```yaml
name: getReservationDomainLockSignal
range: L3248-L3419
confidence: high
related_boxes:
  - bodyLLM.turnDecision
  - reservation.create
  - reservation.modify
  - faqPoliciesAmenities
```

Lectura:

```text
Ayuda a conservar o bloquear foco de reserva según el estado conversacional.
```

---

### shouldUseReservationLocalFallback

```yaml
name: shouldUseReservationLocalFallback
range: L3420-L3472
confidence: high
related_boxes:
  - fallbackLocal
  - bodyLLM.turnDecision
```

Lectura:

```text
Decide si puede usarse fallback local de reservas.
Debe ser tratado como compuerta sensible.
```

---

### buildReservationLocalFallbackReply

```yaml
name: buildReservationLocalFallbackReply
range: L3473-L3609
confidence: high
related_boxes:
  - fallbackLocal
  - reservation.create
  - reservation.snapshot
```

Lectura:

```text
Construye respuestas de fallback local.
Riesgo: puede generar una respuesta plausible desde la ruta equivocada.
```

---

### assessReservationDateCoherence

```yaml
name: assessReservationDateCoherence
range: L3610-L4089
confidence: high
related_boxes:
  - temporalRepair
  - reservation.create
  - reservation.modify
  - availabilityInquiry
```

Lectura:

```text
Evalúa coherencia temporal.
Es pequeño pero conceptualmente importante para bugs de fechas.
```

---

### tryStructuredAnalyze

```yaml
name: tryStructuredAnalyze
range: L4090-L4278
confidence: high
related_boxes:
  - bodyLLM.turnDecision
  - graphClassifierPolicy
  - reservation.create
  - availabilityInquiry
```

Lectura:

```text
Aporta lectura estructurada del mensaje.
Debe ser arbitrado por estado, foco y precedencia.
```

---

## 5. Buckets internos de bodyLLM

Rango completo:

```yaml
bodyLLM_range: L5824-L12434
bodyLLM_lines: 6611
bucket_size: 250
confidence: high_for_generated_scan
```

Los buckets siguientes fueron regenerados contra el commit actual. Son evidencia
física de densidad, no fronteras conceptuales ni autorización de refactor.

Tabla de buckets:

| Rango       | Top markers                                                                          | Returns | Awaits | Decisions | Temporal/check markers |
| ----------- | ------------------------------------------------------------------------------------ | ------: | -----: | --------: | ---------------------: |
| L5731-L5980 | date/temporal, structured analyze, create, graph/classifier/policy                   |       7 |      3 |        13 |                     26 |
| L5981-L6230 | date/temporal, create, reservationSlots, modify, availability                        |      10 |      9 |        16 |                     24 |
| L6231-L6480 | date/temporal, create, reservationSlots, state/result, modify                        |       3 |      6 |        17 |                     64 |
| L6481-L6730 | date/temporal, create, reservationSlots, state/result, modify                        |      10 |     10 |        18 |                     18 |
| L6731-L6980 | modify, date/temporal, create, reservationSlots, state/result                        |       8 |     10 |        11 |                     10 |
| L6981-L7230 | modify, reservationSlots, selected target, date/temporal, reply builders             |       8 |      7 |        15 |                     17 |
| L7231-L7480 | email/whatsapp copy, reservationSlots, date/temporal, state/result, modify           |      10 |     18 |        17 |                      8 |
| L7481-L7730 | modify, date/temporal, snapshot/verify, reservationSlots, confirm                    |      11 |     12 |        12 |                     11 |
| L7731-L7980 | date/temporal, reservationSlots, create, modify, snapshot/verify                     |       7 |      6 |        10 |                     41 |
| L7981-L8230 | modify, date/temporal, reservationSlots, selected target, reply builders             |       8 |     11 |        14 |                     22 |
| L8231-L8480 | date/temporal, modify, reservationSlots, reply builders, selected target             |       7 |      7 |         8 |                     48 |
| L8481-L8730 | modify, date/temporal, reservationSlots, reply builders, state/result                |      21 |     10 |        22 |                     33 |
| L8731-L8980 | create, availability, date/temporal, reservationSlots, reply builders                |      10 |      8 |        12 |                     24 |
| L8981-L9230 | create, date/temporal, reservationSlots, reply builders, snapshot/verify             |      11 |      8 |        12 |                     29 |
| L9231-L9480 | create, date/temporal, reservationSlots, email/whatsapp copy, state/result           |      11 |     12 |        16 |                     43 |
| L9481-L9730 | email/whatsapp copy, reservationSlots, state/result, date/temporal, snapshot/verify  |      11 |     24 |        28 |                     14 |
| L9731-L9980 | email/whatsapp copy, reservationSlots, cancel, date/temporal, state/result           |      10 |     25 |        19 |                     14 |
| L9981-L10230 | cancel, date/temporal, confirm, create, selected target                            |      13 |     11 |        11 |                     11 |
| L10231-L10480 | reservationSlots, modify, date/temporal, snapshot/verify, state/result             |      21 |     12 |        24 |                     13 |
| L10481-L10730 | snapshot/verify, reservationSlots, date/temporal, reply builders, create           |      11 |     12 |        15 |                     23 |
| L10731-L10980 | date/temporal, reservationSlots, reply builders, snapshot/verify, canonical state  |      10 |      6 |        12 |                     22 |
| L10981-L11230 | graph/classifier/policy, reply builders, reservationSlots, state/result, create    |       6 |      7 |        11 |                      8 |
| L11231-L11480 | date/temporal, modify, reservationSlots, fallback, state/result                    |       1 |      8 |        14 |                     14 |
| L11481-L11730 | date/temporal, modify, create, reservationSlots, reply builders                    |       4 |      5 |         9 |                     46 |
| L11731-L11980 | date/temporal, create, reservationSlots, modify, state/result                      |       7 |      4 |        28 |                     42 |
| L11981-L12230 | create, reservationSlots, date/temporal, modify, availability                      |       8 |     10 |        23 |                     21 |
| L12231-L12340 | create, reservationSlots, snapshot/verify, date/temporal, modify                    |       1 |      4 |         8 |                      6 |

---

## 6. Hotspots por marcador

### date/temporal

Buckets de alta densidad:

```text
L4314-L4563
L4564-L4813
L5814-L6063
L6064-L6313
L6564-L6813
L8564-L8813
L8814-L9063
```

Lectura:

```text
La lógica temporal está distribuida.
No vive en un único punto.
```

Riesgo:

```text
Un fix de fechas aplicado en una zona puede ser contradicho por otra zona posterior.
```

---

### create

Buckets de alta densidad:

```text
L4314-L4563
L4564-L4813
L6314-L6563
L6564-L6813
L7564-L7813
L9064-L9313
```

Lectura:

```text
reservation.create aparece en varias zonas, no como un bloque único.
```

Riesgo:

```text
Create puede ser capturado por fast paths, continuidad de focus, fallback o confirmación.
```

---

### modify

Buckets de alta densidad:

```text
L5064-L5313
L5564-L5813
L5814-L6063
L6064-L6313
L8564-L8813
```

Lectura:

```text
modify está especialmente mezclado con fechas, target y reservationSlots.
```

Riesgo:

```text
Un ajuste pensado para create puede contaminar modify.
```

---

### cancel

Buckets principales:

```text
L7064-L7313
L7314-L7563
```

Lectura:

```text
cancel parece más concentrado que create y modify.
```

Riesgo:

```text
Aunque está más localizado, sigue dependiendo de target y confirmación.
```

---

### snapshot/verify

Buckets principales:

```text
L5314-L5563
L5564-L5813
L6064-L6313
L7814-L8063
L9314-L9367
```

Lectura:

```text
snapshot/verify tiene un núcleo visible cerca de L7814-L8063,
pero aparece mezclado con modify y temporalidad.
```

---

### email/whatsapp copy

Buckets principales:

```text
L5064-L5313
L5314-L5563
L6814-L7063
L7064-L7313
```

Lectura:

```text
La composición de copy por canal cruza zonas de reserva, snapshot y cancel.
```

---

### graph/classifier/policy

Buckets principales:

```text
L4314-L4563
L4564-L4813
L8314-L8563
L9314-L9367
```

Lectura:

```text
La capa graph/classifier/policy aparece como fallback, escalamiento o apoyo semántico dentro de bodyLLM.
```

---

### fallback

Bucket principal:

```text
L8314-L8563
```

Lectura:

```text
Fallback local parece concentrado cerca de graph/classifier/policy.
```

---

## 7. Rangos tentativos por zona conceptual

Estos rangos son orientativos.

No son fronteras físicas definitivas.  
No significan que exista un módulo separado.  
No autorizan extracción.

| Zona conceptual                                             |       Rango | Confianza | Evidencia                                                          |
| ----------------------------------------------------------- | ----------: | --------- | ------------------------------------------------------------------ |
| Fast paths iniciales / structured analyze / create temporal | L4314-L4813 | medium    | date/temporal, create, structured analyze, availability, decisions |
| Modify corridor / selected target / reparación temporal     | L5064-L6313 | medium    | modify, selected target, reservationSlots, date/temporal           |
| Create / availability / quote / proposal                    | L6314-L6813 | medium    | create, availability, date/temporal, confirm, reply builders       |
| Copy corridor / channel-specific replies                    | L6814-L7313 | medium    | email/whatsapp copy, awaits, reservationSlots                      |
| Cancel corridor                                             | L7064-L7563 | medium    | cancel, selected target, confirm, reply builders                   |
| Snapshot / canonical reply                                  | L7814-L8063 | medium    | snapshot/verify, canonical state, reply builders, reservationSlots |
| Billing / Support / FAQ / Graph / Fallback                  | L8064-L8563 | medium    | billing, graph/classifier/policy, fallback, reply builders         |
| Late temporal repair / final create cleanup                 | L8564-L9367 | low       | date/temporal, create, modify, reservationSlots, cierre            |

---

## 8. Confianza de rangos

```yaml
confidence:
  high:
    meaning: rango detectado por firma clara de función o evidencia directa
  medium:
    meaning: rango inferido por densidad de markers y coherencia conceptual
  low:
    meaning: rango probable pero mezclado con otras responsabilidades
  needs_refresh:
    meaning: rango que debe recalcularse porque el archivo cambió
```

Regla:

```text
Los rangos high pueden usarse como referencia fuerte.
Los rangos medium deben usarse como orientación.
Los rangos low requieren inspección manual antes de diseñar un hito.
```

---

## 9. Uso esperado de este Code Index

Este archivo debe usarse para:

```text
1. ubicar zonas de lectura
2. preparar box-index machine-friendly
3. diseñar hitos con alcance más preciso
4. pedir tests de paridad
5. evitar prompts genéricos del tipo "corregir messageHandler.ts"
```

Ejemplo de uso correcto:

```text
El bug parece impactar:
- decisión de turno
- reparación temporal
- reservation.create

Code refs candidatos:
- L4314-L4813
- L6314-L6813
- L8564-L9367

Confianza:
- medium para los dos primeros
- low para la zona final
```

---

## 10. Qué NO permite este Code Index

Este archivo no permite:

```text
extraer módulos automáticamente
hacer refactors amplios
tratar rangos medium como exactos
usar líneas viejas después de cambios
ignorar tests de paridad
```

---

## 11. Reglas para mantenerlo actualizado

Actualizar este archivo cuando:

```text
messageHandler.ts cambie significativamente
bodyLLM cambie de rango
se agregue o elimine un corredor conceptual
un hito modifique zonas internas relevantes
Guardian detecte que un fix tocó cajas no previstas
```

Para refrescar evidencia:

```bash
cd /home/marcelo/begasist

node .runtime-analysis/function-size-map.mjs lib/handlers/messageHandler.ts \
  > .runtime-analysis/messageHandler_function_size_map.md

node .runtime-analysis/analyze-bodyLLM.mjs lib/handlers/messageHandler.ts <BODY_START> <BODY_END> 250 \
  > .runtime-analysis/bodyLLM_internal_scan.md
```

Luego actualizar:

```text
00-snapshot.md
01-phase-1-evidence-summary.md
00-code-index.md
00-box-index.md
```

---

## Estado

```yaml
phase: FASE_3
artifact: 00-code-index.md
status: ready_for_box_index
next_artifact: 00-box-index.md
```
