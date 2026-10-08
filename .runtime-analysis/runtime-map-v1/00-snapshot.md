// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: 16b88e2c9893480e1d36072f7f4eb1d2b82f66ee
messageHandler_lines: 13298
working_tree_status: clean_before_evidence_refresh
analysis_scope: commit_16b88e2c9893480e1d36072f7f4eb1d2b82f66ee
```

---

## Working tree al momento del snapshot

```text
working tree limpio antes de
`PILOT-READINESS-RESERVATION-RESPONSE-COMPLETENESS-01`
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
      - 7 focal files passed
      - 191 focal tests passed
      - response_completeness_failures: 0
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
    commit: 16b88e2c9893480e1d36072f7f4eb1d2b82f66ee
    messageHandler_lines: 13298
    functions:
      preLLM: L4953-L5165
      bodyLLM: L5824-L12434
      posLLM: L12929-L12970
      handleIncomingMessage: L12974-L13298
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
hito_id: PILOT-READINESS-RESERVATION-RESPONSE-COMPLETENESS-01
technical_commit: 16b88e2c9893480e1d36072f7f4eb1d2b82f66ee
scope_real:
  - proposal_completeness
  - lastProposal_consistency
  - post_modify_completeness
authority_order:
  - provider_reservation
  - runtime_projection
  - snapshot
focal_refs:
  buildInvalidUpdatedReservationReply: L2278-L2282
  buildModifySuccessReply: L2284-L2331
  executeModifyReservationWithSnapshot: L2333-L2399
  runAvailabilityCheck: lib/handlers/pipeline/availability.ts:L549-L703
```

### Contrato materializado

```text
- La propuesta confirmable proyecta datos canónicos completos en ES/EN/PT sin
  `undefined`, `null` textual ni pricing inventado.
- `lastProposal.text` coincide con el `finalText` emitido y preserva sus campos.
- La respuesta post-modify se proyecta desde la Reservation actualizada del
  provider; snapshot no se convierte en autoridad.
- `numGuests: null` autoritativo no revive valores stale.
- Inquiry permanece separado de create y no emite CTA confirmable.
```

---

## Advertencia de uso

Este snapshot es válido para el hito
`PILOT-READINESS-RESERVATION-RESPONSE-COMPLETENESS-01`.

```text
box_id = estable
code_refs = recalculables
```

---

## Refresh actual

Refresh aplicado:

```text
1. Baseline actualizada al commit `16b88e2c9893480e1d36072f7f4eb1d2b82f66ee`
2. Scans y rangos físicos focales recalculados
3. Evidencia de create, modify, persistencia/reply y merge canónico incorporada
4. `box_id` y relaciones conceptuales preservados
5. Refresh documental acotado a evidencia física, sin cambio conceptual
```

---

## Cierre diferido archivado

El hito `FIX-RUNTIME-RESERVATION-SNAPSHOT-COMPLETENESS-AFTER-MODIFY-01`
corresponde al commit `3bb821a3240fcf92aebae3424ebde4ba92699780`, antecesor de
la baseline actual `16b88e2c9893480e1d36072f7f4eb1d2b82f66ee`. Se conserva el
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
