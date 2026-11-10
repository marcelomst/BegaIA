<!-- Path: scripts/semantic-normalization-spike/sin-v2-semantic-evaluation/instrument-spec.md -->

# SIN V2 — Evaluation Instrument Specification

**Hito:** `SPIKE-SIN-V2-SEMANTIC-EVALUATION-PROTOCOL-15`
**Versión:** R3
**Estado:** materialización documental pendiente de revisión AGPT
**Naturaleza:** especificación documental de instrumentos futuros.

## 1. Objetivo

Definir los requisitos de construcción y validación de un instrumento experimental para medir fidelidad semántica SIN V2.

Este documento no implementa herramientas, no crea datos ni autoriza inferencias.

## 2. Componentes futuros

El instrumento separará:

1. Dataset sintético e inputs versionados.
2. Referencias humanas versionadas.
3. Adjudicaciones y alternativas completas.
4. Validación estructural.
5. Evaluación semántica.
6. Clasificación de riesgos.
7. Captura y sellado.
8. Reportes y decisiones experimentales.

Las referencias humanas no podrán modificarse automáticamente como consecuencia de observar una salida del modelo.

## 3. Identidad y versionado de casos

Cada caso deberá permitir identificar:

- ID estable.
- Familia conversacional.
- Partición.
- Estrato primario.
- Etiquetas secundarias.
- Clasificación simple/compuesto.
- Clasificación aislado/multi-turno.
- Mensaje actual.
- Contexto permitido.
- Versión del input.
- Estado de adjudicación.
- IDs y versiones de referencias aprobadas cuando existan.

El instrumento deberá vincular de manera inequívoca cada respuesta cruda con la versión y hash del input efectivo y, después de la apertura controlada, con la versión y hash de las referencias humanas usadas para puntuar.

Estos son requisitos del formato experimental futuro, no nuevos campos SIN V2.

## 4. Integridad del conjunto

Las validaciones offline deberán comprobar:

- 120 casos previstos.
- Distribución 40/80.
- Ocho estratos primarios.
- Cuotas transversales.
- IDs únicos.
- Familias asignadas íntegramente a una sola partición.
- Ausencia de una misma familia, sus paráfrasis o contrastes semánticos en ambas particiones.
- Mensajes y contextos presentes.
- Ausencia de duplicados exactos o normalizados.
- Identificación de similitudes estructurales o semánticas que requieran revisión humana.
- Estados de adjudicación correctos.
- Versiones y hashes coherentes con el manifiesto congelado.

La independencia semántica entre familias no se presumirá por una comprobación automática. Los casos dudosos requerirán decisión humana documentada antes del congelamiento.

## 5. Referencias adjudicadas

El instrumento deberá conservar:

- Anotaciones independientes.
- Adjudicación.
- Alternativas completas de interpretación.
- Segmentaciones admisibles.
- Incertidumbre requerida.
- Campos evaluables.
- Limitaciones representacionales.
- Clasificación de riesgo.
- Identificador, versión y hash de cada alternativa.

Se distinguirán referencias de desarrollo y reservadas.

Todas las alternativas comparables quedarán completas y congeladas antes del scoring. No se utilizarán etiquetas generadas automáticamente como gold humano ni se construirán alternativas retrospectivas a partir de una salida observada.

## 6. Validación estructural

Se reutilizarán el contrato, el validador y los esquemas experimentales autorizados, sin modificarlos.

Se comprobarán independientemente:

1. Existencia de respuesta.
2. Validez JSON.
3. Conformidad con el esquema congelado.
4. Identidad exacta del campo `message` con el input.
5. Resultado del validador SIN V2.
6. Issues y errores originales.
7. Inspeccionabilidad semántica por dimensión.

Una salida inválida no será reparada, completada, normalizada ni reinterpretada antes de puntuar. La validez canónica no certifica corrección semántica.

## 7. Emparejamiento y alternativas

El evaluador futuro deberá comparar la salida con todas las alternativas humanas completas y congeladas.

Para cada alternativa:

1. Identificar unidades que comparten núcleo comunicativo y evidencia pertinente, sin exigir coincidencia de los campos evaluados.
2. Resolver correspondencias uno a uno.
3. Comparar campos semánticos de unidades emparejadas.
4. Registrar unidades esperadas no cubiertas.
5. Registrar unidades producidas sin sustento.
6. Comparar relaciones mediante destinos emparejados.
7. Identificar conflictos no resolubles.

Los IDs no determinarán equivalencia.

### 7.1 Segmentación equivalente

Cuando existan alternativas aprobadas con distinta cantidad de unidades, se evaluará la salida contra cada alternativa completa.

No se realizarán fusiones, divisiones, emparejamientos muchos-a-uno o combinaciones de fragmentos de alternativas durante la puntuación.

### 7.2 Selección determinista

Cada candidato —alternativa completa más correspondencia uno a uno— se comparará con el vector lexicográfico congelado en `protocol.md`, en este orden:

1. Caso integral correcto.
2. Mayor cantidad de unidades correctamente identificadas.
3. Menor cantidad de adiciones no sustentadas.
4. Mayor cantidad de campos aplicables correctos.
5. Menor cantidad de campos aplicables incorrectos.
6. Identificador estable ascendente.

Para cada alternativa, el instrumento registrará:

- ID y versión de la alternativa.
- ID estable de la correspondencia.
- Vector completo de scoring.
- Pares uno a uno.
- Unidades omitidas y adiciones no sustentadas.
- Campos aplicables correctos e incorrectos.
- Numeradores y denominadores de todas las dimensiones.
- Discrepancias y evidencia crítica.
- Clasificación crítica por alternativa.
- Resultado integral, condicionado e indeterminado cuando corresponda.

El instrumento seleccionará exactamente un candidato por caso mediante el vector vigente y marcará su ID para calcular las métricas semánticas ordinarias. La selección no eliminará ni sobrescribirá el scoring, las discrepancias o la criticidad de las demás alternativas.

El orden de iteración, la identidad del modelo o el orden de almacenamiento no podrán resolver empates.

### 7.3 Relaciones y `targetUnitId`

La comparación de `targetUnitId` deberá traducir cada destino mediante la correspondencia uno a uno entre unidades observadas y esperadas, no mediante igualdad textual entre IDs.

Se verificarán tipo, destino, evidencia y alcance representable. Un destino no emparejado se registrará como discrepancia o como no evaluable con justificación; no se inventará una resolución.

### 7.4 Conflictos

Si una ambigüedad no prevista impide aplicar las reglas congeladas:

- Registrar candidatos y evidencia.
- Solicitar adjudicación ciega a la identidad del modelo cuando sea posible.
- No modificar retroactivamente el gold ni la ejecución sellada.
- Marcar la dimensión como `INDETERMINATE` si el conflicto persiste.

## 8. Abstenciones

El evaluador deberá disponer de pruebas específicas para:

- Abstención global correcta con `units: []`.
- Abstención global excesiva.
- Abstención parcial correcta.
- Abstención parcial con omisiones.
- Incertidumbre formalmente válida pero semánticamente injustificada.
- Incertidumbre necesaria no expresada.
- Respuesta técnica ausente.
- Salida estructuralmente inválida.

Una abstención global legítima no se puntuará como omisión de unidades que la referencia seleccionada no exige producir.

Una respuesta ausente o no inspeccionable no recibirá crédito por abstención. Las condiciones estructurales exactas de estados e incertidumbre se reutilizarán desde `contract.ts` y `validator.ts`.

## 9. Inspeccionabilidad por dimensión

Cada puntuación deberá identificar:

- Campo esperado.
- Campo observado.
- Aplicabilidad.
- Inspeccionabilidad.
- Resultado de comparación.
- Justificación cuando corresponda.

Un **valor incorrecto pero inspeccionable** conserva su valor observado sin reparación y recibe resultado incorrecto en la dimensión aplicable.

Un **valor no inspeccionable** no permite determinar el contenido de esa dimensión sin reconstruir, completar o reparar la salida; se registra como no inspeccionable y no entra artificialmente como acierto o error en el denominador condicionado.

Una salida parcialmente inspeccionable podrá aportar evidencia diagnóstica y métricas semánticas condicionadas sobre sus campos realmente observables. Si incumple el contrato, seguirá contando como fallo estructural e integral y no obtendrá crédito por caso integral.

El informe mostrará separadamente valores incorrectos inspeccionables, campos no inspeccionables, fallos estructurales y resultados condicionados. No se reconstruirán campos ausentes ni se inferirá su valor probable.

## 10. Métricas, denominadores y suficiencia

El evaluador producirá:

- Recuento de casos previstos.
- Respuestas recibidas.
- Validez JSON.
- Conformidad de esquema.
- Validez SIN V2.
- Exactitud por dimensión.
- Cobertura y precisión de unidades.
- Casos integrales correctos.
- Abstenciones apropiadas y excesivas.
- Omisiones y adiciones.
- Estados `CRITICAL_CONFIRMED`, `CRITICAL_DISAGREEMENT` y `NO_CRITICAL_OBSERVED`.
- Casos y campos no inspeccionables.
- Resultados indeterminados.
- Cumplimiento de cuotas y mínimos de suficiencia.

Cada proporción deberá incluir numerador y denominador. Los agregados semánticos ordinarios deberán poder rastrearse hasta el caso, la alternativa seleccionada y los componentes registrados del vector. Los resultados críticos deberán rastrearse hasta todas las alternativas, sus discrepancias, su evidencia y la adjudicación final.

Un denominador cero será `N/A`, nunca 100 %. Si corresponde a una dimensión obligatoria, o no se alcanzan los ocho casos aplicables mínimos por acto y por dimensión requerida, la suficiencia no está satisfecha y no puede declararse PASS.

El instrumento deberá verificar además las cuotas de abstención/incertidumbre, riesgo operacional y demás mínimos establecidos en `protocol.md`, sin sustituirlos por un promedio global.

El scoring no podrá presentar solo respuestas válidas ni ocultar fallos del universo total.

## 11. Taxonomía crítica

La clasificación de criticidad deberá conservar por alternativa:

- Caso y contexto permitido.
- Unidad o contenido afectado.
- Referencia humana.
- Salida observada.
- Categoría de error.
- Consecuencia operacional potencial.
- Nivel de certeza.
- Revisor y adjudicación.
- Estado observable/no observable.

La clasificación crítica exige adjudicación humana contextual de la consecuencia operacional potencial. No se inferirá que ocurrió una operación real incorrecta.

El instrumento manejará como metadatos experimentales, no como extensiones de SIN V2:

- `CRITICAL_CONFIRMED`: ninguna interpretación admisible justifica la discrepancia con riesgo operacional potencial adjudicado.
- `CRITICAL_DISAGREEMENT`: las alternativas difieren sobre criticidad o la revisión no puede resolver la justificación.
- `NO_CRITICAL_OBSERVED`: todas las alternativas relevantes fueron revisadas, no se observa criticidad y la salida es inspeccionable para esa determinación.

Si algunas alternativas presentan criticidad y otras no, el instrumento deberá registrar `CRITICAL_DISAGREEMENT`, bloquear una conclusión crítica automática y exigir una revisión humana documentada. La revisión conservará la evidencia por alternativa y no podrá modificar el gold, añadir alternativas retrospectivamente ni usar la identidad del modelo como criterio.

Si una alternativa legítima explica completamente la salida sin error crítico, se conservarán la discrepancia alternativa y la resolución, sin declarar automáticamente criticidad. Si ninguna interpretación admisible justifica el riesgo, se registrará `CRITICAL_CONFIRMED`. Si el desacuerdo no puede resolverse, permanecerá `CRITICAL_DISAGREEMENT` y la dimensión crítica será `INDETERMINATE`.

Los casos críticos no observables se informarán separadamente de los casos sin error crítico observado. Una salida no inspeccionable no podrá clasificarse como libre de error crítico.

## 12. Pruebas offline especificadas

Los futuros tests deberán incluir, como mínimo:

| Escenario                                       | Resultado esperado                                      |
| ----------------------------------------------- | ------------------------------------------------------- |
| ID duplicado                                    | Rechazo de integridad                                   |
| Familia compartida entre particiones            | Rechazo                                                  |
| Paráfrasis o contraste de una familia cruzado   | Rechazo o revisión humana obligatoria                   |
| Cuota insuficiente                              | Suficiencia no satisfecha                               |
| Gold no adjudicado                              | Bloqueo de congelamiento                                |
| Mensaje distinto al input                       | Fallo de validez                                        |
| Predicado requerido ausente                     | Issue canónica                                          |
| Predicado nulo permitido bajo reglas válidas    | Evaluación según contrato                               |
| Evidencia no literal                            | Fallo estructural                                       |
| Dos alternativas legítimas de segmentación      | Comparación completa y selección lexicográfica          |
| Empate de scoring                               | ID estable ascendente                                   |
| Diferencias de IDs con relación equivalente     | Traducción por correspondencia; no penalizar solo el ID |
| Destino relacional equivocado                   | Discrepancia                                            |
| Conflicto no resoluble por reglas congeladas    | `INDETERMINATE`                                         |
| Abstención global correcta                      | Sin omisión artificial                                  |
| Abstención excesiva                             | Fallo de cobertura                                      |
| Respuesta ausente                               | Fallo integral, no abstención                           |
| JSON inválido                                   | Fallo estructural e integral                            |
| Valor incorrecto inspeccionable                 | Error de dimensión condicionado                         |
| Campo no inspeccionable                         | Sin reparación; reporte separado                        |
| Salida parcialmente inspeccionable e inválida   | Evidencia diagnóstica sin crédito integral              |
| Denominador cero                                | `N/A`                                                   |
| Evidencia insuficiente en dimensión obligatoria | No PASS                                                 |
| Mismo error crítico en todas las alternativas   | `CRITICAL_CONFIRMED` tras adjudicar el riesgo           |
| Alternativa compatible y otra crítica           | `CRITICAL_DISAGREEMENT`; revisión y resolución trazable |
| Discrepancia crítica no resoluble                | Dimensión crítica `INDETERMINATE`                       |
| Sin discrepancia crítica; salida inspeccionable  | `NO_CRITICAL_OBSERVED`                                  |
| Salida no inspeccionable                         | No declarar ausencia comprobada de errores críticos     |
| Hash alterado                                   | Rechazo de integridad                                   |
| Gold abierto antes de sellado                   | Incidente de cegamiento                                 |

Estas pruebas quedan especificadas, no implementadas por este hito. Utilizarán fixtures sintéticas propias del evaluador, nunca la reserva como material de desarrollo.

## 13. Congelamiento y hashes

Se deberán congelar y hashear:

- Dataset e inputs efectivos.
- Referencias humanas y alternativas.
- Guía.
- Protocolo.
- Evaluador.
- Reglas de scoring.
- Prompts.
- Esquemas.
- Configuración experimental.

El manifiesto identificará versiones, bytes y hashes de los artefactos efectivos, además de sus relaciones. Los cambios posteriores generarán una nueva versión identificada.

No se reescribirán capturas históricas para atribuirles otra configuración.

## 14. Capturas originales, sellado y apertura del gold

La ejecución futura respetará este orden:

1. Verificar autorización experimental.
2. Verificar identidad del instrumento y hashes.
3. Entregar inputs y contexto permitido al modelo, sin referencias reservadas.
4. Capturar solicitudes y respuestas crudas originales.
5. Registrar errores, metadatos y consumos.
6. Verificar integridad y completitud de capturas.
7. Sellar las capturas mediante hashes y manifiesto.
8. Habilitar la apertura controlada del gold.
9. Ejecutar scoring y revisión de discrepancias.
10. Conservar informes y decisiones.

El instrumento deberá impedir o registrar expresamente cualquier exposición prematura. El operador no recibirá las referencias reservadas durante la generación.

Ninguna normalización posterior sustituirá la captura original. Las vistas derivadas deberán mantener trazabilidad hacia los bytes sellados.

## 15. Evidencia experimental

Los futuros reportes conservarán:

- ID de ejecución.
- Modelo y proveedor.
- Versión o digest observable.
- Parámetros efectivos.
- Solicitud original.
- Respuesta cruda original.
- Errores de transporte.
- Tiempos.
- Tokens.
- Costos.
- Hashes.
- Resultado de validación.
- Resultado semántico.
- Scoring, discrepancias y criticidad por alternativa.
- Etiqueta crítica final y trazabilidad de su resolución.
- Decisiones de adjudicación.

Los metadatos que el proveedor no permita verificar se declararán como no observables.

La evidencia tendrá acceso restringido y un procedimiento de respaldo independiente.

## 16. Reglas de gates

El instrumento deberá implementar o permitir verificar las condiciones documentadas en `protocol.md`.

Los resultados posibles de Gates A, B, C y D son:

- `PASS`.
- `FAIL`.
- `INDETERMINATE`.

Un incumplimiento obligatorio demostrado produce FAIL. En Gate B, un único fallo estructural incumple cualquier filtro con umbral de 100 %, y cualquier `CRITICAL_CONFIRMED` produce FAIL.

Gate B será `INDETERMINATE` ante `CRITICAL_DISAGREEMENT` irresuelto, salvo que otro incumplimiento concluyente determine FAIL. PASS requiere resolver todas las discrepancias críticas relevantes y no registrar `CRITICAL_CONFIRMED`.

Gate C aplicará la misma regla crítica a cada condición local: `CRITICAL_CONFIRMED` produce FAIL; `CRITICAL_DISAGREEMENT` irresuelto produce INDETERMINATE salvo otro fallo concluyente; PASS exige resolver las discrepancias críticas relevantes.

FAIL concluyente prevalece sobre INDETERMINATE. En ausencia de FAIL, una condición obligatoria sin evidencia suficiente impide PASS.

Un resultado condicionado favorable no reemplaza el resultado integral.

Gate B FAIL no autoriza automáticamente modificar SIN V2; dirige la investigación a Gate D. Gate C requiere Gate B PASS y autorización separada.

## 17. Privacidad, presupuesto y autorizaciones

Una futura ejecución cloud requerirá:

- Proveedor y modelo aprobados.
- Casos sintéticos autorizados.
- Política de privacidad, uso y retención revisada.
- Presupuesto total, límites de solicitudes y alertas.
- Política de reintentos y tratamiento de consumos duplicados.
- Almacenamiento, acceso y respaldo de evidencias.
- Autorización humana expresa para la ejecución concreta.

No se enviarán conversaciones reales de huéspedes, datos personales, secretos ni estado productivo. Si un artefacto deja de ser inequívocamente sintético o excede la autorización, la ejecución se detiene y requiere nueva decisión humana.

Este documento no selecciona proveedor, no concede presupuesto y no autoriza inferencias.

## 18. Aislamiento arquitectónico

Los instrumentos experimentales no modificarán ni se integrarán con:

- `messageHandler`.
- Persistencia productiva.
- Routing operativo.
- Estado conversacional de hoteles.
- Lifecycle real de reservas.
- Guardas transaccionales.
- Contrato SIN V2.
- Validador SIN V2.
- Adapter SIN V2.
- RDA.

La evaluación cloud precede a cualquier comparación de modelos locales. Toda ejecución y toda integración futura requieren autorización separada.

## 19. Entregables posteriores

En hitos futuros podrán construirse:

- Conjunto sintético.
- Matriz de cuotas.
- Referencias humanas.
- Evaluadores de integridad.
- Scorer semántico.
- Manifiesto de congelamiento.
- Mecanismo de captura y preservación.

Los nombres y rutas de estos artefactos no quedan autorizados por esta especificación. No se presume que ya existan.

## 20. Condición de revisión documental

Esta especificación puede proponerse a revisión cuando:

- Sea consistente con `protocol.md` y `annotation-guide.md`.
- Defina formatos, validaciones, scoring y custodia.
- Contemple abstenciones y segmentaciones alternativas.
- Distinga campos SIN V2 de metadatos humanos externos.
- Especifique errores críticos y no inspeccionables.
- Preserve los límites arquitectónicos.
- Se completen las validaciones exigidas por el Operating Model.

La materialización documental no acredita implementación del instrumento, no declara cerrado el hito y no implica Gate A PASS.
