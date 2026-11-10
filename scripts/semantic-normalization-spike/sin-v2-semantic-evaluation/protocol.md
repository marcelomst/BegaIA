<!-- Path: scripts/semantic-normalization-spike/sin-v2-semantic-evaluation/protocol.md -->

# SIN V2 — Semantic Evaluation Protocol

**Hito:** `SPIKE-SIN-V2-SEMANTIC-EVALUATION-PROTOCOL-15`
**Versión:** R3
**Estado:** materialización documental pendiente de revisión AGPT
**Antecedente:** `SPIKE-SIN-V2-LOCAL-MODEL-EVALUATION-14` — CLOSED según cierre comunicado a AGPT.

## 1. Propósito

Definir un protocolo exploratorio, offline y reproducible para determinar si una representación SIN V2 conserva el significado de mensajes hoteleros.

Se evaluarán separadamente:

1. Validez JSON.
2. Conformidad con el esquema de la condición experimental.
3. Validez según el contrato y validador SIN V2.
4. Fidelidad semántica respecto de referencias humanas.
5. Cobertura integral.
6. Errores críticos y suficiencia de evidencia.

Una representación formalmente válida no se presume semánticamente correcta.

## 2. Hipótesis

**H1:** un modelo de alta capacidad puede generar representaciones SIN V2 que superen los criterios exploratorios.

**H2:** si H1 obtiene resultados satisfactorios, modelos locales progresivamente menores pueden conservar calidad suficiente con menores recursos.

**H3:** si H1 falla, deben investigarse también el protocolo, los prompts, las referencias humanas y las limitaciones de representación SIN V2.

Ninguna hipótesis se considera demostrada.

## 3. Invariantes arquitectónicas

- El contrato y el validador SIN V2 permanecen inalterados.
- No se agregan campos de autorización, decisión o ejecución a SIN V2.
- RDA no reemplaza una referencia humana de fidelidad semántica.
- `messageHandler` permanece como runtime productivo principal.
- No se introducen nuevos routers, graphs ni ejecutores operativos.
- La investigación no modifica reservas ni estado hotelero.
- Cada etapa generativa posterior requiere autorización específica.

El presente hito únicamente especifica el protocolo.

## 4. Conjunto exploratorio

Se establecen 120 casos sintéticos como objetivo inicial.

| Partición  | Total | Simples | Compuestos | Aislados | Multi-turno |
| ---------- | ----: | ------: | ---------: | -------: | ----------: |
| Desarrollo |    40 |      20 |         20 |       30 |          10 |
| Reservada  |    80 |      40 |         40 |       60 |          20 |

Un caso compuesto contiene múltiples unidades o fenómenos semánticos relevantes. Esta clasificación es independiente del número de turnos.

### 4.1 Estratos primarios

Cada caso pertenece a un estrato primario exclusivo.

| Estrato                      | Desarrollo | Reservada |
| ---------------------------- | ---------: | --------: |
| Consultas informativas       |          5 |        10 |
| Instrucciones y solicitudes  |          5 |        10 |
| Afirmaciones e información   |          5 |        10 |
| Rechazos y retractaciones    |          5 |        10 |
| Correcciones y matizaciones  |          5 |        10 |
| Negaciones y alcance         |          5 |        10 |
| Referencias y dependencias   |          5 |        10 |
| Múltiples actos o ambigüedad |          5 |        10 |

### 4.2 Cuotas transversales mínimas de la reserva

| Fenómeno                                | Mínimo |
| --------------------------------------- | -----: |
| Cada acto SIN V2                        |      8 |
| Negación y alcance                      |     15 |
| Consulta frente a instrucción           |     10 |
| Referente confundible                   |     10 |
| Corrección                              |     10 |
| Retractación                            |     10 |
| Incertidumbre o abstención justificada  |     10 |
| Oportunidad de omisión/adición material |     10 |
| Riesgo operacional potencial            |     20 |

Las etiquetas se superponen. La matriz real deberá demostrar su factibilidad semántica, no solo aritmética.

### 4.3 Separación por familias

Una **familia conversacional** es el conjunto de casos que comparten un mismo núcleo comunicativo o una transformación deliberadamente vinculada de ese núcleo. Incluye paráfrasis, variantes superficiales, cambios controlados de contexto y contrastes semánticos diseñados para distinguir actos, polaridades, referentes, correcciones, retractaciones, dependencias o alcance.

Las variantes de una familia pueden diferir justamente en el rasgo que se pretende evaluar; esa diferencia no las vuelve independientes. Cada familia completa se asignará íntegramente a desarrollo o a reserva antes de generar variantes. Ninguna familia podrá cruzar ambas particiones.

Se comprobarán duplicados exactos, normalizados, estructurales y similitudes semánticas. La revisión humana resolverá los casos dudosos.

El conjunto reservado no se utilizará para ajustar prompts, scoring ni selección de parámetros.

## 5. Referencias humanas

Cada caso reservado deberá disponer de referencias revisadas humanamente conforme a `annotation-guide.md`.

Se conservarán:

- Anotaciones independientes.
- Decisiones de adjudicación.
- Alternativas semánticas admisibles.
- Segmentaciones admisibles.
- Incertidumbre esperada.
- Campos evaluables.
- Limitaciones representacionales.
- Clasificación de riesgo.

Cada alternativa humana será una representación completa del caso, tendrá un identificador estable y quedará adjudicada y congelada antes de observar o puntuar respuestas. No se combinarán fragmentos de alternativas diferentes durante el scoring.

Una referencia puede contener más de una representación admisible si las alternativas fueron justificadas y congeladas antes de observar respuestas.

Las salidas de IA no constituyen gold humano.

## 6. Emparejamiento semántico y selección de alternativa

### 6.1 Regla general

Para cada caso se comparará la salida con cada alternativa humana completa previamente adjudicada y congelada.

Dentro de cada alternativa se utilizará correspondencia uno a uno entre unidades observadas y esperadas. Una unidad observada y una unidad esperada podrán participar, como máximo, en una pareja de esa correspondencia.

Los IDs no definen equivalencia semántica.

### 6.2 Compatibilidad de unidades

Una pareja de unidades será candidata a emparejamiento cuando comparta un núcleo comunicativo justificable y evidencia textual pertinente. La correspondencia se establece para poder observar los errores de los campos evaluados; no exige coincidencia previa de `act`, `predicate`, `polarity`, `referent`, relaciones, dependencias, incertidumbre ni de ningún otro campo cuya corrección se esté midiendo.

El emparejamiento deberá distinguir:

- Compatibilidad de contenido.
- Coincidencia o discrepancia de acto.
- Predicado.
- Polaridad.
- Referente.
- Relaciones y dependencias.
- Incertidumbre.

Una discrepancia de acto no debe ocultarse eliminando artificialmente la correspondencia entre dos unidades que expresan el mismo núcleo comunicativo.

Por ejemplo, una pregunta clasificada como `inform` debe poder identificarse como unidad correspondiente, con un error en el campo `act`, en lugar de transformarse automáticamente en una omisión más una adición.

Los casos en que no pueda establecerse una correspondencia justificable por núcleo comunicativo y evidencia se registrarán como omisiones y adiciones, o se remitirán a adjudicación humana cuando exista ambigüedad real.

### 6.3 Segmentaciones alternativas

Las diferencias de segmentación se admitirán exclusivamente mediante alternativas humanas completas registradas antes de la ejecución.

Si una alternativa contiene dos unidades y otra contiene una unidad semánticamente equivalente, cada alternativa se compara por separado.

No se aplicarán correspondencias arbitrarias muchos-a-uno o uno-a-muchos durante el scoring.

La política de selección favorable solo opera entre alternativas admisibles previamente congeladas. No autoriza crear, fusionar, dividir ni modificar alternativas después de observar una salida.

### 6.4 Selección determinista

Cada candidato de scoring —alternativa completa más correspondencia uno a uno— se ordenará mediante este vector lexicográfico, en el orden indicado:

1. Caso integral correcto: `1` antes que `0`.
2. Mayor cantidad de unidades correctamente identificadas por núcleo comunicativo y evidencia.
3. Menor cantidad de adiciones no sustentadas.
4. Mayor cantidad de campos aplicables correctos.
5. Menor cantidad de campos aplicables incorrectos.
6. Identificador estable ascendente del candidato.

Los cinco primeros componentes se comparan por preferencia; el sexto resuelve el empate por orden ascendente. El identificador estable se deriva de los IDs congelados de la alternativa y de la correspondencia, y no de la identidad del modelo ni del orden accidental de ejecución.

Para cada alternativa se conservarán el vector completo, la correspondencia uno a uno, las discrepancias, la clasificación crítica y sus puntuaciones, numeradores y denominadores. Se seleccionará exactamente un candidato por caso mediante el vector vigente, pero esa selección se utilizará únicamente para las métricas semánticas ordinarias.

La selección lexicográfica no borra, sobrescribe ni reduce los resultados críticos de las alternativas no seleccionadas. La criticidad se resuelve transversalmente sobre todas las alternativas humanas completas, adjudicadas y congeladas conforme a la sección 10.

### 6.5 Relaciones

Las relaciones se compararán mediante:

- Tipo de relación.
- Unidad de origen emparejada.
- Destino emparejado.
- Evidencia y alcance representables.

`targetUnitId` se traducirá a través de la correspondencia entre unidades. No se compararán literalmente identificadores arbitrarios de las dos representaciones.

Los destinos no emparejados se registrarán como errores o casos no evaluables, según la naturaleza de la discrepancia.

### 6.6 Conflictos posteriores al congelamiento

Si una ambigüedad no prevista impide construir o aplicar un candidato conforme a las reglas congeladas:

- Se registra el conflicto.
- Se solicita adjudicación humana ciega a la identidad del modelo cuando sea posible.
- No se modifica el gold de la ejecución ya sellada.
- Si no puede resolverse, la dimensión afectada es `INDETERMINATE`.

La adjudicación diagnóstica posterior no crea una alternativa retroactiva ni altera el scoring congelado de la ejecución.

## 7. Política de abstención e incertidumbre

La abstención es un comportamiento semántico evaluable, no una respuesta técnica ausente.

### 7.1 Abstención global correcta

Cuando la referencia adjudicada exige abstención global y el contrato admite una representación válida con `units: []`, dicha ausencia no constituye una omisión de unidades esperadas.

Se evaluará:

- Validez estructural.
- Pertinencia de `globalUncertainty` cuando se proporciona; el campo es opcional y su ausencia no constituye por sí misma un fallo estructural.
- Ausencia de unidades injustificadas.
- Adecuación semántica de la abstención.

Las métricas por unidad que carezcan de denominador aplicable se marcarán `N/A`.

### 7.2 Abstención global injustificada

Cuando el mensaje contiene unidades interpretables y el modelo se abstiene globalmente sin justificación:

- Se registra abstención excesiva.
- No se considera correcto el caso integral.
- Se registra pérdida de cobertura de las unidades esperadas.
- No se inventan unidades producidas.

### 7.3 Abstención parcial

Cuando parte del mensaje es interpretable y otra parte requiere incertidumbre:

- Se puntúan las unidades efectivamente interpretables.
- Se evalúa por separado la incertidumbre requerida.
- Se registran omisiones injustificadas.
- No se exige interpretar contenido cuya abstención es correcta.

La referencia debe distinguir explícitamente esos contenidos.

### 7.4 Abstención excesiva y fallo técnico

La abstención es excesiva cuando evita representar contenido suficientemente sustentado, sea global o parcialmente. Se mide contra los casos y contenidos interpretables definidos por la referencia seleccionada.

Una respuesta ausente, un error de transporte o JSON imposible de inspeccionar no constituye abstención legítima. Se registra como fallo técnico y fallo integral, no como abstención apropiada ni excesiva.

## 8. Fallos estructurales y errores semánticos

La evaluación estructural y la semántica observable se informarán por separado.

- Un fallo estructural es un incumplimiento de JSON, esquema experimental, identidad de `message`, contrato o validador SIN V2.
- Un error semántico observable es una discrepancia adjudicable en contenido o campos que pueden inspeccionarse sin reparar la salida.
- Una salida inválida puede conservar fragmentos inspeccionables como evidencia diagnóstica condicionada, pero nunca recibe crédito integral ni se repara.
- La imposibilidad de observar semántica no convierte un fallo estructural en ausencia de error semántico o crítico.

## 9. Métricas

| Métrica                 | Numerador / denominador                                                        | Filtro exploratorio |
| ----------------------- | ------------------------------------------------------------------------------ | ------------------- |
| JSON                    | Respuestas JSON válidas / 80 casos reservados                                  | 100 %               |
| Esquema                 | Respuestas conformes / 80                                                      | 100 %               |
| SIN V2                  | Salidas aceptadas por el validador y con `message` idéntico al input / 80      | 100 %               |
| Exactitud por dimensión | Campos correctos / campos aplicables inspeccionables                           | ≥90 %               |
| Cobertura de unidades   | Unidades esperadas correctamente identificadas / unidades esperadas aplicables | ≥90 %               |
| Precisión de unidades   | Unidades producidas correctamente emparejadas / unidades producidas evaluables | ≥90 %               |
| Caso integral           | Casos estructural y semánticamente correctos / 80                              | ≥90 %               |
| Abstención apropiada    | Casos con abstención correcta / casos que la requieren                         | ≥90 %               |
| Abstención excesiva     | Abstenciones injustificadas / casos interpretables                             | ≤10 %               |
| Críticos confirmados    | Casos con `CRITICAL_CONFIRMED` / 80                                             | 0 observados        |
| Desacuerdos críticos    | Casos con `CRITICAL_DISAGREEMENT` irresuelto                                    | 0 para PASS         |

La exactitud semántica se informa separadamente para acto, predicado, polaridad, referente, relaciones, dependencias y demás dimensiones aplicables del contrato.

Los numeradores y denominadores de las métricas semánticas ordinarias se informan por dimensión y estrato usando la alternativa seleccionada. El scoring, las discrepancias y la clasificación crítica se conservan para cada alternativa y no se agregan únicamente desde la seleccionada.

### 9.1 Suficiencia mínima

Para solicitar `PASS` en la evaluación exploratoria se requerirá:

- Ocho casos aplicables como mínimo por cada uno de los nueve actos.
- Ocho casos con evidencia evaluable como mínimo para cada dimensión semántica incluida en el filtro.
- Las cuotas transversales aprobadas completas.
- Al menos diez casos que requieran abstención o incertidumbre.
- Al menos veinte casos etiquetados con riesgo operacional potencial.
- Todos los casos previstos evaluados integralmente, sin ocultar resultados ausentes.

El requisito de ocho casos es un mínimo de diseño exploratorio, no una justificación de precisión estadística ni una garantía de confiabilidad.

Si una dimensión obligatoria carece del mínimo aplicable, no se podrá declarar `PASS`.

Las dimensiones declaradas íntegramente fuera del alcance representacional mediante decisión anterior al congelamiento se reportarán como `N/A` justificado, no como acierto.

### 9.2 Campos parcialmente inspeccionables

Un campo solo podrá incorporarse a la métrica semántica condicionada si su contenido puede interpretarse sin reparar la salida.

Se informarán dos resultados:

**Resultado condicionado:** desempeño sobre campos inspeccionables.

**Resultado integral:** desempeño sobre todos los casos previstos.

Las salidas inválidas siempre cuentan como fallo integral y como fallo en las comprobaciones estructurales correspondientes.

No se reconstruirán campos ausentes ni se inferirá su valor a partir de la intención probable del modelo.

### 9.3 Denominadores cero

Un denominador cero produce `N/A`, nunca 100 %.

Si corresponde a una dimensión obligatoria sin evidencia suficiente, impide `PASS`.

Si corresponde a una dimensión excluida explícitamente antes del congelamiento por no ser representable, se informa como limitación documentada.

### 9.4 Errores críticos no observables

Una salida no inspeccionable no se clasifica como libre de errores críticos.

Se registra:

- Error crítico observable: no determinable.
- Cobertura integral: fallo.
- Suficiencia de evidencia crítica: no satisfecha para declarar ausencia observada de errores.

Un fallo estructural puede justificar `FAIL` aunque no pueda adjudicarse su contenido semántico.

## 10. Errores críticos

Categorías:

- Negación invertida.
- Consulta convertida en instrucción.
- Referente o identidad equivocados.
- Corrección ignorada.
- Retractación ignorada.
- Autorización inferida.
- Ambigüedad presentada como certeza.
- Omisión o adición operacionalmente material.

Toda clasificación requiere evidencia textual, discrepancia adjudicada y una consecuencia operacional potencial adjudicada en el contexto permitido del caso. La etiqueta no se asigna solo por el nombre del campo ni por una consecuencia abstracta sin vínculo con el mensaje.

Se usarán estas etiquetas experimentales:

- `CRITICAL_CONFIRMED`: existe una discrepancia con riesgo operacional potencial adjudicado que ninguna interpretación humana admisible justifica.
- `CRITICAL_DISAGREEMENT`: algunas alternativas presentan criticidad y otras no, o la revisión no puede resolver si una interpretación admisible justifica la salida.
- `NO_CRITICAL_OBSERVED`: no se observa discrepancia crítica después de evaluar todas las alternativas relevantes y la salida es inspeccionable para esa determinación.

Estas etiquetas pertenecen al protocolo experimental y no extienden el contrato SIN V2.

La revisión crítica seguirá este orden:

1. Evaluar la salida frente a todas las alternativas completas, adjudicadas y congeladas.
2. Conservar por alternativa el vector, las discrepancias y la clasificación crítica.
3. Si todas muestran la misma discrepancia crítica y su riesgo queda adjudicado, registrar `CRITICAL_CONFIRMED`.
4. Si algunas presentan criticidad y otras no, registrar `CRITICAL_DISAGREEMENT` y realizar revisión humana documentada.
5. Si una alternativa legítima explica completamente la salida sin error crítico, registrar la discrepancia entre alternativas y su resolución; no declarar automáticamente criticidad. Podrá concluirse `NO_CRITICAL_OBSERVED` cuando toda la evidencia crítica relevante sea inspeccionable.
6. Si ninguna interpretación admisible justifica la discrepancia crítica, registrar `CRITICAL_CONFIRMED`.
7. Si la revisión no resuelve el desacuerdo, conservar `CRITICAL_DISAGREEMENT` y marcar la dimensión crítica `INDETERMINATE`.

La revisión no puede modificar el gold congelado, añadir alternativas retrospectivamente ni utilizar la identidad del modelo como criterio. Una discrepancia respecto de una alternativa no seleccionada no se convierte automáticamente en error crítico, y la alternativa lexicográficamente seleccionada no es la única fuente para calcular criticidad.

Error semántico, riesgo potencial y ejecución incorrecta real son tres hechos distintos. Este protocolo no realiza ejecuciones operativas.

## 11. Reglas de decisión

### Gate A — Instrumento preparado

**PASS:** conjunto construido, referencias adjudicadas, cobertura verificada, reglas de scoring implementadas y probadas, versiones y hashes congelados, custodia verificada y aprobación humana.

**FAIL:** incumplimiento demostrado de un requisito esencial.

**INDETERMINATE:** falta un requisito, aprobación o evidencia indispensable para decidir.

El cierre documental del hito 15 no implica Gate A PASS.

### Gate B — Referencia cloud

**PASS:** ejecución autorizada, íntegra, verificable y conforme a todos los filtros exploratorios y mínimos de suficiencia, sin `CRITICAL_CONFIRMED` y con todas las discrepancias críticas relevantes resueltas.

**FAIL:** evidencia válida demuestra el incumplimiento de cualquier criterio obligatorio, incluida cualquier instancia `CRITICAL_CONFIRMED`. Un único fallo estructural basta para incumplir un filtro cuyo umbral es 100 %, aunque la semántica de esa salida no sea inspeccionable.

**INDETERMINATE:** no existe otro incumplimiento concluyente, pero permanece al menos un `CRITICAL_DISAGREEMENT` irresuelto o existen problemas de integridad, evidencia, adjudicación o suficiencia que impiden decidir.

Regla de precedencia: `FAIL` concluyente prevalece sobre `INDETERMINATE`; por lo tanto, un desacuerdo crítico irresuelto no oculta otro incumplimiento obligatorio demostrado. En ausencia de FAIL, una condición obligatoria indeterminada impide PASS.

B PASS permite considerar C, con nueva autorización. B FAIL conduce a D. B INDETERMINATE detiene la transición.

### Gate C — Comparación local

**Precondiciones:** B PASS, protocolo congelado y nueva autorización.

**PASS:** ejecución comparable, completa y conforme a los filtros aprobados, con diferencias de runtime y hardware documentadas, sin `CRITICAL_CONFIRMED` y con todas las discrepancias críticas relevantes resueltas.

**FAIL:** evidencia válida de incumplimiento de al menos un criterio obligatorio, incluida cualquier instancia `CRITICAL_CONFIRMED`.

**INDETERMINATE:** existe `CRITICAL_DISAGREEMENT` irresuelto, diferencias de configuración no controladas, evidencia insuficiente o comparabilidad no demostrada, sin otro fallo concluyente.

Cada modelo local se evalúa como condición identificada. Un FAIL de un modelo no invalida automáticamente todas las capacidades de otros modelos locales.

No se declarará un mínimo de recursos sin comparación verificable entre candidatos.

### Gate D — Revisión metodológica o arquitectónica

**Precondición normal:** B FAIL y decisión explícita de revisión.

**PASS:** revisión documentada identifica limitaciones, hipótesis explicativas y alternativas, con decisión humana sobre la siguiente investigación.

**FAIL:** revisión rechazada por contradicciones o defectos sustanciales.

**INDETERMINATE:** evidencia insuficiente para distinguir entre defectos del modelo, prompt, referencias, evaluación y representación SIN V2.

D PASS no demuestra una causa técnica ni autoriza modificar el contrato. Toda modificación arquitectónica requiere un hito separado.

## 12. Reproducibilidad y custodia

Antes de cualquier ejecución deberán congelarse:

- Protocolo.
- Dataset.
- Guía.
- Referencias adjudicadas.
- Reglas de puntuación.
- Prompts.
- Esquemas.
- Evaluadores.
- Configuración experimental.

El custodio mantendrá las referencias reservadas separadas del operador.

El orden obligatorio será:

1. Autorizar ejecución y configuración.
2. Entregar únicamente inputs y contexto permitido.
3. Obtener y preservar solicitudes y respuestas crudas originales.
4. Verificar completitud e integridad.
5. Sellar las capturas con hashes y manifiesto.
6. Liberar las referencias reservadas al procedimiento de puntuación autorizado.
7. Calcular métricas y adjudicar discrepancias.
8. Conservar resultados, versiones y decisiones.

Las respuestas crudas deben quedar selladas antes de abrir las referencias reservadas. Una exposición prematura del gold se registrará como incidente de integridad experimental.

Los cambios posteriores requieren nueva versión; la reserva expuesta no recupera su carácter ciego.

## 13. Límites estadísticos

Los 120 casos son una muestra sintética deliberadamente seleccionada.

Las proporciones deberán acompañarse de recuentos, denominadores y medidas de incertidumbre adecuadas, declarando sus supuestos.

Las dependencias entre variantes de una misma familia impiden asumir automáticamente independencia de las observaciones.

Cero errores críticos observados no demuestra ausencia de riesgo operacional ni seguridad productiva.

## 14. Privacidad, costos y autorizaciones

Antes de utilizar un proveedor externo deberán aprobarse:

- Modelo y proveedor.
- Datos sintéticos permitidos.
- Política de privacidad y retención.
- Presupuesto y límites de solicitudes.
- Política de reintentos.
- Captura y preservación de evidencias.
- Autorización humana expresa.

El protocolo no selecciona proveedor ni autoriza inferencias.

## 15. Cierre del hito documental 15

El diseño documental podrá proponerse para revisión cuando:

- Los tres documentos sean consistentes.
- Las cuotas y reglas de puntuación estén definidas.
- Las alternativas y abstenciones tengan tratamiento reproducible.
- La guía refleje el contrato SIN V2.
- Los mínimos y gates estén especificados.
- Las responsabilidades humanas y de custodia sean explícitas.
- Se verifiquen las exclusiones arquitectónicas.
- Se complete el flujo de validación, Git y documentación exigido por el Operating Model.

Esta condición documental no acredita dataset, gold, congelamiento experimental ni Gate A PASS, y no declara cerrado el hito.

## 16. Estado

**Consolidado en R3 para revisión:** universo 120/40/80, métricas, umbrales, selección determinista, separación de responsabilidades y estrategia cloud → local.

**Pendiente:** revisión AGPT, auditoría Guardian y flujo Git/documental exigido por el Operating Model.

**Posterior al hito:** construcción de casos, revisores humanos, adjudicación, congelamiento, presupuesto, proveedor y autorización de ejecución.
