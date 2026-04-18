# Path: /home/marcelo/begasist/docs/architecture/technical_debt.md

# Technical Debt

Este documento registra deuda técnica detectada durante la evolución del sistema.

## Principios

- La deuda técnica NO bloquea el cierre de un hito si el objetivo fue cumplido
- La deuda debe ser:
  - explícita
  - trazable
  - acotada
- Cada entrada debe representar **una única intención**
- No mezclar múltiples problemas en una misma deuda
- No usar este documento para backlog funcional

---

## Estructura de cada entrada

Cada ítem debe incluir:

- **id**: identificador único
- **estado**: pendiente | evaluando | resuelto
- **prioridad**: baja | media | alta
- **problema**: descripción clara
- **contexto**: dónde aparece
- **causa**: por qué ocurre
- **impacto**: qué riesgo o limitación introduce
- **ejemplos** (opcional pero recomendado)

---

## DEUDAS

---

## TEST-SUITE-STABILITY-01

Estado:

- pendiente

Prioridad:

- media

Problema:

- tests dependientes de timing real, mocks globales y sensibilidad a ejecución de suite completa

Contexto:

- aparece tras fixes de pipeline durante estabilización del runtime

Causa:

- dependencia en timing
- uso de mocks globales
- acoplamiento entre tests

Impacto:

- fragilidad de suite
- falsos negativos
- menor confianza en regresiones

---

## MODIFY-DATES-CORRECTION-LINGUISTIC-COVERAGE-02

Estado:

- pendiente

Prioridad:

- baja

Problema:

- detección de corrección conversacional limitada a un subconjunto de expresiones explícitas

Contexto:

- introducido en FIX-PIPELINE-MODIFY-DATES-SLOT-CORRECTION-18
- implementación deliberadamente acotada para evitar sobreinterpretación

Causa:

- heurística simple basada en regex
- cobertura parcial del lenguaje natural

Impacto:

- algunas correcciones válidas no son interpretadas
- experiencia conversacional menos natural

Ejemplos:

- “ah no, mejor el martes”
- “cambiemos a martes”
- “en realidad martes”

---

## MULTI-LOCALE-BEHAVIOR-CONSISTENCY-03

Estado:

- pendiente

Prioridad:

- media

Problema:

- comportamiento conversacional no siempre consistente entre ES / EN / PT

Contexto:

- aparece en múltiples fixes del pipeline
- validación primaria realizada en español

Causa:

- implementación incremental centrada en ES
- falta de validación sistemática multi-locale

Impacto:

- inconsistencias en experiencia de usuario
- posibles bugs silenciosos en otros idiomas

---
