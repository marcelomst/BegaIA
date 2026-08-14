// Path: .runtime-analysis/runtime-map-v1/01-phase-1-evidence-summary.md

# Runtime Map V1 — FASE 1 — Evidence Summary

## Propósito

Este documento cierra la FASE 1 del Runtime Map V1.

No define aún diagramas definitivos.  
No define todavía box_id machine-friendly.  
No autoriza refactor.  
No resuelve bugs funcionales.

Su objetivo es consolidar la evidencia actual del runtime para que los niveles posteriores del mapa puedan construirse sobre código actualizado.

---

## Snapshot base

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: d6656276b3bc1f4451cb5a178ec697d31311239b
messageHandler_lines: 12482
working_tree_status: clean_after_technical_commit
analysis_scope: commit_d6656276b3bc1f4451cb5a178ec697d31311239b
suite_status_reported: targeted_green
suite_reported:
  commands:
    - pnpm vitest run test/unit/messageHandler.reference_resolution.spec.ts
    - pnpm vitest run test/unit/messageHandler.reservation_confirm_followup.spec.ts test/unit/messageHandler.modify_cancel_intent_normalization.spec.ts
  full_suite:
    - pnpm run ts-check
    - git diff --check
known_manual_bug: none
```

## Refresh documental aplicado en este hito

```yaml
runtime_boxes_audit:
  touched:
    - create draft/proposal dominance
    - modify fast-path gating
    - confirmed target fallback resolution
  reviewed:
    - explicit ID / ordinal resolution
    - confirmed modify continuity
    - proposal confirm follow-up
    - cancel flow
    - snapshot flow
    - modify preview confirmation
    - persistencia fuera del gating
  forbidden_touched: []
  undeclared_touched: []
  parity_tests:
    status: present
    details:
      - `pnpm vitest run test/unit/messageHandler.reference_resolution.spec.ts`
      - `pnpm vitest run test/unit/messageHandler.reservation_confirm_followup.spec.ts test/unit/messageHandler.modify_cancel_intent_normalization.spec.ts`
      - `pnpm run ts-check`
      - `git diff --check`
  code_refs_status: fresh
  runtime_map_refresh_required: true
  verdict: valid
runtime_map_refresh:
  required: true
  scanned_file: lib/handlers/messageHandler.ts
  current_scan:
    commit: d6656276b3bc1f4451cb5a178ec697d31311239b
    messageHandler_lines: 12482
    functions:
      preLLM: L4497-L5366
      bodyLLM: L5367-L12112
      posLLM: L12113-L12157
      handleIncomingMessage: L12158-L12482
```

## Funciones clave actuales

| Función                              |       Rango | Líneas | Confianza |
| ------------------------------------ | ----------: | -----: | --------- |
| `buildReservationCanonicalState`     | L2230-L2730 |    501 | high      |
| `resolveReservationReference`        | L2731-L3070 |    340 | high      |
| `detectDominantTurnDomain`           | L3071-L3354 |    284 | high      |
| `getReservationDomainLockSignal`     | L3355-L3526 |    172 | high      |
| `shouldUseReservationLocalFallback`  | L3527-L3579 |     53 | high      |
| `buildReservationLocalFallbackReply` | L3580-L3716 |    137 | high      |
| `assessReservationDateCoherence`     | L3717-L4196 |    480 | high      |
| `tryStructuredAnalyze`               | L4197-L4385 |    189 | high      |
| `preLLM`                             | L4497-L5366 |    870 | high      |
| `bodyLLM`                            | L5367-L12112 |   6746 | high      |
| `posLLM`                             | L12113-L12157 |     45 | high      |
| `handleIncomingMessage`              | L12158-L12482 |    325 | high      |

---

## Observación principal

`bodyLLM` concentra el sub-runtime dominante del archivo `messageHandler.ts`.

```text
messageHandler.ts total: 12482 líneas
bodyLLM:                6746 líneas
```

Esto confirma que `bodyLLM` debe tratarse como un sub-runtime dominante.

No es simplemente una función grande.
Es una zona donde conviven además:

- decisión de turno
- reparación temporal
- reservation create
- modify
- cancel
- snapshot
- availability
- copy por canal
- fallback
- graph/classifier/policy
- persistencia parcial
- precedencia compartida del fastpath KB informativo
- override determinístico hacia `retrieval_based/arrivals_transport`
- selección determinística de `retrieval_based/room_info_img` para inventario visual con imágenes
- conexión al rich path existente de `retrieval_based` para `room-info-img`
- preservación de nearby legítimo sin override de transporte
- preservación explícita de billing forced path fuera de esta migración
- early returns

---

## Hotspots detectados desde buckets

### 1. Reparación temporal / fechas

Marcador dominante en muchos buckets:

```text
date/temporal
```

Buckets con alta densidad:

| Rango       | Evidencia          |
| ----------- | ------------------ |
| L4314-L4563 | date/temporal: 118 |
| L4564-L4813 | date/temporal: 101 |
| L5814-L6063 | date/temporal: 157 |
| L6064-L6313 | date/temporal: 136 |
| L6564-L6813 | date/temporal: 130 |
| L8564-L8813 | date/temporal: 164 |
| L8814-L9063 | date/temporal: 151 |

Lectura:

```text
La lógica temporal no vive en un único punto.
Está repetida o distribuida en varios corredores.
```

Riesgo:

```text
Un fix local de fechas puede afectar create, modify, availability, snapshot o fallback si no se acota por caja.
```

Risk tags:

```yaml
risk_tags:
  - temporal_repair
  - slot_attribution
  - precedence
  - regression_sensitive
```

---

### 2. Reservation create

Marcador dominante:

```text
create
```

Buckets con alta densidad:

| Rango       | Evidencia   |
| ----------- | ----------- |
| L4314-L4563 | create: 43  |
| L4564-L4813 | create: 54  |
| L6314-L6563 | create: 121 |
| L6564-L6813 | create: 149 |
| L7564-L7813 | create: 56  |
| L9064-L9313 | create: 70  |

Lectura:

```text
reservation.create aparece en varias zonas, no como un bloque único.
```

Riesgo:

```text
Create puede ser secuestrado por fast paths temporales, continuidad de focus, fallback o confirmación si no se respeta la precedencia.
```

Risk tags:

```yaml
risk_tags:
  - create_flow
  - quote_gating
  - confirmation_gating
  - slot_ingestion
  - availability
```

---

### 3. Reservation modify

Marcador dominante:

```text
modify
```

Buckets con alta densidad:

| Rango       | Evidencia   |
| ----------- | ----------- |
| L5064-L5313 | modify: 45  |
| L5564-L5813 | modify: 41  |
| L5814-L6063 | modify: 111 |
| L6064-L6313 | modify: 83  |
| L8564-L8813 | modify: 74  |

Lectura:

```text
modify está especialmente mezclado con fechas, selected target y reservationSlots.
```

Riesgo:

```text
Un ajuste de fechas pensado para create puede entrar por modify si la compuerta de dominio no es estricta.
```

Risk tags:

```yaml
risk_tags:
  - modify_flow
  - target_resolution
  - date_repair
  - selected_target
  - domain_lock
```

---

### 4. Cancel corridor

Marcador dominante:

```text
cancel
```

Buckets principales:

| Rango       | Evidencia  |
| ----------- | ---------- |
| L7064-L7313 | cancel: 42 |
| L7314-L7563 | cancel: 59 |

Lectura:

```text
Cancel parece más concentrado que create y modify.
```

Riesgo:

```text
Aunque está más localizado, puede verse afectado por reference resolution, selected target y confirmación.
```

Risk tags:

```yaml
risk_tags:
  - cancel_flow
  - confirmation_gate
  - target_resolution
  - destructive_action
```

---

### 5. Snapshot / verify

Marcador dominante:

```text
snapshot/verify
```

Buckets principales:

| Rango       | Evidencia           |
| ----------- | ------------------- |
| L5314-L5563 | snapshot/verify: 24 |
| L5564-L5813 | snapshot/verify: 32 |
| L6064-L6313 | snapshot/verify: 27 |
| L7814-L8063 | snapshot/verify: 75 |
| L9314-L9367 | snapshot/verify: 11 |

Lectura:

```text
snapshot/verify tiene un núcleo visible cerca de L7814-L8063,
pero también aparece mezclado con modify y temporalidad.
```

Riesgo:

```text
Un fix de create puede contaminar snapshot si se activa continuidad de reserva o fallback temporal antes de responder post-booking.
```

Risk tags:

```yaml
risk_tags:
  - snapshot
  - verify
  - canonical_reply
  - post_booking
  - canonical_state
```

---

### 6. Email / WhatsApp copy

Marcador dominante:

```text
email/whatsapp copy
```

Buckets con alta densidad:

| Rango       | Evidencia                |
| ----------- | ------------------------ |
| L5064-L5313 | email/whatsapp copy: 94  |
| L5314-L5563 | email/whatsapp copy: 52  |
| L6814-L7063 | email/whatsapp copy: 180 |
| L7064-L7313 | email/whatsapp copy: 153 |

Lectura:

```text
La composición de copy por canal está dentro de bodyLLM y cruza zonas de reserva, snapshot y cancel.
```

Riesgo:

```text
Un cambio funcional puede modificar UX/copy de Web, Email o WhatsApp sin intención explícita.
```

Risk tags:

```yaml
risk_tags:
  - channel_copy
  - email
  - whatsapp
  - reply_composition
  - ux_regression
```

---

### 7. Graph / classifier / policy

Marcador dominante:

```text
graph/classifier/policy
```

Buckets principales:

| Rango       | Evidencia                   |
| ----------- | --------------------------- |
| L4314-L4563 | graph/classifier/policy: 19 |
| L4564-L4813 | graph/classifier/policy: 16 |
| L8314-L8563 | graph/classifier/policy: 50 |
| L9314-L9367 | graph/classifier/policy: 8  |

Lectura:

```text
La capa graph/classifier/policy aparece como fallback o escalamiento dentro de bodyLLM,
no como runtime principal autónomo.
```

Riesgo:

```text
Si una compuerta determinista queda demasiado amplia, puede impedir que graph/classifier/policy reciba turnos que debería resolver.
```

Risk tags:

```yaml
risk_tags:
  - routing
  - classifier
  - policy
  - graph
  - fallback_precedence
```

---

### 8. Fallback local

Marcador dominante:

```text
fallback
```

Bucket principal:

| Rango       | Evidencia    |
| ----------- | ------------ |
| L8314-L8563 | fallback: 35 |

Lectura:

```text
Fallback local parece concentrado cerca de la zona graph/classifier/policy.
```

Riesgo:

```text
Fallback puede ser correcto como última salida, pero peligroso si se activa antes que un dominio gobernado.
```

Risk tags:

```yaml
risk_tags:
  - fallback
  - last_resort
  - precedence
  - domain_leak
```

---

## Rangos tentativos por caja conceptual

Estos rangos NO son definitivos.
Sirven como primera asociación entre mapa humano y evidencia de código.

Los `box_id` definitivos se crearán en FASE 4.

---

### Caja: messageHandler

```yaml
label: messageHandler.ts
kind: runtime_principal
code_refs:
  - file: lib/handlers/messageHandler.ts
    range: L1-L11007
    confidence: high
```

---

### Caja: preLLM

```yaml
label: preLLM
kind: pre_runtime_context
code_refs:
  - file: lib/handlers/messageHandler.ts
    range: L4279-L4528
    confidence: high
```

Responsabilidad tentativa:

```text
Preparar contexto, estado, señales y datos de entrada antes del cuerpo operacional.
```

---

### Caja: bodyLLM

```yaml
label: bodyLLM
kind: sub_runtime_dominant
code_refs:
  - file: lib/handlers/messageHandler.ts
    range: L5367-L12112
    confidence: high
```

Responsabilidad tentativa:

```text
Resolver la decisión operacional dominante del turno.
```

---

### Caja: posLLM

```yaml
label: posLLM
kind: post_runtime_verification
code_refs:
  - file: lib/handlers/messageHandler.ts
    range: L11657-L11701
    confidence: high
```

Responsabilidad tentativa:

```text
Aplicar verificación final, verdict y supervisión posterior a la decisión de bodyLLM.
```

---

### Caja: handleIncomingMessage

```yaml
label: handleIncomingMessage
kind: public_entrypoint
code_refs:
  - file: lib/handlers/messageHandler.ts
    range: L11702-L12026
    confidence: high
```

Responsabilidad tentativa:

```text
Entrada pública al runtime conversacional.
```

---

## Rangos tentativos internos de bodyLLM

### Zona A — Fast paths iniciales / structured analyze / create temporal

```yaml
label: bodyLLM.initialFastPaths
range: L4314-L4813
confidence: medium
evidence:
  - date/temporal alto
  - create alto
  - structured analyze visible
  - availability visible
  - decisions altas
risk_tags:
  - fast_path
  - temporal_repair
  - create_flow
  - structured_analyze
  - precedence
```

Lectura:

```text
Zona sensible de entrada. Puede decidir demasiado temprano antes de que otros corredores reciban el turno.
```

---

### Zona B — Modify corridor / selected target / reparación temporal

```yaml
label: bodyLLM.modifyCorridor
range: L5064-L6313
confidence: medium
evidence:
  - modify alto
  - date/temporal alto
  - selected target visible
  - reservationSlots alto
risk_tags:
  - modify_flow
  - target_resolution
  - temporal_repair
  - selected_target
  - state_merge
```

Lectura:

```text
Zona donde modify, fechas y target están fuertemente acoplados.
```

---

### Zona C — Create / availability / quote / proposal

```yaml
label: bodyLLM.createAvailabilityQuoteCorridor
range: L6314-L6813
confidence: medium
evidence:
  - create muy alto
  - availability alto
  - date/temporal alto
  - confirm visible
  - reply builders visibles
risk_tags:
  - create_flow
  - availability
  - quote_gating
  - proposal
  - confirmation_gating
```

Lectura:

```text
Zona candidata a representar el corredor comercial principal de reservation.create.
```

---

### Zona D — Copy corridor / channel-specific replies

```yaml
label: bodyLLM.channelCopyCorridor
range: L6814-L7313
confidence: medium
evidence:
  - email/whatsapp copy muy alto
  - awaits altos
  - cancel visible
  - reservationSlots visible
risk_tags:
  - channel_copy
  - email
  - whatsapp
  - reply_composition
  - ux_regression
```

Lectura:

```text
Zona de alto riesgo UX porque mezcla copy por canal con acciones de dominio.
```

---

### Zona E — Cancel corridor

```yaml
label: bodyLLM.cancelCorridor
range: L7064-L7563
confidence: medium
evidence:
  - cancel alto
  - selected target visible
  - confirm visible
  - reply builders visibles
risk_tags:
  - cancel_flow
  - destructive_action
  - confirmation_gate
  - target_resolution
```

Lectura:

```text
Cancel está más localizado, pero se superpone parcialmente con copy y reservation slots.
```

---

### Zona F — Snapshot / canonical reply

```yaml
label: bodyLLM.snapshotCanonicalReplyCorridor
range: L7814-L8063
confidence: medium
evidence:
  - snapshot/verify alto
  - canonical state visible
  - reply builders altos
  - reservationSlots alto
risk_tags:
  - snapshot
  - verify
  - canonical_reply
  - post_booking
  - canonical_state
```

Lectura:

```text
Zona central para respuestas post-booking y uso de proyección canónica.
```

---

### Zona G — Billing / Support / FAQ / Graph / Fallback

```yaml
label: bodyLLM.lateralGraphFallbackCorridor
range: L8064-L8563
confidence: medium
evidence:
  - billing visible
  - graph/classifier/policy alto
  - fallback alto
  - reply builders visibles
risk_tags:
  - lateral_domain
  - billing
  - support
  - graph
  - fallback
  - policy
```

Lectura:

```text
Zona de resolución lateral y fallback. Riesgo de ser alcanzada tarde si create/modify capturan demasiado pronto.
```

---

### Zona H — Late temporal repair / final create cleanup

```yaml
label: bodyLLM.lateTemporalCreateCleanup
range: L8564-L9367
confidence: low
evidence:
  - date/temporal muy alto
  - modify visible
  - create visible
  - reservationSlots visible
  - graph/classifier/policy al cierre
risk_tags:
  - late_repair
  - temporal_repair
  - create_flow
  - modify_flow
  - final_gating
  - precedence
```

Lectura:

```text
Zona final altamente sensible. La confianza es baja porque mezcla temporalidad, create, modify y cierre.
```

---

## Tabla de confianza

| Confianza     | Significado                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| high          | Rango obtenido directamente por función o firma clara.                                               |
| medium        | Rango inferido por densidad de markers y coherencia conceptual.                                      |
| low           | Rango probable pero mezclado con otros corredores. Requiere inspección manual antes de usar en hito. |
| needs_refresh | Rango inválido si cambia el archivo o se modifica bodyLLM.                                           |

---

## Conclusiones de FASE 1

### Conclusión 1

`bodyLLM` debe mapearse como sub-runtime dominante.

```text
No alcanza con decir "messageHandler".
Hay que hablar de zonas internas de bodyLLM.
```

---

### Conclusión 2

Los corredores no están completamente separados en el código.

```text
Create, modify, temporal repair y reservationSlots se superponen.
```

Esto explica por qué fixes de un corredor pueden provocar regresiones en otros.

---

### Conclusión 3

La reparación temporal es el hotspot más riesgoso.

```text
date/temporal aparece fuerte al inicio, medio y final de bodyLLM.
```

Cualquier hito sobre fechas debe declarar explícitamente:

- caja impactada
- caja relacionada
- caja prohibida
- tests de paridad
- rutas no-create a proteger

---

### Conclusión 4

El mapa debe distinguir entre:

```text
dominio conceptual
corredor operacional
compuerta de decisión
reply/copy
persistencia
fallback
```

Si no se separan esas categorías, el agente técnico puede confundir “reservation” con “create”, “create” con “date repair”, o “date repair” con “modify”.

---

### Conclusión 5

Los rangos de línea deben tratarse como recalculables.

```text
box_id = estable
code_refs = recalculables
```

Esto debe quedar reflejado en FASE 4 y luego en la operativa de agentes.

---

## FASE 1 — Estado final

```yaml
phase: FASE_1
status: ready_for_phase_2
evidence_collected:
  - snapshot
  - function_ranges
  - bodyLLM_bucket_scan
  - hotspot_summary
  - tentative_corridor_ranges
  - confidence_levels
next_phase: FASE_2_HUMAN_FRIENDLY_MAPS
```

---

## Checklist FASE 1

- [x] Recalcular tamaño actual de `messageHandler.ts`.
- [x] Recalcular rangos actuales de funciones clave.
- [x] Recrear script `.runtime-analysis/function-size-map.mjs`.
- [x] Generar `.runtime-analysis/messageHandler_function_size_map.md`.
- [x] Recrear script `.runtime-analysis/analyze-bodyLLM.mjs`.
- [x] Generar `.runtime-analysis/bodyLLM_internal_scan.md`.
- [x] Obtener buckets internos actualizados de `bodyLLM`.
- [x] Extraer una síntesis de hotspots desde los buckets.
- [x] Definir rangos tentativos por caja/corredor.
- [x] Registrar nivel de confianza por rango.

```


```
