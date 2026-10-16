// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: 7cb9178bc03277a0e54cb8b8bb350627cf793220
messageHandler_lines: 13577
working_tree_status: clean_at_documentation_preparation_start
analysis_scope: focal_refresh_pers_02_at_7cb9178bc03277a0e54cb8b8bb350627cf793220
```

---

## Working tree al momento del snapshot

```text
El refresh focal de `PERS-02` parte de `HEAD = origin/main` y working tree
limpio, verificados read-only al inicio de la preparacion documental.
```

---

## Snapshot anterior preservado

```yaml
commit_base: de07879f0cc1d69510c5ad87f7f744054ea5d788
messageHandler_lines: 13483
analysis_scope: focal_refresh_pers_01_at_de07879f0cc1d69510c5ad87f7f744054ea5d788
provenance: historical_focal_snapshot_preserved
snapshot_ancestor_verified: true
commits_after_snapshot: 5
functions:
  preLLM: L4960-L5172
  bodyLLM: L5989-L12619
  posLLM: L13114-L13155
  handleIncomingMessage: L13159-L13483
```

---

## Validacion tecnica informada

```text
suite global: 1178/1178 PASS
TypeScript: PASS
seguridad local del validador: 15/15 PASS
compatibilidad PERS-01 y LAT-02: preservada
Astra CAS gate: 16/16 PASS
Astra cleanup: 7/7 DELETED
E2E manual web: PASS
```

---

## Runtime boxes audit

```yaml
runtime_boxes_audit:
  touched:
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
    - runtime.messageHandler.persistenceReply
  reviewed:
    - runtime.messageHandler.bodyLLM.operationalCorridors.availabilityInquiry
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.modify
    - corredor post-Graph de PERS-01
  forbidden_touched: []
  undeclared_touched: []
  parity_tests:
    status: present
    details:
      - suite global: 1178/1178 PASS
      - CAS publication/finalization and A/B race covered
      - persistence failure and supervision parity covered
      - legacy confirmation compatibility covered
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
    commit: 7cb9178bc03277a0e54cb8b8bb350627cf793220
    messageHandler_lines: 13577
    functions:
      preLLM: L4963-L5175
      bodyLLM: L6187-L12713
      posLLM: L13208-L13249
      handleIncomingMessage: L13253-L13577
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
hito_id: PERS-02
technical_commit: 7cb9178bc03277a0e54cb8b8bb350627cf793220
scope_real:
  - preserve rich proposals during deterministic reservation.create
  - publish and finalize lastProposal through full-identity CAS
  - preserve snapshot, options, currency, price and checkAvailability traceability
  - block confirmation for negative, erroneous, stale or inconsistent proposals
  - preserve continuity after lateral inquiries
top_level_code_refs:
  preLLM: L4963-L5175
  bodyLLM: L6187-L12713
  posLLM: L13208-L13249
  handleIncomingMessage: L13253-L13577
internal_code_refs_status: not_recalculated_by_guardian
```

### Contrato materializado

```text
- `conv_state` permanece como fuente canonica de la propuesta.
- La publicacion y finalizacion exigen identidad completa vigente.
- Una propuesta negativa, erronea, stale o inconsistente no habilita create.
- Las consultas laterales preservan continuidad y metadata rica.
```

---

## Advertencia de uso

Este snapshot registra exclusivamente el refresh focal de `PERS-02`; no declara
frescura global del Runtime Map.

```text
box_id = estable
code_refs = recalculables
```

---

## Refresh actual

Refresh aplicado:

```text
1. Baseline focal actualizada al commit `7cb9178bc03277a0e54cb8b8bb350627cf793220`
2. Snapshot focal previo de `PERS-01` preservado con su procedencia original
3. Rangos top-level de PERS-02 reconciliados con evidencia de Guardian
4. `box_id` y relaciones conceptuales preservados
5. Refresh documental acotado a evidencia fisica, sin cambio conceptual ni
   afirmacion de frescura global
```

---

## Cierre diferido archivado

El hito `FIX-RUNTIME-RESERVATION-SNAPSHOT-COMPLETENESS-AFTER-MODIFY-01`
corresponde al commit `3bb821a3240fcf92aebae3424ebde4ba92699780`, antecesor de
la baseline focal actual `7cb9178bc03277a0e54cb8b8bb350627cf793220`. Se conserva el
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
