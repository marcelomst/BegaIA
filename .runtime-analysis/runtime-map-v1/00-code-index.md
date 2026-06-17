// Path: .runtime-analysis/runtime-map-v1/00-code-index.md

# Runtime Map V1 — Code Index

## Propósito

Este archivo asocia el Runtime Map V1 con evidencia de código real.

No define todavía `box_id` definitivos.  
No reemplaza el `00-box-index.md`.  
No autoriza refactor.  
No modifica arquitectura.

Su objetivo es servir como puente entre:

```text
mapas human-friendly
  ↓
rangos reales de código
  ↓
box-index machine-friendly
  ↓
hitos técnicos con alcance controlado
```

---

## Regla principal

```text
box_id = estable
code_refs = recalculables
```

Este archivo registra `code_refs` actuales para el estado commiteado analizado.

Si `messageHandler.ts` cambia, este archivo debe refrescarse antes de usar sus rangos como evidencia para un hito técnico.

Para el hito `3d7d7c2`, Guardian confirmó:

```yaml
code_refs_status: needs_refresh
runtime_map_refresh_required: true
```

Por eso:

- los rangos top-level de `messageHandler.ts` se recalculan para el estado nuevo
- se registra la continuidad compuesta de `modify` con habitación + huéspedes
- la policy efectiva preserva guards de capacidad e idioma conversacional

---

## Snapshot base

```yaml
map_id: runtime-map-v1
repo: /home/marcelo/begasist
base_file: lib/handlers/messageHandler.ts
commit_base: 3d7d7c2
messageHandler_lines: 11064
working_tree_status: clean
analysis_scope: commit_3d7d7c200fa76ee2ad85d0aea08c22eeba239605
baseline_status: committed_fix_pushed_runtime_map_refresh_applied_v13
known_manual_bug: none
```

---

## Suite local informada

```text
pnpm vitest run test/unit/messageHandler.reference_resolution.spec.ts
result: 73 passed
pnpm vitest run test/unit/messageHandler.cross_domain_intent_prioritization.spec.ts
result: 11 passed
pnpm test
Test Files 161 passed (161)
Tests 813 passed (813)
```

Nota:

```text
Los tests dirigidos en verde no implican ausencia de bugs funcionales.
Este refresh documenta un fix de continuidad compuesta de `modify` con guards de
capacidad e idioma unificado, pero no elimina el riesgo de futuros bugs funcionales fuera de
cobertura.
```

---

## Fuentes de evidencia usadas

```text
.runtime-analysis/function-size-map.mjs
.runtime-analysis/messageHandler_function_size_map.md
.runtime-analysis/analyze-bodyLLM.mjs
.runtime-analysis/bodyLLM_internal_scan.md
.runtime-analysis/runtime-map-v1/01-phase-1-evidence-summary.md
```

---

## 1. Archivo principal

```yaml
file: lib/handlers/messageHandler.ts
total_lines: 11064
role: runtime_conversacional_principal
confidence: high
```

Lectura:

```text
messageHandler.ts sigue siendo el runtime principal vigente en el commit
`3d7d7c2`.
```

---

## 2. Funciones clave detectadas

| Función                              |       Rango | Líneas | Confianza | Lectura                                    |
| ------------------------------------ | ----------: | -----: | --------- | ------------------------------------------ |
| `buildReservationCanonicalState`     | L1645-L2119 |    475 | high      | Proyección canónica de estado de reserva   |
| `resolveReservationReference`        | L2120-L2452 |    333 | high      | Resolución de referencia a reserva         |
| `detectDominantTurnDomain`           | L2453-L2736 |    284 | high      | Detección de dominio dominante             |
| `getReservationDomainLockSignal`     | L2737-L2908 |    172 | high      | Señal de domain lock para reservas         |
| `shouldUseReservationLocalFallback`  | L2909-L2961 |     53 | high      | Decisión de fallback local de reservas     |
| `buildReservationLocalFallbackReply` | L2962-L3098 |    137 | high      | Construcción de fallback local de reservas |
| `assessReservationDateCoherence`     | L3099-L3578 |    480 | high      | Evaluación de coherencia temporal          |
| `tryStructuredAnalyze`               | L3579-L3766 |    188 | high      | Análisis estructurado semántico            |
| `preLLM`                             | L3767-L3996 |    230 | high      | Preparación de contexto y estado           |
| `bodyLLM`                            | L4509-L10245 |   5737 | high      | Sub-runtime dominante                      |
| `posLLM`                             | L10695-L10738 |     44 | high      | Verificación / verdict / cierre            |
| `handleIncomingMessage`              | L10740-L11064 |    325 | high      | Entrypoint público del runtime             |

---

## 3. Etapas principales del runtime

### handleIncomingMessage

```yaml
name: handleIncomingMessage
range: L10740-L11064
lines: 325
confidence: high
role: public_entrypoint
```

Lectura:

```text
Puerta pública hacia el runtime conversacional.
Aunque es pequeño, es importante como frontera de entrada.
```

---

### preLLM

```yaml
name: preLLM
range: L3767-L3996
lines: 230
confidence: high
role: context_preparation
```

Responsabilidad conceptual:

```text
preparar contexto
recuperar estado conversacional
preparar historial
construir señales previas
entregar input enriquecido a bodyLLM
```

---

### bodyLLM

```yaml
name: bodyLLM
range: L4509-L10245
lines: 5737
confidence: high
role: dominant_sub_runtime
```

Responsabilidad conceptual:

```text
decidir la ruta operacional dominante
coordinar corredores internos
leer y escribir estado conversacional
aplicar compuertas
generar respuesta candidata
activar fallback o graph/classifier/policy cuando corresponde
```

Observación:

```text
bodyLLM no debe entenderse como "una llamada al LLM".
En el estado actual funciona como sub-runtime operacional.
```

---

### posLLM

```yaml
name: posLLM
range: L10695-L10738
lines: 44
confidence: high
role: post_runtime_verification
```

Responsabilidad conceptual:

```text
verdict
supervisión
cierre final
salida hacia canal
```

---

## 4. Helpers relevantes previos a bodyLLM

Estos helpers no están dentro del rango físico de `bodyLLM`, pero influyen en su decisión operacional.

### buildReservationCanonicalState

```yaml
name: buildReservationCanonicalState
range: L1465-L1502
confidence: high
related_boxes:
  - reservation.snapshot
  - reservation.modify
  - reservation.create
```

Lectura:

```text
Construye una visión canónica del estado de reserva.
Puede ser relevante para snapshot, confirmación, modificación y respuestas post-booking.
```

---

### resolveReservationReference

```yaml
name: resolveReservationReference
range: L1929-L2036
confidence: high
related_boxes:
  - reservation.modify
  - reservation.cancel
  - reservation.snapshot
```

Lectura:

```text
Resuelve a qué reserva se refiere el huésped.
Crítico para evitar modificar o cancelar la reserva equivocada.
```

---

### detectDominantTurnDomain

```yaml
name: detectDominantTurnDomain
range: L2262-L2321
confidence: high
related_boxes:
  - bodyLLM.turnDecision
```

Lectura:

```text
Aporta señales para decidir qué dominio domina el turno.
No debe confundirse con ejecución del dominio.
```

---

### getReservationDomainLockSignal

```yaml
name: getReservationDomainLockSignal
range: L2546-L2581
confidence: high
related_boxes:
  - bodyLLM.turnDecision
  - reservation.create
  - reservation.modify
  - faqPoliciesAmenities
```

Lectura:

```text
Ayuda a conservar o bloquear foco de reserva según el estado conversacional.
```

---

### shouldUseReservationLocalFallback

```yaml
name: shouldUseReservationLocalFallback
range: L2718-L2769
confidence: high
related_boxes:
  - fallbackLocal
  - bodyLLM.turnDecision
```

Lectura:

```text
Decide si puede usarse fallback local de reservas.
Debe ser tratado como compuerta sensible.
```

---

### buildReservationLocalFallbackReply

```yaml
name: buildReservationLocalFallbackReply
range: L2771-L2906
confidence: high
related_boxes:
  - fallbackLocal
  - reservation.create
  - reservation.snapshot
```

Lectura:

```text
Construye respuestas de fallback local.
Riesgo: puede generar una respuesta plausible desde la ruta equivocada.
```

---

### assessReservationDateCoherence

```yaml
name: assessReservationDateCoherence
range: L2908-L2921
confidence: high
related_boxes:
  - temporalRepair
  - reservation.create
  - reservation.modify
  - availabilityInquiry
```

Lectura:

```text
Evalúa coherencia temporal.
Es pequeño pero conceptualmente importante para bugs de fechas.
```

---

### tryStructuredAnalyze

```yaml
name: tryStructuredAnalyze
range: L3384-L3511
confidence: high
related_boxes:
  - bodyLLM.turnDecision
  - graphClassifierPolicy
  - reservation.create
  - availabilityInquiry
```

Lectura:

```text
Aporta lectura estructurada del mensaje.
Debe ser arbitrado por estado, foco y precedencia.
```

---

## 5. Buckets internos de bodyLLM

Rango completo:

```yaml
bodyLLM_range: L4509-L10245
bodyLLM_lines: 5737
bucket_size: 250
confidence: high_for_full_range
```

Tabla de buckets:

| Rango       | Top markers                                                                          | Returns | Awaits | Decisions | Temporal/check markers |
| ----------- | ------------------------------------------------------------------------------------ | ------: | -----: | --------: | ---------------------: |
| L4314-L4563 | date/temporal, structured analyze, create, reservationSlots, graph/classifier/policy |       5 |      3 |        13 |                     37 |
| L4564-L4813 | date/temporal, create, reservationSlots, state/result, modify, availability          |       7 |      7 |        15 |                     48 |
| L4814-L5063 | date/temporal, reservationSlots, create, state/result, modify, availability          |      10 |     10 |        23 |                     30 |
| L5064-L5313 | email/whatsapp copy, reservationSlots, date/temporal, modify, state/result           |      11 |     15 |        18 |                     14 |
| L5314-L5563 | email/whatsapp copy, modify, date/temporal, snapshot/verify, selected target         |       5 |     10 |        12 |                      5 |
| L5564-L5813 | date/temporal, reservationSlots, modify, snapshot/verify, state/result               |       8 |      6 |        10 |                     22 |
| L5814-L6063 | date/temporal, modify, reservationSlots, selected target, reply builders             |       5 |      6 |         7 |                     48 |
| L6064-L6313 | date/temporal, reservationSlots, modify, snapshot/verify, state/result               |      12 |     12 |        14 |                     50 |
| L6314-L6563 | create, date/temporal, reply builders, availability, reservationSlots                |      14 |      9 |        16 |                     21 |
| L6564-L6813 | create, date/temporal, reservationSlots, email/whatsapp copy, state/result           |      11 |     10 |        12 |                     46 |
| L6814-L7063 | email/whatsapp copy, reservationSlots, date/temporal, state/result                   |      11 |     21 |        29 |                     13 |
| L7064-L7313 | email/whatsapp copy, reservationSlots, cancel, date/temporal, state/result           |       8 |     28 |        20 |                     17 |
| L7314-L7563 | date/temporal, cancel, reply builders, selected target, reservationSlots             |      13 |     11 |        12 |                     22 |
| L7564-L7813 | reservationSlots, create, date/temporal, state/result, reply builders                |      17 |     10 |        20 |                     12 |
| L7814-L8063 | reservationSlots, snapshot/verify, date/temporal, reply builders, canonical state    |      12 |      8 |        15 |                     36 |
| L8064-L8313 | billing, reply builders, reservationSlots, graph/classifier/policy, date/temporal    |       7 |      7 |        12 |                     10 |
| L8314-L8563 | graph/classifier/policy, reservationSlots, fallback, state/result, create            |       1 |      7 |        12 |                      3 |
| L8564-L8813 | date/temporal, modify, reservationSlots, email/whatsapp copy, create                 |       5 |      7 |        11 |                     37 |
| L8814-L9063 | date/temporal, create, reservationSlots, modify, state/result                        |       8 |      5 |        29 |                     32 |
| L9064-L9313 | create, reservationSlots, date/temporal, modify, state/result                        |       4 |     11 |        24 |                     14 |
| L9314-L9367 | create, reservationSlots, snapshot/verify, graph/classifier/policy, date/temporal    |       1 |      1 |         2 |                      6 |

---

## 6. Hotspots por marcador

### date/temporal

Buckets de alta densidad:

```text
L4314-L4563
L4564-L4813
L5814-L6063
L6064-L6313
L6564-L6813
L8564-L8813
L8814-L9063
```

Lectura:

```text
La lógica temporal está distribuida.
No vive en un único punto.
```

Riesgo:

```text
Un fix de fechas aplicado en una zona puede ser contradicho por otra zona posterior.
```

---

### create

Buckets de alta densidad:

```text
L4314-L4563
L4564-L4813
L6314-L6563
L6564-L6813
L7564-L7813
L9064-L9313
```

Lectura:

```text
reservation.create aparece en varias zonas, no como un bloque único.
```

Riesgo:

```text
Create puede ser capturado por fast paths, continuidad de focus, fallback o confirmación.
```

---

### modify

Buckets de alta densidad:

```text
L5064-L5313
L5564-L5813
L5814-L6063
L6064-L6313
L8564-L8813
```

Lectura:

```text
modify está especialmente mezclado con fechas, target y reservationSlots.
```

Riesgo:

```text
Un ajuste pensado para create puede contaminar modify.
```

---

### cancel

Buckets principales:

```text
L7064-L7313
L7314-L7563
```

Lectura:

```text
cancel parece más concentrado que create y modify.
```

Riesgo:

```text
Aunque está más localizado, sigue dependiendo de target y confirmación.
```

---

### snapshot/verify

Buckets principales:

```text
L5314-L5563
L5564-L5813
L6064-L6313
L7814-L8063
L9314-L9367
```

Lectura:

```text
snapshot/verify tiene un núcleo visible cerca de L7814-L8063,
pero aparece mezclado con modify y temporalidad.
```

---

### email/whatsapp copy

Buckets principales:

```text
L5064-L5313
L5314-L5563
L6814-L7063
L7064-L7313
```

Lectura:

```text
La composición de copy por canal cruza zonas de reserva, snapshot y cancel.
```

---

### graph/classifier/policy

Buckets principales:

```text
L4314-L4563
L4564-L4813
L8314-L8563
L9314-L9367
```

Lectura:

```text
La capa graph/classifier/policy aparece como fallback, escalamiento o apoyo semántico dentro de bodyLLM.
```

---

### fallback

Bucket principal:

```text
L8314-L8563
```

Lectura:

```text
Fallback local parece concentrado cerca de graph/classifier/policy.
```

---

## 7. Rangos tentativos por zona conceptual

Estos rangos son orientativos.

No son fronteras físicas definitivas.  
No significan que exista un módulo separado.  
No autorizan extracción.

| Zona conceptual                                             |       Rango | Confianza | Evidencia                                                          |
| ----------------------------------------------------------- | ----------: | --------- | ------------------------------------------------------------------ |
| Fast paths iniciales / structured analyze / create temporal | L4314-L4813 | medium    | date/temporal, create, structured analyze, availability, decisions |
| Modify corridor / selected target / reparación temporal     | L5064-L6313 | medium    | modify, selected target, reservationSlots, date/temporal           |
| Create / availability / quote / proposal                    | L6314-L6813 | medium    | create, availability, date/temporal, confirm, reply builders       |
| Copy corridor / channel-specific replies                    | L6814-L7313 | medium    | email/whatsapp copy, awaits, reservationSlots                      |
| Cancel corridor                                             | L7064-L7563 | medium    | cancel, selected target, confirm, reply builders                   |
| Snapshot / canonical reply                                  | L7814-L8063 | medium    | snapshot/verify, canonical state, reply builders, reservationSlots |
| Billing / Support / FAQ / Graph / Fallback                  | L8064-L8563 | medium    | billing, graph/classifier/policy, fallback, reply builders         |
| Late temporal repair / final create cleanup                 | L8564-L9367 | low       | date/temporal, create, modify, reservationSlots, cierre            |

---

## 8. Confianza de rangos

```yaml
confidence:
  high:
    meaning: rango detectado por firma clara de función o evidencia directa
  medium:
    meaning: rango inferido por densidad de markers y coherencia conceptual
  low:
    meaning: rango probable pero mezclado con otras responsabilidades
  needs_refresh:
    meaning: rango que debe recalcularse porque el archivo cambió
```

Regla:

```text
Los rangos high pueden usarse como referencia fuerte.
Los rangos medium deben usarse como orientación.
Los rangos low requieren inspección manual antes de diseñar un hito.
```

---

## 9. Uso esperado de este Code Index

Este archivo debe usarse para:

```text
1. ubicar zonas de lectura
2. preparar box-index machine-friendly
3. diseñar hitos con alcance más preciso
4. pedir tests de paridad
5. evitar prompts genéricos del tipo "corregir messageHandler.ts"
```

Ejemplo de uso correcto:

```text
El bug parece impactar:
- decisión de turno
- reparación temporal
- reservation.create

Code refs candidatos:
- L4314-L4813
- L6314-L6813
- L8564-L9367

Confianza:
- medium para los dos primeros
- low para la zona final
```

---

## 10. Qué NO permite este Code Index

Este archivo no permite:

```text
extraer módulos automáticamente
hacer refactors amplios
tratar rangos medium como exactos
usar líneas viejas después de cambios
ignorar tests de paridad
```

---

## 11. Reglas para mantenerlo actualizado

Actualizar este archivo cuando:

```text
messageHandler.ts cambie significativamente
bodyLLM cambie de rango
se agregue o elimine un corredor conceptual
un hito modifique zonas internas relevantes
Guardian detecte que un fix tocó cajas no previstas
```

Para refrescar evidencia:

```bash
cd /home/marcelo/begasist

node .runtime-analysis/function-size-map.mjs lib/handlers/messageHandler.ts \
  > .runtime-analysis/messageHandler_function_size_map.md

node .runtime-analysis/analyze-bodyLLM.mjs lib/handlers/messageHandler.ts <BODY_START> <BODY_END> 250 \
  > .runtime-analysis/bodyLLM_internal_scan.md
```

Luego actualizar:

```text
00-snapshot.md
01-phase-1-evidence-summary.md
00-code-index.md
00-box-index.md
```

---

## Estado

```yaml
phase: FASE_3
artifact: 00-code-index.md
status: ready_for_box_index
next_artifact: 00-box-index.md
```
