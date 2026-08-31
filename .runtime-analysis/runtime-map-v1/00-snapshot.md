// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: 0b8543ac6bc7c64cdb52fc5a7832d2294bb5e26f
messageHandler_lines: 12956
working_tree_status: clean_after_technical_commit
analysis_scope: commit_0b8543ac6bc7c64cdb52fc5a7832d2294bb5e26f
```

---

## Working tree al momento del snapshot

```text
working tree limpio; documentación pendiente al momento del cierre HDOC
```

---

## Suite local informada

```text
pnpm test:core: 187 files, 1056 tests PASS
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
    - runtime.messageHandler.bodyLLM
    - runtime.messageHandler.bodyLLM.operationalCorridors
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.modify
  reviewed:
    - runtime.messageHandler.preLLM
    - runtime.messageHandler.posLLM
    - runtime.messageHandler.handleIncomingMessage
  forbidden_touched: []
  undeclared_touched: []
  parity_tests:
    status: present
    details:
      - pnpm test:core: 187 files, 1056 tests PASS
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
    commit: 0b8543ac6bc7c64cdb52fc5a7832d2294bb5e26f
    messageHandler_lines: 12956
    functions:
      preLLM: L4675-L5545
      bodyLLM: L5546-L12586
      posLLM: L12587-L12631
      handleIncomingMessage: L12632-L12956
```

### Resultado esperado ahora preservado

```text
- la salida explícita de modify se resuelve antes de abrir el menú fast-path
- la rama limpia estado modify y responde neutral con `retrieval_based`
- intents modify válidos continúan por el corredor existente
- la fixture de availability/create es determinista y test-only; no usa Astra,
  red ni adapter productivo
```

---

## Advertencia de uso

Este snapshot es válido para el hito
`TECH-TEST-CORE-BASELINE-RECOVERY-01`.

```text
box_id = estable
code_refs = recalculables
```

---

## Refresh actual

Refresh aplicado:

```text
1. Baseline actualizada al commit `0b8543ac6bc7c64cdb52fc5a7832d2294bb5e26f`
2. Rangos top-level de `messageHandler.ts` recalculados
3. Auditoría de cajas incorporada con veredicto `valid`
4. code index y box index alineados al scan actual
5. sin cambio conceptual de cajas; solo refresh documental de la precedencia
   de salida explícita de modify y su fixture determinista de test
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
