# 🧭 BEGASIST — ROADMAP (ALINEADO AL ESTADO REAL)

## 📌 REFERENCIA

ADR: `adr_pipeline_runtime_target.md`

### Decisión base:

- `messageHandler` es el runtime principal ✔️
- NO migrar a graph aún ✔️

---

# 🧠 PRINCIPIO RECTOR (OBLIGATORIO)

```text
NO cambiar el runtime hasta estabilizar completamente el comportamiento
```

---

# 🧱 NIVEL 0 — FUNDACIÓN (CERRADO)

### Estado explícito + reference engine

- selectedReservationTarget ✔️
- ordinales ✔️
- anáforas ✔️
- lifecycle ✔️
- modify substate ✔️
- date coherence ✔️

👉 Resultado:

```text
runtime state-driven mínimo viable
```

---

# 🧩 NIVEL 1 — STABILIZE RUNTIME BEHAVIOR (CERRADO — RUNTIME)

👉 OBJETIVO (CERRADO):

```text
hacer el runtime confiable SIN cambiar su arquitectura
```

---

## 🔒 REGLA DE ESTE NIVEL

```text
TODO cambio debe vivir dentro de messageHandler
NO introducir nuevos motores
NO introducir graph
NO crear capas paralelas
```

---

## ✅ YA IMPLEMENTADO

### Domain Governance

- DOMAIN-LOCK-01
- DOMAIN-LOCK-02

### Fallback Governance

- FALLBACK-HIERARCHY-01

### Modify Control

- MODIFY-SUBSTATE-01

### Reference Coverage

- REFERENCE-COVERAGE-01

### Validación

- DATE-COHERENCE-01

---

# 🟢 CAPACIDADES CONSOLIDADAS (NO PENDIENTES)

Estas capacidades ya están implementadas en runtime, documentadas y cubiertas por test suite.

### RANGE GUARDS

- validación de ordinal fuera de rango
- bloqueo de ejecución inválida
- solicitud de aclaración

### AMBIGUITY GATING

- detección de múltiples targets
- bloqueo de ejecución sin claridad
- solicitud de aclaración

### SLOT INGESTION

- ingestión completa en un turno
- reducción de repreguntas redundantes

### CREATE SEQUENCING

- orden natural del flujo
- evita propuesta prematura

---

## ⚠️ DEUDA RESIDUAL (EXPLÍCITA)

### CANONICAL STATE (validación adicional)

- dedupe adicional
- edge cases de consistencia
- validación extendida

---

## 🎯 RESULTADO DEL NIVEL 1

```text
runtime determinístico, estable y confiable en reservation
```

---

## 📌 ESTADO DEL DOMINIO `reservation`

Capacidades consolidadas:

- canonical state como fuente de verdad
- slot ingestion gobernado
- draft consistency validation
- create sequencing
- quote gating
- reference resolution con existence y sufficiency validation
- modify execution integrity
- cancel execution integrity

---

## ✅ CONDICIÓN DE CIERRE

- execution == source of truth
- no persistir estado inválido
- no perder continuidad resoluble
- no memoria lateral
- mono-dominio por turno

---

# 🧠 NIVEL 1.5 — MAKE SLICES EXPLICIT (IMPLÍCITO)

👉 SIN refactor

```text
reference resolution
target lifecycle
modify substate
domain governance
fallback governance
date coherence
```

## ⚠️ REGLA

```text
IDENTIFICAR slices ≠ EXTRAER slices
```

---

# 🚀 NIVEL 2 — FOCUS GOVERNANCE (CONTROLADO)

## CONDICIÓN DE ENTRADA

```text
runtime estable
invariantes cumplidas
test suite robusta
```

---

## REF-PIPELINE-FOCUS-GOVERNANCE-01

👉 Solo con Nivel 1 cerrado

---

## 🔒 REGLAS

```text
NO crear nuevo runtime
NO mover lógica fuera de messageHandler
NO introducir graph
```

---

## ✔️ PERMITIDO

```ts
conversationFocus;
```

- scheduler simple
- control cross-domain

---

## ❌ PROHIBIDO

- engine paralelo
- router externo
- reescritura del pipeline

---

# 🧱 NIVEL 3 — CROSS-DOMAIN GOVERNANCE

Aplicar modelo a:

- amenities
- billing
- support

## 🔒 REGLA

```text
extender, no rediseñar
```

---

# 🧠 NIVEL 4 — RUNTIME REFACTOR (CONDICIONAL)

👉 SOLO si:

- comportamiento estable ✔️
- slices claros ✔️
- tests sólidos ✔️

---

## POSIBLES ACCIONES

- extraer slices
- modularizar
- evaluar graph

---

## 🚨 CONDICIÓN

```text
NO refactor sin evidencia de estabilidad
```

---

# ⚠️ ANTI-PATRONES

```text
❌ migrar a graph prematuramente
❌ duplicar runtime
❌ introducir abstracciones innecesarias
❌ mezclar refactor con fixes
❌ romper comportamiento estable
```

---

# 🧭 ORDEN OPERATIVO ACTUAL

```text
1. CANONICAL STATE (validación residual)
2. FOCUS GOVERNANCE
```

---

# 🧠 FRASE GUÍA

```text
El runtime no cambia.
El comportamiento se gobierna.
```
