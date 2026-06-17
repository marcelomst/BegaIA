# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-RESERVATION-SNAPSHOT-LANGUAGE-STICKINESS-AFTER-MODIFY-01

- Identificador: `FIX-RESERVATION-SNAPSHOT-LANGUAGE-STICKINESS-AFTER-MODIFY-01`
- Nombre: `FIX-RESERVATION-SNAPSHOT-LANGUAGE-STICKINESS-AFTER-MODIFY-01`
- Commit message: `FIX-RESERVATION-SNAPSHOT-LANGUAGE-STICKINESS-AFTER-MODIFY-01`
- Hash: `b888f73f299137cfda97fa628a95b6ce5f86a959`
- Descripción breve: Corrige el idioma del snapshot/resumen posterior a `modify`, priorizando `reservationSlots.locale` y `hotelConfig.defaultLanguage` sobre `detectedLanguage` ambiguo del turno actual.

## 2. FIX-MODIFY-DIRECT-SLOT-PAYLOAD-AND-MULTIFIELD-SEQUENCING-01

- Identificador: `FIX-MODIFY-DIRECT-SLOT-PAYLOAD-AND-MULTIFIELD-SEQUENCING-01`
- Nombre: `FIX-MODIFY-DIRECT-SLOT-PAYLOAD-AND-MULTIFIELD-SEQUENCING-01`
- Commit message: `FIX-MODIFY-DIRECT-SLOT-PAYLOAD-AND-MULTIFIELD-SEQUENCING-01`
- Hash: `23a59cfbf67c8db0b64914e9b6d2b39a310ed857`
- Descripción breve: Corrige `modify` con payload inline por `reservationId` y ordinal, agrega secuenciación multi-campo guiada y preserva prioridad `modify > create` sin cierres prematuros.

## 3. FIX-GUEST-CONVERSATION-BINDING-CROSS-CHANNEL-REUSE-01

- Identificador: `FIX-GUEST-CONVERSATION-BINDING-CROSS-CHANNEL-REUSE-01`
- Nombre: `FIX-GUEST-CONVERSATION-BINDING-CROSS-CHANNEL-REUSE-01`
- Commit message: `FIX-GUEST-CONVERSATION-BINDING-CROSS-CHANNEL-REUSE-01`
- Hash: `61201fb27a168dba4800cb35ac0feadb3f399192`
- Descripción breve: Persiste el binding conversacional por canal sobre guest canónico para reutilizar el `conversationId` correcto en follow-ups del mismo canal y abrir uno nuevo cuando el canal entrante es incompatible.

## 4. FIX-GUEST-WIDE-ORDINAL-MODIFY-REFERENCE-AFTER-CONSOLIDATED-SNAPSHOT-01

- Identificador: `FIX-GUEST-WIDE-ORDINAL-MODIFY-REFERENCE-AFTER-CONSOLIDATED-SNAPSHOT-01`
- Nombre: `FIX-GUEST-WIDE-ORDINAL-MODIFY-REFERENCE-AFTER-CONSOLIDATED-SNAPSHOT-01`
- Commit message: `FIX-GUEST-WIDE-ORDINAL-MODIFY-REFERENCE-AFTER-CONSOLIDATED-SNAPSHOT-01`
- Hash: `9f472c47a0a63336c6ca7493f43895e070376bcd`
- Descripción breve: Persiste el snapshot guest-wide consolidado como fuente referencial inmediata para ordinales de modify, respetando el orden mostrado y el target seleccionado.

## 5. FIX-SECOND-CREATE-RESET-DRAFT-BEFORE-QUOTE-01

- Identificador: `FIX-SECOND-CREATE-RESET-DRAFT-BEFORE-QUOTE-01`
- Nombre: `FIX-SECOND-CREATE-RESET-DRAFT-BEFORE-QUOTE-01`
- Commit message: `FIX-SECOND-CREATE-RESET-DRAFT-BEFORE-QUOTE-01`
- Hash: `d94c05545b5eae0736b7e2756dafb3b39a9aeb74`
- Descripción breve: Corrige la segunda reserva sobre contexto confirmado para resetear draft antes de quote, evitar recotización de la reserva previa y no caer en el ACK temporal compartido.

## 6. FIX-MULTICHANNEL-CANONICAL-GUEST-CONVERSATION-ROUTING-BY-CHANNEL-01

- Identificador: `FIX-MULTICHANNEL-CANONICAL-GUEST-CONVERSATION-ROUTING-BY-CHANNEL-01`
- Nombre: `FIX-MULTICHANNEL-CANONICAL-GUEST-CONVERSATION-ROUTING-BY-CHANNEL-01`
- Commit message: `FIX-MULTICHANNEL-CANONICAL-GUEST-CONVERSATION-ROUTING-BY-CHANNEL-01`
- Hash: `7da63cff84e7e90d7b775df49dfc428cb3e73373`
- Descripción breve: Corrige el routing de conversación activa para guest canónico, reutilizando solo `conversationId` compatibles con el canal entrante y evitando colapso cross-channel arbitrario.

## 7. FIX-ADMIN-MULTICHANNEL-CONVERSATION-MESSAGE-VISIBILITY-01

- Identificador: `FIX-ADMIN-MULTICHANNEL-CONVERSATION-MESSAGE-VISIBILITY-01`
- Nombre: `FIX-ADMIN-MULTICHANNEL-CONVERSATION-MESSAGE-VISIBILITY-01`
- Commit message: `FIX-ADMIN-MULTICHANNEL-CONVERSATION-MESSAGE-VISIBILITY-01`
- Hash: `f35fd40da591eaccdf4e1ccffefa06137a8c141d`
- Descripción breve: Corrige el read-path de Admin conversations para que la conversación canónica multicanal siga mostrando mensajes válidos del hilo, sin filtrarlos erróneamente por `message.channel`.

## 8. FIX-RESERVATION-TEST-DATES-RELATIVE-FUTURE-HELPERS-01

- Identificador: `FIX-RESERVATION-TEST-DATES-RELATIVE-FUTURE-HELPERS-01`
- Nombre: `FIX-RESERVATION-TEST-DATES-RELATIVE-FUTURE-HELPERS-01`
- Commit message: `FIX-RESERVATION-TEST-DATES-RELATIVE-FUTURE-HELPERS-01`
- Hash: `e27be9327af4e5bc116e63991e5095de281ccf0e`
- Descripción breve: Reemplaza fechas absolutas vencibles por helpers de fechas futuras dinámicas en el spec de `create quote gating`, estabilizando el test sin tocar comportamiento productivo.

## 9. FIX-CANONICAL-GUEST-RESERVATION-SNAPSHOT-GUEST-FIRST-01

- Identificador: `FIX-CANONICAL-GUEST-RESERVATION-SNAPSHOT-GUEST-FIRST-01`
- Nombre: `FIX-CANONICAL-GUEST-RESERVATION-SNAPSHOT-GUEST-FIRST-01`
- Commit message: `FIX-CANONICAL-GUEST-RESERVATION-SNAPSHOT-GUEST-FIRST-01`
- Hash: `dfaeb4dd358915a6aadb264500d94e2ba065f1e5`
- Descripción breve: Corrige `mis reservas` para priorizar guest-first sobre huéspedes canónicos consolidados, listando reservas guest-wide y preservando deduplicación por `reservationId`.

## 10. FIX-TEST-TYPES-TWILIO-AND-TEMPORAL-REPAIR-SPECS-01

- Identificador: `FIX-TEST-TYPES-TWILIO-AND-TEMPORAL-REPAIR-SPECS-01`
- Nombre: `FIX-TEST-TYPES-TWILIO-AND-TEMPORAL-REPAIR-SPECS-01`
- Commit message: `FIX-TEST-TYPES-TWILIO-AND-TEMPORAL-REPAIR-SPECS-01`
- Hash: `f20aa54ae7022f96caddb99a0adac0fccc1c253f`
- Descripción breve: Corrige higiene de tipos en los specs de temporal repair y transporte Twilio, resolviendo errores TypeScript sobre mocks y llamadas grabadas sin tocar comportamiento productivo.
