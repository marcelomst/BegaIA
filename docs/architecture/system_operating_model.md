# System Operating Model

DOCUMENT_TYPE: OPERATING_MODEL  
PRIORITY: MAX  
SCOPE: GLOBAL  
ENFORCEMENT: STRICT

---

## PURPOSE

Este documento define el contrato operativo obligatorio para construir y mantener el sistema con:

- trazabilidad completa
- separación estricta de roles
- cambios verificables

SOURCE_OF_TRUTH: TRUE

SOURCE_OF_TRUTH_SCOPE:

- disciplina de trabajo
- secuencia `CODE -> COMMIT -> HASH -> PUSH -> DOC`
- roles y límites entre Marcelo, ChatGPT y agentes
- reglas de cierre documental

---

## GOVERNANCE_REFERENCE

ADR: ADR-DOC-GOVERNANCE-01

DEFINE:

- historia
- arquitectura viva
- operación
- decisiones estructurales

---

## OBJECTIVES

- preservar coherencia arquitectonica
- sostener disciplina Git estricta
- asegurar trazabilidad entre codigo, commit y documentacion
- coordinar el trabajo entre Marcelo, ChatGPT y agentes

---

## PRINCIPLES (GUIDELINES)

GUIDELINE: SEPARATION_OF_CONCERNS

- separar pensar, ejecutar y controlar

GUIDELINE: SMALL_CHANGES

- mantener cambios pequeños, auditables y reversibles

GUIDELINE: EVIDENCE_OVER_OPINION

- privilegiar evidencia sobre opinion

GUIDELINE: NO_PARTIAL_CLOSURE

- no cerrar hitos sin commit, hash y push reales

---

## ROLES

### ROLE: MARCELO

MUST:

- ejecutar exclusivamente comandos Git de escritura
- decidir avance de cambios
- ejecutar comandos manualmente uno por vez
- devolver output real

FORBIDDEN:

- delegar ejecucion de Git write

---

### ROLE: CHATGPT

MUST:

- definir arquitectura y orquestacion
- definir hitos
- generar prompts
- validar conceptualmente

FORBIDDEN:

- escribir codigo productivo fuera del flujo
- ejecutar Git write

---

### ROLE: AGENT.ASISTENTE_TECNICO

MUST:

- implementar cambios
- debuggear
- validar con tests

FORBIDDEN:

- romper contratos sin instruccion explicita
- iniciar refactors grandes sin plan

---

### ROLE: AGENT.ARQUITECTO_SISTEMA

MUST:

- tomar decisiones estructurales
- analizar acoplamientos y riesgos

FORBIDDEN:

- reemplazar runtime sin evidencia
- inventar componentes o archivos

---

### ROLE: AGENT.REPO_GUARDIAN

MUST:

- auditar working tree
- validar pureza del hito
- sugerir commit

FORBIDDEN:

- modificar codigo
- ejecutar Git write

RULE: ONE_COMMIT_PER_HITO

---

### ROLE: AGENT.HDOC

MUST:

- validar cierre documental
- mantener hito_mcp.md
- asegurar consistencia codigo/commit/doc

FORBIDDEN:

- documentar sin evidencia
- inventar commits/hashes/pushes
- ejecutar Git write

RULE: TRACEABILITY_CHAIN

FLOW:
CODE -> COMMIT -> HASH -> PUSH -> DOC

---

## OPERATIONAL_FLOW

FLOW: STANDARD_SEQUENCE

1. ChatGPT define problema/hito
2. AGENT.ARQUITECTO evalua contexto estructural
3. AGENT.ASISTENTE_TECNICO implementa
4. AGENT.REPO_GUARDIAN audita
5. MARCELO ejecuta Git
6. AGENT.HDOC documenta

---

## HITO_RULES

RULE: HITO_SINGLE_INTENTION

- un hito tiene una sola intencion tecnica

RULE: HITO_EXPLAINABLE

- debe poder explicarse en una frase

RULE: HITO_REVERSIBLE

- debe poder revertirse sin daño colateral

FORBIDDEN: CROSS_DOMAIN_HITO

- no mezclar PIPELINE, KB, MCP, ADMIN u otras capas

CHECK: HITO_SCOPE_VALIDATION
IF:

- el diff contiene multiples responsabilidades

THEN:

- dividir el hito antes del commit

---

## HITO_NAMING

FORMAT:
TIPO-DOMINIO-SUBDOMINIO-TEMA-NN

EXAMPLES:

- FIX-PIPELINE-CREATE-QUOTE-GATING-02
- REF-PIPELINE-FOCUS-CONTINUATION-01
- DOC-ARCHITECTURE-CANONICAL-STATE-GOVERNANCE-01

ALLOWED_TYPES:

- FIX = corrige comportamiento incorrecto
- FEAT = agrega capacidad nueva
- REF = refina modelo, estructura o gobernanza sin cambiar el objetivo funcional principal
- DOC = cambia documentación, criterios o gobernanza documental

STRUCTURE_RULES:

- el segundo bloque identifica el dominio principal
- los bloques siguientes identifican el slice y el problema real
- el sufijo numérico se incrementa cuando se retoma el mismo tema en un hito nuevo

RULE: HITO_NAME_CONSISTENCY

- debe coincidir en:
  - repo_guardian
  - commit
  - push
  - hdoc
- el nombre del hito debe reflejar el alcance real del diff
- si el diff cambia de alcance, el nombre debe ajustarse antes del commit

FORBIDDEN: GENERIC_NAMING

- no usar fix(), feat(), etc

CHECK: HITO_NAME_VALIDATION
IF:

- el nombre requiere "y ademas"

THEN:

- hay mezcla de hitos

RULE: HITO_NAME_SEMANTIC_DEFENSE

- el nombre debe poder explicar una sola responsabilidad clara
- el nombre debe ser defendible arquitectónicamente

RULE: HITO_NAME_TRACEABILITY

- el identificador del hito vive dentro del mensaje de commit
- si no se commitea aislado, no existe como hito

---

## CANONICAL_REPRESENTATION

RULE: CANONICAL_STATE_REQUIRED

- el estado es la fuente de verdad
- no duplicar estructuras
- operar sobre entidades consistentes

FORBIDDEN:

- modificar runtime sin ADR
- introducir capas paralelas
- generalizar cross-domain prematuramente

---

## GIT_RULES

RULE: MARCELO_EXCLUSIVE_WRITE

- solo Marcelo ejecuta Git write

RULE: SINGLE_COMMAND

- comandos Git se dan uno por vez

FORBIDDEN:

- asumir ejecucion sin output real

---

## DOCUMENTATION_RULES

FORBIDDEN:

- documentar sin commit
- documentar sin hash
- documentar sin push
- no cerrar hitos incompletos
- no duplicar hitos ya documentados

RULE: DOC_TYPES

- historica → hito_mcp.md
- arquitectura viva → docs/architecture/*.md
- operativa → system_operating_model.md y documentos operativos asociados
- ADR → decisiones estructurales estables
- artefactos derivados → diagramas e imágenes, no fuente primaria

---

## DOCUMENTATION_CLASSIFICATION

TYPE: SOLO_HITO

APPLIES_IF:

- cambio local
- sin impacto estructural

---

TYPE: HITO_PLUS_EVOLUTION

APPLIES_IF:

- introduce regla de runtime
- define jerarquia
- crea slice
- cambia comportamiento observable

EXAMPLE_SLICES:

- domain governance
- fallback governance
- reference lifecycle
- modify substate

RULE: DOUBT_RESOLUTION

- en duda → usar HITO_PLUS_EVOLUTION

GOAL:

- evitar que la documentación refleje solo eventos aislados
- asegurar que capture la evolución del comportamiento del sistema

---

## COMMIT_GRANULARITY

RULE: ONE_HITO_ONE_COMMIT

FORBIDDEN:

- fragmentar commits del mismo hito

CHECK: COMMIT_FRAGMENTATION
IF:

- multiples commits mismo hito

THEN:

- consolidar antes de commit

RATIONALE:

- priorizar claridad histórica sobre granularidad técnica
- detectar fragmentación innecesaria antes del commit
- no fragmentar documentación o cambios estructurales sin justificación real

APPLIES_TO:

- código
- documentación
- arquitectura
- prompts

NOTE:

- no requiere reescritura de historial existente
- aplica hacia adelante

---

## RELATED_DOCS

- channel_map.md
- chat_naming_standard.md
- prompts_new_chats.md
- hito_mcp.md
