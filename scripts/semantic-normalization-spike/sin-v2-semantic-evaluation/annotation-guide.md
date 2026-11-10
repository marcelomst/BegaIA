<!-- Path: scripts/semantic-normalization-spike/sin-v2-semantic-evaluation/annotation-guide.md -->

# SIN V2 — Human Annotation Guide

**Hito:** `SPIKE-SIN-V2-SEMANTIC-EVALUATION-PROTOCOL-15`
**Versión:** R3
**Estado:** materialización documental pendiente de revisión AGPT

## 1. Principio

La referencia humana establece qué comunica el huésped, no qué debe ejecutar BegaIA.

Debe distinguir:

- Contenido lingüístico representable por SIN V2.
- Observaciones semánticas humanas externas al contrato.
- Ambigüedades legítimas.
- Contenido no representable sin ampliar SIN V2.

No se utilizará la salida de un modelo como autoridad para determinar la referencia correcta.

## 2. Material del anotador

Cada anotador recibirá:

- ID del caso.
- Mensaje actual.
- Contexto expresamente autorizado.
- Guía de anotación vigente.
- Definiciones canónicas de SIN V2.

No recibirá las anotaciones del otro revisor ni respuestas de los modelos evaluados.

La evidencia literal exigida por SIN V2 deberá corresponder al mensaje actual, aunque el contexto pueda fundamentar una dependencia.

## 3. Contrato normativo y metadatos externos

Los campos normativos de la salida SIN V2 vigente son:

| Campo de salida | Tipo o valor exacto |
| --------------- | ------------------- |
| `schema` | literal `sin-v2-experimental` |
| `message` | `string` |
| `status` | `complete \| partial \| abstained` |
| `units` | arreglo de unidades SIN V2 |
| `globalUncertainty` | arreglo opcional de strings no vacíos; no admite `null` |

Cada unidad contiene exactamente:

- `id`: string no vacío.
- `status`: `interpreted | partial | abstained`.
- `act`: uno de los nueve actos de la sección 4.
- `predicate`: string no vacío o `null`.
- `polarity`: `positive | negative | neutral`.
- `referent`: objeto estricto con `surface` string no vacío o `null`, y `resolution` igual a `explicit | ambiguous | absent`.
- `relations`: arreglo de relaciones.
- `dependencies`: arreglo de dependencias.
- `evidence`: arreglo de evidencias.
- `uncertainty`: arreglo de incertidumbres localizadas.

Los tipos cerrados auxiliares son:

| Estructura | Campos y valores exactos |
| ---------- | ------------------------ |
| Relación | `type: excepts \| corrects \| restricts \| qualifies \| contradicts`; `targetUnitId: string`; `scopeSurface?: string`; `evidence: string` |
| Dependencia | `kind: antecedent \| prior_turn \| prior_state`; `evidence: string` |
| Evidencia | `field: act \| predicate \| polarity \| referent \| relation \| dependency`; `span: string` |
| Incertidumbre | `field: act \| predicate \| polarity \| referent \| relation \| dependency \| unit`; `reason: string` |

Todos los strings que el contrato califica como no vacíos se validan después de `trim`. Los objetos son estrictos: la guía no autoriza campos normativos adicionales.

La referencia humana puede registrar por fuera de SIN V2 metadatos de evaluación como criticidad, familia, equivalencias, alcance de negación, alternativa de segmentación, campos aplicables o limitaciones representacionales. Esos metadatos humanos no son campos del contrato ni pueden introducirse en la salida SIN V2.

En particular, SIN V2 rechaza campos de autorización, decisión, efecto, target, estado de runtime o confianza incluidos en la lista canónica `FORBIDDEN_KEYS`.

## 4. Actos comunicativos

El contrato admite exactamente nueve actos:

| Acto        | Criterio semántico de anotación            | Regla de predicado |
| ----------- | ------------------------------------------ | ------------------ |
| `instruct`  | Expresa una instrucción o pedido de acción | Literal requerido  |
| `ask`       | Solicita información                       | Literal requerido  |
| `affirm`    | Afirma o acepta contenido anterior         | Puede ser `null`   |
| `reject`    | Rechaza una propuesta o contenido          | Puede ser `null`   |
| `correct`   | Corrige contenido anterior                 | Puede ser `null`   |
| `retract`   | Retira contenido o una solicitud anterior  | Puede ser `null`   |
| `qualify`   | Matiza o restringe contenido               | Literal requerido  |
| `inform`    | Comunica información                       | Literal requerido  |
| `discourse` | Cumple una función discursiva              | Puede ser `null`   |

Estas descripciones orientan la decisión humana; no sustituyen el contrato ni convierten actos comunicativos en autorizaciones operativas.

### Contrastes ilustrativos

«¿Puedo cancelar mi reserva?» comunica una consulta.

«Cancelá mi reserva» comunica una instrucción.

«Retiro mi pedido de cancelación» comunica una retractación.

«¿Me contás qué opciones hay?» comunica una solicitud de información; el referente de «opciones» puede depender de contexto.

Ninguno de estos ejemplos, por sí solo, autoriza operaciones sobre reservas.

## 5. Predicados, polaridad y evidencia

### 5.1 Predicado literal

`instruct`, `ask`, `qualify` e `inform` requieren un predicado string no vacío que aparezca literalmente en `message` y una entrada `evidence` con `field: predicate` y un `span` exactamente igual al predicado.

`affirm`, `reject`, `correct`, `retract` y `discourse` pueden usar un predicado literal o `null`. Cuando `predicate` es `null`, el validador exige:

- `polarity: neutral`.
- Al menos una evidencia con `field: act`.

La admisibilidad estructural de `null` no significa que omitir un predicado sea siempre semánticamente correcto.

### 5.2 Polaridad

La polaridad se anota con uno de los tres valores exactos: `positive`, `negative` o `neutral`.

Una polaridad `negative` requiere evidencia literal declarada con `field: polarity`. El validador no impone una evidencia específica adicional para polaridad `positive` o `neutral`; el anotador igualmente debe elegir el valor que corresponda al significado.

El alcance semántico detallado de una negación podrá registrarse como metadato humano externo cuando no esté representado directamente por los campos existentes.

Ejemplo ilustrativo: «No quiero cancelar; prefiero cambiar la fecha» debe conservar la diferencia entre el contenido negado y la preferencia expresada.

### 5.3 Evidencia literal y pertinencia

La anotación distinguirá dos comprobaciones:

**Literalidad:** el fragmento exigido aparece en el mensaje actual conforme al contrato.

**Pertinencia:** ese fragmento sustenta realmente la interpretación anotada.

Todos los `span` de `evidence` deben aparecer literalmente en `message`. Además:

- Un predicado no nulo requiere evidencia `predicate` con el mismo span.
- Una superficie de referente no nula requiere evidencia `referent` con el mismo span.
- La evidencia de una relación debe ser literal y repetirse en `evidence[]` con `field: relation`.
- `scopeSurface`, si existe, debe ser literal.
- La evidencia de una dependencia debe ser literal.

La literalidad puede verificarse automáticamente. La pertinencia semántica exige referencia humana. No se admitirá una palabra literal como justificación suficiente de un acto, una polaridad o una relación incorrectos.

## 6. Referentes y dependencias

En `referent`, `resolution: absent` se usa si y solo si `surface` es `null`. Una resolución `explicit` o `ambiguous` requiere una superficie no nula y literal, respaldada por evidencia de referente.

Las dependencias pueden expresar vínculos con:

- `antecedent`.
- `prior_turn`.
- `prior_state`.

La anotación distinguirá semánticamente:

1. Referente explícito.
2. Referente contextual.
3. Referente ambiguo.
4. Referente ausente o no expresado.
5. Resolución operativa fuera de SIN V2.

Un referente con `resolution: ambiguous` debe incluir incertidumbre localizada con `field: referent`. Su superficie y evidencia literal identifican la expresión ambigua; el `reason` de incertidumbre documenta por qué no puede resolverse con el contexto permitido y no necesita ser un span literal.

No se exigirá a SIN V2 identificar una reserva concreta si esa capacidad corresponde a otra capa. La exactitud semántica se evaluará hasta donde el contrato permite expresarla; las limitaciones se registrarán como metadatos externos.

## 7. Relaciones entre unidades

Para evaluar relaciones deberá anotarse:

- Tipo admitido por el contrato.
- Unidad origen.
- Unidad destino.
- Evidencia y contenido justificativos.
- Alcance representable.

Los identificadores internos solo sirven para vincular unidades dentro de una representación concreta. Toda relación debe apuntar a otra unidad existente, no puede referirse a sí misma y el grafo de relaciones no puede formar ciclos.

Al comparar referencia y salida, el destino de `targetUnitId` se interpretará a través de unidades previamente emparejadas. Dos relaciones equivalentes no serán consideradas diferentes solo por utilizar IDs distintos.

Si el destino no puede emparejarse, se registrará la discrepancia y se aplicarán las reglas de puntuación del protocolo.

## 8. Correcciones y retractaciones

El anotador distinguirá:

- Corrección: sustitución o rectificación de contenido previo.
- Retractación: retiro de contenido, solicitud o posición anterior.

Ejemplos ilustrativos:

«El viernes, perdón, el sábado».

«Retiro el pedido de cancelación».

La referencia deberá reflejar aquello que se corrige o retira, dentro de las relaciones que SIN V2 puede representar.

No se deducirán efectos de dominio ni cambios de estado hotelero.

## 9. Estados, incertidumbre y abstención

### 9.1 Reglas estructurales vigentes

- Una unidad `partial` o `abstained` debe declarar al menos una incertidumbre localizada.
- Una unidad con referente `ambiguous` debe declarar incertidumbre con `field: referent`.
- Un estado global `complete` exige que todas las unidades sean `interpreted`.
- Un estado global `abstained` no admite unidades `interpreted`.
- `units: []` solo es válido con estado global `abstained`.
- `globalUncertainty` es opcional; si está presente es un arreglo de strings no vacíos y no admite `null`.

No se agregan restricciones estructurales distintas de las anteriores y de los esquemas canónicos.

### 9.2 Criterios semánticos de anotación

Los estados se eligen por significado, además de cumplir la estructura:

- `interpreted`: el contenido de la unidad está suficientemente determinado por el mensaje y el contexto permitido.
- `partial`: existe un núcleo comunicativo sustentado, pero una parte aplicable permanece genuinamente incierta y debe localizarse.
- `abstained`: no existe sustento suficiente para fijar la interpretación aplicable de esa unidad; la razón debe localizarse sin inventar contenido.

Estos criterios no cambian tipos, nulabilidad ni condiciones del validador. Una unidad estructuralmente válida puede seguir siendo semánticamente incorrecta, y una incertidumbre formalmente válida puede ser injustificada.

### 9.3 Abstención global correcta

Si el mensaje no permite una interpretación suficientemente sustentada y la referencia aprobada exige abstención global, una salida válida con `units: []` podrá ser correcta.

No se contabilizarán unidades inexistentes en esa alternativa como omisiones.

### 9.4 Abstención global incorrecta

Si existen unidades interpretables que deberían representarse, abstenerse globalmente sin justificación constituye abstención excesiva y fallo de cobertura.

### 9.5 Abstención parcial

Cuando una parte del mensaje admite interpretación y otra no, se anotará por separado:

- Contenido interpretable.
- Contenido incierto.
- Evidencia.
- Tratamiento permitido por SIN V2.
- Información no representable.

No se exigirá forzar una interpretación para evitar una abstención.

Una respuesta técnica ausente o inválida no equivale a abstención legítima.

## 10. Correspondencia comunicativa y corrección semántica

La correspondencia entre una unidad esperada y una observada se decide por núcleo comunicativo y evidencia pertinente. Sirve para ubicar qué contenido intentó representar la salida.

La corrección semántica se decide después, campo por campo. Una pareja puede corresponder comunicativamente y, al mismo tiempo, tener `act`, predicado, polaridad, referente, relación, dependencia o incertidumbre incorrectos.

No se exigirá coincidencia de los campos evaluados para reconocer la correspondencia, ni se usará una discrepancia de campo para convertir artificialmente una unidad en omisión más adición.

## 11. Segmentación y alternativas adjudicadas

La segmentación debe conservar el contenido comunicativo y las relaciones relevantes.

Podrán existir alternativas legítimas, por ejemplo una representación con una unidad compuesta frente a otra con dos unidades relacionadas, únicamente cuando ambas sean compatibles con SIN V2 y preserven el significado.

Cada alternativa deberá ser una referencia completa, identificada, adjudicada y congelada antes de observar respuestas. No se mezclarán unidades de alternativas distintas ni se fusionarán o dividirán unidades retrospectivamente para mejorar una puntuación.

La equivalencia de una alternativa debe considerar:

- Actos y contenido comunicativo.
- Predicados pertinentes.
- Polaridad y alcance.
- Referentes.
- Relaciones y dependencias.
- Incertidumbre necesaria.
- Evidencia válida.

No se considerarán equivalentes interpretaciones contradictorias, aunque ambas sean estructuralmente válidas.

## 12. Omisiones y adiciones

Para las métricas semánticas ordinarias, una omisión es contenido esperado que no se representa según la alternativa seleccionada.

Una adición es contenido producido sin justificación en el mensaje y contexto autorizados.

La clasificación deberá distinguir errores ordinarios y errores potencialmente críticos.

Una abstención global correcta, anotada como tal, no produce automáticamente omisiones de unidades. Esta selección ordinaria no limita la revisión de criticidad, que considera todas las alternativas congeladas.

## 13. Clasificación contextual de criticidad

Las categorías iniciales son:

- Negación invertida.
- Consulta confundida con instrucción.
- Referente operativo equivocado.
- Corrección ignorada.
- Retractación ignorada.
- Certeza injustificada.
- Autorización inferida.
- Omisión o adición material.

La criticidad se adjudica por la consecuencia operacional potencial de la discrepancia en el contexto permitido del caso, no solo por la categoría o por el campo afectado.

La salida se revisará frente a todas las alternativas humanas completas, adjudicadas y congeladas. La alternativa seleccionada por el vector lexicográfico gobierna las métricas semánticas ordinarias, pero no es la única fuente para calcular criticidad.

Se usarán estas etiquetas de evaluación externas a SIN V2:

- `CRITICAL_CONFIRMED`: la discrepancia tiene riesgo operacional potencial adjudicado y ninguna interpretación humana admisible la justifica.
- `CRITICAL_DISAGREEMENT`: algunas alternativas presentan criticidad y otras no, o no puede resolverse si una alternativa legítima justifica la salida.
- `NO_CRITICAL_OBSERVED`: luego de revisar todas las alternativas relevantes no se observa una discrepancia crítica y la salida es inspeccionable para esa determinación.

Estas etiquetas son metadatos del protocolo experimental, no campos ni valores del contrato SIN V2.

La adjudicación documentará:

- Fragmento textual.
- Contexto permitido.
- Interpretación humana.
- Salida observada.
- Discrepancia.
- Consecuencia operacional potencial.
- Nivel de evidencia.
- Decisión y fundamento.

Cuando las alternativas difieran sobre criticidad:

1. Registrar `CRITICAL_DISAGREEMENT` y conservar la clasificación y evidencia de cada alternativa.
2. Realizar una revisión humana documentada sin usar la identidad del modelo como criterio.
3. Si una alternativa legítima explica completamente la salida sin error crítico, registrar esa interpretación, la discrepancia entre alternativas y la resolución; no declarar automáticamente error crítico.
4. Si ninguna alternativa admisible justifica la discrepancia con riesgo adjudicado, registrar `CRITICAL_CONFIRMED`.
5. Si no es posible resolverla, mantener `CRITICAL_DISAGREEMENT` y considerar la dimensión crítica `INDETERMINATE`.

Una discrepancia respecto de una alternativa no seleccionada no es crítica por sí sola. La revisión no podrá modificar el gold congelado, añadir alternativas retrospectivamente ni fusionar fragmentos de alternativas existentes.

Una criticidad no observable no será clasificada como ausencia de error crítico. La investigación no registra ejecuciones operativas reales.

## 14. Proceso humano

### Anotación independiente

Dos personas anotan cada caso sin ver las respuestas del modelo ni las anotaciones de la otra.

### Comparación

Se registrarán acuerdos, desacuerdos y denominadores por dimensión.

Las medidas estadísticas de acuerdo se interpretarán considerando el tamaño de muestra y la frecuencia de cada categoría.

### Adjudicación

Preferentemente, un tercer revisor decidirá las discrepancias y documentará su fundamento.

La adjudicación crítica deberá preservar las evaluaciones de todas las alternativas, la etiqueta inicial, la evidencia revisada, la decisión final y su fundamento. Resolver una discrepancia crítica no autoriza reanotar el gold de la ejecución sellada.

Con dos revisores se podrá proponer adjudicación conjunta, pero requiere aceptación expresa de AGPT y registro de la limitación.

Con un solo revisor no se podrán declarar referencias independientemente revisadas.

La IA no se considerará anotador humano independiente.

## 15. Casos indeterminados

Si una discrepancia no puede adjudicarse:

- Se conservarán las anotaciones originales.
- Se documentará la razón.
- Se marcará como `INDETERMINATE`.
- No se inventará un gold.
- Se decidirá su tratamiento antes del congelamiento de la reserva.

No se eliminarán silenciosamente casos difíciles.

## 16. Custodia y cegamiento

Las referencias reservadas estarán bajo control del custodio.

No se entregarán al operador antes del sellado de las respuestas crudas originales.

La secuencia será:

1. Anotación independiente y adjudicación.
2. Congelamiento de referencias y alternativas completas.
3. Ejecución autorizada con inputs sin gold.
4. Preservación y hash de solicitudes y respuestas crudas.
5. Sellado y verificación de las capturas.
6. Apertura controlada de referencias.
7. Scoring y revisión de discrepancias.
8. Conservación del informe y de las decisiones.

Una exposición prematura se registrará como incidencia de integridad. La reserva expuesta no recupera su carácter ciego por volver a ocultarse.

## 17. Condición de utilización

Antes de crear el conjunto gold, esta guía deberá superar revisión de correspondencia exacta con `contract.ts`, `validator.ts`, `protocol.md` e `instrument-spec.md`.

La materialización documental no significa que existan anotadores disponibles, referencias adjudicadas o instrumentos ejecutables; tampoco declara cerrado el hito ni acredita Gate A PASS.
