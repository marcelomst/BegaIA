# Root Legacy Docs

Esta carpeta contiene documentos históricos que estaban en la raíz del repo y
que ya no deben leerse como fuente principal del proyecto.

## Qué entra acá

- README viejos auxiliares
- notas tácticas o borradores
- guías de una etapa anterior
- documentos técnicos que no gobiernan el estado actual

## Qué no entra acá

- `README.md`
  - entrypoint vigente del proyecto
- `hito_mcp.md`
  - registro histórico activo de hitos
- documentación viva bajo `docs/`

## Regla de uso

Si un documento de esta carpeta contradice:

- `README.md`
- `docs/README.md`
- `docs/product/*`
- `docs/architecture/*`
- `docs/development/*`

entonces la referencia válida es la documentación vigente fuera de `_legacy/`.

## Propósito

Conservar trazabilidad sin dejar documentos desactualizados mezclados con la
entrada principal del proyecto.
