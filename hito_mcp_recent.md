# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. DEV-EMAIL-WORKER-POLLING-RUNTIME-STABILITY-01

- Identificador: `DEV-EMAIL-WORKER-POLLING-RUNTIME-STABILITY-01`
- Nombre: `DEV-EMAIL-WORKER-POLLING-RUNTIME-STABILITY-01`
- Commit message: `DEV-EMAIL-WORKER-POLLING-RUNTIME-STABILITY-01`
- Hash: `511d9ce1c1e97f5ada5afdfcd1e7f3d6070e8781`
- Descripción breve: Se estabiliza el runtime DEV del worker Email separando modo daemon `watch` y modo batch `once`, para que `dev:email` no requiera reinicio manual tras inbox vacío o batch completado.

## 2. FIX-EMAIL-REPLY-CONFIRM-INTENT-QUOTED-THREAD-01

- Identificador: `FIX-EMAIL-REPLY-CONFIRM-INTENT-QUOTED-THREAD-01`
- Nombre: `FIX-EMAIL-REPLY-CONFIRM-INTENT-QUOTED-THREAD-01`
- Commit message: `FIX-EMAIL-REPLY-CONFIRM-INTENT-QUOTED-THREAD-01`
- Hash: `e07e3680528a5f4036525533341f8981ba31354d`
- Descripción breve: Se corrige la normalización de Email para recortar quoted threads de Gmail/Outlook antes del pipeline y evitar que texto citado contamine la intención nueva en replies de confirmación.

## 3. ALIGN-RESERVATION-GUESTNAME-QUOTE-GATING-CONTRACT-01

- Identificador: `ALIGN-RESERVATION-GUESTNAME-QUOTE-GATING-CONTRACT-01`
- Nombre: `ALIGN-RESERVATION-GUESTNAME-QUOTE-GATING-CONTRACT-01`
- Commit message: `ALIGN-RESERVATION-GUESTNAME-QUOTE-GATING-CONTRACT-01`
- Hash: `b7f609bc6dd5ece109ce56c1c524ff25bd5df473`
- Descripción breve: Se alinea el contrato de `reservation.create` para mantener `guestName` como gating de quote/proposal/CONFIRMAR, priorizando coherencia temporal fuerte cuando ya hay slots completos.

## 4. FIX-RESERVATION-COMPLETE-SLOTS-EMPTY-MISSING-PROMPT-01

- Identificador: `FIX-RESERVATION-COMPLETE-SLOTS-EMPTY-MISSING-PROMPT-01`
- Nombre: `FIX-RESERVATION-COMPLETE-SLOTS-EMPTY-MISSING-PROMPT-01`
- Commit message: `FIX-RESERVATION-COMPLETE-SLOTS-EMPTY-MISSING-PROMPT-01`
- Hash: `033e6619876b3308c42e1a2ed81ec0dabb6a0e93`
- Descripción breve: Se corrige el nodo de reserva para evitar preguntas vacías de faltantes cuando los slots ya están completos y exigir `guestName` válido antes de disponibilidad/propuesta.

## 5. FIX-ADMIN-CHANNEL-UI-PER-CHANNEL-STATE-AND-INBOX-02

- Identificador: `FIX-ADMIN-CHANNEL-UI-PER-CHANNEL-STATE-AND-INBOX-02`
- Nombre: `FIX-ADMIN-CHANNEL-UI-PER-CHANNEL-STATE-AND-INBOX-02`
- Commit message: `FIX-ADMIN-CHANNEL-UI-PER-CHANNEL-STATE-AND-INBOX-02`
- Hash: `8155db31f9b4994a5a2f8fce40d1cda2ac68f177`
- Descripción breve: Se corrige la UI/Admin para mostrar el estado real por canal y filtrar el inbox explícitamente por `channel`, evitando mezclar Web, Email y WhatsApp.

## 6. FIX-EMAIL-IMAP-PROCESSED-FLAG-COMPAT-01

- Identificador: `FIX-EMAIL-IMAP-PROCESSED-FLAG-COMPAT-01`
- Nombre: `FIX-EMAIL-IMAP-PROCESSED-FLAG-COMPAT-01`
- Commit message: `FIX-EMAIL-IMAP-PROCESSED-FLAG-COMPAT-01`
- Hash: `eee569f3e8100d9b17eed5286f0d79c92927f954`
- Descripción breve: Se corrige el post-processing IMAP para mantener `\\Seen` como obligatorio y dejar `RAGBOT_PROCESSED` como keyword opcional best-effort cuando el proveedor no la soporta.

## 7. SEC-IGNORE-LOCAL-WWEBJS-SESSIONS-01

- Identificador: `SEC-IGNORE-LOCAL-WWEBJS-SESSIONS-01`
- Nombre: `SEC-IGNORE-LOCAL-WWEBJS-SESSIONS-01`
- Commit message: `SEC-IGNORE-LOCAL-WWEBJS-SESSIONS-01`
- Hash: `761fabe3da1cdad4263a609231c2e3a89366a079`
- Descripción breve: Se agregan reglas de ignore y se desindexan sesiones locales de `wwebjs` para evitar volver a versionar material sensible de autenticación legacy.

## 8. DOC-WHATSAPP-NUMBER-ONBOARDING-STRATEGY-01

- Identificador: `DOC-WHATSAPP-NUMBER-ONBOARDING-STRATEGY-01`
- Nombre: `DOC-WHATSAPP-NUMBER-ONBOARDING-STRATEGY-01`
- Commit message: `DOC-WHATSAPP-NUMBER-ONBOARDING-STRATEGY-01`
- Hash: `617d3ded7abcd3429a951645aab0149356a1cf3a`
- Descripción breve: Se crea la fuente canónica de onboarding de números WhatsApp para `BegaIA/Begasist`, separando demo, piloto, migración, coexistencia, Twilio y Meta Cloud API con wording prudente.

## 9. FIX-WHATSAPP-LEGACY-IGNORE-GROUPS-EXPLICIT-CONFIG-68

- Identificador: `FIX-WHATSAPP-LEGACY-IGNORE-GROUPS-EXPLICIT-CONFIG-68`
- Nombre: `FIX-WHATSAPP-LEGACY-IGNORE-GROUPS-EXPLICIT-CONFIG-68`
- Commit message: `FIX-WHATSAPP-LEGACY-IGNORE-GROUPS-EXPLICIT-CONFIG-68`
- Hash: `7521b4d51248980d4bec9558b75c7f75990db874`
- Descripción breve: Se vuelve explícita y testeable la configuración `channelConfigs.whatsapp.ignoreGroups` para WhatsApp legacy, manteniendo default seguro `true` y evitando la entrada de grupos al pipeline.

## 10. TEST-MULTICHANNEL-CANONICAL-GUEST-E2E-01

- Identificador: `TEST-MULTICHANNEL-CANONICAL-GUEST-E2E-01`
- Nombre: `TEST-MULTICHANNEL-CANONICAL-GUEST-E2E-01`
- Commit message: `TEST-MULTICHANNEL-CANONICAL-GUEST-E2E-01`
- Hash: `30bd88bd9f0b7b18307cc1d508d6a2b101593350`
- Descripción breve: Se agrega cobertura E2E multicanal para validar identidad canónica y continuidad entre Web, Email, WhatsApp y `guest_aliases`, estabilizando además dos specs con reloj determinístico.
