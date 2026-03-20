# Chat Naming Standard

Este documento define la convención normativa para nombrar chats de trabajo en
Begasist.

Objetivo:

- mantener separación por dominio
- facilitar handoff entre agentes
- reducir ambigüedad al abrir nuevos chats

## Formato

Todo nombre de chat debe seguir este patrón:

```text
<DOMINIO>-<SUBDOMINIO>-<NN>
```

Reglas:

- `DOMINIO` va en mayúsculas
- `SUBDOMINIO` va en mayúsculas
- `NN` es numérico de dos dígitos
- usar `-01` para el primer chat estable de un dominio/subdominio
- incrementar a `-02`, `-03`, etc. cuando el chat se satura o cambia de fase

## Dominios permitidos

| DOMINIO  | USO |
| -------- | --- |
| PIPELINE | runtime conversacional y lógica central |
| KB | knowledge base |
| MCP | reservas y channel manager |
| CHANNELS | entradas y salidas por canal |
| ADMIN | panel administrativo |
| DATA | persistencia y esquema |
| AUTH | usuarios y seguridad |
| GIT | disciplina de repositorio e hitos |
| ARCH | arquitectura global |

## Subdominios base

| DOMINIO | SUBDOMINIOS |
| ------- | ----------- |
| PIPELINE | CORE, CLASSIFICATION, FOLLOWUPS, STATE, HEURISTICS |
| KB | TOKENS, TEMPLATES, HYDRATION, QA |
| MCP | RESERVATIONS, ADAPTER, TESTS |
| CHANNELS | WEB, EMAIL, WHATSAPP, PARSING |
| ADMIN | UI, GUESTS, USERS, CHANNELS |
| DATA | ASTRA, VECTOR, SCHEMA |
| AUTH | LOGIN, TOKENS, VERIFICATION |
| GIT | DISCIPLINE, HITOS, COMMITS |
| ARCH | SYSTEM, ADR, ROADMAP |

## Reglas de uso

- un chat debe corresponder a un solo dominio principal
- no mezclar en el mismo chat trabajo de `PIPELINE`, `KB` y `MCP`
- si cambia el objetivo técnico de forma material, abrir nueva numeración
- si el nombre no puede explicarse en una sola frase, el alcance está mal
- el nombre normativo debe ser consistente con [channel_map.md](/home/marcelo/begasist/docs/architecture/channel_map.md) cuando exista una entrada base

## Ejemplos válidos

- `PIPELINE-CORE-01`
- `MCP-RESERVATIONS-01`
- `GIT-HITOS-01`
- `ARCH-SYSTEM-01`

## Ejemplos inválidos

- `CHAT-GENERAL`
- `TESTING`
- `COSAS-VARIAS`
- `PIPELINE-KB-MCP-01`

## Template mínimo de inicio

```text
CONTEXTO — BEGASIST

Dominio: [PIPELINE-CORE]

Estado actual:
- [bullet 1]
- [bullet 2]
- [bullet 3]

Hito relacionado:
[HITO-XXXX]

Objetivo:
[qué querés lograr]

Restricciones:
- mantener compatibilidad
- no romper pipeline
- respetar estructura actual

Tarea:
[lo que querés que haga el agente]
```
