// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: d6656276b3bc1f4451cb5a178ec697d31311239b
messageHandler_lines: 12482
working_tree_status: clean_after_technical_commit
analysis_scope: commit_d6656276b3bc1f4451cb5a178ec697d31311239b
```

---

## Working tree al momento del snapshot

```text
working tree limpio; documentación pendiente al momento del cierre HDOC
```

---

## Suite local informada

```text
pnpm vitest run test/unit/messageHandler.reference_resolution.spec.ts
result: pass
pnpm vitest run test/unit/messageHandler.reservation_confirm_followup.spec.ts test/unit/messageHandler.modify_cancel_intent_normalization.spec.ts
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
    - create draft/proposal dominance
    - modify fast-path gating
    - confirmed target fallback resolution
  reviewed:
    - explicit ID / ordinal resolution
    - confirmed modify continuity
    - proposal confirm follow-up
    - cancel flow
    - snapshot flow
    - modify preview confirmation
    - persistencia fuera del gating
  forbidden_touched: []
  undeclared_touched: []
  parity_tests:
    status: present
    details:
      - pnpm vitest run test/unit/messageHandler.reference_resolution.spec.ts
      - pnpm vitest run test/unit/messageHandler.reservation_confirm_followup.spec.ts test/unit/messageHandler.modify_cancel_intent_normalization.spec.ts
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
    commit: d6656276b3bc1f4451cb5a178ec697d31311239b
    messageHandler_lines: 12482
    functions:
      preLLM: L4497-L5366
      bodyLLM: L5367-L12112
      posLLM: L12113-L12157
      handleIncomingMessage: L12158-L12482
```

### Resultado esperado ahora preservado

```text
- draft/proposal dominante bloquea apertura automática de modify confirmado ante pedido genérico
- no hay fallback implícito a target confirmado bajo draft dominante
- modify confirmado legítimo se preserva con evidencia canónica compartida o referencia explícita
- resolución explícita por ID u ordinal permanece válida
- proposal confirm follow-up, cancel, snapshot y modify preview confirmation quedan preservados
```

---

## Advertencia de uso

Este snapshot es válido para el hito
`FIX-RUNTIME-PROPOSAL-DOMINANCE-MODIFY-BOUNDARY-01`.

```text
box_id = estable
code_refs = recalculables
```

---

## Refresh actual

Refresh aplicado:

```text
1. Baseline actualizada al commit `d6656276b3bc1f4451cb5a178ec697d31311239b`
2. Rangos top-level de `messageHandler.ts` recalculados
3. Auditoría de cajas incorporada con veredicto `valid`
4. code index y box index alineados al scan actual
5. sin cambio conceptual de cajas; solo refresh documental y fix acotado
```
