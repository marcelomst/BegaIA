// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: efc11b21eb1aabbe881250d6fe0556ba16b113c3
messageHandler_lines: 13204
working_tree_status: clean_after_technical_commit
analysis_scope: commit_efc11b21eb1aabbe881250d6fe0556ba16b113c3
```

---

## Working tree al momento del snapshot

```text
working tree limpio; documentación pendiente al momento del cierre HDOC
```

---

## Suite local informada

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
    - runtime.messageHandler.bodyLLM.turnDecision
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
  reviewed:
    - runtime.messageHandler.bodyLLM.operationalCorridors.availabilityInquiry
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.modify
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.cancel
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot
  forbidden_touched: []
  undeclared_touched: []
  parity_tests:
    status: present
    details:
      - focal Guardian 20/20 PASS
      - paridad reportada 66/66 PASS
      - core reportado 1086/1086 PASS
      - ts-check PASS
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
    commit: efc11b21eb1aabbe881250d6fe0556ba16b113c3
    messageHandler_lines: 13204
    functions:
      preLLM: L4860-L5730
      bodyLLM: L5731-L12834
      posLLM: L12835-L12879
      handleIncomingMessage: L12880-L13204
    internal_code_refs_status: needs_refresh
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
1. Baseline actualizada al commit `efc11b21eb1aabbe881250d6fe0556ba16b113c3`
2. Rangos top-level de `messageHandler.ts` recalculados
3. Auditoría de cajas incorporada con veredicto `valid`
4. `box_id` preservados; referencias internas no recalculadas marcadas
   `needs_refresh`
5. Refresh documental acotado a referencias físicas, sin cambio conceptual
```

---

## Cierre diferido archivado

El hito `FIX-RUNTIME-RESERVATION-SNAPSHOT-COMPLETENESS-AFTER-MODIFY-01`
corresponde al commit `3bb821a3240fcf92aebae3424ebde4ba92699780`, antecesor de
la baseline actual `efc11b21eb1aabbe881250d6fe0556ba16b113c3`. Se conserva el
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
