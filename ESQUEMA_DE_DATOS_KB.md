// Path: /root/begasist/CONTEXT_REFAC_PROMPTS_PLAYBOOKS.md

````md
# 📚 Contexto y Decisiones para la Refactorización de Prompts, Playbooks y Categorías

> **Modo de operación:** las colecciones se crean **manual**mente en Astra.  
> El backend **no** autocrea colecciones; valida su existencia y falla con mensaje claro.

## 0) Colecciones requeridas

**Document (Astra Data API):**

- `hotel_content`
- `hotel_version_index`
- `hotel_text_collection`
- `category_registry`
- `category_overrides`

**Vector (Astra Vector / Collections):**

- `${hotelId}_collection` (existente; 1 por hotel, con config de dimensión/métrica que ya usás)

> Si falta alguna, el endpoint `/api/kb/generate` responde `Astra collections missing …`.

---

## 1 - Separación: Playbooks vs. Contenidos estándar

- **Playbooks**: procesos conversacionales (reservas, modificación, snapshot, verify, ambigüedad, etc.).  
  Se persisten como tipo `playbook` en `hotel_content`. El **global** (plantilla) se guarda como `hotelId = "system"` y cada hotel puede sobreescribir.
- **Standard**: conocimiento factual del hotel (amenities, políticas, pagos, soporte, room info, etc.).  
  Se persisten como tipo `standard` en `hotel_content`, por hotel.

---

## 2 - Búsqueda y Fallback

Orden de resolución (ejecución / RAG / respuesta):

2.1 - **Overrides por hotel** (si existen reglas en `category_overrides` para el hotel y `categoryId`)
2.2 - **Contenido del hotel** en `hotel_content` (por `hotelId`)
2.3 - **Contenido global (system)** en `hotel_content` (`hotelId = "system"`) como fallback de solo lectura

> El **router** del grafo usa `categoryId = \`<category>/<promptKey>\`` como clave lógica estable.

---

## 3) Esquema de Colecciones

### 3.1 `category_registry` (Tabla)

Catálogo global de **categorías dinámicas**. Un solo registro por `categoryId`.

- **Clave lógica**: `categoryId = "<category>/<promptKey>"`
- **Campos**:

  ```json
  {
    "categoryId": "amenities/ev_charging",
    "name": "EV Charging",
    "enabled": true,

    "router": { "category": "amenities", "promptKey": "ev_charging" },
    "retriever": {
      "topK": 6,
      "filters": {
        "category": "amenities",
        "promptKey": "ev_charging",
        "status": "active"
      }
    },

    "templates": {}, // reservado para plantillas / prompts base opcionales
    "fallback": "qa", // política de fallback semántico

    "intents": [], // reservado para mapeo de intents si se usa

    "createdAt": "ISO",
    "updatedAt": "ISO",
    "version": 1
  }
  ```
````

- **Uso**:

  - Registro “contrato” de cada `categoryId`.
  - Facilita UI/Panel y validación estática (qué categorías existen).
  - Permite togglear `enabled`.

### 3.2 `category_overrides` (Tabla)

Reglas por hotel para seleccionar **qué versión**/contenido usar por `categoryId` y/o ajustar **router/retriever**.

- **Clave compuesta lógica**: `(hotelId, categoryId)`
- **Campos**:

  ```json
  {
    "hotelId": "hotel999",
    "categoryId": "amenities/ev_charging",

    "prefer": {
      "lang": "es", // preferencia de idioma
      "version": "v12", // forzar versión concreta (opcional)
      "contentId": "uuid-opcional" // forzar un registro exacto de hotel_content (opcional)
    },

    "routerOverride": {
      // opcional: desviar a otra ruta del grafo
      "category": "amenities",
      "promptKey": "parking" // ejemplo: redirigir a "parking"
    },

    "retrieverOverride": {
      // opcional: topK/filters específicos por hotel
      "topK": 8,
      "filters": { "category": "amenities", "promptKey": "ev_charging" }
    },

    "enabled": true,
    "notes": "Preferir la versión con tarifas 2025",

    "createdAt": "ISO",
    "updatedAt": "ISO"
  }
  ```

- **Uso**:

  - Per-hotel: controla variantes, idioma preferente, versiones pinneadas, desvíos finos de router y filtros RAG.

> ⚠️ No duplica contenido: solo indica **cómo seleccionar**/enrutar.

---

### 3.3 `hotel_content` (Tabla)

Almacena **playbooks y contenidos estándar**.

- **Clave compuesta conceptual**: `(hotelId, category, promptKey, lang, version)`
- **Campos**:

  ```json
  {
    "hotelId": "hotel999",
    "category": "amenities",
    "promptKey": "ev_charging",
    "lang": "es",
    "version": "v1", // string ("vN") o number, el backend normaliza
    "type": "standard", // "playbook" | "standard"
    "title": "Cargadores para coches eléctricos",
    "body": "# ... Markdown ...",
    "createdAt": "ISO",
    "updatedAt": "ISO"
  }
  ```

### 3.4 `hotel_version_index` (Tabla)

Índice de versión vigente por `(hotelId, category, promptKey, lang)`.

- **Campos**:

  ```json
  {
    "hotelId": "hotel999",
    "category": "amenities",
    "promptKey": "ev_charging",
    "lang": "es",
    "currentVersion": "v1",
    "lastVersion": "v0",
    "currentId": "uuid-v1",
    "lastId": "uuid-v0",
    "updatedAt": "ISO"
  }
  ```

### 3.5 `hotel_text_collection` (Document, existente)

Texto **original** previo a embeddings (ingesta). Útil para auditoría y debugging.

- **Campos típicos**:

  ```json
  {
    "hotelId": "hotel999",
    "originalName": "ev_charging.es.txt",
    "category": "amenities",
    "promptKey": "ev_charging",
    "version": "v1",
    "textContent": "# ...",
    "targetLang": "es",
    "uploader": "admin@panel",
    "uploadedAt": "ISO",
    "metadata": { ... }
  }
  ```

### 3.6 `${hotelId}_collection` (Vector)

Chunks con `$vector` + metadatos (`category`, `promptKey`, `version`, etc.).
Se utiliza en retrieval semántico por filtros y versión vigente.

---

### 4 - Pipeline de generación (resumen)

Punto de entrada: `POST /api/kb/generate` (panel → botón **Generar y subir KB**)

#### 4.1 - Verifica existencias (manual mode): `category_registry`, `category_overrides`, `hotel_text_collection`.

#### 4.2 - Mapea `HotelConfig` → `Profile` y **opcional** `autoEnrich`.

#### 4.3 - `generator.ts` produce archivos `category/promptKey.lang.txt`.

> **Ejemplo de categoría nueva:** `amenities/ev_charging.es.txt`

    **Vista previa** (`upload=false`) o **ingesta** (`upload=true`):

- Guarda original en `hotel_text_collection`.
- Chunking + embeddings a `${hotelId}_collection` con `{ category, promptKey, version }`.
- Upsert en `hotel_content` + `hotel_version_index`.
- Upsert del `categoryId` en `category_registry` (si la colección existe).

### 5 - El grafo enruta por `categoryId` y consulta RAG filtrando por `{category, promptKey}` y versión vigente.

---

### 6 - Cómo agrega valor `category_registry` / `category_overrides`

- **category_registry**:

  - Evita “magia” dispersa: es el **catálogo visible** de todas las categorías disponibles en el sistema.
  - Fuente de verdad para UI (Panel) y validaciones (linters o tests).
  - Permite activar/desactivar categorías globalmente.

- **category_overrides**:

  - Permite que cada hotel pinnee una versión concreta, cambie idioma preferente o ajuste **retriever/router** sin tocar los datos base.
  - Escala orgánicamente sin proliferación de colecciones por hotel.

---

### 7 - Lookup de contenido (pseudo)

```ts
// Inputs: hotelId, category, promptKey, langDeseado
const categoryId = `${category}/${promptKey}`;

// 1) Overrides por hotel
const ov = findOne(category_overrides, { hotelId, categoryId, enabled: true });

// 2) Resolver lang/version deseada
const lang = ov?.prefer?.lang ?? langDeseado ?? hotel.defaultLanguage ?? "es";

// 3) Si ov especifica contentId/version → usar eso.
//    Si no, consultamos hotel_version_index → currentId de (hotelId,cat,pk,lang).
//    Fallback: buscar en hotel_content con hotelId = "system".

// 4) Retriever
const filters = ov?.retrieverOverride?.filters ?? {
  category,
  promptKey,
  status: "active",
};
const topK = ov?.retrieverOverride?.topK ?? 6;

// 5) Router override?
const route = ov?.routerOverride ?? { category, promptKey };
// route.category / route.promptKey → nodo/plantilla del grafo.
```

---

### 8 - Consideraciones de indexación (Astra)

Como las colecciones se crean **manual**mente:

- **category_registry**: indexá al menos: `categoryId`, `enabled`, `createdAt`, `updatedAt`.
- **category_overrides**: indexá al menos: `hotelId`, `categoryId`, `enabled`, `updatedAt`.
- **hotel_text_collection**: `hotelId`, `originalName`, `uploadedAt` (más los que ya uses).
- **hotel_content**: `hotelId`, `category`, `promptKey`, `lang`, `version`, `updatedAt`.
- **hotel_version_index**: `hotelId`, `category`, `promptKey`, `lang`, `updatedAt`.

> La indexación minimalista evita errores del tipo “Too many indexes” al crear colecciones.

---

### 9 - Seguridad / DevOps

- Middleware Next: admitir `x-admin-key` para rutas internas tipo `/api/kb/generate`.
- El backend no crea colecciones; exige su existencia (consistente con tu flujo manual).
- Loggear **categoryId** y `versionTag` en cada ingesta para trazabilidad.

---

### 10 - Ejemplos compactos

**Registro de `category_registry`:**

```json
{
  "categoryId": "amenities/ev_charging",
  "name": "EV Charging",
  "enabled": true,
  "router": { "category": "amenities", "promptKey": "ev_charging" },
  "retriever": {
    "topK": 6,
    "filters": {
      "category": "amenities",
      "promptKey": "ev_charging",
      "status": "active"
    }
  },
  "templates": {},
  "fallback": "qa",
  "intents": [],
  "createdAt": "2025-11-03T10:00:00.000Z",
  "updatedAt": "2025-11-03T10:00:00.000Z",
  "version": 1
}
```

**Override por hotel (`category_overrides`):**

```json
{
  "hotelId": "hotel999",
  "categoryId": "amenities/ev_charging",
  "prefer": { "lang": "es", "version": "v3" },
  "retrieverOverride": { "topK": 8 },
  "routerOverride": null,
  "enabled": true,
  "createdAt": "2025-11-03T10:05:00.000Z",
  "updatedAt": "2025-11-03T10:05:00.000Z"
}
```

---

### 11 - ¿Falta algo?

- [x] Compatibilidad con `generator.ts` actual → **OK** (ya emite `category/promptKey.lang.txt`)
- [x] Align con grafo (category = “amenities”, promptKey = “ev_charging”) → **OK**
- [x] `hotel_content` + `hotel_version_index` siguen igual → **OK**
- [x] Ingesta vectorial `${hotelId}_collection` → **OK**
- [x] Autorización `x-admin-key` → **OK**
- [x] Cero auto-creación de colecciones → **OK**

> Si en el futuro querés dashboards de “Catálogo de categorías” y “Overrides por hotel”, ya tenés los anclajes (`category_registry` y `category_overrides`) para construirlos en el panel.

---

```

```
