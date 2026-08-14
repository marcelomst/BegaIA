// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: 98180396375f229d096c55753ba08eb9bff9d128
messageHandler_lines: 12692
working_tree_status: clean_after_technical_commit
analysis_scope: commit_98180396375f229d096c55753ba08eb9bff9d128
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
    - draft/proposal holder correction intent
    - draft holder capture
    - reservationSlots.guestName transactional holder update
    - confirmed reservation holder unsupported guard
  reviewed:
    - canonical guest identity isolation
    - confirmed modify dates continuity
    - confirmed modify roomType continuity
    - confirmed modify guests continuity
    - explicit reservation targeting
    - MCP update contract
    - Channel Manager untouched
  forbidden_touched: []
  undeclared_touched: []
  parity_tests:
    status: present
    details:
      - pnpm vitest run test/unit/messageHandler.guest_name_capture.spec.ts test/unit/messageHandler.reference_resolution.spec.ts test/unit/messageHandler.create_execution_integrity.spec.ts test/unit/handleChannelMessage.email_actor_persistence.spec.ts
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
    commit: 98180396375f229d096c55753ba08eb9bff9d128
    messageHandler_lines: 12692
    functions:
      preLLM: L4545-L5414
      bodyLLM: L5415-L12322
      posLLM: L12323-L12367
      handleIncomingMessage: L12368-L12692
```

### Resultado esperado ahora preservado

```text
- la corrección segura de titular opera solo en contexto draft/proposal
- la identidad canónica del interlocutor permanece aislada del holder transaccional
- `reservationSlots.guestName` se actualiza como holder transaccional sin persistir metalingüística como identidad
- el cambio de titular sobre reserva confirmada queda bloqueado explícitamente en este corte
- continuidad legítima de modify por fechas, habitación y huéspedes queda preservada
```

---

## Advertencia de uso

Este snapshot es válido para el hito
`FIX-RUNTIME-DRAFT-HOLDER-CORRECTION-GUARD-01`.

```text
box_id = estable
code_refs = recalculables
```

---

## Refresh actual

Refresh aplicado:

```text
1. Baseline actualizada al commit `98180396375f229d096c55753ba08eb9bff9d128`
2. Rangos top-level de `messageHandler.ts` recalculados
3. Auditoría de cajas incorporada con veredicto `valid`
4. code index y box index alineados al scan actual
5. sin cambio conceptual de cajas; solo refresh documental del corredor de holder correction y guard post-confirm
```
