// Path: /home/marcelo/begasist/docs/architecture/system_operating_model.md

# System Operating Model

Este documento define el contrato operativo general para construir y mantener
Begasist con trazabilidad, separacion de roles y cambios verificables.

Este modelo se encuentra alineado con la ADR de gobernanza documental:
ADR-DOC-GOVERNANCE-01.

## Objetivo

- preservar coherencia arquitectonica
- sostener disciplina Git estricta
- asegurar trazabilidad entre codigo, commit y documentacion
- coordinar el trabajo entre Marcelo, ChatGPT y agentes especializados

## Principios

- separar pensar, ejecutar y controlar
- mantener cambios pequenos, auditables y reversibles
- no mezclar dominios ni capas en un mismo hito
- privilegiar evidencia sobre opinion
- no cerrar hitos sin commit, hash y push reales

## Modelo documental (explicito)

La documentacion del sistema se organiza en planos diferenciados:

- Historia: `hito_mcp.md`
- Arquitectura viva: `docs/architecture/*.md`
- Operacion: este documento y documentos operativos asociados
- ADR: decisiones arquitectonicas explicitas
- Artefactos derivados: diagramas, imagenes, snapshots

Regla:

- cada plano tiene una finalidad distinta
- ningun plano reemplaza a otro
- la fuente de verdad se respeta por dominio

## Roles

### Marcelo

Responsabilidad:

- autoridad exclusiva para ejecutar comandos Git de escritura
- decision final sobre avance de cambios
- ejecucion manual de comandos uno por vez
- devolucion de output real para trazabilidad

### ChatGPT

Responsabilidad:

- arquitectura y orquestacion general
- definicion de hitos
- generacion de prompts y handoff
- validacion conceptual

No hace:

- no escribe codigo productivo por fuera del flujo acordado
- no ejecuta Git de escritura

### `agent.asistente_tecnico`

Responsabilidad:

- implementacion tecnica
- debugging
- fixes incrementales
- validacion con tests

Limites:

- no romper contratos existentes sin instruccion explicita
- no abrir refactors grandes sin plan

### `agent.arquitecto_sistema`

Responsabilidad:

- decisiones estructurales
- analisis de limites, acoplamientos y riesgos
- evolucion arquitectonica

Limites:

- no reemplazar runtime vigente sin evidencia
- no inventar componentes ni archivos

### `agent.repo_guardian`

Responsabilidad:

- auditar working tree
- validar si el hito esta mezclado o limpio
- sugerir tipo y nombre de commit

Limites:

- no modifica codigo
- no ejecuta Git de escritura

Regla:

- 1 commit = 1 hito

### `agent.hdoc`

Responsabilidad:

- gobernar el cierre documental del sistema
- verificar evidencia real (commit, hash, push)
- registrar hitos en `hito_mcp.md`
- clasificar impacto documental
- exigir actualizacion de documentacion estable cuando corresponde

Regla central:

```text
CODE -> COMMIT -> HASH -> PUSH -> DOC
```

Limites:

- no modifica codigo productivo
- no ejecuta Git de escritura
- no documenta sin evidencia real
- no inventa commits, hashes ni pushes
- no define arquitectura por si solo

Gobernanza:

- si falta commit, hash o push, bloquea documentacion
- clasifica cada hito en nivel de impacto documental
- puede requerir intervencion del arquitecto si el cambio afecta modelo estructural

## Niveles de impacto documental

Todo hito debe clasificarse antes de cerrarse:

- Nivel 1 — solo hito
  registro historico en `hito_mcp.md`

- Nivel 2 — hito + doc existente
  requiere actualizar documentacion viva existente

- Nivel 3 — hito + doc nueva
  requiere crear nueva documentacion o ADR

Regla:

- la clasificacion depende del impacto en el conocimiento del sistema
- no del tamaño del cambio

## Secuencia operativa

1. ChatGPT define problema, hito o decision a evaluar
2. `agent.arquitecto_sistema` analiza si hace falta contexto estructural
3. `agent.asistente_tecnico` implementa el cambio y valida con tests
4. `agent.repo_guardian` revisa alcance y disciplina del hito
5. Marcelo ejecuta Git (`add`, `commit`, `push`)
6. `agent.hdoc`:
   - verifica evidencia
   - clasifica impacto documental
   - decide si corresponde actualizar documentacion viva
   - registra el hito

## Reglas de hito

- un hito debe tener una sola intencion tecnica
- un hito debe poder explicarse en una frase
- un hito debe poder revertirse sin daño colateral innecesario
- no mezclar `PIPELINE`, `KB`, `MCP`, `ADMIN` u otras capas en el mismo commit
- si el working tree mezcla objetivos, dividir antes de commitear

## Reglas Git

- Marcelo es el unico autorizado a ejecutar Git de escritura
- los agentes pueden usar Git readonly para analizar estado y evidencia
- toda accion Git propuesta a Marcelo debe darse como un solo comando por vez
- no asumir nunca que un comando fue ejecutado sin output real

## Reglas documentales

- no documentar sin commit real
- no documentar sin hash real
- no documentar sin push real
- no cerrar hitos incompletos
- no duplicar hitos ya documentados
- distinguir entre historia, arquitectura viva y operacion
- toda decision estructural debe reflejarse en arquitectura viva o ADR

## Documentos relacionados

- ADR-DOC-GOVERNANCE-01
- hito_mcp.md
- docs/architecture/\*
