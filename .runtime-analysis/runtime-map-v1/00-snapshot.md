// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: 59c7f39c95eb2ccea2b1ab74b9490449148642b8
messageHandler_lines: 13204
working_tree_status: clean_before_evidence_refresh
analysis_scope: commit_59c7f39c95eb2ccea2b1ab74b9490449148642b8
```

---

## Working tree al momento del snapshot

```text
working tree limpio antes de `PILOT-READINESS-RUNTIME-MAP-EVIDENCE-REFRESH-01`
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
  evidence_refreshed:
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.modify
    - runtime.messageHandler.persistenceReply
  related_preserved:
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot
    - runtime.messageHandler.bodyLLM.operationalCorridors.availabilityInquiry
  conceptually_not_touched:
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.cancel
    - runtime.messageHandler.bodyLLM.operationalCorridors.graphClassifierPolicy
    - runtime.messageHandler.bodyLLM.operationalCorridors.fallbackLocal
    - runtime.messageHandler.bodyLLM.channelCopyCorridor
  forbidden_touched: []
  undeclared_touched: []
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
    commit: 59c7f39c95eb2ccea2b1ab74b9490449148642b8
    messageHandler_lines: 13204
    functions:
      preLLM: L4860-L5072
      bodyLLM: L5731-L12340
      posLLM: L12835-L12876
      handleIncomingMessage: L12880-L13204
    internal_code_refs_status: fresh
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
hito_id: PILOT-READINESS-RUNTIME-MAP-EVIDENCE-REFRESH-01
create:
  capture_normalization:
    - compact_path: L1038-L1059
    - preLLM_path: L4917-L4939
    - toStrictSlots: L3271-L3280
    - mergeReservationSlots: L3282-L3295
    - ingress_gating: L11646-L11719
  confirmation:
    - context_detection: L9878-L9901
    - explicit_CONFIRMAR_guard: L10214-L10231
    - execution: L10519-L10555
  post_create_projection: L10556-L10638
modify:
  pending_patch: L1281-L1310
  preview:
    - buildModifyPreviewReply: L1334-L1407
    - persistModifyPreviewContext: L1482-L1525
    - ingress_state: L11390-L11567
  confirmation_execution: L10282-L10367
  provider_result_and_persistence: L2254-L2318
persistenceReply:
  distributed: true
  refs:
    - transactional_create_persistence_and_reply: L10556-L10638
    - transactional_modify_persistence: L2297-L2317
    - common_output_boundary: L13017-L13203
    - common_message_persistence: L13138-L13188
    - channel_reply_emission: L13189-L13202
canonical_merge:
  function: L2464-L2514
  null_semantics_point: L2479
  current_non_authoritative_projection: L2313
external_dependencies:
  provider_mcp: physical_boundary_only
  astra:
    field: demo_cm_reservations.num_guests
    type: int
    nullable: true
    existence_status: external_dependency_not_asserted
```

### Resultado esperado ahora preservado

```text
- `reservation.create` rechaza fechas calendario imposibles antes de
  availability/propuesta.
- La reparación de `checkIn` preserva un `checkOut` válido en flujos multi-turno
  con historial y Chrono.
- Availability, modify, cancel y snapshot fueron revisados sin quedar tocados.
```

---

## Advertencia de uso

Este snapshot es válido para el hito
`FIX-RUNTIME-CREATE-COMPLETE-WORD-DATE-RANGE-INGRESS-01`.

```text
box_id = estable
code_refs = recalculables
```

---

## Refresh actual

Refresh aplicado:

```text
1. Baseline actualizada al commit `59c7f39c95eb2ccea2b1ab74b9490449148642b8`
2. Scans y rangos físicos focales recalculados
3. Evidencia de create, modify, persistencia/reply y merge canónico incorporada
4. `box_id` y relaciones conceptuales preservados
5. Refresh documental acotado a evidencia física, sin cambio conceptual
```

---

## Cierre diferido archivado

El hito `FIX-RUNTIME-RESERVATION-SNAPSHOT-COMPLETENESS-AFTER-MODIFY-01`
corresponde al commit `3bb821a3240fcf92aebae3424ebde4ba92699780`, antecesor de
la baseline actual `59c7f39c95eb2ccea2b1ab74b9490449148642b8`. Se conserva el
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
