# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-CREATE-PAST-CHECKIN-PRESERVE-INLINE-GUESTNAME-01

- Identificador: `FIX-CREATE-PAST-CHECKIN-PRESERVE-INLINE-GUESTNAME-01`
- Nombre: `FIX-CREATE-PAST-CHECKIN-PRESERVE-INLINE-GUESTNAME-01`
- Commit message: `FIX-CREATE-PAST-CHECKIN-PRESERVE-INLINE-GUESTNAME-01`
- Hash: `026fc30002084203336a3ce8154f387187372a49`
- Descripción breve: Preserva `guestName` inline y `roomType` cuando create recibe `checkIn` pasado inválido, evita persistir ese `checkIn` y mantiene bloqueadas quote/confirm, con refresh de Runtime Map V1.

## 2. FIX-CREATE-TEMPORAL-REPAIR-PRESERVE-DRAFT-STATE-01

- Identificador: `FIX-CREATE-TEMPORAL-REPAIR-PRESERVE-DRAFT-STATE-01`
- Nombre: `FIX-CREATE-TEMPORAL-REPAIR-PRESERVE-DRAFT-STATE-01`
- Commit message: `fix: preserve create draft state during checkout repair`
- Hash: `fb83bcf21794297c44a762ab71e75f8be10b40b1`
- Descripción breve: Corrige la reatribución de `checkOut` explícito como `checkIn` durante el repair temporal de create, preserva draft válido en `conv_state`, mantiene `checkIn`, `roomType` y `numGuests`, y refresca Runtime Map V1.

## 3. RECOVER-FIX-CREATE-EXPLICIT-CHECKOUT-SLOT-ATTRIBUTION-01

- Identificador: `RECOVER-FIX-CREATE-EXPLICIT-CHECKOUT-SLOT-ATTRIBUTION-01`
- Nombre: `RECOVER-FIX-CREATE-EXPLICIT-CHECKOUT-SLOT-ATTRIBUTION-01`
- Commit message: `fix: preserve explicit checkout attribution in create flow`
- Hash: `280a214d82510a5b51bcaf6a9f19af241cbd22a9`
- Descripción breve: Corrige en `reservation.create` la atribución errónea de `checkOut` explícito como `checkIn`, preserva `checkIn` y `numGuests`, bloquea quote/confirm con rango inválido y aplica refresh documental de Runtime Map V1.

## 4. DOC-RUNTIME-MAP-V1-HITOS-CAPSULAS-GOVERNANCE-01

- Identificador: `DOC-RUNTIME-MAP-V1-HITOS-CAPSULAS-GOVERNANCE-01`
- Nombre: `DOC-RUNTIME-MAP-V1-HITOS-CAPSULAS-GOVERNANCE-01`
- Commit message: `docs: integrar Runtime Map V1 al flujo operativo de hitos y cápsulas`
- Hash: `3b52700df47e8a513642314000ea19801a902cb8`
- Descripción breve: Se integra Runtime Map V1 al flujo operativo de cápsulas, hitos y gobernanza central, reforzando `system_operating_model.md` como contrato y consolidando la trazabilidad `AGPT -> agentes -> Guardian -> HDOC`.

## 5. RECOVER-SUITE-TEMPORAL-FIXTURES-AFTER-PAST-CHECKIN-GUARD-01

- Identificador: `RECOVER-SUITE-TEMPORAL-FIXTURES-AFTER-PAST-CHECKIN-GUARD-01`
- Nombre: `RECOVER-SUITE-TEMPORAL-FIXTURES-AFTER-PAST-CHECKIN-GUARD-01`
- Commit message: `RECOVER-SUITE-TEMPORAL-FIXTURES-AFTER-PAST-CHECKIN-GUARD-01`
- Hash: `ff41f7db4725c24e3aa200602db2796242c3baae`
- Descripción breve: Se recupera la suite completa tras el guard de `past_checkin` ajustando solo fixtures y expectativas temporales en specs afectadas, sin tocar runtime ni `messageHandler`.

## 6. FIX-RESERVATION-CREATE-PAST-CHECKIN-GATING-01

- Identificador: `FIX-RESERVATION-CREATE-PAST-CHECKIN-GATING-01`
- Nombre: `FIX-RESERVATION-CREATE-PAST-CHECKIN-GATING-01`
- Commit message: `FIX-RESERVATION-CREATE-PAST-CHECKIN-GATING-01`
- Hash: `e7afd760950eeab1c7618c3d647b4db598b9eb4a`
- Descripción breve: Se bloquea centralmente en `reservation.create` cualquier draft con `checkIn` pasado antes de availability, quote, proposal o confirmación, limpiando el rango inválido y preservando slots seguros.

## 7. RECOVER-RESERVATION-GRAPH-TYPING-FIXTURE-STABILITY-01

- Identificador: `RECOVER-RESERVATION-GRAPH-TYPING-FIXTURE-STABILITY-01`
- Nombre: `RECOVER-RESERVATION-GRAPH-TYPING-FIXTURE-STABILITY-01`
- Commit message: `FIX-EMAIL-RESERVATION-FOLLOWUP-GROUPED-MISSING-SLOTS-01`
- Hash: `2bf062dd3154d0c59300225d6a4f368aa8f2a67c`
- Descripción breve: Se reclasifica el commit real `2bf062d` como recuperación menor de estabilidad, acotada a una corrección de tipado en `reservation.ts` y estabilización de fixtures/mocks del spec, dejando diferido el fix funcional amplio de Email/create flow.

## 8. FIX-EMAIL-RESERVATION-FOLLOWUP-GROUPED-MISSING-SLOTS-01

- Identificador: `FIX-EMAIL-RESERVATION-FOLLOWUP-GROUPED-MISSING-SLOTS-01`
- Nombre: `FIX-EMAIL-RESERVATION-FOLLOWUP-GROUPED-MISSING-SLOTS-01`
- Commit message: `FIX-EMAIL-RESERVATION-FOLLOWUP-GROUPED-MISSING-SLOTS-01`
- Hash: `5119f31ff44277386baa12db35b1822ae0ec70a1`
- Descripción breve: Se corrige la continuidad del create flow por Email para que, tras una respuesta parcial, los faltantes reales restantes sigan formulándose de manera agrupada, mientras Web y WhatsApp preservan sequencing incremental.

## 9. FIX-EMAIL-INBOUND-DEDUPLICATE-REPLY-03

- Identificador: `FIX-EMAIL-INBOUND-DEDUPLICATE-REPLY-03`
- Nombre: `FIX-EMAIL-INBOUND-DEDUPLICATE-REPLY-03`
- Commit message: `FIX-EMAIL-INBOUND-DEDUPLICATE-REPLY-03`
- Hash: `a164dba7f9be0ee878fa8e6e210baeb4aaee4a63`
- Descripción breve: Se agrega un guard idempotente efectivo en Email inbound antes del pipeline y antes del SMTP para evitar replies duplicados sobre un mismo inbound real, manteniendo retry legítimo ante error.

## 10. CHORE-WIPE-CONVERSATIONAL-STATE-SCRIPT-DOC-01

- Identificador: `CHORE-WIPE-CONVERSATIONAL-STATE-SCRIPT-DOC-01`
- Nombre: `CHORE-WIPE-CONVERSATIONAL-STATE-SCRIPT-DOC-01`
- Commit message: `CHORE-WIPE-CONVERSATIONAL-STATE-SCRIPT-DOC-01`
- Hash: `eab23b24051046f36dcabe5a66f31f40c4365965`
- Descripción breve: Se formaliza la documentación operativa del script de wipe conversacional, explicitando uso destructivo manual solo en dev/test y dejando `reservations` y otros estados no listados fuera de scope.
