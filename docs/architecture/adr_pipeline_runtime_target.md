# ADR — Pipeline Runtime Target

## Estado

Aprobado como cierre arquitectónico de la serie `PIPELINE-SIGNAL-ARCH`.

Hito:

`HITO-PIPELINE-08`

Nombre:

`ADR-PIPELINE-RUNTIME-TARGET`

## Decisión

El runtime principal vigente del pipeline conversacional continúa
evolucionando sobre `messageHandler`.

No se adopta todavía `mhFlowGraph` como runtime operativo principal.

`mhFlowGraph` queda definido como candidato condicionado para una migración
gradual futura, sujeto a precondiciones técnicas explícitas.

## Contexto

La serie `PIPELINE-SIGNAL-ARCH` cerró previamente estos hitos:

- `HITO-PIPELINE-01 / ROUTING-OBSERVABILITY-BASELINE`
- `HITO-PIPELINE-02 / HEURISTIC-INVENTORY-CONVERGENCE`
- `HITO-PIPELINE-03 / BODYLLM-FASTPATH-BOUNDARIES`
- `HITO-PIPELINE-04 / DECISION-POLICY-EXTRACTION`
- `HITO-PIPELINE-05 / LLM-ESCALATION-POLICY`
- `HITO-PIPELINE-06 / CLASSIFIER-VS-HEURISTIC-RATIONALIZATION`
- `HITO-PIPELINE-07 / PROMPT-SELECTION-DECOUPLING`

La serie tuvo como objetivo hacer el pipeline conversacional más explícito y
auditable sin romper el runtime actual.

Como resultado:

- mejoró la observabilidad del routing
- se convergieron heurísticas textuales relevantes
- se delimitaron mejor fronteras internas de `bodyLLM`
- la policy de routing quedó extraída y más auditable
- la policy de escalado a classifier/LLM quedó explícita
- se racionalizó la relación heurística/classifier
- se desacopló parcialmente la resolución de `promptKey`

## Pregunta arquitectónica

¿Conviene seguir evolucionando sobre `messageHandler` o migrar gradualmente
hacia `mhFlowGraph` como runtime principal?

## Evidencia

`messageHandler` sigue siendo el runtime principal efectivo del sistema.

Hoy concentra coordinación real de:

- preLLM
- bodyLLM
- posLLM
- persistencia
- supervisión
- emisión de respuesta
- fast-paths operativos

`mhFlowGraph` existe como estructura y dirección arquitectónica válida, pero
todavía no reemplaza de punta a punta las responsabilidades operativas actuales
del runtime vigente.

La serie mejoró significativamente la explicitud del pipeline, pero no produjo
aún el nivel de desacople necesario para migrar de forma segura el runtime
principal sin aumentar riesgo operativo.

## Decisión recomendada

- mantener `messageHandler` como runtime principal vigente
- no migrar todavía el runtime principal a `mhFlowGraph`
- tratar `mhFlowGraph` como candidato condicionado para una migración gradual
  futura, no como destino inmediato

## Razón

Migrar ahora elevaría el riesgo de:

- duplicación de lógica viva
- drift funcional entre runtimes
- ruptura de compatibilidad
- mezcla prematura entre routing, ejecución, persistencia, supervisión y
  composición final de respuesta

En el estado actual del repo, la decisión más segura y disciplinada es seguir
evolucionando el runtime vigente sobre `messageHandler`, preservando
compatibilidad y capitalizando el desacople ya logrado por la serie.

## Consecuencias

### Positivas

- se preserva compatibilidad operativa
- se evita una migración prematura
- se consolida el valor de la explicitud lograda por la serie
- se mantiene bajo el riesgo de drift funcional

### Negativas

- el runtime principal sigue apoyado en un coordinador aún grande
- `mhFlowGraph` no pasa todavía a ser runtime operativo
- la migración queda diferida a una fase posterior condicionada

## Condiciones para reabrir esta decisión

Esta ADR solo debería reabrirse si se cumplen al menos estas condiciones:

- desacople suficiente del runtime actual, especialmente en `bodyLLM` y
  coordinación end-to-end
- equivalencia operacional verificable entre el runtime vigente y un runtime
  candidato sobre `mhFlowGraph`
- cobertura de pruebas comparativas end-to-end suficiente para routing,
  reservation, retrieval, supervisión y persistencia
- posibilidad real de migración por slices controlados, sin reemplazo total en
  una sola etapa
- fronteras más claras entre decisión, ejecución, persistencia y emisión de
  respuesta

## Cierre

La decisión arquitectónica vigente es que `messageHandler` permanece como
runtime principal del pipeline conversacional.

`mhFlowGraph` queda registrado como candidato condicionado para una migración
gradual futura, no como target operativo inmediato.
