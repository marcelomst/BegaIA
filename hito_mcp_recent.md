# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-ADMIN-INBOX-SUPERVISED-EDIT-PREFILL-01

- Identificador: `FIX-ADMIN-INBOX-SUPERVISED-EDIT-PREFILL-01`
- Nombre: `FIX-ADMIN-INBOX-SUPERVISED-EDIT-PREFILL-01`
- Commit message: `FIX-ADMIN-INBOX-SUPERVISED-EDIT-PREFILL-01`
- Hash: `b410824f1feb10174ec860a93a86e979e0a84bd5`
- Descripción breve: Corrige el prefill y las acciones del Inbox supervisado web en Admin, permite aprobar sin editar, valida el binding por `messageId` contra el pending correcto y entrega la respuesta al widget web vía SSE.

## 2. FIX-DEMO-ADMIN-CHANNELS-READPATH-AND-MOCK-DATA-01

- Identificador: `FIX-DEMO-ADMIN-CHANNELS-READPATH-AND-MOCK-DATA-01`
- Nombre: `FIX-DEMO-ADMIN-CHANNELS-READPATH-AND-MOCK-DATA-01`
- Commit message: `FIX-DEMO-ADMIN-CHANNELS-READPATH-AND-MOCK-DATA-01`
- Hash: `6d4190cef9367cff15aebfb85027f2b52e6be60c`
- Descripción breve: Elimina mock data engañosa del home Admin, lee el estado real de canales desde `/api/config`, trata explícitamente canales no configurados o transaccionales y pule la UI de branding, sidebar, theme y Guests sin tocar runtime conversacional.

## 3. FIX-EMAIL-INLINE-CONVERSATIONAL-ACTOR-PARITY-01

- Identificador: `FIX-EMAIL-INLINE-CONVERSATIONAL-ACTOR-PARITY-01`
- Nombre: `FIX-EMAIL-INLINE-CONVERSATIONAL-ACTOR-PARITY-01`
- Commit message: `FIX-EMAIL-INLINE-CONVERSATIONAL-ACTOR-PARITY-01`
- Hash: `58af388c0b6b4cf05fcf0b53462e7c843daa416e`
- Descripción breve: Alinea Email con Web/WhatsApp en captura de actor conversacional inline, persiste el actor sobre el guest canónico resuelto, corrige el vocativo same-turn en `create` y cubre variantes multilinea y Gmail-like.

## 4. FIX-MULTI-RESERVATION-CREATE-QUOTE-VOCATIVE-REGRESSION-01

- Identificador: `FIX-MULTI-RESERVATION-CREATE-QUOTE-VOCATIVE-REGRESSION-01`
- Nombre: `FIX-MULTI-RESERVATION-CREATE-QUOTE-VOCATIVE-REGRESSION-01`
- Commit message: `FIX-MULTI-RESERVATION-CREATE-QUOTE-VOCATIVE-REGRESSION-01`
- Hash: `ea0f482fa54b1589be526f5168c68aa13e9fc6d8`
- Descripción breve: Repara fixtures temporales fronterizos en `multi_reservation`, reemplaza fechas absolutas por helper dinámico existente y destraba la suite completa sin tocar runtime productivo.

## 5. FIX-MODIFY-AMBIGUITY-RECOVERY-BY-RESERVATION-ID-01

- Identificador: `FIX-MODIFY-AMBIGUITY-RECOVERY-BY-RESERVATION-ID-01`
- Nombre: `FIX-MODIFY-AMBIGUITY-RECOVERY-BY-RESERVATION-ID-01`
- Commit message: `FIX-MODIFY-AMBIGUITY-RECOVERY-BY-RESERVATION-ID-01`
- Hash: `ebffb82b9920ab76a1483a358af2adc54dc1e70e`
- Descripción breve: Corrige la recuperación de ambigüedad en `modify` cuando el usuario responde con `reservationId` explícito, conserva el foco del subflujo, rechaza códigos inexistentes o reservas inactivas y reutiliza de forma segura un helper compartido para reconocer tokens tipo código de reserva.

## 6. FIX-CREATE-WORD-DATE-RANGE-SYNTAX-VARIANTS-MULTILINGUAL-01

- Identificador: `FIX-CREATE-WORD-DATE-RANGE-SYNTAX-VARIANTS-MULTILINGUAL-01`
- Nombre: `FIX-CREATE-WORD-DATE-RANGE-SYNTAX-VARIANTS-MULTILINGUAL-01`
- Commit message: `FIX-CREATE-WORD-DATE-RANGE-SYNTAX-VARIANTS-MULTILINGUAL-01`
- Hash: `4d3cd1dfea48d536986e36b2fde28ff9b6841d35`
- Descripción breve: Corrige `create` con variantes sintácticas multilingües de rangos de fecha naturales sin año, amplía el parser temporal para ES/PT/EN, evita pedir `check-out` cuando el rango ya viene completo y agrega compatibilidad PT de `roomType` vía alias `duplo -> double`.

## 7. FIX-CREATE-WORD-DATES-NO-YEAR-CROSS-CHANNEL-01

- Identificador: `FIX-CREATE-WORD-DATES-NO-YEAR-CROSS-CHANNEL-01`
- Nombre: `FIX-CREATE-WORD-DATES-NO-YEAR-CROSS-CHANNEL-01`
- Commit message: `FIX-CREATE-WORD-DATES-NO-YEAR-CROSS-CHANNEL-01`
- Hash: `7f11b089ee7d515456ae410914798d364aa47428`
- Descripción breve: Corrige `create` con rangos de fechas en palabras sin año, consolida `checkOut` pendiente dentro del turno actual, preserva actor conversacional vs `guestName` transaccional y endurece el parser base para meses nombrados sin año.

## 8. ENFORCE-DYNAMIC-DATE-HELPER-IN-RESERVATION-TESTS-02

- Identificador: `ENFORCE-DYNAMIC-DATE-HELPER-IN-RESERVATION-TESTS-02`
- Nombre: `ENFORCE-DYNAMIC-DATE-HELPER-IN-RESERVATION-TESTS-02`
- Commit message: `ENFORCE-DYNAMIC-DATE-HELPER-IN-RESERVATION-TESTS-02`
- Hash: `72df616d2d0566c5ce5fd93b44aef35dfd209b6d`
- Descripción breve: Introduce un helper canónico de fechas futuras dinámicas para tests de reservas y un meta-test anti-recurrencia para impedir nuevas fallas por fixtures temporales absolutos vencidos.

## 9. FIX-INLINE-CONVERSATIONAL-ACTOR-MULTILINGUAL-CROSS-CHANNEL-01

- Identificador: `FIX-INLINE-CONVERSATIONAL-ACTOR-MULTILINGUAL-CROSS-CHANNEL-01`
- Nombre: `FIX-INLINE-CONVERSATIONAL-ACTOR-MULTILINGUAL-CROSS-CHANNEL-01`
- Commit message: `FIX-INLINE-CONVERSATIONAL-ACTOR-MULTILINGUAL-CROSS-CHANNEL-01`
- Hash: `bc1113a7d298208ddec966fd2283ad7314efb63a`
- Descripción breve: Captura actor conversacional inline multilingüe ES/PT/EN, persiste `display_name` y `firstName` sobre el guest canónico efectivo y preserva la frontera estricta con `guestName` transaccional incluso en escenarios cross-channel.

## 10. REFRESH-RUNTIME-MAP-HUMAN-FRIENDLY-AND-SCANS-E67BA49-01

- Identificador: `REFRESH-RUNTIME-MAP-HUMAN-FRIENDLY-AND-SCANS-E67BA49-01`
- Nombre: `REFRESH-RUNTIME-MAP-HUMAN-FRIENDLY-AND-SCANS-E67BA49-01`
- Commit message: `REFRESH-RUNTIME-MAP-HUMAN-FRIENDLY-AND-SCANS-E67BA49-01`
- Hash: `f7ce5761ea8594ee9d99ecd748dcb90d2aa98a75`
- Descripción breve: Refresca los mapas human-friendly y scans auxiliares del Runtime Map V1 al baseline `e67ba49`, alinea `bodyLLM_internal_scan` y `messageHandler_function_size_map`, y deja las referencias viejas solo como histórico explícito donde corresponde.
