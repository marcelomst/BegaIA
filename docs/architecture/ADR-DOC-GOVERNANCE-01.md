# ADR-DOC-GOVERNANCE-01

## Estado

Aprobado.

## Decisión

Begasist adopta una gobernanza documental explícita con separación de planos:

- `hito_mcp.md` como registro histórico de hitos
- `docs/architecture/*.md` como documentación viva por dominio
- ADRs como registro de decisiones estructurales
- artefactos derivados como representación visual, no como fuente primaria

Se establece que [`system_operating_model.md`](/home/marcelo/begasist/docs/architecture/system_operating_model.md)
es la fuente de verdad operativa para:

- disciplina de trabajo
- secuencia `CODE -> COMMIT -> HASH -> PUSH -> DOC`
- roles y límites entre agentes
- reglas de cierre documental

## Contexto

La gobernanza documental existía de hecho, pero estaba distribuida entre:

- prácticas operativas
- cierres en `hito_mcp.md`
- documentos vivos de arquitectura

Eso generaba riesgo de:

- drift entre runtime y documentación
- duplicación de reglas
- confusión sobre qué documento debía actualizarse

## Razón

La documentación de Begasist no debe operar como un bloque único.

Cada plano cumple una función distinta:

- la historia registra eventos
- la arquitectura viva describe cómo funciona hoy el sistema
- las ADRs fijan decisiones
- el modelo operativo define cómo se trabaja y cómo se cierra un hito

Por eso, el contrato operativo no debe vivir dentro de una ADR extensa y mutable.

## Consecuencias

### Positivas

- se evita duplicar el contrato operativo
- se aclara qué documento gobierna cada plano
- las ADRs quedan más estables y auditables
- `system_operating_model.md` puede evolucionar sin degradar la función de las ADRs

### Negativas

- exige disciplina para mantener la frontera entre decisión y operación
- obliga a revisar primero la taxonomía documental antes de agregar nuevos documentos

## Regla de mantenimiento

Si cambia la operación del sistema:

- se actualiza [`system_operating_model.md`](/home/marcelo/begasist/docs/architecture/system_operating_model.md)
- y se registra el hito correspondiente en `hito_mcp.md`

Si cambia una decisión estructural sobre gobernanza documental:

- se actualiza esta ADR
- y, si corresponde, también la documentación operativa o viva afectada

## Cierre

La fuente de verdad operativa de Begasist queda en
[`system_operating_model.md`](/home/marcelo/begasist/docs/architecture/system_operating_model.md).

`ADR-DOC-GOVERNANCE-01` preserva la decisión estructural que define esa separación.
