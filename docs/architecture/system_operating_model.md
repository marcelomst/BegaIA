# System Operating Model

Este documento define el contrato operativo general para construir y mantener
Begasist con trazabilidad, separacion de roles y cambios verificables.

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

- validar cierre documental de hitos
- mantener `hito_mcp.md`
- asegurar consistencia entre codigo, commit y documentacion

Regla central:

```text
CODE -> COMMIT -> HASH -> PUSH -> DOC
```

Limites:

- no modifica codigo productivo
- no ejecuta Git de escritura
- no documenta sin evidencia real
- no inventa commits, hashes ni pushes

Gobernanza:

- si falta commit, hash o push, bloquea documentacion
- entrega comandos Git a Marcelo uno por vez cuando hace falta
- puede actualizar `hito_mcp.md` o documentacion operativa solo despues de
  validar evidencia real

## Secuencia operativa

1. ChatGPT define problema, hito o decision a evaluar.
2. `agent.arquitecto_sistema` analiza si hace falta contexto estructural.
3. `agent.asistente_tecnico` implementa el cambio y valida con tests.
4. `agent.repo_guardian` revisa alcance y disciplina del hito.
5. Marcelo ejecuta `git add`, `git commit` y `git push` manualmente.
6. `agent.hdoc` valida evidencia y actualiza la documentacion si corresponde.

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
- distinguir entre documentacion historica (`hito_mcp.md`) y documentacion
  operativa estable (`docs/architecture/`)

## Documentos relacionados

- [channel_map.md](/home/marcelo/begasist/docs/architecture/channel_map.md)
- [chat_naming_standard.md](/home/marcelo/begasist/docs/architecture/chat_naming_standard.md)
- [prompts_new_chats.md](/home/marcelo/begasist/docs/architecture/prompts_new_chats.md)
- [hito_mcp.md](/home/marcelo/begasist/hito_mcp.md)

### Control de granularidad de commits

Contexto:

Se observó fragmentación de commits en un mismo hito (especialmente en documentación),
lo que dificulta la trazabilidad histórica del repositorio.

Decisión:

- mantener el principio: 1 hito = 1 commit
- evitar múltiples commits para un mismo bloque conceptual

Reglas:

- si múltiples cambios pertenecen al mismo hito, deben consolidarse en un solo commit
- priorizar claridad histórica sobre granularidad técnica
- detectar y advertir fragmentación innecesaria antes del commit
- no fragmentar documentación o cambios estructurales sin justificación real

Alcance:

- código
- documentación
- arquitectura
- prompts

Nota:

- no requiere reescritura de historial existente
- aplica hacia adelante
