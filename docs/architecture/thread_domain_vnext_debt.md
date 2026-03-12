# Deuda Arquitectónica — Thread como capa de caso operativo

## Estado

Deuda aprobada para `VNEXT`.

Clasificación:

- salto grande de versión
- cambio de modelo de dominio
- potencial breaking change conceptual

## Problema

El modelo actual de Begasist está centrado en:

`Guest -> Conversation -> Channel`

Ese modelo funciona para operación actual, pero queda corto para representar un mismo
caso operativo que atraviesa múltiples canales y múltiples conversaciones.

Ejemplo:

- un huésped inicia una solicitud por web
- continúa por WhatsApp
- formaliza por email

Operativamente puede ser un solo caso.

En el modelo actual, eso se refleja como múltiples conversaciones.

## Estado actual

Entidades efectivas:

- `Guest`: persona o identidad operativa
- `Conversation`: unidad persistida de intercambio
- `Channel`: medio de transporte (`web`, `whatsapp`, `email`, etc.)

Observación:

- hoy el sistema persiste `conversation`
- hoy Inbox usa `thread` como término visual, pero no existe como entidad de dominio estable

## Estado objetivo

Modelo objetivo para una gran versión:

`Guest -> Thread -> Conversation -> Channel`

Definiciones:

- `Guest`: persona o cuenta cliente
- `Thread`: caso operativo unificado
- `Conversation`: intercambio concreto dentro de un canal o instancia conversacional
- `Channel`: transporte del intercambio

Ejemplo objetivo:

- `Guest`: organizador del grupo
- `Thread`: reserva excursión 100 pax
- `Conversations`:
  - web: solicitud inicial
  - whatsapp: ajuste operativo
  - email: propuesta formal y contrato

## Motivación

Beneficios esperados:

- seguimiento por caso operativo y no solo por conversación
- mejor lectura multicanal en Inbox
- separación más clara entre tema de negocio y canal de contacto
- base más sólida para grupos, corporativo, eventos y negociaciones largas

## Motivo para postergar

No bloquea la operación actual.

Implementarlo ahora tendría impacto en:

- modelo de datos
- conversation binding
- Inbox admin
- contratos internos de lectura
- semántica de métricas y UI

Por lo tanto, no se recomienda tratarlo como ajuste incremental.

## Alcance esperado para VNEXT

Si esta deuda se activa, el trabajo mínimo esperado incluye:

1. ADR con definiciones estables de `Guest`, `Thread`, `Conversation`, `Channel`
2. modelo lógico de `threads`
3. reglas de binding entre conversación y thread
4. estrategia backward-compatible para `conversation.threadId`
5. rediseño de Inbox para vista por caso operativo
6. herramientas operativas para dividir, mover o fusionar threads

## Riesgo principal

El mayor riesgo es semántico:

- llamar `thread` a algo que hoy sigue siendo solo `conversation`

Eso generaría ambigüedad entre producto, operación, UI y backend.

## Regla hasta nuevo aviso

Hasta que se active esta deuda en una gran versión:

- `conversation` sigue siendo la unidad persistida principal
- `channel` sigue siendo el medio de contacto
- `guest` sigue siendo la identidad operativa canónica
- el término `thread` no debe introducirse como contrato de backend

## Disparadores para activarlo

Activar esta deuda cuando aparezca al menos una de estas condiciones:

- volumen relevante de casos multicanal largos
- necesidad operativa de seguimiento por caso
- reporting por caso operativo y no solo por conversación
- crecimiento de grupos, eventos o corporativo
- fricción recurrente en recepción por fragmentación de contexto
