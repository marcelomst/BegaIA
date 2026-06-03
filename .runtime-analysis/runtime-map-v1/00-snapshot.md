// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: 280a214
messageHandler_lines: 10134
baseline_status: committed_fix_pushed_runtime_map_refresh_applied
known_manual_bug: none
working_tree_status: clean
analysis_scope: commit_280a214d82510a5b51bcaf6a9f19af241cbd22a9
```

---

## Working tree al momento del snapshot

```text
clean
```

---

## Suite local informada

```text
Test Files  159 passed (159)
Tests       791 passed (791)
```

---

## Bug manual resuelto en esta baseline

```text
BUG-CREATE-EXPLICIT-CHECKOUT-MISATTRIBUTED-AS-CHECKIN
resolved_in_commit: 280a214d82510a5b51bcaf6a9f19af241cbd22a9
```

### Resultado esperado ahora preservado

```text
- atribuir 25/05/2026 a checkOut por marcador explícito "check out"
- rechazarlo como checkOut inválido
- preservar numGuests = 2
- pedir nuevo checkOut
- no pedir nuevo checkIn
- no cotizar
- no confirmar
```

---

## Advertencia de uso

Este snapshot es válido para analizar el estado commiteado y pusheado del hito
`280a214`.

Guardian confirmó `runtime_map_refresh.required: true`, por lo que esta baseline
ya no usa el working tree previo como referencia operativa principal.

```text
box_id = estable
code_refs = recalculables
```

---

## Próximo paso

Refresh aplicado:

```text
1. Snapshot base a commit real
2. Rangos actuales de preLLM / bodyLLM / posLLM / handleIncomingMessage
3. Evidence summary
4. code index
5. box index machine-friendly
```
