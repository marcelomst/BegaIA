# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-CREATE-WORD-DATES-NO-YEAR-CROSS-CHANNEL-01

- Identificador: `FIX-CREATE-WORD-DATES-NO-YEAR-CROSS-CHANNEL-01`
- Nombre: `FIX-CREATE-WORD-DATES-NO-YEAR-CROSS-CHANNEL-01`
- Commit message: `FIX-CREATE-WORD-DATES-NO-YEAR-CROSS-CHANNEL-01`
- Hash: `7f11b089ee7d515456ae410914798d364aa47428`
- Descripción breve: Corrige `create` con rangos de fechas en palabras sin año, consolida `checkOut` pendiente dentro del turno actual, preserva actor conversacional vs `guestName` transaccional y endurece el parser base para meses nombrados sin año.

## 2. ENFORCE-DYNAMIC-DATE-HELPER-IN-RESERVATION-TESTS-02

- Identificador: `ENFORCE-DYNAMIC-DATE-HELPER-IN-RESERVATION-TESTS-02`
- Nombre: `ENFORCE-DYNAMIC-DATE-HELPER-IN-RESERVATION-TESTS-02`
- Commit message: `ENFORCE-DYNAMIC-DATE-HELPER-IN-RESERVATION-TESTS-02`
- Hash: `72df616d2d0566c5ce5fd93b44aef35dfd209b6d`
- Descripción breve: Introduce un helper canónico de fechas futuras dinámicas para tests de reservas y un meta-test anti-recurrencia para impedir nuevas fallas por fixtures temporales absolutos vencidos.

## 3. FIX-INLINE-CONVERSATIONAL-ACTOR-MULTILINGUAL-CROSS-CHANNEL-01

- Identificador: `FIX-INLINE-CONVERSATIONAL-ACTOR-MULTILINGUAL-CROSS-CHANNEL-01`
- Nombre: `FIX-INLINE-CONVERSATIONAL-ACTOR-MULTILINGUAL-CROSS-CHANNEL-01`
- Commit message: `FIX-INLINE-CONVERSATIONAL-ACTOR-MULTILINGUAL-CROSS-CHANNEL-01`
- Hash: `bc1113a7d298208ddec966fd2283ad7314efb63a`
- Descripción breve: Captura actor conversacional inline multilingüe ES/PT/EN, persiste `display_name` y `firstName` sobre el guest canónico efectivo y preserva la frontera estricta con `guestName` transaccional incluso en escenarios cross-channel.

## 4. REFRESH-RUNTIME-MAP-HUMAN-FRIENDLY-AND-SCANS-E67BA49-01

- Identificador: `REFRESH-RUNTIME-MAP-HUMAN-FRIENDLY-AND-SCANS-E67BA49-01`
- Nombre: `REFRESH-RUNTIME-MAP-HUMAN-FRIENDLY-AND-SCANS-E67BA49-01`
- Commit message: `REFRESH-RUNTIME-MAP-HUMAN-FRIENDLY-AND-SCANS-E67BA49-01`
- Hash: `f7ce5761ea8594ee9d99ecd748dcb90d2aa98a75`
- Descripción breve: Refresca los mapas human-friendly y scans auxiliares del Runtime Map V1 al baseline `e67ba49`, alinea `bodyLLM_internal_scan` y `messageHandler_function_size_map`, y deja las referencias viejas solo como histórico explícito donde corresponde.

## 5. REPAIR-CREATE-DATE-CORRECTION-LANGUAGE-STICKINESS-01

- Identificador: `REPAIR-CREATE-DATE-CORRECTION-LANGUAGE-STICKINESS-01`
- Nombre: `REPAIR-CREATE-DATE-CORRECTION-LANGUAGE-STICKINESS-01`
- Commit message: `REPAIR-CREATE-DATE-CORRECTION-LANGUAGE-STICKINESS-01`
- Hash: `e67ba4968d2275211fe63673cf64224bcae07fc8`
- Descripción breve: Repara la preservación de locale conversacional en `create/date correction`, priorizando `reservationSlots.locale`, persistiendo el locale en slots y evitando que un follow-up detectado como inglés cambie el idioma de la cotización o confirmación.

## 6. FIX-MODIFY-PREVIEW-CONFIRMATION-BEFORE-EXECUTION-01

- Identificador: `FIX-MODIFY-PREVIEW-CONFIRMATION-BEFORE-EXECUTION-01`
- Nombre: `FIX-MODIFY-PREVIEW-CONFIRMATION-BEFORE-EXECUTION-01`
- Commit message: `FIX-MODIFY-PREVIEW-CONFIRMATION-BEFORE-EXECUTION-01`
- Hash: `e7add187294ba8b3d0f55b245185eecc5febad2f`
- Descripción breve: Introduce preview persistido y confirmación explícita antes de ejecutar `modify`, unifica el path de cambio de fechas hacia un preview único con disponibilidad y elimina ejecuciones directas o copy legacy dentro del subflujo.

## 7. IMPROVE-CONVERSATION-LIST-INTERLOCUTOR-COPY-01

- Identificador: `IMPROVE-CONVERSATION-LIST-INTERLOCUTOR-COPY-01`
- Nombre: `IMPROVE-CONVERSATION-LIST-INTERLOCUTOR-COPY-01`
- Commit message: `IMPROVE-CONVERSATION-LIST-INTERLOCUTOR-COPY-01`
- Hash: `d9ccd725a9e40a1a5a79f86f001a475c5528c0f6`
- Descripción breve: Mejora el encabezado conversation-scoped del listado de reservas para usar el vocativo conversacional confiable del interlocutor y no promover titulares de reserva como identidad.

## 8. REPAIR-MODIFY-INQUIRY-GUARD-MANUAL-RUNTIME-01

- Identificador: `REPAIR-MODIFY-INQUIRY-GUARD-MANUAL-RUNTIME-01`
- Nombre: `REPAIR-MODIFY-INQUIRY-GUARD-MANUAL-RUNTIME-01`
- Commit message: `REPAIR-MODIFY-INQUIRY-GUARD-MANUAL-RUNTIME-01`
- Hash: `15fe1dca93dae081519f6119acdb68ae86006a5b`
- Descripción breve: Agrega una salida informativa para consultas no ejecutables de `modify` y evita que policy, reservation node o `messageHandler` promuevan modify por verbos sueltos.

## 9. REPAIR-QUOTE-NIGHT-PLURALIZATION-ACTIVE-PATHS-01

- Identificador: `REPAIR-QUOTE-NIGHT-PLURALIZATION-ACTIVE-PATHS-01`
- Nombre: `REPAIR-QUOTE-NIGHT-PLURALIZATION-ACTIVE-PATHS-01`
- Commit message: `REPAIR-QUOTE-NIGHT-PLURALIZATION-ACTIVE-PATHS-01`
- Hash: `e7f37514811fbe9d3829689b460a7f664f834220`
- Descripción breve: Repara la pluralización visible de noches en el path activo de cotización/disponibilidad y agrega regresiones de paridad para `1 noche` y `2 noches` en create sequencing.

## 10. FIX-RESERVATION-COPY-GUEST-PLURALIZATION-01

- Identificador: `FIX-RESERVATION-COPY-GUEST-PLURALIZATION-01`
- Nombre: `FIX-RESERVATION-COPY-GUEST-PLURALIZATION-01`
- Commit message: `FIX-RESERVATION-COPY-GUEST-PLURALIZATION-01`
- Hash: `ec42e3293f09dd52757d095f8690567f44f57bdb`
- Descripción breve: Corrige pluralización visible de huéspedes y noches en copys de reserva, y restaura un guard mínimo de `modify` para consultas no ejecutables.
