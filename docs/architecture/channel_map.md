# Channel Map

Este documento define el mapa operativo minimo entre dominios de chat,
agentes responsables y uso esperado dentro de Begasist.

Objetivo:

- reducir ambiguedad al abrir chats nuevos
- mantener separacion de dominios
- facilitar handoff entre arquitectura, implementacion y disciplina

## Reglas de uso

- `CHAT-NORM-NAME` es el nombre normativo que debe seguir la convencion
  `<DOMINIO>-<SUBDOMINIO>-<NN>`
- `AGENT` identifica el agente principal esperado para ese chat
- `USO-ESPERADO` describe el tipo de trabajo que corresponde a ese canal
- este mapa define destinos base; no reemplaza el criterio de hito ni la
  revision de alcance
- si un trabajo mezcla dominios, se debe dividir antes de abrir o continuar el
  chat

## Mapa base

| CHAT-NORM-NAME      | AGENT                | USO-ESPERADO                             | CHAT-REAL-NAME                        |
| ------------------- | -------------------- | ---------------------------------------- | ------------------------------------- |
| ARCH-SYSTEM-01      | arquitecto_sistema   | Hallazgos y decisiones de arquitectura   | Reportar hallazgos de arquitectura    |
| PIPELINE-CORE-01    | asistente_tecnico    | Runtime central, handlers y reservas     | Documentar hallazgos PIPELINE-CORE-1  |
| GIT-DISCIPLINE-01   | repo_guardian        | Alcance de commit y disciplina Git       | Refuerza disciplina Git               |
| GIT-HITOS-01        | hdoc                 | Cierre documental y trazabilidad         | Emitir estado hito Begasist           |
| ------------------- | -------------------- | ---------------------------------------- | ------------------------------------- |

### Sintesis Mapa con nombres reales de chats asignados por Codex para visualizacion

| AGENT                | CHAT-REAL-NAME                        |
| -------------------- | ------------------------------------- |
| arquitecto_sistema   | Adopta rol arquitecto sistema         |
| asistente_tecnico    | Documentar hallazgos PIPELINE-CORE-1  |
| repo_guardian        | Refuerza disciplina Git               |
| hdoc                 | Emitir estado hito Begasist           |
| -------------------- | ------------------------------------- |

## Criterio de alta

Agregar una nueva fila solo si:

- aparece un dominio recurrente no cubierto por el mapa actual
- el chat requiere un agente principal distinto
- el nuevo nombre puede mantenerse estable en el tiempo

## Criterio de mantenimiento

- actualizar este documento cuando cambie la convencion de naming
- actualizarlo cuando cambie la asignacion principal de un agente
- no usar este archivo para listar conversaciones temporales o ad hoc
