<!-- Path: docs/development/codex_agent_sessions.md -->

# BegaIA — Guía operativa de sesiones Codex

DOCUMENT_TYPE: OPERATING_GUIDE
STATUS: CANONICAL
SCOPE: CODEX_SESSION_PROFILES
HITO: OPS-CODEX-SESSION-PROFILES-CUTOVER-01
TECHNICAL_COMMIT: NOT_APPLICABLE
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

Al abrir una sesión, ejecutar:

```text
/status
```

Verificar:

- perfil e identidad esperados;
- Codex CLI `0.156.1`;
- workspace `/home/marcelo/begasist`;
- sandbox y política de aprobación correspondientes al perfil;
- instrucciones específicas del rol cargadas.

El estado de sesión y el sentinel del perfil son evidencias complementarias:
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

La disponibilidad de esos archivos no implica que el rollback haya sido
ejecutado durante el cutover.

## Relación con el hito

`OPS-CODEX-SESSION-PROFILES-CUTOVER-01` promovió cinco perfiles definitivos en
el entorno operativo externo. Al ser un `external_operational_change`, su
technical commit, hash y push son `not_applicable`; la evidencia sustitutiva fue
auditada por Guardian. Esta guía registra el perímetro soportado sin convertir
los perfiles externos en contenido versionado del repositorio.
