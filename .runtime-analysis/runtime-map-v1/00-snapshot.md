// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: e87cd783a7738a31d18ff0f32cee68039146565c
messageHandler_lines: 13073
working_tree_status: clean_after_technical_commit
analysis_scope: commit_e87cd783a7738a31d18ff0f32cee68039146565c
```

---

## Working tree al momento del snapshot

```text
working tree limpio; documentación pendiente al momento del cierre HDOC
```

---

## Suite local informada

```text
pnpm test:core: 188 files, 1073 tests PASS
result: pass
focused tests: 120 tests PASS
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
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.cancel
  reviewed:
    - runtime.messageHandler.bodyLLM.turnDecision
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot
    - runtime.messageHandler.canonicalReservationReadPath
  forbidden_touched: []
  undeclared_touched: []
  parity_tests:
    status: present
    details:
      - stale ordinal cancelado bloqueado sin provider
      - ordinal alternativo activo preservado
      - pendingCancellation revalidada al confirmar
      - cancelación activa normal preservada
      - pnpm run ts-check
      - git diff --check
  code_refs_status: fresh
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
    commit: e87cd783a7738a31d18ff0f32cee68039146565c
    messageHandler_lines: 13073
    functions:
      preLLM: L4745-L5615
      bodyLLM: L5616-L12703
      posLLM: L12704-L12748
      handleIncomingMessage: L12749-L13073
    cancel_guard_refs:
      canonical_read_path: L2451-L2533
      inactive_reply: L1433-L1439
      pending_creation_guard: L9798-L9810
      pending_confirmation_guard: L9826-L9838
      resolved_target_guard: L9948-L9959
```

### Resultado esperado ahora preservado

```text
- La presentación, el código, el ordinal o el foco pueden identificar el target.
- Canonical State determina si ese target sigue siendo accionable antes de crear
  `pendingCancellation` y nuevamente antes de ejecutar la confirmación.
- Un target inactivo recibe respuesta de inactividad sin invocar el provider.
- La cancelación normal de un target activo preserva su flujo existente.
```

---

## Advertencia de uso

Este snapshot es válido para el hito
`FIX-RUNTIME-CANCEL-CANONICAL-TARGET-VALIDATION-01`.

```text
box_id = estable
code_refs = recalculables
```

---

## Refresh actual

Refresh aplicado:

```text
1. Baseline actualizada al commit `e87cd783a7738a31d18ff0f32cee68039146565c`
2. Rangos top-level de `messageHandler.ts` recalculados
3. Auditoría de cajas incorporada con veredicto `valid`
4. code index y box index alineados al scan actual
5. refresh documental de la revalidación de cancel contra Canonical State antes
   de pending y confirmación, preservando la presentación sólo como evidencia
   derivada de identificación
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
