// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: de07879f0cc1d69510c5ad87f7f744054ea5d788
messageHandler_lines: 13483
working_tree_status: unrelated_document_change_preserved
analysis_scope: focal_refresh_pers_01_at_de07879f0cc1d69510c5ad87f7f744054ea5d788
```

---

## Working tree al momento del snapshot

```text
El refresh focal de `PERS-01` preserva sin incorporar el cambio ajeno en
`docs/development/codex_agent_sessions.md`.
```

---

## Snapshot anterior preservado

```yaml
commit_base: 9a46b5f9007ccb204e6982e05c72571ffd8c44da
messageHandler_lines: 13298
analysis_scope: focal_refresh_lat_01_at_9a46b5f9007ccb204e6982e05c72571ffd8c44da
provenance: historical_focal_snapshot_preserved
snapshot_ancestor_verified: true
commits_after_snapshot: 2
functions:
  preLLM: L4954-L5166
  bodyLLM: L5825-L12434
  posLLM: L12929-L12970
  handleIncomingMessage: L12974-L13298
```

---

## Validacion tecnica informada

```text
CAS unit contract: 4/4 PASS
post-Graph dynamic characterization: 22/22 PASS
LAT-01 compatibility: 13/13 PASS
Graph create confirmation guard: 14/14 PASS
focal/regression aggregate: 94/95 PASS
fallo fuera de alcance: 1 fixture historico con check-in 2026-10-01 ya vencido
Astra real CAS gate: accepted
```

---

## Runtime boxes audit

```yaml
runtime_boxes_audit:
  touched:
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
    - runtime.messageHandler.persistenceReply
  reviewed:
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
    - runtime.messageHandler.persistenceReply
  forbidden_touched: []
  undeclared_touched: []
  parity_tests:
    status: present
    details:
      - CAS unit contract: 4/4 PASS
      - post-Graph dynamic characterization: 22/22 PASS
      - LAT-01 compatibility: 13/13 PASS
      - Graph create confirmation guard: 14/14 PASS
      - focal/regression aggregate: 94/95 PASS
      - unico fallo por fixture historico vencido, independiente de PERS-01
      - Astra real CAS gate: accepted
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
    commit: de07879f0cc1d69510c5ad87f7f744054ea5d788
    messageHandler_lines: 13483
    scanner_logical_line_count: 13484
    scanner_line_count_note: >-
      El scanner cuenta el split logico final; se documentan 13483 lineas
      fisicas terminadas por newline.
    functions:
      preLLM: L4960-L5172
      bodyLLM: L5989-L12619
      posLLM: L13114-L13155
      handleIncomingMessage: L13159-L13483
    top_level_code_refs_status: focal_fresh
  source_integrity:
    messageHandler_git_blob: a0a9115076ef9de2be3dfc1db207cc8c0a2bf27e
    messageHandler_sha256: 8bc4daae7af9e7b67d10f70531dd87a9964ee875fe9cd3f3a9c442c88075143f
    convState_git_blob: e6c902d5b3fa9ac261eef0c4f7cff0ca93671fa6
    convState_sha256: 550601eba5655f4651d1dfa704e78de19d1d7b13ac435a38a5d520c2694a162a
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
hito_id: PERS-01
technical_commit: de07879f0cc1d69510c5ad87f7f744054ea5d788
scope_real:
  - preserve rich lastProposal metadata for a proposal attributed to the current Graph invocation
focal_refs:
  attribution_contract: lib/handlers/messageHandler.ts:L5830-L5903
  canonical_reread_and_cas_dispatch: lib/handlers/messageHandler.ts:L5905-L5986
  graph_invocation_attribution: lib/handlers/messageHandler.ts:L11426-L11457
  post_graph_persistence: lib/handlers/messageHandler.ts:L12554-L12590
  observable_persistence_reply: lib/handlers/messageHandler.ts:L13329-L13477
  helper_cas: lib/db/convState.ts:L311-L343
```

### Contrato materializado

```text
- La propuesta se atribuye temporalmente a la invocacion Graph actual.
- El estado se relee desde `conv_state` y se valida contra identidad y snapshot.
- El CAS actualiza exclusivamente `lastProposal.text` si la propuesta sigue
  vigente; en mismatch o fallo conserva el estado existente.
```

---

## Advertencia de uso

Este snapshot registra exclusivamente el refresh focal de `PERS-01`; no declara
frescura global del Runtime Map.

```text
box_id = estable
code_refs = recalculables
```

---

## Refresh actual

Refresh aplicado:

```text
1. Baseline focal actualizada al commit `de07879f0cc1d69510c5ad87f7f744054ea5d788`
2. Snapshot focal previo de `LAT-01` preservado con su procedencia original
3. Rangos top-level y referencias físicas de PERS-01 reconciliados
4. `box_id` y relaciones conceptuales preservados
5. Refresh documental acotado a evidencia fisica, sin cambio conceptual ni
   afirmacion de frescura global
```

---

## Cierre diferido archivado

El hito `FIX-RUNTIME-RESERVATION-SNAPSHOT-COMPLETENESS-AFTER-MODIFY-01`
corresponde al commit `3bb821a3240fcf92aebae3424ebde4ba92699780`, antecesor de
la baseline focal actual `de07879f0cc1d69510c5ad87f7f744054ea5d788`. Se conserva el
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
