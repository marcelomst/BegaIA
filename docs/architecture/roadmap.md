# 🧭 BEGASIST — ROADMAP (ALINEADO AL ESTADO REAL)

## 📌 REFERENCIA

ADR: `ADR-PIPELINE-RUNTIME-TARGET.md`

### Decisión base:

- `messageHandler` es el runtime principal ✔️
- NO migrar a graph aún ✔️

---

## CHECKPOINT — GUEST WEB TRUSTED INGRESS 2026-11-12

```yaml
guest_web_trusted_ingress:
  hito_id: DEMO-GUEST-WEB-TRUSTED-INGRESS-01
  technical_commit: 535367cddf5e0e55be1216f9e2902e3a63a1e438
  trusted_ingress: technical_implementation_committed
  controlled_docker_smoke: pending
  deployment_readiness: not_granted
  ready_for_public_tunnel: false
  ready_for_commercial_demo: false
  cancel_execution: disabled
  runtime_map_refresh_required: false
```

El stack Docker demo incorpora una unica frontera trusted ingress publicada
hacia `suite`, con listeners local y Cloudflare separados, acreditacion del
peer TCP, asercion HMAC para la identidad de rate limiting Guest y sanitizacion
HTTP bidireccional. La asercion firmada no sustituye la capability ni el grant
Guest y no crea una fuente paralela de autoridad.

Permanecen pendientes la validacion con Docker real de port-publish, DNAT,
`remoteAddress` y aislamiento entre bridges; la ejecucion del smoke Guest Web
controlado; y la rotacion y verificacion de credenciales, DNS y routing
Cloudflare. Este checkpoint no concede despliegue, tunel publico ni demo
comercial. Cancel permanece deshabilitado.

---

## CHECKPOINT — GUEST WEB CONVERSATION CAPABILITY 2026-11-12

```yaml
secure_conversational_foundation:
  hito_id: GUEST-WEB-CONVERSATION-CAPABILITY-01
  technical_commit: 92c0ee8592867f41ab66694a55ad4b63b791aa9a
  foundation_checkpoint: completed
  guest_web_conversation_capability: technical_implementation_committed
  controlled_smoke: pending
  deployment_readiness: not_granted
  commercial_demo_readiness: not_granted
  cancel_execution: disabled
  runtime_map_refresh_required: false
  secure_conversational_foundation: preserved
```

La implementacion tecnica de Guest Web incorpora identidad server-side,
capability y grant persistido separados de Staff, binding autorizado,
continuidad e historial, idempotencia durable, pending turns y rate limiting
con ingress HMAC. El locator del cliente es solo un indice local y no una
credencial ni fuente de autoridad.

Permanecen pendientes los smoke controlados con Astra y Redis reales, la
configuracion y acreditacion del ingress HMAC confiable y el procedimiento
operativo para reconciliar pending turns inciertos. Cancel permanece
deshabilitado, no se incorpora SSE y este checkpoint no concede readiness de
despliegue ni de demo comercial.

---

## 📌 CHECKPOINT COMERCIAL — DEMO VALIDADA 2026-07-22

```yaml
commercial_demo_checkpoint:
  status: closed
  commercial_dry_run: validated
  dry_run_date: 2026-07-22
  observed_duration_until_chau: 17m05s
  observed_duration_including_final_reply: 17m06s
  commercial_demo_asset: docs/product/demo-assets/demo_comercial_15_min_begaia.html
  extended_demo_asset: docs/product/demo-assets/demo_extendida_begaia.html
  multichannel_demo: validated
  canonical_guestId: cfcd4116-356d-4865-ab6b-63e1f8acbdfc
  reservations_order:
    - RES-A365BD Ana Rodríguez Email precargado
    - RES-37A215 Laura Gómez Web
    - RES-77A568 Martín Pérez WhatsApp
  farewell: validated
  documentation_sync: completed
  next_phase: commercial_presentations_with_prospects
  runtime_map_applies: false
```

Este checkpoint registra readiness comercial de demo controlada. No modifica el runtime target ni altera las reglas técnicas del roadmap.

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

# 🚀 NIVEL 2 — FOCUS GOVERNANCE (CERRADO — RUNTIME)

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

## ✅ RESULTADO REAL

- laterales puros resueltos sin contaminación de dominio
- create no secuestra turnos FAQ
- continuidad post-lateral preservada
- fallback lateral canónico cuando KB falla
- no descenso al graph transaccional en turnos laterales puros

👉 validado en runtime real + tests

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

# 🧩 PRE-NIVEL 4 — HARDEN RUNTIME BOUNDARIES (CERRADO)

👉 checkpoint alcanzado: `CHECKPOINT-PRE-NIVEL-4-RUNTIME-BOUNDARIES`

## OBJETIVO

endurecer comportamiento sistémico sin refactorizar

## FOCO

- contratos implícitos entre create / modify / verify / laterales
- precedencia determinística entre dominios
- continuidad sin pérdida de estado
- evidencia multi-turno real

## 🔒 REGLAS

NO extraer slices
NO modularizar
NO introducir nuevas capas
NO migrar a graph

## RESULTADO ESPERADO

- runtime completamente estable cross-slice
- comportamiento predecible
- evidencia suficiente para refactor seguro

---

# 🧠 NIVEL 4 — RUNTIME REFACTOR (CONDICIONAL)

👉 SOLO si:

## 📊 CONDICIONES DE ENTRADA (CHECKPOINT ARQUITECTÓNICO)

👉 Evaluación basada en evidencia, no en percepción

```text id="lvl4chk"
- comportamiento estable: ✔ / ⚠ / ❌
- slices claros: ✔ / ⚠ / ❌
- tests sólidos: ✔ / ⚠ / ❌
- evidencia cross-slice: ✔ / ⚠ / ❌
- readiness para refactor: ✔ / ⚠ / ❌
```

---

## 🧠 REGLA DE ACTUALIZACIÓN

```text id="lvl4rule"
Estos campos NO se actualizan por hito individual.

Se actualizan únicamente mediante:

- checkpoint arquitectónico explícito
- informe del agente arquitecto_sistema
```

---

## 📅 ÚLTIMO CHECKPOINT ARQUITECTÓNICO

```text id="lvl4last"
- estado: A) Listo
- comportamiento estable: ✔
- slices claros: ✔
- tests sólidos: ✔
- evidencia cross-slice: ✔
- readiness para refactor: ✔

- fuente:
  CHECKPOINT-PRE-NIVEL-4-RUNTIME-BOUNDARIES
  dictamen arquitecto_sistema + consistencia validada por repo_guardian
```

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

# 🧩 GOVERNANCE DEL ROADMAP (DINÁMICO)

👉 El roadmap es un documento vivo, pero con control de autoridad explícito.

---

## 🔒 REGLA

```text
El roadmap se actualiza solo con evidencia validada.
No por percepción ni por intención.
```

---

## 🧠 ROLES Y RESPONSABILIDADES

### 🛡️ Repo Guardian

- valida evidencia de cada hito
- determina impacto local en el runtime
- puede indicar:
  - mejora
  - mantenimiento
  - regresión

👉 NO decide estados de nivel
👉 NO modifica el roadmap directamente

---

### 🧠 Arquitecto_sistema

- evalúa estado estructural del sistema
- determina:
  - si un nivel está cerrado
  - si una condición de entrada se cumple
  - si el sistema está listo para avanzar de nivel

👉 única autoridad para cambios de estado global

---

### 📝 HDOC

- actualiza `roadmap.md`
- registra:
  - cambios de estado
  - evidencia consolidada
  - evolución del sistema

👉 ejecuta cambios solo si existe:

- evidencia validada por Guardian, y/o
- dictamen explícito de Arquitecto_sistema

---

## 🔁 TIPOS DE ACTUALIZACIÓN

### 1. Actualización LOCAL (por hito)

Ejemplos:

- capacidades consolidadas
- deuda residual
- estado operativo puntual

Flujo:

```text
Hito → Guardian valida → HDOC actualiza roadmap
```

---

### 2. Actualización ESTRUCTURAL (por nivel)

Ejemplos:

- “Nivel 2 cerrado”
- “Pre-Nivel 4 cerrado”
- “Nivel 4 habilitado por checkpoint”
- “condición slices claros = ⚠”

Flujo:

```text
Arquitecto evalúa → Guardian valida consistencia → HDOC actualiza roadmap
```

---

## 🚨 RESTRICCIÓN CLAVE

```text
Guardian valida.
Arquitecto decide.
HDOC documenta.
```

---

## 🎯 OBJETIVO

```text
Mantener el roadmap actualizado sin perder canonicidad,
evitando cambios arbitrarios o inconsistentes.
```

---

# 🧭 ORDEN OPERATIVO ACTUAL

```text
1. CANONICAL STATE (validación residual)
2. RUNTIME REFACTOR (entrada habilitada por checkpoint)
```

---

# 🧠 FRASE GUÍA

```text
El runtime no cambia.
El comportamiento se gobierna.
```
