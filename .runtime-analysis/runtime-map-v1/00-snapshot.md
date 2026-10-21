// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: 0da07bc606a962a0ce39c9e924e158435a520e83
messageHandler_lines: 13844
working_tree_status: clean_at_documentation_preparation_start
analysis_scope: focal_refresh_fix_modify_cancel_precedence_01_at_0da07bc606a962a0ce39c9e924e158435a520e83
```

---

## Working tree al momento del snapshot

```text
El refresh focal de `FIX-MODIFY-CANCEL-PRECEDENCE-01` parte de `HEAD = origin/main` y working tree
limpio, verificados read-only al inicio de la preparacion documental.
```

---

## Snapshot anterior preservado

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

---

## Validacion tecnica informada

```text
related tests: PASS
TypeScript: PASS
core suite: 1214/1214 PASS
git diff check: PASS
postcommit scope: PASS
remote ref verification: PASS
```

---

## Runtime boxes audit

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

## Top-level scan actual

```yaml
runtime_map_refresh:
  required: true
  scanned_file: lib/handlers/messageHandler.ts
  current_scan:
    commit: 0da07bc606a962a0ce39c9e924e158435a520e83
    messageHandler_lines: 13844
    functions:
      preLLM: L5021-L5233
      bodyLLM: L6248-L12975
      posLLM: L13470-L13511
      handleIncomingMessage: L13515-L13844
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

## Evidencia focal fresca

```yaml
hito_id: FIX-MODIFY-CANCEL-PRECEDENCE-01
technical_commit: 0da07bc606a962a0ce39c9e924e158435a520e83
scope_real:
  - arbitrate a later cancellation over a pending modify preview
  - preserve exclusive confirmations, canonical target and original slots
top_level_code_refs:
  preLLM: L5021-L5233
  bodyLLM: L6248-L12975
  posLLM: L13470-L13511
  handleIncomingMessage: L13515-L13844
internal_code_refs_status: not_recalculated_by_guardian
```

### Contrato materializado

```text
- La cancelacion explicita domina sobre el preview de modificacion pendiente.
- Las confirmaciones de modificar y cancelar permanecen mutuamente excluyentes.
- El target por `reservationId` y los slots originales provienen de Canonical State.
```

---

## Advertencia de uso

Este snapshot registra exclusivamente el refresh focal de `FIX-MODIFY-CANCEL-PRECEDENCE-01`; no declara
frescura global del Runtime Map.

```text
box_id = estable
code_refs = recalculables
```

---

## Refresh actual

Refresh aplicado:

```text
1. Baseline focal actualizada al commit `0da07bc606a962a0ce39c9e924e158435a520e83`
2. Snapshot focal previo de `FIX-RESERVATION-PROPOSAL-FRESH-STATE-CAS-01` preservado con su procedencia original
3. Rangos top-level de FIX-MODIFY-CANCEL-PRECEDENCE-01 reconciliados con evidencia de Guardian
4. `box_id` y relaciones conceptuales preservados
5. Refresh documental acotado a evidencia fisica, sin cambio conceptual ni
   afirmacion de frescura global
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
