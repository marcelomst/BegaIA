# DRAFT — BegaIA Presentation Use Cases & Demo Selection

## 1. Propósito del documento

Este documento define una selección base de casos de uso y recorridos de demo para futuras piezas no técnicas de BegaIA:

- deck comercial
- one-pager
- guion de demo

No es una presentación final.
No redefine producto, arquitectura ni roadmap.
No autoriza claims no validados.

## 2. Estado documental

Documento: `DRAFT`

Uso permitido:

- preparar materiales de presentación
- seleccionar demos prudentes y repetibles
- alinear casos mostrables con capacidad documentada

Uso no permitido:

- convertir un flujo de demo en promesa comercial absoluta
- extrapolar robustecimientos recientes a capacidades no documentadas
- presentar límites actuales como automatización total

## 3. Naming

Convención para materiales no técnicos:

- `BegaIA` = branding externo recomendado para demo/presentación
- `Begasist` = nombre interno/histórico del sistema

No cerrar naming legal o marcario en este documento.

## 4. Criterios de selección de casos de uso

Los casos elegidos para demo deben cumplir, idealmente, estas condiciones:

- ser comprensibles por audiencia no técnica
- mostrar valor operativo visible en pocos turnos
- apoyarse en capacidades ya documentadas
- evitar depender de integraciones o pricing no validados
- mostrar gobernanza, no solo respuesta
- permitir explicar control humano y límites con claridad

Priorizar demos donde se vea:

- continuidad conversacional
- especialización hotelera
- paso ordenado entre consulta y reserva
- manejo prudente de ambigüedad
- separación entre identidad del interlocutor y titular transaccional

## 5. Casos de uso recomendados para demo

### 5.1 Consulta frecuente del huésped

Objetivo:
mostrar que BegaIA puede responder consultas operativas o frecuentes del hotel.

Ejemplos seguros:

- horarios
- amenities
- políticas simples

Valor visible:

- baja fricción
- respuesta rápida
- lenguaje natural sin vender comprensión ilimitada

### 5.2 Consulta de disponibilidad

Objetivo:
mostrar que BegaIA distingue una consulta de disponibilidad de una reserva ya decidida.

Qué debe verse:

- comprensión del intento de inquiry
- pedido mínimo de datos faltantes si corresponde
- respuesta de disponibilidad sin pedir confirmación prematura

Claim seguro:

- “Puede manejar consultas de disponibilidad y sostener el hilo conversacional.”

### 5.3 Handoff de disponibilidad a reserva

Objetivo:
mostrar el pasaje gobernado desde `availability inquiry` hacia `create` solo cuando el huésped lo expresa.

Qué debe verse:

- no abre reserva por preguntar disponibilidad
- pasa a flujo de reserva cuando el huésped dice que quiere reservar

Valor visible:

- evita confundir intención exploratoria con intención transaccional

### 5.4 Reserva guiada

Objetivo:
mostrar un flujo de reserva conversacional paso a paso.

Qué debe verse:

- recolección ordenada de datos
- propuesta de reserva
- confirmación explícita

Restricción de wording:

- no vender “automatiza todo el booking”
- no vender pricing real por tarifa salvo validación aparte

### 5.5 Modificación gobernada

Objetivo:
mostrar que BegaIA no modifica una reserva sin target suficiente.

Qué debe verse:

- continuación sobre una reserva identificada
- pedido de aclaración si falta contexto
- ejecución gobernada cuando el target es suficiente

Valor visible:

- prudencia operativa

### 5.6 Cancelación gobernada

Objetivo:
mostrar que BegaIA no cancela por una frase ambigua o sin referencia suficiente.

Qué debe verse:

- confirmación contextual
- continuidad multiturno
- cancelación solo cuando corresponde

### 5.7 Interrupción lateral y regreso al flujo

Objetivo:
mostrar que una conversación puede desviarse brevemente sin perder el objetivo principal.

Ejemplo:

- huésped pregunta por parking o desayuno en medio de una reserva
- BegaIA responde
- luego retoma el flujo principal

Valor visible:

- continuidad conversacional real

### 5.8 Saludo inicial con captura de nombre

Objetivo:
mostrar personalización conversacional mínima y segura.

Qué debe verse:

- saludo inicial
- pregunta de cómo prefiere ser llamado el huésped
- uso posterior de `guest.name` como vocativo

Importante:

- no mezclar el nombre conversacional con el titular de reserva

### 5.9 Experiencia con branding textual del asistente

Objetivo:
mostrar que la demo puede adoptar branding textual del hotel sin hardcodes visibles.

Qué debe verse:

- saludo con `assistantBranding.displayName`
- rol textual del asistente
- acknowledgement configurable con fallback seguro

Valor visible:

- personalización de demo
- consistencia de identidad del asistente

## 6. Demo recomendada para gerentes de hotel

Secuencia sugerida:

1. saludo con branding del asistente
2. captura de nombre conversacional
3. consulta frecuente breve
4. consulta de disponibilidad
5. pasaje a reserva guiada
6. confirmación
7. follow-up breve de modificación o cancelación gobernada

Qué enfatizar:

- orden operativo
- continuidad entre turnos
- control ante ambigüedad
- convivencia entre automatización y supervisión humana

Qué evitar:

- tecnicismos de arquitectura
- promesas de integración total
- métricas no validadas

## 7. Demo recomendada para inversores

Secuencia sugerida:

1. framing: no bot genérico, sí concierge digital especializado
2. saludo con branding y captura de nombre
3. inquiry de disponibilidad
4. handoff a reserva
5. interrupción lateral y retorno
6. ejemplo corto de follow-up sobre reserva

Qué enfatizar:

- especialización vertical en hotelería
- continuidad conversacional
- gobernanza sobre acciones sensibles
- capacidad de convertir conversación en operación ordenada

Qué evitar:

- vender PMS real
- vender CRM completo de huésped
- vender pricing real por tarifa como capacidad general ya cerrada

## 8. Casos fuera de alcance para la demo inicial

No priorizar en una primera demo no técnica:

- pricing real por tarifa como claim central
- integración PMS real como promesa cerrada
- automatización total sin supervisión
- coreferencia libre o comprensión “de cualquier cosa”
- guest consolidation presentado como CRM completo
- typo tolerance presentado como corrección inteligente general
- branding como sistema completo de theme o personalidad avanzada

## 9. Claims seguros derivados

- BegaIA puede responder consultas frecuentes del hotel.
- BegaIA puede sostener consultas de disponibilidad sin abrir una reserva prematuramente.
- BegaIA puede guiar una reserva conversacional.
- BegaIA puede continuar conversaciones sobre reservas ya existentes.
- BegaIA puede pedir aclaración antes de actuar cuando el contexto no alcanza.
- En demo, BegaIA puede capturar cómo prefiere ser llamado el huésped y usar ese nombre luego.
- En demo, BegaIA puede presentarse con branding textual configurable del asistente.

## 10. Claims pendientes de validación

- “Reduce tiempos operativos en recepción.”
  Estado: wording prudente posible; resultado cuantitativo pendiente.

- “Captura más reservas por canal conversacional.”
  Estado: pendiente de validación comercial.

- “Consulta disponibilidad real en todos los casos.”
  Estado: validar fuente, límites y contexto de demo.

- “Está listo para despliegue comercial general.”
  Estado: pendiente de validación operativa y comercial.

## 11. Claims prohibidos

- “BegaIA reemplaza a recepción.”
- “BegaIA opera solo sin control humano.”
- “BegaIA garantiza más reservas.”
- “BegaIA garantiza aumento de ingresos.”
- “BegaIA entiende cualquier referencia o error de tipeo.”
- “BegaIA ya resuelve pricing real por tarifa como capacidad general.”
- “BegaIA ya es un PMS.”
- “BegaIA ya es un CRM completo de huéspedes.”

## 12. Notas de uso para deck, one-pager y guion de demo

### 12.1 Deck

Usar 3 o 4 casos máximos:

- saludo + branding + captura de nombre
- consulta de disponibilidad
- reserva guiada
- follow-up gobernado

### 12.2 One-pager

Resumir en:

- qué conversaciones resuelve
- cómo gobierna reservas y follow-ups
- cómo evita actuar sin contexto suficiente

### 12.3 Guion de demo

Preparar un recorrido repetible, corto y visible.

Orden recomendado:

1. saludo
2. personalización mínima
3. consulta frecuente
4. disponibilidad
5. reserva
6. interrupción lateral
7. retorno al flujo

La demo debe depender de capacidades documentadas y validadas en contexto de presentación, no de promesas comerciales futuras.

## 13. Resultado

```text
DOC-PRESENTATION-USE-CASES-DEMO-SELECTION-BEGAIA-62
estado: draft documental creado
agente externo: no usado
runtime: no tocado
documento destino: docs/product/presentation_use_cases_demo_selection.md
```
