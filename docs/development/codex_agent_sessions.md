<!-- Path: docs/development/codex_agent_sessions.md -->

# BegaIA — Guía operativa de sesiones Codex

DOCUMENT_TYPE: OPERATING_GUIDE
STATUS: CANONICAL
SCOPE: CODEX_SESSION_PROFILES
HITO: OPS-CODEX-SESSION-PROFILES-CUTOVER-01
RELATED_HITO: OPS-CODEX-SESSION-LAUNCHER-01
AGENT_TARGET_GUARD_DESIGN: OPS-CODEX-AGENT-TARGET-GUARD-01
AGENT_TARGET_GUARD_CUTOVER: OPS-CODEX-AGENT-TARGET-GUARD-PROFILE-CUTOVER-01
AGENT_TARGET_GUARD_CUTOVER_RESULT: COMPLETED_STATIC_CUTOVER
TECHNICAL_COMMIT: NOT_APPLICABLE
RELATED_TECHNICAL_COMMIT: 39ee43ce6a8c241c1e7773e6c6842db4dd909f97
CUTOVER_REFERENCE: 2026-09-28

## Propósito

Esta guía define cómo abrir y operar las sesiones Codex soportadas para BegaIA
después del cutover de los cinco perfiles definitivos. Los perfiles viven fuera
del repositorio, en `~/.codex`, y no deben copiarse ni versionarse en BegaIA.

## Alcance soportado

- WSL2.
- Codex CLI `0.156.1`.
- Profile V2.
- Workspace `/home/marcelo/begasist`.

Entry points soportados:

- tarea compuesta de VS Code `🚀 Abrir agentes BegaIA`;
- PowerShell o Windows Terminal → WSL → Codex CLI.
- Terminal integrada de VS Code → WSL → Codex CLI.

Superficies excluidas:

- extensión Codex/OpenAI de VS Code;
- Codex Windows native;
- cualquier versión de Codex CLI distinta de `0.156.1` que no haya sido
  validada mediante un hito posterior.

La extensión Codex/OpenAI de VS Code no forma parte de este cutover ni de su
perímetro soportado.

## Perfiles definitivos

| Identidad | Perfil | Responsabilidad | Sandbox | Aprobación |
| --- | --- | --- | --- | --- |
| 🤖 TECNICO | `asistente_tecnico` | Implementación técnica acotada | `workspace-write` | `on-request` |
| 🏗 ARQ-SISTEMA | `arquitecto_sistema` | Arquitectura del sistema | `read-only` | `on-request` |
| 📚 ARQ-KB | `arquitecto_kb` | Arquitectura de Knowledge Base | `read-only` | `on-request` |
| 🛡 GUARDIAN | `repo_guardian` | Auditoría de hito y repositorio | `read-only` | `on-request` |
| 📝 HDOC | `hdoc` | Cierre documental | `workspace-write` | `on-request` |

`read-only` con `on-request` no significa imposibilidad absoluta de solicitar
escalamiento. Un intento de escritura puede presentar un gate de aprobación
humana; sin esa aprobación, la escritura no se aplica. La aprobación no amplía
la responsabilidad funcional del agente.

## Organización recomendada

Usar una terminal integrada de VS Code por agente y mantener una sesión
independiente abierta para cada perfil cuando resulte útil. No es obligatorio
conservar las cinco sesiones abiertas permanentemente.

Para evitar contexto residual entre hitos, abrir una sesión nueva del perfil
correspondiente cuando cambie el objetivo de trabajo.

## Apertura de sesiones

### Launcher de VS Code

Con el workspace BegaIA abierto en VS Code, ejecutar la tarea
`🚀 Abrir agentes BegaIA`. La tarea inicia en paralelo cinco terminales
dedicadas, una por cada perfil canónico de esta guía.

El launcher es un punto de entrada operativo: no fusiona contextos ni cambia
la independencia, permisos o responsabilidad de las sesiones. Las tareas
individuales `🤖 TECNICO`, `🏗 ARQ-SISTEMA`, `📚 ARQ-KB`, `🛡 GUARDIAN` y
`📝 HDOC` permiten abrir un único perfil cuando no se necesitan los cinco.

La definición versionada del launcher vive en `.vscode/tasks.json`.

El launcher tiene `role: convenience_only` y `authority: none`. El nombre de
la terminal o de la task mejora la UX, pero no determina la identidad efectiva
del agente y no participa en el receiver-side guard.

### Apertura manual

Ejecutar desde WSL:

### 🤖 TECNICO

```bash
codex --profile asistente_tecnico -C /home/marcelo/begasist
```

### 🏗 ARQ-SISTEMA

```bash
codex --profile arquitecto_sistema -C /home/marcelo/begasist
```

### 📚 ARQ-KB

```bash
codex --profile arquitecto_kb -C /home/marcelo/begasist
```

### 🛡 GUARDIAN

```bash
codex --profile repo_guardian -C /home/marcelo/begasist
```

### 📝 HDOC

```bash
codex --profile hdoc -C /home/marcelo/begasist
```

Desde PowerShell o Windows Terminal, entrar primero a WSL:

```powershell
wsl
```

Los paths `/home/marcelo/...` son paths Linux y no deben ejecutarse como
comandos nativos de PowerShell.

## Verificación de sesión

### Identidad y procedencia

Cada perfil definitivo y cada perfil `*_pilot` soportado debe declarar un
`BEGASIST_AGENT_ID` perteneciente al enum canónico:

- `asistente_tecnico`
- `arquitecto_sistema`
- `arquitecto_kb`
- `repo_guardian`
- `hdoc`

`BEGASIST_AGENT_ID` es la única identidad efectiva usada por el receiver-side
guard. `BEGASIST_PROFILE_ID` identifica procedencia o versión del perfil; no es
fuente de identidad y puede estar ausente sin impedir el enforcement. Está
prohibido derivar la identidad recortando sufijos de `BEGASIST_PROFILE_ID`.

### Receiver-side preflight

Por cada prompt operativo, antes de inspeccionar el repositorio o los archivos
del hito, analizar materialmente el objeto, usar herramientas, ejecutar
comandos o tests, editar, usar Git o delegar, el receptor debe:

1. leer `effective_agent` exclusivamente desde `BEGASIST_AGENT_ID`;
2. identificar exactamente un `agent_target` canónico en el envelope;
3. validar el enum;
4. comparar exacta y case-sensitive `effective_agent == agent_target`;
5. continuar con `flow_position`, responsabilidad y permisos sólo después de
   `AGENT_TARGET_VALIDATION: PASS`.

Mismatch, target ausente, desconocido, duplicado o contradictorio, identidad
efectiva no disponible, o intención operativa sin envelope válido producen
`AGENT_TARGET_VALIDATION: FAIL` y `STATUS: BLOCKED`. Los `reason` normativos
están definidos en `system_operating_model.md`.

No existe PASS permanente. `codex resume` conserva la identidad de la sesión
restaurada, no la de la terminal desde la que se invoca, y el siguiente prompt
operativo vuelve a ejecutar el guard. `/fork` tampoco hereda PASS: cada prompt
operativo del fork repite el preflight.

Los prompts no operativos —conversación general, explicaciones, preguntas
sobre identidad o responsabilidad y ayuda no orientada a ejecutar un hito— no
requieren `agent_target`.

### Evidencia de validación del guard

La matriz dinámica posterior al cutover confirmó PASS con target propio para
los cinco roles y bloqueo fail-closed para mismatch, target ausente, target
fuera del enum y declaraciones duplicadas o contradictorias. También confirmó
que `codex resume` conserva la identidad efectiva de la sesión restaurada, que
`/fork` vuelve a ejecutar el guard y que los prompts no operativos permanecen
permitidos sin envelope.

La validación del perfil `asistente_tecnico_pilot` sin
`BEGASIST_PROFILE_ID` confirmó que ese campo no es requisito de enforcement.
Las variaciones observadas en `expected_agent` para targets no resolubles y en
el campo `STATUS` de algunos PASS no produjeron bypass; su interpretación
contractual está fijada en `system_operating_model.md`.

### Comprobación informativa

Al abrir una sesión, ejecutar:

```text
/status
```

Verificar como información operativa complementaria:

- perfil e identidad esperados;
- Codex CLI `0.156.1`;
- workspace `/home/marcelo/begasist`;
- sandbox y política de aprobación correspondientes al perfil;
- instrucciones específicas del rol cargadas.

`/status` no es fuente autoritativa de identidad para el guard. El estado de
sesión y el sentinel del perfil son evidencias complementarias:
el primero muestra el entorno efectivo y el segundo confirma la carga de las
instrucciones específicas.

## Disciplina de permisos y Git

RULE: MARCELO_ONLY_GIT_WRITE

Marcelo es el único autorizado a ejecutar comandos Git de escritura. Un agente
con `workspace-write` puede preparar archivos dentro de su alcance, pero eso no
lo autoriza a ejecutar `git add`, `git commit`, `git push`, `git reset`,
`git restore`, `git checkout` ni `git stash`.

Los perfiles `read-only` conservan además los límites funcionales de sus roles.
No debe aprobarse un escalamiento que los convierta de hecho en agentes de
implementación o documentación.

## Cierre de sesión

Dentro de Codex:

```text
/exit
```

Antes de reutilizar una sesión, comprobar que su contexto corresponde al hito
actual. Ante duda, cerrar y abrir una sesión nueva.

## Rollback

Los cinco perfiles `*_pilot.config.toml` permanecen preservados fuera del
repositorio como mecanismo de rollback. Un rollback requiere:

1. relanzar cada sesión con el perfil piloto correspondiente;
2. verificar carga, workspace, sandbox y política de aprobación;
3. repetir la validación operativa aplicable.

Mientras estén soportados, los perfiles piloto deben conservar el mismo
receiver-side guard y el `BEGASIST_AGENT_ID` de su rol. La presencia de
`BEGASIST_PROFILE_ID` no es requisito para determinar su identidad.

La disponibilidad de esos archivos no implica que el rollback haya sido
ejecutado durante el cutover.

## Relación con el hito

`OPS-CODEX-SESSION-PROFILES-CUTOVER-01` promovió cinco perfiles definitivos en
el entorno operativo externo. Al ser un `external_operational_change`, su
technical commit, hash y push son `not_applicable`; la evidencia sustitutiva fue
auditada por Guardian. Esta guía registra el perímetro soportado sin convertir
los perfiles externos en contenido versionado del repositorio.

`OPS-CODEX-SESSION-LAUNCHER-01` incorporó el launcher versionado de VS Code
para abrir esas cinco sesiones en paralelo. El launcher reutiliza los perfiles
canónicos existentes y no crea otra fuente de configuración de agentes.
