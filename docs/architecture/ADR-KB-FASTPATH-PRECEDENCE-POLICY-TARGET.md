# ADR — KB Fastpath Precedence Policy Target

## Estado

Proposed.

Hito:

`DOC-ADR-KB-FASTPATH-PRECEDENCE-POLICY-01`

Nombre:

`ADR-KB-FASTPATH-PRECEDENCE-POLICY-TARGET`

## Problema

El fastpath informativo de KB puede recibir consultas con señales semánticas
conflictivas.

El caso que motivó esta decisión fue:

```text
que aeropuerto hay cerca del hotel
```

La consulta combinaba:

- una señal genérica de proximidad: `cerca`
- una señal operacional específica: `aeropuerto`

Antes de la reparación puntual, el runtime podía enrutar esa consulta a:

```yaml
category: retrieval_based
promptKey: nearby_points
```

La fuente correcta era:

```yaml
category: retrieval_based
promptKey: arrivals_transport
```

El hito `FIX-MESSAGEHANDLER-KB-FASTPATH-ARRIVALS-TRANSPORT-ROUTING-01`
corrigió ese caso puntual forzando `retrieval_based/arrivals_transport` para
señales de aeropuerto/transporte dentro del fastpath KB.

Esa corrección resolvió el bug observable, pero dejó explícito un problema más
general: no conviene seguir acumulando hotfixes locales por categoría cuando el
problema real es de autoridad de fuente antes de generación.

## Contexto

Hitos previos relevantes:

- `FIX-KB-VERSION-INDEX-VECTOR-SYNC-ARRIVALS-TRANSPORT-01`
  - Commit técnico: `def7bab5891f0056becf237e23c45d62dd26a445`
  - Resultado: corrigió consistencia entre `hotel_content`,
    `hotel_version_index` y metadata vectorial para
    `retrieval_based/arrivals_transport`.

- `FIX-MESSAGEHANDLER-KB-FASTPATH-ARRIVALS-TRANSPORT-ROUTING-01`
  - Commit técnico: `f5e32cdfd21216d83ea6f665d77f3bbed5bbd5bc`
  - Resultado: corrigió la precedencia del fastpath KB para señales de
    aeropuerto/transporte, forzando `retrieval_based/arrivals_transport` con
    override completo.

Test real posterior exitoso:

```text
GUEST: que aeropuerto hay cerca del hotel

ASSISTANT:
El aeropuerto más cercano al Hotel Demo es el Aeropuerto de Punta del Este (PDP),
que se encuentra a solo 5 km, aproximadamente 10 minutos en coche. También está
el Aeropuerto Internacional de Carrasco (MVD), que está a 120 km y toma
alrededor de 90 minutos en llegar al hotel. ¿Te gustaría que te recomiende
opciones de transporte desde el aeropuerto?

Admin:
retrieval_based/arrivals_transport v4
```

## Decisión

BegaIA debe introducir una política sistémica de precedencia para el fastpath
KB como capa de `source grounding` previa a la generación.

La política debe decidir qué `categoryId` tiene autoridad para responder una
consulta cuando existen señales conflictivas.

La política:

- decide categoría y `promptKey` autorizados antes de resolver contenido
- aplica precedencia determinista para dominios factuales u operativos
- evita que categorías genéricas o vecinas respondan facts sensibles
- preserva la separación entre routing, contenido, retrieval y generación
- debe validar que la categoría resultante exista y esté habilitada mediante
  `category_registry` / `resolveCategoryForHotel` o mecanismo equivalente

La política no:

- produce texto final de respuesta
- reemplaza KB/RAG
- reemplaza `category_registry`
- reemplaza `hotel_content`
- reemplaza `hotel_version_index`
- reemplaza la colección vectorial
- ejecuta acciones transaccionales
- valida cada frase post-generación

Regla base:

```text
Las señales operativas o factuales específicas ganan sobre señales semánticas
genéricas.
```

Ejemplos:

- `aeropuerto` gana sobre `cerca`
- `factura` gana sobre `reserva` cuando la consulta es informativa
- una solicitud de cancelar reserva gana sobre una FAQ de política de cancelación
- `piscina`, `gimnasio` o `desayuno` ganan sobre eventos turísticos

## Modelo Conceptual

### `category_registry`

Rol:

- catálogo canónico de categorías soportadas
- define qué categorías y `promptKeys` existen y están habilitados

No decide precedencia runtime entre señales conflictivas de una consulta.

### `hotel_content`

Rol:

- contenido compilado por hotel, categoría, idioma y versión
- almacena playbooks y contenido estándar

No decide qué fuente tiene autoridad para una consulta.

### `hotel_version_index`

Rol:

- puntero a la versión vigente de un contenido por hotel/categoría/idioma

No decide routing ni precedencia semántica.

### Colección vectorial

Rol:

- índice semántico para recuperar chunks dentro de la categoría ya elegida

No debe corregir una categoría mal elegida.

### `category_overrides`

Rol:

- override por hotel para resolución de contenido/categoría ya elegida
- permite pinnear idioma, versión o `contentId`
- permite ajustar `retrieverOverride`
- permite ajustar `routerOverride`

`category_overrides` actúa después de que un `categoryId` ya fue seleccionado.

### `kb_precedence_policy`

Rol:

- política runtime de `source grounding`
- actúa antes de resolver contenido
- decide qué `categoryId` tiene autoridad ante señales conflictivas

## Relación con `category_overrides`

Este ADR preserva `category_overrides`.

Decisiones de fase 1:

```yaml
keep_category_overrides: true
do_not_rename_category_overrides: true
do_not_use_category_overrides_as_precedence_policy: true
do_not_implement_hotel_level_precedence_overrides: true
```

Frontera:

```yaml
kb_precedence_policy:
  layer: runtime/source_grounding
  scope: system_level_phase_1
  timing: before_category_resolution
  decides: categoryId_authority_for_user_query

category_overrides:
  layer: kb_content_resolution
  scope: hotel_level
  timing: after_categoryId_selected
  decides:
    - preferred lang/version/contentId
    - retrieverOverride
    - routerOverride
```

Regla de seguridad:

```text
category_overrides.routerOverride no debe subvertir silenciosamente fronteras
de source grounding.
```

Evolución futura:

```yaml
hotel_specific_precedence:
  allowed_only_with_new_contract: true
  suggested_collection_name: kb_precedence_overrides
  requires_separate_ADR_or_hito: true
```

## Matriz Inicial

Esta matriz documenta la dirección arquitectónica inicial. No implica que toda
la matriz esté implementada en el estado actual.

```yaml
arrivals_transport:
  class: deterministic_precedence_required
  source_authority:
    - hotel_config.airports
    - hotel_config.transport
    - retrieval_based/arrivals_transport
  wins_over:
    - nearby_points
    - nearby_points_img
    - tourist_events
    - kb_general
  current_status:
    - implemented_hotfix
  future_status:
    - migrate_to_shared_policy

billing:
  class: deterministic_precedence_required
  source_authority:
    - billing/payments_and_billing
    - billing/invoice_receipts
    - hotel_config.billing_if_present
  current_status:
    - already_forced_path
  future_status:
    - represent_in_shared_policy

support:
  class: deterministic_precedence_required
  source_authority:
    - support/contact_support
    - support/contact_channel_selector
    - hotel_config.contacts
    - channel configuration if applicable
  future_status:
    - represent_in_shared_policy

amenities:
  class: deterministic_precedence_required
  source_authority:
    - amenities/amenities_list
    - amenities/pool_gym_spa
    - amenities/breakfast_bar
    - amenities/parking
    - hotel_config.amenities
    - hotel_config.schedules.breakfast
  future_status:
    - represent_in_shared_policy

nearby_points:
  class: semantic_routing_ok
  source_authority:
    - retrieval_based/nearby_points
    - retrieval_based/nearby_points_img
    - hotel_config.attractions_if_applicable
  must_lose_to:
    - arrivals_transport_when_transport_signal_exists
    - tourist_events_when_event_signal_exists
    - amenities_when_facility_signal_exists

tourist_events:
  class: mixed_conflict_requires_policy
  source_authority:
    - retrieval_based/tourist_events_if_registry_content_exists
    - retrieval_based/tourist_events_img_if_registry_content_exists
    - events/poi source if configured

room_info:
  class: mixed_conflict_requires_policy
  source_authority:
    - retrieval_based/room_info
    - hotel_config.rooms
    - room templates

room_info_img:
  class: semantic_routing_ok
  source_authority:
    - retrieval_based/room_info_img
    - room image metadata/templates

cancellation_policy:
  class: mixed_conflict_requires_policy
  source_authority:
    - cancel_reservation/cancellation_policy
    - hotel_config.policies.cancellation_if_present
  rule:
    policy_question: cancellation_policy
    action_request: transactional_cancel_runtime

checkin_checkout_info:
  class: already_guarded
  source_authority:
    - hotel_config.schedules.checkIn
    - hotel_config.schedules.checkOut
    - runtime checkin_info/checkout_info categories
  current_status:
    - stable_intents_guarded

reservation_flow:
  class: transactional_runtime_owned
  source_authority:
    - runtime reservation state
    - reservationSlots
    - availability/proposal/confirmation guards
  note: must not be treated as FAQ/RAG execution

reservation_snapshot:
  class: transactional_runtime_owned
  source_authority:
    - activeReservationContext
    - reservationHistory
    - guest-wide reservation lookup when applicable

reservation_verify:
  class: transactional_runtime_owned
  source_authority:
    - reservation verification runtime

ambiguity_policy:
  class: semantic_routing_ok
  must_lose_to:
    - all_specific_deterministic_categories
    - transactional_runtime
```

## Matriz de Conflictos

```yaml
nearby_points_vs_arrivals_transport:
  examples:
    - "que aeropuerto hay cerca del hotel"
    - "airport near the hotel"
  expected_winner: arrivals_transport
  rationale: airport/transport is operational hotel information; near/cerca is generic proximity language.

nearby_points_vs_tourist_events:
  examples:
    - "qué hay para hacer cerca"
    - "eventos cerca del hotel"
  expected_winner: tourist_events_when_event_or_agenda_signal_exists

amenities_vs_room_info:
  examples:
    - "la habitación tiene jacuzzi"
    - "tienen piscina"
    - "hay gimnasio"
  expected_winner: room_info_for_room_feature; amenities_for_hotel_facility

billing_vs_reservation:
  examples:
    - "quiero pagar la reserva"
    - "necesito factura de la reserva"
  expected_winner: billing_for_info; reservation_runtime_for_transactional_execution

cancellation_policy_vs_reservation_cancel:
  examples:
    - "cuál es la política de cancelación"
    - "quiero cancelar mi reserva"
  expected_winner: cancellation_policy_for_info; runtime_cancel_for_action

support_vs_kb_general:
  examples:
    - "teléfono de recepción"
    - "cómo contacto al hotel"
  expected_winner: support_contact_or_contact_channel_selector

checkin_checkout_vs_kb_general:
  examples:
    - "a qué hora es el check out"
    - "cuándo puedo entrar"
  expected_winner: checkin_info_or_checkout_info

amenities_vs_tourist_events:
  examples:
    - "hay parking mañana"
    - "hay piscina este fin de semana"
  expected_winner: amenities

support_vs_arrivals_transport:
  examples:
    - "cómo contacto para pedir transfer"
    - "qué transporte hay desde el aeropuerto"
  expected_winner: support_if_contact_channel_intent; arrivals_transport_if_transport_options_intent
```

## Implementación Objetivo

### Fase 1

- Crear un helper o módulo compartido para decisiones de precedencia KB.
- Mantener la matriz base como política system-level versionada con código.
- Usar la política desde el fastpath KB de `messageHandler`.
- Validar decisiones contra `category_registry` / `resolveCategoryForHotel`.
- Agregar tests de conflicto de routing.
- No implementar overrides por hotel.
- Mantener `category_overrides` intacto y separado.

Ubicación preferida:

```text
lib/kb/kbPrecedencePolicy.ts
```

o equivalente, siempre que preserve la separación entre política de fuente y
generación de respuesta.

### Fase 2

- Considerar overrides de precedencia por hotel solo si aparece una necesidad
  real.
- Requerir validación contra `category_registry`.
- Definir contrato separado.
- Usar una colección nueva solo con ADR/hito explícito.

Nombre sugerido si se habilita esa fase:

```text
kb_precedence_overrides
```

No se define UI de Admin en esta fase.

### Fase 3

- Considerar un guard post-generación o factual checker.
- Mantenerlo separado de routing/source grounding.

## Consecuencias

### Positivas

- Evita parches regex aislados dentro de `messageHandler`.
- Hace explícita la autoridad de fuente antes de generación.
- Preserva KB/RAG, compiler, `category_registry`, `hotel_content`,
  `hotel_version_index` y vectorización.
- Mantiene `category_registry` como catálogo, no como política runtime.
- Mantiene `hotel_content` como contenido compilado, no como política runtime.
- Mantiene `category_overrides` como mecanismo de resolución por hotel, no como
  política primaria de precedencia.
- Vuelve testeables los conflictos de categorías de alto riesgo.

### Tradeoffs

- Introduce una pequeña abstracción runtime nueva.
- Requiere mantener señales y tests de conflicto.
- No resuelve por sí sola alucinación post-generación.
- Puede sobreajustarse si las señales se expanden sin tests negativos.
- Requiere disciplina para no duplicar ni reemplazar completamente la policy del
  graph.
- Los overrides de precedencia por hotel requieren gobernanza separada.

## Relación con ADRs Existentes

### ADR-PIPELINE-RUNTIME-TARGET

Este ADR fortalece la decisión de mantener `messageHandler` como runtime
operativo principal.

La política de precedencia no migra el runtime a `mhFlowGraph` ni crea un
runtime paralelo. Su objetivo es hacer más explícito un aspecto del gobierno
actual del fastpath KB dentro del runtime vigente.

### Arquitectura KB / Compiler

Este ADR preserva:

- `category_registry`
- `hotel_content`
- `hotel_version_index`
- `hotel_text_collection`
- colección vectorial por hotel
- vectorización
- resolución de contenido por hotel/categoría/idioma/versión

La matriz de precedencia no compila contenido, no genera embeddings y no muta
datos KB.

### `category_overrides`

Este ADR preserva `category_overrides` como mecanismo de personalización por
hotel después de seleccionado el `categoryId`.

No se renombra, elimina ni reemplaza `category_overrides`.

## Fuera de Alcance

- Implementar el helper.
- Modificar `messageHandler`.
- Modificar `answerWithKnowledge`.
- Modificar `classifyQuery`.
- Modificar graph policy.
- Cambios de schema DB.
- UI Admin para reglas de precedencia.
- Overrides de precedencia por hotel.
- Mutar `category_registry`.
- Mutar `category_overrides`.
- Mutar `hotel_content`.
- Cambios de vectorización.
- Factual checker post-generación.
- Refresh de Runtime Map.

## Condiciones para Reabrir

Esta decisión debe reabrirse si:

- se necesita precedencia por hotel antes de resolver contenido
- `category_overrides.routerOverride` empieza a interferir con fronteras de
  source grounding
- se decide unificar formalmente graph policy y fastpath KB policy
- se introduce un factual checker post-generación con impacto sobre routing
- se migra el runtime principal fuera de `messageHandler`

## Cierre

La decisión arquitectónica es introducir una política explícita de precedencia
para el fastpath KB como capa de `source grounding` previa a generación.

La fase 1 debe ser system-level, versionada con código, sin overrides por hotel
y sin producir texto final.

`category_overrides` se conserva como mecanismo de resolución por hotel después
de elegido el `categoryId`, no como política primaria de precedencia.
