# Pipeline Runtime Evolution

## Context

El pipeline conversacional de Begasist fue concebido originalmente como un
sistema `graph-centric`, donde el grafo de agentes sería el orquestador
principal del flujo conversacional.

En ese modelo:

```text
Channels -> messageHandler -> Graph -> Domain Nodes
```

`messageHandler` actuaba principalmente como un adaptador entre el mundo de
transporte (canales) y el mundo de agentes.

## Arquitectura emergente

Durante la evolución del sistema, la lógica operativa se concentró
progresivamente en `messageHandler`.

Esto ocurrió porque el punto de entrada del sistema es naturalmente el lugar
donde se resuelven necesidades operativas como:

- heurísticas textuales
- fast-paths de negocio
- fallback de conocimiento
- composición de respuesta
- persistencia
- supervisión
- estado conversacional

Como resultado, el runtime efectivo del sistema evolucionó hacia un modelo
distinto:

```text
Channels -> handleChannelMessage -> messageHandler -> graph -> nodes
```

En este modelo:

- `messageHandler` actúa como runtime conversacional central
- el grafo funciona como motor de interpretación y routing de intención
- los nodos ejecutan lógica de dominio específica

## Patrón arquitectónico emergente

La arquitectura actual puede describirse como:

**Conversational Runtime with Embedded Intent Engine**

o en castellano:

**Runtime conversacional con motor de intenciones embebido**

Este patrón se compone de tres capas principales:

- Runtime Orchestrator
- Intent Engine
- Domain Executors

En Begasist:

- Runtime Orchestrator -> `messageHandler`
- Intent Engine -> `graph.ts`, `classifier`, `policy`
- Domain Executors -> nodos de dominio (`reservation`, `retrieval`, etc.)

## Comparación de modelos

| Aspecto | Diseño original | Arquitectura actual | Dirección futura posible |
|--------|----------------|--------------------|-------------------------|
| Centro de gravedad | Graph | messageHandler | Flow runtime |
| Orquestación | Graph | messageHandler | mhFlowGraph |
| Routing de intención | Graph | Graph + policy | Flow nodes |
| Persistencia | downstream | coordinada por runtime | fase de finalización |
| Composición de respuesta | dentro del flujo | runtime central | nodo final |

## Relación con ADR-PIPELINE-RUNTIME-TARGET

Este análisis contextualiza la decisión registrada en:

`ADR-PIPELINE-RUNTIME-TARGET`

La ADR concluye que:

- el runtime principal debe seguir evolucionando sobre `messageHandler`
- `mhFlowGraph` queda como candidato futuro condicionado
- la migración no debe realizarse todavía

Esta decisión reconoce explícitamente el centro de gravedad actual del sistema.

## Conclusión

Begasist evolucionó desde un diseño `graph-centric` hacia un modelo
`runtime-centric`, donde `messageHandler` gobierna el pipeline conversacional.

El grafo continúa siendo una pieza clave del sistema, pero hoy funciona
principalmente como motor de interpretación de intención, no como runtime
completo.

Esta evolución no representa un error de diseño, sino una adaptación pragmática
a las necesidades operativas del sistema.

Mantener esta observación documentada permite:

- entender mejor la arquitectura actual
- guiar refactors futuros
- preparar eventualmente una migración hacia un runtime declarativo basado en
  flujos
