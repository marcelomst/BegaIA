<!-- Path: docs/architecture/analysis/ANALYSIS-PIPELINE-CONTRACTS-CODE-STATE.md -->

# ANALYSIS — Pipeline Contracts Code State

DOCUMENT_TYPE: ANALYSIS
STATUS: SNAPSHOT
SCOPE: PIPELINE_CONTRACTS
FOCUS: CODE_GROUNDED_RUNTIME_STATE
RUNTIME_TARGET: messageHandler
SOURCE_OF_TRUTH: FALSE
NORMATIVE: NO
INTENDED_USE:

- machine-readable architecture snapshot
- portable context for future chats
- evidence-backed reference for current runtime state
  LAST_UPDATED_CONTEXT:
- case analyzed: "cambiá la otra"
- perspective: contracts in code vs remaining distribution
  RELATED_DOCS:
- README.md
- system_operating_model.md
- ADR-PIPELINE-RUNTIME-TARGET.md
- message_pipeline.md
- roadmap.md
- hito_mcp_recent.md
- config.toml

## PURPOSE

Este documento captura una foto explícita del estado actual del sistema respecto
de cuatro contratos del runtime conversacional en el caso representativo
`"cambiá la otra"`:

1. no inventar target
2. sufficiency gating
3. canonical dominance
4. una acción requiere target válido

No introduce reglas nuevas.
No reemplaza documentación normativa.
No redefine arquitectura.
Su propósito es dejar evidencia portable, auditable y machine-friendly sobre:

- qué contratos ya están plasmados en código
- qué grado de explicitud tienen hoy
- qué falta todavía para que esos contratos sean más canónicos y menos repartidos

## INTERPRETATION RULE

Si existe conflicto entre este documento y documentación normativa, prevalecen:

1. system_operating_model.md
2. ADR-PIPELINE-RUNTIME-TARGET.md
3. message_pipeline.md
4. roadmap.md

## ANALYZED CASE

Precondición:

- existen al menos dos reservas accionables en la conversación

Turno analizado:

- usuario: `"cambiá la otra"`

Pregunta arquitectónica:

- ¿dónde están plasmados en el código los contratos que gobiernan este caso?
- ¿qué tan explícitos o distribuidos están hoy?

---

## SECTION_A — ARCHITECT REPORT (VERBATIM)

1. Resultado

Los 4 contratos están plasmados en código, pero no todos con el mismo grado de explicitud:

- No inventar target: explícito.
- Sufficiency gating: explícito.
- Canonical dominance: explícito.
- Una acción requiere target válido: explícito para ejecución; parcialmente distribuido para apertura de `modify`.

Para el caso `"cambiá la otra"`: si hay una reserva activa/foco y exactamente una alternativa accionable, el runtime resuelve “la otra”. Si hay más de una alternativa o no hay foco suficiente, bloquea y pide aclaración.

2. Mapa de código del caso `"cambiá la otra"`

- Path: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):8159
  Función: `handleIncomingMessage`
  Responsabilidad: entrada principal del runtime; serializa por conversación y deriva a `bodyLLM`.

- Path: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):370 / :2844
  Funciones: `getObjectiveContext`, `preLLM`
  Responsabilidad: carga `conv_state`, historial, slots y contexto conversacional.

- Path: [lib/db/convState.ts](/home/marcelo/begasist/lib/db/convState.ts):260
  Función: `getConvState`
  Responsabilidad: carga estado por `_id = hotelId:conversationId`.

- Path: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):1144
  Función: `buildReservationCanonicalState`
  Responsabilidad: arma estado canónico, dedupe por `reservationId`, status canónico y lista accionable.

- Path: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):1481
  Función: `resolveReservationReference`
  Responsabilidad: detecta `la otra`, ordinales, `esa`, `la nueva`, etc.; resuelve o marca ambigüedad.

- Path: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):1438
  Función: `getAmbiguousReservationAction`
  Responsabilidad: bloquea acciones con múltiples reservas accionables sin target suficiente.

- Path: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):4482
  Bloque guard
  Responsabilidad: si la referencia es ambigua/out-of-range en `modify` o `cancel`, responde guardrail y no ejecuta.

- Path: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):4611
  Bloque `resolvedModifyTarget`
  Responsabilidad: recién habilita flujo `modify` si existe target resuelto o seleccionable de forma válida.

3. Contrato por contrato

Contrato 1: No inventar target

- Estado: explícito
- Evidencia: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):1578
  `resolveReservationReference`: para `mentionsOther`, solo resuelve si `alternateReservations.length === 1`; si hay más de una alternativa, retorna `ambiguous`.
- Evidencia: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):4482
  Si `reservationReference.status` es `ambiguous` u `out_of_range`, responde guardrail y retorna sin ejecutar.
- Explicación breve: “la otra” no se convierte en target salvo que exista una única alternativa determinística.
- Riesgo: si otro branch posterior ignorara `reservationReference.status`, podría ejecutar sobre target derivado por fallback. En el path revisado, los guards lo bloquean.

Contrato 2: Sufficiency gating

- Estado: explícito
- Evidencia: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):1452
  `getAmbiguousReservationAction` usa `buildActionableReservationCandidates(pre.st).length`; si hay múltiples accionables y no hay target resuelto, devuelve `modify/cancel/snapshot`.
- Evidencia: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):4490
  Construye respuesta: “Tenés varias reservas. ¿Cuál querés modificar?...”
- Explicación breve: la acción se bloquea aunque haya intención clara de modificar, porque falta target suficiente.
- Riesgo: el contrato está repartido entre resolución de referencia y guard de acción; hay que mantener ambos alineados.

Contrato 3: Canonical dominance

- Estado: explícito
- Evidencia: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):1144
  `buildReservationCanonicalState` construye `records`, `actionableRecords` y `byId`.
- Evidencia: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):1321
  `buildActionableReservationCandidates` deriva candidatos desde `buildReservationCanonicalState(state).actionableRecords`.
- Evidencia: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):1468
  `getReservationReferenceTargetById` busca el target dentro de candidatos construidos desde estado canónico.
- Explicación breve: la resolución no opera directamente sobre `reservationSlots` como fuente dominante; usa historial/lastReservation normalizados en proyección canónica.
- Riesgo: algunos helpers derivados siguen existiendo para completar replies/slots; si se usan fuera del target canónico podrían reabrir inconsistencias.

Contrato 4: Una acción requiere un target válido

- Estado: explícito
- Evidencia: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):4620
  El branch de `modify` requiere `resolvedModifyTarget`.
- Evidencia: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):4933
  Antes de ejecutar `modifyReservation`, si falta `codeFromModifySubstate`, pide código y retorna.
- Evidencia: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):5821
  En `cancel`, si no hay `resolvedCancelCode`, pide código o guardrail; no cancela.
- Explicación breve: la ejecución real (`modifyReservation` / `cancelReservation`) queda detrás de un `reservationId` resuelto.
- Riesgo: abrir menú de `modify` no es ejecución; si se interpreta como acción transaccional, el contrato parece menos cerrado. Para ejecución sí está cerrado.

4. Secuencia real del runtime para este caso

1. `handleIncomingMessage` recibe `"cambiá la otra"` y entra al runtime principal.
   Evidencia: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):8159

1. `getObjectiveContext` o `preLLM` carga `conv_state` por `hotelId + conversationId`.
   Evidencia: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):404, [lib/db/convState.ts](/home/marcelo/begasist/lib/db/convState.ts):252

1. `bodyLLM` calcula `reservationReference = resolveReservationReference(pre.st, userTxtRaw)`.
   Evidencia: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):4210

1. `resolveReservationReference` detecta `mentionsOther` por regex `\bla otra\b`.
   Evidencia: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):1492

1. Antes de decidir target, arma candidatos desde estado canónico.
   Evidencia: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):1484, :1486

1. Si hay foco activo y una sola alternativa, resuelve target. Si hay más de una alternativa, retorna `ambiguous`.
   Evidencia: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):1578

1. Si retorna `ambiguous`, el guard bloquea `modify` y responde aclaración.
   Evidencia: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):4482

1. Si retorna `resolved`, `resolvedModifyTarget` habilita el flujo de modificación y persiste `selectedReservationTarget`.
   Evidencia: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):4611, :4638

1. La ejecución final de modificación solo ocurre más adelante, con `codeFromModifySubstate`.
   Evidencia: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):4961

1. Hallazgos

- Severidad: Baja
  Área: documentación
  Evidencia: [docs/architecture/message_pipeline.md](/home/marcelo/begasist/docs/architecture/message_pipeline.md):566 y [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):1578
  Impacto: la doc dice que `la otra` está soportada “cuando la señal es suficiente”, y el código lo cumple, pero el caso depende de foco activo y cantidad de alternativas.
  Recomendación mínima: documentar explícitamente que `la otra` requiere una única alternativa determinística.

- Severidad: Baja
  Área: pipeline
  Evidencia: [test/unit/messageHandler.reference_resolution.spec.ts](/home/marcelo/begasist/test/unit/messageHandler.reference_resolution.spec.ts):338, :488, :1750
  Impacto: hay cobertura para `cancelá la otra`, modify ambiguo y múltiples reservas, pero no vi test exacto para `"cambiá la otra"`.
  Recomendación mínima: agregar test focal si se quiere cerrar trazabilidad literal del caso.

- Severidad: Media
  Área: pipeline
  Evidencia: [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):4611 y [lib/handlers/messageHandler.ts](/home/marcelo/begasist/lib/handlers/messageHandler.ts):4933
  Impacto: el contrato de target válido está cerrado en ejecución, pero distribuido entre apertura de flujo y ejecución final.
  Recomendación mínima: mantener explícita la distinción “abrir modify” vs “ejecutar modify” en tests y documentación.

---

## SECTION_B — AGPT ANALYSIS

### B.1 Resultado sintético

El informe del arquitecto demuestra que los cuatro contratos existen en código y
que el runtime ya opera con una base contractual real para el caso
`"cambiá la otra"`.

La lectura relevante no es solo que los contratos existen, sino que hoy coexisten
dos estados de madurez:

- contratos ya canónicos y claramente centralizados
- contratos correctos pero todavía distribuidos entre varias etapas del runtime

### B.2 Qué demuestra este análisis

El sistema ya no depende principalmente de heurísticas implícitas para este caso.

La evolución lograda es:

- heurística -> contrato explícito

Pero todavía no está completamente en:

- contrato explícito -> contrato único y canónico

La frontera actual del sistema no es ausencia de reglas.
La frontera actual es dispersión de reglas correctas.

### B.3 Tipología observada de contratos

#### Tipo A — contratos centrales y canónicos

Son contratos con punto de autoridad claro, responsabilidad localizada y función
identificable.

Ejemplos observados en el informe:

- `buildReservationCanonicalState`
- `resolveReservationReference`

Rasgos:

- más auditables
- más fáciles de rastrear
- más robustos frente a drift local
- más alineados con la regla operativa de volver la lógica más explícita, más
  canónica y menos repartida

#### Tipo B — contratos distribuidos o emergentes

Son contratos reales, efectivos y verificables, pero su enforcement depende de
más de un punto del runtime.

Ejemplos observados en el informe:

- sufficiency gating
- bloqueo por ambigüedad
- exigencia de target válido antes de ejecución

Rasgos:

- funcionan hoy
- ya no son heurística abierta
- pero requieren alineación entre resolución, guards y ejecución
- son más frágiles ante futuros cambios locales

### B.4 Lectura contrato por contrato

#### 1. No inventar target

Estado interpretado:

- contrato bien formado
- cercano a contrato canónico

Motivo:

- su resolución está anclada a una condición determinística concreta
- `"la otra"` solo resuelve con una única alternativa determinística
- el guard posterior refuerza el bloqueo cuando la referencia sigue ambigua

Lectura:

- este contrato ya dejó atrás la heurística
- la ambigüedad no se compensa con “inteligencia”
- se resuelve con bloqueo y aclaración

#### 2. Sufficiency gating

Estado interpretado:

- contrato explícito, pero distribuido

Motivo:

- depende de resolución de referencia
- depende de cómputo de candidatos accionables
- depende de un guard posterior que materializa el bloqueo

Lectura:

- el contrato existe y está bien logrado
- pero todavía no vive como punto único de autoridad
- es el ejemplo más claro de contrato correcto pero repartido

#### 3. Canonical dominance

Estado interpretado:

- el contrato más canónico de los cuatro

Motivo:

- existe una función claramente nombrada y centrada en esa responsabilidad
- el runtime consulta una proyección canónica antes de resolver target
- el contrato coincide con la jerarquía de verdad ya formalizada en
  `message_pipeline.md`

Lectura:

- este slice ya está más cerca del estado objetivo del roadmap
- es el mejor ejemplo actual de regla transformada en estructura clara

#### 4. Una acción requiere target válido

Estado interpretado:

- contrato explícito y correcto en ejecución
- menos canónico en la apertura del flujo

Motivo:

- está claramente cerrado antes de `modifyReservation` y `cancelReservation`
- pero la habilitación previa del flujo `modify` y la ejecución final no viven
  todavía en un mismo punto

Lectura:

- el sistema ya protege la transacción real
- pero la forma del contrato sigue parcialmente distribuida

### B.5 Insight arquitectónico principal

Este caso muestra que Begasist ya logró convertir heurísticas peligrosas en
contratos operativos para reference resolution sobre multi-reserva.

El riesgo dominante ya no es:

- ausencia de reglas
- inferencia libre sobre targets
- ejecución oportunista bajo ambigüedad

El riesgo dominante pasa a ser:

- contratos correctos pero distribuidos
- necesidad de mantener alineación entre múltiples puntos del runtime
- potencial drift entre apertura, guard y ejecución

### B.6 Relación con el roadmap

Esta lectura es consistente con la evolución reciente del runtime y con el uso
del roadmap como fuente normativa de etapa.

Este documento NO redefine la fase vigente del roadmap.
No determina por sí solo readiness estructural.
No habilita refactor ni migración.

Su valor es más acotado:

- capturar evidencia puntual sobre cómo están plasmados hoy ciertos contratos en código
- mostrar qué contratos ya son explícitos
- mostrar cuáles siguen correctos pero distribuidos

Por su naturaleza de snapshot, cualquier afirmación temporal sobre etapa actual
del roadmap debe leerse como contextual al momento del análisis.

Si existe diferencia entre este documento y el roadmap vigente, prevalece
`roadmap.md`.

Este documento debe interpretarse como evidencia auxiliar en procesos de análisis,
no como insumo normativo para decisiones de evolución estructural.

### B.7 Qué falta todavía

No falta cambiar el runtime.
No falta migrar a graph.
No falta introducir un engine paralelo.

Lo que falta, desde esta perspectiva, es:

- que contratos hoy distribuidos se vuelvan más canónicos
- que apertura de flujo y ejecución compartan límites más visibles
- que la documentación refleje con mayor precisión condiciones reales como:
  - `"la otra"` requiere foco suficiente y única alternativa determinística
- que la suite tenga trazabilidad literal para el caso `"cambiá la otra"`

### B.8 Foto actual del sistema

Foto actual:

- el runtime vigente sigue correctamente centrado en `messageHandler`
- los contratos analizados existen en código
- canonical dominance ya muestra forma madura
- sufficiency gating y target validity todavía exhiben distribución operativa
- el sistema ya no es frágil por heurística libre en este slice
- el siguiente salto de calidad no es agregar lógica, sino volver más canónicos
  contratos ya presentes

### B.9 Conclusión

Este caso no muestra un sistema “inteligente pero difuso”.

Muestra algo más importante:

- un runtime que ya opera con contratos reales
- una arquitectura que preserva compatibilidad con `messageHandler`
- una deuda residual concentrada en forma y centralización, no en ausencia de
  gobernanza

En términos de evolución:

1. heurística -> contrato
2. contrato distribuido -> contrato canónico

El primer salto ya ocurrió en este slice.
El segundo es parte de la frontera actual del sistema.

## MACHINE_FRIENDLY_SUMMARY

STATE:

- runtime principal vigente: `messageHandler`
- caso analizado: `"cambiá la otra"`
- contratos presentes en código: yes
- contratos completamente canónicos: partial

CONTRACT_STATUS:

- no_inventar_target: explicit
- sufficiency_gating: explicit_distributed
- canonical_dominance: explicit_canonical
- action_requires_valid_target: explicit_execution_distributed_opening

SYSTEM_READING:

- heuristics_removed_for_case: yes
- dominant_residual_risk: contract_distribution
- migration_to_new_runtime_required: no
- next_quality_step: canonicalize_existing_contracts

DOCUMENT_INTENT:

- preserve current-state snapshot
- support future architectural analysis
- reduce context loss across chats
