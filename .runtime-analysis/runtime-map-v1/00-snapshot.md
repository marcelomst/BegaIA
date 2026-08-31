// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: 84ec3d229104c3e4e3bf6e0047f262fcc11b229d
messageHandler_lines: 12911
working_tree_status: clean_after_technical_commit
analysis_scope: commit_84ec3d229104c3e4e3bf6e0047f262fcc11b229d
```

---

## Working tree al momento del snapshot

```text
working tree limpio; documentación pendiente al momento del cierre HDOC
```

---

## Suite local informada

```text
reservationSnapshot.guestFallback + graph.reservation.verify_and_snapshot + messageHandler.reference_resolution: 109/109 PASS
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
    - guest-wide reservation read-path
    - canonical guestId lookup
    - current-conversation dominance
    - singular/plural snapshot references
    - ordinal and anaphoric resolution
    - modify target hydration and preview
  reviewed:
    - hotelId + guestId isolation
    - holder versus conversational actor separation
    - explicit reservation-code flows
    - no state cloning
    - current-conversation modify continuity
  forbidden_touched: []
  undeclared_touched: []
  parity_tests:
    status: present
    details:
      - reservationSnapshot.guestFallback + graph.reservation.verify_and_snapshot + messageHandler.reference_resolution: 109/109 PASS
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
    commit: 84ec3d229104c3e4e3bf6e0047f262fcc11b229d
    messageHandler_lines: 12911
    functions:
      preLLM: L4658-L5528
      bodyLLM: L5529-L12541
      posLLM: L12542-L12586
      handleIncomingMessage: L12587-L12911
  additional_runtime_node:
    file: lib/agents/nodes/reservationSnapshot.ts
    handler: L88
```

### Resultado esperado ahora preservado

```text
- el snapshot puede leer reservas por `hotelId + guestId` canónico entre
  conversaciones y canales
- una reserva confirmada de la conversación actual mantiene dominancia
- referencias singular, plural, ordinal y anafórica persisten de forma mínima
- el target seleccionado se hidrata para preview y modify gobernado
- holder y actor conversacional se mantienen separados, sin clonar estado
```

---

## Advertencia de uso

Este snapshot es válido para el hito
`FIX-RUNTIME-RESERVATION-SNAPSHOT-GUEST-CONTINUITY-01`.

```text
box_id = estable
code_refs = recalculables
```

---

## Refresh actual

Refresh aplicado:

```text
1. Baseline actualizada al commit `84ec3d229104c3e4e3bf6e0047f262fcc11b229d`
2. Rangos top-level de `messageHandler.ts` recalculados
3. Auditoría de cajas incorporada con veredicto `valid`
4. code index y box index alineados al scan actual
5. sin cambio conceptual de cajas; solo refresh documental del read-path
   guest-wide, continuidad referencial y nodo de snapshot
```
