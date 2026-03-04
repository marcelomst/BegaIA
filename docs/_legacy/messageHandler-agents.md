# messageHandler.ts — Logical Agents (Fase 1)

Path: `/lib/handlers/messageHandler.ts`

This document describes the five logical agents annotated inside `messageHandler.ts`. Fase 1 focuses on internal organization and documentation only; public APIs and behavior remain unchanged.

## Agent: InputNormalizer (preLLM)

- Purpose: Normalize and persist incoming user messages; ensure `guest` and `conversation` exist; handle idempotency; load recent history and `conv_state`.
- Inputs: `ChannelMessage` (`msg`), options `{ sendReply?, mode?, skipPersistIncoming? }`.
- Outputs: `PreLLMResult` with `lang`, `currSlots`, `prevCategory`, `prevSlotsStrict`, `st`, `stateForPlaybook`, `intent`, `inModifyMode`, `lcHistory`, `guest`, `conversationId`, `msg`, `options`.
- Location: Section banner `Agent: InputNormalizer (preLLM)` above `type PreLLMResult` and `preLLM(...)`.

## Agent: Orchestrator/Planner (bodyLLM + agentGraph)

- Purpose: Apply business shortcuts (modify/copy/email/WA/cancel, etc.), call `agentGraph`, and consolidate `finalText`, `nextCategory`, `nextSlots`, `needsSupervision`.
- Inputs: `PreLLMResult`.
- Outputs: `{ finalText, nextCategory, nextSlots, needsSupervision, graphResult }`.
- Location: Section banner above `bodyLLM(...)`.
- Subsection: `Orchestrator/Planner › Audit Advisory (posLLM)` — optional advisory step that refines `needsSupervision` via audit signals; banner above `posLLM(...)`.

## Agent: SupervisorDecision

- Purpose: Decide autosend policy (sent vs pending) by combining channel/guest mode and `needsSupervision`, with special-cases for snapshot/verify/close.
- Inputs: `pre: PreLLMResult`, `body`, `needsSupervision`.
- Outputs: `AutosendDecision = { autoSend, status, autosendReason, combinedMode, category?, salesStage? }`.
- Location: Helper `decideSupervisorStatus(...)` under the banner `Agent: SupervisorDecision (helpers)`; used inside `handleIncomingMessage`.

## Agent: StateUpdater

- Purpose: Update `conv_state` with minimal data required to continue follow-up flows (e.g., copy via WhatsApp/email) and other flow-driven updates.
- Inputs: `hotelId`, `conversationId`, partial state patch.
- Outputs: Upserted conversation state.
- Location: Banner `Agent: StateUpdater` inside `handleIncomingMessage` where `upsertConvState(...)` is invoked for follow-ups. Other scattered updates remain where business shortcuts execute.

## Agent: OutputFormatter

- Purpose: Build and persist the AI message, and emit either the final reply or a localized supervision notice to the client.
- Inputs: `suggestion (string)`, autosend decision, optional `rich` payload, language.
- Outputs: Persisted AI message; emitted event to channel/SSE.
- Location: Banner above `emitReply(...)`; helpers under `Agent: OutputFormatter (helpers)` include `buildPendingNotice(...)`.

## Data Flow

- handleIncomingMessage → InputNormalizer (preLLM or objective context) → Orchestrator/Planner (bodyLLM + agentGraph; optional posLLM advisory) → SupervisorDecision (sent/pending) → StateUpdater (conv_state follow-up) → OutputFormatter (persist + emit).

```text
[handleIncomingMessage]
  ├─ InputNormalizer: preLLM / objective context
  ├─ Orchestrator/Planner: bodyLLM → agentGraph → result
  │    └─ (optional) Audit Advisory: posLLM → needsSupervision'
  ├─ SupervisorDecision: combineModes + category + flags → sent|pending
  ├─ StateUpdater: upsertConvState for follow-ups
  └─ OutputFormatter: save AI message + emit final or review notice
```

## Notes

- Behavior and external signatures remain exactly the same as before.
- Telemetry `incAutosend` and auditing data are preserved.
- `FORCE_GENERATION` still bypasses supervision in dev flows.

---

# Fase 1.5 — Normalizador Avanzado (Cierre)

Esta fase movió responsabilidades pre-LLM al normalizador y redujo duplicación en el handler manteniendo paridad funcional.

## Qué se migró

- Normalizador (`runInputNormalizer`):

  - Lang: selección robusta desde `msg.detectedLanguage` con fallback a `es`.
  - Historia (`lcHistory`): últimos turnos del hilo, en formato LangChain (`HumanMessage`/`AIMessage`).
  - Estado previo: `prevCategory` y `prevSlotsStrict` desde `conv_state` (solo lectura; sin escrituras).
  - Slots actuales: fusión `prevSlotsStrict` + slots del turno (`extractSlotsFromText`), con prioridad del turno.
  - `stateForPlaybook`: `{ draft|null, confirmedBooking|null, locale }` calculado livianamente.
  - Idempotencia suave: bandera opcional `isDuplicateSoft` (placeholder, sin lecturas/escrituras fuertes).

- Grafo (`mhFlowGraph`):

  - Si no recibe `normalized`, invoca `runInputNormalizer({ msg })` en el nodo `normalize`.

- Handler (`messageHandler.ts`):
  - Eliminada la reconstrucción local de `normalized` cuando el grafo está ON; ahora delega al grafo.
  - Guardia de tipos al leer `graphState.orchestrator` (TS estricto) sin alterar el comportamiento.

## Compatibilidad y alcance

- No cambia APIs públicas ni persistencia; la migración es interna y segura.
- Las banderas se evalúan en runtime para evitar contaminación entre tests.

## Resultados de pruebas

- Suite completa con grafo y planner activos:

  - `USE_MH_FLOW_GRAPH=1 USE_ORCHESTRATOR_AGENT=1 USE_PRE_POS_PIPELINE=1`
  - 53 archivos, 140 tests → PASS.

- Suite completa con grafo desactivado (ruta legacy activa) y planner activo:

  - `USE_MH_FLOW_GRAPH=0 USE_ORCHESTRATOR_AGENT=1 USE_PRE_POS_PIPELINE=1`
  - 53 archivos, 140 tests → PASS.

- Tests unitarios añadidos al normalizador:
  - Fusión `prevSlotsStrict` + turno (prioridad del turno).
  - `stateForPlaybook` presente con `locale` coherente y `draft` cuando hay datos.

## Próximos pasos sugeridos

- Mantener el handler sin recomputaciones cuando el grafo está ON (hecho) y seguir concentrando pre-LLM en el normalizador.
- Extender pruebas del normalizador para distintos idiomas y variaciones de historial.
