// Path: .runtime-analysis/runtime-map-v1/01-phase-1-evidence-summary.md

# Runtime Map V1 — FASE 1 — Evidence Summary

## Propósito

Este documento cierra la FASE 1 del Runtime Map V1.

No define aún diagramas definitivos.  
No define todavía box_id machine-friendly.  
No autoriza refactor.  
No resuelve bugs funcionales.

Su objetivo es consolidar la evidencia actual del runtime para que los niveles posteriores del mapa puedan construirse sobre código actualizado.

---

## Snapshot base

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: 1056624f1b0ee900a1d587ee5a061d0fc56adcef
messageHandler_lines: 13989
helpers_lines: 851
working_tree_status: expected_untracked_residual_present
analysis_scope: focal_refresh_fix_modify_numguests_compound_extraction_01_at_1056624f1b0ee900a1d587ee5a061d0fc56adcef
suite_status_reported: guardian_validated
suite_reported:
  commands:
    - helpers.extractSlotsFromText.spec.ts: 47/47 PASS
    - messageHandler.reference_resolution.spec.ts: 164/164 PASS
    - regression: 193/193 files, 1263/1263 tests PASS
    - TypeScript: PASS
    - git diff --check: PASS
  manual_ah:
    - preview_for_3_para_una_triple: PASS
    - real_provider_operation: not_performed
validation_scope: documentation_and_guardian_scan_only
global_freshness_claim_allowed: false
```

## Evidencia focal actual

```yaml
hito_id: FIX-MODIFY-NUMGUESTS-COMPOUND-EXTRACTION-01
technical_commit: 1056624f1b0ee900a1d587ee5a061d0fc56adcef
technical_parent: 704928a383bdba27b66764a3cab39285660015c2
technical_subject: "fix(reservations): preserve compound guest extraction"
technical_push: confirmed
messageHandler_lines: 13989
helpers_lines: 851
messageHandler_blob: cc2b248ff9f00ee93d9c5a623905513fe3f92dbc
helpers_blob: 67ca9846011c0b8c864884dfcca8d6076e5fc258
functions:
  preLLM: L5100-L5312
  bodyLLM: L6327-L13120
  posLLM: L13615-L13656
  handleIncomingMessage: L13660-L13989
helper_refs:
  extractSlotsFromText: L91
  extractGuests: L507
runtime_map:
  applies: true
  conceptual_change: false
  evidence_refresh: true
  top_level_code_refs_status: fresh
  internal_code_refs_status: needs_refresh
  global_freshness_claim_allowed: false
```

```yaml
runtime_boxes_audit:
  touched:
    - runtime.messageHandler.preLLM
    - runtime.messageHandler.bodyLLM.turnDecision
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.modify
  reviewed:
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot
    - runtime.messageHandler.bodyLLM.operationalCorridors.graphClassifierPolicy
    - runtime.messageHandler.bodyLLM.operationalCorridors.fallbackLocal
  forbidden_touched: []
  undeclared_touched: []
  parity_tests:
    status: present
    details:
      - siete expected-failure convertidos en pruebas ordinarias aprobadas
      - traza Modify de ocho etapas
      - no-op, confirmaciones y payload parcial cubiertos
  code_refs_status: needs_refresh
  runtime_map_refresh_required: true
  verdict: valid
```

El refresh es exclusivamente fisico: preserva cajas, relaciones, taxonomia y
diagramas. Los rangos internos no entregados por Guardian no se presentan como
actuales.

Snapshot focal anterior preservado:

```yaml
commit_base: cbf72a9f7cbc701faaea424ad474a08a49b8e7d1
messageHandler_lines: 13628
analysis_scope: focal_refresh_fix_reservation_proposal_fresh_state_cas_01_at_cbf72a9f7cbc701faaea424ad474a08a49b8e7d1
provenance: historical_focal_snapshot_preserved
snapshot_ancestor_verified: true
functions:
  preLLM: L4966-L5178
  bodyLLM: L6193-L12759
  posLLM: L13254-L13295
  handleIncomingMessage: L13299-L13628
```

## Auditoría histórica preservada y refresh focal actual

```yaml
runtime_boxes_audit:
  touched:
    - runtime.messageHandler.bodyLLM.turnDecision
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.modify
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.cancel
    - runtime.messageHandler.canonicalReservationReadPath
    - runtime.messageHandler.persistenceReply
  reviewed:
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
    - runtime.messageHandler.bodyLLM.operationalCorridors.availabilityInquiry
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot
    - runtime.messageHandler.bodyLLM.operationalCorridors.graphClassifierPolicy
    - runtime.messageHandler.bodyLLM.operationalCorridors.fallbackLocal
    - runtime.messageHandler.bodyLLM.channelCopyCorridor
    - runtime.graph
  forbidden_touched: []
  undeclared_touched: []
  parity_tests:
    status: present
    details:
      - Exclusion mutua modify/cancel y confirmacion obsoleta bloqueada
      - Target explicito, referencia ambigua y conflicto fail-closed cubiertos
      - Continuidad FAQ, modify normal y restauracion de slots canonicos cubiertas
  conceptual_change: false
  evidence_refresh: true
  code_refs_status: needs_refresh
  runtime_map_refresh_required: true
  verdict: valid
runtime_map_refresh:
  required: true
  scanned_file: lib/handlers/messageHandler.ts
  current_scan:
    repository_baseline_head: 0a413160c4e44a2632f0b4ff054ebc113048fef9
    source_code_commit: 0da07bc606a962a0ce39c9e924e158435a520e83
    source_blob_matches_repository_baseline: true
    messageHandler_lines: 13844
    function_map_reported_lines: 13845
    functions:
      preLLM: L5021-L5233
      bodyLLM: L6248-L12975
      posLLM: L13470-L13511
    generated_scan_note: trailing newline adds one split entry in function-size-map output
    generated_scan_limitations: handleIncomingMessage is undercounted because its multiline signature closes a type literal before the function body
    generated_scan_raw_whitespace: canonical output contains Markdown hard-break spaces and a final blank line
    top_level_code_refs_status: focal_fresh
runtime_map:
  applies: true
  conceptual_change: false
  evidence_refresh: true
  code_refs_status: focal_fresh_global_unasserted
  refresh_required: true
  global_freshness_claim_allowed: false
```

## Evidencia focal refrescada

```yaml
hito_id: REF-RUNTIME-MAP-MODIFY-PREVIEW-01
repository_baseline_head: 0a413160c4e44a2632f0b4ff054ebc113048fef9
source_code_commit: 0da07bc606a962a0ce39c9e924e158435a520e83
source_blob_matches_repository_baseline: true
focal_refresh_complete: true
runtime_map_refresh_required: true
refresh_required: true
global_freshness_claim_allowed: false
scope_real:
  - refresh modify preview composition and proposal persistence references
  - preserve both early and late confirmation arbitration references
  - refresh modification execution and focal persistence/reply references
top_level_code_refs:
  preLLM: L5021-L5233
  bodyLLM: L6248-L12975
  posLLM: L13470-L13511
  handleIncomingMessage: L13515-L13844
focal_internal_code_refs:
  preview_patch: L1294-L1323
  preview_reply: L1347-L1420
  preview_persistence: L1533-L1581
  modify_ingress_state: L12002-L12187
  modify_execution_context: L2310-L2326
  modify_execution: L2383-L2450
  canonical_merge: L2605-L2657
  last_proposal_text_cas: lib/db/convState.ts:L550-L582
  early_confirmation_arbitration: L8009-L8272
  late_confirmation_arbitration: L10890-L10991
internal_code_refs_status: focal_fresh_global_unasserted
scan_reproducibility:
  raw_generation:
    function_size_map_sha256: 387d0c5cf6d9bf26fe6ae1a248c69429775ae89b40be82c6824ecffb2477428f
    bodyLLM_internal_scan_sha256: 9bf36b55738707fca753d77a00e4e16a411169f20901c2ae09232c694469bf57
    byte_compare_second_generation: true
  normalization:
    applied_after_raw_generation: true
    trim_trailing_horizontal_whitespace: true
    exactly_one_final_lf: true
    semantic_content_changed: false
  normalized_artifacts:
    function_size_map_sha256: 3905d281269304c5f4f9c9b8078a4e3b14a6b83f88fc55584ae10925345a7a97
    bodyLLM_internal_scan_sha256: 37bb917926791b86dae743f76fd129cb4daf1086444ea601bd75ac977de6e3a0
  raw_to_normalized_pipeline:
    deterministic: true
    function_size_map_byte_compare: true
    bodyLLM_internal_scan_byte_compare: true
  git_diff_check_exit: 0
  git_diff_check_scope: accumulated_hito_diff
remaining_stale_references:
  - non-focal ranges and historical bucket tables were not recalculated
  - non-focal persistenceReply ranges remain needs_refresh
  - availabilityInquiry refs marked needs_refresh remain unchanged
  - fallbackLocal ref marked needs_refresh remains unchanged
```

Provider/MCP permanece fuera de la taxonomía de boxes. El refresh actual se
limita a los rangos focales indicados y a la regeneración de los dos scans base.

## Cierre diferido: snapshot completo post-modify

La evidencia del commit `3bb821a3240fcf92aebae3424ebde4ba92699780` se registra
sin reemplazar el scan focal vigente de `0da07bc606a962a0ce39c9e924e158435a520e83`,
que es su descendiente en `main`.

```yaml
hito_id: FIX-RUNTIME-RESERVATION-SNAPSHOT-COMPLETENESS-AFTER-MODIFY-01
technical_commit: 3bb821a3240fcf92aebae3424ebde4ba92699780
scan:
  messageHandler_lines: 12932
  functions:
    preLLM: L4675-L5545
    bodyLLM: L5546-L12562
    posLLM: L12563-L12607
    handleIncomingMessage: L12608-L12932
audit:
  modified:
    - runtime.messageHandler.bodyLLM
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.modify
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot
    - runtime.messageHandler.canonicalReservationReadPath
    - runtime.graph.reservationSnapshot
  invariants:
    - current confirmed reservation > guest-wide fallback
    - hydration only completes missing fields for the same reservationId
    - canonical merge never combines distinct reservationIds
validation:
  - pnpm test:core: 187 files, 1056 tests PASS
  - pnpm run ts-check: PASS
  - git diff --check: PASS
```

## Funciones clave historicas y top-level actuales

Las cuatro filas top-level (`preLLM`, `bodyLLM`, `posLLM` y
`handleIncomingMessage`) permanecen verificadas para la baseline actual. Las demás filas se
preservan como evidencia del snapshot focal anterior y no declaran frescura
global.

| Función                              |       Rango | Líneas | Confianza |
| ------------------------------------ | ----------: | -----: | --------- |
| `buildReservationCanonicalState`     | L2556-L2608 |     53 | high      |
| `resolveReservationReference`        | L3237-L3345 |    109 | high      |
| `detectDominantTurnDomain`           | L3578-L3637 |     60 | high      |
| `getReservationDomainLockSignal`     | L3910-L3945 |     36 | high      |
| `shouldUseReservationLocalFallback`  | L4082-L4133 |     52 | high      |
| `buildReservationLocalFallbackReply` | L4135-L4270 |    136 | high      |
| `assessReservationDateCoherence`     | L4272-L4285 |     14 | high      |
| `tryStructuredAnalyze`               | L4764-L4891 |    128 | high      |
| `preLLM`                             | L5021-L5233 |    213 | high      |
| `bodyLLM`                            | L6248-L12975 |   6728 | high      |
| `posLLM`                             | L13470-L13511 |     42 | high      |
| `handleIncomingMessage`              | L13515-L13844 |    330 | high      |

---

## Observación principal

`bodyLLM` concentra el sub-runtime dominante del archivo `messageHandler.ts`.

```text
messageHandler.ts total: 13844 lineas
bodyLLM:                6728 lineas
```

Esto confirma que `bodyLLM` debe tratarse como un sub-runtime dominante.

No es simplemente una función grande.
Es una zona donde conviven además:

- decisión de turno
- reparación temporal
- reservation create
- modify
- cancel
- snapshot
- availability
- copy por canal
- fallback
- graph/classifier/policy
- persistencia parcial
- precedencia compartida del fastpath KB informativo
- override determinístico hacia `retrieval_based/arrivals_transport`
- selección determinística de `retrieval_based/room_info_img` para inventario visual con imágenes
- conexión al rich path existente de `retrieval_based` para `room-info-img`
- preservación de nearby legítimo sin override de transporte
- preservación explícita de billing forced path fuera de esta migración
- early returns

---

## Hotspots detectados desde buckets

### 1. Reparación temporal / fechas

Marcador dominante en muchos buckets:

```text
date/temporal
```

Buckets con alta densidad:

| Rango       | Evidencia          |
| ----------- | ------------------ |
| L4314-L4563 | date/temporal: 118 |
| L4564-L4813 | date/temporal: 101 |
| L5814-L6063 | date/temporal: 157 |
| L6064-L6313 | date/temporal: 136 |
| L6564-L6813 | date/temporal: 130 |
| L8564-L8813 | date/temporal: 164 |
| L8814-L9063 | date/temporal: 151 |

Lectura:

```text
La lógica temporal no vive en un único punto.
Está repetida o distribuida en varios corredores.
```

Riesgo:

```text
Un fix local de fechas puede afectar create, modify, availability, snapshot o fallback si no se acota por caja.
```

Risk tags:

```yaml
risk_tags:
  - temporal_repair
  - slot_attribution
  - precedence
  - regression_sensitive
```

---

### 2. Reservation create

Marcador dominante:

```text
create
```

Buckets con alta densidad:

| Rango       | Evidencia   |
| ----------- | ----------- |
| L4314-L4563 | create: 43  |
| L4564-L4813 | create: 54  |
| L6314-L6563 | create: 121 |
| L6564-L6813 | create: 149 |
| L7564-L7813 | create: 56  |
| L9064-L9313 | create: 70  |

Lectura:

```text
reservation.create aparece en varias zonas, no como un bloque único.
```

Riesgo:

```text
Create puede ser secuestrado por fast paths temporales, continuidad de focus, fallback o confirmación si no se respeta la precedencia.
```

Risk tags:

```yaml
risk_tags:
  - create_flow
  - quote_gating
  - confirmation_gating
  - slot_ingestion
  - availability
```

---

### 3. Reservation modify

Marcador dominante:

```text
modify
```

Buckets con alta densidad:

| Rango       | Evidencia   |
| ----------- | ----------- |
| L5064-L5313 | modify: 45  |
| L5564-L5813 | modify: 41  |
| L5814-L6063 | modify: 111 |
| L6064-L6313 | modify: 83  |
| L8564-L8813 | modify: 74  |

Lectura:

```text
modify está especialmente mezclado con fechas, selected target y reservationSlots.
```

Riesgo:

```text
Un ajuste de fechas pensado para create puede entrar por modify si la compuerta de dominio no es estricta.
```

Risk tags:

```yaml
risk_tags:
  - modify_flow
  - target_resolution
  - date_repair
  - selected_target
  - domain_lock
```

---

### 4. Cancel corridor

Marcador dominante:

```text
cancel
```

Buckets principales:

| Rango       | Evidencia  |
| ----------- | ---------- |
| L7064-L7313 | cancel: 42 |
| L7314-L7563 | cancel: 59 |

Lectura:

```text
Cancel parece más concentrado que create y modify.
```

Riesgo:

```text
Aunque está más localizado, puede verse afectado por reference resolution, selected target y confirmación.
```

Risk tags:

```yaml
risk_tags:
  - cancel_flow
  - confirmation_gate
  - target_resolution
  - destructive_action
```

---

### 5. Snapshot / verify

Marcador dominante:

```text
snapshot/verify
```

Buckets principales:

| Rango       | Evidencia           |
| ----------- | ------------------- |
| L5314-L5563 | snapshot/verify: 24 |
| L5564-L5813 | snapshot/verify: 32 |
| L6064-L6313 | snapshot/verify: 27 |
| L7814-L8063 | snapshot/verify: 75 |
| L9314-L9367 | snapshot/verify: 11 |

Lectura:

```text
snapshot/verify tiene un núcleo visible cerca de L7814-L8063,
pero también aparece mezclado con modify y temporalidad.
```

Riesgo:

```text
Un fix de create puede contaminar snapshot si se activa continuidad de reserva o fallback temporal antes de responder post-booking.
```

Risk tags:

```yaml
risk_tags:
  - snapshot
  - verify
  - canonical_reply
  - post_booking
  - canonical_state
```

---

### 6. Email / WhatsApp copy

Marcador dominante:

```text
email/whatsapp copy
```

Buckets con alta densidad:

| Rango       | Evidencia                |
| ----------- | ------------------------ |
| L5064-L5313 | email/whatsapp copy: 94  |
| L5314-L5563 | email/whatsapp copy: 52  |
| L6814-L7063 | email/whatsapp copy: 180 |
| L7064-L7313 | email/whatsapp copy: 153 |

Lectura:

```text
La composición de copy por canal está dentro de bodyLLM y cruza zonas de reserva, snapshot y cancel.
```

Riesgo:

```text
Un cambio funcional puede modificar UX/copy de Web, Email o WhatsApp sin intención explícita.
```

Risk tags:

```yaml
risk_tags:
  - channel_copy
  - email
  - whatsapp
  - reply_composition
  - ux_regression
```

---

### 7. Graph / classifier / policy

Marcador dominante:

```text
graph/classifier/policy
```

Buckets principales:

| Rango       | Evidencia                   |
| ----------- | --------------------------- |
| L4314-L4563 | graph/classifier/policy: 19 |
| L4564-L4813 | graph/classifier/policy: 16 |
| L8314-L8563 | graph/classifier/policy: 50 |
| L9314-L9367 | graph/classifier/policy: 8  |

Lectura:

```text
La capa graph/classifier/policy aparece como fallback o escalamiento dentro de bodyLLM,
no como runtime principal autónomo.
```

Riesgo:

```text
Si una compuerta determinista queda demasiado amplia, puede impedir que graph/classifier/policy reciba turnos que debería resolver.
```

Risk tags:

```yaml
risk_tags:
  - routing
  - classifier
  - policy
  - graph
  - fallback_precedence
```

---

### 8. Fallback local

Marcador dominante:

```text
fallback
```

Bucket principal:

| Rango       | Evidencia    |
| ----------- | ------------ |
| L8314-L8563 | fallback: 35 |

Lectura:

```text
Fallback local parece concentrado cerca de la zona graph/classifier/policy.
```

Riesgo:

```text
Fallback puede ser correcto como última salida, pero peligroso si se activa antes que un dominio gobernado.
```

Risk tags:

```yaml
risk_tags:
  - fallback
  - last_resort
  - precedence
  - domain_leak
```

---

## Rangos tentativos por caja conceptual

Los rangos top-level siguientes y los code refs focales fueron recalculados
contra la baseline actual. Los envelopes conceptuales históricos posteriores
se preservan sin tratarlos como fronteras físicas exactas.

Los `box_id` definitivos se crearán en FASE 4.

---

### Caja: messageHandler

```yaml
label: messageHandler.ts
kind: runtime_principal
code_refs:
  - file: lib/handlers/messageHandler.ts
    range: L1-L13844
    confidence: high
```

---

### Caja: preLLM

```yaml
label: preLLM
kind: pre_runtime_context
code_refs:
  - file: lib/handlers/messageHandler.ts
    range: L5021-L5233
    confidence: high
```

Responsabilidad tentativa:

```text
Preparar contexto, estado, señales y datos de entrada antes del cuerpo operacional.
```

---

### Caja: bodyLLM

```yaml
label: bodyLLM
kind: sub_runtime_dominant
code_refs:
  - file: lib/handlers/messageHandler.ts
    range: L6248-L12975
    confidence: high
```

Responsabilidad tentativa:

```text
Resolver la decisión operacional dominante del turno.
```

---

### Caja: posLLM

```yaml
label: posLLM
kind: post_runtime_verification
code_refs:
  - file: lib/handlers/messageHandler.ts
    range: L13470-L13511
    confidence: high
```

Responsabilidad tentativa:

```text
Aplicar verificación final, verdict y supervisión posterior a la decisión de bodyLLM.
```

---

### Caja: handleIncomingMessage

```yaml
label: handleIncomingMessage
kind: public_entrypoint
code_refs:
  - file: lib/handlers/messageHandler.ts
    range: L13515-L13844
    confidence: high
```

Responsabilidad tentativa:

```text
Entrada pública al runtime conversacional.
```

---

## Rangos tentativos internos de bodyLLM

Los rangos de esta sección son envelopes conceptuales históricos preservados.
No sustituyen los code refs focales frescos ni deben interpretarse como rangos
exactos de función del commit actual.

### Zona A — Fast paths iniciales / structured analyze / create temporal

```yaml
label: bodyLLM.initialFastPaths
range: L4314-L4813
confidence: medium
evidence:
  - date/temporal alto
  - create alto
  - structured analyze visible
  - availability visible
  - decisions altas
risk_tags:
  - fast_path
  - temporal_repair
  - create_flow
  - structured_analyze
  - precedence
```

Lectura:

```text
Zona sensible de entrada. Puede decidir demasiado temprano antes de que otros corredores reciban el turno.
```

---

### Zona B — Modify corridor / selected target / reparación temporal

```yaml
label: bodyLLM.modifyCorridor
range: L5064-L6313
confidence: medium
evidence:
  - modify alto
  - date/temporal alto
  - selected target visible
  - reservationSlots alto
risk_tags:
  - modify_flow
  - target_resolution
  - temporal_repair
  - selected_target
  - state_merge
```

Lectura:

```text
Zona donde modify, fechas y target están fuertemente acoplados.
```

---

### Zona C — Create / availability / quote / proposal

```yaml
label: bodyLLM.createAvailabilityQuoteCorridor
range: L6314-L6813
confidence: medium
evidence:
  - create muy alto
  - availability alto
  - date/temporal alto
  - confirm visible
  - reply builders visibles
risk_tags:
  - create_flow
  - availability
  - quote_gating
  - proposal
  - confirmation_gating
```

Lectura:

```text
Zona candidata a representar el corredor comercial principal de reservation.create.
```

---

### Zona D — Copy corridor / channel-specific replies

```yaml
label: bodyLLM.channelCopyCorridor
range: L6814-L7313
confidence: medium
evidence:
  - email/whatsapp copy muy alto
  - awaits altos
  - cancel visible
  - reservationSlots visible
risk_tags:
  - channel_copy
  - email
  - whatsapp
  - reply_composition
  - ux_regression
```

Lectura:

```text
Zona de alto riesgo UX porque mezcla copy por canal con acciones de dominio.
```

---

### Zona E — Cancel corridor

```yaml
label: bodyLLM.cancelCorridor
range: L7064-L7563
confidence: medium
evidence:
  - cancel alto
  - selected target visible
  - confirm visible
  - reply builders visibles
risk_tags:
  - cancel_flow
  - destructive_action
  - confirmation_gate
  - target_resolution
```

Lectura:

```text
Cancel está más localizado, pero se superpone parcialmente con copy y reservation slots.
```

---

### Zona F — Snapshot / canonical reply

```yaml
label: bodyLLM.snapshotCanonicalReplyCorridor
range: L7814-L8063
confidence: medium
evidence:
  - snapshot/verify alto
  - canonical state visible
  - reply builders altos
  - reservationSlots alto
risk_tags:
  - snapshot
  - verify
  - canonical_reply
  - post_booking
  - canonical_state
```

Lectura:

```text
Zona central para respuestas post-booking y uso de proyección canónica.
```

---

### Zona G — Billing / Support / FAQ / Graph / Fallback

```yaml
label: bodyLLM.lateralGraphFallbackCorridor
range: L8064-L8563
confidence: medium
evidence:
  - billing visible
  - graph/classifier/policy alto
  - fallback alto
  - reply builders visibles
risk_tags:
  - lateral_domain
  - billing
  - support
  - graph
  - fallback
  - policy
```

Lectura:

```text
Zona de resolución lateral y fallback. Riesgo de ser alcanzada tarde si create/modify capturan demasiado pronto.
```

---

### Zona H — Late temporal repair / final create cleanup

```yaml
label: bodyLLM.lateTemporalCreateCleanup
range: L8564-L9367
confidence: low
evidence:
  - date/temporal muy alto
  - modify visible
  - create visible
  - reservationSlots visible
  - graph/classifier/policy al cierre
risk_tags:
  - late_repair
  - temporal_repair
  - create_flow
  - modify_flow
  - final_gating
  - precedence
```

Lectura:

```text
Zona final altamente sensible. La confianza es baja porque mezcla temporalidad, create, modify y cierre.
```

---

## Tabla de confianza

| Confianza     | Significado                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| high          | Rango obtenido directamente por función o firma clara.                                               |
| medium        | Rango inferido por densidad de markers y coherencia conceptual.                                      |
| low           | Rango probable pero mezclado con otros corredores. Requiere inspección manual antes de usar en hito. |
| needs_refresh | Rango inválido si cambia el archivo o se modifica bodyLLM.                                           |

---

## Conclusiones de FASE 1

### Conclusión 1

`bodyLLM` debe mapearse como sub-runtime dominante.

```text
No alcanza con decir "messageHandler".
Hay que hablar de zonas internas de bodyLLM.
```

---

### Conclusión 2

Los corredores no están completamente separados en el código.

```text
Create, modify, temporal repair y reservationSlots se superponen.
```

Esto explica por qué fixes de un corredor pueden provocar regresiones en otros.

---

### Conclusión 3

La reparación temporal es el hotspot más riesgoso.

```text
date/temporal aparece fuerte al inicio, medio y final de bodyLLM.
```

Cualquier hito sobre fechas debe declarar explícitamente:

- caja impactada
- caja relacionada
- caja prohibida
- tests de paridad
- rutas no-create a proteger

---

### Conclusión 4

El mapa debe distinguir entre:

```text
dominio conceptual
corredor operacional
compuerta de decisión
reply/copy
persistencia
fallback
```

Si no se separan esas categorías, el agente técnico puede confundir “reservation” con “create”, “create” con “date repair”, o “date repair” con “modify”.

---

### Conclusión 5

Los rangos de línea deben tratarse como recalculables.

```text
box_id = estable
code_refs = recalculables
```

Esto debe quedar reflejado en FASE 4 y luego en la operativa de agentes.

---

## FASE 1 — Estado final

```yaml
phase: FASE_1
status: ready_for_phase_2
evidence_collected:
  - snapshot
  - function_ranges
  - bodyLLM_bucket_scan
  - hotspot_summary
  - tentative_corridor_ranges
  - confidence_levels
next_phase: FASE_2_HUMAN_FRIENDLY_MAPS
```

---

## Checklist FASE 1

- [x] Recalcular tamaño actual de `messageHandler.ts`.
- [x] Recalcular rangos actuales de funciones clave.
- [x] Recrear script `.runtime-analysis/function-size-map.mjs`.
- [x] Generar `.runtime-analysis/messageHandler_function_size_map.md`.
- [x] Recrear script `.runtime-analysis/analyze-bodyLLM.mjs`.
- [x] Generar `.runtime-analysis/bodyLLM_internal_scan.md`.
- [x] Obtener buckets internos actualizados de `bodyLLM`.
- [x] Extraer una síntesis de hotspots desde los buckets.
- [x] Definir rangos tentativos por caja/corredor.
- [x] Registrar nivel de confianza por rango.

```


```
