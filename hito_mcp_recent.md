# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. REPAIR-MODIFY-INQUIRY-GUARD-MANUAL-RUNTIME-01

- Identificador: `REPAIR-MODIFY-INQUIRY-GUARD-MANUAL-RUNTIME-01`
- Nombre: `REPAIR-MODIFY-INQUIRY-GUARD-MANUAL-RUNTIME-01`
- Commit message: `REPAIR-MODIFY-INQUIRY-GUARD-MANUAL-RUNTIME-01`
- Hash: `15fe1dca93dae081519f6119acdb68ae86006a5b`
- Descripción breve: Agrega una salida informativa para consultas no ejecutables de `modify` y evita que policy, reservation node o `messageHandler` promuevan modify por verbos sueltos.

## 2. REPAIR-QUOTE-NIGHT-PLURALIZATION-ACTIVE-PATHS-01

- Identificador: `REPAIR-QUOTE-NIGHT-PLURALIZATION-ACTIVE-PATHS-01`
- Nombre: `REPAIR-QUOTE-NIGHT-PLURALIZATION-ACTIVE-PATHS-01`
- Commit message: `REPAIR-QUOTE-NIGHT-PLURALIZATION-ACTIVE-PATHS-01`
- Hash: `e7f37514811fbe9d3829689b460a7f664f834220`
- Descripción breve: Repara la pluralización visible de noches en el path activo de cotización/disponibilidad y agrega regresiones de paridad para `1 noche` y `2 noches` en create sequencing.

## 3. FIX-RESERVATION-COPY-GUEST-PLURALIZATION-01

- Identificador: `FIX-RESERVATION-COPY-GUEST-PLURALIZATION-01`
- Nombre: `FIX-RESERVATION-COPY-GUEST-PLURALIZATION-01`
- Commit message: `FIX-RESERVATION-COPY-GUEST-PLURALIZATION-01`
- Hash: `ec42e3293f09dd52757d095f8690567f44f57bdb`
- Descripción breve: Corrige pluralización visible de huéspedes y noches en copys de reserva, y restaura un guard mínimo de `modify` para consultas no ejecutables.

## 4. FIX-WHATSAPP-CONFIRMATION-MARKDOWN-FORMATTING-01

- Identificador: `FIX-WHATSAPP-CONFIRMATION-MARKDOWN-FORMATTING-01`
- Nombre: `FIX-WHATSAPP-CONFIRMATION-MARKDOWN-FORMATTING-01`
- Commit message: `FIX-WHATSAPP-CONFIRMATION-MARKDOWN-FORMATTING-01`
- Hash: `4bfc49c8591d9b2abf2e1152c70bd424a5604089`
- Descripción breve: Normaliza el markdown saliente en WhatsApp/Twilio para eliminar bold roto o desbalanceado antes del envío, preservando el contenido completo de confirmación.

## 5. FIX-EMAIL-CREATE-SPELLED-NUMBER-GUESTS-EXTRACTION-01

- Identificador: `FIX-EMAIL-CREATE-SPELLED-NUMBER-GUESTS-EXTRACTION-01`
- Nombre: `FIX-EMAIL-CREATE-SPELLED-NUMBER-GUESTS-EXTRACTION-01`
- Commit message: `FIX-EMAIL-CREATE-SPELLED-NUMBER-GUESTS-EXTRACTION-01`
- Hash: `6c1b5784099ca0423d9a95f12523c2b1fcf08044`
- Descripción breve: Corrige la extracción de `numGuests` en palabras dentro de `create`, soportando "una/dos/tres/cuatro/cinco persona(s)/huésped(es)" para evitar repreguntas innecesarias.

## 6. FIX-GUEST-RESERVATION-LIST-INTERLOCUTOR-COPY-01

- Identificador: `FIX-GUEST-RESERVATION-LIST-INTERLOCUTOR-COPY-01`
- Nombre: `FIX-GUEST-RESERVATION-LIST-INTERLOCUTOR-COPY-01`
- Commit message: `FIX-GUEST-RESERVATION-LIST-INTERLOCUTOR-COPY-01`
- Hash: `7138847c52ce2d9c94decc3f2beba71e7a2f371c`
- Descripción breve: Mejora el copy conversacional del listado guest-wide de reservas, usando `canonicalGuest` o `conversationalDisplayName` para el vocativo y fallback neutro cuando no hay nombre confiable.

## 7. REPAIR-MODIFY-COMPOSITE-ROOM-GUESTS-CAPACITY-CONTINUITY-01

- Identificador: `REPAIR-MODIFY-COMPOSITE-ROOM-GUESTS-CAPACITY-CONTINUITY-01`
- Nombre: `REPAIR-MODIFY-COMPOSITE-ROOM-GUESTS-CAPACITY-CONTINUITY-01`
- Commit message: `REPAIR-MODIFY-COMPOSITE-ROOM-GUESTS-CAPACITY-CONTINUITY-01`
- Hash: `3d7d7c200fa76ee2ad85d0aea08c22eeba239605`
- Descripción breve: Repara el subflujo `modify` compuesto habitación + huéspedes, normaliza el orden textual de campos, preserva guards de capacidad y unifica el idioma conversacional con el snapshot posterior.

## 8. FIX-RESERVATION-SNAPSHOT-LANGUAGE-STICKINESS-AFTER-MODIFY-01

- Identificador: `FIX-RESERVATION-SNAPSHOT-LANGUAGE-STICKINESS-AFTER-MODIFY-01`
- Nombre: `FIX-RESERVATION-SNAPSHOT-LANGUAGE-STICKINESS-AFTER-MODIFY-01`
- Commit message: `FIX-RESERVATION-SNAPSHOT-LANGUAGE-STICKINESS-AFTER-MODIFY-01`
- Hash: `b888f73f299137cfda97fa628a95b6ce5f86a959`
- Descripción breve: Corrige el idioma del snapshot/resumen posterior a `modify`, priorizando `reservationSlots.locale` y `hotelConfig.defaultLanguage` sobre `detectedLanguage` ambiguo del turno actual.

## 9. FIX-MODIFY-DIRECT-SLOT-PAYLOAD-AND-MULTIFIELD-SEQUENCING-01

- Identificador: `FIX-MODIFY-DIRECT-SLOT-PAYLOAD-AND-MULTIFIELD-SEQUENCING-01`
- Nombre: `FIX-MODIFY-DIRECT-SLOT-PAYLOAD-AND-MULTIFIELD-SEQUENCING-01`
- Commit message: `FIX-MODIFY-DIRECT-SLOT-PAYLOAD-AND-MULTIFIELD-SEQUENCING-01`
- Hash: `23a59cfbf67c8db0b64914e9b6d2b39a310ed857`
- Descripción breve: Corrige `modify` con payload inline por `reservationId` y ordinal, agrega secuenciación multi-campo guiada y preserva prioridad `modify > create` sin cierres prematuros.

## 10. FIX-GUEST-CONVERSATION-BINDING-CROSS-CHANNEL-REUSE-01

- Identificador: `FIX-GUEST-CONVERSATION-BINDING-CROSS-CHANNEL-REUSE-01`
- Nombre: `FIX-GUEST-CONVERSATION-BINDING-CROSS-CHANNEL-REUSE-01`
- Commit message: `FIX-GUEST-CONVERSATION-BINDING-CROSS-CHANNEL-REUSE-01`
- Hash: `61201fb27a168dba4800cb35ac0feadb3f399192`
- Descripción breve: Persiste el binding conversacional por canal sobre guest canónico para reutilizar el `conversationId` correcto en follow-ups del mismo canal y abrir uno nuevo cuando el canal entrante es incompatible.
