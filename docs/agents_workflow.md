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
- disciplina `1 commit = 1 hito`

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

Regla obligatoria:

`CODE -> COMMIT -> HASH -> DOC`

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
   - confirma si el hito puede cerrarse como commit único

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
   - documenta solo después de commit + hash real
   - propone la secuencia Git documental si corresponde

## Reglas Duras

- `1 commit = 1 hito`
- `CODE -> COMMIT -> HASH -> DOC`
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

Si un hito todavía no tiene commit técnico:

- no pasar a HDOC
- volver a `Repo Guardian` o `Técnico`

Si un hito ya tiene hash real:

- pasar a `HDOC`
- registrar cierre documental

Si el working tree tiene mezcla:

- detener cierre de commit
- volver a `Repo Guardian`
