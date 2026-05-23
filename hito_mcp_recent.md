# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-EMAIL-RESERVATION-FOLLOWUP-GROUPED-MISSING-SLOTS-01

- Identificador: `FIX-EMAIL-RESERVATION-FOLLOWUP-GROUPED-MISSING-SLOTS-01`
- Nombre: `FIX-EMAIL-RESERVATION-FOLLOWUP-GROUPED-MISSING-SLOTS-01`
- Commit message: `FIX-EMAIL-RESERVATION-FOLLOWUP-GROUPED-MISSING-SLOTS-01`
- Hash: `5119f31ff44277386baa12db35b1822ae0ec70a1`
- Descripción breve: Se corrige la continuidad del create flow por Email para que, tras una respuesta parcial, los faltantes reales restantes sigan formulándose de manera agrupada, mientras Web y WhatsApp preservan sequencing incremental.

## 2. FIX-EMAIL-INBOUND-DEDUPLICATE-REPLY-03

- Identificador: `FIX-EMAIL-INBOUND-DEDUPLICATE-REPLY-03`
- Nombre: `FIX-EMAIL-INBOUND-DEDUPLICATE-REPLY-03`
- Commit message: `FIX-EMAIL-INBOUND-DEDUPLICATE-REPLY-03`
- Hash: `a164dba7f9be0ee878fa8e6e210baeb4aaee4a63`
- Descripción breve: Se agrega un guard idempotente efectivo en Email inbound antes del pipeline y antes del SMTP para evitar replies duplicados sobre un mismo inbound real, manteniendo retry legítimo ante error.

## 3. CHORE-WIPE-CONVERSATIONAL-STATE-SCRIPT-DOC-01

- Identificador: `CHORE-WIPE-CONVERSATIONAL-STATE-SCRIPT-DOC-01`
- Nombre: `CHORE-WIPE-CONVERSATIONAL-STATE-SCRIPT-DOC-01`
- Commit message: `CHORE-WIPE-CONVERSATIONAL-STATE-SCRIPT-DOC-01`
- Hash: `eab23b24051046f36dcabe5a66f31f40c4365965`
- Descripción breve: Se formaliza la documentación operativa del script de wipe conversacional, explicitando uso destructivo manual solo en dev/test y dejando `reservations` y otros estados no listados fuera de scope.

## 4. ALIGN-NAMED-MONTH-DATE-INFERENCE-WITH-RUNTIME-01

- Identificador: `ALIGN-NAMED-MONTH-DATE-INFERENCE-WITH-RUNTIME-01`
- Nombre: `ALIGN-NAMED-MONTH-DATE-INFERENCE-WITH-RUNTIME-01`
- Commit message: `ALIGN-NAMED-MONTH-DATE-INFERENCE-WITH-RUNTIME-01`
- Hash: `65f18430736909682dfcb84fa16399d020857d61`
- Descripción breve: Se alinea la inferencia de fechas con mes nombrado y sin año explícito para conservar el año actual, evitando rollover silencioso al siguiente año.

## 5. FIX-EMAIL-RESERVATION-ASK-POLICY-02

- Identificador: `FIX-EMAIL-RESERVATION-ASK-POLICY-02`
- Nombre: `FIX-EMAIL-RESERVATION-ASK-POLICY-02`
- Commit message: `FIX-EMAIL-RESERVATION-ASK-POLICY-02`
- Hash: `72fa0368b9e5ddb39f2906f5926c5be62fa9aff5`
- Descripción breve: Email agrupa faltantes de reserva cuando faltan múltiples slots, mientras Web/WhatsApp preservan sequencing incremental, sin alterar extracción ni runtime común.

## 6. FIX-WHATSAPP-LEGACY-READY-EVENT-COMPAT-WEB-INJECTION-01

- Identificador: `FIX-WHATSAPP-LEGACY-READY-EVENT-COMPAT-WEB-INJECTION-01`
- Nombre: `FIX-WHATSAPP-LEGACY-READY-EVENT-COMPAT-WEB-INJECTION-01`
- Commit message: `FIX-WHATSAPP-LEGACY-READY-EVENT-COMPAT-WEB-INJECTION-01`
- Hash: `c09a33b55149ac42b0e8781bdd28ec33df7bc4b1`
- Descripción breve: Se documenta el hardening/diagnóstico de `whatsapp-web.js` legacy que confirma que el canal sigue sin `ready` ni inbound y no es apto para demo actualmente.

## 7. MANUAL-EMAIL-RESERVATION-CONFIRMATION-E2E-01

- Identificador: `MANUAL-EMAIL-RESERVATION-CONFIRMATION-E2E-01`
- Nombre: `MANUAL-EMAIL-RESERVATION-CONFIRMATION-E2E-01`
- Commit message: `none`
- Hash: `none`
- Descripción breve: Se registra una validación manual end-to-end exitosa del canal Email para reservas, incluyendo proposal, reply con quoted thread, confirmación, outbound SMTP, polling `watch` persistente y dedupe por `Message-ID`.

## 8. FIX-EMAIL-WATCH-POLLING-STATE-DEV-01

- Identificador: `FIX-EMAIL-WATCH-POLLING-STATE-DEV-01`
- Nombre: `FIX-EMAIL-WATCH-POLLING-STATE-DEV-01`
- Commit message: `FIX-EMAIL-WATCH-POLLING-STATE-DEV-01`
- Hash: `e47350fd783e2159b607e7cb92a93cf37e94c7ba`
- Descripción breve: Se alinea `dev:email` en modo `watch` con el polling state en Redis, auto-activando `email_polling:<hotelId>` al arranque cuando el canal Email está habilitado.

## 9. DEV-EMAIL-WORKER-POLLING-RUNTIME-STABILITY-01

- Identificador: `DEV-EMAIL-WORKER-POLLING-RUNTIME-STABILITY-01`
- Nombre: `DEV-EMAIL-WORKER-POLLING-RUNTIME-STABILITY-01`
- Commit message: `DEV-EMAIL-WORKER-POLLING-RUNTIME-STABILITY-01`
- Hash: `511d9ce1c1e97f5ada5afdfcd1e7f3d6070e8781`
- Descripción breve: Se estabiliza el runtime DEV del worker Email separando modo daemon `watch` y modo batch `once`, para que `dev:email` no requiera reinicio manual tras inbox vacío o batch completado.

## 10. FIX-EMAIL-REPLY-CONFIRM-INTENT-QUOTED-THREAD-01

- Identificador: `FIX-EMAIL-REPLY-CONFIRM-INTENT-QUOTED-THREAD-01`
- Nombre: `FIX-EMAIL-REPLY-CONFIRM-INTENT-QUOTED-THREAD-01`
- Commit message: `FIX-EMAIL-REPLY-CONFIRM-INTENT-QUOTED-THREAD-01`
- Hash: `e07e3680528a5f4036525533341f8981ba31354d`
- Descripción breve: Se corrige la normalización de Email para recortar quoted threads de Gmail/Outlook antes del pipeline y evitar que texto citado contamine la intención nueva en replies de confirmación.
