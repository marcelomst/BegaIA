// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: 90497ac5d3037091b960d1f24b00db70fc1e1e63
messageHandler_lines: 12738
working_tree_status: clean_after_technical_commit
analysis_scope: commit_90497ac5d3037091b960d1f24b00db70fc1e1e63
```

---

## Working tree al momento del snapshot

```text
working tree limpio; documentación pendiente al momento del cierre HDOC
```

---

## Suite local informada

```text
pnpm vitest run test/unit/messageHandler.guest_name_capture.spec.ts test/unit/messageHandler.reference_resolution.spec.ts test/unit/messageHandler.create_execution_integrity.spec.ts test/unit/handleChannelMessage.email_actor_persistence.spec.ts
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
    - guest identity extraction
    - canonical Guest persistence
    - bodyLLM dominance gate
    - early return before transactional routing
  reviewed:
    - availability routing
    - create reservation routing
    - inquiry routing
    - modify reservation routing
    - confirm reservation routing
    - reservation follow-up routing
    - draft holder correction
    - confirmed holder-change guard
    - proposal dominance
    - canonical guestId and aliases preservation
    - reservationSlots.guestName isolation
    - lastProposal isolation
    - lastReservation.guestName isolation
    - selectedReservationTarget isolation
  forbidden_touched: []
  undeclared_touched: []
  parity_tests:
    status: present
    details:
      - messageHandler.guest_name_capture.spec.ts + messageHandler.reference_resolution.spec.ts: 133/133 PASS
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
    commit: 90497ac5d3037091b960d1f24b00db70fc1e1e63
    messageHandler_lines: 12738
    functions:
      preLLM: L4574-L5443
      bodyLLM: L5444-L12368
      posLLM: L12369-L12413
      handleIncomingMessage: L12414-L12738
```

### Resultado esperado ahora preservado

```text
- la corrección explícita de identidad del interlocutor actualiza `Guest.name` y
  `Guest.firstName` sobre el `guestId` canónico
- el early return evita availability, create, inquiry, modify, confirm y
  follow-ups transaccionales en ese turno
- aliases, identidad existente y estado transaccional permanecen preservados
- `reservationSlots.guestName`, `lastProposal`, `lastReservation.guestName` y
  `selectedReservationTarget` quedan aislados de esta corrección
```

---

## Advertencia de uso

Este snapshot es válido para el hito
`FIX-RUNTIME-GUEST-IDENTITY-CORRECTION-DOMINANCE-01`.

```text
box_id = estable
code_refs = recalculables
```

---

## Refresh actual

Refresh aplicado:

```text
1. Baseline actualizada al commit `90497ac5d3037091b960d1f24b00db70fc1e1e63`
2. Rangos top-level de `messageHandler.ts` recalculados
3. Auditoría de cajas incorporada con veredicto `valid`
4. code index y box index alineados al scan actual
5. sin cambio conceptual de cajas; solo refresh documental de la dominancia de
   corrección de identidad canónica antes del routing transaccional
```
