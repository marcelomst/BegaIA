# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-WHATSAPP-CONFIRMATION-MARKDOWN-FORMATTING-01

- Identificador: `FIX-WHATSAPP-CONFIRMATION-MARKDOWN-FORMATTING-01`
- Nombre: `FIX-WHATSAPP-CONFIRMATION-MARKDOWN-FORMATTING-01`
- Commit message: `FIX-WHATSAPP-CONFIRMATION-MARKDOWN-FORMATTING-01`
- Hash: `4bfc49c8591d9b2abf2e1152c70bd424a5604089`
- Descripción breve: Normaliza el markdown saliente en WhatsApp/Twilio para eliminar bold roto o desbalanceado antes del envío, preservando el contenido completo de confirmación.

## 2. FIX-EMAIL-CREATE-SPELLED-NUMBER-GUESTS-EXTRACTION-01

- Identificador: `FIX-EMAIL-CREATE-SPELLED-NUMBER-GUESTS-EXTRACTION-01`
- Nombre: `FIX-EMAIL-CREATE-SPELLED-NUMBER-GUESTS-EXTRACTION-01`
- Commit message: `FIX-EMAIL-CREATE-SPELLED-NUMBER-GUESTS-EXTRACTION-01`
- Hash: `6c1b5784099ca0423d9a95f12523c2b1fcf08044`
- Descripción breve: Corrige la extracción de `numGuests` en palabras dentro de `create`, soportando "una/dos/tres/cuatro/cinco persona(s)/huésped(es)" para evitar repreguntas innecesarias.

## 3. FIX-GUEST-RESERVATION-LIST-INTERLOCUTOR-COPY-01

- Identificador: `FIX-GUEST-RESERVATION-LIST-INTERLOCUTOR-COPY-01`
- Nombre: `FIX-GUEST-RESERVATION-LIST-INTERLOCUTOR-COPY-01`
- Commit message: `FIX-GUEST-RESERVATION-LIST-INTERLOCUTOR-COPY-01`
- Hash: `7138847c52ce2d9c94decc3f2beba71e7a2f371c`
- Descripción breve: Mejora el copy conversacional del listado guest-wide de reservas, usando `canonicalGuest` o `conversationalDisplayName` para el vocativo y fallback neutro cuando no hay nombre confiable.

## 4. REPAIR-MODIFY-COMPOSITE-ROOM-GUESTS-CAPACITY-CONTINUITY-01

- Identificador: `REPAIR-MODIFY-COMPOSITE-ROOM-GUESTS-CAPACITY-CONTINUITY-01`
- Nombre: `REPAIR-MODIFY-COMPOSITE-ROOM-GUESTS-CAPACITY-CONTINUITY-01`
- Commit message: `REPAIR-MODIFY-COMPOSITE-ROOM-GUESTS-CAPACITY-CONTINUITY-01`
- Hash: `3d7d7c200fa76ee2ad85d0aea08c22eeba239605`
- Descripción breve: Repara el subflujo `modify` compuesto habitación + huéspedes, normaliza el orden textual de campos, preserva guards de capacidad y unifica el idioma conversacional con el snapshot posterior.

## 5. FIX-RESERVATION-SNAPSHOT-LANGUAGE-STICKINESS-AFTER-MODIFY-01

- Identificador: `FIX-RESERVATION-SNAPSHOT-LANGUAGE-STICKINESS-AFTER-MODIFY-01`
- Nombre: `FIX-RESERVATION-SNAPSHOT-LANGUAGE-STICKINESS-AFTER-MODIFY-01`
- Commit message: `FIX-RESERVATION-SNAPSHOT-LANGUAGE-STICKINESS-AFTER-MODIFY-01`
- Hash: `b888f73f299137cfda97fa628a95b6ce5f86a959`
- Descripción breve: Corrige el idioma del snapshot/resumen posterior a `modify`, priorizando `reservationSlots.locale` y `hotelConfig.defaultLanguage` sobre `detectedLanguage` ambiguo del turno actual.

## 6. FIX-MODIFY-DIRECT-SLOT-PAYLOAD-AND-MULTIFIELD-SEQUENCING-01

- Identificador: `FIX-MODIFY-DIRECT-SLOT-PAYLOAD-AND-MULTIFIELD-SEQUENCING-01`
- Nombre: `FIX-MODIFY-DIRECT-SLOT-PAYLOAD-AND-MULTIFIELD-SEQUENCING-01`
- Commit message: `FIX-MODIFY-DIRECT-SLOT-PAYLOAD-AND-MULTIFIELD-SEQUENCING-01`
- Hash: `23a59cfbf67c8db0b64914e9b6d2b39a310ed857`
- Descripción breve: Corrige `modify` con payload inline por `reservationId` y ordinal, agrega secuenciación multi-campo guiada y preserva prioridad `modify > create` sin cierres prematuros.

## 7. FIX-GUEST-CONVERSATION-BINDING-CROSS-CHANNEL-REUSE-01

- Identificador: `FIX-GUEST-CONVERSATION-BINDING-CROSS-CHANNEL-REUSE-01`
- Nombre: `FIX-GUEST-CONVERSATION-BINDING-CROSS-CHANNEL-REUSE-01`
- Commit message: `FIX-GUEST-CONVERSATION-BINDING-CROSS-CHANNEL-REUSE-01`
- Hash: `61201fb27a168dba4800cb35ac0feadb3f399192`
- Descripción breve: Persiste el binding conversacional por canal sobre guest canónico para reutilizar el `conversationId` correcto en follow-ups del mismo canal y abrir uno nuevo cuando el canal entrante es incompatible.

## 8. FIX-GUEST-WIDE-ORDINAL-MODIFY-REFERENCE-AFTER-CONSOLIDATED-SNAPSHOT-01

- Identificador: `FIX-GUEST-WIDE-ORDINAL-MODIFY-REFERENCE-AFTER-CONSOLIDATED-SNAPSHOT-01`
- Nombre: `FIX-GUEST-WIDE-ORDINAL-MODIFY-REFERENCE-AFTER-CONSOLIDATED-SNAPSHOT-01`
- Commit message: `FIX-GUEST-WIDE-ORDINAL-MODIFY-REFERENCE-AFTER-CONSOLIDATED-SNAPSHOT-01`
- Hash: `9f472c47a0a63336c6ca7493f43895e070376bcd`
- Descripción breve: Persiste el snapshot guest-wide consolidado como fuente referencial inmediata para ordinales de modify, respetando el orden mostrado y el target seleccionado.

## 9. FIX-SECOND-CREATE-RESET-DRAFT-BEFORE-QUOTE-01

- Identificador: `FIX-SECOND-CREATE-RESET-DRAFT-BEFORE-QUOTE-01`
- Nombre: `FIX-SECOND-CREATE-RESET-DRAFT-BEFORE-QUOTE-01`
- Commit message: `FIX-SECOND-CREATE-RESET-DRAFT-BEFORE-QUOTE-01`
- Hash: `d94c05545b5eae0736b7e2756dafb3b39a9aeb74`
- Descripción breve: Corrige la segunda reserva sobre contexto confirmado para resetear draft antes de quote, evitar recotización de la reserva previa y no caer en el ACK temporal compartido.

## 10. FIX-MULTICHANNEL-CANONICAL-GUEST-CONVERSATION-ROUTING-BY-CHANNEL-01

- Identificador: `FIX-MULTICHANNEL-CANONICAL-GUEST-CONVERSATION-ROUTING-BY-CHANNEL-01`
- Nombre: `FIX-MULTICHANNEL-CANONICAL-GUEST-CONVERSATION-ROUTING-BY-CHANNEL-01`
- Commit message: `FIX-MULTICHANNEL-CANONICAL-GUEST-CONVERSATION-ROUTING-BY-CHANNEL-01`
- Hash: `7da63cff84e7e90d7b775df49dfc428cb3e73373`
- Descripción breve: Corrige el routing de conversación activa para guest canónico, reutilizando solo `conversationId` compatibles con el canal entrante y evitando colapso cross-channel arbitrario.
