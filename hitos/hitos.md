¡Perfecto! Me encanta esta idea. Es **exactamente** la manera correcta de transformar el informe en un **plan de acción ejecutable**, donde:

- **Vos y yo definimos la estrategia (roadmap + hitos)**
- El modelo conectado a VSCode (**MCV/msv**) ejecuta cada hito cuando se lo pedimos
- Cada hito lo transformamos en **prompts operativos y concretos**, no informes
- El proceso avanza en pasos claros, verificables y medibles

Vamos a hacerlo en 3 fases:

---

# ✅ **FASE 1 — Definir Roadmap y Hitos Claros**

Basado en el informe, lo estructuro en un roadmap optimizado para ejecución real.
Luego vos confirmás → y recién ahí generamos los prompts para MCV.

---

## **📌 Roadmap Propuesto (versión preliminar)**

Dividido en 3 niveles: _rápidos_, _medios_, _estructurales_.

---

# 🔶 **HITOS DE IMPLEMENTACIÓN RÁPIDA (1–3 días)**

### **Hito 1 — Auditoría técnica de todas las plantillas**

Objetivos:

- Comparar seeds vs hotel_content
- Detectar campos faltantes en hotel_config
- Detectar tokens sin datos reales
- Generar un reporte estructurado (NO narrativo)

Salida:

- JSON con inconsistencias por categoryId/lang

---

### **Hito 2 — Validación automática de tokens**

Objetivos:

- Agregar en FE un validador que marque tokens faltantes:

  - `[[rooms.capacity]]` sin valor
  - `[[each]]` sin lista

- Mostrar warnings visibles en el modal

Salida:

- Lista de tokens desconocidos
- Lista de tokens sin datos

---

### **Hito 3 — Mecanismo de sincronización seed → DB**

Objetivos:

- Agregar un botón o endpoint:

  - “Actualizar desde plantilla base”

- Reescribe hotel_content si el seed cambió

Salida:

- Nueva versión por categoryId con el seed actualizado

---

---

# 🔷 **HITOS MEDIOS (1 semana)**

### **Hito 4 — Endpoint + botón de vectorización KB**

Objetivos:

- Implementar `/api/hotel-content/vectorize`
- Crear botón en FE “Vectorizar KB”
- Guardar hash/version de cada embedding para evitar duplicados

Salida:

- `${hotelId}.collection` actualizada automáticamente

---

### **Hito 5 — Generación completa de KB (pipeline automatizable)**

Objetivos:

- Construir pipeline:

  1. leer hotel_content (tokens)
  2. hidratar
  3. persistir texto (hotel_text_collection)
  4. vectorizar

Salida:

- Script o endpoint “Regenerar KB completa”

---

---

# 🔷 **HITOS ESTRUCTURALES (arquitectura)**

### **Hito 6 — Fuente de verdad unificada**

Objetivos:

- Decidir si el seed o DB es master
- Actualizar arquitectura backend y FE para reforzar esa decisión

---

### **Hito 7 — QA automático / tests de consistencia**

Objetivos:

- Implementar tests que:

  - detecten tokens inválidos
  - comparen seed vs DB
  - verifiquen hidratación válida
  - validen la coherencia del hotel_config

Salida:

- Script CI/CD que corre en cada deploy

---

### **Hito 8 — Documentación formal del pipeline KB**

Objetivos:

- Documentar flows:

  - tokenize → hydrate → persist → embed
  - roles del Panel Admin
  - roles de hotel_config
  - roles de los seeds

---

---

# ✔️ **FASE 2 — Confirmación del Roadmap**

Ahora te pregunto:

## ¿Querés que:

A) Confirmemos este roadmap tal cual?
B) Lo ajustemos y sumemos/quitemos hitos?

Con tu confirmación, pasamos a Fase 3.

---

# ✔️ **FASE 3 — Generación de Prompts para MCV**

Cuando vos me digas _“Avancemos con el Hito X”_, te armo:

- El **prompt exacto** para VSCode
- En formato operativo (tipo: “Hacé esto en el repo, modificá estos archivos, agregá este endpoint…”)
- Sin textos explicativos, solo instrucciones accionables

---

🟦 **HITOS**
Hito 1 — Auditoría técnica de todas las plantillas

Hito 2 — Validación automática de tokens

Hito 3 — Sincronización seed → DB

Hito 4 — Vectorización (endpoint + botón)

Hito 5 — Pipeline KB completo

Hito 6 — Fuente de verdad unificada

Hito 7 — QA automático

Hito 8 — Documentación del pipeline KB

🟦 PROMPT PARA MCV

## HITO 1 — Auditoría técnica de todas las plantillas KB

Objetivo:
Generar un reporte ESTRUCTURADO (NO narrativo) con inconsistencias entre:

- Seeds (category_registry.json)
- Plantillas existentes en hotel_content
- Tokens utilizados vs. datos disponibles en hotel_config

ENTRADAS:

1. Archivo de seeds: /mnt/data/README.md (u otro path si aplica)
2. Carpeta/archivo donde residen plantillas tokenizadas (hotel_content)
3. Archivo hotel_config correspondiente al hotel de prueba
4. Código del compilador e hidratador existente

INSTRUCCIONES:

1. Parseá todas las plantillas seed (category_registry, templates, etc.)
2. Parseá todas las plantillas almacenadas en hotel_content
3. Para cada categoryId:
   - Compará seed vs. versión actual en DB
   - Identificá tokens presentes en la plantilla que NO existan en hotel_config
   - Detectá tokens que existen en hotel_config pero NO están utilizados
   - Detectá bloques [[each]] aplicados a listas inexistentes o vacías
   - Verificá campos default aplicados (ej: '?' o arrays vacíos)
4. Generá un OUTPUT ESTRUCTURADO en JSON:
   {
   "categoryId": {
   "missingFromHotelConfig": [...],
   "unusedConfigFields": [...],
   "tokensMissingInDBVersion": [...],
   "differencesSeedVsDB": [...],
   "invalidEachBlocks": [...],
   "invalidJoinBlocks": [...],
   "summary": "OK|ISSUES"
   },
   ...
   }

RESTRICCIONES:

- No generes narrativa, solo JSON estructurado.
- No escribas sobre archivos todavía.
- No realices cambios en seeds ni plantillas.
- No inventes campos, solo usa lo que realmente exista en el repo.

OUTPUT:
Un único JSON con el reporte completo.

Buenísimo, Hito 1 está clarísimo y muy útil 👍
Veo tres patrones fuertes en ese JSON (te lo digo corto):

- Muchas plantillas **siguen en modo “solo texto”** en `hotel_content` aunque el seed usa tokens (`[[each]]`, `[[join]]`).
- `hotel_config` de `hotel999` **no tiene** estructuras clave: `rooms`, `transport.airports`, `amenities.*`, `payments.*`, etc.
- Hay varios `[[each]]` y `[[join]]` que hoy son **inválidos** (listas inexistentes o campos que no existen).

Con eso, pasamos directo a **HITO 2: Validación automática de tokens**, usando exactamente estos tipos de issues:
`missingFromHotelConfig`, `invalidEachBlocks`, `invalidJoinBlocks`, `tokensMissingInDBVersion`.

---

## HITO 2 (Validación automática de tokens en el panel)

Listo para pegar en VSCode:

```text
TAREA: HITO 2 — Validación automática de tokens en el Editor de KB

Contexto:
Ya realizamos una auditoría (Hito 1) que detectó, por categoryId, problemas como:
- missingFromHotelConfig
- invalidEachBlocks
- invalidJoinBlocks
- tokensMissingInDBVersion

Ahora queremos llevar esa lógica al flujo normal del panel de KB, de forma que:
- Al abrir “Ver / Editar” para una categoría, el usuario vea claramente si la plantilla tiene problemas.
- No se genere un informe narrativo: solo validaciones visibles (warnings) en la UI.
- La validación se haga sobre la plantilla y el hotel_config reales, NO sobre mocks.

Objetivo:
Implementar validación automática de tokens para cada plantilla de KB, y mostrar el resultado en el Editor dual:
- Estado por documento: OK vs ISSUES
- Listas de problemas agrupadas (missingFromHotelConfig, invalidEachBlocks, invalidJoinBlocks, tokensMissingInDBVersion)

Alcance:
Puedes modificar tanto backend como frontend, pero manteniéndote dentro de este Hito:
- NO cambiar la semántica del compilador/hidratador.
- NO implementar aún vectorización ni pipeline completo (eso es otro Hito).
- NO cambiar seeds ni hotel_config de ejemplo.

REQUISITOS TÉCNICOS:

1) Backend — endpoint de validación
   - Reutilizar o extraer del código de auditoría de Hito 1 la lógica que:
     - Dado (hotelId, categoryId, lang), carga:
       - La plantilla tokenizada actual desde hotel_content (o seed si aún no hay en DB).
       - El hotel_config correspondiente.
     - Analiza:
       - Tokens que apuntan a campos inexistentes en hotel_config → missingFromHotelConfig.
       - Bloques [[each: ...]] donde la lista no exista o no sea un array → invalidEachBlocks.
       - Bloques [[join: ...]] donde el campo no exista o no sea array → invalidJoinBlocks.
       - Tokens que existen en el seed pero no en la versión actual de DB → tokensMissingInDBVersion (si aplica).
   - Exponer esta validación de UNA de estas dos maneras (elige la más coherente con el código existente):
     a) Extender el response de GET /api/hotel-content/get para incluir un campo:
        "validation": {
          "missingFromHotelConfig": [...],
          "invalidEachBlocks": [...],
          "invalidJoinBlocks": [...],
          "tokensMissingInDBVersion": [...],
          "summary": "OK" | "ISSUES"
        }
     b) O crear un endpoint específico:
        GET /api/hotel-content/validate?hotelId=...&categoryId=...&lang=...
        que devuelva exactamente esa estructura de "validation".

   - La lógica debe estar en una función reutilizable (por ejemplo en un helper/servicio), no inline solo en el endpoint.

2) Frontend — mostrar validación en el Editor dual
   - Localizar el componente que renderiza:
     - La tabla de categorías (KB Templates).
     - El modal “Ver / Editar” (editor dual humano/tokens).
   - Al abrir el modal para una categoría:
     - Llamar al endpoint de validación (o leer el campo validation si ya viene en /get).
     - Guardar el resultado de validation en el estado del componente.
   - En el modal:
     - Mostrar un indicador visual de estado (por ejemplo):
       - “Estado: OK” si summary == "OK"
       - “Estado: Con issues” si summary == "ISSUES"
     - Listar debajo, de forma sencilla (texto o lista):
       - Campos en missingFromHotelConfig.
       - Bloques en invalidEachBlocks.
       - Bloques en invalidJoinBlocks.
       - Tokens en tokensMissingInDBVersion (si existieran).
   - No hace falta un diseño complejo; el foco es la funcionalidad:
     - Que el usuario vea claramente qué está mal sin leer código ni tokens crudos.

3) Comportamiento mínimo:
   - Si no se encuentran problemas:
     - summary = "OK"
     - Todas las listas vacías.
     - El UI debe mostrar “Estado: OK” sin warnings.
   - Si se encuentran problemas:
     - summary = "ISSUES"
     - Mostrar listas de issues, aunque sean largas.
   - Manejar errores:
     - Si el endpoint de validación falla, mostrar un mensaje genérico en el modal (“No se pudo validar la plantilla”) pero NO bloquear la edición.

4) Output esperado de tu trabajo:
   - Implementar el código necesario (backend + frontend) para esta validación.
   - Al finalizar, responde SOLO con:
     - La lista de archivos modificados.
     - Un breve resumen técnico por archivo (1–3 líneas por archivo), sin narrativa extensa.
   - NO generes un informe largo ni documentación funcional; eso se verá más adelante en otro Hito.

Restricciones:
- No inventes rutas nuevas si puedes reutilizar /api/hotel-content/get; si necesitas una nueva ruta, debe seguir el estilo y estructura del código ya existente.
- No modifiques seeds ni hotel_config de ejemplo.
- No realices cambios en otros módulos no relacionados con KB Templates o hotel_content.

FIN DE TAREA HITO 2
```

## HITO 3 — Mecanismo de sincronización seed → DB para plantillas KB

Contexto:

- Ya existe un flujo de “Crear desde plantilla” que:
  - Toma la plantilla desde el registry (seed).
  - La persiste en hotel_content para un hotelId/lang/categoryId.
- Después, el usuario puede editar esa plantilla en el panel y se crean nuevas versiones.
- Con Hito 1 tenemos claro que varios seeds están desalineados con las plantillas en DB.
- Con Hito 2 ya existe validación automática de tokens y visualización de issues en el modal.

Objetivo:
Implementar un mecanismo claro de “Actualizar desde plantilla base (seed)” para una categoría KB:

- Permitir que, para un (hotelId, categoryId, lang), se pueda crear una **nueva versión en hotel_content** basada en la plantilla seed actual.
- Mantener el historial de versiones anterior (NO borrar, solo agregar nueva versión).
- Marcar la nueva versión basada en seed como `isCurrent` (o equivalente), siguiendo la convención actual.
- Reutilizar la lógica existente de seed-to-hotel cuando sea posible.

Alcance:

- Backend: endpoint o extensión de endpoint para hacer la sincronización.
- Frontend: botón/acción en la UI de KB Templates para disparar esta sincronización desde el panel.
- No modificar la semántica del compilador ni de la hidratación.
- No implementar vectorización ni pipeline completo todavía (eso es otro Hito).

REQUISITOS TÉCNICOS:

1. Backend — lógica de sincronización seed → DB

   - Localizar el código actual que se usa para:
     - “Crear desde plantilla” (seed → hotel_content).
   - Extraer/reutilizar esa lógica para poder:
     - Dado (hotelId, categoryId, lang):
       1. Cargar la plantilla seed correspondiente a ese categoryId/lang.
       2. Compilarla si es necesario (tokens).
       3. Crear un nuevo documento en hotel_content:
          - hotelId
          - categoryId
          - lang
          - body con la plantilla tokenizada proveniente del seed actual
          - title (tomado del seed o del registry)
          - version/tag nuevo (sigue el esquema actual de versionado)
          - isCurrent = true (o lo que se use actualmente para marcar la activa)
          - timestamps correspondientes
       4. Asegurarse de marcar como NO current las versiones anteriores de ese (hotelId, categoryId, lang), si ese es el contrato actual.
   - Exponer esta funcionalidad de alguna de estas dos formas (elige la más coherente con el código existente):
     a) Extender el endpoint ya existente que hace seed-to-hotel para que soporte un parámetro tipo `forceReseed` o `sync=true`, permitiendo resembrar aunque ya exista contenido.
     b) Crear un endpoint específico para sync, por ejemplo:
     POST /api/hotel-content/sync-from-seed
     body: { hotelId, categoryId, lang }
   - Debe manejar adecuadamente casos:
     - Seed no encontrado → devolver error claro.
     - hotel_content inexistente aún → simplemente crear la primera versión como siempre.
   - No borrar versiones anteriores: la idea es agregar una nueva versión, no hacer hard reset.

2. Frontend — botón de “Actualizar desde plantilla base”

   - En el listado de KB Templates o en el modal “Ver / Editar” (elige el lugar más coherente con la UX actual), agregar una acción visible, por ejemplo:
     - Botón o acción de menú contextual: “Actualizar desde plantilla base” o “Reset desde seed”.
   - Comportamiento:
     - Al hacer click, enviar POST al endpoint implementado en el backend con:
       - hotelId actual
       - categoryId de la fila/plantilla
       - lang seleccionado
     - Mostrar feedback al usuario:
       - Loading/spinner mientras se ejecuta.
       - Mensaje de éxito si se creó la nueva versión desde seed.
       - Mensaje de error si el backend devuelve fallo (ej: no existe seed).
     - Tras el éxito:
       - Refrescar los datos de esa categoría en el panel:
         - Historial de versiones
         - Contenido tokenizado
         - Validación (Hito 2) — es válido reutilizar el flujo actual de recarga del modal y validación.

3. Integración con validación (Hito 2)

   - Tras sincronizar desde seed, la plantilla nueva debería pasar por la validación automática ya implementada.
   - No hace falta añadir lógica nueva, solo asegurarse de:
     - Volver a llamar al endpoint de get/validate al refrescar el modal.
   - Esto permitirá ver inmediatamente si el seed actual está bien alineado con hotel_config o si sigue teniendo issues.

4. Comportamiento mínimo esperado

   - Si no había plantilla en hotel_content para esa categoría:
     - El flujo debe comportarse igual que “Crear desde plantilla” inicial.
   - Si ya había una o más versiones:
     - Debe añadirse una nueva versión basada en seed.
     - La nueva versión debe verse como la actual en el panel.
   - No cambiar nada en las plantillas ya existentes salvo en el hecho de que se marcan como no actuales (según el esquema actual).

5. Output esperado de tu trabajo
   - Implementar el código necesario (backend + frontend) para esta sincronización seed → DB.
   - Al finalizar, responde SOLO con:
     - La lista de archivos modificados.
     - Un breve resumen técnico por archivo (1–3 líneas por archivo), sin narrativa extensa.
   - NO generes un informe largo ni documentación funcional.

Restricciones:

- No inventes nombres de archivos o rutas fuera del patrón actual: reutiliza endpoints y convenciones ya presentes en el proyecto siempre que sea posible.
- No modifiques seeds ni hotel_config de ejemplo en este Hito; solo trabajamos en la mecánica de sincronización.
- No implementes funcionalidad de vectorización ni pipeline completo; eso es para Hitos posteriores.

## FIN DE TAREA HITO 3


## TAREA: HITO 4 — Implementar vectorización de KB (endpoint + botón FE)

Contexto:
Ya tenemos:
- Plantillas tokenizadas en hotel_content
- Hidratación on-demand desde GET /api/hotel-content/get
- Validación automática (Hito 2)
- Sincronización seed → DB (Hito 3)

Objetivo de este hito:
Implementar la capacidad de generar la base vectorial del hotel:
- Crear o ajustar endpoint /api/hotel-content/vectorize
- Procesar todas las plantillas vigentes (isCurrent = true)
- Hidratar cada una → obtener texto final
- Crear embeddings y subirlos a `${hotelId}.collection`
- Agregar botón en FE “Vectorizar KB” para disparar este proceso

RESTRICCIONES (del roadmap):
- No modificar seeds
- No modificar hotel_config
- No implementar el pipeline completo (es Hito 5)
- No hacer búsqueda ni RAG aquí; solo embeddings

INSTRUCCIONES TÉCNICAS:

1) Backend — Endpoint de vectorización
   - Crear POST /api/hotel-content/vectorize
   - Body: { hotelId }
   - Comportamiento:
     1. Leer todas las plantillas current de hotel_content para ese hotelId
     2. Para cada plantilla:
        - Hidratar usando misma función que GET /api/hotel-content/get
        - Obtener text.body (texto final)
        - Generar un hash único usando:
          - hotelId + categoryId + lang + version + SHA1(content)
        - Antes de vectorizar:
          - Verificar si ya existe en `${hotelId}.collection` un embedding con ese hash
          - Si existe → saltar
        - Si no existe → generar embedding y escribir en `${hotelId}.collection`
           campos recomendados:
           - content: texto hidratado
           - categoryId
           - lang
           - version
           - hash
           - timestamp
     3. Devolver:
        {
          "status": "ok",
          "indexed": X,      // cuántos documentos nuevos se vectorizaron
          "skipped": Y,      // cuántos ya existían
          "total": Z         // total processados
        }
   - Manejar errores:
     - Seeds/plantillas inexistentes → response 400
     - Fallo al generar embedding → response 500 con mensaje claro

2) Backend — Servicio de embeddings
   - Usar el mismo proveedor que el proyecto utiliza (OpenAI u otro) según los imports existentes
   - No inventar dependencias nuevas
   - La función debe estar aislada y reutilizable
     ejemplo conceptual:
     async function embedText(text: string): Promise<number[]>

3) Frontend — Botón “Vectorizar KB”
   - En KbTemplatesClient.tsx agregar un botón visible:
     “Vectorizar KB”
   - Función asociada:
     - POST /api/hotel-content/vectorize con { hotelId }
     - Mostrar loading/spinner durante el proceso
     - Al finalizar:
       - Mostrar resumen: “X vectorizados, Y saltados”
       - No abrir modal ni pedir confirmaciones extra

4) Feeback mínimo requerido:
   - Si hay error → mostrar mensaje simple: “Error al vectorizar KB”
   - Si éxito → snackbar/toast: “Vectorización completa”
   - No agregar informes narrativos

5) Output esperado:
   Al terminar, responde SOLO:
   - Lista de archivos modificados
   - Breve resumen (1–3 líneas por archivo)

FIN DE TAREA HITO 4
