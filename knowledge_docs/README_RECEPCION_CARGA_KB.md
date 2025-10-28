# Guía rápida para Recepción: Carga de Base de Conocimiento (KB) desde el panel admin

Esta guía explica cómo crear y mantener los documentos clave que el asistente usa para responder a huéspedes. Está pensada para personal de recepción con acceso solo al panel admin (sin herramientas técnicas).

## Objetivo

- Publicar 4 documentos base para respuestas confiables:
  1. kb_general (visión general del hotel)
  2. room_info (resumen de tipos de habitaciones)
  3. room_info_img (tipos + iconos + galería de imágenes)
  4. ambiguity_policy (cómo desambiguar consultas)
- Mantenerlos claros, breves y siempre actualizados.

## Principios rápidos

- Frases cortas y directas. Evitar marketing exagerado.
- No inventar datos. Si algo no aplica, escribir “No aplica”.
- Respetar el formato de las plantillas (encabezados y campos).
- Usar viñetas donde la plantilla lo sugiere.
- Imágenes: URLs públicas y estables (ideal ~1200x800). Si no hay, dejar para completar luego.

## Antes de empezar (qué tener a mano)

- Horarios (check-in/out, desayuno, piscina/gym/spa si aplica).
- Tipos de habitación, capacidades y camas.
- Políticas relevantes (mascotas, fumadores, estacionamiento).
- 3–6 fotos por tipo de habitación (si ya están disponibles).

---

## 1) Documento: kb_general

En el panel admin:

- Crear documento → Categoría: retrieval_based → Plantilla: “Información general del hotel (KB general)” (key: kb_general).
- Completar según los ítems que aparecen en la plantilla.

Contenido sugerido:

- Resumen (2–3 líneas): estilo del hotel, público objetivo, propuesta.
- Habitaciones: tipos y capacidad (sin precios).
- Servicios principales: desayuno, WiFi, piscina/gym/spa, estacionamiento.
- Ubicación y contacto: referencias cercanas; canales internos para escalar.
- Políticas generales: horarios check-in/out, mascotas, no fumadores, seguridad.

Checklist al guardar:

- Horarios correctos. Sin precios.
- Lenguaje claro y consistente.

Guardar / Publicar.

---

## 2) Documento: room_info

En el panel admin:

- Crear documento → Categoría: retrieval_based → Plantilla: “Tipos de habitaciones – resumen” (key: room_info).

Contenido sugerido (viñetas):

- Tipos y capacidades (m² si aplica): Standard (2), Doble Superior (2–3), Suite Familiar (4–5).
- Camas por tipo: Standard (1 queen), Doble Superior (1 king o 2 twin), Suite Familiar (1 king + sofá cama).
- Vistas/balcón: cuáles lo tienen.
- Amenities destacados por tipo.
- Accesibilidad (si hay habitaciones adaptadas).

Guardar / Publicar.

---

## 3) Documento: room_info_img (rich: iconos + imágenes)

En el panel admin:

- Crear documento → Categoría: retrieval_based → Plantilla: “Habitaciones con iconos e imágenes” (key: room_info_img).
- Completar POR CADA TIPO usando estos campos (respetar nombres):
  - Tipo: <Nombre comercial>
  - Icono: <Emoji simple, ej.: 🛏️>
  - Highlights: Punto 1, Punto 2, Punto 3 (separados por comas)
  - Images: url1, url2, url3 (separadas por coma, sin espacios al final)

Ejemplo de bloque (repetir uno por tipo):

- Tipo: Standard
- Icono: 🛏️
- Highlights: Confort esencial, WiFi rápida, Smart TV 43"
- Images: https://cdn.example.com/rooms/standard1.jpg, https://cdn.example.com/rooms/standard2.jpg

Notas importantes:

- Mantener 3–6 imágenes por tipo cuando sea posible.
- Si aún no hay fotos, podés dejar “Images:” vacío; se mostrará sin romper la interfaz.

Guardar / Publicar.

---

## 4) Documento: ambiguity_policy

En el panel admin:

- Crear documento → Categoría: retrieval_based → Plantilla: “Política de ambigüedad y desambiguación” (key: ambiguity_policy).

Contenido sugerido:

- Señales de ambigüedad: faltan fechas, tipo de habitación no indicado, pedido genérico (“quiero reservar”).
- Preguntas de aclaración (2–3): “¿Fechas de check‑in y check‑out?”, “¿Para cuántos huéspedes?”, “¿Preferencia de tipo de habitación?”.
- Reformulaciones seguras: “Entonces buscás para 2 huéspedes del 10/11 al 12/11, ¿correcto?”.
- Respuestas cuando falta info crítica: pedir solo lo que falta, no repetir.
- Tono y límites: cortés, directo, no inventar disponibilidad ni precios.

Guardar / Publicar.

---

## Validación rápida (desde el chat del admin)

- “Resumen general del hotel” → debe responder con info de kb_general.
- “Tipos de habitaciones con imágenes” → debe mostrar galería (room_info_img) con iconos e imágenes.
- “Quiero reservar” (sin más) → debe pedir datos faltantes (ambiguity_policy), sin inventar precios.

Si algo no sale:

- Revisar ortografía exacta de campos (Tipo, Icono, Highlights, Images).
- En Highlights usar comas para separar.
- En Images, URLs públicas válidas y sin espacios.

---

## Errores comunes y cómo arreglar

- No aparece galería → Formato room_info_img incorrecto → Revisar nombres de campos y comas.
- Highlights en un solo bloque largo → Separadores inconsistentes → Usar comas.
- Respuestas muy genéricas → Completar mejor kb_general y room_info.
- Iconos raros → Reemplazar por emojis simples (🛏️, ✨, 👨‍👩‍👧‍👦).

---

## Checklist imprimible

- [ ] kb_general creado y publicado
- [ ] room_info creado y publicado
- [ ] room_info_img creado y publicado (3–6 fotos por tipo)
- [ ] ambiguity_policy creado y publicado
- [ ] Pruebas manuales en chat OK (general, habitaciones con imágenes, ambigüedad)
- [ ] Sin precios inventados; horarios y políticas correctas
- [ ] URLs de imágenes públicas y estables

---

¿Dudas o cambios? Actualizá el documento correspondiente en el panel y verificá nuevamente en el chat. Mantener estos 4 documentos al día mejora mucho la calidad de las respuestas.
