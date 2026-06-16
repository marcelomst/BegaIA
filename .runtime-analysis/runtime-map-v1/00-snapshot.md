// Path: .runtime-analysis/runtime-map-v1/00-snapshot.md

# Runtime Map V1 — Snapshot

## Estado del análisis

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: 9f472c4
messageHandler_lines: 10461
baseline_status: committed_fix_pushed_runtime_map_refresh_applied_v10
known_manual_bug: none
working_tree_status: clean
analysis_scope: commit_61201fb27a168dba4800cb35ac0feadb3f399192
```

---

## Working tree al momento del snapshot

```text
refresh_documental_sobre_hito_runtime_boundary
```

---

## Suite local informada

```text
pnpm vitest run test/integration/guestConversationBinding.spec.ts
pnpm vitest run test/integration/multichannelCanonicalGuest.e2e.spec.ts
pnpm vitest run test/integration/api_chat.test.ts
pnpm vitest run test/api.webhooks.whatsapp.twilio.route.spec.ts
pnpm test
summary: 161 passed / 810 passed
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
```

### Resultado esperado ahora preservado

```text
- la lista guest-wide consolidada recién mostrada debe persistirse como fuente
  referencial inmediata para ordinales posteriores
- `la segunda reserva` debe resolver contra la misma lista mostrada
- `la última reserva` debe respetar el orden visible al huésped
- no responder `Tenés 1 reserva`
- no responder `No encontré una reserva segunda`
```

---

## Advertencia de uso

Este snapshot es válido para analizar el estado commiteado y pusheado del hito
`61201fb`.

Guardian confirmó `runtime_map_refresh.required: true`, por lo que esta baseline
ya no usa el working tree previo como referencia operativa principal.

```text
box_id = estable
code_refs = recalculables
```

---

## Seguimiento de frontera runtime

Este snapshot ahora también registra el hito `61201fb`, que no modifica
`messageHandler.ts` directamente pero sí ajusta la política de binding previa al
entrypoint público `handleIncomingMessage` desde `handleChannelMessage`.

Resultado esperado adicional:

```text
- un follow-up del mismo canal debe reutilizar el `conversationId` compatible
- un follow-up por canal incompatible no debe reciclar la conversación anterior
- `guestId` permanece canónico aunque cambie el hilo operativo
```

## Próximo paso

Refresh aplicado:

```text
1. Snapshot base a commit real `61201fb`
2. Frontera `handleChannelMessage` revisada contra `handleIncomingMessage`
3. Evidence summary refrescado
4. code index refrescado
5. box index machine-friendly refrescado para el contrato de reuse por canal
```
