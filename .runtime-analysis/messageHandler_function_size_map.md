# messageHandler function size map

Archivo: `lib/handlers/messageHandler.ts`  
Baseline formal aplicado: `e67ba49`  
Líneas totales: 11683

> Este mapa de tamaños queda anclado a las fuentes formales del Runtime Map V1.
> Los scans automáticos por llaves `{}` sirven como apoyo, pero no prevalecen sobre
> `00-snapshot.md`, `00-code-index.md` y `01-phase-1-evidence-summary.md`.

---

## 1. Funciones clave vigentes

| Nombre | Rango | Líneas | Fuente |
| --- | ---: | ---: | --- |
| `buildReservationCanonicalState` | L1950-L2450 | 501 | `00-code-index.md` |
| `resolveReservationReference` | L2451-L2790 | 340 | `00-code-index.md` |
| `detectDominantTurnDomain` | L2791-L3074 | 284 | `00-code-index.md` |
| `getReservationDomainLockSignal` | L3075-L3246 | 172 | `00-code-index.md` |
| `shouldUseReservationLocalFallback` | L3247-L3299 | 53 | `00-code-index.md` |
| `buildReservationLocalFallbackReply` | L3300-L3436 | 137 | `00-code-index.md` |
| `assessReservationDateCoherence` | L3437-L3916 | 480 | `00-code-index.md` |
| `tryStructuredAnalyze` | L3917-L4105 | 189 | `00-code-index.md` |
| `preLLM` | L4106-L4348 | 243 | `00-code-index.md` |
| `bodyLLM` | L4861-L11313 | 6453 | `00-code-index.md` |
| `posLLM` | L11314-L11358 | 45 | `00-code-index.md` |
| `handleIncomingMessage` | L11359-L11683 | 325 | `00-code-index.md` |

---

## 2. Proporción de macro-bloques

| Zona | Rango | Líneas | Lectura |
| --- | ---: | ---: | --- |
| `messageHandler.ts` completo | L1-L11683 | 11683 | Runtime conversacional principal |
| `bodyLLM` | L4861-L11313 | 6453 | Sub-runtime dominante |
| `preLLM + bodyLLM + posLLM` | L4106-L11358 | 7253 | Núcleo operacional del runtime |
| `handleIncomingMessage` | L11359-L11683 | 325 | Frontera pública de entrada |

---

## 3. Lectura rápida

```text
messageHandler.ts sigue teniendo una concentración operacional muy alta en bodyLLM.

bodyLLM no es una función grande incidental:
es la zona dominante del runtime actual.

Los rangos exactos de este archivo deben leerse junto con:
- .runtime-analysis/runtime-map-v1/00-snapshot.md
- .runtime-analysis/runtime-map-v1/00-code-index.md
- .runtime-analysis/runtime-map-v1/01-phase-1-evidence-summary.md
```

---

## 4. Nota metodológica

```text
Los scripts de scan basados en matching de llaves pueden subestimar o sobreestimar
funciones grandes y helpers anidados.

Por eso:
- box_id = estable
- code_refs = recalculables
- la fuente formal para rangos vigentes es el Runtime Map V1 refreshado
```
