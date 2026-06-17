// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: 7138847
messageHandler_lines: 11083
baseline_status: committed_fix_pushed_runtime_map_refresh_applied_v14
known_manual_bug: none
working_tree_status: clean
analysis_scope: commit_7138847c52ce2d9c94decc3f2beba71e7a2f371c
```

---

## Working tree al momento del snapshot

```text
clean
```

---

## Suite local informada

```text
pnpm vitest run test/unit/messageHandler.reference_resolution.spec.ts
result: 74 passed
pnpm vitest run test/unit/messageHandler.cross_domain_intent_prioritization.spec.ts
result: 11 passed
pnpm test
Test Files 161 passed (161)
Tests 814 passed (814)
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
guest_wide_ordinal_modify_reference_commit: 9f472c47a0a63336c6ca7493f43895e070376bcd
guest_conversation_binding_cross_channel_reuse_commit: 61201fb27a168dba4800cb35ac0feadb3f399192
modify_direct_slot_payload_and_multifield_sequencing_commit: 23a59cfbf67c8db0b64914e9b6d2b39a310ed857
reservation_snapshot_language_stickiness_after_modify_commit: b888f73f299137cfda97fa628a95b6ce5f86a959
repair_modify_composite_room_guests_capacity_continuity_commit: 3d7d7c200fa76ee2ad85d0aea08c22eeba239605
guest_reservation_list_interlocutor_copy_commit: 7138847c52ce2d9c94decc3f2beba71e7a2f371c
```

### Resultado esperado ahora preservado

```text
- el header del listado guest-wide debe usar `canonicalGuest` o `conversationalDisplayName`
- el empty-state guest-wide debe usar fallback conversacional sin nombre técnico
- `reservation.guestName` debe quedar reservado al holder de cada línea de reserva
- el copy del snapshot/listado no debe usar vocativos impersonales como "este huésped"
```

---

## Advertencia de uso

Este snapshot es válido para analizar el estado commiteado y pusheado del hito
`7138847`.

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
1. Snapshot base a commit real `7138847`
2. Copy conversacional refrescado para listado guest-wide e interlocutor
3. Evidence summary refrescado
4. code index refrescado
5. box index machine-friendly refrescado para `guest_reservation_list`
```
