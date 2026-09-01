// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: 63045d886fa3410e60bfa428b9b92feb69d768d0
messageHandler_lines: 13029
working_tree_status: clean_after_technical_commit
analysis_scope: commit_63045d886fa3410e60bfa428b9b92feb69d768d0
```

---

## Working tree al momento del snapshot

```text
working tree limpio; documentación pendiente al momento del cierre HDOC
```

---

## Suite local informada

```text
pnpm test:core: 187 files, 1063 tests PASS
result: pass
pnpm run ts-check
result: pass
git diff --check
result: pass
```

---

## Runtime boxes audit

```yaml
runtime_boxes_audit:
  touched:
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.modify
    - runtime.messageHandler.canonicalReservationReadPath
  reviewed:
    - runtime.messageHandler.bodyLLM.turnDecision
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot
    - runtime.messageHandler.bodyLLM.operationalCorridors.availabilityInquiry
  forbidden_touched: []
  undeclared_touched: []
  parity_tests:
    status: present
    details:
      - quote requerida, unavailable y stale sin mutacion durable
      - stale -> re-quote -> segunda confirmacion -> update
      - pnpm run ts-check
      - git diff --check
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
    commit: 63045d886fa3410e60bfa428b9b92feb69d768d0
    messageHandler_lines: 13029
    functions:
      preLLM: L4737-L4949
      bodyLLM: L5608-L12165
      posLLM: L12660-L12701
      handleIncomingMessage: L12705-L12713
```

### Resultado esperado ahora preservado

```text
- modify requiere quote vigente emitida por provider antes de persistir
- confirmación queda ligada a `quoteId` y `quoteVersion`
- `QUOTE_REQUIRED`, `QUOTE_UNAVAILABLE` y `QUOTE_STALE` no mutan la reserva
- stale exige re-quote y una segunda confirmación antes de update durable
```

---

## Advertencia de uso

Este snapshot es válido para el hito
`FIX-RUNTIME-RESERVATION-MODIFY-REPRICE-CONSISTENCY-01`.

```text
box_id = estable
code_refs = recalculables
```

---

## Refresh actual

Refresh aplicado:

```text
1. Baseline actualizada al commit `63045d886fa3410e60bfa428b9b92feb69d768d0`
2. Rangos top-level de `messageHandler.ts` recalculados
3. Auditoría de cajas incorporada con veredicto `valid`
4. code index y box index alineados al scan actual
5. refresh documental de modify quote, validación provider y continuidad
   conversacional de quote sin desplazar la autoridad económica al runtime
```

---

## Cierre diferido archivado

El hito `FIX-RUNTIME-RESERVATION-SNAPSHOT-COMPLETENESS-AFTER-MODIFY-01`
corresponde al commit `3bb821a3240fcf92aebae3424ebde4ba92699780`, antecesor de
la baseline actual `0b8543ac6bc7c64cdb52fc5a7832d2294bb5e26f`. Se conserva el
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
