// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: fb83bcf
messageHandler_lines: 10157
baseline_status: committed_fix_pushed_runtime_map_refresh_applied_v2
known_manual_bug: none
working_tree_status: clean
analysis_scope: commit_fb83bcf21794297c44a762ab71e75f8be10b40b1
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

## Bug manual resuelto y hardening posterior

```text
BUG-CREATE-EXPLICIT-CHECKOUT-MISATTRIBUTED-AS-CHECKIN
resolved_in_commit: 280a214d82510a5b51bcaf6a9f19af241cbd22a9
hardening_followup_commit: fb83bcf21794297c44a762ab71e75f8be10b40b1
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
`fb83bcf`.

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
1. Snapshot base a commit real `fb83bcf`
2. Rangos top-level recalculados de preLLM / bodyLLM / posLLM / handleIncomingMessage
3. Evidence summary refrescado
4. code index refrescado
5. box index machine-friendly refrescado con `needs_refresh` en cajas internas sin nuevos rangos finos
```
