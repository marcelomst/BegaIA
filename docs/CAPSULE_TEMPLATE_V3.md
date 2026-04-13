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

No es documentación del sistema.  
Es una herramienta operativa para construir contexto portable entre chats.

---

## USAGE

Esta plantilla:

- NO se aplica automáticamente
- DEBE ser invocada explícitamente
- DEBE completarse usando el estado real del desarrollo

Ejemplo de invocación:

Usar CAPSULE_TEMPLATE_V3.md como formato obligatorio.  
Completarla con el estado actual del desarrollo.

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

- README.md
- system_operating_model.md
- message_pipeline.md
- ADR-PIPELINE-RUNTIME-TARGET.md
- hito_mcp_recent.md
- fixes-operational-rule-runtime-evolution.md

REGLA:

- si hay conflicto entre esta cápsula y los documentos, prevalecen los documentos

---

### SÍNTESIS DEL SISTEMA (INVARIANTE)

Begasist es un runtime conversacional hotelero:

- centrado en `messageHandler`
- pipeline híbrido (determinista + semántico + estado persistido)
- ejecución por dominio
- uso de proyección canónica local como base operativa

El graph interpreta y enruta, pero no gobierna el runtime completo.

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

### REGLA OPERATIVA DE FIXES (INVARIANTE CRÍTICO)

Ref: fixes-operational-rule-runtime-evolution.md

RULE:

Todo fix manual debe corregir el comportamiento observado y dejar la regla más explícita, más canónica y menos repartida que antes.

IMPLICACIONES OBLIGATORIAS:

- no introducir lógica ad hoc aislada
- no duplicar reglas en múltiples capas
- mover la lógica hacia el punto más canónico posible
- hacer la regla más visible, entendible y testeable
- reducir ambigüedad y branching implícito

FORBIDDEN:

- fixes que solo “parchan” sin mejorar la forma del runtime
- excepciones escondidas en `messageHandler`
- heurísticas que compiten con estado canónico

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

---

### OBJETIVO DEL FIX (VARIABLE)

Definir:

- qué comportamiento se corrige
- qué regla se vuelve más explícita, más canónica o menos repartida

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
- la regla es más explícita que antes
- se reduce duplicación o dispersión de lógica

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
- mover lógica al punto canónico
- eliminar duplicación
- mantener fallback si no hay canon
- validar con tests

---

### REGLA DE ORO (INVARIANTE)

RULE: CANONICAL_DOMINANCE

Si existe proyección canónica válida, ninguna respuesta puede construirse usando helpers derivados como fuente dominante.

---

### AUTO-CHECK FINAL (OBLIGATORIO)

Antes de proponer solución, validar:

1. ¿Corrige el comportamiento observado?
2. ¿La regla quedó más explícita que antes?
3. ¿Se redujo la duplicación o dispersión de lógica?
4. ¿La decisión se apoya más en estado canónico que en heurísticas?
5. ¿Respeta el runtime vigente según ADR?
6. ¿El fix mejora la forma del sistema y no solo el síntoma?

SI ALGUNA RESPUESTA ES NO:

- la solución es inválida
- debe corregirse antes de proponerse

---

## NOTES

- Esta plantilla es deliberadamente estricta
- Su objetivo es reducir ambigüedad y drift
- Cada fix debe mejorar el sistema, no solo corregirlo
- La acumulación de fixes define la evolución del runtime
