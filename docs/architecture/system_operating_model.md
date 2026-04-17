// Path: docs/architecture/system_operating_model.md

# System Operating Model

DOCUMENT_TYPE: OPERATING_MODEL
PRIORITY: MAX
SCOPE: GLOBAL
ENFORCEMENT: STRICT

---

## PURPOSE

Este documento define el contrato operativo obligatorio para construir y mantener el sistema con:

- trazabilidad completa
- separación estricta de rolescapsule
- cambios verificables

SOURCE_OF_TRUTH: TRUE

SOURCE_OF_TRUTH_SCOPE:

- disciplina de trabajo
- secuencia `CODE -> COMMIT -> HASH -> PUSH -> DOC`
- roles y límites entre Marcelo, ChatGPT y agentes
- reglas de cierre documental

---

## AGENT RUNTIME SOURCE OF TRUTH

La definición operativa vigente de agentes NO vive exclusivamente en este documento.

La fuente de verdad para:

- definición de agentes
- modelos utilizados
- prompts de sistema
- límites operativos de cada agente

es:

- `/home/marcelo/.codex/config.toml`

REGLA:

- `system_operating_model.md` define el contrato global de operación
- `config.toml` define la implementación operativa concreta de agentes en VSCode Codex

Si existe conflicto:

- prevalece el contrato del operating model
- la configuración activa de agentes debe leerse desde `config.toml`

---

## GOVERNANCE_REFERENCE

ADR: ADR-DOC-GOVERNANCE-01

---

## OBJECTIVES

- preservar coherencia arquitectonica
- sostener disciplina Git estricta
- asegurar trazabilidad entre codigo, commit y documentacion
- coordinar el trabajo entre Marcelo, ChatGPT y agentes

---

## PRINCIPLES (GUIDELINES)

GUIDELINE: SEPARATION_OF_CONCERNS
GUIDELINE: SMALL_CHANGES
GUIDELINE: EVIDENCE_OVER_OPINION
GUIDELINE: NO_PARTIAL_CLOSURE

---

## ORCHESTRATION MODEL

El sistema distingue dos niveles de orquestación:

### Nivel 1 — AGPT (ChatGPT App)

Responsabilidades:

- definir hitos
- interpretar Operating System (.md)
- decidir flujo entre agentes
- proponer clasificación documental
- consolidar contexto entre iteraciones

AGPT NO:

- ejecuta código
- audita diffs
- documenta cierres

---

### Nivel 2 — Agentes VSCode Codex

Definidos en:

- `/home/marcelo/.codex/config.toml`

Roles principales:

- asistente_tecnico → implementación
- repo_guardian → auditoría de hito
- hdoc → cierre documental
- arquitecto_sistema → análisis estructural profundo (on-demand)
- arquitecto_kb → análisis estructural de KB (on-demand)

REGLA:

- los agentes ejecutan
- AGPT orquesta

---

## AGPT HITO DISPATCH RULE (NEW)

AGPT DEBE emitir todos los hitos con asignación explícita de agente y fase operativa.

Esto elimina ambigüedad en la ejecución y evita dispatch incorrecto.

---

### CAMPOS OBLIGATORIOS EN CADA HITO

Todo hito definido por AGPT debe incluir:

- `agent_target`
- `flow_position`

---

### DEFINICIÓN DE CAMPOS

#### agent_target

Debe ser uno de:

- asistente_tecnico
- repo_guardian
- hdoc
- arquitecto_sistema
- arquitecto_kb

---

#### flow_position

Debe ser uno de:

- analysis
- implementation
- audit
- documentation

---

### REGLA DE ASIGNACIÓN

AGPT debe seleccionar el agente según el tipo dominante de trabajo:

- cambiar código → `asistente_tecnico`
- auditar hito/diff → `repo_guardian`
- cerrar documentalmente → `hdoc`
- entender problema estructural → `arquitecto_sistema`
- analizar KB/tokens/templates → `arquitecto_kb`

---

### REGLA DE COHERENCIA

Debe cumplirse:

- implementation → asistente_tecnico
- audit → repo_guardian
- documentation → hdoc
- analysis → arquitecto_sistema o arquitecto_kb

Si hay inconsistencia:

👉 el hito es inválido y debe corregirse antes de ejecutarse

---

### REGLA DE DESEMPATE

Si AGPT duda entre agentes:

- si el cambio ya está claro → asistente_tecnico
- si el problema no está completamente entendido → arquitecto_sistema
- si el código ya existe y se valida → repo_guardian
- si ya hay commit/hash/push → hdoc

---

### PROHIBICIÓN

AGPT NO puede emitir hitos sin:

- agent_target
- flow_position

---

### PRINCIPIO

> AGPT decide quién ejecuta antes de definir qué se ejecuta.

---

## ROLES

### ROLE: MARCELO

MUST:

- ejecutar exclusivamente comandos Git de escritura
- decidir avance de cambios
- ejecutar comandos manualmente uno por vez
- devolver output real

---

### ROLE: CHATGPT (AGPT)

MUST:

- definir arquitectura y orquestacion
- definir hitos
- generar prompts
- validar conceptualmente

FORBIDDEN:

- escribir codigo productivo
- ejecutar Git write

---

### ROLE: AGENT.ASISTENTE_TECNICO

MUST:

- implementar cambios
- debuggear
- validar con tests

---

### ROLE: AGENT.REPO_GUARDIAN

MUST:

- auditar working tree
- validar pureza del hito
- interpretar diff
- producir salida estructurada para HDOC
- sugerir commit

---

### ROLE: AGENT.HDOC

MUST:

- validar cierre documental
- mantener `hito_mcp.md`
- mantener `hito_mcp_recent.md` como recorte operativo de los últimos 10 hitos
- asegurar consistencia codigo/commit/doc
- consumir salida estructurada de Guardian

REGLA:

- `hito_mcp_recent.md` debe reflejar SIEMPRE los últimos 10 hitos documentados
- debe generarse a partir de `hito_mcp.md`
- no introduce información nueva
- no reemplaza el historial completo

PROPÓSITO:

- permitir a AGPT tener contexto reciente portable
- facilitar inicio de nuevos chats sin pérdida de trazabilidad reciente

---

## OPERATIONAL FLOW

### Flujo real operativo

AGPT → Técnico → AGPT → Guardian → HDOC → AGPT

Opcional:

AGPT → Arquitecto_sistema / Arquitecto_kb

---

## GUARDIAN → HDOC INTERFACE

PROBLEMA:

- duplicación de interpretación de diffs

REGLA:

> El diff se interpreta UNA sola vez en Guardian

---

### Salida obligatoria de Guardian

Debe incluir:

- hito_id
- hito_type
- scope_real
- archivos_afectados
- commit_name_sugerido
- doc_classification_proposed
- doc_rationale
- canonicality_impact
- canonicality_rationale
- architecture_docs_candidates
- ready_for_hdoc

---

### Regla para HDOC

HDOC:

- usa salida de Guardian como fuente primaria
- no reinterpreta diff completo

EXCEPCIÓN:

- inconsistencia
- duda documental
- conflicto de evidencia

---

## DOCUMENT CLASSIFICATION FLOW

1. AGPT propone clasificación
2. Guardian valida
3. HDOC consolida

REGLA:

- evidencia siempre prevalece

---

## ROADMAP_GOVERNANCE

El `roadmap.md` es un documento vivo, pero su actualización debe seguir una
autoridad explícita.

NOTA:

El detalle operativo del checkpoint arquitectónico y las condiciones de entrada a Nivel 4
se define en `roadmap.md`.
REGLA:

- Repo Guardian valida evidencia de hitos y consistencia local
- Arquitecto_sistema decide cambios de estado estructural o de nivel
- HDOC consolida los cambios en `roadmap.md`

DISTINCIÓN OBLIGATORIA:

### Actualización local del roadmap

Aplica a:

- capacidades consolidadas
- deuda residual
- estado operativo puntual

Puede basarse en:

- evidencia validada por Repo Guardian

### Actualización estructural del roadmap

Aplica a:

- estado de niveles
- condiciones de entrada/salida de nivel
- checkpoints arquitectónicos
- readiness para refactor

Requiere:

- dictamen explícito de `arquitecto_sistema`
- validación de consistencia por Repo Guardian
- consolidación documental por HDOC

PROHIBICIÓN:

- Repo Guardian no decide por sí solo estados de nivel
- HDOC no altera checkpoints estructurales sin dictamen explícito del arquitecto

## HITO_RULES

RULE: HITO_SINGLE_INTENTION
RULE: HITO_EXPLAINABLE
RULE: HITO_REVERSIBLE

---

## GIT_RULES

RULE: ONE_HITO_ONE_COMMIT
RULE: TRACEABILITY_CHAIN

FLOW:

CODE → COMMIT → HASH → PUSH → DOC

---

## DOCUMENTATION_RULES

FORBIDDEN:

- documentar sin commit
- documentar sin hash
- documentar sin push

---

## DOCUMENTATION_CLASSIFICATION

TYPE: SOLO_HITO
TYPE: HITO_PLUS_EVOLUTION

---

## NO PARTIAL CLOSURE

Se mantiene sin cambios:

- 1 hito → 1 commit
- 1 hito → 1 cierre documental

NO se introducen:

- estados intermedios
- batching documental
- PENDING_HDOC

---
