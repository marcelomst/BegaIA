// Path: .runtime-analysis/runtime-map-v1/00-box-index.md

# Runtime Map V1 — Box Index

## Propósito

Este archivo define las cajas conceptuales estables del Runtime Map V1.

Está pensado para dos usos:

```text
1. Lectura humana
   Para entender responsabilidades, riesgos y fronteras conceptuales.

2. Uso machine-friendly
   Para que AGPT, agente técnico, Guardian y HDOC puedan referirse a zonas del runtime
   mediante `box_id`, `risk_tags`, `code_refs` y alcance explícito.
```

Este archivo no autoriza refactor.  
No modifica arquitectura.  
No define módulos físicos obligatorios.  
No reemplaza tests.

---

## Regla principal

```text
box_id = estable
code_refs = recalculables
```

Los `box_id` deben mantenerse estables.

Los `code_refs` pueden quedar desactualizados si cambia `messageHandler.ts`, por lo que deben refrescarse con el `00-code-index.md` antes de usarlos como evidencia exacta en un hito técnico.

---

## Snapshot base

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: e67ba49
messageHandler_lines: 11683
working_tree_status: clean
analysis_scope: commit_e67ba4968d2275211fe63673cf64224bcae07fc8
baseline_status: committed_fix_pushed_runtime_map_refresh_applied_v20
known_manual_bug: none
```

## Refresh documental aplicado en este hito

```yaml
runtime_boxes_audit:
  touched:
    - runtime.messageHandler.bodyLLM.turnDecision
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create.dateCorrection
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create.quoteCopy
  reviewed:
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.modify
    - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.modify.confirmationGating
  forbidden_touched: []
  undeclared_touched: []
  parity_tests:
    status: present
    details:
      - create con fecha pasada corrige en el idioma ya fijado por la conversación
      - follow-up detectado como en no cambia el idioma de la cotización
      - quote posterior mantiene copy en español
      - confirmación posterior mantiene copy en español
  code_refs_status: fresh
  runtime_map_refresh_required: true
  verdict: valid
```

---

## Convenciones

### kind

```yaml
kind:
  runtime_host: runtime principal
  runtime_stage: etapa interna del runtime
  sub_runtime: runtime interno dominante
  decision_gate: compuerta de decisión / precedencia
  domain_group: agrupación funcional
  operational_corridor: ruta operacional
  cross_cutting_corridor: corredor transversal
  state_boundary: frontera de estado
  output_boundary: frontera de respuesta / salida
  semantic_layer: capa semántica / probabilística / policy
  fallback_layer: último recurso seguro
```

### confidence

```yaml
confidence:
  high: rango detectado por firma clara de función o evidencia directa
  medium: rango inferido por densidad de markers y coherencia conceptual
  low: rango probable pero mezclado con otras responsabilidades
  needs_refresh: requiere recomposición contra código actual
```

### risk_tags

Los `risk_tags` ayudan a diseñar hitos y auditar diffs.

Ejemplos:

```text
precedence
temporal_repair
slot_attribution
confirmation_gating
quote_gating
target_resolution
fallback_permission
state_preservation
channel_copy
ux_regression
```

---

# Boxes

```yaml
boxes:
  - box_id: runtime.messageHandler
    label: messageHandler.ts
    level: 1
    parent: runtime
    kind: runtime_host
    human_summary: >
      Runtime conversacional principal vigente. Recibe el turno normalizado,
      coordina etapas internas y produce una salida hacia el canal.
    responsibilities:
      - host del runtime conversacional principal
      - coordinar preLLM, bodyLLM y posLLM
      - conectar entrada normalizada con salida al canal
      - mantener continuidad conversacional
    risk_tags:
      - regression_sensitive
      - large_file
      - shared_state
      - routing
    code_refs:
      - file: lib/handlers/messageHandler.ts
        range: L1-L11683
        confidence: high
    related_boxes:
      - runtime.messageHandler.preLLM
      - runtime.messageHandler.bodyLLM
      - runtime.messageHandler.posLLM
      - runtime.messageHandler.handleIncomingMessage
    forbidden_assumptions:
      - No asumir que todo messageHandler.ts debe refactorizarse.
      - No pedir fixes genéricos sobre todo el archivo.
      - No tratar este archivo como un único corredor.

  - box_id: runtime.messageHandler.handleIncomingMessage
    label: handleIncomingMessage
    level: 1
    parent: runtime.messageHandler
    kind: runtime_stage
    human_summary: >
      Entrypoint público del runtime conversacional.
    responsibilities:
      - recibir entrada normalizada
      - iniciar el flujo interno del runtime
      - actuar como frontera pública de entrada
    risk_tags:
      - entrypoint
      - runtime_boundary
    code_refs:
      - file: lib/handlers/messageHandler.ts
        range: L11359-L11683
        confidence: high
    related_boxes:
      - runtime.messageHandler
      - runtime.messageHandler.preLLM
    forbidden_assumptions:
      - No confundir con handleChannelMessage.
      - No confundir con bodyLLM.

  - box_id: runtime.messageHandler.preLLM
    label: preLLM
    level: 1
    parent: runtime.messageHandler
    kind: runtime_stage
    human_summary: >
      Etapa previa que prepara contexto, estado conversacional, historial y señales
      necesarias para bodyLLM.
    responsibilities:
      - preparar contexto
      - recuperar conv_state
      - preparar historial
      - construir señales previas
      - alimentar bodyLLM
    risk_tags:
      - context_loading
      - state_input
      - history
      - pre_runtime
    code_refs:
      - file: lib/handlers/messageHandler.ts
        range: L4106-L4348
        confidence: high
    related_boxes:
      - runtime.messageHandler.bodyLLM
      - runtime.messageHandler.bodyLLM.turnDecision
    forbidden_assumptions:
      - No asumir que preLLM decide la ruta final.
      - No mezclar preparación de contexto con ejecución transaccional.

  - box_id: runtime.messageHandler.bodyLLM
    label: bodyLLM
    level: 2
    parent: runtime.messageHandler
    kind: sub_runtime
    human_summary: >
      Sub-runtime dominante dentro de messageHandler.ts. Concentra decisión de turno,
      corredores operacionales, estado compartido, fallback, graph/classifier/policy
      y respuesta candidata.
    responsibilities:
      - decidir ruta operacional dominante
      - coordinar corredores internos
      - leer y preservar estado conversacional
      - aplicar compuertas de seguridad
      - generar respuesta candidata
      - activar fallback o capa semántica cuando corresponde
    risk_tags:
      - regression_sensitive
      - precedence
      - shared_state
      - early_return
      - routing
      - temporal_repair
      - fallback
    code_refs:
      - file: lib/handlers/messageHandler.ts
        range: L4861-L11313
        confidence: high
    related_boxes:
      - runtime.messageHandler.bodyLLM.turnDecision
      - runtime.messageHandler.bodyLLM.operationalCorridors
      - runtime.messageHandler.persistenceReply
    forbidden_assumptions:
      - No asumir que bodyLLM es solamente una llamada LLM.
      - No extraer sin tests de paridad.
      - No corregir un corredor sin revisar corredores relacionados.
      - No tocar bodyLLM de forma genérica sin declarar cajas impactadas.

  - box_id: runtime.messageHandler.bodyLLM.turnDecision
    label: Decisión de turno
    level: 3
    parent: runtime.messageHandler.bodyLLM
    kind: decision_gate
    human_summary: >
      Router / árbitro / precedencia. Decide qué ruta domina para el turno actual
      a partir del mensaje, estado previo, slots, foco, target, historial,
      structured analyze, graph/classifier/policy y fallback permitido.
    responsibilities:
      - arbitrar señales
      - decidir ruta dominante
      - bloquear rutas inseguras
      - preservar estado relevante
      - evitar acciones sensibles sin target o confirmación
      - decidir si fallback queda permitido
    risk_tags:
      - precedence
      - temporal_repair
      - slot_attribution
      - confirmation_gating
      - reference_resolution
      - domain_lock
      - fallback_permission
      - routing
    code_refs:
      - file: lib/handlers/messageHandler.ts
        range: L4349-L4860
        confidence: needs_refresh
      - file: lib/handlers/messageHandler.ts
        range: L11093-L11240
        confidence: needs_refresh
      - file: lib/handlers/messageHandler.ts
        range: L2451-L3246
        confidence: high
    related_boxes:
      - runtime.messageHandler.bodyLLM.operationalCorridors
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.modify
      - runtime.messageHandler.bodyLLM.operationalCorridors.fallbackLocal
      - runtime.messageHandler.bodyLLM.operationalCorridors.graphClassifierPolicy
    forbidden_assumptions:
      - No tratar esta caja como dominio de negocio.
      - No ejecutar acciones transaccionales conceptualmente aquí.
      - No permitir que fallback gane antes que guards críticos.
      - No asumir que structured analyze decide sin arbitraje.

  - box_id: runtime.messageHandler.bodyLLM.operationalCorridors
    label: Corredores operacionales
    level: 3
    parent: runtime.messageHandler.bodyLLM
    kind: domain_group
    human_summary: >
      Conjunto de rutas internas posibles dentro de bodyLLM una vez que la decisión
      de turno eligió o habilitó un camino.
    responsibilities:
      - agrupar rutas operacionales
      - separar familias de comportamiento
      - exponer riesgos de solapamiento
      - orientar lectura y auditoría de fixes
    risk_tags:
      - duplicated_logic
      - shared_state
      - corridor_overlap
      - regression_sensitive
    code_refs:
      - file: lib/handlers/messageHandler.ts
        range: L4861-L11313
        confidence: high
    related_boxes:
      - runtime.messageHandler.bodyLLM.turnDecision
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation
      - runtime.messageHandler.bodyLLM.operationalCorridors.availabilityInquiry
      - runtime.messageHandler.bodyLLM.operationalCorridors.faqPoliciesAmenities
      - runtime.messageHandler.bodyLLM.operationalCorridors.billingSupport
      - runtime.messageHandler.bodyLLM.operationalCorridors.graphClassifierPolicy
      - runtime.messageHandler.bodyLLM.operationalCorridors.fallbackLocal
    forbidden_assumptions:
      - No asumir que los corredores existen como módulos físicos.
      - No aplicar un fix a un corredor sin revisar corredores relacionados.

  - box_id: runtime.messageHandler.bodyLLM.operationalCorridors.reservation
    label: Reservation
    level: 4
    parent: runtime.messageHandler.bodyLLM.operationalCorridors
    kind: domain_group
    human_summary: >
      Agrupa corredores relacionados con reservas: create, modify, cancel y snapshot.
      Es el dominio transaccional más sensible del runtime.
    responsibilities:
      - agrupar create, modify, cancel y snapshot
      - proteger acciones sensibles
      - preservar continuidad de reserva
      - separar acciones transaccionales de consultas informativas
    risk_tags:
      - transactional_state
      - shared_slots
      - target_resolution
      - confirmation_gating
      - reservation_context
    code_refs:
      - file: lib/handlers/messageHandler.ts
        range: L4861-L11313
        confidence: medium
    related_boxes:
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.modify
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.cancel
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot
    forbidden_assumptions:
      - No tratar Reservation como sinónimo de Create.
      - No aplicar reglas transaccionales sin target o confirmación.
      - No mezclar snapshot con create por defecto.

  - box_id: runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
    label: Create
    level: 4
    parent: runtime.messageHandler.bodyLLM.operationalCorridors.reservation
    kind: operational_corridor
    human_summary: >
      Corredor de creación de reservas. Completa slots, valida fechas,
      consulta disponibilidad, corrige fechas inválidas preservando locale,
      genera quote/proposal y permite confirmación explícita si corresponde.
    responsibilities:
      - slot ingestion
      - date repair
      - date correction locale stickiness
      - availability check
      - quote gating
      - quote copy continuity
      - proposal confirmation
      - confirmAndCreate guard
    risk_tags:
      - create_flow
      - slot_attribution
      - temporal_repair
      - language_policy
      - quote_gating
      - confirmation_gating
      - availability
      - create_vs_modify_contamination
    code_refs:
      - file: lib/handlers/messageHandler.ts
        range: L1477-L1867
        confidence: needs_refresh
      - file: lib/handlers/messageHandler.ts
        range: L4349-L4860
        confidence: needs_refresh
      - file: lib/handlers/messageHandler.ts
        range: L4861-L7068
        confidence: needs_refresh
    related_boxes:
      - runtime.messageHandler.bodyLLM.turnDecision
      - runtime.messageHandler.bodyLLM.operationalCorridors.availabilityInquiry
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.modify
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot
    forbidden_assumptions:
      - No reinterpretar checkOut explícito como checkIn.
      - No cotizar con rango temporal inválido.
      - No confirmar sin proposal válida.
      - No capturar laterales como slots de reserva.
      - No asumir que toda consulta de disponibilidad es create.

  - box_id: runtime.messageHandler.bodyLLM.operationalCorridors.reservation.modify
    label: Modify
    level: 4
    parent: runtime.messageHandler.bodyLLM.operationalCorridors.reservation
    kind: operational_corridor
    human_summary: >
      Corredor de modificación de reservas existentes. Requiere target,
      compone patch transaccional, persiste preview y exige confirmación
      explícita antes de ejecutar.
    responsibilities:
      - reference resolution
      - selectedReservationTarget
      - modifyState
      - activeField
      - pendingPatch
      - awaitingConfirmation
      - preview gating
      - date modify repair
      - modify confirmation
    risk_tags:
      - modify_flow
      - target_resolution
      - selected_target
      - temporal_repair
      - active_field
      - confirmation_gating
      - reservation_update_execution
      - create_vs_modify_contamination
    code_refs:
      - file: lib/handlers/messageHandler.ts
        range: L777-L1813
        confidence: needs_refresh
      - file: lib/handlers/messageHandler.ts
        range: L4851-L7030
        confidence: needs_refresh
      - file: lib/handlers/messageHandler.ts
        range: L2447-L2556
        confidence: high
    related_boxes:
      - runtime.messageHandler.bodyLLM.turnDecision
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot
    forbidden_assumptions:
      - No modificar sin target claro.
      - No ejecutar updateReservation antes de preview y confirmación explícita.
      - No aplicar reglas de create sin verificar contexto modify.
      - No perder activeField durante follow-up.
      - No saltarse desambiguación si hay múltiples reservas.

  - box_id: runtime.messageHandler.bodyLLM.operationalCorridors.reservation.cancel
    label: Cancel
    level: 4
    parent: runtime.messageHandler.bodyLLM.operationalCorridors.reservation
    kind: operational_corridor
    human_summary: >
      Corredor de cancelación de reservas. Acción sensible que requiere target claro
      y confirmación adecuada.
    responsibilities:
      - cancel target resolution
      - pendingCancellation
      - cancel confirmation
      - cancel execution guard
      - post-cancel state
    risk_tags:
      - cancel_flow
      - sensitive_action
      - target_resolution
      - confirmation_gating
      - destructive_action
    code_refs:
      - file: lib/handlers/messageHandler.ts
        range: L7064-L7563
        confidence: medium
      - file: lib/handlers/messageHandler.ts
        range: L1929-L2036
        confidence: high
    related_boxes:
      - runtime.messageHandler.bodyLLM.turnDecision
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot
      - runtime.messageHandler.bodyLLM.channelCopyCorridor
    forbidden_assumptions:
      - No cancelar sin target.
      - No cancelar por afirmación genérica.
      - No dejar que fallback ejecute cancelación.
      - No compartir confirmación con proposal de create sin arbitraje.

  - box_id: runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot
    label: Snapshot
    level: 4
    parent: runtime.messageHandler.bodyLLM.operationalCorridors.reservation
    kind: operational_corridor
    human_summary: >
      Corredor de resumen o estado de reserva. Responde consultas post-booking,
      listados o estado actual sin abrir accidentalmente create, modify o cancel.
    responsibilities:
      - post-booking semantics
      - reservation snapshot
      - canonical reply
      - reservation history
      - reference display
    risk_tags:
      - snapshot
      - verify
      - post_booking
      - canonical_reply
      - create_capture_risk
      - date_repair_contamination
    code_refs:
      - file: lib/handlers/messageHandler.ts
        range: L7814-L8063
        confidence: medium
      - file: lib/handlers/messageHandler.ts
        range: L1465-L1502
        confidence: high
      - file: lib/handlers/messageHandler.ts
        range: L5314-L5813
        confidence: medium
      - file: lib/handlers/messageHandler.ts
        range: L9314-L9367
        confidence: low
    related_boxes:
      - runtime.messageHandler.bodyLLM.turnDecision
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.modify
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.cancel
    forbidden_assumptions:
      - No abrir create flow cuando el huésped consulta estado.
      - No aplicar date repair de create sobre snapshot.
      - No convertir pregunta post-booking en nueva reserva.

  - box_id: runtime.messageHandler.bodyLLM.operationalCorridors.availabilityInquiry
    label: Availability inquiry
    level: 4
    parent: runtime.messageHandler.bodyLLM.operationalCorridors
    kind: operational_corridor
    human_summary: >
      Corredor de consultas de disponibilidad o precio que no necesariamente deben
      convertirse en create flow.
    responsibilities:
      - availability intent
      - date range extraction
      - room type extraction
      - availability quote
      - controlled transition to create
    risk_tags:
      - availability
      - create_capture_risk
      - quote_gating
      - temporal_repair
      - date_range_extraction
    code_refs:
      - file: lib/handlers/messageHandler.ts
        range: L6314-L6813
        confidence: needs_refresh
      - file: lib/handlers/messageHandler.ts
        range: L4564-L4813
        confidence: needs_refresh
      - file: lib/handlers/messageHandler.ts
        range: L9064-L9313
        confidence: needs_refresh
    related_boxes:
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
      - runtime.messageHandler.bodyLLM.turnDecision
    forbidden_assumptions:
      - No convertir toda consulta de disponibilidad en draft de reserva.
      - No cotizar con fechas inválidas.
      - No asumir intención de compra si el huésped solo pregunta precio.

  - box_id: runtime.messageHandler.bodyLLM.operationalCorridors.faqPoliciesAmenities
    label: FAQ / Policies / Amenities
    level: 4
    parent: runtime.messageHandler.bodyLLM.operationalCorridors
    kind: operational_corridor
    human_summary: >
      Corredor de consultas laterales informativas sobre servicios, políticas,
      amenities o información general del hotel.
    responsibilities:
      - lateral question detection
      - reservation focus preservation
      - retrieval-based answer
      - policy answer
      - amenities answer
      - return to active flow
    risk_tags:
      - lateral_question
      - focus_preservation
      - retrieval
      - reservation_context_contamination
      - domain_lock
    code_refs:
      - file: lib/handlers/messageHandler.ts
        range: L8064-L8563
        confidence: medium
      - file: lib/handlers/messageHandler.ts
        range: L2546-L2581
        confidence: high
    related_boxes:
      - runtime.messageHandler.bodyLLM.turnDecision
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
      - runtime.messageHandler.bodyLLM.operationalCorridors.graphClassifierPolicy
    forbidden_assumptions:
      - No destruir un draft de reserva por responder una consulta lateral.
      - No capturar una pregunta lateral como slot.
      - No tratar toda FAQ como fallback.

  - box_id: runtime.messageHandler.bodyLLM.operationalCorridors.billingSupport
    label: Billing / Support
    level: 4
    parent: runtime.messageHandler.bodyLLM.operationalCorridors
    kind: operational_corridor
    human_summary: >
      Corredor de consultas administrativas, pagos, facturación o soporte.
    responsibilities:
      - billing intent
      - payment policy
      - reservation-related billing
      - support handoff
      - supervised escalation
    risk_tags:
      - billing
      - support
      - billing_reservation_overlap
      - support_handoff
      - payment_policy
    code_refs:
      - file: lib/handlers/messageHandler.ts
        range: L8064-L8563
        confidence: medium
    related_boxes:
      - runtime.messageHandler.bodyLLM.turnDecision
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot
    forbidden_assumptions:
      - No confundir pregunta de pago general con confirmación de propuesta.
      - No resolver pagos de reserva sin contexto suficiente.

  - box_id: runtime.messageHandler.bodyLLM.operationalCorridors.graphClassifierPolicy
    label: Graph / Classifier / Policy
    level: 4
    parent: runtime.messageHandler.bodyLLM.operationalCorridors
    kind: semantic_layer
    human_summary: >
      Corredor semántico/probabilístico o de policy. Ayuda cuando las señales
      deterministas no alcanzan, pero no debe pisar contratos críticos.
    responsibilities:
      - structured analyze
      - classifier intent
      - graph path
      - policy gate
      - semantic fallback
      - agreement / disagreement
    risk_tags:
      - semantic_override
      - policy_gate
      - classifier_misroute
      - deterministic_contract_violation
      - fallback_precedence
    code_refs:
      - file: lib/handlers/messageHandler.ts
        range: L8314-L8563
        confidence: needs_refresh
      - file: lib/handlers/messageHandler.ts
        range: L3384-L3511
        confidence: high
      - file: lib/handlers/messageHandler.ts
        range: L4314-L4563
        confidence: needs_refresh
      - file: lib/handlers/messageHandler.ts
        range: L9314-L9367
        confidence: needs_refresh
    related_boxes:
      - runtime.messageHandler.bodyLLM.turnDecision
      - runtime.messageHandler.bodyLLM.operationalCorridors.fallbackLocal
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
      - runtime.messageHandler.bodyLLM.operationalCorridors.availabilityInquiry
    forbidden_assumptions:
      - No pisar guards deterministas críticos.
      - No confirmar acciones sensibles por inferencia semántica sola.
      - No usar classifier como autoridad final sin arbitraje.

  - box_id: runtime.messageHandler.bodyLLM.operationalCorridors.fallbackLocal
    label: Fallback local
    level: 4
    parent: runtime.messageHandler.bodyLLM.operationalCorridors
    kind: fallback_layer
    human_summary: >
      Corredor de respuesta segura cuando ninguna ruta principal domina.
    responsibilities:
      - safe fallback
      - local fallback reply
      - domain lock fallback
      - reservation fallback
      - retrieval fallback
      - handoff fallback
    risk_tags:
      - fallback
      - last_resort
      - safety
      - state_preservation
      - no_sensitive_action
      - domain_leak
    code_refs:
      - file: lib/handlers/messageHandler.ts
        range: L8314-L8563
        confidence: needs_refresh
      - file: lib/handlers/messageHandler.ts
        range: L2718-L2906
        confidence: high
    related_boxes:
      - runtime.messageHandler.bodyLLM.turnDecision
      - runtime.messageHandler.bodyLLM.operationalCorridors.graphClassifierPolicy
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot
    forbidden_assumptions:
      - Fallback no debe inventar acciones.
      - Fallback no debe confirmar reservas.
      - Fallback no debe cancelar reservas.
      - Fallback no debe romper estado activo.

  - box_id: runtime.messageHandler.bodyLLM.channelCopyCorridor
    label: Copy por canal
    level: 4
    parent: runtime.messageHandler.bodyLLM
    kind: cross_cutting_corridor
    human_summary: >
      Corredor transversal de composición de copy específico por canal,
      especialmente email y WhatsApp. Cruza dominios y puede afectar UX.
    responsibilities:
      - email copy
      - WhatsApp copy
      - respuesta adaptada por canal
      - tono y estructura de salida
      - evitar regresiones UX
    risk_tags:
      - channel_copy
      - email
      - whatsapp
      - reply_composition
      - ux_regression
      - cross_cutting
    code_refs:
      - file: lib/handlers/messageHandler.ts
        range: L6814-L7313
        confidence: medium
      - file: lib/handlers/messageHandler.ts
        range: L5064-L5563
        confidence: medium
    related_boxes:
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.cancel
      - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot
      - runtime.messageHandler.persistenceReply
    forbidden_assumptions:
      - No tratar copy como lógica de dominio.
      - No cambiar UX/copy de canal sin declararlo.
      - No ocultar cambios funcionales como cambios de copy.

  - box_id: runtime.messageHandler.persistenceReply
    label: Persistencia + reply
    level: 1
    parent: runtime.messageHandler
    kind: output_boundary
    human_summary: >
      Frontera conceptual donde se preserva estado y se prepara la respuesta observable.
      No necesariamente corresponde a una única función física.
    responsibilities:
      - persistir estado relevante
      - preparar respuesta observable
      - conservar continuidad conversacional
      - conectar resultado bodyLLM con salida
    risk_tags:
      - persistence
      - reply_composition
      - state_update
      - observable_response
    code_refs:
      - file: lib/handlers/messageHandler.ts
        range: needs_refresh
        confidence: needs_refresh
    related_boxes:
      - runtime.messageHandler.bodyLLM
      - runtime.messageHandler.posLLM
      - runtime.messageHandler.bodyLLM.channelCopyCorridor
    forbidden_assumptions:
      - No asumir que respuesta correcta implica estado correcto.
      - No asumir que estado correcto implica respuesta observable correcta.

  - box_id: runtime.messageHandler.posLLM
    label: posLLM
    level: 1
    parent: runtime.messageHandler
    kind: runtime_stage
    human_summary: >
      Etapa posterior de cierre o verificación final antes de devolver respuesta.
    responsibilities:
      - verdict
      - supervisión
      - cierre final
      - salida hacia canal
    risk_tags:
      - final_output
      - supervision
      - verdict
    code_refs:
      - file: lib/handlers/messageHandler.ts
        range: L11314-L11358
        confidence: high
    related_boxes:
      - runtime.messageHandler.persistenceReply
      - runtime.messageHandler.bodyLLM
    forbidden_assumptions:
      - No usar posLLM para corregir decisiones de dominio mal tomadas.
      - No ocultar errores de ruta con un cierre posterior.
```

---

## Uso esperado en hitos técnicos

Un hito de runtime debería incluir, cuando aplique:

```yaml
runtime_boxes_impacted:
  - runtime.messageHandler.bodyLLM.turnDecision
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create

runtime_boxes_related:
  - runtime.messageHandler.bodyLLM.operationalCorridors.availabilityInquiry
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.modify

runtime_boxes_forbidden:
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.cancel
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot

risk_tags:
  - precedence
  - temporal_repair
  - slot_attribution
  - quote_gating

parity_tests_required:
  - observable reply
  - preserved state
  - no forbidden action
```

---

## Uso esperado en informe técnico

El agente técnico debería reportar:

```yaml
runtime_boxes_touched:
  - runtime.messageHandler.bodyLLM.turnDecision
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create

runtime_boxes_reviewed:
  - runtime.messageHandler.bodyLLM.operationalCorridors.availabilityInquiry

runtime_boxes_not_touched:
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.cancel
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot

risk_tags_observed:
  - precedence
  - temporal_repair

tests_added:
  - test/unit/...
```

---

## Uso esperado por Guardian

Guardian debería verificar:

```text
1. Que el diff toca cajas declaradas.
2. Que no toca cajas prohibidas.
3. Que el hito no se expandió a refactor amplio.
4. Que los tests de paridad existen si el hito era transaccional o de precedencia.
5. Que los code_refs usados no estén marcados como needs_refresh.
```

---

## Reglas finales

```text
1. No pedir "corregir messageHandler.ts" de forma genérica.
2. Todo fix de runtime debe declarar cajas impactadas.
3. Todo fix sensible debe declarar cajas prohibidas.
4. Todo fix de fechas debe declarar riesgo temporal y tests de paridad.
5. Todo fix de confirmación debe declarar confirmation_gating.
6. Todo fix de cancelación debe declarar acción sensible.
7. Todo fix que toque bodyLLM debe considerar precedencia.
8. box_id es estable.
9. code_refs son recalculables.
10. Identificar cajas no significa extraer cajas.
```

---

## Estado

```yaml
phase: FASE_4
artifact: 00-box-index.md
status: ready_for_operating_protocol
next_artifact: 00-operating-protocol.md
```
