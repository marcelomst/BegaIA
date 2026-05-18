// Path: docs/product/presentation_narrative_base.md

# DRAFT — BegaIA Presentation Narrative Base

## 1. Propósito del documento

Este documento es la base narrativa para futuras piezas no técnicas de BegaIA:

- deck comercial
- one-pager
- guion de demo

No es la presentación final.
No redefine producto ni arquitectura.
Consolida la narrativa ya alineada en la documentación existente.

Nota de naming:

- `BegaIA` = branding externo recomendado para demo/presentación
- `Begasist` = nombre interno/histórico del sistema

---

## 2. Estado

Documento: `DRAFT`

Uso permitido:

- preparar materiales comerciales
- alinear relato de producto
- evitar claims inconsistentes

Uso no permitido:

- publicar como pieza final sin revisión
- agregar promesas no validadas
- usarlo como fuente para claims técnicos no documentados

Recorte de resincronización actual:

- alineado hasta `FEAT-ASSISTANT-BRANDING-ACKNOWLEDGEMENT-COPY-60`
- incorpora como contexto demo la línea reciente 51–60

---

## 3. Narrativa base

BegaIA no debe presentarse como un chatbot genérico.

BegaIA debe presentarse como el Concierge Digital del hotel:

- conversacional
- multicanal
- orientado al dominio hotelero
- asistido por IA
- con control humano cuando corresponde

La idea central no es reemplazar la hospitalidad del hotel.
La idea central es ampliar su capacidad operativa.

Relato corto recomendado:

> BegaIA es el Concierge Digital del hotel. Atiende consultas, acompaña reservas y ayuda a operar la conversación con huéspedes a través de múltiples canales, combinando automatización con control humano.

---

## 4. Audiencia

### 4.1 Audiencia principal

Pendiente de validación comercial final.

Base recomendada para materiales de presentación:

- dueños o dirección de hotel
- gerencia operativa
- recepción / front desk

### 4.2 Audiencia secundaria

Pendiente de validación comercial final.

Base recomendada:

- responsables comerciales
- responsables de experiencia de huésped
- hoteles que evalúan digitalizar atención conversacional

Nota:
Estas audiencias deben confirmarse antes de armar el deck final.

---

## 5. Problema que BegaIA ayuda a resolver

Los hoteles reciben conversaciones repetitivas y operativas por distintos canales.

Eso genera presión sobre recepción:

- consultas frecuentes
- seguimiento manual
- respuestas demoradas
- pérdida de continuidad entre turnos
- dificultad para sostener atención consistente

BegaIA se posiciona como una capa conversacional para ordenar esa interacción sin quitar control al hotel.

---

## 6. Posicionamiento recomendado

### 6.1 Qué es

BegaIA es:

- un sistema SaaS conversacional para hotelería
- un Concierge Digital del hotel
- una capa conversacional entre huéspedes, operación hotelera y flujos de reserva

### 6.2 Qué no es

BegaIA no es:

- un chatbot genérico
- un bot diseñado para reemplazar recepción
- una automatización ciega sin control operativo

---

## 7. Storyline recomendado

### 7.1 Apertura

Los hoteles ya conversan por WhatsApp, web, email y otros canales.
El problema no es abrir otro canal.
El problema es sostener una conversación útil, consistente y operable.

### 7.2 Cambio de marco

BegaIA no propone “poner un bot”.
Propone crear un Concierge Digital del hotel.

### 7.3 Diferencia estratégica

Un bot tradicional intenta responder todo.
BegaIA combina:

- automatización para lo repetitivo
- contexto conversacional
- soporte para reservas
- intervención humana cuando hace falta

### 7.4 Valor operativo

BegaIA ayuda a:

- responder consultas operativas
- acompañar flujos de reserva
- sostener continuidad conversacional
- operar en múltiples canales bajo una lógica común

### 7.5 Cierre

La hospitalidad sigue siendo del hotel.
BegaIA amplifica su capacidad para atender, responder y convertir conversaciones en una operación más ordenada.

### 7.6 Estado demo actual

Para materiales de demo, la narrativa debe asumir como base validada y reciente:

- consolidación de guests en Admin
- priorización del guest profile canónico
- snapshot/listado post-merge sobre guest consolidado
- captura conversacional de `guest.name` en saludo inicial
- tolerancia mínima a typos frecuentes en `availability inquiry`
- branding textual del asistente por hotel mediante `assistantBranding`
- copy controlado de acknowledgement mediante `acknowledgementLabel`

Estos puntos deben presentarse como robustecimientos concretos de demo, no como promesa de automatización total.

---

## 8. Claims seguros

Estos claims pueden usarse en materiales base porque están alineados con documentación existente.

- BegaIA es un sistema SaaS conversacional para hotelería.
- BegaIA debe presentarse como Concierge Digital del hotel.
- BegaIA no debe entenderse como un chatbot genérico.
- BegaIA opera de forma multicanal.
- BegaIA puede responder consultas operativas e informativas.
- BegaIA puede guiar flujos de reserva.
- BegaIA puede soportar follow-ups sobre reservas.
- BegaIA combina automatización con control humano cuando corresponde.
- La IA no reemplaza a recepción.
- BegaIA crea un nuevo canal digital de reservas y concierge.
- En demo, BegaIA ya puede sostener saludo con branding del asistente y captura básica del nombre conversacional del huésped.

---

## 9. Claims prudentes

Estos claims pueden aparecer solo con formulación prudente o marcados como pendientes de validación comercial.

Para WhatsApp, la formulación prudente es: “Podemos iniciar sin tocar el WhatsApp actual del hotel. Si luego quieren conservar su número principal, se evalúa migración o coexistencia según elegibilidad de Meta/proveedor.”

No afirmar que la telefónica puede redirigir WhatsApp de un número a otro, ni que WhatsApp Business App y API coexistirán siempre con el mismo número sin validación previa.

- BegaIA ayuda a ordenar la operación conversacional del hotel.
  Estado: formulación prudente permitida.

- BegaIA puede mejorar tiempos de respuesta en conversaciones repetitivas.
  Estado: pendiente de validación comercial con evidencia específica.

- BegaIA puede ayudar a capturar más oportunidades de reserva por canales conversacionales.
  Estado: pendiente de validación comercial.

- BegaIA puede habilitar upselling de servicios o recomendaciones.
  Estado: permitido solo como capacidad posible del modelo de producto, no como resultado garantizado.

- BegaIA puede integrarse con operación asistida por humanos cuando la automatización total no corresponde.
  Estado: claim seguro a nivel conceptual; no prometer alcance de integración comercial no documentado.

---

## 10. Claims prohibidos

Estos claims no deben usarse en deck, one-pager ni demo comercial.

- “BegaIA reemplaza a recepción.”
- “BegaIA opera solo, sin supervisión.”
- “BegaIA garantiza más reservas.”
- “BegaIA garantiza aumento de ingresos.”
- “BegaIA entiende cualquier caso sin errores.”
- “BegaIA ya integra cualquier sistema hotelero.”
- “BegaIA elimina por completo la intervención humana.”
- “BegaIA es un bot de atención automática genérico.”

---

## 11. Lenguaje recomendado

Priorizar expresiones como:

- Concierge Digital del hotel
- sistema conversacional para hotelería
- operación asistida por IA
- multicanal
- control humano
- continuidad conversacional
- reservas y atención operativa

Evitar expresiones como:

- bot que reemplaza personas
- atención 100% autónoma garantizada
- solución mágica
- inteligencia total

---

## 12. Aplicación por pieza

### 12.1 Deck

Usar esta secuencia:

1. problema operativo
2. cambio de marco: no bot, sí concierge digital
3. qué hace Begasist
   Usar `BegaIA` como branding externo en la pieza final.
4. cómo combina IA + humano
5. casos de uso conversacionales
6. cierre con valor operativo

### 12.2 One-pager

Usar:

- definición corta de Begasist
  Usar `BegaIA` como nombre visible y `Begasist` solo si hace falta referencia interna.
- 3 a 5 claims seguros
- diferenciación frente a chatbot genérico
- cierre con propuesta de valor prudente

### 12.3 Demo

Mostrar:

- consulta operativa
- flujo de reserva
- saludo con captura de nombre conversacional
- continuidad entre interlocutor conversacional y titular transaccional
- momento de asistencia humana o control operativo
- branding configurable del asistente con fallback seguro

La demo no debe depender de promesas comerciales no validadas.

---

## 13. Notas de gobernanza

- Este documento permanece en estado `DRAFT`.
- Si se agregan métricas, resultados o promesas comerciales, deben validarse antes.
- Si aparece conflicto con documentación conceptual de producto, prevalece la narrativa documentada del Concierge Digital.
- Si se requiere una narrativa comercial más agresiva, debe revisarse antes de incorporarla como claim.

---

## 14. Versión corta lista para reutilizar

> BegaIA es el Concierge Digital del hotel. Es un sistema SaaS conversacional para hotelería que ayuda a atender consultas, acompañar reservas y sostener conversaciones operativas a través de múltiples canales. No busca reemplazar a recepción, sino ampliar su capacidad con automatización e intervención humana cuando corresponde.
