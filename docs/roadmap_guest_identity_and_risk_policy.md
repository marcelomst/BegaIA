# Begasist Roadmap — Guest Identity + Risk Policy

Este documento define el roadmap técnico aprobado para evolucionar Begasist hacia un **Concierge Digital multicanal con identidad transversal del huésped**.

Principio arquitectónico:

1 persona (guest)  
→ múltiples identificadores por canal (aliases)

Esto permite continuidad operativa entre:

- WhatsApp
- Email
- Web chat
- Channel Manager

Ejemplo real:

1) Guest envía WhatsApp solicitando presupuesto  
2) Recepción responde por email  
3) Guest responde email  

Todo corresponde a **la misma persona (guest)**.

---

# Estado actual del sistema

Estabilización del canal WhatsApp/Twilio completada.

Hitos ya implementados:

- FIX-WA-TWILIO-ROUTING-2
- FIX-PIPELINE-STATUS-1
- REF-PIPELINE-DELIVERY-1
- CHORE-DEV-TUNNEL-1
- Unificación webhook Twilio
- Eliminación fallback ENV To→hotelId
- FIX-GUEST-PHONE-NORMALIZATION-1

Resultado actual:

- WhatsApp funcional E2E
- Routing multi-hotel estable
- Pipeline y UI alineados
- Delivery policy centralizada

---

# Objetivo del nuevo roadmap

Implementar:

1) Identidad transversal del huésped
2) Control operativo consistente por guest
3) Risk policy para mejorar UX en modo supervisado
4) Conversaciones multicanal coherentes

---

# BLOQUE B — Identidad transversal del huésped

Modelo conceptual:

```
guests → persona
guest_aliases → identificadores por canal
```

Ejemplo:

guestId: `uuid-123`

aliases:

- whatsapp:+59899123456
- email:juan@email.com
- web:session_abc

---

## HITO B1

FEAT-GUEST-ALIASES-1

Crear colección:

```
guest_aliases
```

Campos:

```
hotelId
alias
guestId
createdAt
```

Funciones DB:

```
getGuestIdByAlias(hotelId, alias)
ensureGuestAlias(hotelId, alias)
```

Si alias no existe:

- crear guest
- crear alias

---

## HITO B2

REF-PIPELINE-GUEST-RESOLUTION-1

Modificar pipeline de entrada de mensajes.

Antes:

```
guestId = valor recibido por canal
```

Después:

```
alias → resolver guestId real
```

alias ejemplos:

```
whatsapp:+598...
email:foo@bar.com
web:sessionId
```

Persistir siempre:

```
guestId (persona)
```

---

## HITO B3

FIX-GUEST-ALIASES-COMPAT-1

Compatibilidad con guests legacy.

Si existe guestId antiguo tipo:

```
guestId = "whatsapp:+598..."
```

crear alias automáticamente:

```
alias → guestId existente
```

Sin migración masiva.

Lazy backfill.

---

# BLOQUE C — Admin UI

Control operativo transversal por guest.

---

## HITO C1

FEAT-ADMIN-GUEST-ALIASES-1

En GuestProfileModal:

mostrar aliases del huésped.

Permitir:

```
Agregar alias
Vincular alias existente
```

Ejemplo:

Vincular email al guest que ya existe por WhatsApp.

---

## HITO C2

FIX-ADMIN-GUEST-MODE-1

El modo del huésped debe ser:

```
guest.mode
```

Aplicado transversalmente a todos los canales.

UI debe indicar:

"Este modo aplica a todos los canales del huésped".

---

# BLOQUE D — Risk Policy del pipeline

Objetivo:

Mejorar UX cuando el canal está en modo supervisado.

Problema actual:

Saludos simples pueden quedar en "pending".

---

## HITO D1

FEAT-PIPELINE-RISK-POLICY-1

LOW risk → autosend

Ejemplos:

- greeting
- thanks
- simple FAQ

Incluso en modo supervisado.

Log obligatorio:

```
[PIPELINE_AUTO_APPROVED_BY_POLICY]
```

---

## HITO D2

FEAT-PIPELINE-RISK-POLICY-2

MEDIUM risk condicionado por:

```
confidence.intent
salesStage
needsSupervision
```

HIGH risk:

- reservas
- pagos
- cambios
- cancelaciones

Siempre pending.

---

# BLOQUE E — Conversación transversal

Opcional pero recomendado.

---

## HITO E1

REF-CONVERSATION-BINDING-2

Conversaciones asociadas a:

```
guestId (persona)
```

En lugar de teléfono o email.

---

## HITO E2

FEAT-ADMIN-INBOX-UNIFIED-1

Inbox admin agrupado por guest.

Mostrar canales como sub-threads:

- WhatsApp
- Email
- Web

---

# Orden recomendado de implementación

1️⃣ B1 — guest_aliases  
2️⃣ B2 — pipeline guest resolution  
3️⃣ B3 — compatibilidad legacy  

4️⃣ C1 — UI aliases  
5️⃣ C2 — modo guest transversal  

6️⃣ D1 — risk policy LOW  
7️⃣ D2 — risk policy MEDIUM  

8️⃣ E1 — conversation binding  
9️⃣ E2 — inbox unificado

---

# Principio de diseño

Begasist no es un chatbot.

Begasist es un **Concierge Digital del hotel**.

La IA automatiza lo repetitivo.  
La recepción mantiene el control operativo.
