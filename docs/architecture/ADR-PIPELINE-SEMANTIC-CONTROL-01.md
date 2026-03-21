# ADR — Pipeline Semantic Control

## Estado

Aprobado como decisión arquitectónica de la serie:

`PIPELINE-STABLE-INTENTS`

Hitos:

- `HITO-PIPELINE-STABLE-INTENTS-01`
- `HITO-PIPELINE-STABLE-INTENTS-02`

Nombre:

`ADR-PIPELINE-SEMANTIC-CONTROL-01`

## Decisión

Se introduce una capa explícita de control semántico en el pipeline
conversacional:

`stable_intents_guard`

Esta capa se ejecuta antes de:

- evaluación de `conv_state`
- heurísticas de routing general
- clasificación probabilística con LLM
- graph/orchestración

Su responsabilidad es resolver de forma determinista intents estables, de alta
frecuencia y baja ambigüedad.

## Contexto

El pipeline conversacional de Begasist evolucionó sobre un runtime operativo
centrado en `messageHandler`.

Ese runtime consolidó compatibilidad operativa, pero también fue incorporando
decisiones apoyadas en:

- interpretación probabilística
- contexto conversacional persistido
- heurísticas locales distribuidas

En ese contexto se observaron problemas concretos:

- consultas FAQ simples podían ser absorbidas por contexto transaccional previo
- variantes con typo, como `check iin`, perdían rutas estables
- dominios semánticamente estables seguían dependiendo innecesariamente del LLM
- el comportamiento variaba entre conversaciones con y sin contexto persistido

La auditoría del pipeline mostró que el sistema es híbrido, con heurísticas
relevantes pero con dependencia estructural del LLM en clasificación y
resolución de ciertos caminos informativos.

## Problema arquitectónico

No existía una frontera explícita entre:

- consultas factuales simples
- follow-ups transaccionales o conversacionales

Como resultado, intents informativos estables podían:

- competir con el estado conversacional
- caer en rutas de reserva o modificación
- requerir LLM para casos que no lo justificaban

## Decisión recomendada

- introducir `stable_intents_guard` como capa previa del pipeline
- limitar esa capa a intents estables, de bajo riesgo semántico
- responder de forma determinista con datos de configuración
- impedir que esos intents dependan del estado conversacional para su
  clasificación

## Diseño

### Orden de ejecución

Antes:

```text
User Input
↓
messageHandler
↓
LLM / Graph
↓
Respuesta
```

Ahora:

```text
User Input
↓
Normalization
↓
stable_intents_guard
↓ (si no hay match)
messageHandler
↓
LLM / Graph
↓
Respuesta
```

### Principios

#### 1. Separación de dominios

- FAQ estables: resolución determinista
- flujos transaccionales: estado conversacional + heurísticas + LLM

#### 2. Precedencia explícita

Los stable intents tienen prioridad sobre:

- `conv_state`
- contexto de reserva
- heurísticas generales del pipeline
- clasificación LLM

#### 3. Matching conservador

El guard sólo captura intents:

- frecuentes
- poco ambiguos
- con respuesta estable
- no dependientes de razonamiento contextual

#### 4. Respuesta determinista

La respuesta debe construirse a partir de fuentes configuradas del sistema,
principalmente `hotelConfig`, sin depender de LLM, embeddings ni retrieval.

## Alcance actual

Stable intents activos:

- `faq_check_in_time`
- `faq_check_out_time`
- `faq_breakfast_hours`
- `faq_wifi`
- `faq_parking`

## Criterios de inclusión

Un intent puede entrar en `stable_intents_guard` sólo si cumple todo lo
siguiente:

- alta frecuencia operativa
- baja ambigüedad semántica
- respuesta estable en el tiempo
- independencia respecto a `conv_state`
- posibilidad de respuesta determinista

## Criterios de exclusión

No deben entrar en esta capa:

- reservas
- modificaciones
- cancelaciones
- requests enriquecidos o compuestos
- consultas con negociación implícita
- consultas que requieran razonamiento o composición contextual

## Ejemplos

### Casos que sí deben capturarse

- `a que hora es el check in`
- `wifi?`
- `hay parking?`
- `desayuno?`

### Casos que no deben capturarse

- `quiero reservar con parking`
- `necesito wifi para trabajar`
- `quiero desayuno incluido en la reserva`

## Razón

La decisión busca reducir la carga semántica sobre el pipeline general en un
subconjunto de consultas cuyo valor operativo depende más de estabilidad que de
flexibilidad.

Para ese subconjunto:

- el LLM no agrega valor proporcional al costo y la variabilidad que introduce
- el estado conversacional no debe alterar la clasificación
- una respuesta determinista mejora predictibilidad, UX y auditabilidad

## Consecuencias

### Positivas

- mayor estabilidad para FAQ críticas
- menor dependencia del LLM en dominios estables
- menor riesgo de secuestro por contexto conversacional
- mejor base para SLA, costos y telemetría de routing
- explicitación de una frontera semántica antes ausente

### Negativas

- duplicación parcial de lógica semántica respecto al pipeline general
- necesidad de gobernar el catálogo de intents estables
- riesgo de crecimiento descontrolado si no se mantiene criterio de inclusión
- posible tentación de mezclar esta capa con lógica KB o transaccional

## Riesgos

### 1. Sobrecaptura

Un patrón demasiado amplio puede interceptar mensajes que deberían seguir por
el pipeline normal.

### 2. Crecimiento sin control

Si el guard se expande sin reglas explícitas, puede transformarse en un router
paralelo difícil de gobernar.

### 3. Mezcla de responsabilidades

Si incorpora lógica de KB, reservas o reasoning, pierde su objetivo original y
reintroduce acoplamiento.

### 4. Pérdida de granularidad

Una capa excesivamente simplificada puede responder de forma correcta pero
demasiado rígida para algunos matices del usuario.

## Decisiones explícitas

- no usar LLM para detectar stable intents
- no usar embeddings en esta capa
- no integrar esta capa con KB/retrieval
- no expandir el catálogo sin criterios explícitos
- no reemplazar `messageHandler`
- no migrar el runtime operativo a `mhFlowGraph`

## Reglas de uso

`stable_intents_guard` debe usarse para:

- capturar consultas simples y estables antes del runtime conversacional
- devolver respuestas deterministas y auditables
- proteger el pipeline principal de desvíos evitables

`stable_intents_guard` no debe usarse para:

- modelar conversaciones
- conservar estado
- resolver intención transaccional
- hacer interpretación abierta del mensaje

## Relación con la arquitectura vigente

Esta ADR no cambia el runtime target del sistema.

Se mantiene vigente que:

- `messageHandler` es el runtime principal
- `mhFlowGraph` no es runtime operativo principal
- la evolución debe ser incremental y compatible

`stable_intents_guard` se incorpora como capa de borde semántico, no como
reemplazo del coordinador conversacional.

## Futuro

Líneas de evolución compatibles con esta decisión:

- gobernanza explícita del catálogo de stable intents
- extracción a una capa dedicada, por ejemplo `/semantic/`
- telemetría de routing por tipo de guard
- internacionalización controlada de patrones y respuestas

## Cierre

La decisión arquitectónica vigente es introducir control semántico explícito en
el pipeline conversacional mediante `stable_intents_guard`.

Su propósito es resolver de forma determinista intents FAQ estables antes de
que intervengan el estado conversacional, las heurísticas generales o el LLM.

Esta capa existe para proteger estabilidad, auditabilidad y previsibilidad.

No existe para reemplazar el runtime principal ni para capturar lógica
transaccional.
