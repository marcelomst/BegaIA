# Flujo ideal con plantilla en archivos

## Objetivo

Mantener continuidad operativa entre chats sin perder trazabilidad,
minimizando uso de tokens y evitando reinterpretación innecesaria.

---

## En chat viejo

- Usar `CAPSULE_TEMPLATE_V3.md` como formato obligatorio.
- Completarla con el estado actual real del desarrollo.
- Incluir:
  - hito actual
  - estado del flujo
  - evidencia mínima (hash, diff resumido, etc.)
  - próximo paso esperado

---

## En chat nuevo

- Usar la cápsula como contrato de trabajo.
- NO reinterpretar el sistema desde cero.
- NO reconstruir contexto histórico innecesario.

AGPT debe:

- continuar desde el estado definido en la cápsula
- respetar el System Operating Model
- usar `config.toml` como definición operativa de agentes

---

## REGLA CLAVE

A partir de la cápsula:

👉 TODOS los nuevos hitos deben generarse usando `HITO_TEMPLATE_V1`

---

## REGLA DE EFICIENCIA (CRÍTICO)

AGPT debe:

- transportar estado, no reasoning
- evitar copiar salidas completas de agentes
- no repetir reglas ya definidas en:
  - `config.toml`
  - `system_operating_model.md`
- usar contexto mínimo suficiente

---

## PRINCIPIO

```text
Cápsula = estado
Hito = ejecución

🔥 🧩 PROMPT — CHAT VIEJO (GENERAR CÁPSULA)

👉 lo usás cuando el chat empieza a degradarse

Usar CAPSULE_TEMPLATE_V3.md como formato obligatorio.

Completarla con el estado actual real del desarrollo.

Incluir:

- hito actual
- agent_target
- flow_position
- estado del flujo
- evidencia mínima (commit_hash si existe, archivos afectados, diff resumido)
- resultado del último agente (resumido)
- próximo paso exacto

Aplicar REGLA DE ORQUESTACIÓN LOW-TOKEN:

- NO copiar reasoning completo
- NO incluir explicaciones largas
- NO duplicar reglas de config.toml ni system_operating_model.md
- transportar solo estado operativo mínimo

La cápsula debe quedar lista para continuar en un nuevo chat sin reinterpretación.

🚀 🧠 PROMPT — CHAT NUEVO (ARRANQUE LIMPIO)

👉 lo usás al abrir el nuevo chat + pegar cápsula

Esta cápsula es el contrato de trabajo.

NO reinterpretar el sistema desde cero.
NO reconstruir contexto histórico innecesario.

Continuar exactamente desde el estado definido.

A partir de ahora:

- TODOS los hitos deben generarse usando HITO_TEMPLATE_V1
- respetar agent_target y flow_position
- usar config.toml como fuente de verdad de agentes
- respetar system_operating_model.md como contrato operativo

Aplicar REGLA DE ORQUESTACIÓN LOW-TOKEN:

- transportar estado, no reasoning
- no copiar outputs completos de agentes
- no repetir reglas ya definidas

Objetivo:

Continuar el flujo operativo con el próximo hito correcto.

🧠 Cómo usarlo (flujo real)
1. Chat viejo
(pegar prompt de cápsula)

↓

AGPT te genera cápsula

2. Chat nuevo
(pegar cápsula)
(pegar prompt de arranque)
```
