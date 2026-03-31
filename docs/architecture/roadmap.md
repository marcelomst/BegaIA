Perfecto — este es el momento justo para hacerlo.

Te voy a dejar el **roadmap ajustado explícitamente al ADR**, no solo compatible, sino **protegido contra desvíos**.

---

# 🧭 BEGASIST — ROADMAP AJUSTADO (ALINEADO AL ADR)

## 📌 REFERENCIA

ADR: `adr_pipeline_runtime_target.md`

### Decisión base:

* `messageHandler` es el runtime principal ✔️
* NO migrar a graph aún ✔️

---

# 🧠 PRINCIPIO RECTOR (OBLIGATORIO)

```text
NO cambiar el runtime hasta estabilizar completamente el comportamiento
```

---

# 🧱 NIVEL 0 — FUNDACIÓN (CERRADO)

### Estado explícito + reference engine

* selectedReservationTarget ✔️
* ordinales ✔️
* anáforas ✔️
* lifecycle ✔️
* modify substate ✔️
* date coherence ✔️

👉 Resultado:

```text
runtime state-driven mínimo viable
```

---

# 🧩 NIVEL 1 — STABILIZE RUNTIME BEHAVIOR (EN CURSO)

👉 OBJETIVO:

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

* DOMAIN-LOCK-01
* DOMAIN-LOCK-02

---

### Fallback Governance

* FALLBACK-HIERARCHY-01

---

### Modify Control

* MODIFY-SUBSTATE-01

---

### Reference Coverage

* REFERENCE-COVERAGE-01

---

### Validación

* DATE-COHERENCE-01

---

## 🔴 PENDIENTES (CRÍTICOS)

### 1. FIX-PIPELINE-REFERENCE-RANGE-GUARDS-01

👉 seguridad conversacional

* validar ordinal fuera de rango
* bloquear ejecución inválida
* pedir aclaración

---

### 2. FIX-PIPELINE-AMBIGUITY-GATING-01

👉 control de ambigüedad

* detectar múltiples targets
* bloquear ejecución sin claridad
* pedir aclaración

---

### 3. FIX-PIPELINE-RESERVATION-CANONICAL-STATE-01

👉 consistencia de datos

* dedupe por reservationId
* estado correcto (active/cancelled)

---

### 4. FIX-PIPELINE-SLOT-INGESTION-01

👉 robustez de input

* ingestión completa en un turno
* evitar repreguntas redundantes

---

### 5. FIX-PIPELINE-CREATE-SEQUENCING-01

👉 coherencia UX

* orden natural del flujo
* no propuesta prematura

---

## 🎯 RESULTADO ESPERADO DEL NIVEL 1

```text
runtime determinístico, estable y confiable en reservation
```

---

# 🧠 NIVEL 1.5 — MAKE SLICES EXPLICIT (IMPLÍCITO)

👉 SIN refactor

👉 SOLO identificar y consolidar internamente:

```text
reference resolution
target lifecycle
modify substate
domain governance
fallback governance
date coherence
```

---

## ⚠️ REGLA CRÍTICA

```text
IDENTIFICAR slices ≠ EXTRAER slices
```

---

# 🚀 NIVEL 2 — FOCUS GOVERNANCE (CONTROLADO)

## REF-PIPELINE-FOCUS-GOVERNANCE-01

👉 SOLO cuando Nivel 1 esté completo

---

## 🔒 REGLAS DE ESTE NIVEL

```text
NO crear nuevo runtime
NO mover lógica fuera de messageHandler
NO introducir graph
```

---

## ✔️ PERMITIDO

* introducir estructura explícita:

```ts
conversationFocus
```

* lógica de scheduler simple
* control de dominio cross-flow

👉 todo dentro del runtime actual

---

## ❌ PROHIBIDO

* engine paralelo
* router externo
* reescritura del pipeline

---

# 🧱 NIVEL 3 — CROSS-DOMAIN GOVERNANCE

👉 aplicar modelo a:

* amenities
* billing
* support

---

## 🔒 REGLA

```text
extender, no rediseñar
```

---

# 🧠 NIVEL 4 — RUNTIME REFACTOR (CONDICIONAL)

👉 SOLO si:

* comportamiento estable ✔️
* slices claros ✔️
* tests sólidos ✔️

---

## POSIBLES ACCIONES

* extraer slices de messageHandler
* modularización
* evaluar graph

---

## 🚨 CONDICIÓN

```text
NO refactor sin evidencia de estabilidad
```

---

# ⚠️ ANTI-PATRONES (PROHIBIDOS)

```text
❌ migrar a graph prematuramente
❌ duplicar runtime
❌ introducir abstracciones sin necesidad real
❌ mezclar refactor con fixes
❌ romper comportamiento estable
```

---

# 🧭 ORDEN OPERATIVO ACTUAL

1. RANGE GUARDS
2. AMBIGUITY GATING
3. CANONICAL STATE
4. SLOT INGESTION
5. CREATE SEQUENCING
6. FOCUS GOVERNANCE

---

# 🧠 INSIGHT FINAL

```text
No estás cambiando la arquitectura.
Estás haciendo explícitas sus reglas internas.
```

---

# 🎯 FRASE GUÍA

```text
El runtime no cambia.
El comportamiento se gobierna.
```

---

---

# 🚀 Qué cambia con este ajuste

Antes:

* roadmap correcto pero implícito respecto al ADR

Ahora:

* roadmap con **guardrails explícitos contra desviación**

---

# 🎯 Resultado

Esto te asegura:

* no desviarte hacia graph prematuramente
* no romper el runtime actual
* no caer en refactors peligrosos
* avanzar igual de rápido, pero seguro

---

## 👉 Siguiente paso

Podés seguir con total confianza con:

```text
FIX-PIPELINE-REFERENCE-RANGE-GUARDS-01
```

Si querés, en el nuevo chat arrancamos directo con ese prompt 👍
