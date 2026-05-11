# BEGAIA — Arquitectura Conceptual

Nota de naming:

- `BegaIA` = branding externo recomendado para materiales de producto y presentación
- `Begasist` = nombre interno/histórico del sistema

## Bot vs Concierge Digital

### 1. Introducción

BegaIA no debe concebirse como un **chatbot tradicional**.
El sistema se diseña como un **Concierge Digital del hotel**.

La diferencia es estratégica.

Antes de hablar de un concierge digital, conviene recordar qué hace un concierge hotelero tradicional.

El concierge no se limita a responder preguntas.
Su función es orientar, asistir, resolver y actuar como puente entre el huésped y la operación del hotel.

Eso implica:

- continuidad en la atención
- criterio para entender qué necesita el huésped
- coordinación con servicios o áreas del hotel
- derivación operativa cuando el caso no debe resolverse en forma automática

El valor del concierge está en acompañar la experiencia, no solo en contestar.

---

## 2. Chatbot tradicional

Un chatbot tradicional intenta reemplazar la interacción humana.

Arquitectura conceptual:

Cliente
↓
Bot
↓
Respuesta automática

Problemas típicos:

- rompe conversaciones complejas
- frustra al usuario
- genera rechazo en operaciones hoteleras
- no permite control humano

---

## 3. Concierge Digital

Un concierge digital amplía la capacidad operativa del hotel por canales digitales.

No reemplaza la hospitalidad humana.
La extiende.

Opera sobre conversaciones reales del huésped y combina:

- automatización para lo repetitivo
- contexto conversacional
- continuidad entre turnos
- criterio de derivación
- control humano cuando corresponde

La idea no es responder todo “como sea”.
La idea es sostener una experiencia conversacional útil, prudente y operable.

---

## 4. BegaIA como Concierge Digital

BegaIA materializa ese modelo como una capa conversacional hotelera.

En términos conceptuales, BegaIA combina:

- operación asistida por IA
- continuidad conversacional
- consultas operativas
- flujos vinculados a reservas
- control humano cuando hace falta

La multicanalidad debe entenderse aquí como orientación de producto y arquitectura conceptual.
En esta documentación puede nombrarse como:

- Web
- WhatsApp
- Email

sin convertir esa enumeración en promesa comercial cerrada sobre todos los canales.

BegaIA adopta un modelo **asistido humano + IA**.

Arquitectura conceptual:

Cliente
↓
WhatsApp / Web / Email / Channel Manager
↓
BegaIA Concierge Engine
↓
Decisión operativa

Bot responde automáticamente
o
Recepción responde asistida por IA

---

## 5. Principio fundamental

La IA **no reemplaza a recepción**.

La IA:

- responde lo repetitivo
- propone respuestas
- sostiene contexto conversacional
- acompaña consultas y reservas
- escala a humano cuando corresponde

---

## 6. Modo operativo

BegaIA define dos modos principales:

### Automatic Mode

El sistema responde directamente.

Ejemplos:

- disponibilidad de habitaciones
- amenities
- horarios
- información turística

---

### Supervised Mode

El sistema propone una respuesta, pero la recepción confirma.

Ejemplo de flujo:

Cliente pregunta
↓
BegaIA genera respuesta sugerida
↓
Recepción revisa
↓
Recepción envía

Esto genera confianza operativa.

---

## 7. Beneficio para el hotel

BegaIA crea una capa conversacional para ordenar mejor la interacción entre huésped y hotel.

Ejemplos:

- QR en habitaciones
- WhatsApp concierge
- reserva guiada
- upselling de servicios
- recomendaciones turísticas

Esto no implica:

- PMS real
- pricing real por tarifa como claim general
- automatización total
- reemplazo de recepción
- CRM completo de huéspedes

---

## 8. Canal WhatsApp como Concierge

En el modelo BegaIA:

1 hotel = 1 número WhatsApp concierge.

Este número puede ser:

- número nuevo del hotel
- propiedad del hotel (Antel)
- conectado a Twilio

Arquitectura:

Cliente
↓
WhatsApp
↓
Twilio
↓
BegaIA
↓
Motor conversacional

---

## 9. Filosofía de producto

BegaIA no es un bot.

BegaIA es:

**El Concierge Digital del hotel.**

---

## 10. Principios de diseño

1. Humano siempre tiene control
2. Automatizar solo lo repetitivo
3. Conversación contextual
4. Derivación prudente cuando el contexto no alcanza
5. Multi-canal
6. Multi-hotel (SaaS)

---

## 11. Conclusión

El éxito de BegaIA depende de mantener el equilibrio:

IA + Recepción

El sistema amplifica la capacidad operativa del hotel sin reemplazar su hospitalidad.
