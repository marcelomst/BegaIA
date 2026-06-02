# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. DOC-RUNTIME-MAP-V1-HITOS-CAPSULAS-GOVERNANCE-01

- Identificador: `DOC-RUNTIME-MAP-V1-HITOS-CAPSULAS-GOVERNANCE-01`
- Nombre: `DOC-RUNTIME-MAP-V1-HITOS-CAPSULAS-GOVERNANCE-01`
- Commit message: `docs: integrar Runtime Map V1 al flujo operativo de hitos y cápsulas`
- Hash: `3b52700df47e8a513642314000ea19801a902cb8`
- Descripción breve: Se integra Runtime Map V1 al flujo operativo de cápsulas, hitos y gobernanza central, reforzando `system_operating_model.md` como contrato y consolidando la trazabilidad `AGPT -> agentes -> Guardian -> HDOC`.

## 2. RECOVER-SUITE-TEMPORAL-FIXTURES-AFTER-PAST-CHECKIN-GUARD-01

- Identificador: `RECOVER-SUITE-TEMPORAL-FIXTURES-AFTER-PAST-CHECKIN-GUARD-01`
- Nombre: `RECOVER-SUITE-TEMPORAL-FIXTURES-AFTER-PAST-CHECKIN-GUARD-01`
- Commit message: `RECOVER-SUITE-TEMPORAL-FIXTURES-AFTER-PAST-CHECKIN-GUARD-01`
- Hash: `ff41f7db4725c24e3aa200602db2796242c3baae`
- Descripción breve: Se recupera la suite completa tras el guard de `past_checkin` ajustando solo fixtures y expectativas temporales en specs afectadas, sin tocar runtime ni `messageHandler`.

## 3. FIX-RESERVATION-CREATE-PAST-CHECKIN-GATING-01

- Identificador: `FIX-RESERVATION-CREATE-PAST-CHECKIN-GATING-01`
- Nombre: `FIX-RESERVATION-CREATE-PAST-CHECKIN-GATING-01`
- Commit message: `FIX-RESERVATION-CREATE-PAST-CHECKIN-GATING-01`
- Hash: `e7afd760950eeab1c7618c3d647b4db598b9eb4a`
- Descripción breve: Se bloquea centralmente en `reservation.create` cualquier draft con `checkIn` pasado antes de availability, quote, proposal o confirmación, limpiando el rango inválido y preservando slots seguros.

## 4. RECOVER-RESERVATION-GRAPH-TYPING-FIXTURE-STABILITY-01

- Identificador: `RECOVER-RESERVATION-GRAPH-TYPING-FIXTURE-STABILITY-01`
- Nombre: `RECOVER-RESERVATION-GRAPH-TYPING-FIXTURE-STABILITY-01`
- Commit message: `FIX-EMAIL-RESERVATION-FOLLOWUP-GROUPED-MISSING-SLOTS-01`
- Hash: `2bf062dd3154d0c59300225d6a4f368aa8f2a67c`
- Descripción breve: Se reclasifica el commit real `2bf062d` como recuperación menor de estabilidad, acotada a una corrección de tipado en `reservation.ts` y estabilización de fixtures/mocks del spec, dejando diferido el fix funcional amplio de Email/create flow.

## 5. FIX-EMAIL-RESERVATION-FOLLOWUP-GROUPED-MISSING-SLOTS-01

- Identificador: `FIX-EMAIL-RESERVATION-FOLLOWUP-GROUPED-MISSING-SLOTS-01`
- Nombre: `FIX-EMAIL-RESERVATION-FOLLOWUP-GROUPED-MISSING-SLOTS-01`
- Commit message: `FIX-EMAIL-RESERVATION-FOLLOWUP-GROUPED-MISSING-SLOTS-01`
- Hash: `5119f31ff44277386baa12db35b1822ae0ec70a1`
- Descripción breve: Se corrige la continuidad del create flow por Email para que, tras una respuesta parcial, los faltantes reales restantes sigan formulándose de manera agrupada, mientras Web y WhatsApp preservan sequencing incremental.

## 6. FIX-EMAIL-INBOUND-DEDUPLICATE-REPLY-03

- Identificador: `FIX-EMAIL-INBOUND-DEDUPLICATE-REPLY-03`
- Nombre: `FIX-EMAIL-INBOUND-DEDUPLICATE-REPLY-03`
- Commit message: `FIX-EMAIL-INBOUND-DEDUPLICATE-REPLY-03`
- Hash: `a164dba7f9be0ee878fa8e6e210baeb4aaee4a63`
- Descripción breve: Se agrega un guard idempotente efectivo en Email inbound antes del pipeline y antes del SMTP para evitar replies duplicados sobre un mismo inbound real, manteniendo retry legítimo ante error.

## 7. CHORE-WIPE-CONVERSATIONAL-STATE-SCRIPT-DOC-01

- Identificador: `CHORE-WIPE-CONVERSATIONAL-STATE-SCRIPT-DOC-01`
- Nombre: `CHORE-WIPE-CONVERSATIONAL-STATE-SCRIPT-DOC-01`
- Commit message: `CHORE-WIPE-CONVERSATIONAL-STATE-SCRIPT-DOC-01`
- Hash: `eab23b24051046f36dcabe5a66f31f40c4365965`
- Descripción breve: Se formaliza la documentación operativa del script de wipe conversacional, explicitando uso destructivo manual solo en dev/test y dejando `reservations` y otros estados no listados fuera de scope.

## 8. ALIGN-NAMED-MONTH-DATE-INFERENCE-WITH-RUNTIME-01

- Identificador: `ALIGN-NAMED-MONTH-DATE-INFERENCE-WITH-RUNTIME-01`
- Nombre: `ALIGN-NAMED-MONTH-DATE-INFERENCE-WITH-RUNTIME-01`
- Commit message: `ALIGN-NAMED-MONTH-DATE-INFERENCE-WITH-RUNTIME-01`
- Hash: `65f18430736909682dfcb84fa16399d020857d61`
- Descripción breve: Se alinea la inferencia de fechas con mes nombrado y sin año explícito para conservar el año actual, evitando rollover silencioso al siguiente año.

## 9. FIX-EMAIL-RESERVATION-ASK-POLICY-02

- Identificador: `FIX-EMAIL-RESERVATION-ASK-POLICY-02`
- Nombre: `FIX-EMAIL-RESERVATION-ASK-POLICY-02`
- Commit message: `FIX-EMAIL-RESERVATION-ASK-POLICY-02`
- Hash: `72fa0368b9e5ddb39f2906f5926c5be62fa9aff5`
- Descripción breve: Email agrupa faltantes de reserva cuando faltan múltiples slots, mientras Web/WhatsApp preservan sequencing incremental, sin alterar extracción ni runtime común.

## 10. FIX-WHATSAPP-LEGACY-READY-EVENT-COMPAT-WEB-INJECTION-01

- Identificador: `FIX-WHATSAPP-LEGACY-READY-EVENT-COMPAT-WEB-INJECTION-01`
- Nombre: `FIX-WHATSAPP-LEGACY-READY-EVENT-COMPAT-WEB-INJECTION-01`
- Commit message: `FIX-WHATSAPP-LEGACY-READY-EVENT-COMPAT-WEB-INJECTION-01`
- Hash: `c09a33b55149ac42b0e8781bdd28ec33df7bc4b1`
- Descripción breve: Se documenta el hardening/diagnóstico de `whatsapp-web.js` legacy que confirma que el canal sigue sin `ready` ni inbound y no es apto para demo actualmente.
