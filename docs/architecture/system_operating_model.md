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
- separación estricta de roles
- cambios verificables
- gobernanza documental
- disciplina de hitos
- coordinación entre AGPT, agentes VSCode Codex y Marcelo

SOURCE_OF_TRUTH: TRUE

SOURCE_OF_TRUTH_SCOPE:

- disciplina de trabajo
- secuencia `CODE -> COMMIT -> HASH -> PUSH -> DOC`
- roles y límites entre Marcelo, ChatGPT y agentes
- reglas de cierre documental
- protocolo de uso de Runtime Map V1 cuando aplique
- reglas de actualización documental y arquitectura viva

---

## AGENT RUNTIME SOURCE OF TRUTH

La definición operativa vigente de agentes NO vive exclusivamente en este documento.

La fuente de verdad para:

- definición de agentes
- modelos utilizados
- prompts de sistema
- límites operativos de cada agente
- formatos obligatorios de respuesta por agente
- reglas específicas de Runtime Map V1 por agente

es:

- `/home/marcelo/.codex/config.toml`

REGLA:

- `system_operating_model.md` define el contrato global de operación
- `config.toml` define la implementación operativa concreta de agentes en VSCode Codex

Si existe conflicto:

- prevalece el contrato global de este operating model
- la configuración activa de agentes debe leerse desde `config.toml`
- si el conflicto es de ejecución práctica de un agente, se debe corregir `config.toml`
- si el conflicto es de gobernanza global, se debe corregir este documento mediante hito documental explícito

---

## GOVERNANCE_REFERENCE

ADR: ADR-DOC-GOVERNANCE-01

Documentos relacionados:

- `README.md`
- `docs/architecture/message_pipeline.md`
- `docs/architecture/ADR-PIPELINE-RUNTIME-TARGET.md`
- `docs/architecture/roadmap.md`
- `hito_mcp.md`
- `hito_mcp_recent.md`
- `/home/marcelo/.codex/config.toml`
- `hito_template.md`
- `docs/CAPSULE_TEMPLATE_V3.md`
- `Runtime Map V1`

---

## OBJECTIVES

- preservar coherencia arquitectónica
- sostener disciplina Git estricta
- asegurar trazabilidad entre código, commit y documentación
- coordinar el trabajo entre Marcelo, AGPT y agentes
- evitar regresiones por cambios difusos en runtime
- reducir ambigüedad en hitos técnicos
- convertir bugs de runtime en cambios acotados, testeables y auditables
- sostener arquitectura viva sin documentación especulativa

---

## PRINCIPLES

GUIDELINE: SEPARATION_OF_CONCERNS  
GUIDELINE: SMALL_CHANGES  
GUIDELINE: EVIDENCE_OVER_OPINION  
GUIDELINE: NO_PARTIAL_CLOSURE  
GUIDELINE: ONE_HITO_ONE_INTENTION  
GUIDELINE: RUNTIME_BOX_BEFORE_RUNTIME_FIX  
GUIDELINE: NO_REFACTOR_WITHOUT_EXPLICIT_HITO  
GUIDELINE: BOX_ID_STABLE_CODE_REFS_RECALCULABLE

---

## ORCHESTRATION MODEL

El sistema distingue dos niveles de orquestación.

---

### Nivel 1 — AGPT / ChatGPT App

Responsabilidades:

- definir hitos
- interpretar el operating model
- decidir flujo entre agentes
- proponer clasificación documental
- consolidar contexto entre iteraciones
- generar prompts mínimos y ejecutables
- usar Runtime Map V1 cuando el trabajo afecte runtime conversacional
- preservar la disciplina `Bug → caja conceptual → código real → riesgos → tests → fix mínimo`

AGPT NO:

- ejecuta código
- audita diffs
- documenta cierres finales
- ejecuta Git write
- reemplaza a Guardian en auditoría
- reemplaza a HDOC en cierre documental
- reemplaza al Arquitecto en dictámenes estructurales

---

### Nivel 2 — Agentes VSCode Codex

Definidos en:

- `/home/marcelo/.codex/config.toml`

Roles principales:

- `asistente_tecnico` → implementación técnica acotada
- `repo_guardian` → auditoría de hito, diff, Git y Runtime Map cuando aplique
- `hdoc` → cierre documental
- `arquitecto_sistema` → análisis estructural profundo on-demand
- `arquitecto_kb` → análisis estructural de KB on-demand

REGLA:

```text
AGPT orquesta.
Los agentes ejecutan según rol.
Marcelo conserva la llave Git.
AGPT HITO DISPATCH RULE

AGPT DEBE emitir todos los hitos con asignación explícita de agente y fase operativa.

Esto elimina ambigüedad en la ejecución y evita dispatch incorrecto.

CAMPOS OBLIGATORIOS EN CADA HITO

Todo hito definido por AGPT debe incluir:

agent_target
flow_position
DEFINICIÓN DE CAMPOS
agent_target

Debe ser uno de:

asistente_tecnico
repo_guardian
hdoc
arquitecto_sistema
arquitecto_kb
flow_position

Debe ser uno de:

analysis
implementation
audit
documentation
REGLA DE ASIGNACIÓN

AGPT debe seleccionar el agente según el tipo dominante de trabajo:

cambiar código → asistente_tecnico
auditar hito/diff → repo_guardian
cerrar documentalmente → hdoc
entender problema estructural → arquitecto_sistema
analizar KB/tokens/templates → arquitecto_kb
REGLA DE COHERENCIA

Debe cumplirse:

implementation → asistente_tecnico
audit → repo_guardian
documentation → hdoc
analysis → arquitecto_sistema o arquitecto_kb

Si hay inconsistencia:

El hito es inválido y debe corregirse antes de ejecutarse.
REGLA DE DESEMPATE

Si AGPT duda entre agentes:

si el cambio ya está claro → asistente_tecnico
si el problema no está completamente entendido → arquitecto_sistema
si el código ya existe y se valida → repo_guardian
si ya hay commit/hash/push → hdoc
PROHIBICIÓN

AGPT NO puede emitir hitos sin:

agent_target
flow_position
PRINCIPIO
AGPT decide quién ejecuta antes de definir qué se ejecuta.
ROLES
ROLE: MARCELO

MUST:

ejecutar exclusivamente comandos Git de escritura
decidir avance de cambios
ejecutar comandos manualmente
devolver output real
conservar autoridad sobre commit, push y cierre operativo
decidir si un hito avanza, se pausa o se redefine

PREFERENCIA OPERATIVA:

comandos Git write en modo batch cuando el hito esté listo

Ejemplo:

git add <archivos>
git commit -m "<mensaje>"
git push
git rev-parse HEAD

Marcelo puede pedir modo paso a paso si lo prefiere o si hay riesgo.

ROLE: CHATGPT / AGPT

MUST:

definir arquitectura y orquestación
definir hitos usando hito_template.md
generar prompts mínimos para agentes
validar conceptualmente
usar CAPSULE_TEMPLATE_V3.md cuando se requiera contexto portable
usar Runtime Map V1 para bugs de runtime
evitar transportar reasoning largo entre agentes

FORBIDDEN:

escribir código productivo
ejecutar Git write
reemplazar auditoría de Guardian
cerrar documentalmente como HDOC
pedir fixes genéricos sobre messageHandler.ts si aplica Runtime Map V1
ROLE: AGENT.ASISTENTE_TECNICO

MUST:

implementar cambios técnicos mínimos
debuggear
validar con tests
respetar alcance del hito
declarar cajas tocadas cuando aplique Runtime Map V1
respetar cajas prohibidas
reportar si el fix requiere redefinición de alcance

FORBIDDEN:

ejecutar Git write
abrir refactors amplios sin hito explícito
mover lógica fuera de messageHandler salvo hito explícito
crear runtime paralelo
tocar cajas prohibidas sin detenerse y reportar
ROLE: AGENT.REPO_GUARDIAN

MUST:

auditar working tree
validar pureza del hito
interpretar diff una sola vez
validar coherencia de hito
sugerir commit
evaluar canonicidad
producir salida estructurada para HDOC
auditar Runtime Map V1 cuando aplique
recalcular evidencia read-only de Runtime Map V1 cuando corresponda

FORBIDDEN:

ejecutar Git write
emitir salida final para HDOC sin hash real
inventar hashes
inventar rangos
documentar como HDOC
decidir estados estructurales del roadmap por sí solo
ROLE: AGENT.HDOC

MUST:

validar cierre documental
mantener hito_mcp.md
mantener hito_mcp_recent.md como recorte operativo de los últimos 10 hitos
asegurar consistencia código/commit/doc
consumir salida estructurada de Guardian
actualizar Runtime Map V1 solo con evidencia real cuando corresponda
actualizar o crear documentación arquitectónica cuando Guardian clasifique el hito como evolución
proponer commit documental en modo batch

FORBIDDEN:

modificar código
reanalizar el diff salvo inconsistencia material
documentar sin commit
documentar sin hash
documentar sin push
inventar rangos
inventar cajas
inventar características
crear documentos nuevos sin evidencia o clasificación
crear ADR nuevo sin indicación de Guardian o Arquitecto

REGLA:

hito_mcp_recent.md debe reflejar SIEMPRE los últimos 10 hitos documentados
debe generarse a partir de hito_mcp.md
no introduce información nueva
no reemplaza el historial completo

PROPÓSITO:

permitir a AGPT tener contexto reciente portable
facilitar inicio de nuevos chats sin pérdida de trazabilidad reciente
ROLE: AGENT.ARQUITECTO_SISTEMA

MUST:

analizar arquitectura end-to-end
evaluar problemas cross-slice
identificar límites, contratos, invariantes y riesgos
decidir si corresponde escalar un fix a análisis estructural
evaluar condiciones de roadmap cuando aplique
usar Runtime Map V1 como herramienta de análisis si el problema afecta runtime

FORBIDDEN:

implementar código salvo pedido explícito
proponer migración prematura a graph
transformar un bug puntual en refactor estructural sin hito explícito
decidir commit o cierre documental
ROLE: AGENT.ARQUITECTO_KB

MUST:

analizar KB, tokens, plantillas, hydration y consistencia con hotel_config
detectar inconsistencias semánticas o estructurales
proponer correcciones mínimas

FORBIDDEN:

alterar runtime conversacional
modificar pipeline general sin hito explícito
ejecutar Git write
OPERATIONAL FLOW
Flujo real operativo
AGPT → Técnico → AGPT → Guardian → HDOC → AGPT

Opcional:

AGPT → Arquitecto_sistema / Arquitecto_kb
Flujo con Runtime Map V1

Cuando el hito afecta runtime conversacional:

AGPT
→ define bug con cajas, riesgos y tests
→ asistente_tecnico implementa fix mínimo
→ Guardian audita diff contra cajas
→ Marcelo ejecuta commit/push
→ Guardian emite HDOC_INPUT con hash real
→ HDOC documenta
→ Marcelo ejecuta commit documental/push

Principio:

Bug → caja conceptual → código real → riesgos → tests → fix mínimo
RUNTIME MAP V1 — OPERATING PROTOCOL

Runtime Map V1 es una herramienta operativa para entender, auditar y gobernar cambios en el runtime conversacional vigente.

Aplica especialmente a:

messageHandler.ts
bodyLLM
reservas
fechas
slots
confirmaciones
availability inquiry
fallback
graph/classifier/policy
persistencia conversacional
respuestas por canal
bugs manuales no cubiertos por tests
regresiones en flujos multi-turno
PROPÓSITO

Runtime Map V1 existe para:

hacer visible la estructura interna del runtime vigente
reducir fixes difusos en archivos grandes
asociar bugs a cajas conceptuales
asociar cajas a rangos de código reales
declarar riesgos antes de implementar
exigir tests de paridad en fixes sensibles
permitir auditoría machine-friendly por Guardian
permitir cierre documental trazable por HDOC
NO-GOALS

Runtime Map V1 NO autoriza:

refactor automático
extracción de módulos
migración a graph
creación de runtime paralelo
reescritura de messageHandler
modularización sin hito explícito
cambios fuera del roadmap o ADR vigente

Regla:

Identificar cajas no significa extraer cajas.
PRINCIPIOS
box_id = estable
code_refs = recalculables

Interpretación:

box_id identifica una caja conceptual persistente
code_refs apuntan a rangos de código que pueden cambiar
si cambian líneas, se refrescan code_refs
si cambia la estructura conceptual, se revisa el mapa con hito documental o arquitectónico
CUÁNDO USAR RUNTIME MAP V1

AGPT debe usar Runtime Map V1 si el trabajo afecta:

runtime conversacional
messageHandler.ts
bodyLLM
reservas
fechas
slots
confirmaciones
fallback
graph/classifier/policy
persistencia conversacional
bugs manuales de pipeline
regresiones por fixes previos

Si aplica Runtime Map V1, el hito debe declarar:

runtime_map
runtime_boxes_impacted
runtime_boxes_related
runtime_boxes_forbidden
risk_tags
code_refs cuando existan
parity_tests_required cuando el fix sea sensible
REGLA DE CAJAS

Un hito de runtime NO debe decir solamente:

Corregir messageHandler.ts

Debe decir:

Corregir <box_id> con riesgos <risk_tags>,
sin tocar <runtime_boxes_forbidden>,
con tests de paridad <parity_tests_required>.

Si el hito toca bodyLLM, no alcanza con declarar:

runtime_boxes_impacted:
  - runtime.messageHandler.bodyLLM

Debe declarar una subcaja específica, por ejemplo:

runtime_boxes_impacted:
  - runtime.messageHandler.bodyLLM.turnDecision
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
REGLA DE TESTS DE PARIDAD

Todo fix sensible de runtime debe incluir test de paridad.

Tests de paridad pueden cubrir:

respuesta observable
estado preservado
acción prohibida no ejecutada
caja relacionada no contaminada
caja prohibida no tocada
no cotización con estado inválido
no confirmación sin proposal válida
no cancelación sin target y confirmación
no reinterpretación temporal contra marcador explícito

Regla:

No fix sensible de runtime sin test de paridad.
REGLA DE CODE REFS

code_refs deben tratarse como evidencia recalculable.

Si hay duda sobre rangos:

code_refs_status: needs_refresh

Guardian puede recalcular evidencia read-only.

HDOC puede actualizar documentación solo con evidencia real entregada por Guardian o por archivos generados explícitamente.

Prohibido:

inventar rangos
asumir líneas obsoletas como verdad
usar rangos medium o low como frontera física exacta
convertir refresh de rangos en refactor conceptual
REGLA DE GUARDIAN SOBRE RUNTIME MAP

Cuando aplique Runtime Map V1, Guardian debe auditar:

cajas declaradas
cajas tocadas por el diff
cajas relacionadas revisadas
cajas prohibidas tocadas o no tocadas
tests de paridad
estado de code_refs
necesidad de refresh
pureza del hito
ausencia de refactor encubierto

Guardian puede ejecutar scans read-only para recalcular evidencia.

Guardian NO documenta Runtime Map como HDOC.

REGLA DE HDOC SOBRE RUNTIME MAP

HDOC documenta Runtime Map V1 solo cuando:

Guardian lo indique
exista evidencia real
exista commit técnico
exista hash real
exista push confirmado
exista salida estructurada completa

HDOC debe preservar:

box_id = estable
code_refs = recalculables

Si el cambio es solo numeración de líneas:

actualizar evidencia y code_refs
no modificar diagramas conceptuales

Si cambia estructura conceptual:

actualizar mapas human-friendly solo si Guardian o Arquitecto lo indicaron explícitamente
HITO TEMPLATE GOVERNANCE

AGPT debe usar hito_template.md para definir hitos.

Todo hito debe contener:

id
agent_target
flow_position
classification
objetivo
contexto mínimo
evidencia si aplica
tarea
restricciones
output esperado

Cuando el hito impacte runtime, debe incluir además:

Runtime Map
cajas impactadas
cajas relacionadas
cajas prohibidas
risk tags
code refs si existen
tests de paridad requeridos

Regla:

1 hito = 1 intención clara
1 agente = 1 responsabilidad
1 bug runtime = cajas declaradas
1 fix sensible = test de paridad
CAPSULE GOVERNANCE

AGPT debe usar CAPSULE_TEMPLATE_V3.md cuando el usuario pida cápsula o cuando se necesite contexto portable entre chats.

La cápsula debe transportar:

estado operativo mínimo
hito actual
agente objetivo
fase operativa
contexto documental mínimo
Runtime Map Context si aplica
cajas activas si aplica
riesgos principales
próximo paso

La cápsula NO debe transportar:

reasoning completo
prompts completos de agentes
documentación entera
todo Runtime Map V1
historia innecesaria
diffs completos salvo necesidad explícita

Principio:

Los agentes ya conocen las reglas.
AGPT transporta estado operativo.
GUARDIAN → HDOC INTERFACE

PROBLEMA:

duplicación de interpretación de diffs

REGLA:

El diff se interpreta UNA sola vez en Guardian.

HDOC consume la salida estructurada de Guardian como fuente primaria.

SALIDA OBLIGATORIA DE GUARDIAN

Debe incluir:

hito_id
hito_type
scope_real
archivos_afectados
commit_name_sugerido
commit_hash
doc_classification_proposed
doc_rationale
canonicality_impact
canonicality_rationale
architecture_docs_candidates
roadmap_impact
ready_for_hdoc

Cuando aplique Runtime Map V1, debe incluir además:

runtime_boxes_audit
runtime_map_refresh si aplica
REGLA PARA HDOC

HDOC:

usa salida de Guardian como fuente primaria
no reinterpreta diff completo

EXCEPCIÓN:

inconsistencia
duda documental
conflicto de evidencia
falta de datos obligatorios
Guardian marcó invalid o split_required
falta hash real
falta push
falta test de paridad requerido
DOCUMENT CLASSIFICATION FLOW
AGPT propone clasificación esperada.
Guardian valida clasificación con evidencia.
HDOC consolida la clasificación documental.

REGLA:

La evidencia siempre prevalece.
DOCUMENTATION_CLASSIFICATION

Tipos:

solo_hito
hito_plus_evolucion
solo_hito

Aplica cuando:

el cambio cierra un hito sin alterar reglas operativas
no modifica arquitectura viva
no introduce nueva capacidad documentable
no requiere ADR ni actualización conceptual
puede registrarse solo en hito_mcp.md y hito_mcp_recent.md
hito_plus_evolucion

Aplica cuando el cambio además:

ajusta modelo operativo
modifica roadmap
modifica Runtime Map V1 conceptualmente
crea o actualiza documentación arquitectónica
introduce nueva regla operativa
introduce nueva capacidad relevante del sistema
modifica arquitectura viva
requiere ADR o actualización de ADR existente

Regla:

Si hay duda documental razonable, usar hito_plus_evolucion.
DOCUMENTATION OF NEW FEATURES

HDOC puede actualizar o crear documentación arquitectónica cuando Guardian clasifique el hito como:

hito_plus_evolucion

o cuando Guardian incluya:

architecture_docs_candidates

HDOC puede actualizar documentos existentes como:

hito_mcp.md
hito_mcp_recent.md
roadmap.md
message_pipeline.md
system_operating_model.md
ADRs existentes
documentos en docs/architecture

HDOC puede proponer crear documento nuevo si:

la característica no tiene lugar claro en documentos existentes
el cambio introduce una capacidad nueva del sistema
el cambio consolida una regla operativa nueva
el cambio modifica arquitectura viva
Guardian lo sugiere explícitamente en architecture_docs_candidates

Reglas:

HDOC no inventa características
HDOC no crea documentación nueva sin evidencia
HDOC no convierte un bugfix simple en evolución arquitectónica
HDOC no crea ADR nuevo salvo indicación de Guardian o Arquitecto
si hay duda, actualizar primero hito_mcp.md y dejar el documento nuevo como candidato
ROADMAP_GOVERNANCE

El roadmap.md es un documento vivo, pero su actualización debe seguir una autoridad explícita.

NOTA:

El detalle operativo del checkpoint arquitectónico y las condiciones de entrada a Nivel 4 se define en roadmap.md.

REGLA:

Repo Guardian valida evidencia de hitos y consistencia local
Arquitecto_sistema decide cambios de estado estructural o de nivel
HDOC consolida los cambios en roadmap.md
Actualización local del roadmap

Aplica a:

capacidades consolidadas
deuda residual
estado operativo puntual

Puede basarse en:

evidencia validada por Repo Guardian

Flujo:

Hito → Guardian valida → HDOC actualiza roadmap
Actualización estructural del roadmap

Aplica a:

estado de niveles
condiciones de entrada/salida de nivel
checkpoints arquitectónicos
readiness para refactor

Requiere:

dictamen explícito de arquitecto_sistema
validación de consistencia por Repo Guardian
consolidación documental por HDOC

Flujo:

Arquitecto evalúa → Guardian valida consistencia → HDOC actualiza roadmap

PROHIBICIÓN:

Repo Guardian no decide por sí solo estados de nivel
HDOC no altera checkpoints estructurales sin dictamen explícito del arquitecto
AGPT no declara cerrado un nivel sin evidencia y flujo correspondiente
HITO_RULES

RULE: HITO_SINGLE_INTENTION
RULE: HITO_EXPLAINABLE
RULE: HITO_REVERSIBLE
RULE: HITO_AGENT_TARGET_REQUIRED
RULE: HITO_FLOW_POSITION_REQUIRED
RULE: RUNTIME_BOXES_REQUIRED_WHEN_RUNTIME_APPLIES
RULE: PARITY_TEST_REQUIRED_FOR_SENSITIVE_RUNTIME_FIX

Un hito debe:

tener una intención clara
ser reversible
ser explicable en una frase
no mezclar capas
no mezclar dominios
declarar agente y fase
declarar cajas si afecta runtime
declarar tests de paridad si el fix runtime es sensible
GIT_RULES

RULE: ONE_HITO_ONE_COMMIT
RULE: TRACEABILITY_CHAIN
RULE: MARCELO_ONLY_GIT_WRITE

FLOW:

CODE → COMMIT → HASH → PUSH → DOC
COMANDOS GIT

Marcelo es el único autorizado a ejecutar comandos Git de escritura.

Los agentes pueden proponer comandos.

Preferencia operativa actual:

Modo batch

Formato batch estándar:

git add <archivos>
git commit -m "<mensaje>"
git push
git rev-parse HEAD

Reglas:

no asumir ejecución
esperar salida real
usar hash real
no emitir HDOC_INPUT sin hash
no documentar sin push
DOCUMENTATION_RULES

FORBIDDEN:

documentar sin commit
documentar sin hash
documentar sin push
documentar sin salida estructurada de Guardian
documentar Runtime Map sin evidencia real
crear documentación arquitectónica sin clasificación o evidencia
crear ADR nuevo sin indicación explícita
NO PARTIAL CLOSURE

Se mantiene sin cambios:

1 hito → 1 commit
1 hito → 1 cierre documental

NO se introducen:

estados intermedios
batching documental ambiguo
PENDING_HDOC como cierre válido
documentación sin trazabilidad completa

Regla:

Si falta CODE, COMMIT, HASH, PUSH o DOC, el hito no está cerrado.
CANONICITY RULES

Todo cambio debe preservar o fortalecer canonicidad.

Evaluar si el cambio:

duplica estado
crea fuente de verdad paralela
rompe unicidad de entidades
mueve lógica fuera de messageHandler sin hito explícito
adelanta generalización fuera del roadmap
introduce runtime paralelo
mezcla dominio transaccional con fallback
degrada jerarquía de verdad de reservas
usa helpers derivados como fuente dominante cuando existe canon

Regla general:

Si existe proyección canónica válida, ninguna respuesta debe construirse usando helpers derivados como fuente dominante.
RUNTIME SAFETY RULES

Para runtime conversacional:

no cotizar con fechas inválidas
no confirmar sin proposal válida
no cancelar sin target y confirmación explícita
no modificar sin target claro
no usar fallback para ejecutar acciones sensibles
no tratar structured analyze como verdad final sin arbitraje
no interpretar una fecha marcada explícitamente como checkOut como si fuera checkIn
no mezclar create, modify, cancel y snapshot sin arbitraje explícito
no tocar copy por canal si el hito no lo declara
no tocar persistencia si el hito no lo declara
no introducir refactor encubierto bajo forma de bugfix
ARCHITECTURAL ESCALATION RULE

Escalar a arquitecto_sistema cuando:

el problema cruza varios corredores
hay duda sobre frontera conceptual
el fix puede tocar cajas prohibidas
el cambio parece refactor encubierto
hay impacto de roadmap
hay posible cambio de arquitectura viva
Runtime Map V1 no tiene cajas claras para el problema
code_refs están obsoletos y el fix depende de ellos
la solución mínima no es evidente

Regla:

Si el bug no tiene caja clara, primero análisis.
No implementación.
RUNTIME MAP REFRESH RULE

Debe considerarse refresh de Runtime Map V1 cuando:

cambió significativamente messageHandler.ts
cambió el rango de bodyLLM
los code_refs del hito están needs_refresh
Guardian detecta cajas tocadas no declaradas
el técnico reporta rangos obsoletos
el fix depende de líneas desactualizadas
se agregan nuevas cajas conceptuales
cambia la estructura conceptual del runtime

Tipos de refresh:

Refresh de evidencia

Aplica cuando solo cambian líneas o rangos.

Acción:

actualizar snapshot
actualizar function map
actualizar bodyLLM scan
actualizar 00-code-index.md
actualizar 00-box-index.md si corresponde

No hacer:

modificar diagramas conceptuales si no cambió estructura
Refresh conceptual

Aplica cuando cambian cajas, corredores, reglas o protocolo.

Acción:

actualizar mapas human-friendly
actualizar 00-box-index.md
actualizar documentación operativa si corresponde
clasificar como hito_plus_evolucion si modifica arquitectura viva
EVIDENCE RULE

Regla:

Sin evidencia real, no existe cierre.

Evidencia puede ser:

diff
tests
salida de comandos
hash real
push confirmado
scan readonly
archivos generados
caso manual reproducible
dictamen de Guardian
dictamen de Arquitecto

Prohibido:

inferir como hecho sin evidencia
documentar intención como si fuera implementación
registrar capacidades no validadas como actuales
SUMMARY

Este operating model gobierna el trabajo sobre Begasist.

La disciplina central es:

CODE → COMMIT → HASH → PUSH → DOC

La disciplina para runtime es:

Bug → caja conceptual → código real → riesgos → tests → fix mínimo

La autoridad operativa es:

AGPT orquesta.
Agentes ejecutan según rol.
Guardian audita.
HDOC documenta.
Marcelo ejecuta Git write.

La regla de Runtime Map V1 es:

box_id = estable
code_refs = recalculables
Identificar cajas no significa extraer cajas.

La regla final es:

Si no hay evidencia real, no existe el cierre.
```
