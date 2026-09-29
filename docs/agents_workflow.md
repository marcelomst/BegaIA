# Begasist Agents Workflow

Este documento es una guía operacional subordinada para coordinar agentes en
Begasist. La fuente normativa es
`docs/architecture/system_operating_model.md`; ante cualquier conflicto,
prevalece el Operating Model.

Objetivo:

- separar claramente roles
- evitar mezclar implementación, auditoría Git, documentación y arquitectura
- mantener disciplina de hitos y commits

La apertura, el perímetro soportado y los permisos efectivos de las sesiones
se documentan en la guía canónica
`docs/development/codex_agent_sessions.md`. Los perfiles concretos permanecen
fuera del repositorio, bajo `~/.codex`.

Esta guía resume el uso práctico de esos contratos. No crea una fuente de
verdad alternativa ni reemplaza el lifecycle canónico.

## Roles y límites

### AGPT

Uso:

- diseña, clasifica y coordina el hito
- decide el dispatch según la necesidad dominante
- autoriza la transición de un `external_operational_change`
- consolida el resultado final

No mezcla:

- implementación
- auditoría Guardian
- cierre documental HDOC
- Git de escritura

### arquitecto_sistema

Perfil efectivo:

`arquitecto_sistema`

Uso on-demand:

- análisis arquitectónico y cross-slice
- límites, contratos, invariantes y riesgos
- dictámenes estructurales y escalamiento

No sustituye el diseño, coordinación ni dispatch de AGPT.

### arquitecto_kb

Perfil efectivo:

`arquitecto_kb`

Uso on-demand:

- análisis de KB, tokens, templates y hydration
- consistencia semántica con la configuración canónica

No se fusiona con `arquitecto_sistema` ni altera runtime conversacional.

### asistente_tecnico

Perfil efectivo:

`asistente_tecnico`

Uso:

- implementación técnica acotada
- debugging
- validación técnica
- reporte de evidencia
- resultado técnico listo para auditoría

No mezclar:

- documentación de cierre
- auditoría Git de disciplina
- decisión unilateral de cierre

### repo_guardian

Perfil efectivo:

`repo_guardian`

Uso:

- auditoría de working tree
- alcance de commits
- staging conceptual
- gate pre-commit posterior a la implementación
- verificación post-commit de identidad Git técnica
- emisión de veredicto, readiness y `HDOC_INPUT`

No mezclar:

- implementación
- documentación
- decisión o ejecución del Git write humano
- sustitución de Marcelo

### hdoc

Perfil efectivo:

`hdoc`

Uso:

- preparación documental desde `HDOC_INPUT` válido
- actualización de `hito_mcp.md`
- actualización de documentación estable del repo
- verificación del hash y push del documentation commit
- confirmación del cierre documental

Regla obligatoria para `existing_repo_change`:

`CODE -> COMMIT -> HASH -> PUSH -> DOC`

Para `external_operational_change`, HDOC consume exclusivamente la elegibilidad
y evidencia sustitutiva validadas por Guardian.

No mezclar:

- cambios de código
- Git de escritura
- auditoría técnica propia en reemplazo de Guardian

### Marcelo

Uso:

- conserva las decisiones humanas de avance, pausa o redefinición
- ejecuta exclusivamente todo Git write técnico y documental
- devuelve evidencia real de commit, hash y push

Regla vigente:

`RULE: MARCELO_ONLY_GIT_WRITE`

## Lifecycle base y ramas

Flujo base:

```text
AGPT diseña, clasifica y despacha
→ ejecuta el rol correspondiente
→ se aplican gates según fase y clasificación
→ Marcelo conserva decisiones y Git write
→ Guardian valida y emite HDOC_INPUT cuando corresponde
→ HDOC prepara y valida el cierre documental
→ resultado final retorna a AGPT
```

No es una cadena lineal universal. Arquitectura es on-demand, Guardian no debe
preceder siempre a la implementación y AGPT no se inserta obligatoriamente
entre cada handoff. La interfaz Guardian → HDOC permanece directa cuando el
contrato está satisfecho.

### Rama de análisis

```text
AGPT
→ arquitecto_sistema | arquitecto_kb
→ resultado o dictamen
→ AGPT o siguiente fase definida
```

La rama se usa cuando existe ambigüedad estructural o hace falta análisis
especializado. Arquitectura no es el primer paso universal.

### Implementación directa

```text
AGPT → asistente_tecnico
```

Es una ruta válida cuando la implementación está suficientemente definida y no
requiere análisis arquitectónico previo.

### Preflight opcional y gate pre-commit

Antes de implementar puede solicitarse un preflight read-only de Guardian si
el working tree está mezclado o hace falta inspección previa. No es un paso
universal y no sustituye el gate Guardian pre-commit posterior a la
implementación.

Los términos pre-commit y post-commit describen la posición del gate; no son
estados persistidos ni campos nuevos del contrato.

### Rama existing_repo_change

```text
AGPT
→ asistente_tecnico
→ Guardian pre-commit
→ Marcelo ejecuta technical Git write
→ Guardian post-commit
→ HDOC_INPUT válido
→ HDOC prepara documentación
→ documentation_commit: pending
→ Marcelo ejecuta documentation Git write
→ HDOC verifica hash y push documental
→ HDOC confirma cierre
→ resultado retorna a AGPT
```

Detalle de gates:

1. `asistente_tecnico` implementa, valida y reporta evidencia.
2. Guardian pre-commit audita alcance, diff, clasificación y pureza del hito.
3. Marcelo ejecuta el technical commit y push.
4. Guardian post-commit verifica `technical_commit: present`, `commit_hash`
   real y `technical_push: confirmed`.
5. Sólo con `guardian_verdict: valid` y `ready_for_hdoc: yes` Guardian emite
   `HDOC_INPUT` válido.
6. HDOC prepara la documentación autorizada mientras
   `documentation_commit: pending`.
7. Marcelo ejecuta el Git write documental.
8. HDOC verifica el hash real y push del documentation commit, confirma el
   cierre y devuelve el resultado a AGPT.

### Rama external_operational_change

```text
AGPT autoriza la transición
→ acción externa y evidencia sustitutiva
→ Guardian determina elegibilidad, integridad y rollback
→ technical_commit: not_applicable
→ commit_hash: not_applicable
→ technical_push: not_applicable
→ Guardian emite HDOC_INPUT válido
→ HDOC prepara documentación
→ Marcelo ejecuta Git documental si existe cambio versionado
→ HDOC verifica cierre
→ resultado retorna a AGPT
```

Esta rama no introduce `asistente_tecnico` ni technical commit como pasos
obligatorios. Guardian valida la allowlist, la autorización AGPT, la evidencia
sustitutiva, la integridad del repositorio y el rollback. HDOC consume esa
decisión; no determina elegibilidad.

### Loops mínimos

- `guardian_verdict: invalid` → corrección o redefinición
- `guardian_verdict: split_required` → AGPT divide el alcance
- evidencia insuficiente → no avanzar a HDOC
- ambigüedad estructural → `arquitecto_sistema` o `arquitecto_kb`, según dominio

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

## Runtime Map como gate condicional

Runtime Map aplica únicamente cuando el dominio del cambio lo requiere según
el Operating Model. No es un paso universal del lifecycle.

Cuando aplica, AGPT declara las cajas, riesgos y tests requeridos;
`asistente_tecnico` respeta esa frontera y Guardian la audita en los gates
correspondientes. Esta guía no modifica Runtime Map, sus cajas ni sus
`code_refs`.

## Reglas Duras

- todo `existing_repo_change` exige `technical_commit: present`, `commit_hash`
  real y `technical_push: confirmed`
- technical commit y documentation commit mantienen identidades Git distintas
- `existing_repo_change`: `CODE -> COMMIT -> HASH -> PUSH -> DOC`
- `external_operational_change`: `EXTERNAL_ACTION -> SUBSTITUTE_EVIDENCE -> GUARDIAN -> DOC`
- Marcelo ejecuta manualmente todo Git de escritura
- Guardian valida y emite readiness/veredicto; no decide ni ejecuta Git write
- `repo_guardian` no modifica archivos
- `hdoc` no toca código ni decide elegibilidad
- `asistente_tecnico` no documenta salvo pedido explícito
- `arquitecto_sistema` no mezcla implementación salvo pedido explícito
- `arquitecto_kb` no sustituye a `arquitecto_sistema`
- `pending`, `missing` y `failed` nunca habilitan `ready_for_hdoc: yes`

## Identidad Git por fase

Identidad técnica:

- `technical_commit`
- `commit_hash`
- `technical_push`

Identidad documental:

- `documentation_commit`, que permanece `pending` durante la preparación HDOC
- hash real del documentation commit
- push documental verificado

No se introducen nombres alternativos para `commit_hash` ni campos
contractuales nuevos para el hash o push documental. `baseline_head`, `HEAD`,
`origin/main` y `working_tree_clean` no sustituyen la identidad técnica del
hito.

## Handoff Estándar

Usar este formato para pasar contexto entre agentes:

```text
Hito:
Tipo:
Clasificación del cambio:
Estado:
Objetivo:

technical_commit:
commit_hash:
technical_push:
Archivos afectados:
Validación:
Restricciones:
Contexto mínimo:
guardian_verdict:
ready_for_hdoc:

Fase documental:
documentation_commit:
Hash real del documentation commit:
Push documental:
Próximo paso esperado:
```

`technical_commit` usa `present` o los estados contractuales aplicables;
`commit_hash` usa un hash real o el estado correspondiente; `technical_push`
usa `confirmed` o el estado correspondiente. La identidad documental se
completa después del Git write de Marcelo; su preparación no equivale al
cierre.

## Handoff Corto

Versión mínima:

```text
Hito:
Estado:
Clasificación del cambio:
technical_commit:
commit_hash:
technical_push:
guardian_verdict:
ready_for_hdoc:
Archivos:
Validación:
Paso siguiente:
```

## Ejemplo

```text
Hito: UX-GUESTS-01
Tipo: UX
Clasificación del cambio: existing_repo_change
Estado: resultado técnico auditado y listo para HDOC
Objetivo: reemplazar lenguaje técnico por lenguaje operativo en Guests

technical_commit: present
commit_hash: 84691ad
technical_push: confirmed
guardian_verdict: valid
ready_for_hdoc: yes
Archivos afectados: app/admin/guests/page.tsx
Validación: pnpm run ts-check PASS
Restricciones: no tocar código, solo documentación
Contexto mínimo: Guests->Huéspedes, Merge->Unificar huéspedes, Aliases->Identidades del huésped
documentation_commit: pending
Próximo paso esperado: HDOC prepara la documentación autorizada; después Marcelo ejecuta el Git write documental y HDOC verifica hash/push antes del cierre
```

El ejemplo es ilustrativo y no reemplaza los gates del Operating Model.

## Uso Práctico

Si un `existing_repo_change` todavía no tiene technical commit:

- no pasar a HDOC
- volver a `repo_guardian` o `asistente_tecnico`, según la causa

Si un `existing_repo_change` ya tiene hash real y push confirmado:

- volver a Guardian post-commit
- verificar `technical_commit: present`, `commit_hash` real y
  `technical_push: confirmed`
- exigir `guardian_verdict: valid` y `ready_for_hdoc: yes`
- emitir `HDOC_INPUT` válido antes de pasar a `hdoc`

Cuando HDOC termina de preparar documentación:

- mantener `documentation_commit: pending` hasta el Git write de Marcelo
- obtener el hash real del documentation commit
- verificar el push documental
- confirmar el cierre en HDOC
- retornar el resultado a AGPT

Si un `external_operational_change` tiene evidencia sustitutiva completa pero
Guardian aún no emitió `guardian_verdict: valid` y `ready_for_hdoc: yes`:

- no pasar a HDOC
- volver a `repo_guardian`

Si el working tree tiene mezcla:

- detener cierre de commit
- solicitar preflight read-only de `repo_guardian`

Si Guardian devuelve `invalid`, corregir o redefinir. Si devuelve
`split_required`, AGPT divide el alcance. Si existe ambigüedad estructural,
AGPT despacha al arquitecto correspondiente.
