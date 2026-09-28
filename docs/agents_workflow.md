# Begasist Agents Workflow

Este documento define el flujo de trabajo recomendado entre agentes para
Begasist.

Objetivo:

- separar claramente roles
- evitar mezclar implementación, auditoría Git, documentación y arquitectura
- mantener disciplina de hitos y commits

## Chats Fijos

### 1. Técnico

Agente:

`agent.asistente_tecnico`

Uso:

- implementación de código
- debugging
- validación técnica
- cierre técnico de hitos

No mezclar:

- documentación de cierre
- auditoría Git de disciplina

### 2. Repo Guardian

Agente:

`agent.repo_guardian`

Uso:

- auditoría de working tree
- alcance de commits
- staging conceptual
- trazabilidad Git obligatoria para todo cambio material versionable

No mezclar:

- implementación
- documentación

### 3. HDOC

Agente:

`agent.hdoc`

Uso:

- cierres documentales
- actualización de `hito_mcp.md`
- actualización de documentación estable del repo

Regla obligatoria para `existing_repo_change`:

`CODE -> COMMIT -> HASH -> PUSH -> DOC`

Para `external_operational_change`, HDOC consume exclusivamente la elegibilidad
y evidencia sustitutiva validadas por Guardian.

No mezclar:

- cambios de código
- Git de escritura

### 4. Arquitectura

Agente:

`agent.arquitecto_sistema`

Uso:

- definición de hitos
- análisis de arquitectura
- contratos
- riesgos
- evolución del sistema

No mezclar:

- implementación salvo pedido explícito
- cierre documental de rutina

## Flujo Recomendado

Orden operativo:

`Arquitectura -> Repo Guardian -> Técnico -> Repo Guardian -> Marcelo -> HDOC`

Detalle:

1. `Arquitectura`
   - define el hito
   - aclara objetivo, alcance y restricciones

2. `Repo Guardian`
   - audita si el working tree está limpio o mezclado
   - confirma, para `existing_repo_change`, el alcance del technical commit
     trazable, separado del documentation commit posterior

3. `Técnico`
   - implementa o ajusta el cambio
   - ejecuta validación técnica

4. `Repo Guardian`
   - confirma qué archivos entran en el commit
   - propone mensaje de commit

5. `Marcelo`
   - ejecuta manualmente:
     - `git add`
     - `git commit`
     - `git push`
   - obtiene el hash real del commit técnico

6. `HDOC`
   - entra sólo con `HDOC_INPUT`, `guardian_verdict: valid` y
     `ready_for_hdoc: yes`
   - para `existing_repo_change`, documenta después de commit + hash real + push
   - para `external_operational_change`, consume los tres `not_applicable` y la
     evidencia sustitutiva completa; no determina elegibilidad
   - propone la secuencia Git documental si corresponde

## Clasificación del Cambio

Todo hito declara:

```text
hito_change_classification: existing_repo_change | external_operational_change
```

- `existing_repo_change` domina cuando existe cualquier cambio material
  versionable, aunque el hito incluya acciones externas.
- `external_operational_change` requiere alcance íntegramente externo. Sólo
  `operating_environment_cutover` está permitido inicialmente.
- No existe categoría `mixed`.
- AGPT propone o autoriza; Guardian determina elegibilidad; HDOC consume.
- `not_applicable` es una decisión contractual auditada. Nunca deriva de
  `pending`, `missing` o `failed`.
- `HEAD` baseline, `origin/main` y `working_tree_clean` no sustituyen commit,
  push ni hash técnico.

Para la rama externa, Guardian debe verificar la evidencia sustitutiva completa
definida en `system_operating_model.md`, su sanitización, la integridad del
repositorio, el responsable humano y el rollback o evaluación de
irreversibilidad.

En ambas ramas, HDOC prepara la documentación con `documentation_commit:
pending`. Marcelo realiza el Git write documental; sólo después del hash real y
push verificado existe cierre documental.

`commit_name_sugerido` identifica ese futuro documentation commit y es distinto
de `technical_commit`. La ausencia de technical commit en una rama externa
elegible no vuelve inaplicable el commit documental cuando HDOC produce cambios
versionados.

## Reglas Duras

- todo `existing_repo_change` exige technical commit, hash real y push confirmado
- technical commit y documentation commit mantienen identidades Git distintas
- `existing_repo_change`: `CODE -> COMMIT -> HASH -> PUSH -> DOC`
- `external_operational_change`: `EXTERNAL_ACTION -> SUBSTITUTE_EVIDENCE -> GUARDIAN -> DOC`
- Marcelo ejecuta manualmente todo Git de escritura
- `agent.repo_guardian` no modifica archivos
- `agent.hdoc` no toca código
- `agent.asistente_tecnico` no documenta salvo pedido explícito
- `agent.arquitecto_sistema` no mezcla implementación salvo pedido explícito

## Handoff Estándar

Usar este formato para pasar contexto entre agentes:

```text
Hito:
Tipo:
Clasificación del cambio:
Estado:
Objetivo:

Commit/hash:
Archivos afectados:
Validación:
Restricciones:
Contexto mínimo:
Próximo paso esperado:
```

## Handoff Corto

Versión mínima:

```text
Hito:
Estado:
Clasificación del cambio:
Hash:
Archivos:
Validación:
Paso siguiente:
```

## Ejemplo

```text
Hito: UX-GUESTS-01
Tipo: UX
Estado: commit técnico realizado
Objetivo: reemplazar lenguaje técnico por lenguaje operativo en Guests

Commit/hash: 84691ad
Archivos afectados: app/admin/guests/page.tsx
Validación: pnpm run ts-check PASS
Restricciones: no tocar código, solo documentación
Contexto mínimo: Guests->Huéspedes, Merge->Unificar huéspedes, Aliases->Identidades del huésped
Próximo paso esperado: registrar hito en hito_mcp.md y evaluar mención mínima en docs/architecture/admin_panel.md
```

## Uso Práctico

Si un `existing_repo_change` todavía no tiene commit técnico:

- no pasar a HDOC
- volver a `Repo Guardian` o `Técnico`

Si un `existing_repo_change` ya tiene hash real y push confirmado:

- pasar a `HDOC`
- registrar cierre documental

Si un `external_operational_change` tiene evidencia sustitutiva completa pero
Guardian aún no emitió `guardian_verdict: valid` y `ready_for_hdoc: yes`:

- no pasar a HDOC
- volver a `Repo Guardian`

Si el working tree tiene mezcla:

- detener cierre de commit
- volver a `Repo Guardian`
