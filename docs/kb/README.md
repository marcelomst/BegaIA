# Guía de Ingesta de Conocimiento (RAG)

Este documento explica cómo preparar y cargar conocimiento del hotel (por ejemplo, horarios de check‑in) en el sistema para que el asistente responda correctamente.

## Opción recomendada: carga guiada desde el Admin

Para operadores (sin scripts ni acceso a código), usá la página:

- Admin → Conocimiento → Subir documentos (ruta: `/admin/upload`)

Ahí tenés dos formas:

1. Subir archivos PDF/TXT

- Arrastrá y soltá un PDF o TXT con la política/tema.
- Completá “Categoría sugerida” y “Descripción” (opcional).
- El sistema convierte PDF→texto, limpia y detecta idioma, clasifica, genera embeddings y versiona automáticamente.

2. Crear documento simple (texto)

- Usá la sección “Crear documento simple”.
- Poné un Título (ej.: “Check-in y Check-out – Horarios”).
- Pegá el Contenido en texto plano (viñetas). Hay un atajo de plantilla para check-in/out.
- Click en “Crear y subir”. Se procesa igual que un TXT subido.

Sugerencias:

- Guardá contenido conciso y factual (horarios, montos, reglas). Evitá marketing.
- Si el contenido es para el playbook interno (System), indicá el Prompt Key cuando corresponda.
- Tras subir, probá en el chat del Admin que la respuesta sea correcta.

## Estructura de carpetas

Ubicá los archivos Markdown en:

- `kb/{hotelId}/{category}/{audience}/{lang}/file_vX.md`

Donde:

- `hotelId`: p. ej., `hotel999`
- `category`: una de `reservation | cancellation | amenities | billing | support | general`
- `audience`: `guest | staff | both`
- `lang`: `es | en | pt`
- `file_vX.md`: el nombre debe incluir sufijo de versión como `_v1.md`, `_v2.md`, etc.

Ejemplos:

- `kb/hotel999/billing/guest/en/invoice_uy_v2.md`
- `kb/hotel999/amenities/guest/es/piscina_v3.md`

## Frontmatter (metadatos)

Al inicio de cada Markdown, incluí frontmatter YAML:

```
---
title: "Check-in y Check-out – Horarios"
version: 1
valid_from: 2025-10-01
audience: guest
jurisdiction: [UY]
tags: [check-in, check-out, horarios]
---
```

Notas:

- `version`: número o `vN`. Si se omite, se deriva del nombre del archivo `_vN.md`.
- `audience`: por defecto es `both` si no se especifica.
- `tags`, `jurisdiction` son opcionales pero útiles para filtrar/auditar.

## Guía de contenido (preparación humana)

- Enfocá cada documento en un solo tema (ej.: “Horarios de check‑in”).
- Usá viñetas y oraciones cortas.
- Incluí números y rangos horarios explícitos cuando aplique.
- Para multi‑idioma, creá un archivo por idioma bajo la carpeta `/{lang}/` correspondiente.
- Si una política varía por temporada o jurisdicción, aclaralo y/o usá tags como `season:winter`.

Contenido de ejemplo:

```
- Check-in: 15:00–23:00.
- Check-out: hasta las 11:00.
- Early check-in sujeto a disponibilidad (cargo adicional).
```

## Comandos de ingesta

- Ingesta simple (verifica lectura de archivos):
  - `pnpm run kb:ingest`
- Ingesta para un hotel específico (usa la env HOTEL_ID):
  - `HOTEL_ID=hotel999 pnpm run kb:ingest:hotel`
- Flujo típico wipe + reingesta + export:
  - `pnpm run kb:smoke`

Qué hace:

- Lee `kb/{HOTEL_ID}/**/*.md`.
- Parsea frontmatter + ruta y normaliza metadatos.
- Divide el contenido en chunks de ~700 caracteres con 100 de solapamiento.
- Embebe cada chunk e inserta en la colección Astra del hotel.

Nota: La carga por Admin (PDF/TXT o documento simple) dispara el mismo pipeline (limpieza, detección, clasificación, embeddings y versionado) sin necesidad de usar estos comandos.

## Ayuda rápida de categorías

- `reservation`: disponibilidad, tipos de habitación, ocupación.
- `cancellation`: políticas de cancelación y modificación.
- `amenities`: piscina, gimnasio, desayuno, estacionamiento.
- `billing`: facturación, RUT, medios de pago.
- `support`: contacto, handoff, asistencia especial.
- `general`: reglas de casa u otros temas no cubiertos arriba.

## Agregar ahora los horarios de check‑in

Opción A (rápida, sin archivos):

- En `/admin/upload` usá “Crear documento simple”.
- Título: “Check-in y Check-out – Horarios”.
- Contenido sugerido:

```
- Check-in: 15:00–23:00.
- Check-out: hasta las 11:00.
- Early check-in sujeto a disponibilidad (cargo adicional).
```

Subí y luego probá en el chat: “¿a qué hora es el check‑in?”

Opción B (archivos Markdown en repositorio):

Creá el archivo:

- `kb/hotel999/general/guest/es/checkin_checkout_v1.md`

Con contenido:

```
---
title: "Check-in y Check-out – Horarios"
version: 1
audience: guest
jurisdiction: [UY]
tags: [check-in, check-out, horarios]
---

- Check-in: 15:00–23:00.
- Check-out: hasta las 11:00.
- Early check-in sujeto a disponibilidad (cargo adicional).
```

Luego ejecutá la ingesta para el hotel:

- `HOTEL_ID=hotel999 pnpm run kb:ingest:hotel`

## Resolución de problemas

- No se encuentran archivos: verificá la ruta `kb/{hotelId}/...` y el uso de `_vN.md` o `version` en frontmatter.
- Error de idioma: la carpeta debe ser `es`, `en` o `pt`.
- Categoría inválida: asegurate que el segundo segmento coincide con las categorías permitidas.
- Falta la API key de embeddings: configurá `OPENAI_API_KEY` en `.env`.

## Checklist para operadores (no técnicos)

1. Entrá a `/admin/upload`.
2. Elegí si vas a subir un PDF/TXT o crear un documento simple.
3. Completá Título, Contenido y (opcional) Categoría/Descripción.
4. Subí y esperá confirmación de versión.
5. Probá en el chat: “¿a qué hora es el check‑in?”
6. Si la respuesta no es correcta, ajustá el texto y volvé a subir. El sistema versiona automáticamente.
