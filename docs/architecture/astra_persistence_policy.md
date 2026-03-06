# Politica Astra Persistence (Begasist)

Fecha: 2026-03-06  
Estado: vigente

## Decision

Begasist separa la persistencia Astra en dos capas:

1. Capa operacional SaaS
2. Capa KB / retrieval

## 1) Capa operacional SaaS

Caracteristicas:

- global
- multihotel
- entidades compartidas
- particion logica por `hotelId`

Politica:

- Las entidades estables deben modelarse preferentemente como **Tables (CQL)**.
- Evitar **Collections** cuando no se necesita vector search ni flexibilidad documental.

Motivo tecnico:

- Reducir crecimiento de indices automaticos de Collections.
- Optimizar lookups deterministas.

Ejemplos operacionales:

- `messages`
- `guests`
- `guest_aliases`
- `hotel_config`

## 2) Capa KB / retrieval

Caracteristicas:

- base de conocimiento vectorial
- separacion por hotel

Implementacion actual:

- una coleccion vectorial por hotel

Ejemplos:

- `hotel999_collection`
- `hotel123_collection`

## Politica de escalado fisico KB

No se fija aun una politica definitiva de particion fisica de KB.
Todavia no se establecen multiples keyspaces, bloques hotel1..hotel10 ni clusters separados.

Esta decision se posterga hasta tener presion real de escala o limites operativos.

Regla de diseno:

- La logica del sistema no debe acoplarse a un keyspace o coleccion fija.
- Preparar una abstraccion de ubicacion fisica de KB.

## Caso especifico: `guest_aliases`

`guest_aliases` pertenece a la capa operacional SaaS.

Definicion:

- entidad global
- multihotel
- aislamiento logico por `hotelId`

Implementacion recomendada:

- **Table (CQL)**

Motivos:

- estructura estable
- no requiere vector search
- no requiere flexibilidad documental
- evita consumo adicional de indices de Collections
- lookup natural por `hotelId + alias`

## Estado operativo actual

El uso de `hotel999_collection` (demo/tests) y `hotel123_collection` (primer hotel real) es valido en la etapa actual.
Eso no define la politica final de escalado fisico de KB.
