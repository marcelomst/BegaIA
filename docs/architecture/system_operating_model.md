# SYSTEM OPERATING MODEL — BEGASIST

## 🎯 PROPÓSITO

Definir el modelo operativo de desarrollo de Begasist, asegurando:

- coherencia arquitectónica
- disciplina Git estricta
- trazabilidad completa de cambios
- colaboración eficiente entre agentes (ChatGPT + Codex + Marcelo)

---

## 🧠 PRINCIPIO FUNDAMENTAL

El sistema se basa en separación de roles:

- **Pensar (arquitectura y estrategia)**
- **Ejecutar (código)**
- **Controlar (repo y documentación)**

---

## 👥 ROLES DEL SISTEMA

El sistema se opera mediante:

- Marcelo (gatekeeper)
- ChatGPT (arquitectura/orquestación)
- agentes especializados definidos en `/home/marcelo/.codex/config.toml`

---

### 👤 Marcelo (Gatekeeper del repositorio)

Responsabilidad absoluta sobre el repositorio.

- único autorizado a ejecutar comandos Git de escritura
- valida decisiones finales
- ejecuta comandos uno por uno
- devuelve output real (copy/paste)

🔐 Regla clave:

> Marcelo tiene la llave de la caja fuerte del repositorio.

---

### 🧠 ChatGPT (Arquitectura y Orquestación)

Responsable de:

- diseño de arquitectura
- definición de hitos
- generación de prompts estructurados
- validación conceptual
- coherencia global del sistema

NO:

- escribe código productivo
- ejecuta Git
- modifica el repo

---

### 🔵 `agent.asistente_tecnico` (Ejecución técnica)

Responsable de:

- debugging de TypeScript, React, Next.js y API routes
- implementación de fixes y lógica de negocio
- cambios en pipeline, handlers, KB, AstraDB
- entrega de archivos completos listos para usar

Límites:

- no inventar archivos inexistentes
- no romper compatibilidad del pipeline
- no cambiar contratos sin justificación

Uso:

- implementación concreta
- corrección de bugs
- ajustes del pipeline

---

### 🧠 `agent.arquitecto_sistema` (Arquitectura)

Responsable de:

- análisis end-to-end del sistema
- mapeo de flujos y componentes
- detección de acoplamientos y riesgos
- definición de evolución arquitectónica
- generación de decisiones tipo ADR

Límites:

- no refactors masivos sin plan
- no reemplazar runtime vigente sin evidencia
- no inventar archivos

Uso:

- decisiones estructurales
- análisis de deuda técnica
- diseño evolutivo

---

### ⚫ `agent.repo_guardian` (Disciplina Git)

Responsable de:

- auditar estado del repo
- detectar mezcla de cambios
- validar coherencia de hito
- sugerir tipo y nombre de commit

No hace:

- no modifica código
- no ejecuta Git de escritura

Gobernanza:

- puede usar solo comandos Git readonly
- entrega comandos de escritura a Marcelo uno por vez

Regla:

- 1 commit = 1 hito

---

### ⚪ `agent.hdoc` (Disciplina Documental)

Responsable de:

- validar cierre de hitos
- mantener `hito_mcp.md`
- asegurar coherencia documental

Regla central:

```text
CODE → COMMIT → HASH → PUSH → DOC
```

No hace:

- no modifica código productivo
- no ejecuta Git de escritura
- no documenta sin evidencia real

Gobernanza:

- si falta commit/hash/push → bloquea documentación
- entrega comandos a Marcelo uno por uno si hace falta

---

## 🔁 SECUENCIA OPERATIVA ENTRE AGENTES

Flujo estándar:

1. ChatGPT define problema o hito
2. `agent.arquitecto_sistema` analiza si es necesario
3. `agent.asistente_tecnico` implementa cambios
4. `agent.repo_guardian` audita el working tree
5. Marcelo ejecuta comandos Git manualmente
6. `agent.hdoc` valida evidencia y cierra documentación

---

## 🔁 FLUJO OPERATIVO

### 1. DISEÑO (ChatGPT)

- define problema
- propone solución
- genera prompt para agentes

---

### 2. IMPLEMENTACIÓN (asistente_tecnico)

- aplica cambios
- muestra código/diff
- corre tests

---

### 3. VALIDACIÓN (Marcelo)

- revisa cambios
- decide avanzar

---

### 4. DISCIPLINA GIT (repo_guardian)

Input:

```bash
git status --short --branch
git diff --name-only
git diff --stat
```

Output:

- diagnóstico
- dictamen (commit / dividir / esperar / volver a MVC)
- nombre de commit

---

### 5. EJECUCIÓN GIT (Marcelo)

Siempre:

- un comando por vez
- ejecución manual
- retorno de output

Ejemplo:

```bash
git add <files>
git commit -m "fix(pipeline-core): stabilize verify pending flow"
git push
git rev-parse --short HEAD
```

---

### 6. DOCUMENTACIÓN (hdoc)

Valida:

- código implementado
- commit realizado
- hash real
- push confirmado

Luego:

- actualiza `hito_mcp.md`

---

## 📐 REGLAS DE ORO

### 🔹 Git

- 1 commit = 1 hito
- no mezclar capas
- usar `git add` selectivo
- no commitear con dudas

---

### 🔹 Hitos

Un hito debe:

- tener una intención clara
- ser explicable en una frase
- ser reversible
- no mezclar dominios

---

### 🔹 Documentación

- no documentar sin hash real
- no inventar commits
- no cerrar hitos incompletos

---

### 🔹 Agentes

- cada agente tiene un dominio claro
- no mezclar responsabilidades
- usar handoff por cápsulas de contexto

---

## 🧩 DOMINIOS DE CHAT

Convención:

```text
CHAT NAME: <DOMAIN>-<SUBDOMAIN>-<NN>
```

Ejemplos:

- PIPELINE-CORE-01
- ARCH-SYSTEM-01
- GIT-DISCIPLINE-01
- GIT-HITOS-01

---

## 🔄 HANDOFF ENTRE CHATS

Siempre usar cápsulas de contexto con:

- estado actual
- decisiones tomadas
- problemas
- siguiente paso

Evitar:

- copiar chats completos
- arrastrar ruido

---

## ⚠️ ANTIPATRONES

Evitar:

- commits con cambios mezclados
- documentación sin código real
- asumir ejecución de comandos
- refactors grandes sin plan incremental
- lógica crítica fuera del pipeline central

---

## 🚀 PRINCIPIO FINAL

```text
Si no hay trazabilidad → no existe.
Si no hay evidencia → no se documenta.
Si no hay control → no se commitea.
```

---

## 🧭 FILOSOFÍA

Begasist no es solo un sistema.

Es un sistema que:

- evoluciona de forma controlada
- mantiene coherencia en el tiempo
- puede escalar sin perder orden

---

**Este documento define cómo se construye el sistema, no solo qué se construye.**
