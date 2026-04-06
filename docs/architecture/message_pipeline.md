# Message Pipeline

## 1. Propósito

Este documento describe la arquitectura viva del pipeline conversacional
vigente de Begasist.

No resume hitos. Describe cómo funciona hoy el runtime real y qué límites
arquitectónicos tiene.

## 2. Runtime actual

El runtime principal sigue siendo:

- `messageHandler`

El graph no fue reemplazado. El pipeline actual es híbrido:

- capas deterministas
- heurísticas operativas
- contexto conversacional persistido
- classifier / policy / graph
- ejecutores de dominio

La relación actual es:

```text
Channel / API
-> handleChannelMessage
-> handleIncomingMessage (messageHandler)
-> stableIntentsGuard / guards operativas / contexto
-> classifier + policy + graph
-> acciones de dominio / respuesta
```

## 3. Flujo de alto nivel

Orden conceptual vigente:

1. entrada canónica por canal o API
2. normalización a `ChannelMessage`
3. continuidad conversacional (`guestId`, `conversationId`, historial)
4. carga de `conv_state`
5. runtime central en `messageHandler`
6. resolución temprana determinista cuando aplica
7. evaluación semántica / classifier / policy / graph cuando no hubo shortcut
8. persistencia del nuevo estado conversacional
9. composición de respuesta y política de entrega

Importante:

- `messageHandler` coordina el flujo
- el graph interpreta y enruta
- los nodos ejecutan dominio
- la persistencia conversacional no es un detalle secundario; es parte del
  runtime

## 4. Capas del pipeline

### 4.1 Entry / transporte

Responsabilidad:

- adaptar Web, WhatsApp, Email y otros canales al contrato interno
- preservar `hotelId`, `channel`, `guestId`, `conversationId`
- no duplicar lógica de negocio por canal

Punto de entrada operativo:

- `handleChannelMessage(...)`

### 4.2 Runtime conversacional

Responsabilidad principal:

- `messageHandler`

Tareas:

- cargar historial reciente
- cargar `conv_state`
- decidir shortcuts deterministas
- aplicar reglas operativas y follow-ups
- consultar `hotelConfig`
- invocar classifier / policy / graph cuando corresponde
- persistir cambios de estado
- componer la respuesta final

Invariante:

- el centro de gravedad del pipeline está en `messageHandler`, no en el graph

### 4.3 Control semántico determinista

Responsabilidad principal:

- `stableIntentsGuard`

Función:

- capturar intents estables, frecuentes y de baja ambigüedad antes del routing
  general

Cobertura actual:

- horarios básicos
- amenities frecuentes
- extensiones semánticas acotadas de desayuno / wifi / parking

Gobernanza:

- depende de configuración hotelera cuando corresponde
- no debe absorber intents transaccionales reales
- no reemplaza classifier ni graph

### 4.4 Contexto conversacional

Responsabilidad:

- dar memoria operativa mínima al runtime

Persistencia:

- `conv_state`

Señales relevantes actuales:

- `guestState`
- `reservationSlots`
- `lastProposal`
- `lastReservation`
- `reservationHistory`
- `activeReservationContext`
- `conversationFocus`
- `pendingCancellation`
- `pendingAvailabilityVerification`
- `salesStage`
- `conversationStage`
- `desiredAction`
- `activeFlow`

### 4.5 Intent engine

Responsabilidad:

- classifier
- policy
- graph

Función:

- resolver intents que no pueden cerrarse determinísticamente
- aplicar priorización semántica
- enrutar a nodos y salidas de dominio

El graph hoy es:

- motor de interpretación y routing
- no runtime autónomo completo

### 4.6 Ejecutores de dominio

Ejemplos:

- reserva
- modificación
- cancelación
- retrieval / KB
- respuestas operativas

Estas capas ejecutan acciones específicas, pero no gobiernan por sí solas el
flujo de conversación completo.

## 5. Modelo de contexto conversacional

### 5.1 `guestState`

Modelo mínimo vigente:

- `prospect`
- `booked`
- `in_house`

Uso:

- matizar respuestas
- mejorar framing de amenities y operaciones hoteleras

No hace:

- PMS real
- pricing real por tarifa
- control principal del pipeline

### 5.2 `lastReservation`

Responsabilidad:

- compatibilidad
- última reserva operativa conocida

Límite:

- ya no debe interpretarse como única fuente de foco conversacional

### 5.3 `reservationHistory`

Responsabilidad:

- historial mínimo de reservas dentro de la conversación

Uso:

- soportar más de una reserva por conversación
- permitir referencias a reservas alternativas

Límite:

- no modela todavía gestión multi-booking completa

### 5.4 `activeReservationContext`

Responsabilidad:

- indicar qué reserva o draft está en foco

Modelo actual:

- `draft`
- `reservation`

Con fases mínimas:

- `collecting`
- `quoted`
- `confirmed`
- `cancelled`

Uso:

- desacoplar foco actual de `lastReservation`
- mejorar multi-reservation
- habilitar reference resolution conservadora

### 5.5 `conversationFocus`

Responsabilidad:

- preservar el foco conversacional activo del runtime y permitir continuación
  explícita después de interrupciones laterales compatibles

Uso:

- reutilizar estado real ya gobernado para retomar `create`, `modify` o `cancel`
- evitar reinicios innecesarios del flujo activo
- impedir que preservar foco quede como señal pasiva sin reenganche operativo

Regla operativa:

- preservar foco no alcanza por sí solo; el runtime puede anexar continuación
  explícita cuando el lateral no resolvió el faltante del flujo activo
- no debe existir continuación redundante si el turno lateral ya aportó el dato
  necesario
- `conversationFocus` mantiene autoridad sobre señales legacy cuando el flujo
  gobernado activo sigue siendo `create`
- `conversationFocus` no es absoluto ante turnos informativos puros de `faq` o
  `policies`
- el usuario puede salir explícitamente de un subflow como `modify`
- no debe existir retención explícita ni implícita de intención secundaria
  entre turnos
- si `faq` o `policies` rompen el domain lock, la continuidad previa de
  `reservation` debe cortarse también en el ensamblado final del output

### 5.6 `reservationSlots`

Responsabilidad:

- snapshot vivo del draft actual o del contexto de reserva activo que el
  runtime sigue usando

Uso:

- capturar fechas, room type, huéspedes, nombre
- consolidar múltiples datos útiles del mismo turno antes de decidir
- hacer merge consistente entre estado previo, input actual y fallback estructurado
- sostener follow-ups y cambios incrementales
- permitir ingestión inline de `guestName` en turnos ricos de `create`
- interpretar `numGuests` con una semántica canónica común entre helper y
  runtime

Regla operativa:

- la ingestión de slots debe ocurrir antes de cualquier decisión de fallback o
  continuidad de flujo
- el runtime no debe repreguntar datos que ya fueron ingeridos de forma válida
- la validación RAW de fechas debe ocurrir antes de normalizar o avanzar el
  flujo de `create`
- la captura inline de `guestName` no debe degradar otros slots ya válidos ni
  disparar confirm prematuro
- `numGuests` representa el total final de huéspedes
- helper resuelve total directo y composición explícita
- runtime sólo resuelve follow-ups contextuales cortos, sin competir
  semánticamente con el helper

### 5.7 `draft consistency validation`

Responsabilidad:

- validar coherencia interna del draft antes de availability, quote o ejecución

Regla operativa:

- un draft inconsistente no puede avanzar en el pipeline
- el runtime puede remover slots conflictivos para preservar la intención válida
  del usuario
- la validación ocurre antes de decisiones comerciales o mutativas
- una fecha inválida o invertida debe bloquear el avance antes de cualquier
  quote, availability o ejecución

Ejemplo actual:

- `single + 3 huéspedes` -> remover `roomType`, mantener `numGuests`

### 5.8 `create sequencing`

Responsabilidad:

- gobernar el orden determinístico de captura dentro del flujo `create`

Secuencia actual:

1. `checkIn`
2. `checkOut`
3. `numGuests`
4. `roomType`
5. `guestName`

Regla operativa:

- el draft debe persistirse antes de decidir el siguiente paso
- una confirmación vacía no puede hacer avanzar el flujo si el estado sigue
  incompleto
- el runtime debe conducir el siguiente paso lógico según completitud real del
  estado
- no se debe verificar disponibilidad ni generar propuesta comercial mientras el
  draft de `create` siga incompleto

### 5.9 `quote gating`

Responsabilidad:

- bloquear disponibilidad, quote y proposal dentro de `reservation.create`
  mientras el draft no tenga completitud suficiente

Regla operativa:

- si el draft está incompleto, el runtime debe volver al siguiente faltante
  real del create sequencing
- `lastProposal` y `pendingAvailabilityVerification` no deben quedar
  persistidos como estado prematuro
- un fast-path de fechas no puede degradar un `create` activo a
  `modify_reservation`
- la ejecución comercial solo puede ocurrir sobre estado suficiente

## 6. Reservas múltiples

El sistema ya no asume rígidamente:

`1 conversación = 1 reserva`

Modelo mínimo vigente:

- una conversación puede conservar una reserva confirmada previa
- puede abrir un draft nuevo
- puede confirmar una nueva reserva sin perder la anterior
- mantiene historial mínimo en `reservationHistory`
- mantiene foco actual en `activeReservationContext`

Esto no convierte al sistema en un PMS ni en un gestor completo de múltiples
reservas. Solo rompe la suposición rígida previa y deja una base operativa
mínima.

## 7. Reference resolution

Existe una primera capa conservadora de resolución de referencias
conversacionales sobre reservas múltiples.

Antes de resolver referencias o accionar sobre reservas, el runtime consolida
un estado canónico del dominio `reservation`.

Ese stage cumple una función de fuente de verdad interna:

- deduplica por `reservationId`
- preserva la versión más reciente cuando hay conflicto
- conserva el estado canónico (`active`, `cancelled`, `error`)
- define orden determinístico
- define una única lista de reservas accionables

Esto evita que distintas etapas del pipeline operen sobre versiones diferentes
de una misma reserva.

Señales usadas por orden:

1. `activeReservationContext`
2. `reservationHistory`
3. `lastReservation`
4. `reservationSlots` para draft activo

Referencias actualmente soportadas cuando la señal es suficiente:

- `la nueva`
- `la otra`
- `la anterior`
- `esa`
- `la de mañana`
- ordinales explícitas como `la primera`, `la segunda`, `la tercera` y `la última`

Regla operativa:

- si la referencia es clara, se resuelve
- si la referencia es ambigua, el sistema pide aclaración
- no se inventa un target

Alcance actual:

- integración con `snapshot`, `modify` y `cancel`
- validación contra lista canónica de reservas antes de ejecutar acciones
- gating de suficiencia cuando hay múltiples reservas accionables y falta target claro
- continuidad explícita del target en `modify` hasta availability, confirm y ejecución final
- cuando el target de `modify` ya está resuelto, una intención explícita de
  campo (`huéspedes`, `fechas`, `habitación`) debe ganar sobre el branch
  genérico de `modify`
- el subestado `guests` de `modify` debe aceptar input numérico corto válido y
  permitir snapshot follow-up post-modify sin reabrir menú
- el snapshot de `modify` debe construirse exclusivamente desde la reserva
  objetivo ya resuelta, sin contaminarse con nombre o fechas de otra reserva
- no hay coreferencia completa
- no hay coreferencia libre por nombre, habitación o fecha arbitraria

Modelo interno mínimo vigente del Reference Engine:

1. canonical state build
2. slot ingestion
3. draft consistency validation
4. reference detection
5. existence validation
6. sufficiency validation
7. target resolution
8. create sequencing
9. quote gating
10. modify execution integrity
11. cancel execution integrity
12. execution

Guardrails vigentes:

- referencias ordinales fuera de rango no ejecutan acciones
- si hay varias reservas accionables sin target suficiente, el sistema bloquea
  `modify`, `cancel` o snapshot accionable y pide aclaración
- no debe existir lógica duplicada por etapa para reinterpretar reservas fuera
  del estado canónico
- la información útil de un turno debe persistirse antes de decidir fallback
- un draft inconsistente debe sanearse o pedir aclaración antes de seguir
- el flujo `create` debe avanzar por completitud de estado y no por reacción
  oportunista al último mensaje
- no debe existir cotización o proposal sobre drafts incompletos
- una vez seleccionado un target en `modify`, availability, confirm y execution
  deben operar sobre esa misma reserva
- en `modify`, la intención específica de campo debe ganar sobre el routing
  genérico para preservar determinismo y continuidad de target
- en `modify.guests`, un valor corto válido no debe caer en repregunta,
  fallback ni reapertura del menú
- el follow-up de snapshot post-modify debe formar parte del cierre correcto de
  la transacción
- en `modify`, `reservationId`, nombre, fechas, capacidad y habitación deben
  quedar alineados al mismo target resuelto
- una cancelación confirmada debe impactar la fuente de verdad canónica y
  reflejarse sin duplicaciones en snapshot y listado posterior
- el runtime no debe actuar sobre una reserva equivocada por falta de precisión

## 8. Casos donde el pipeline ya combina capas

Ejemplos representativos:

- FAQ estable -> `stableIntentsGuard`
- hotel semantics contextual -> guard + guest state
- early check-in / late check-out -> heurística contextual en runtime
- modify / cancel -> runtime + conv_state + ejecutor de dominio
- multi-reservation -> runtime + conv_state
- reference resolution -> runtime + foco activo + historial
- cross-domain turn prioritization -> runtime + foco + heurísticas determinísticas

Esto confirma que el pipeline actual no es puramente determinista ni puramente
LLM-driven. Es un runtime híbrido controlado.

## 9. Invariantes vigentes

- `messageHandler` sigue siendo el runtime principal
- el graph se preserva, pero no gobierna solo todo el flujo
- los canales convergen al mismo pipeline central
- `hotelId` debe permanecer explícito
- el transporte no debe duplicar lógica de dominio
- `stableIntentsGuard` debe seguir siendo conservador
- `guestState` es señal contextual, no controlador principal
- `activeReservationContext` es la señal preferida de foco actual
- un turno ejecuta un solo dominio
- la prioridad de dominio es determinística cuando compiten `reservation`,
  `pricing`, `policies`, `faq` y `fallback`
- `pricing` explícito no debe degradar a `reservation collecting`
- la intención secundaria no se ejecuta, no se menciona y no se recuerda entre
  turnos; sólo reaparece si el usuario la expresa otra vez
- si `faq` o `policies` dominan el turno tras romper el domain lock, la
  respuesta final debe quedar pura en ese dominio sin concatenar follow-ups de
  `reservation`
- ante ambigüedad fuerte en referencias, se pide aclaración
- las acciones sobre reservas requieren target existente y suficiente antes de ejecutar

## 10. Límites actuales

El sistema todavía no hace, o no hace completamente:

- PMS real
- pricing real por tarifa
- validación definitiva de inclusión por tarifa
- coreferencia compleja completa
- UI para selección de reserva
- grupos complejos
- multi-reservation con identidad de draft completa
- resolución semántica abierta para cualquier referencia arbitraria

## 11. Qué no tocar sin cuidado

- no mover el runtime fuera de `messageHandler` sin reabrir ADR
- no expandir `stableIntentsGuard` sin gobernanza explícita
- no volver a cargar `lastReservation` con todo el peso de foco + historial +
  contexto activo
- no duplicar lógica de routing por canal
- no introducir heurísticas de referencias que inventen target bajo ambigüedad

## 12. Relación con otros documentos

Decisiones relacionadas:

- [`ADR-PIPELINE-SEMANTIC-CONTROL-01.md`](./ADR-PIPELINE-SEMANTIC-CONTROL-01.md)
- [`adr_pipeline_runtime_target.md`](./adr_pipeline_runtime_target.md)
- [`pipeline-runtime-evolution.md`](./pipeline-runtime-evolution.md)

Documentos complementarios:

- [`channel_architecture.md`](./channel_architecture.md)
- [`conversation_binding_guest_identity.md`](./conversation_binding_guest_identity.md)
- [`guest_identity_model.md`](./guest_identity_model.md)

Historial de evolución:

- [`/home/marcelo/begasist/hito_mcp.md`](/home/marcelo/begasist/hito_mcp.md)
