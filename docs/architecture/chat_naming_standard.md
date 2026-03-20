Vamos a dejar un naming estándar operativo alineado con:

- tu disciplina de hitos (HITO-\*)
- tu forma de trabajar con agentes
- tu arquitectura Begasist
- y optimizado para no romper Codex

---

# 🧠 🎯 NAMING STANDARD — CHATS BEGASIST

Formato base:

```text
<DOMINIO>-<SUBDOMINIO>-<NÚMERO>
```

Ejemplo:

```text
PIPELINE-CORE-01
KB-TOKENS-01
MCP-RESERVATIONS-01
```

---

# 🧩 1️⃣ DOMINIOS PRINCIPALES

Estos son fijos (no inventar nuevos salvo necesidad real):

| Código   | Dominio                    |
| -------- | -------------------------- |
| PIPELINE | lógica conversacional      |
| KB       | knowledge base             |
| MCP      | reservas / channel manager |
| CHANNELS | entrada/salida mensajes    |
| ADMIN    | panel                      |
| DATA     | persistencia / Astra       |
| AUTH     | usuarios / seguridad       |
| GIT      | disciplina / hitos         |
| ARCH     | arquitectura global        |

---

# 🔍 2️⃣ SUBDOMINIOS

### PIPELINE

- CORE
- CLASSIFICATION
- FOLLOWUPS
- STATE
- HEURISTICS

Ej:

```text
PIPELINE-CORE-01
PIPELINE-FOLLOWUPS-02
```

---

### KB

- TOKENS
- TEMPLATES
- HYDRATION
- QA

```text
KB-TOKENS-01
KB-QA-02
```

---

### MCP

- RESERVATIONS
- ADAPTER
- TESTS

```text
MCP-RESERVATIONS-01
MCP-ADAPTER-01
```

---

### CHANNELS

- WEB
- EMAIL
- WHATSAPP
- PARSING

```text
CHANNELS-WEB-01
CHANNELS-WHATSAPP-01
```

---

### ADMIN

- UI
- GUESTS
- USERS
- CHANNELS

```text
ADMIN-GUESTS-01
ADMIN-USERS-01
```

---

### DATA

- ASTRA
- VECTOR
- SCHEMA

```text
DATA-ASTRA-01
DATA-VECTOR-01
```

---

### AUTH

- LOGIN
- TOKENS
- VERIFICATION

```text
AUTH-LOGIN-01
AUTH-TOKENS-01
```

---

### GIT

- DISCIPLINE
- HITOS
- COMMITS

```text
GIT-DISCIPLINE-01
GIT-HITOS-01
```

---

### ARCH

- SYSTEM
- ADR
- ROADMAP

```text
ARCH-SYSTEM-01
ARCH-ADR-01
```

---

# 🔢 3️⃣ NUMERACIÓN

Muy importante

- `-01` → chat inicial del dominio
- `-02`, `-03` → cuando el chat se satura o cambia de fase

Ejemplo:

```text
PIPELINE-CORE-01  → diseño inicial
PIPELINE-CORE-02  → refactor
PIPELINE-CORE-03  → optimización
```

---

# 🧠 4️⃣ REGLAS DE USO

## ✅ SIEMPRE

- mantener un chat por dominio
- continuar numeración si crece
- no mezclar dominios

---

## ❌ NUNCA

NO hacer:

```text
CHAT GENERAL
TESTING
COSAS VARIAS
PIPELINE + KB + MCP mezclado
```

---

# ⚙️ 5️⃣ TEMPLATE PARA INICIAR UN CHAT NUEVO

Copiá esto SIEMPRE al crear uno:

```text
CONTEXTO — BEGASIST

Dominio: [PIPELINE-CORE]

Estado actual:
- [bullet 1]
- [bullet 2]
- [bullet 3]

Hito relacionado:
[HITO-XXXX]

Objetivo:
[qué querés lograr]

Restricciones:
- mantener compatibilidad
- no romper pipeline
- respetar estructura actual

Tarea:
[lo que querés que haga el agente]
```

---

# 🧩 6️⃣ EJEMPLO REAL TUYO

Para lo que estás haciendo ahora:

```text
PIPELINE-FOLLOWUPS-01
```

Porque estás trabajando:

- availability.ts
- confirmaciones tipo “dale”
- conversationStage

---

# 🧠 7️⃣ BONUS — MAPEO CON AGENTES

| Agente             | Chat                      |
| ------------------ | ------------------------- |
| asistente_tecnico  | PIPELINE / MCP / CHANNELS |
| arquitecto_kb      | KB                        |
| arquitecto_sistema | ARCH                      |
| repo_guardian      | GIT                       |
| hdoc               | GIT                       |

---

# 🚀 CONCLUSIÓN

Esto te permite:

- escalar sin caos
- reducir consumo Codex
- mantener contexto útil
- operar como equipo estructurado

---

Si hace falta, el siguiente paso natural es armar un mapa de chats activos
para decidir en qué conversación trabajar cada dominio.
