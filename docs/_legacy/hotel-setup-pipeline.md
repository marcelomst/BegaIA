# Pipeline de Setup Completo de un Hotel

> Objetivo: Partir de un `hotelId` nuevo (o mínimo) y dejarlo listo para operación: contenido base, categorías, KB, ingestión vectorial, verificación de retrieval y funcionamiento del widget/web.

## Fases

1. Variables y entorno
2. Configuración del hotel (HotelConfig)
3. Registro de categorías (Category Registry)
4. Scaffold/Generación de KB textual base
5. Ingesta KB a Astra (vector + original)
6. Seed de contenido canónico `kb_general`
7. Indexado / versionado
8. Verificación de retrieval y hydration
9. Pruebas automáticas (suite parcial)
10. Validaciones manuales (Admin + Widget)
11. Observabilidad (logs mínimos)
12. Limpieza / Re-ejecución idempotente

---

## Checklist Paso a Paso

### 1. Entorno

- [ ] `.env` con credenciales Astra y OPENAI (si retrieval/embeddings) `ASTRA_DB_ID`, `ASTRA_DB_APPLICATION_TOKEN`, `OPENAI_API_KEY`.
- [ ] `pnpm install` sin errores.
- [ ] `pnpm run ts-check` sin errores de tipos.

### 2. Crear/Verificar HotelConfig

```bash
pnpm exec tsx scripts/init-config.ts --hotelId=hotelXYZ
```

Criterio éxito: aparece documento en colección `hotel_config` con campos mínimos (`hotelId`, `hotelName`, `defaultLanguage`, `channelConfigs`).

### 3. Sembrar Categorías Base

```bash
pnpm run kb:categories:seed:apply --hotelId=hotelXYZ
```

Criterio éxito: colección `category_registry` contiene entradas esperadas (`retrieval_based`, `playbook_*`, etc.).

### 4. Generar KB desde Perfil (opcional / enriquecido)

Si existe perfil/hotel profile:

```bash
HOTEL_ID=hotelXYZ pnpm run kb:scaffold
```

Criterio: archivos generados en carpeta de salida (según script) y preview legible.

### 5. Ingesta KB a Astra (vector + originales)

```bash
HOTEL_ID=hotelXYZ pnpm run kb:ingest
```

Criterio: colección vectorial del hotelXYZ creada, embeddings insertados, logs muestran cantidad de chunks > 0.

### 6. Seed de Contenido Canónico General

```bash
pnpm exec tsx scripts/seed-hotel-content-from-config.ts --hotelId=hotelXYZ
```

Criterio: documento `kb_general` en colección `hotel_content` con `category="retrieval_based"` y `promptKey="kb_general"`.

### 7. Verificar Indexado / Versionado

- [ ] Documento correspondiente en `hotel_version_index` (si aplica automáticamente en upsert).
- [ ] `currentVersion` coincide con `versionTag`.

### 8. Verificación Retrieval / Hydration

Script/manual:

```bash
pnpm exec tsx scripts/inspect-hotel-kb.ts --hotelId=hotelXYZ --query "wifi" --lang es
```

Criterio: Devuelve arreglo string[] con fragmentos relevantes.
Probar endpoint (si existe):

```bash
curl -s "http://localhost:3000/api/hotel-content/get?hotelId=hotelXYZ&promptKey=kb_general&category=retrieval_based&lang=es" | jq
```

Criterio: `hydrated.body` contiene valores reales (nombre, dirección, horarios).

### 9. Pruebas Automáticas Parciales

- [ ] Ejecutar suite completa:

```bash
pnpm test:run
```

- [ ] O ejecutar subset relevante (KB + retrieval):

```bash
vitest run test/kb/* test/unit/retrieval.*.test.ts
```

Criterio: 0 fallos.

### 10. Validaciones Manuales

- [ ] Abrir Admin `/admin/kb/templates`: listar plantillas, ver preview hidratada.
- [ ] Botón “Re-hidratar” actualiza vista.
- [ ] Chat Widget (demo): inicia conversación, detecta idioma, responde sin error.

```bash
npx http-server ./examples/hotel-demo -p 8081 -a 127.0.0.1 --cors -c-1
```

- [ ] Reiniciar conversación borra `localStorage` y genera nuevo `conversationId`.

### 11. Observabilidad Mínima

- [ ] Logs de seed muestran `created: true` o `created: false` (upsert idempotente).
- [ ] No hay errores de conexión Astra.
- [ ] (Opcional) Activar verbose retrieval para diagnóstico.

### 12. Limpieza / Re-ejecución

- [ ] Wipe (solo desarrollo):

```bash
pnpm run kb:wipe:apply --hotelId=hotelXYZ
```

- [ ] Re-ingesta tras wipe reproduce estado sin inconsistencias.

---

## Diseño de Pruebas Automáticas (Gap Analysis)

| Área                        | Test Existente | Gap                                | Acción Propuesta                                                      |
| --------------------------- | -------------- | ---------------------------------- | --------------------------------------------------------------------- |
| Seed `kb_general`           | No             | Falta validar contenido generado   | Añadir test que mockee HotelConfig y verifique body y type="standard" |
| Retrieval `searchFromAstra` | Sí             | —                                  | Mantener                                                              |
| Hydration endpoint          | Parcial        | Validar campos contactos/schedules | Añadir test GET y asserts claves                                      |
| Version index               | No             | Sin verificación directa           | Test consulta tras upsert y compara versiones                         |
| Widget config               | No             | Smoke test integrando script       | Test e2e montando página en jsdom + config básica                     |

### Nuevo Test Sugerido (Ejemplo)

Archivo: `test/kb/hotelContentSeed.test.ts`

- Mock de `getHotelConfig` retornando un objeto completo.
- Llamar `ensureDefaultHotelContentFromConfig("hotelXYZ")`.
- Verificar: category, promptKey, type="standard", body contiene secciones `## Horarios`.

---

## Pruebas Manuales Detalladas

1. Abrir Admin → Plantilla `kb_general` muestra datos correctos (nombre, dirección, horarios).
2. Cambiar `hotelName` en DB y re-seed → actualizar body sin duplicados.
3. Widget: enviar "hola" → respuesta en el idioma por defecto; cambiar localStorage `lang` (si implementado) y recargar para fallback.
4. Retrieval: preguntar por "desayuno" → chunk devuelto contiene horario en body.

---

## Scripts npm Propuestos

Agregar al `package.json`:

```json
"hotel:setup": "pnpm run kb:categories:seed:apply && HOTEL_ID=$HOTEL_ID pnpm run kb:scaffold && HOTEL_ID=$HOTEL_ID pnpm run kb:ingest && tsx scripts/seed-hotel-content-from-config.ts --hotelId=$HOTEL_ID",
"hotel:setup:bare": "pnpm run kb:categories:seed:apply && tsx scripts/seed-hotel-content-from-config.ts --hotelId=$HOTEL_ID",
"hotel:verify": "vitest run test/kb/hotelContentSeed.test.ts"
```

Uso:

```bash
HOTEL_ID=hotelXYZ pnpm run hotel:setup
HOTEL_ID=hotelXYZ pnpm run hotel:verify
```

---

## Criterios de Éxito Final

- Seed idempotente: segunda ejecución no rompe body ni duplica.
- Retrieval encuentra chunks >0 para consultas básicas (wifi, desayuno, check-in).
- Hydration endpoint entrega `hydrated.body` sin tokens crudos.
- Todas las pruebas verdes.
- Widget funcional y conversation reset OK.

---

## Próximas Extensiones

- Validación multi-idioma (scaffold es/en/pt).
- Cálculo automático de slugs de amenities y verificación de normalización.
- Integración orquestada con LangGraph para agentes en lugar de pipeline legacy.

---

Fin del documento.
