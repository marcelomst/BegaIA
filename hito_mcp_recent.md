# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-GUEST-WIDE-ORDINAL-MODIFY-REFERENCE-AFTER-CONSOLIDATED-SNAPSHOT-01

- Identificador: `FIX-GUEST-WIDE-ORDINAL-MODIFY-REFERENCE-AFTER-CONSOLIDATED-SNAPSHOT-01`
- Nombre: `FIX-GUEST-WIDE-ORDINAL-MODIFY-REFERENCE-AFTER-CONSOLIDATED-SNAPSHOT-01`
- Commit message: `FIX-GUEST-WIDE-ORDINAL-MODIFY-REFERENCE-AFTER-CONSOLIDATED-SNAPSHOT-01`
- Hash: `9f472c47a0a63336c6ca7493f43895e070376bcd`
- Descripción breve: Persiste el snapshot guest-wide consolidado como fuente referencial inmediata para ordinales de modify, respetando el orden mostrado y el target seleccionado.

## 2. FIX-SECOND-CREATE-RESET-DRAFT-BEFORE-QUOTE-01

- Identificador: `FIX-SECOND-CREATE-RESET-DRAFT-BEFORE-QUOTE-01`
- Nombre: `FIX-SECOND-CREATE-RESET-DRAFT-BEFORE-QUOTE-01`
- Commit message: `FIX-SECOND-CREATE-RESET-DRAFT-BEFORE-QUOTE-01`
- Hash: `d94c05545b5eae0736b7e2756dafb3b39a9aeb74`
- Descripción breve: Corrige la segunda reserva sobre contexto confirmado para resetear draft antes de quote, evitar recotización de la reserva previa y no caer en el ACK temporal compartido.

## 3. FIX-MULTICHANNEL-CANONICAL-GUEST-CONVERSATION-ROUTING-BY-CHANNEL-01

- Identificador: `FIX-MULTICHANNEL-CANONICAL-GUEST-CONVERSATION-ROUTING-BY-CHANNEL-01`
- Nombre: `FIX-MULTICHANNEL-CANONICAL-GUEST-CONVERSATION-ROUTING-BY-CHANNEL-01`
- Commit message: `FIX-MULTICHANNEL-CANONICAL-GUEST-CONVERSATION-ROUTING-BY-CHANNEL-01`
- Hash: `7da63cff84e7e90d7b775df49dfc428cb3e73373`
- Descripción breve: Corrige el routing de conversación activa para guest canónico, reutilizando solo `conversationId` compatibles con el canal entrante y evitando colapso cross-channel arbitrario.

## 4. FIX-ADMIN-MULTICHANNEL-CONVERSATION-MESSAGE-VISIBILITY-01

- Identificador: `FIX-ADMIN-MULTICHANNEL-CONVERSATION-MESSAGE-VISIBILITY-01`
- Nombre: `FIX-ADMIN-MULTICHANNEL-CONVERSATION-MESSAGE-VISIBILITY-01`
- Commit message: `FIX-ADMIN-MULTICHANNEL-CONVERSATION-MESSAGE-VISIBILITY-01`
- Hash: `f35fd40da591eaccdf4e1ccffefa06137a8c141d`
- Descripción breve: Corrige el read-path de Admin conversations para que la conversación canónica multicanal siga mostrando mensajes válidos del hilo, sin filtrarlos erróneamente por `message.channel`.

## 5. FIX-RESERVATION-TEST-DATES-RELATIVE-FUTURE-HELPERS-01

- Identificador: `FIX-RESERVATION-TEST-DATES-RELATIVE-FUTURE-HELPERS-01`
- Nombre: `FIX-RESERVATION-TEST-DATES-RELATIVE-FUTURE-HELPERS-01`
- Commit message: `FIX-RESERVATION-TEST-DATES-RELATIVE-FUTURE-HELPERS-01`
- Hash: `e27be9327af4e5bc116e63991e5095de281ccf0e`
- Descripción breve: Reemplaza fechas absolutas vencibles por helpers de fechas futuras dinámicas en el spec de `create quote gating`, estabilizando el test sin tocar comportamiento productivo.

## 6. FIX-CANONICAL-GUEST-RESERVATION-SNAPSHOT-GUEST-FIRST-01

- Identificador: `FIX-CANONICAL-GUEST-RESERVATION-SNAPSHOT-GUEST-FIRST-01`
- Nombre: `FIX-CANONICAL-GUEST-RESERVATION-SNAPSHOT-GUEST-FIRST-01`
- Commit message: `FIX-CANONICAL-GUEST-RESERVATION-SNAPSHOT-GUEST-FIRST-01`
- Hash: `dfaeb4dd358915a6aadb264500d94e2ba065f1e5`
- Descripción breve: Corrige `mis reservas` para priorizar guest-first sobre huéspedes canónicos consolidados, listando reservas guest-wide y preservando deduplicación por `reservationId`.

## 7. FIX-TEST-TYPES-TWILIO-AND-TEMPORAL-REPAIR-SPECS-01

- Identificador: `FIX-TEST-TYPES-TWILIO-AND-TEMPORAL-REPAIR-SPECS-01`
- Nombre: `FIX-TEST-TYPES-TWILIO-AND-TEMPORAL-REPAIR-SPECS-01`
- Commit message: `FIX-TEST-TYPES-TWILIO-AND-TEMPORAL-REPAIR-SPECS-01`
- Hash: `f20aa54ae7022f96caddb99a0adac0fccc1c253f`
- Descripción breve: Corrige higiene de tipos en los specs de temporal repair y transporte Twilio, resolviendo errores TypeScript sobre mocks y llamadas grabadas sin tocar comportamiento productivo.

## 8. FIX-CREATE-DATE-FOLLOWUP-PRECEDENCE-OVER-TEMPORAL-ACK-01

- Identificador: `FIX-CREATE-DATE-FOLLOWUP-PRECEDENCE-OVER-TEMPORAL-ACK-01`
- Nombre: `FIX-CREATE-DATE-FOLLOWUP-PRECEDENCE-OVER-TEMPORAL-ACK-01`
- Commit message: `FIX-CREATE-DATE-FOLLOWUP-PRECEDENCE-OVER-TEMPORAL-ACK-01`
- Hash: `8a015c5d74752a1ef3e14d31fd5ede8aef4546fc`
- Descripción breve: Corrige la precedencia entre `reservation.create` y el ACK temporal compartido para que un follow-up de fechas complete el draft activo y cotice como create, sin usar copy de modify por email.

## 9. FIX-WHATSAPP-TWILIO-SUPERVISED-APPROVAL-DELIVERY-ADDRESS-01

- Identificador: `FIX-WHATSAPP-TWILIO-SUPERVISED-APPROVAL-DELIVERY-ADDRESS-01`
- Nombre: `FIX-WHATSAPP-TWILIO-SUPERVISED-APPROVAL-DELIVERY-ADDRESS-01`
- Commit message: `FIX-WHATSAPP-TWILIO-SUPERVISED-APPROVAL-DELIVERY-ADDRESS-01`
- Hash: `92d4631ec416bcb224b34bd24cb1fab3ec574c59`
- Descripción breve: Corrige el flujo supervisado/Admin de entrega WhatsApp/Twilio, resolviendo el destino técnico real desde fuentes válidas de canal y aliases y evitando usar `guestId` UUID como `To`.

## 10. FIX-WHATSAPP-TWILIO-ADMIN-APPROVAL-CHANNEL-ADDRESS-01

- Identificador: `FIX-WHATSAPP-TWILIO-ADMIN-APPROVAL-CHANNEL-ADDRESS-01`
- Nombre: `FIX-WHATSAPP-TWILIO-ADMIN-APPROVAL-CHANNEL-ADDRESS-01`
- Commit message: `FIX-WHATSAPP-TWILIO-ADMIN-APPROVAL-CHANNEL-ADDRESS-01`
- Hash: `24b73b583bbcd9fc657029329a042ae2d351e813`
- Descripción breve: Corrige el outbound WhatsApp/Twilio para aprobación manual desde Admin, normalizando direcciones de canal en el transporte final y evitando el error `21910`.
