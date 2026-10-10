// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: 9a46b5f9007ccb204e6982e05c72571ffd8c44da
messageHandler_lines: 13298
working_tree_status: unrelated_document_change_preserved
analysis_scope: focal_refresh_lat_01_at_9a46b5f9007ccb204e6982e05c72571ffd8c44da
```

---

## Working tree al momento del snapshot

```text
El refresh focal de `LAT-01` preserva sin incorporar el cambio ajeno en
`docs/development/codex_agent_sessions.md`.
```

---

## Validacion tecnica informada

```text
retry policy focal: 13/13 PASS
required operational parity: 76/77 PASS
fallo fuera de alcance: 1 prueba preexistente por fecha fija vencida
```

---

## Runtime boxes audit

```yaml
runtime_boxes_audit:
  touched:
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
    - runtime.messageHandler.bodyLLM.operationalCorridors.graphClassifierPolicy
  reviewed:
    - runtime.messageHandler.bodyLLM.turnDecision
    - runtime.messageHandler.bodyLLM.operationalCorridors.fallbackLocal
    - runtime.messageHandler.bodyLLM.operationalCorridors.availabilityInquiry
  forbidden_touched: []
  undeclared_touched: []
  parity_tests:
    status: present
    details:
      - retry policy focal: 13/13 PASS
      - required operational parity: 76/77 PASS
      - unico fallo por fecha fija vencida, anterior e independiente
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
    commit: 9a46b5f9007ccb204e6982e05c72571ffd8c44da
    messageHandler_lines: 13298
    functions:
      tryStructuredAnalyze: L4764-L4891
      preLLM: L4954-L5166
      tryBodyLLMStructuredEnrichment: L5754-L5791
      tryBodyLLMStructuredFallback: L5793-L5822
      bodyLLM: L5825-L12434
      posLLM: L12929-L12970
      handleIncomingMessage: L12974-L13298
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
hito_id: LAT-01
technical_commit: 9a46b5f9007ccb204e6982e05c72571ffd8c44da
scope_real:
  - stop permanent quota or billing failures before a second LLM attempt
focal_refs:
  retry_policy_classification: lib/llm/retryPolicy.ts:L18-L98
  retry_policy_installation: lib/llm/retryPolicy.ts:L100-L116
  fill_slots_boundary: lib/agents/reservations.ts:L152-L380
  structured_boundary: lib/handlers/messageHandler.ts:L4764-L4891
  active_bodyllm_call: lib/handlers/messageHandler.ts:L11359-L11372
```

### Contrato materializado

```text
- Una politica compartida clasifica errores LLM permanentes de cuota o billing.
- `fillSlotsWithLLM` y `tryStructuredAnalyze` detienen esos errores antes del
  segundo intento.
- Los retries transitorios y los fallbacks operacionales permanecen vigentes.
```

---

## Advertencia de uso

Este snapshot registra exclusivamente el refresh focal de `LAT-01`; no declara
frescura global del Runtime Map.

```text
box_id = estable
code_refs = recalculables
```

---

## Refresh actual

Refresh aplicado:

```text
1. Baseline focal actualizada al commit `9a46b5f9007ccb204e6982e05c72571ffd8c44da`
2. Scans derivados verificados por hash y rangos físicos focales incorporados
3. Evidencia de ambas fronteras LLM y de la politica compartida registrada
4. `box_id` y relaciones conceptuales preservados
5. Refresh documental acotado a evidencia física, sin cambio conceptual
```

---

## Cierre diferido archivado

El hito `FIX-RUNTIME-RESERVATION-SNAPSHOT-COMPLETENESS-AFTER-MODIFY-01`
corresponde al commit `3bb821a3240fcf92aebae3424ebde4ba92699780`, antecesor de
la baseline focal actual `9a46b5f9007ccb204e6982e05c72571ffd8c44da`. Se conserva el
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
