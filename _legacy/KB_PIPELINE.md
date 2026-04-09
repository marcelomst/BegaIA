# 🧠 KB Pipeline (Hotel Assistant)

Guía rápida, identificable y centralizada para operar el ciclo de vida del Conocimiento (Knowledge Base) por hotel.

> Política base: NO se crean colecciones automáticamente. Deben existir: `hotel_content`, `hotel_text_collection`, `hotel_version_index`, `category_registry`, `category_overrides`, y la vector `${hotelId}_collection`.

## 🔁 Flujo Manual Recomendado

1. Reset (opcional, deja todo vacío)
2. Scaffold (generar archivos desde `hotelConfig`)
3. Preview (ver qué se va a ingestar)
4. Ingest (subir contenido + embeddings)
5. Inspect / Export (auditar resultado)
6. Opcional: Reseed automatizado (reset + scaffold + ingest)

## 🚀 Comandos Principales

Todos se ejecutan con `pnpm run <script>` desde el root.

| Objetivo                              | Dry-run                    | Ejecutar                         | Notas                                     |
| ------------------------------------- | -------------------------- | -------------------------------- | ----------------------------------------- |
| Reset completo (vector + tablas)      | `kb:reset --hotel <id>`    | `kb:reset:apply --hotel <id>`    | No toca estructura                        |
| Wipe solo vector                      | `kb:wipe`                  | `kb:wipe:apply`                  | Usa `HOTEL_ID` env o default hotel999     |
| Wipe todo (igual a reset antiguo)     | `kb:wipe:all --hotel <id>` | `kb:wipe:all:apply --hotel <id>` | Mantiene fallback row-wise                |
| Scaffold desde profile (archivo JSON) | (no dry-run design)        | `kb:scaffold`                    | Ver uso interno en script (requiere ruta) |
| Ingest KB (manual)                    | `kb:ingest`                | `kb:ingest:hotel`                | Para hotel999 vía env var                 |
| Inspect estado                        | `kb:inspect --hotel <id>`  | (solo lectura)                   | Lista contenidos / versiones              |
| Export archivos                       | `kb:export --hotel <id>`   | (solo export)                    | Genera dump de contenido actual           |
| Smoke end-to-end                      | —                          | `kb:smoke`                       | Wipe + ingest + export (hotel999)         |
| Reseed (reset + scaffold + ingest)    | `kb:reseed --hotel <id>`   | `kb:reseed:apply --hotel <id>`   | Opción `--auto-enrich`                    |

## 🛠 Detalle de Scripts Clave

### `reset-hotel-kb.ts`

Elimina todos los datos del hotel en: vector `${hotelId}_collection`, tablas CQL (`hotel_text_collection`, `hotel_content`, `hotel_version_index`). No borra colecciones.

### `reseed-hotel-kb.ts`

Pipeline automático: reset → generar `Profile` desde `hotelConfig` → (auto-enrich opcional) → producir archivos en memoria → ingest (chunks, embeddings, `hotel_content`, índice de versión).  
Dry-run muestra primera lista de archivos sin modificar datos.

### `generate-kb-from-profile.ts`

Entrada: archivo JSON con estructura `Profile`. Opcional `--auto-enrich` (LLM) para airports/transport/attractions. Salida: archivos `category/promptKey.lang.txt` bajo `docs/kb/<hotelId>/`.

### Indexado de Versiones

`hotel_version_index` ahora ignora `currentId/lastId`; lookup se basa en `(hotelId, category, promptKey, lang, currentVersion)`. Primer ingest → `currentVersion = v1`, `lastVersion = null`.

## 🧪 Pipeline Manual Paso a Paso

Ejemplo (hotel999):

```bash
# 1. Reset limpio
pnpm run kb:reset:apply --hotel hotel999

# 2. Preview reseed (ver archivos generados)
pnpm run kb:reseed --hotel hotel999 --auto-enrich

# 3. Ingestar todo
pnpm run kb:reseed:apply --hotel hotel999 --auto-enrich

# 4. Inspeccionar
pnpm run kb:inspect --hotel hotel999

# 5. Exportar
pnpm run kb:export --hotel hotel999
```

## 🔍 Verificación Rápida Post-Ingesta

1. `kb:inspect` muestra cada categoría con `version: v1`.
2. Vector `${hotelId}_collection` tiene embeddings (count > 0).
3. `hotel_text_collection` contiene originalName + version v1.
4. `hotel_version_index` filas con `currentVersion: v1`, `lastVersion: null`.

## ⚠️ Errores Comunes

- Falta colección vectorial: crear manualmente antes de ingest / reseed.
- Versiones incrementadas inesperadas: ocurre si índice conserva ingest previas → usar reset.
- IDs nulos en índice: diseño actual sin dependencia de `_id` (esperado).
- Auto-enrich falla silenciosamente: se mantiene perfil base; revisar logs si se requiere.

## 📦 Extensión Futura

- Añadir `kb:reseed:smoke` (reseed + inspect + export).
- Migrar índice para soportar `contentUuid` si se necesita trazabilidad precisa.
- Dashboard de categorías y overrides usando `category_registry` + `category_overrides`.

## ✅ Checklist Antes de Reseed

- Colecciones existentes.
- `ADMIN_API_KEY` configurada si se usará endpoint directo.
- `hotelConfig` actualizado (rooms, amenities, policies).
- Opcional: decidir uso de `--auto-enrich`.

---

Documentación rápida añadida en `KB_PIPELINE.md` para visibilidad inmediata.
