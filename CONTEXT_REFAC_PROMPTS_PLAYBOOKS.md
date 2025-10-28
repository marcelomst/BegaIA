# Contexto y Decisiones para la Refactorización de Prompts y Playbooks

## 1. Separación de Playbooks y Prompts Estándar

- **Playbooks**: Procesos complejos (reservas, modificaciones, ambigüedad, etc.) definidos globalmente en la colección `system_playbook` (acceso superusuario, hotelId = "system" o similar). Aplican a todos los hoteles por defecto.
- **Prompts estándar**: Información, políticas y respuestas frecuentes personalizadas por hotel (descripción, amenities, políticas, contacto, etc.). Se almacenan por hotel y pueden ser editados por cada uno.

## 2. Lógica de Consulta

- El sistema busca primero un playbook personalizado para el hotel (si existe).
- Si no existe, usa el playbook global de hotelsystem.
- Para prompts estándar, siempre busca en la colección específica del hotel.

## 3. Casos de Override

- Un hotel puede necesitar un playbook propio (por particularidades en sus procesos).
- En ese caso, el sistema debe permitir que el playbook del hotel sobrescriba el global para ese proceso.

## 4. Ejemplos de Procesos que Requieren Playbooks

- Reservas y modificaciones complejas
- Check-in/check-out
- Reclamos y soporte
- Gestión de amenities especiales
- Facturación y pagos
- Grupos/eventos
- Seguridad y emergencias
- Upgrades/promociones
- Privacidad y datos sensibles

## 5. Ejemplos de Prompts Estándar por Hotel

- Información general del hotel
- Tipos de habitaciones
- Listado de amenities
- Políticas generales
- Medios de pago y facturación
- Contacto y soporte
- Preguntas frecuentes

## 6. Modelo de Datos Sugerido

### hotel_content (colección única)

Almacena tanto playbooks como prompts estándar.

**Campos:**

- hotelId: string
- category: string (área funcional: reservation, amenities, billing, etc.)
- promptKey: string
- lang: string (ISO 639-1)
- version: string o int
- type: string (`playbook` o `standard`)
- title: string (opcional)
- body: string
- createdAt: timestamp (opcional)
- updatedAt: timestamp (opcional)
- ...otros metadatos

**Clave primaria sugerida:** (hotelId, category, promptKey, lang, version)

**Ejemplo de registro:**

```json
{
	"hotelId": "hotel999",
	"category": "reservation",
	"promptKey": "reservation_flow",
	"type": "playbook",
	"lang": "es",
	"version": "v2",
	"body": "...texto del playbook..."
}

{
	"hotelId": "system",
	"category": "reservation",
	"promptKey": "reservation_flow",
	"type": "playbook",
	"lang": "es",
	"version": "v1",
	"body": "...playbook global..."
}

{
	"hotelId": "hotel999",
	"category": "amenities",
	"promptKey": "amenities_list",
	"type": "standard",
	"lang": "es",
	"version": "v3",
	"body": "...listado personalizado..."
}
```

Esto respeta la segunda y tercera forma normal: 'type' clasifica el registro, 'category' define el área funcional y ningún campo depende funcionalmente de otro no clave.

### hotel_version_index

Índice para versionado y lookup rápido.

**Campos:**

- hotelId: string
- category: string
- promptKey: string
- lang: string
- currentVersion: string
- lastVersion: string
- currentId: string (opcional, referencia directa al registro en hotel_content)
- lastId: string (opcional)
- ...otros metadatos

**Clave primaria sugerida:** (hotelId, category, promptKey, lang)

**Ejemplo de registro:**

```json
{
  "hotelId": "hotel999",
  "category": "reservation",
  "promptKey": "reservation_flow",
  "lang": "es",
  "currentVersion": "v2",
  "lastVersion": "v1",
  "currentId": "uuid-v2",
  "lastId": "uuid-v1"
}
```

## 7. Recomendaciones para el Refactor

- Unificar la lógica de consulta y almacenamiento en una sola colección (`hotel_content`).
- Usar el campo `type` para distinguir entre playbooks y prompts estándar.
- Permitir que el superusuario edite y cree registros globales (`hotelId = "system"`) a través de `hotelsystem_collection`.
- Los hoteles pueden ver los registros globales como solo lectura y hacer override para crear una copia editable con su propio `hotelId`.
- El sistema debe buscar primero el registro específico del hotel y, si no existe, mostrar el global (readonly) y ofrecer la opción de override.
- Documentar la lógica de fallback, override y control de acceso.

---

## 8. Cumplimiento de Formas Normales

El modelo propuesto cumple las principales formas normales de diseño de bases de datos relacionales:

- **Primera Forma Normal (1FN):** Todos los atributos son atómicos, sin listas ni estructuras repetidas.
- **Segunda Forma Normal (2FN):** Todos los atributos no clave dependen completamente de la clave primaria compuesta (hotelId, category, promptKey, lang, version).
- **Tercera Forma Normal (3FN):** No hay dependencias transitivas; ningún atributo no clave depende de otro atributo no clave. El campo `type` es explícito y no depende de hotelId ni de otra columna.
- **BCNF (Boyce-Codd):** Todo determinante es una superclave; la clave primaria compuesta es la única determinante de los demás atributos.
- **Cuarta Forma Normal (4FN):** No existen dependencias multivaluadas; todos los atributos son atómicos y no hay listas independientes por registro.

Esto garantiza un modelo flexible, escalable y libre de redundancias o anomalías de actualización.

## 9. Contrato de Estructura: templates.ts como Spec

El archivo `templates.ts` funciona como el contrato (spec) del sistema, definiendo la estructura, categorías y promptKeys base que deben tener todos los hoteles. Este contrato garantiza interoperabilidad, compatibilidad y validación automática de datos.

- Los nombres de categoría y promptKey definidos en `templates.ts` son la referencia estándar y deben respetarse para asegurar el correcto funcionamiento del backend y los flujos conversacionales.
- Los hoteles pueden personalizar los contenidos, pero la estructura base debe seguir la convención del contrato.
- Si se requiere agregar nuevas categorías o promptKeys, se debe actualizar el contrato (`templates.ts`) y adaptar el backend para soportar la extensión de forma controlada.

Este enfoque, inspirado en el concepto de smart contracts del mundo crypto, permite evolución segura y validación robusta del sistema.

Este resumen sirve como base para definir el alcance y los objetivos de la refactorización del sistema de prompts y playbooks en la plataforma.
