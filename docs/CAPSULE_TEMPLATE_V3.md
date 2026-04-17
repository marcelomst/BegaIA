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

IMPORTANTE:

- los archivos se referencian por nombre (no por path)
- ChatGPT Projects no preserva estructura de carpetas

REGLA:

- si hay conflicto entre esta cápsula y los documentos, prevalecen los documentos

---

### SÍNTESIS DEL SISTEMA (INVARIANTE)

Begasist es un runtime conversacional hotelero:

- centrado en `messageHandler`
- pipeline híbrido (determinista + semántico + estado persistido)
- ejecución por dominio
- uso de proyección canónica local como base operativa

La evolución del runtime está gobernada por ADRs.

---

### INVARIANTES ESTRUCTURALES (INVARIANTE)

- execution == source of truth
- 1 turno → 1 dominio dominante
- no multi-intent execution
- no inventar target ante ambigüedad

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

---

### ORQUESTACIÓN OPERATIVA (INVARIANTE)

AGPT:

- define hito
- consolida contexto
- propone clasificación documental cuando aplica
- orquesta el flujo entre agentes

Agentes VSCode Codex:

- ejecutan según su rol operativo vigente en `config.toml`

REGLA:

- AGPT orquesta
- los agentes ejecutan
- si hay conflicto operativo, prevalece `system_operating_model.md`

---

### METADATA OPERATIVA (VARIABLE)

Completar cuando corresponda:

- `agent_target`:
  - `asistente_tecnico`
  - `repo_guardian`
  - `hdoc`
  - `arquitecto_sistema`
  - `arquitecto_kb`

- `doc_classification_expected`:
  - `SOLO_HITO`
  - `HITO_PLUS_EVOLUTION`

- `flow_position`:
  - `analysis`
  - `implementation`
  - `audit`
  - `documentation`

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

### ESTADO ACTUAL (VARIABLE)

Describir:

- qué partes están alineadas
- qué partes ya fueron corregidas
- qué partes quedan pendientes

---

### PROBLEMA ACTUAL (VARIABLE)

Definir problema:

- observable
- reproducible
- acotado a un slice

---

### RIESGOS (INVARIANTE + VARIABLE)

CHECK:

- mezcla de datos entre reservas
- dominancia de helpers derivados
- inconsistencia con proyección canónica
- regresiones fuera del flujo principal
- duplicación de estado
- creación de fuente de verdad paralela
- expansión prematura de alcance

---

### OBJETIVO DEL FIX (VARIABLE)

Definir:

- qué comportamiento se corrige
- qué regla se refuerza

---

### DEFINICIÓN OPERATIVA (INVARIANTE)

Ruta auxiliar:

Construcción fuera del corredor canónico principal.

---

### CRITERIO DE VALIDEZ (INVARIANTE)

CHECK:

- consistencia con target canónico
- helpers solo complementan
- no mezcla de identidad
- sin impacto en flujos core
- tests sin regresión

---

### UBICACIÓN EN PIPELINE (VARIABLE)

Indicar:

- messageHandler
- post-action replies
- builders
- guards
- routing

---

### TAREA CONCRETA (VARIABLE)

- detectar punto exacto
- aislar construcción
- reemplazar lógica por canon
- mantener fallback si no hay canon
- validar con tests

---

### REGLA DE ORO (INVARIANTE)

RULE: CANONICAL_DOMINANCE

Si existe proyección canónica válida, ninguna respuesta puede construirse usando helpers derivados como fuente dominante.

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

CHECK:

- `messageHandler` sigue siendo runtime principal
- no hay runtime alternativo
- no hay duplicación de lógica
- no hay migración implícita
- no hay fuente de verdad paralela
- no hay expansión cross-domain no habilitada

SI ALGUNA RESPUESTA ES NO:

- la solución es inválida
- debe corregirse antes de proponerse

---

## NOTES

- Esta plantilla es deliberadamente estricta
- Su objetivo es reducir ambigüedad y drift
- No debe simplificarse sin justificación
