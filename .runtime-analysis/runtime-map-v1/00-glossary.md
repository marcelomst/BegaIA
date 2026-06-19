// Path: .runtime-analysis/runtime-map-v1/00-glossary.md

# Runtime Map V1 — Glosario

## Propósito

Este glosario define los términos usados en Runtime Map V1.

Su objetivo es evitar ambigüedades entre:

```text
AGPT
agente técnico
Guardian
HDOC
Marcelo
documentación
mapas human-friendly
box-index machine-friendly
```

Este glosario no modifica arquitectura.  
No autoriza refactor.  
No define módulos físicos.  
Define lenguaje común para analizar el runtime.

---

## Regla principal

```text
Nombrar una caja no significa extraer una caja.
```

El mapa sirve para:

```text
entender
auditar
ubicar riesgos
preparar hitos
diseñar tests de paridad
reducir regresiones
coordinar agentes
```

No sirve para justificar refactors amplios sin cobertura.

---

## Runtime

### Definición

El runtime es la parte del sistema que procesa un turno conversacional y decide qué respuesta o acción corresponde.

En este mapa, el runtime principal vigente es:

```text
messageHandler.ts
```

### Uso correcto

```text
El runtime recibe un ChannelMessage canónico y produce una respuesta al canal.
```

### Riesgo de confusión

No confundir runtime con:

```text
Next.js app
API route
Graph solamente
LLM solamente
canal específico
base de datos
```

---

## Sub-runtime

### Definición

Un sub-runtime es una zona interna que concentra suficiente lógica de decisión, estado, rutas y salidas como para comportarse como un runtime dentro del runtime.

En el estado actual, el sub-runtime dominante es:

```text
bodyLLM
```

### Uso correcto

```text
bodyLLM es un sub-runtime dominante dentro de messageHandler.ts.
```

### Riesgo de confusión

No significa que `bodyLLM` sea un módulo separado ni que deba extraerse inmediatamente.

---

## Turno

### Definición

Un turno es una unidad conversacional procesada por el runtime.

Ejemplo:

```text
Guest:
check out 25/5/2026, 2 personas
```

Ese mensaje es un turno nuevo, pero debe interpretarse junto con el estado previo.

### Riesgo

Tratar cada turno como conversación aislada provoca pérdida de continuidad.

---

## Decisión de turno

### Definición

La decisión de turno es la compuerta conceptual que decide qué ruta domina para el mensaje actual.

Responde preguntas como:

```text
¿Qué quiso hacer el huésped?
¿Qué estado previo importa?
¿Qué señal domina?
Qué ruta debe ganar?
Qué ruta debe bloquearse?
Hay fallback permitido?
Hay acción sensible?
```

### Uso correcto

```text
El bug pertenece a decisión de turno si la ruta elegida es incorrecta.
```

### Riesgo

No confundir decisión de turno con ejecución del dominio.

```text
Decidir create
no es lo mismo que
crear una reserva.
```

---

## Corredor

### Definición

Un corredor es una ruta operacional dentro del runtime.

Representa una familia de comportamiento que puede procesar un turno.

Ejemplos:

```text
reservation.create
reservation.modify
reservation.cancel
reservation.snapshot
availability inquiry
FAQ / Policies / Amenities
Billing / Support
Graph / Classifier / Policy
Fallback local
```

### Uso correcto

```text
El fix impacta el corredor reservation.create.
```

### Riesgo

Un corredor conceptual no necesariamente existe como archivo, función o módulo físico.

---

## Dominio

### Definición

Un dominio es una familia funcional o de negocio.

Ejemplos:

```text
Reservation
Billing
Support
Amenities
Policies
Availability
```

### Diferencia con corredor

Un dominio agrupa intención o negocio.  
Un corredor representa una ruta operacional.

Ejemplo:

```text
Dominio:
Reservation

Corredores dentro del dominio:
- Create
- Modify
- Cancel
- Snapshot
```

### Riesgo

No tratar `Reservation` como si fuera siempre `Create`.

---

## Caja

### Definición

Una caja es una unidad conceptual del mapa.

Puede representar:

```text
runtime
sub-runtime
etapa
compuerta
corredor
frontera de salida
dominio
fallback
```

### Uso correcto

```text
Impact boxes:
- runtime.messageHandler.bodyLLM.turnDecision
- runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
```

### Riesgo

Una caja no implica automáticamente un módulo físico.

---

## box_id

### Definición

`box_id` es el identificador estable de una caja conceptual.

Ejemplo:

```text
runtime.messageHandler.bodyLLM.operationalCorridors.reservation.create
```

### Uso correcto

Los agentes deberían usar `box_id` para declarar alcance.

Ejemplo:

```text
runtime_boxes_impacted:
- runtime.messageHandler.bodyLLM.turnDecision
```

### Regla

```text
box_id = estable
code_refs = recalculables
```

---

## code_refs

### Definición

`code_refs` son referencias aproximadas o exactas a código real.

Ejemplo:

```yaml
code_refs:
  - file: lib/handlers/messageHandler.ts
    range: L4861-L11313
    confidence: high
```

### Uso correcto

Sirven para ubicar la zona de código relacionada con una caja.

### Riesgo

Las líneas cambian cuando el archivo cambia.

Por eso:

```text
Nunca tratar un rango viejo como verdad canónica sin refrescar evidencia.
```

---

## Confianza de rango

### Definición

Nivel de confiabilidad de un rango asociado a una caja.

Valores:

```text
high
medium
low
needs_refresh
```

### high

Rango detectado por firma clara de función o evidencia fuerte.

Ejemplo:

```text
bodyLLM: L4861-L11313
```

### medium

Rango inferido por densidad de markers y coherencia conceptual.

Ejemplo:

```text
Create / availability / quote / proposal: L6314-L6813
```

### low

Rango probable pero mezclado con otras responsabilidades.

Ejemplo:

```text
Late temporal repair / final create cleanup: L8564-L9367
```

### needs_refresh

Rango que debe recalcularse porque el archivo cambió o la evidencia quedó vieja.

---

## Compuerta

### Definición

Una compuerta es una condición que permite, bloquea o redirige una ruta.

Ejemplos:

```text
confirmación explícita
target existente
domain lock
quote gating
confirmation gating
fallback permitido
```

### Uso correcto

```text
El fix toca la compuerta de quote gating.
```

### Riesgo

Una compuerta demasiado amplia captura turnos incorrectos.  
Una compuerta demasiado estrecha deja pasar rutas inseguras.

---

## Precedencia

### Definición

Precedencia es el orden de prioridad entre señales o rutas.

Ejemplo:

```text
Si hay cancelación pendiente,
un “sí” puede significar confirmar cancelación.

Si hay proposal activa,
un “sí” puede significar aceptar propuesta.

Si no hay target,
un “sí” no debería ejecutar acción sensible.
```

### Uso correcto

```text
El bug es de precedencia si la ruta equivocada gana.
```

### Riesgo

Cambiar el orden de evaluación puede producir regresiones invisibles para tests existentes.

---

## Arbitraje

### Definición

Arbitraje es el proceso de decidir qué señal gana cuando varias señales compiten.

Ejemplo:

```text
Mensaje:
sí

Señales posibles:
- confirmar propuesta
- confirmar cancelación
- aceptar disponibilidad
- continuar modificación
- respuesta genérica
```

El arbitraje decide cuál corresponde según estado.

---

## Señal

### Definición

Una señal es un indicio usado por el runtime para decidir.

Ejemplos:

```text
texto actual
intent estructurado
fecha detectada
roomType detectado
conversationFocus
lastProposal
pendingCancellation
selectedReservationTarget
classifier result
graph result
```

### Riesgo

Una señal no es una decisión.

---

## Estado conversacional

### Definición

Estado persistido o reconstruido que permite continuidad entre turnos.

Ejemplos:

```text
reservationSlots
conversationFocus
lastProposal
lastReservation
pendingCancellation
modifyState
selectedReservationTarget
history
```

### Riesgo

Ignorar estado produce respuestas sin continuidad.  
Sobrescribir estado incorrectamente produce regresiones cruzadas.

---

## Slot

### Definición

Dato parcial o completo necesario para una operación.

Ejemplos en reserva:

```text
guestName
roomType
checkIn
checkOut
numGuests
```

### Riesgo

No todo dato detectado debe convertirse automáticamente en slot.

---

## Slot seguro

### Definición

Un slot seguro es un dato que puede preservarse aunque otro dato del mismo turno sea inválido.

Ejemplo:

```text
Turno:
check out 25/5/2026, 2 personas

Si checkOut es inválido,
numGuests = 2 puede seguir siendo seguro.
```

### Riesgo

Descartar slots válidos porque otro slot falló genera mala UX.  
Preservar slots inseguros genera estado contaminado.

---

## Reparación temporal

### Definición

Proceso por el cual el runtime detecta, rechaza o corrige fechas inválidas, incompletas o inconsistentes.

Ejemplos:

```text
checkIn pasado
checkOut anterior a checkIn
rango inválido
fecha relativa mal resuelta
fin de semana relativo
```

### Riesgo

Aplicar reparación temporal al slot equivocado.

Ejemplo:

```text
checkOut explícito malinterpretado como checkIn.
```

---

## Atribución de slot

### Definición

Proceso de decidir a qué slot pertenece un dato detectado.

Ejemplo:

```text
"check out 25/5/2026"
```

La fecha debe atribuirse a:

```text
checkOut
```

no a:

```text
checkIn
```

### Riesgo

Una fecha correcta puede producir un resultado incorrecto si se atribuye al slot equivocado.

---

## Target

### Definición

Entidad concreta sobre la cual opera una acción.

Ejemplos:

```text
reserva seleccionada
propuesta activa
cancelación pendiente
modificación activa
```

### Riesgo

Modificar o cancelar sin target suficiente.

---

## Reference resolution

### Definición

Proceso de resolver a qué entidad se refiere el huésped.

Ejemplos:

```text
esa reserva
la de Ana
la segunda
la del viernes
```

### Riesgo

Elegir la reserva equivocada o no pedir desambiguación.

---

## Domain lock

### Definición

Mecanismo conceptual que mantiene el foco en un dominio activo cuando corresponde.

Ejemplo:

```text
El huésped está creando una reserva.
Pregunta por desayuno.
El sistema responde desayuno,
pero conserva el foco de reserva.
```

### Riesgo

Un domain lock demasiado fuerte captura preguntas laterales.  
Un domain lock débil pierde continuidad.

---

## Fallback

### Definición

Ruta segura usada cuando ninguna ruta principal domina.

### Uso correcto

Fallback debe responder sin ejecutar acciones sensibles.

### Riesgo

Fallback no debe:

```text
confirmar reservas
cancelar reservas
modificar reservas
inventar disponibilidad
romper estado activo
```

---

## Guard

### Definición

Condición protectora que impide una acción insegura.

Ejemplos:

```text
no confirmAndCreate sin proposal válida
no cancelReservation sin target
no quote con fechas inválidas
no modify sin reserva seleccionada
```

### Riesgo

Un guard faltante permite acciones incorrectas.  
Un guard excesivo bloquea flujos válidos.

---

## Early return

### Definición

Salida anticipada del flujo.

### Uso correcto

Puede ser útil para resolver un caso claro.

### Riesgo

Un early return puede impedir que otras compuertas importantes se ejecuten.

---

## Quote gating

### Definición

Compuerta que decide si ya se puede cotizar una reserva.

Requiere coherencia suficiente:

```text
roomType
checkIn
checkOut
numGuests
disponibilidad
```

### Riesgo

Cotizar con rango inválido o slots mal atribuidos.

---

## Proposal

### Definición

Oferta concreta presentada al huésped antes de confirmar una reserva.

Puede incluir:

```text
tipo de habitación
fechas
noches
precio por noche
total
código de propuesta o estado interno
```

### Riesgo

Confirmar una reserva sin proposal vigente.

---

## Confirmation gating

### Definición

Compuerta que decide si una confirmación del huésped puede ejecutar una acción.

Ejemplos:

```text
CONFIRMAR
sí
ok
dale
```

### Riesgo

Una confirmación genérica solo es válida si existe algo concreto para confirmar.

---

## Resultado bodyLLM

### Definición

Frontera conceptual de salida de `bodyLLM`.

Puede incluir:

```text
ruta elegida
estado preservado
estado actualizado
respuesta candidata
acción bloqueada
acción permitida
necesidad de supervisión
```

### Riesgo

Si no se distingue resultado de ejecución, se mezclan decisión, efecto y respuesta.

---

## Persistencia + reply

### Definición

Frontera conceptual donde el sistema preserva estado y prepara respuesta observable.

### Riesgo

Una respuesta puede parecer correcta pero persistir estado incorrecto.  
O el estado puede ser correcto pero la respuesta observable pertenecer al corredor equivocado.

---

## Test de paridad

### Definición

Test que congela comportamiento observable antes o durante un fix para evitar regresiones.

### Uso correcto

Debe verificar:

```text
respuesta observable
estado preservado
estado actualizado
acción no ejecutada
acción ejecutada si corresponde
ruta no contaminada
```

### Riesgo

Una suite verde sin test de paridad puede dejar bugs manuales vivos.

---

## Caja prohibida

### Definición

Caja que un hito declara fuera de alcance.

Ejemplo:

```yaml
runtime_boxes_forbidden:
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.cancel
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.snapshot
```

### Uso correcto

Sirve para que el agente técnico no toque zonas no relacionadas.

### Riesgo

Si el fix toca una caja prohibida, Guardian debería marcarlo.

---

## Caja relacionada

### Definición

Caja que no es el objetivo principal pero puede compartir lógica o riesgo.

Ejemplo:

```yaml
runtime_boxes_related:
  - runtime.messageHandler.bodyLLM.operationalCorridors.reservation.modify
  - runtime.messageHandler.bodyLLM.operationalCorridors.availabilityInquiry
```

### Uso correcto

Sirve para revisar regresión cruzada sin ampliar innecesariamente el fix.

---

## Hito con cajas

### Definición

Hito técnico que declara alcance usando Runtime Map.

Debe incluir, cuando aplique:

```text
runtime_boxes_impacted
runtime_boxes_related
runtime_boxes_forbidden
risk_tags
code_refs
parity_tests_required
expected_agent_report
```

### Riesgo

Un hito sin cajas puede volver a pedir “corregir messageHandler.ts” de forma demasiado amplia.

---

## Informe técnico con cajas

### Definición

Salida esperada del agente técnico después de implementar un fix.

Debe incluir:

```text
cajas tocadas
cajas relacionadas revisadas
cajas prohibidas respetadas
riesgos
tests agregados
diff
ready_for_guardian
```

### Riesgo

Un informe sin cajas impide auditar alcance real.

---

## Reglas finales

```text
1. Todo bug de runtime debe ubicarse primero en cajas conceptuales.

2. Todo fix de runtime debe declarar cajas impactadas.

3. Todo fix sensible debe declarar cajas prohibidas.

4. Todo cambio en bodyLLM debe considerar precedencia.

5. Todo cambio temporal debe considerar create, modify y availability.

6. Todo cambio transaccional debe tener test de paridad.

7. box_id es estable.

8. code_refs son recalculables.

9. Identificar cajas no significa extraer cajas.

10. El mapa no reemplaza tests.
```
