// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: d289914a1b584de2d677ac62ff7ee890e18aadd3
messageHandler_lines: 13233
working_tree_status: clean_before_evidence_refresh
analysis_scope: commit_d289914a1b584de2d677ac62ff7ee890e18aadd3
```

---

## Working tree al momento del snapshot

```text
working tree limpio antes de
`PILOT-READINESS-MODIFY-NUMGUESTS-AUTHORITY-01`
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

---

## Runtime boxes audit

```yaml
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
      - 149 contractual/focal tests passed
      - 88 consumer compatibility tests passed
  conceptual_change: false
  evidence_refresh: true
  code_refs_status: fresh
  runtime_map_refresh_required: false
  verdict: valid
```

---

## Top-level scan actual

```yaml
runtime_map_refresh:
  required: false
  scanned_file: lib/handlers/messageHandler.ts
  current_scan:
    commit: d289914a1b584de2d677ac62ff7ee890e18aadd3
    messageHandler_lines: 13233
    functions:
      preLLM: L4888-L5100
      bodyLLM: L5759-L12369
      posLLM: L12864-L12905
      handleIncomingMessage: L12909-L13233
    top_level_code_refs_status: fresh
runtime_map:
  applies: true
  conceptual_change: false
  evidence_refresh: true
  code_refs_status: fresh
  refresh_required: false
```

Los envelopes conceptuales históricos pueden ser más amplios que estas funciones
y no se reinterpretan como fronteras físicas exactas.

## Evidencia focal fresca

```yaml
hito_id: PILOT-READINESS-MODIFY-NUMGUESTS-AUTHORITY-01
scope_real: authoritative_numGuests_end_to_end
technical_commit_chain:
  - 7dfdfa7d19b16c685b8bbbb8932ccbe256647f15
  - d289914a1b584de2d677ac62ff7ee890e18aadd3
technical_head: d289914a1b584de2d677ac62ff7ee890e18aadd3
provider_authority_chain:
  - provider_persisted_reservation
  - validated_reservation_returned_by_provider
  - runtime_canonical_projection
  - conv_state
astra:
  keyspace: hotel_data
  table: demo_cm_reservations
  column: num_guests
  type: int
  nullable: true
  default: none
  backfill: none
  materialized: true
  verified: true
```

### Contrato materializado

```text
- Reservation.numGuests admite number | null.
- Create transporta guests y devuelve la Reservation completa del provider.
- Modify explícito actualiza huéspedes; cambios de fechas o room preservan el
  valor durable.
- Filas históricas sin valor proyectan null; el null autoritativo domina estado
  stale.
- Mismatches y reservationId aislado no habilitan success.
- No se creó una fuente de verdad paralela.
```

---

## Advertencia de uso

Este snapshot es válido para el hito
`PILOT-READINESS-MODIFY-NUMGUESTS-AUTHORITY-01`.

```text
box_id = estable
code_refs = recalculables
```

---

## Refresh actual

Refresh aplicado:

```text
1. Baseline actualizada al commit `d289914a1b584de2d677ac62ff7ee890e18aadd3`
2. Scans y rangos físicos focales recalculados
3. Evidencia de create, modify, persistencia/reply y merge canónico incorporada
4. `box_id` y relaciones conceptuales preservados
5. Refresh documental acotado a evidencia física, sin cambio conceptual
```

---

## Cierre diferido archivado

El hito `FIX-RUNTIME-RESERVATION-SNAPSHOT-COMPLETENESS-AFTER-MODIFY-01`
corresponde al commit `3bb821a3240fcf92aebae3424ebde4ba92699780`, antecesor de
la baseline actual `d289914a1b584de2d677ac62ff7ee890e18aadd3`. Se conserva el
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
