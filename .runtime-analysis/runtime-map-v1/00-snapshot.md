// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: a06e3f92258a8aaecbbddc4040a318029401a2f6
messageHandler_lines: 13297
working_tree_status: clean_before_evidence_refresh
analysis_scope: commit_a06e3f92258a8aaecbbddc4040a318029401a2f6
```

---

## Working tree al momento del snapshot

```text
working tree limpio antes de
`BUG-RESERVATION-GUESTNAME-RAW-OVERRIDE-01`
```

---

## Validacion tecnica informada

```text
create/confirmation/extraction: 58/58 PASS
create execution integrity: 11/11 PASS
pnpm run ts-check: PASS
suite completa: 1110/1113 PASS
fallos fuera de alcance: 3 pruebas preexistentes por fechas fijas vencidas
```

---

## Runtime boxes audit

```yaml
runtime_boxes_audit:
  touched:
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
  reviewed:
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
  forbidden_touched: []
  undeclared_touched: []
  parity_tests:
    status: present
    details:
      - create execution integrity: 11/11 PASS
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
    commit: a06e3f92258a8aaecbbddc4040a318029401a2f6
    messageHandler_lines: 13297
    functions:
      preLLM: L4953-L5165
      bodyLLM: L5824-L12433
      posLLM: L12928-L12969
      handleIncomingMessage: L12973-L12981
    top_level_code_refs_status: fresh
runtime_map:
  applies: true
  conceptual_change: false
  evidence_refresh: true
  code_refs_status: fresh
  refresh_required: true
```

Los envelopes conceptuales históricos pueden ser más amplios que estas funciones
y no se reinterpretan como fronteras físicas exactas.

## Evidencia focal fresca

```yaml
hito_id: BUG-RESERVATION-GUESTNAME-RAW-OVERRIDE-01
technical_commit: a06e3f92258a8aaecbbddc4040a318029401a2f6
scope_real:
  - preserve canonical guestName from proposal through confirmed create
focal_refs:
  create_confirmation_execution: L10612-L10718
  confirmAndCreate_provider_call: L10648
  quoted_snapshot_and_persistence: L12340-L12402
  parity_test: test/unit/messageHandler.create_execution_integrity.spec.ts:L265-L296
```

### Contrato materializado

```text
- `reservationSlots.guestName` permanece canónico desde la propuesta hasta el
  create confirmado.
- `msg.content` no se reinyecta durante el postprocesado de la propuesta.
- Provider contract, confirmation gating e identidad conversacional no cambian.
```

---

## Advertencia de uso

Este snapshot es válido para el hito
`BUG-RESERVATION-GUESTNAME-RAW-OVERRIDE-01`.

```text
box_id = estable
code_refs = recalculables
```

---

## Refresh actual

Refresh aplicado:

```text
1. Baseline actualizada al commit `a06e3f92258a8aaecbbddc4040a318029401a2f6`
2. Scans y rangos físicos focales recalculados
3. Evidencia focal de create y persistencia del snapshot citado incorporada
4. `box_id` y relaciones conceptuales preservados
5. Refresh documental acotado a evidencia física, sin cambio conceptual
```

---

## Cierre diferido archivado

El hito `FIX-RUNTIME-RESERVATION-SNAPSHOT-COMPLETENESS-AFTER-MODIFY-01`
corresponde al commit `3bb821a3240fcf92aebae3424ebde4ba92699780`, antecesor de
la baseline actual `a06e3f92258a8aaecbbddc4040a318029401a2f6`. Se conserva el
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
