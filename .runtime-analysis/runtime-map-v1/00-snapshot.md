// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: cbf72a9f7cbc701faaea424ad474a08a49b8e7d1
messageHandler_lines: 13628
working_tree_status: clean_at_documentation_preparation_start
analysis_scope: focal_refresh_fix_reservation_proposal_fresh_state_cas_01_at_cbf72a9f7cbc701faaea424ad474a08a49b8e7d1
```

---

## Working tree al momento del snapshot

```text
El refresh focal de `FIX-RESERVATION-PROPOSAL-FRESH-STATE-CAS-01` parte de `HEAD = origin/main` y working tree
limpio, verificados read-only al inicio de la preparacion documental.
```

---

## Snapshot anterior preservado

```yaml
commit_base: 7cb9178bc03277a0e54cb8b8bb350627cf793220
messageHandler_lines: 13577
analysis_scope: focal_refresh_pers_02_at_7cb9178bc03277a0e54cb8b8bb350627cf793220
provenance: historical_focal_snapshot_preserved
snapshot_ancestor_verified: true
commits_after_snapshot: 4
functions:
  preLLM: L4963-L5175
  bodyLLM: L6187-L12713
  posLLM: L13208-L13249
  handleIncomingMessage: L13253-L13577
```

---

## Validacion tecnica informada

```text
focused tests: 193/193 PASS
TypeScript: PASS mediante tsc --noEmit --incremental false
core suite reportada: 1192/1192 PASS
Guardian core environment: 1188/1192; cuatro EROFS al crear temporales, sin fallo funcional
git diff check: PASS
postcommit scope: PASS
remote ref verification: PASS
```

---

## Runtime boxes audit

```yaml
runtime_boxes_audit:
  touched:
    - runtime.messageHandler.handleIncomingMessage
    - runtime.messageHandler.bodyLLM.turnDecision
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
    - runtime.messageHandler.persistenceReply
  reviewed:
    - runtime.messageHandler.bodyLLM.operationalCorridors.availabilityInquiry
    - runtime.messageHandler.bodyLLM.operationalCorridors.graphClassifierPolicy
  forbidden_touched: []
  undeclared_touched: []
  parity_tests:
    status: present
    details:
      - Inicializacion atomica y carreras stale/newest cubiertas
      - Confirmation gating y corredores existentes conservan cobertura
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
    commit: cbf72a9f7cbc701faaea424ad474a08a49b8e7d1
    messageHandler_lines: 13628
    functions:
      preLLM: L4966-L5178
      bodyLLM: L6193-L12759
      posLLM: L13254-L13295
      handleIncomingMessage: L13299-L13628
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
hito_id: FIX-RESERVATION-PROPOSAL-FRESH-STATE-CAS-01
technical_commit: cbf72a9f7cbc701faaea424ad474a08a49b8e7d1
scope_real:
  - initialize and publish reservation.create proposals through a logical turn revision
  - guarantee newest-wins under concurrent persistence or availability completion
top_level_code_refs:
  preLLM: L4966-L5178
  bodyLLM: L6193-L12759
  posLLM: L13254-L13295
  handleIncomingMessage: L13299-L13628
internal_code_refs_status: not_recalculated_by_guardian
```

### Contrato materializado

```text
- `conv_state` permanece como fuente canonica de la propuesta.
- La revision logica vive dentro del documento canonico y no crea estado paralelo.
- La publicacion newest-wins impide que una finalizacion stale sobrescriba el turno vigente.
```

---

## Advertencia de uso

Este snapshot registra exclusivamente el refresh focal de `FIX-RESERVATION-PROPOSAL-FRESH-STATE-CAS-01`; no declara
frescura global del Runtime Map.

```text
box_id = estable
code_refs = recalculables
```

---

## Refresh actual

Refresh aplicado:

```text
1. Baseline focal actualizada al commit `cbf72a9f7cbc701faaea424ad474a08a49b8e7d1`
2. Snapshot focal previo de `PERS-01` preservado con su procedencia original
3. Rangos top-level de FIX-RESERVATION-PROPOSAL-FRESH-STATE-CAS-01 reconciliados con evidencia de Guardian
4. `box_id` y relaciones conceptuales preservados
5. Refresh documental acotado a evidencia fisica, sin cambio conceptual ni
   afirmacion de frescura global
```

---

## Cierre diferido archivado

El hito `FIX-RUNTIME-RESERVATION-SNAPSHOT-COMPLETENESS-AFTER-MODIFY-01`
corresponde al commit `3bb821a3240fcf92aebae3424ebde4ba92699780`, antecesor de
la baseline focal actual `cbf72a9f7cbc701faaea424ad474a08a49b8e7d1`. Se conserva el
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
