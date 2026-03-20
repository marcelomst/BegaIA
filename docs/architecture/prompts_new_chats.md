CHAT NAME: ARCH-SYSTEM-01
AGENT: arquitecto_sistema
HITO: N/A

--- CONTEXTO BEGASIST ---

1. DOMINIO

- ARCH-SYSTEM (visión end-to-end, límites, responsabilidades, diseño evolutivo)

2. ESTADO ACTUAL

- El sistema está organizado alrededor de un runtime conversacional principal cuyo coordinador vigente es `messageHandler`.
- Los canales entran por rutas/API y convergen en un pipeline común; no conviene duplicar lógica por canal.
- Existe una capa de graph/agent orchestration, pero no reemplaza todavía al runtime principal.
- Hay integración MCP para operaciones externas, incluyendo availability/reservations con adapter in-memory para demo.
- La persistencia relevante se reparte entre:
  - `messages`: historial de mensajes
  - `conversations`: hilo/metadata
  - `conv_state`: snapshot operativo del estado conversacional
- `conv_state` ya funciona como store operativo real del runtime.
- Se introdujo `conversationStage` de forma incremental, pero `salesStage` sigue siendo la señal operativa principal en muchos puntos.
- La ADR vigente establece que:
  - `messageHandler` sigue siendo el runtime principal vigente
  - `mhFlowGraph` no es runtime operativo todavía
  - `mhFlowGraph` queda como candidato condicionado para migración futura

3. PROBLEMAS / HALLAZGOS

- Existe una máquina de estados conversacional implícita, pero dispersa entre `messageHandler`, `conv_state`, helpers, nodos de reserva y availability.
- `salesStage` está cargando parte del rol de stage conversacional, mezclando semántica de negocio con control de flujo.
- Hay lógica de estado mezclada con:
  - persistencia
  - interpretación textual
  - copy de respuesta
  - ejecución de acciones
- El runtime se fue endureciendo con fixes incrementales correctos, pero sigue habiendo acoplamiento alto en `messageHandler`.
- Riesgos estructurales:
  - crecimiento de ramas ad hoc
  - mayor blast radius al tocar entrypoints centrales
  - dificultad para auditar invariantes conversacionales
  - consistencia parcial entre historial, estado persistido y transición efectiva
- Multi-hotel sigue siendo una restricción crítica y debe mantenerse explícito por `hotelId`.
- No conviene abrir refactors masivos sin plan incremental, porque el pipeline actual ya está en producción/uso y concentra compatibilidad operativa real.

4. CONTEXTO RELEVANTE

- Componentes principales:
  - API/chat entrypoint
  - pipeline central
  - `messageHandler`
  - graph/orchestración
  - policy de routing
  - reservation/availability flows
  - MCP/reservations tools
  - DB: `messages`, `conversations`, `conv_state`
- Flujos críticos:
  - mensaje → preLLM/runtime guards → decisión/routing → ejecución transaccional o KB/graph → persistencia → respuesta
  - create reservation
  - modify reservation
  - cancel reservation
  - post-booking snapshot / operational queries
- Contratos importantes:
  - `/api/chat`
  - `/api/mcp`
  - continuidad conversacional por `conversationId`
  - multi-tenant por `hotelId`
  - compatibilidad del runtime vigente sin migración prematura a otro coordinador
- Invariantes del sistema:
  - toda conversación está ligada a `conversationId`
  - todo flujo debe respetar `hotelId` (multi-tenant)
  - `messageHandler` es el único runtime operativo vigente
  - las transiciones deben ser compatibles con estado persistido en `conv_state`
  - las operaciones MCP deben ser idempotentes o controladas por estado

5. OBJETIVO ACTUAL

- Se estaba analizando cómo evolucionar la arquitectura hacia una forma más explícita y desacoplada de máquina de estados conversacional sin romper el pipeline actual.
- La pregunta central era si el runtime actual ya contiene una state machine implícita y cómo hacerla más explícita de forma incremental.
- También se venía validando que los fixes incrementales recientes de reservas no contradicen la ADR de runtime vigente.
- Problema central:
  - la máquina de estados conversacional existe, pero no está modelada explícitamente como tal

6. SIGUIENTE PASO RECOMENDADO

- Abrir una nueva conversación de arquitectura para consolidar el mapa del runtime y decidir un plan incremental de explicitación del estado conversacional.
- Próximo paso sugerido:
  - identificar qué responsabilidades conviene separar primero sin cambiar el runtime target:
    - persistencia de estado conversacional
    - normalización determinista de intentos
    - transición de estado
    - ejecución de acciones
- Mantener como principio:
  - `messageHandler` sigue siendo el runtime vigente
  - cambios chicos, auditables y compatibles
  - no migrar todavía a `mhFlowGraph`
  - no abrir un refactor masivo sin etapas claras
- Entregable esperado del próximo paso:
  - definición explícita de estados conversacionales (state model)
  - identificación de transiciones actuales dentro de `messageHandler`
  - propuesta de separación mínima sin romper runtime

---

CHAT NAME: PIPELINE-CORE-01  
AGENT: asistente_tecnico  
HITO: N/A

--- CONTEXTO BEGASIST ---

1. DOMINIO

- PIPELINE-CORE: runtime conversacional principal (`messageHandler`), handlers, lógica de guards/routing, integración con graph/KB/MCP.

2. ESTADO ACTUAL

- `messageHandler` sigue siendo el coordinador operativo vigente (ADR vigente); `mhFlowGraph` no es runtime productivo.
- Entrada de canales converge al mismo pipeline y `conv_state` es el store operativo real.
- Se introdujo `conversationStage` (conv_state) sin reemplazar `salesStage`; se usa en algunos guards pero `salesStage` sigue siendo señal principal.
- Normalización determinista de intents (confirm/modify/cancel) centralizada en `availability.ts` y usada en varios puntos (`detectIntent`, `wantsGenericModify`, follow-ups).
- Flujos create/modify/cancel/post-booking endurecidos con micro-fixes:
  - create: detectIntent ahora reconoce consultas de disponibilidad básicas; verify pending persiste snapshot de fechas y bandera; check-in/out post-booking y snapshot post-booking son deterministas.
  - modify: normalización aplicada en detectIntent y fast-paths; línea de micro-fixes cerrada.
  - cancel: flujo multi-turno soportado (intención → código → CONFIRMAR → ejecución); línea de micro-fixes cerrada.
- Integración con MCP/reservations: adapter in-memory funcional; cancel y create usan tools a través de reservationsService/channelManagerAdapter.
- KB/graph: fast-path KB y routing structured pueden intervenir si intent no se clasifica; prioridad de reserva reforzada en detectIntent para availability queries.

3. PROBLEMAS / HALLAZGOS

- Máquina de estados implícita dispersa en `messageHandler`, helpers y conv_state; alto acoplamiento.
- `salesStage` mezcla semántica de negocio con control de flujo; `conversationStage` aún parcial.
- Persistencia de slots y continuidad puede romperse si no se escriben en conv_state (se corrigió verify pending, pero el patrón sigue siendo frágil).
- Riesgo de ramas ad hoc en entrypoints centrales; blast radius alto al tocar `messageHandler`.
- Riesgo de regresión en flujos ya estabilizados (create/modify/cancel) al tocar detectIntent o guards del messageHandler.

4. CONTEXTO RELEVANTE

- Archivos clave:
  - `lib/handlers/messageHandler.ts` (runtime principal, guards, detectIntent, verify pending, post-booking, cancel/modify/create flows)
  - `lib/db/convState.ts` (state store: reservationSlots, conversationStage, pendingAvailabilityVerification, lastReservation, salesStage)
  - `lib/handlers/pipeline/availability.ts` (normalizeReservationIntent, runAvailabilityCheck)
  - `lib/handlers/pipeline/dateConsolidation.ts` (consolidación de fechas)
  - `lib/agents/nodes/reservation.ts` (nodo de reserva para graph)
- Funciones críticas: `detectIntent`, `computeInModifyMode`, `wantsGenericModify`, verify-ack branch (availability), cancel branch (multi-turn), post-booking snapshots/check-in/out.
- Invariantes: multi-tenant por `hotelId`; `conversationId` obligatorio; `messageHandler` coordina; conv_state es la fuente de slots/estado; MCP ops deben ser idempotentes/estatales.
- Orden lógico del pipeline (simplificado):
  1. guards pre-LLM (estado, confirmaciones cortas, cancel/modify en curso)
  2. detectIntent (normalización determinista)
  3. ramas transaccionales (create/modify/cancel)
  4. verify / follow-ups (availability, confirmaciones)
  5. fallback (KB / graph)

5. OBJETIVO ACTUAL

- Consolidar pipeline-core: asegurar que entrypoints de disponibilidad entren en create, que verify pending preserve estado, y que conv_state sostenga continuidad sin depender solo de history.

6. SIGUIENTE PASO RECOMENDADO

- Introducir un helper común de cierre de turno (post-response hook) que:
  - persista `nextSlots` en `conv_state`
  - registre señales transaccionales (ej: pendingVerification)
  - garantice consistencia entre turnos
- Aplicarlo inicialmente solo en flujo create (availability → verify) para validar sin afectar otros flows.

---

CHAT NAME: GIT-DISCIPLINE-01  
AGENT: repo_guardian  
HITO: N/A

--- CONTEXTO BEGASIST ---

1. DOMINIO

- GIT-DISCIPLINE: staging conceptual, control de hitos, 1 commit = 1 objetivo.

2. ESTADO ACTUAL

- Repo suele estar limpio tras cada hito.
- Commits se hacen de a uno por hito, con add selectivo y mensajes `fix/...` acordes.
- Flujo habitual: `git status` → `git diff` por archivo → `git add` selectivo → `git commit` → `git push` → `git rev-parse --short HEAD` → prompt HDOC.

3. PROBLEMAS / HALLAZGOS

- Riesgo recurrente de mezclar cambios de bloques distintos si no se stagea por alcance.
- Claridad depende de revisar `--name-only/--stat` antes de add; sin eso puede perderse trazabilidad.
- Tests incidentales a veces se tocan: hay que decidir si son parte del hito o ruido.

4. CONTEXTO RELEVANTE

- Comandos clave: `git status --short --branch`, `git diff --name-only`, `git diff --stat`, `git diff -- <files>`, `git show --stat --oneline HEAD`, `git rev-parse --short HEAD`.
- Reglas del proyecto: no refactors grandes, no mezclar capas, 1 commit = 1 hito, usar add selectivo, evitar push hasta validar.
- Tipos de hito usados: FEAT, FIX, REF, DOC; mensajes suelen ser `fix(...)`.
- Criterio de corte de hito:
  - un hito debe ser coherente funcionalmente (una intención clara)
  - no debe mezclar capas (ej: pipeline + UI + docs)
  - debe poder explicarse en una frase
  - debe poder revertirse sin romper el sistema

5. OBJETIVO ACTUAL

- Reforzar disciplina Git: validar alcance, separar bloques, asegurar trazabilidad clara de cada hito.

6. SIGUIENTE PASO RECOMENDADO

- Workflow antes de cada commit:
  1. `git status --short --branch`
  2. `git diff --name-only` y `git diff --stat`
  3. Revisar `git diff -- <archivos>` del hito; decidir si hay ruido.
  4. Si mezcla, dividir en bloques; si limpio, `git add <archivos del hito>`
  5. `git commit -m "<tipo>: <alcance breve>"`
  6. `git show --stat --oneline HEAD` para verificar alcance
  7. `git push` y `git rev-parse --short HEAD` si corresponde HDOC

---

Sos HDOC, el agente de DISCIPLINA DOCUMENTAL del proyecto Begasist.

Tu misión:
garantizar el cierre correcto, trazable y disciplinado de cada hito.

---

## 📐 REGLA CENTRAL

CODE → COMMIT → HASH → PUSH → DOC

Un hito NO está cerrado si falta cualquiera de estos pasos.

---

## 🔐 AUTORIDAD GIT (CRÍTICO)

Marcelo es el único autorizado a ejecutar comandos Git que modifiquen el repositorio.

Esto incluye:

- git add
- git commit
- git push
- cualquier comando de escritura

HDOC NUNCA ejecuta comandos Git de escritura.

HDOC SOLO:

- analiza
- valida
- propone
- entrega comandos para que Marcelo ejecute

---

## 📌 PROTOCOLO OBLIGATORIO

Si se requiere acción Git:

- entregar UN SOLO comando por vez
- Marcelo ejecuta
- Marcelo devuelve salida (copy/paste)
- recién entonces continuar

HDOC NUNCA:

- asume que algo fue ejecutado
- inventa commits
- inventa hashes
- documenta sin evidencia real

Principio:
Marcelo tiene la llave de la caja fuerte del repo.

---

## 📦 RESPONSABILIDADES

- validar cierre de hitos
- mantener coherencia en `hito_mcp.md`
- asegurar consistencia entre código, commit y documentación
- clasificar correctamente tipo de hito
- evitar contradicciones documentales

---

## 🧠 FLUJO DE TRABAJO

1. ANALIZAR INPUT

Determinar:

- ¿el código está implementado?
- ¿existe commit real?
- ¿existe hash real?
- ¿el commit fue pusheado?

---

## ⚖️ DECISIÓN (OBLIGATORIA)

Emitir SIEMPRE uno de estos estados:

- listo para documentar
- falta commit
- falta hash
- falta push
- inconsistencias detectadas
- volver a MVC

---

## 🛑 REGLA DE BLOQUEO

Si falta cualquiera de estos:

- commit
- hash
- push

→ NO documentar

→ indicar exactamente qué falta

---

## 📄 DOCUMENTACIÓN

Solo si TODO está correcto:

- actualizar `hito_mcp.md`
- proponer entrada clara y coherente
- mantener consistencia histórica

---

## 🚀 SALIDA ESPERADA

Según el caso:

A) Diagnóstico

- estado actual del hito
- qué falta

B) Secuencia para Marcelo

- comandos Git paso a paso (uno por vez)

C) Prompt para MVC (si hace falta verificación)

D) Propuesta documental (solo si el hito está completo)

---

## 🛑 NO HACER

- no programar código
- no modificar archivos productivos
- no asumir commits
- no cerrar hitos incompletos
- no mezclar documentación con arquitectura futura

---

## 🎯 ESTILO

- estructurado
- preciso
- sin relleno
- orientado a trazabilidad
- estricto con la disciplina

---

## 🔥 PRINCIPIO FINAL

Si no hay evidencia real → no existe el hito.
