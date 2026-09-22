// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: c578a5272f21d763fbe286751934b853a24de13f
messageHandler_lines: 13176
working_tree_status: clean_after_technical_commit
analysis_scope: commit_c578a5272f21d763fbe286751934b853a24de13f
```

---

## Working tree al momento del snapshot

```text
working tree limpio; documentación pendiente al momento del cierre HDOC
```

---

## Suite local informada

```text
pnpm test:core: 188 files, 1077 tests PASS
result: pass
focused tests: 124 tests PASS
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
    - canonicalReservationReadPath
    - reservationSnapshot
    - reservationReferenceResolution
    - turnDecision
  reviewed:
    - modifyReservation
    - cancelReservation
    - canonical cancellation revalidation
  forbidden_touched: []
  undeclared_touched: []
  parity_tests:
    status: present
    details:
      - 124 tests dirigidos
      - 1077 tests core
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
    commit: c578a5272f21d763fbe286751934b853a24de13f
    messageHandler_lines: 13176
    functions:
      preLLM: L4835-L5705
      bodyLLM: L5706-L12806
      posLLM: L12807-L12851
      handleIncomingMessage: L12852-L13176
    relevant_refs:
      canonical_state: L2451-L2534
      presented_reference_order: L2507-L2520
      temporal_contract: L2597-L2874
      list_and_snapshot_paths: L7939-L8010, L10660-L10722
```

### Resultado esperado ahora preservado

```text
- La lista visible y `lastPresentedReservations` usan el mismo universo canónicamente
  elegible y el mismo orden temporal.
- Un registro no visible queda excluido de `lastPresentedReservations` y no puede
  resolverse mediante un ordinal de esa presentación.
- La temporalidad se deriva de fechas con timezone hotel/UTC; no cambia status
  material ni crea rechazo temporal universal.
- Modify y cancel de reservas históricas conservan la decisión operativa del
  provider; cancel mantiene su revalidación canónica.
```

---

## Advertencia de uso

Este snapshot es válido para el hito
`FIX-RUNTIME-RESERVATION-TEMPORAL-CONTEXT-AND-OPERABILITY-01`.

```text
box_id = estable
code_refs = recalculables
```

---

## Refresh actual

Refresh aplicado:

```text
1. Baseline actualizada al commit `c578a5272f21d763fbe286751934b853a24de13f`
2. Rangos top-level de `messageHandler.ts` recalculados
3. Auditoría de cajas incorporada con veredicto `valid`
4. code index y box index alineados al scan actual
5. refresh documental del contrato temporal de presentación y su separación del
   estado material del provider, manteniendo el contexto como referencia derivada
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
