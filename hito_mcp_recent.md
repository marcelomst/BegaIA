# hito_mcp_recent.md

SCOPE: LAST_10_HITOS  
ROLE: HISTORICAL_CONTEXT  
SOURCE: hito_mcp.md

NOTE:  
Este archivo es un recorte operativo de los últimos 10 hitos.  
No reemplaza el historial completo.

## 1. FIX-CANONICAL-GUEST-RESERVATION-SNAPSHOT-GUEST-FIRST-01

- Identificador: `FIX-CANONICAL-GUEST-RESERVATION-SNAPSHOT-GUEST-FIRST-01`
- Nombre: `FIX-CANONICAL-GUEST-RESERVATION-SNAPSHOT-GUEST-FIRST-01`
- Commit message: `FIX-CANONICAL-GUEST-RESERVATION-SNAPSHOT-GUEST-FIRST-01`
- Hash: `dfaeb4dd358915a6aadb264500d94e2ba065f1e5`
- Descripción breve: Corrige `mis reservas` para priorizar guest-first sobre huéspedes canónicos consolidados, listando reservas guest-wide y preservando deduplicación por `reservationId`.

## 2. FIX-TEST-TYPES-TWILIO-AND-TEMPORAL-REPAIR-SPECS-01

- Identificador: `FIX-TEST-TYPES-TWILIO-AND-TEMPORAL-REPAIR-SPECS-01`
- Nombre: `FIX-TEST-TYPES-TWILIO-AND-TEMPORAL-REPAIR-SPECS-01`
- Commit message: `FIX-TEST-TYPES-TWILIO-AND-TEMPORAL-REPAIR-SPECS-01`
- Hash: `f20aa54ae7022f96caddb99a0adac0fccc1c253f`
- Descripción breve: Corrige higiene de tipos en los specs de temporal repair y transporte Twilio, resolviendo errores TypeScript sobre mocks y llamadas grabadas sin tocar comportamiento productivo.

## 3. FIX-CREATE-DATE-FOLLOWUP-PRECEDENCE-OVER-TEMPORAL-ACK-01

- Identificador: `FIX-CREATE-DATE-FOLLOWUP-PRECEDENCE-OVER-TEMPORAL-ACK-01`
- Nombre: `FIX-CREATE-DATE-FOLLOWUP-PRECEDENCE-OVER-TEMPORAL-ACK-01`
- Commit message: `FIX-CREATE-DATE-FOLLOWUP-PRECEDENCE-OVER-TEMPORAL-ACK-01`
- Hash: `8a015c5d74752a1ef3e14d31fd5ede8aef4546fc`
- Descripción breve: Corrige la precedencia entre `reservation.create` y el ACK temporal compartido para que un follow-up de fechas complete el draft activo y cotice como create, sin usar copy de modify por email.

## 4. FIX-WHATSAPP-TWILIO-SUPERVISED-APPROVAL-DELIVERY-ADDRESS-01

- Identificador: `FIX-WHATSAPP-TWILIO-SUPERVISED-APPROVAL-DELIVERY-ADDRESS-01`
- Nombre: `FIX-WHATSAPP-TWILIO-SUPERVISED-APPROVAL-DELIVERY-ADDRESS-01`
- Commit message: `FIX-WHATSAPP-TWILIO-SUPERVISED-APPROVAL-DELIVERY-ADDRESS-01`
- Hash: `92d4631ec416bcb224b34bd24cb1fab3ec574c59`
- Descripción breve: Corrige el flujo supervisado/Admin de entrega WhatsApp/Twilio, resolviendo el destino técnico real desde fuentes válidas de canal y aliases y evitando usar `guestId` UUID como `To`.

## 5. FIX-WHATSAPP-TWILIO-ADMIN-APPROVAL-CHANNEL-ADDRESS-01

- Identificador: `FIX-WHATSAPP-TWILIO-ADMIN-APPROVAL-CHANNEL-ADDRESS-01`
- Nombre: `FIX-WHATSAPP-TWILIO-ADMIN-APPROVAL-CHANNEL-ADDRESS-01`
- Commit message: `FIX-WHATSAPP-TWILIO-ADMIN-APPROVAL-CHANNEL-ADDRESS-01`
- Hash: `24b73b583bbcd9fc657029329a042ae2d351e813`
- Descripción breve: Corrige el outbound WhatsApp/Twilio para aprobación manual desde Admin, normalizando direcciones de canal en el transporte final y evitando el error `21910`.

## 6. FIX-CREATE-INLINE-GUESTNAME-SAFE-PERSON-CAPTURE-01

- Identificador: `FIX-CREATE-INLINE-GUESTNAME-SAFE-PERSON-CAPTURE-01`
- Nombre: `FIX-CREATE-INLINE-GUESTNAME-SAFE-PERSON-CAPTURE-01`
- Commit message: `FIX-CREATE-INLINE-GUESTNAME-SAFE-PERSON-CAPTURE-01`
- Hash: `0d9bd70535427cec6db7f2fa95da25e201c284a6`
- Descripción breve: Endurece la captura inline de `guestName` en `reservation.create`, aceptando solo nombres personales seguros y rechazando amenities, servicios, cantidades y texto ambiguo como identidad.

## 7. FIX-CREATE-COMPLETE-DRAFT-AUTOQUOTE-SEQUENCING-01

- Identificador: `FIX-CREATE-COMPLETE-DRAFT-AUTOQUOTE-SEQUENCING-01`
- Nombre: `FIX-CREATE-COMPLETE-DRAFT-AUTOQUOTE-SEQUENCING-01`
- Commit message: `FIX-CREATE-COMPLETE-DRAFT-AUTOQUOTE-SEQUENCING-01`
- Hash: `2efa9a7e3cb989fda0faa4d63e8b9093e783dec4`
- Descripción breve: Restaura la secuencia canónica de `reservation.create` cuando el draft queda completo tras el repair temporal, habilita availability/cotización normal y evita re-preguntas erróneas de fechas.

## 8. FIX-CREATE-PAST-CHECKIN-PRESERVE-INLINE-GUESTNAME-01

- Identificador: `FIX-CREATE-PAST-CHECKIN-PRESERVE-INLINE-GUESTNAME-01`
- Nombre: `FIX-CREATE-PAST-CHECKIN-PRESERVE-INLINE-GUESTNAME-01`
- Commit message: `FIX-CREATE-PAST-CHECKIN-PRESERVE-INLINE-GUESTNAME-01`
- Hash: `026fc30002084203336a3ce8154f387187372a49`
- Descripción breve: Preserva `guestName` inline y `roomType` cuando create recibe `checkIn` pasado inválido, evita persistir ese `checkIn` y mantiene bloqueadas quote/confirm, con refresh de Runtime Map V1.

## 9. FIX-CREATE-TEMPORAL-REPAIR-PRESERVE-DRAFT-STATE-01

- Identificador: `FIX-CREATE-TEMPORAL-REPAIR-PRESERVE-DRAFT-STATE-01`
- Nombre: `FIX-CREATE-TEMPORAL-REPAIR-PRESERVE-DRAFT-STATE-01`
- Commit message: `fix: preserve create draft state during checkout repair`
- Hash: `fb83bcf21794297c44a762ab71e75f8be10b40b1`
- Descripción breve: Corrige la reatribución de `checkOut` explícito como `checkIn` durante el repair temporal de create, preserva draft válido en `conv_state`, mantiene `checkIn`, `roomType` y `numGuests`, y refresca Runtime Map V1.

## 10. RECOVER-FIX-CREATE-EXPLICIT-CHECKOUT-SLOT-ATTRIBUTION-01

- Identificador: `RECOVER-FIX-CREATE-EXPLICIT-CHECKOUT-SLOT-ATTRIBUTION-01`
- Nombre: `RECOVER-FIX-CREATE-EXPLICIT-CHECKOUT-SLOT-ATTRIBUTION-01`
- Commit message: `fix: preserve explicit checkout attribution in create flow`
- Hash: `280a214d82510a5b51bcaf6a9f19af241cbd22a9`
- Descripción breve: Corrige en `reservation.create` la atribución errónea de `checkOut` explícito como `checkIn`, preserva `checkIn` y `numGuests`, bloquea quote/confirm con rango inválido y aplica refresh documental de Runtime Map V1.
