# REFERENCE-RESOLUTION-SLICE-CONTRACT

DOCUMENT_TYPE: CONTRACT  
SCOPE: RUNTIME_SLICE  
SOURCE_OF_TRUTH: FALSE  
NORMATIVE: YES  

---

## STATUS

Contrato normativo derivado (derived normative contract) del slice de runtime descrito en `message_pipeline.md` (Reference resolution).

Este documento:
- no es source of truth
- no reemplaza `message_pipeline.md`
- no extrae el slice fuera de `messageHandler`
- define únicamente los boundaries del runtime actual

---

## SLICE CONTRACT: reference resolution

### INPUT

- `state`: estado conversacional actual (`conv_state`)
- `userText`: texto normalizado del usuario

Señales consumidas únicamente vía `state`:

- `selectedReservationTarget`
- `activeReservationContext`
- `reservationHistory`
- `lastReservation`
- `reservationSlots`

---

### OUTPUT

- `resolution`:  
  `resolved | ambiguous | out_of_range | unresolved`

- `target`:  
  `ReservationReferenceTarget | null`

- `actionableCandidates`
- `canonicalRecords`

- metadata de fallo:
  - `requestedOrdinal`
  - `availableCount`

---

### INVARIANTS

- el canonical state domina sobre cualquier señal derivada
- no se inventa un target bajo ambigüedad
- la resolución solo usa candidatos canónicos válidos
- ordinales fuera de rango no resuelven target
- referencias insuficientes degradan a `ambiguous` o `unresolved`
- no hay execution
- no hay persistencia
- no hay reply composition

---

### FORBIDDEN INSIDE SLICE

- guard replies
- gating final de `modify`, `cancel`, `snapshot`
- persistencia de `selectedReservationTarget`
- apertura de flows
- snapshot composition
- execution:
  - `modifyReservation`
  - `cancelReservation`
  - `confirmAndCreate`

---

### RUNTIME-LOCAL CALLABLE SURFACE

resolveReservationReference(state, userText)

- runtime-local only
- no es una API pública

---

### BOUNDARY RULE

Este slice es un decision layer.

Puede:
- construir contexto canónico
- detectar referencias
- validar existencia (existence validation)
- validar suficiencia (sufficiency validation)
- resolver target

No puede:
- ejecutar acciones
- persistir estado
- componer respuestas
- hacer enforcement de decisiones transaccionales
