// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: 446ab78
messageHandler_lines: 12322
baseline_status: working_tree_room_info_img_rich_validated_v27
known_manual_bug: none
working_tree_status: dirty_expected_room_info_img_fix_plus_data_repair
analysis_scope: working_tree_on_446ab78c560203bf8e33912b68544e5e882589e7
```

---

## Working tree al momento del snapshot

```text
dirty esperado: fix runtime/test/script/Runtime Map del hito actual
```

---

## Suite local informada

```text
pnpm vitest run test/unit/messageHandler.routing_observability.spec.ts
result: pass
pnpm vitest run test/unit/retrieval.version_consistency.spec.ts test/unit/searchFromAstra.filters.test.ts test/unit/kbPrecedencePolicy.spec.ts test/unit/kb.generator.room_info_img.spec.ts test/unit/retrieval.roomInfoImgRich.spec.ts test/unit/messageHandler.routing_observability.spec.ts
result: pass
pnpm run ts-check
result: pass
git diff --check
result: pass
pnpm test
result: pass
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
create_word_dates_no_year_cross_channel_commit: 7f11b089ee7d515456ae410914798d364aa47428
create_word_date_range_syntax_variants_multilingual_commit: 4d3cd1dfea48d536986e36b2fde28ff9b6841d35
modify_ambiguity_recovery_by_reservation_id_commit: ebffb82b9920ab76a1483a358af2adc54dc1e70e
email_inline_conversational_actor_parity_commit: 58af388c0b6b4cf05fcf0b53462e7c843daa416e
```

### Resultado esperado ahora preservado

```text
- el fastpath KB informativo usa una política compartida de precedencia
- airport/aeropuerto/transfer/taxi/bus enruta a `retrieval_based/arrivals_transport`
- consultas visuales de inventario de habitaciones con imágenes enrutan a `retrieval_based/room_info_img`
- `room_info_img` usa la frontera `retrieval_based` para producir `rich.type = room-info-img`
- nearby legítimo permanece sin override de transporte
- billing forced path permanece fuera de la migración
- los corredores de reserva/create/modify/cancel/snapshot quedan preservados
```

---

## Advertencia de uso

Este snapshot es válido para analizar el working tree del hito
`FIX-ROOM-INFO-IMG-PUBLICATION-ROUTING-RICH-01`.

Guardian requiere refresh porque el hito toca `messageHandler.ts`. La baseline se
mantiene sobre `446ab78` y se documentan los rangos recalculados del working tree.

```text
box_id = estable
code_refs = recalculables
```

---

## Refresh actual

Refresh aplicado:

```text
1. Baseline de working tree sobre `446ab78`
2. Precedencia visual de habitaciones en fastpath KB agregada
3. Camino rich existente de `retrieval_based/room_info_img` conectado desde `messageHandler`
4. Evidence summary y scans top-level refrescados
5. code index y box index refrescados
6. Cajas de reserva, billing, arrivals_transport y fallback preservadas
```
