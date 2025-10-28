# Guía rápida para operadores — Documentos de Conocimiento (ES/EN/PT)

Objetivo: crear bases de conocimiento consistentes, bilingües o tri‑idioma, listas para ingestión y clasificación, sin copiar texto literal.

## 1) Estructura recomendada

- Plantillas: `knowledge_docs/templates/`
  - `hotel-knowledge-template.es.txt` (solo ES)
  - `hotel-knowledge-template.es-en.txt` (ES/EN)
  - `hotel-knowledge-template.es-en-pt.txt` (ES/EN/PT)
- Casos reales: `knowledge_docs/`
  - `hotel-<slug>-knowledge.es.txt`
  - `hotel-<slug>-knowledge.en.txt`
  - `hotel-<slug>-knowledge.pt.txt`
  - Opcional: `*.textonly.<lang>.txt` para ingestión directa

## 2) Flujo paso a paso

1. Crear copias de la plantilla (ES/EN o ES/EN/PT) y renombrar con el slug del hotel.
2. Completar solo con información pública. Reescribir; no copiar literal.
3. Marcar con "?" lo que no esté confirmado (p. ej., políticas, horarios, estacionamiento).
4. Registrar fuentes (URLs) y fecha de preparación.
5. Completar los "Resúmenes por categoría" y el "Entity Map" (amenities, camas, m², vistas).
6. Generar versión `textonly` si tu pipeline la requiere.
7. Ejecutar el validador para detectar pendientes y finalizar el QA.

## 3) Validador de pendientes `?`

- Ejecutar:
  - Modo normal: pnpm run validate:knowledge
  - Modo estricto (incluye TODO/FIXME/TBD): pnpm run validate:knowledge:strict
- Resultado:
  - PASS: no hay "?" en archivos .txt de `knowledge_docs/`
  - FAIL: lista archivos y líneas con pendientes
- Opciones avanzadas (desde node):
  - `node scripts/validate-knowledge.js --pattern "hotel-*-knowledge.*.txt"`
  - `node scripts/validate-knowledge.js --no-fail` (no falla el proceso)
  - `node scripts/validate-knowledge.cjs --include-templates` (incluye plantillas)
  - `node scripts/validate-knowledge.cjs --check-faq` (incluye preguntas de FAQs)

## 4) Buenas prácticas

- Mantener consistencia entre ES/EN/PT (mismo contenido factual).
- Evitar ambigüedades: usar m² aproximados cuando el sitio los indique.
- Para datos sensibles (teléfono/dirección) solo incluir si están públicos en texto.
- No fijar tarifas: indicar que varían por fecha y disponibilidad.
- Marcar accesibilidad y políticas solo si hay fuente clara; si no, dejar "?" y pedir confirmación.

## 5) Preparación para ingestión

- Elige los archivos `*.textonly.*.txt` para pipelines que necesiten texto plano.
- Si tu ingestor requiere formato estructurado (JSON/YAML), puedes convertir el "ENTITY MAP" más adelante.

## 6) Contacto y mantenimiento

- Si un sitio cambia, actualiza inmediatamente el documento y las fuentes.
- Re‑ejecuta el validador hasta obtener PASS.
