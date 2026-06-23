// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: bc1113a
messageHandler_lines: 11778
baseline_status: committed_fix_pushed_runtime_map_refresh_applied_v21
known_manual_bug: none
working_tree_status: clean
analysis_scope: commit_bc1113a7d298208ddec966fd2283ad7314efb63a
```

---

## Working tree al momento del snapshot

```text
clean
```

---

## Suite local informada

```text
pnpm vitest run test/unit/messageHandler.guest_name_capture.spec.ts test/unit/messageHandler.slot_ingestion.spec.ts test/integration/api_admin_guests_list.test.ts test/integration/api_admin_guest_profile.test.ts
result: pass
pnpm vitest run test/unit/graph_create_confirm_guard.spec.ts test/unit/messageHandler.domain_lock.spec.ts
result: external_failures_only
notes:
- 5 fallos por fixtures temporales vencidos
- no causados por este diff
- deuda separable: ENFORCE-DYNAMIC-DATE-HELPER-IN-RESERVATION-TESTS-02
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
reservation_copy_guest_pluralization_commit: ec42e3293f09dd52757d095f8690567f44f57bdb
repair_quote_night_pluralization_active_paths_commit: e7f37514811fbe9d3829689b460a7f664f834220
repair_modify_inquiry_guard_manual_runtime_commit: 15fe1dca93dae081519f6119acdb68ae86006a5b
improve_conversation_list_interlocutor_copy_commit: d9ccd725a9e40a1a5a79f86f001a475c5528c0f6
modify_preview_confirmation_before_execution_commit: e7add187294ba8b3d0f55b245185eecc5febad2f
create_date_correction_language_stickiness_commit: e67ba4968d2275211fe63673cf64224bcae07fc8
inline_conversational_actor_multilingual_cross_channel_commit: bc1113a7d298208ddec966fd2283ad7314efb63a
```

### Resultado esperado ahora preservado

```text
- actor conversacional inline explícito debe persistirse sobre el guest canónico efectivo
- el vocativo visible debe salir de `display_name` o `firstName`, no de `guestName`
- `guestName` transaccional a nombre de tercero no debe contaminar el actor conversacional
- el comportamiento debe sostenerse cross-channel y con guestId aliasado
```

---

## Advertencia de uso

Este snapshot es válido para analizar el estado commiteado y pusheado del hito
`bc1113a`.

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
1. Snapshot base a commit real `bc1113a`
2. Corredor `create` refrescado para actor conversacional inline multilingüe
3. Evidence summary refrescado
4. code index refrescado
5. box index machine-friendly refrescado para actor visible y separación con `guestName`
```
