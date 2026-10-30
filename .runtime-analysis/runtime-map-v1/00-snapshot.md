// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: 3281c9b7c2ff1791c02ce2dd7759e399123e05c8
repository_baseline_head: 3281c9b7c2ff1791c02ce2dd7759e399123e05c8
source_code_commit: 3281c9b7c2ff1791c02ce2dd7759e399123e05c8
messageHandler_lines: 14367
working_tree_status: expected_untracked_residual_present
analysis_scope: focal_refresh_fix_guestwide_modify_authority_resolution_01_at_3281c9b7c2ff1791c02ce2dd7759e399123e05c8
```

---

## Working tree al momento del snapshot

```text
El refresh focal de `FIX-GUESTWIDE-MODIFY-AUTHORITY-RESOLUTION-01` parte de
`HEAD = origin/main = 3281c9b7c2ff1791c02ce2dd7759e399123e05c8`, con indice
limpio y el residual ajeno esperado `?? scripts/semantic-normalization-spike/`.
```

---

## Refresh focal actual

```yaml
hito_id: FIX-GUESTWIDE-MODIFY-AUTHORITY-RESOLUTION-01
technical_commit: 3281c9b7c2ff1791c02ce2dd7759e399123e05c8
technical_parent: b02c0db78a198fb616ff11ac4f0558f1eb8e79ba
technical_subject: "fix(reservations): restore guestwide modify authority resolution"
technical_push: confirmed
messageHandler_lines: 14367
messageHandler_blob: 4b121f9ae6e4f8ad72c48ad04fff51b8a919921d
functions:
  preLLM: L5417-L5629
  bodyLLM: L6644-L13498
  posLLM: L13993-L14034
  handleIncomingMessage: L14038-L14367
focal_refs:
  buildModifyUnverifiedTargetReply: L1522
  buildModifyActionabilityFailureReply: L1530
  persistModifyPreviewContext: L1623-L1681
  executeModifyReservationWithSnapshot: L2483-L2558
  buildReservationCanonicalState: L2713-L2818
  resolveLocalActionableModifyTarget: L2845-L2932
  resolveGuestWideMaterialModifyTarget: L2934-L3009
  resolveActionableModifyTarget: L3011-L3024
  readConversationsByGuestId: L3327-L3339
  resolveCanonicalGuestScope: L3341-L3361
  resolveReservationListSource: L3363-L3410
conceptual_change: false
global_freshness_claim_allowed: false
```

```yaml
runtime_boxes_audit:
  touched:
    - runtime.messageHandler.canonicalReservationReadPath
    - runtime.messageHandler.bodyLLM.turnDecision
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.modify
    - runtime.messageHandler.persistenceReply
  reviewed:
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot
  forbidden_touched: []
  undeclared_touched: []
  parity_tests:
    status: present
    details:
      - autoridad guest-wide por ID y ordinal
      - cancelacion e invalidacion temporal
      - fallo de lectura seguro
      - aislamiento de identidad
      - boundaries locales preservados
  code_refs_status: needs_refresh
  runtime_map_refresh_required: true
  verdict: valid
```

Los rangos top-level, el blob y las referencias focales guest-wide quedan
refrescados con la evidencia entregada por Guardian. Los rangos internos no
entregados permanecen `needs_refresh`; no se inventan rangos ni se altera la
taxonomia conceptual.

---

## Snapshot anterior preservado

```yaml
commit_base: 1056624f1b0ee900a1d587ee5a061d0fc56adcef
messageHandler_lines: 13989
analysis_scope: focal_refresh_fix_modify_numguests_compound_extraction_01_at_1056624f1b0ee900a1d587ee5a061d0fc56adcef
provenance: historical_focal_snapshot_preserved
snapshot_ancestor_verified: true
functions:
  preLLM: L5100-L5312
  bodyLLM: L6327-L13120
  posLLM: L13615-L13656
  handleIncomingMessage: L13660-L13989
```

---

## Validación técnica histórica informada

```text
related tests: PASS
TypeScript: PASS
core suite: 1214/1214 PASS
git diff check: PASS
postcommit scope: PASS
remote ref verification: PASS
```

---

## Runtime boxes audit histórico

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
```

---

## Refresh focal anterior preservado

```yaml
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
    generated_scan_note: function-size-map counts the trailing newline as an extra split entry
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

Los envelopes conceptuales históricos pueden ser más amplios que estas funciones
y no se reinterpretan como fronteras físicas exactas.

## Evidencia focal anterior preservada

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
  - preserve both early and late modify confirmation arbitration references
  - refresh modify execution and focal persistence/reply references
top_level_code_refs:
  preLLM: L5021-L5233
  bodyLLM: L6248-L12975
  posLLM: L13470-L13511
  handleIncomingMessage: L13515-L13844
internal_code_refs:
  preview_composition: L1294-L1420
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
  - non-focal code refs were not recalculated
  - non-focal persistenceReply ranges remain needs_refresh
  - availabilityInquiry refs marked needs_refresh remain unchanged
  - fallbackLocal ref marked needs_refresh remains unchanged
```

### Contrato materializado

```text
- La cancelacion explicita domina sobre el preview de modificacion pendiente.
- Las confirmaciones de modificar y cancelar permanecen mutuamente excluyentes.
- El target por `reservationId` y los slots originales provienen de Canonical State.
```

---

## Advertencia de uso

Este snapshot registra exclusivamente el refresh focal de `REF-RUNTIME-MAP-MODIFY-PREVIEW-01`; no declara
frescura global del Runtime Map.

```text
box_id = estable
code_refs = recalculables
```

---

## Refresh actual

Refresh aplicado:

```text
1. Baseline focal confirmada en `0da07bc606a962a0ce39c9e924e158435a520e83`
2. Scans base regenerados contra el código vigente
3. Rangos focales de modify preview, persistencia, confirmación temprana y
   tardía, y ejecución reconciliados con el archivo real
4. `box_id`, responsabilidades, relaciones y taxonomía preservados
5. Referencias no focales preservadas sin afirmar frescura global
```

---

## Cierre diferido archivado

El hito `FIX-RUNTIME-RESERVATION-SNAPSHOT-COMPLETENESS-AFTER-MODIFY-01`
corresponde al commit `3bb821a3240fcf92aebae3424ebde4ba92699780`, antecesor de
la baseline focal actual `0da07bc606a962a0ce39c9e924e158435a520e83`. Se conserva el
snapshot vigente y se registra la evidencia histórica del hito diferido.

```yaml
technical_commit: 3bb821a3240fcf92aebae3424ebde4ba92699780
messageHandler_lines: 12932
functions:
  preLLM: L4675-L5545
  bodyLLM: L5546-L12562
  posLLM: L12563-L12607
  handleIncomingMessage: L12608-L12932
modified_boxes:
  - runtime.messageHandler.bodyLLM
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.modify
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot
  - runtime.messageHandler.canonicalReservationReadPath
  - runtime.graph.reservationSnapshot
verdict: valid
```
