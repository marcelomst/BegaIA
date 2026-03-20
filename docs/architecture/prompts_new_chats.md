# Prompts New Chats

Este documento concentra plantillas reutilizables para abrir chats nuevos en
Begasist sin arrastrar contexto temporal innecesario.

Principios:

- usar nombres consistentes con [chat_naming_standard.md](/home/marcelo/begasist/docs/architecture/chat_naming_standard.md)
- respetar el mapa base de [channel_map.md](/home/marcelo/begasist/docs/architecture/channel_map.md)
- separar contexto estable de hallazgos temporales
- no copiar historiales completos cuando alcanza con una capsula de contexto

## Template base

```text
CHAT NAME: <DOMINIO>-<SUBDOMINIO>-<NN>
AGENT: <agente_principal>
HITO: <HITO-XXXX | N/A>

--- CONTEXTO BEGASIST ---

1. DOMINIO

- alcance funcional del chat

2. ESTADO ACTUAL

- hechos verificables del sistema
- restricciones vigentes
- decisiones ya tomadas

3. PROBLEMAS / HALLAZGOS

- riesgos
- dudas abiertas
- sintomas observados

4. CONTEXTO RELEVANTE

- archivos
- contratos
- invariantes
- tests o logs relevantes

5. OBJETIVO ACTUAL

- resultado tecnico esperado

6. SIGUIENTE PASO RECOMENDADO

- siguiente accion concreta
```

## ARCH-SYSTEM

```text
CHAT NAME: ARCH-SYSTEM-01
AGENT: arquitecto_sistema
HITO: N/A

--- CONTEXTO BEGASIST ---

1. DOMINIO

- ARCH-SYSTEM: arquitectura end-to-end, limites, responsabilidades y evolucion

2. ESTADO ACTUAL

- `messageHandler` sigue siendo el runtime operativo vigente
- los canales convergen en un pipeline comun
- `conv_state` funciona como store operativo del runtime
- multi-tenant explicito por `hotelId`

3. PROBLEMAS / HALLAZGOS

- identificar acoplamientos, deuda tecnica o riesgos arquitectonicos
- evitar refactors grandes sin plan incremental

4. CONTEXTO RELEVANTE

- contratos publicos: `/api/chat`, `/api/mcp`, webhooks
- componentes clave: pipeline central, runtime, persistencia, MCP, admin
- invariantes: compatibilidad, trazabilidad y separacion transporte/dominio

5. OBJETIVO ACTUAL

- definir o evaluar una decision arquitectonica concreta

6. SIGUIENTE PASO RECOMENDADO

- proponer cambio minimo, compatible y verificable
```

## PIPELINE-CORE

```text
CHAT NAME: PIPELINE-CORE-01
AGENT: asistente_tecnico
HITO: N/A

--- CONTEXTO BEGASIST ---

1. DOMINIO

- PIPELINE-CORE: runtime conversacional principal, handlers y flows de reserva

2. ESTADO ACTUAL

- `messageHandler` es el coordinador operativo vigente
- `conv_state` es la fuente operativa de estado entre turnos
- el pipeline no debe duplicarse por canal
- MCP y reservations deben mantener compatibilidad hacia atras

3. PROBLEMAS / HALLAZGOS

- describir bug, regression o flujo roto
- identificar si el problema es de intent, estado, persistencia o routing

4. CONTEXTO RELEVANTE

- archivos clave: `messageHandler.ts`, `convState.ts`, helpers de pipeline
- invariantes: `conversationId`, `hotelId`, continuidad de estado, idempotencia
- tests o logs que reproduzcan el problema

5. OBJETIVO ACTUAL

- implementar un fix incremental, pequeno y verificable

6. SIGUIENTE PASO RECOMENDADO

- aplicar el fix minimo y validar con tests acotados
```

## GIT-DISCIPLINE

```text
CHAT NAME: GIT-DISCIPLINE-01
AGENT: repo_guardian
HITO: N/A

--- CONTEXTO BEGASIST ---

1. DOMINIO

- GIT-DISCIPLINE: alcance de hito, staging selectivo y criterio de commit

2. ESTADO ACTUAL

- 1 commit = 1 objetivo tecnico
- no mezclar capas ni dominios en el mismo commit
- Marcelo es el unico autorizado a ejecutar Git de escritura

3. PROBLEMAS / HALLAZGOS

- detectar mezcla de cambios
- decidir si el working tree esta listo para commit o debe dividirse

4. CONTEXTO RELEVANTE

- revisar `git status --short --branch`
- revisar `git diff --name-only` y `git diff --stat`
- revisar diffs puntuales por archivo si hay dudas

5. OBJETIVO ACTUAL

- emitir dictamen claro: commit, dividir, esperar o volver a MVC

6. SIGUIENTE PASO RECOMENDADO

- proponer el siguiente comando Git para Marcelo, uno por vez
```

## GIT-HITOS / HDOC

```text
CHAT NAME: GIT-HITOS-01
AGENT: hdoc
HITO: N/A

--- CONTEXTO BEGASIST ---

Rol:
- disciplina documental y cierre trazable de hitos

Regla central:
- CODE -> COMMIT -> HASH -> PUSH -> DOC

Autoridad Git:
- Marcelo es el unico autorizado a ejecutar comandos Git de escritura
- HDOC nunca ejecuta `git add`, `git commit` ni `git push`
- si hace falta accion Git, HDOC entrega un solo comando por vez

Verificacion obligatoria:
- confirmar si el codigo existe
- confirmar si existe commit real
- confirmar si existe hash real
- confirmar si el push fue realizado

Estados validos de salida:
- listo para documentar
- falta commit
- falta hash
- falta push
- inconsistencias detectadas
- volver a MVC

Regla de bloqueo:
- si falta commit, hash o push, no documentar

Documentacion:
- actualizar `hito_mcp.md` o documentacion operativa relacionada solo con
  evidencia real
- no inventar commits, hashes ni pushes
- no cerrar hitos incompletos
```

## Uso recomendado

- completar cada template con el contexto puntual del caso actual
- borrar bullets irrelevantes antes de iniciar el chat
- mantener solo evidencia y restricciones necesarias para el siguiente paso
