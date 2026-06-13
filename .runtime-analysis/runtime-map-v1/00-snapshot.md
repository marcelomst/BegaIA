// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: d94c055
messageHandler_lines: 10387
baseline_status: committed_fix_pushed_runtime_map_refresh_applied_v8
known_manual_bug: none
working_tree_status: clean
analysis_scope: commit_d94c05545b5eae0736b7e2756dafb3b39a9aeb74
```

---

## Working tree al momento del snapshot

```text
clean
```

---

## Suite local informada

```text
pnpm vitest run test/unit/messageHandler.create_quote_gating.spec.ts
pnpm vitest run test/unit/messageHandler.multi_reservation.spec.ts
pnpm vitest run test/unit/messageHandler.create_execution_integrity.spec.ts
```

---

## Bug manual resuelto y hardening posterior

```text
BUG-CREATE-EXPLICIT-CHECKOUT-MISATTRIBUTED-AS-CHECKIN
resolved_in_commit: 280a214d82510a5b51bcaf6a9f19af241cbd22a9
hardening_followup_commit: fb83bcf21794297c44a762ab71e75f8be10b40b1
guestname_preservation_followup_commit: 026fc30002084203336a3ce8154f387187372a49
autoquote_sequencing_followup_commit: 2efa9a7e3cb989fda0faa4d63e8b9093e783dec4
safe_person_guestname_followup_commit: 0d9bd70535427cec6db7f2fa95da25e201c284a6
date_followup_precedence_commit: 8a015c5d74752a1ef3e14d31fd5ede8aef4546fc
canonical_guest_snapshot_guest_first_commit: dfaeb4dd358915a6aadb264500d94e2ba065f1e5
second_create_reset_draft_before_quote_commit: d94c05545b5eae0736b7e2756dafb3b39a9aeb74
```

### Resultado esperado ahora preservado

```text
- una segunda reserva explícita sobre contexto confirmado debe abrir draft limpio
  o cotizar la nueva reserva según el payload del turno
- no recotizar la reserva previa
- no responder con `Anoté nuevas fechas`
- no responder con `posibles diferencias`
- preservar listados consolidados Email + WhatsApp fuera del fix
```

---

## Advertencia de uso

Este snapshot es válido para analizar el estado commiteado y pusheado del hito
`d94c055`.

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
1. Snapshot base a commit real `d94c055`
2. Rangos top-level recalculados de preLLM / bodyLLM / posLLM / handleIncomingMessage
3. Evidence summary refrescado
4. code index refrescado
5. box index machine-friendly refrescado con `needs_refresh` en cajas internas sin nuevos rangos finos
```
