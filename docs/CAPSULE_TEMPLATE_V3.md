// Path: docs/CAPSULE_TEMPLATE_V3.md

# CAPSULE_TEMPLATE_V3

DOCUMENT_TYPE: WORK_TEMPLATE
SCOPE: CAPSULE_GENERATION
PRIORITY: HIGH
USAGE: EXPLICIT_INVOCATION_REQUIRED

---

## PURPOSE

Esta plantilla define el formato estándar para generar cápsulas de trabajo
consistentes, auditables y alineadas con:

- el System Operating Model
- la arquitectura viva del pipeline
- las decisiones estructurales (ADRs)
- la definición operativa vigente de agentes
- Runtime Map V1 cuando el trabajo afecte runtime conversacional

No es documentación del sistema.
Es una herramienta operativa para construir contexto portable entre chats.

---

## USAGE

Esta plantilla:

- NO se aplica automáticamente
- DEBE ser invocada explícitamente
- DEBE completarse usando el estado real del desarrollo

Ejemplo de invocación:

```text
Usar CAPSULE_TEMPLATE_V3.md como formato obligatorio.
Completarla con el estado actual del desarrollo.
```

---

## TEMPLATE

### OBJETIVO (VARIABLE)

Describir:

- problema actual
- etapa del desarrollo
- hito a ejecutar

Debe ser claro, acotado y ejecutable.

---

### CONTEXTO DOCUMENTAL (INVARIANTE)

Este trabajo debe evaluarse y ejecutarse alineado a:

- README.md → contexto general del sistema
- system_operating_model.md → contrato operativo (source of truth)
- message_pipeline.md → arquitectura viva del runtime
- ADR-PIPELINE-RUNTIME-TARGET.md → dirección evolutiva del runtime
- roadmap.md → etapa vigente del roadmap, restricciones de evolución y orden operativo actual
- hito_mcp_recent.md → contexto histórico reciente (no normativo)
- config.toml → definición operativa vigente de agentes en VSCode Codex
- Runtime Map V1 → mapa operativo de cajas, corredores, riesgos y code_refs cuando aplique

#### Runtime Map V1 — archivos de referencia cuando aplique

Cuando el trabajo afecte runtime conversacional, AGPT debe considerar estos archivos del Runtime Map V1 si están disponibles en la fuente del proyecto:

1. `00-box-index.md`
   - índice machine-friendly de cajas, `box_id`, relaciones, riesgos y alcance.

2. `00-code-index.md`
   - asociación entre cajas conceptuales y rangos reales de código.

3. `00-operating-protocol.md`
   - protocolo de uso del mapa entre AGPT, técnico, Guardian y HDOC.

4. `00-glossary.md`
   - definiciones compartidas: corredor, dominio, compuerta, fallback, code_refs, etc.

5. `00-snapshot.md`
   - baseline del análisis: commit, líneas, estado del working tree y bug conocido si aplica.

6. `02-bodyllm-level-2.md`
   - mapa human-friendly de `bodyLLM` como sub-runtime dominante.

7. `03-bodyllm-operational-corridors-level-3.md`
   - mapa de corredores operacionales dentro de `bodyLLM`.

8. `messageHandler_function_size_map.md`
   - evidencia recalculable de funciones y rangos principales.

9. `bodyLLM_internal_scan.md`
   - evidencia recalculable de buckets internos de `bodyLLM`.

REGLA:

- No pegar estos archivos completos dentro de la cápsula.
- La cápsula solo debe transportar el estado operativo mínimo.
- Si hay conflicto sobre cajas, consultar `00-box-index.md`.
- Si hay conflicto sobre rangos, consultar `00-code-index.md`.
- Si hay duda sobre vigencia de rangos, declarar `code_refs_status: needs_refresh`.

IMPORTANTE:

- los archivos se referencian por nombre
- ChatGPT Projects no preserva estructura de carpetas
- si la cápsula se usa fuera del repo local, incluir solo el contexto operativo mínimo

REGLA:

- si hay conflicto entre esta cápsula y los documentos, prevalecen los documentos
- si hay conflicto operativo, prevalece `system_operating_model.md`
- si hay conflicto sobre agentes, leer `config.toml`
- si hay conflicto sobre cajas runtime, refrescar Runtime Map V1 antes de usar `code_refs`

---

### SÍNTESIS DEL SISTEMA (INVARIANTE)

Begasist es un runtime conversacional hotelero:

- centrado en `messageHandler`
- pipeline híbrido (determinista + semántico + estado persistido)
- ejecución por dominio
- uso de proyección canónica local como base operativa
- gobierno por hitos atómicos, auditables y documentables

La evolución del runtime está gobernada por ADRs.

---

### INVARIANTES ESTRUCTURALES (INVARIANTE)

- execution == source of truth
- 1 turno → 1 dominio dominante
- no multi-intent execution
- no inventar target ante ambigüedad
- no crear runtimes paralelos sin ADR explícito
- no adelantar migraciones no habilitadas

CHECK:

- cualquier cambio debe respetar estos invariantes

---

### INVARIANTES DE RESERVA (INVARIANTE)

Jerarquía de verdad:

1. fuente externa
2. proyección canónica local
3. punteros de runtime
4. helpers derivados (`reservationSlots`, `nextSlots`, etc.)

RULE: CANONICAL_STATE_REQUIRED

FORBIDDEN:

- helpers derivados como fuente dominante si existe canon

CHECK:

- snapshot y replies deben alinearse al target canónico

---

### OPERATING MODEL (INVARIANTE)

RULE: ONE_COMMIT_PER_HITO  
RULE: TRACEABILITY_CHAIN  
RULE: HITO_SINGLE_INTENTION

FORBIDDEN: CROSS_DOMAIN_HITO

CHECK:

- el cambio debe ser:
  - atómico
  - trazable
  - sin mezcla de dominios
  - sin refactor encubierto
  - sin expansión de alcance

---

### ORQUESTACIÓN OPERATIVA (INVARIANTE)

AGPT:

- define hito
- consolida contexto
- propone clasificación documental cuando aplica
- orquesta el flujo entre agentes
- usa Runtime Map V1 cuando el trabajo afecta runtime conversacional

Agentes VSCode Codex:

- ejecutan según su rol operativo vigente en `config.toml`

REGLA:

- AGPT orquesta
- los agentes ejecutan
- Marcelo conserva la llave operativa del repo
- si hay conflicto operativo, prevalece `system_operating_model.md`

---

### REGLA DE ORQUESTACIÓN LOW-TOKEN (INVARIANTE)

AGPT NO debe transportar reasoning completo entre agentes.

DEBE transportar únicamente estado operativo mínimo:

- hito actual
- agent_target
- flow_position
- objetivo
- archivos afectados
- cajas runtime si aplica
- riesgos principales
- resultado del agente anterior
- evidencia mínima
- próximo paso

PROHIBIDO:

- copiar reasoning completo de agentes
- repetir system prompts
- duplicar reglas de `config.toml`
- incluir contexto histórico innecesario
- pegar diffs completos sin necesidad
- expandir explicaciones técnicas largas
- pegar todo Runtime Map V1 en la cápsula

PRINCIPIO:

> Los agentes ya conocen las reglas. AGPT solo transporta estado.

---

### METADATA OPERATIVA (VARIABLE)

Completar cuando corresponda:

```yaml
agent_target: <asistente_tecnico | repo_guardian | hdoc | arquitecto_sistema | arquitecto_kb>
flow_position: <analysis | implementation | audit | documentation>
doc_classification_expected: <SOLO_HITO | HITO_PLUS_EVOLUTION | N/A>
hito_id: <HITO_ID | pendiente>
branch: <branch_si_aplica>
```

---

### ADR CONSTRAINTS (INVARIANTE)

Ref: ADR-PIPELINE-RUNTIME-TARGET.md

CHECK:

- respetar runtime vigente
- no introducir nuevos runtimes
- no duplicar lógica
- no adelantar migraciones no habilitadas

REGLA:

- la evolución estructural solo ocurre bajo ADR explícito

---

### RUNTIME MAP CONTEXT (VARIABLE)

Completar esta sección cuando el trabajo afecte:

- `messageHandler.ts`
- `bodyLLM`
- reservas
- fechas
- slots
- confirmaciones
- fallback
- graph/classifier/policy
- persistencia conversacional
- copy por canal
- bugs de runtime

Si no aplica:

```yaml
runtime_map:
  applies: false
```

Si aplica:

```yaml
runtime_map:
  applies: true
  version: runtime-map-v1
  baseline_commit: <commit_base_si_aplica>
  baseline_status: <estado_del_snapshot_si_aplica>
  code_refs_status: <fresh | needs_refresh | unknown>
```

---

### ACTIVE RUNTIME BOXES (VARIABLE)

Completar solo si `runtime_map.applies: true`.

```yaml
runtime_boxes_impacted:
  - <box_id>

runtime_boxes_related:
  - <box_id>

runtime_boxes_forbidden:
  - <box_id>
```

Ejemplo:

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
```

REGLA:

```text
Si el trabajo toca bodyLLM, no alcanza con decir bodyLLM.
Debe declarar caja específica debajo de bodyLLM.
```

---

### RUNTIME RISK TAGS (VARIABLE)

Completar si el trabajo afecta runtime.

```yaml
risk_tags:
  - <risk_tag>
```

Tags frecuentes:

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
create_vs_modify_contamination
destructive_action
semantic_override
```

---

### RUNTIME CODE REFS (VARIABLE)

Completar si hay rangos frescos o útiles.

```yaml
code_refs:
  - file: <path>
    range: <Lx-Ly | needs_refresh>
    confidence: <high | medium | low | needs_refresh>
```

Regla:

```text
box_id = estable
code_refs = recalculables
```

Si el código cambió desde el snapshot:

```yaml
code_refs:
  - file: lib/handlers/messageHandler.ts
    range: needs_refresh
    confidence: needs_refresh
```

---

### PARITY TESTS REQUIRED (VARIABLE)

Completar si el hito es bugfix sensible de runtime.

```yaml
parity_tests_required:
  - <test esperado>
```

Ejemplo:

```yaml
parity_tests_required:
  - observable reply
  - preserved state
  - no forbidden action
  - no contamination across related boxes
```

Regla:

```text
Todo fix sensible de runtime debe tener test de paridad.
```

---

### ESTADO ACTUAL (VARIABLE)

Describir:

- qué partes están alineadas
- qué partes ya fueron corregidas
- qué partes quedan pendientes
- si el working tree está limpio o dirty
- si la suite está verde, roja o no ejecutada
- si hay bug manual conocido no cubierto

Ejemplo:

```yaml
current_state:
  working_tree: dirty
  suite: green
  known_manual_bug: true
  next_step: preparar hito técnico
```

---

### PROBLEMA ACTUAL (VARIABLE)

Definir problema:

- observable
- reproducible
- acotado a un slice
- con respuesta actual y esperada si aplica

Ejemplo:

```text
El runtime interpreta una fecha marcada explícitamente como checkOut
como si fuera checkIn dentro del create flow.
```

---

### RIESGOS (INVARIANTE + VARIABLE)

CHECK general:

- mezcla de datos entre reservas
- dominancia de helpers derivados
- inconsistencia con proyección canónica
- regresiones fuera del flujo principal
- duplicación de estado
- creación de fuente de verdad paralela
- expansión prematura de alcance
- refactor encubierto

CHECK runtime si aplica:

- precedencia alterada
- date repair aplicado al slot equivocado
- create captura modify
- snapshot abre create flow
- fallback ejecuta acción sensible
- copy por canal cambia sin declararse
- estado correcto con respuesta incorrecta
- respuesta correcta con estado incorrecto

---

### OBJETIVO DEL FIX (VARIABLE)

Definir:

- qué comportamiento se corrige
- qué regla se refuerza
- qué cajas no deben tocarse
- qué tests deben proteger el cambio

Ejemplo:

```text
Corregir la atribución de checkOut explícito en create flow,
sin afectar modify, cancel ni snapshot,
y con test de paridad sobre respuesta observable y estado preservado.
```

---

### DEFINICIÓN OPERATIVA (INVARIANTE)

Ruta auxiliar:

Construcción fuera del corredor canónico principal.

Cuando aplique Runtime Map:

```text
Bug → caja conceptual → código real → riesgos → tests → fix mínimo
```

---

### CRITERIO DE VALIDEZ (INVARIANTE)

CHECK general:

- consistencia con target canónico
- helpers solo complementan
- no mezcla de identidad
- sin impacto en flujos core no declarados
- tests sin regresión

CHECK runtime si aplica:

- cajas impactadas declaradas
- cajas relacionadas revisadas
- cajas prohibidas respetadas
- risk_tags cubiertos
- tests de paridad presentes
- no hay refactor amplio sin hito explícito

---

### UBICACIÓN EN PIPELINE (VARIABLE)

Indicar:

- messageHandler
- preLLM
- bodyLLM
- decisión de turno
- corredor operacional
- post-action replies
- builders
- guards
- routing
- fallback
- posLLM
- persistencia + reply

Si aplica, usar `box_id`.

Ejemplo:

```yaml
pipeline_location:
  - runtime.messageHandler.bodyLLM.turnDecision
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
```

---

### TAREA CONCRETA (VARIABLE)

Debe ser:

- específica
- acotada
- ejecutable
- compatible con el agent_target
- sin expansión de alcance

Ejemplo runtime:

```text
Implementar fix mínimo dentro de las cajas declaradas para evitar que una fecha
marcada como checkOut sea reinterpretada como checkIn. Agregar test de paridad.
No tocar cancel ni snapshot.
```

---

### OUTPUT ESPERADO (VARIABLE)

Definir qué debe devolver el agente.

Para `asistente_tecnico` runtime:

```text
1. PROBLEMA
2. CAUSA
3. SOLUCIÓN
4. RIESGOS
5. CAMBIOS
6. DIFF
7. RUNTIME_BOXES_TOUCHED
8. RUNTIME_BOXES_REVIEWED
9. RUNTIME_BOXES_NOT_TOUCHED
10. TESTS
11. READY_FOR_GUARDIAN
```

Para `repo_guardian` runtime:

```text
1. STATUS
2. VALIDACIÓN
3. PUREZA DEL HITO
4. RUNTIME_BOXES_AUDIT
5. TESTS
6. RIESGOS
7. CLASIFICACIÓN DOCUMENTAL
8. CANONICIDAD
9. COMMIT SUGERIDO
10. READY_FOR_HDOC
```

Para `hdoc`:

```text
validar commit
validar hash
validar push
clasificar cierre documental
documentar si corresponde
```

---

### REGLA DE ORO (INVARIANTE)

RULE: CANONICAL_DOMINANCE

Si existe proyección canónica válida, ninguna respuesta puede construirse usando helpers derivados como fuente dominante.

Regla runtime complementaria:

```text
No fix de runtime sin caja.
No fix sensible sin test de paridad.
```

---

### AUTO-CHECK FINAL (OBLIGATORIO)

Antes de proponer solución, validar:

1. ¿Viola RULE: CANONICAL_STATE_REQUIRED?
2. ¿Viola FORBIDDEN: CROSS_DOMAIN_HITO?
3. ¿Cumple RULE: HITO_SINGLE_INTENTION?
4. ¿Respeta el runtime vigente según ADR-PIPELINE-RUNTIME-TARGET.md?
5. ¿Respeta la jerarquía de verdad?
6. ¿Respeta el contrato operativo vigente de `system_operating_model.md`?
7. ¿Está alineado con el rol operativo del `agent_target` definido?
8. Si aplica runtime, ¿declara cajas impactadas?
9. Si aplica runtime sensible, ¿declara tests de paridad?
10. Si aplica runtime, ¿declara cajas prohibidas cuando corresponde?

CHECK:

- `messageHandler` sigue siendo runtime principal
- no hay runtime alternativo
- no hay duplicación de lógica
- no hay migración implícita
- no hay fuente de verdad paralela
- no hay expansión cross-domain no habilitada
- no hay refactor encubierto

SI ALGUNA RESPUESTA ES NO:

- la solución es inválida
- debe corregirse antes de proponerse

---

## NOTES

- Esta plantilla es deliberadamente estricta.
- Su objetivo es reducir ambigüedad y drift.
- No debe simplificarse sin justificación.
- Runtime Map V1 no debe pegarse completo dentro de una cápsula.
- Las cápsulas transportan estado operativo, no razonamiento completo.
