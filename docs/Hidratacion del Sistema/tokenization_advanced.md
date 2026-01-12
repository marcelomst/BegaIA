// Path: /home/marcelo/begasist/docs/Hidratacion del Sistema/tokenization_advanced.md

# 🧠 Guía avanzada: Motor de tokenización e hidratación balanceado

## 1️⃣ Objetivo

El motor avanzado de **tokenización + hidratación** extiende el modelo básico para permitir:

- **Iteradores** (`each`) que repiten bloques enteros.
- **Listas dinámicas** (`join`) con plantillas internas.
- **Valores por defecto** en cualquier nivel.
- **Balanceo de delimitadores** `[[` y `]]` para evitar errores.
- **Registro de metadatos** sobre los datos usados.

Su objetivo es generar texto o contenido estructurado (como Markdown) a partir de un `hotel_config` complejo, manteniendo un control seguro y predecible.

---

## 2️⃣ Tipos de tokens admitidos

### 🔹 Token simple

```

[[ruta.en.el.config | default: Fallback]]

```

- Busca una ruta dentro de `hotel_config`.
- Si no hay valor → usa el `default`.
- Si tampoco hay `default` → deja el token original.

### 🔹 Iterador de objetos (`each`)

```

[[each: rooms | default: (No rooms) ->

* [[name | default: ?]]
  [[join: images | sep: "\n" | default: (Sin imágenes) -> - !img([[item]])]]
  ]]

```

- `each:` toma un **array de objetos**.
- El bloque interno se repite para cada elemento.
- Dentro pueden usarse tokens simples o `join`.
- Si el array está vacío → usa el texto del `default:`.

### 🔹 Iterador de valores (`join`)

```

[[join: amenities | sep: ", " | default: (Sin amenities) -> [[item]]]]

```

- `join:` toma un **array de valores** (strings o URLs).
- Usa `sep:` para definir el separador.
- Usa `default:` si el array está vacío.
- Usa `[[item]]` dentro del bloque para insertar cada valor.

### 🔹 Shorthand para imágenes

```

!img([[item]])

```

- Se convierte en Markdown: `![ALT](URL)`
- ALT proviene del contexto (por ejemplo, `room.name`) o usa `"image"` por defecto.

---

## 3️⃣ Orden de ejecución (pipeline)

El motor trabaja en dos fases principales:

1. **Expansión de iteradores (`each` y `join`)**
   - Se procesan primero para preservar su estructura.
   - Generan texto con tokens simples dentro.
2. **Reemplazo de tokens simples**
   - Una vez que los bloques están generados, se reemplazan los tokens simples en todo el texto resultante.

**Pseudocódigo simplificado:**

```js
function hydrate(template, config) {
  let text = expandEachBlocks(template, config);
  text = replaceSimpleTokens(text, config);
  return text;
}
```

---

## 4️⃣ Parsing balanceado de iteradores

### 🔸 Problema

Un simple regex no sirve si hay `[[join: ...]]` dentro de un `[[each: ...]]`,
porque se confundirían los cierres `]]`.

### 🔸 Solución

Se usa **parsing balanceado**, que cuenta aperturas y cierres.

**Algoritmo general:**

1. Buscar `[[each:` en el texto.
2. Encontrar el separador `->` (marca el inicio del bloque interno).
3. Recorrer el texto contando cuántos `[[` y `]]` aparecen.
4. Cuando el contador vuelve a cero → se encontró el cierre correcto.
5. Extraer:

   - **Header:** la parte antes del `->`
   - **Template interno:** el bloque a repetir

---

## 5️⃣ Expansión de `each`

```js
function expandEachBlocks(text, config) {
  while (text.includes("[[each:")) {
    const { start, end, header, innerTemplate } = parseBalancedEach(text);

    const { path, defaultText } = parseHeader(header);
    const arr = get(config, path);

    let replacement = defaultText;
    if (Array.isArray(arr) && arr.length > 0) {
      replacement = arr
        .map((item) => {
          let itemText = expandJoinBlocks(innerTemplate, item);
          itemText = replaceSimpleTokens(itemText, item);
          return itemText.trim();
        })
        .join("\n");
    }

    text = replaceSegment(text, start, end, replacement);
  }
  return text;
}
```

---

## 6️⃣ Expansión de `join`

Dentro de un `each` (o en el texto principal) puede haber `[[join: ...]]`.

```js
function expandJoinBlocks(fragment, item) {
  while (fragment.includes("[[join:")) {
    const { start, end, header, inner } = parseBalancedJoin(fragment);
    const { path, sep, defaultText } = parseHeader(header);
    const arr = get(item, path);

    let replacement = defaultText;
    if (Array.isArray(arr) && arr.length > 0) {
      replacement = arr
        .map((value) => {
          let t = inner;
          // Shorthand de imagen
          if (t.includes("!img([[item]])")) {
            const alt = item.name ?? "image";
            t = t.replace("!img([[item]])", `![${alt}](${value})`);
          }
          return t.replace("[[item]]", value);
        })
        .join(sep);
    }

    fragment = replaceSegment(fragment, start, end, replacement);
  }
  return fragment;
}
```

---

## 7️⃣ Reemplazo de tokens simples

```js
function replaceSimpleTokens(text, config) {
  return text.replace(/\[\[(?!each:|join:)(.+?)\]\]/g, (match, inside) => {
    const parts = inside.split("|").map((p) => p.trim());
    const path = parts[0].replace(/^key:/, "").trim();
    const defaultPart = parts.find((p) => p.startsWith("default:"));
    const defaultValue = defaultPart
      ? defaultPart.replace("default:", "").trim()
      : null;

    const value = get(config, path);
    return value ?? defaultValue ?? match;
  });
}
```

> 🔒 Importante: la expresión regular ignora los tokens que empiezan con `each:` o `join:`
> para no interferir con los iteradores.

---

## 8️⃣ Metadatos de hidratación

Durante el reemplazo, el motor puede registrar:

| Campo      | Descripción                                                |
| ---------- | ---------------------------------------------------------- |
| `used`     | Diccionario con las rutas de config utilizadas             |
| `strategy` | Qué tipo de token se aplicó (`iterator`, `join`, `simple`) |
| `missing`  | Tokens sin valor ni default                                |
| `duration` | Tiempo total de renderizado                                |

Ejemplo parcial de metadatos:

```json
{
  "used": {
    "rooms[0].name": "Single Standard",
    "rooms[0].images[0]": "/hotel999/rooms/single/single.jpg"
  },
  "strategy": ["iterator", "join", "simple"],
  "missing": [],
  "duration": 3.7
}
```

Esto sirve para depurar y validar si el `hotel_config` tiene todos los datos esperados.

---

## 9️⃣ Ejemplo completo

**Template:**

```markdown
[[each: rooms | default: (No rooms) ->

### [[name | default: ?]]

[[join: images | sep: "\n" | default: (Sin imágenes) ->

- !img([[item]])]]
  ]]
```

**Config:**

```js
{
  rooms: [
    {
      name: "Single Standard",
      images: ["/hotel999/rooms/single/single.jpg"],
    },
  ];
}
```

**Salida final:**

```markdown
### Single Standard

- ![Single Standard](/hotel999/rooms/single/single.jpg)
```

---

## 🔟 Edge cases manejados

| Caso                        | Resultado esperado               |
| --------------------------- | -------------------------------- |
| Array inexistente           | Usa `default:`                   |
| Valor vacío en token simple | Usa `default:` o deja el token   |
| Separadores `\n` escapados  | Se transforman en saltos reales  |
| `join` dentro de `each`     | ✅ Soportado                     |
| `each` dentro de `each`     | 🚫 No soportado aún              |
| Tokens sin `key:`           | Se interpretan como ruta directa |

---

## 🔬 Complejidad (rendimiento)

- Parsing balanceado `each/join`: O(L) por bloque
- Reemplazos simples: O(N \* M) (N tokens, M profundidad promedio de ruta)
- Textos cortos → rendimiento más que suficiente.

---

## ⚙️ Mejoras futuras

- ✅ Validación previa: avisar qué tokens no tienen `default` y no existen en config.
- ⚡ Cache de rutas para tokens repetidos.
- 🔁 Soporte para anidamiento de `each`.
- 🧩 AST declarativo (árbol sintáctico) para pruebas unitarias.
- 🧰 Linter de plantillas (verificar `sep`, `default`, etc.).

---

## 🧱 Resumen de flujo completo

```
1. Normalizar texto (limpiar espacios, codificación)
2. expandEachBlocks() → procesa [[each: ...]]
3. expandJoinBlocks() dentro de cada item
4. replaceSimpleTokens() sobre el texto final
5. Registrar metadatos y devolver resultado
```

---

## 📘 Conclusión

El motor avanzado convierte plantillas semánticas (con tokens) en texto listo para publicar.

**Ventajas:**

- Soporta anidamiento controlado (`join` dentro de `each`).
- Mantiene la estructura del documento.
- Permite fallback seguro con `default`.
- Traza qué datos fueron usados.
- Escalable a nuevas estructuras (`services`, `staff`, `gallery`, etc.).

> En resumen:
> **tokenización = detectar marcadores**,
> **hidratación = inyectar datos reales**,
> **balanceo = hacerlo sin romper el texto.**

---

✍️ **Autor:** Documentación avanzada del motor de plantillas `begasist`
📅 **Propósito:** Explicar el flujo interno de `tokenization + hydration`
🧱 **Nivel:** Intermedio–Avanzado

```

---

¿Querés que te genere también un archivo `docs/tokenization_examples.md` con ejemplos prácticos listos para testear (cada nivel del motor con su entrada/salida)?  Sería el tercer bloque del conjunto `basics / advanced / examples`.
```
