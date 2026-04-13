# fixes-operational-rule-runtime-evolution.md

## OBJECTIVE

Este documento define una regla operativa para guiar la corrección de bugs y ajustes detectados en testing manual dentro del runtime conversacional.

Su objetivo no es solo asegurar la corrección del comportamiento observable, sino también orientar la evolución del sistema hacia un modelo más:

- explícito
- desacoplado
- verificable

Esta dirección es consistente con la evolución arquitectónica definida en `ADR-PIPELINE-RUNTIME-TARGET.md`, y prepara al sistema para una posible migración futura hacia un runtime basado en `mhFlowGraph`, sin introducir cambios estructurales prematuros ni riesgos operativos.

---

## OPERATIVE RULE

> Todo fix manual debe corregir el comportamiento observado y dejar la regla más explícita, más canónica y menos repartida que antes.

---

## INTERPRETATION

Aplicar esta regla implica que cada ajuste debe:

- Resolver el problema observado en tests manuales
- Reducir ambigüedad en la lógica del sistema
- Evitar duplicación de reglas en múltiples capas del pipeline
- Mover la lógica hacia el punto más canónico y estable del runtime
- Hacer que la regla sea más visible, entendible y testeable

---

## DESIGN INTENT

Esta regla busca evitar que los fixes:

- introduzcan excepciones aisladas o ad hoc
- incrementen el acoplamiento dentro de `messageHandler`
- repliquen lógica en múltiples rutas del pipeline
- dependan de heurísticas oportunistas en lugar de estado canónico

En cambio, cada fix debe contribuir a:

- reforzar la jerarquía de verdad del sistema
- consolidar la lógica en un único punto de autoridad
- mejorar la trazabilidad del comportamiento
- facilitar validación mediante tests

---

## NON-GOALS

Este documento NO habilita:

- migraciones estructurales del runtime
- introducción de nuevos runtimes paralelos
- refactors amplios no acotados al problema observado
- cambios que requieran redefinir la arquitectura sin ADR explícita

---

## ALIGNMENT WITH ARCHITECTURE

Esta regla es consistente con:

- el runtime vigente centrado en `messageHandler`
- la arquitectura híbrida del pipeline conversacional
- la necesidad de mantener compatibilidad operativa
- las restricciones del `system_operating_model.md`

Y contribuye directamente a cumplir precondiciones necesarias para una futura migración controlada:

- mayor explicitud del pipeline
- menor duplicación de lógica viva
- fronteras más claras entre decisión, ejecución, persistencia y respuesta
- mejor capacidad de validación end-to-end

---

## PRACTICAL CHECK

Antes de cerrar un fix, validar:

1. ¿Corrige el comportamiento observado?
2. ¿La regla quedó más explícita que antes?
3. ¿Se redujo la duplicación o dispersión de lógica?
4. ¿La decisión se apoya más en estado canónico que en heurísticas?
5. ¿El cambio es acotado, reversible y de una sola intención?

Si alguna respuesta es NO, el fix debe revisarse.

---

## SUMMARY

Cada fix no es solo una corrección puntual.

Es una oportunidad para:

- mejorar la forma del runtime
- reducir entropía estructural
- preparar el sistema para evolucionar sin riesgo
