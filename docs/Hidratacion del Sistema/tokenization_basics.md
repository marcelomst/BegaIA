// Path: /home/marcelo/begasist/docs/Hidratacion del Sistema/tokenization_basics.md

# 🧩 Guía básica: Tokenización e hidratación de plantillas

## 1️⃣ Concepto general

La **hidratación de plantillas** es un proceso que toma un texto con huecos (llamados _tokens_) y los reemplaza por valores reales obtenidos de un objeto de configuración.

> Template = texto con marcadores  
> Config = objeto con datos reales  
> Hidratación = reemplazar los marcadores con los datos

---

## 2️⃣ Ejemplo simple

**Template:**

```txt
Hola [[nombre]], bienvenido a nuestro sistema.
```

**Config:**

```js
const config = { nombre: "Ana" };
```

**Resultado:**

```
Hola Ana, bienvenido a nuestro sistema.
```

---

## 3️⃣ Token simple

Un _token_ es cualquier texto dentro de `[[` y `]]`, por ejemplo `[[nombre]]`, `[[edad]]`, `[[ciudad]]`.

**Mini-algoritmo:**

```js
function hydrate(template, config) {
  return template.replace(/\[\[(.+?)\]\]/g, (match, key) => {
    const value = config[key];
    return value ?? match; // si no hay dato, deja el token
  });
}
```

---

## 4️⃣ Tokens con valores por defecto

Podemos usar un valor alternativo si falta información:

**Template:**

```txt
Hola [[nombre | default: Invitado]]
```

**Config:**

```js
const config = {}; // no tiene nombre
```

**Resultado:**

```
Hola Invitado
```

**Código:**

```js
function hydrate(template, config) {
  return template.replace(/\[\[(.+?)\]\]/g, (match, inside) => {
    const parts = inside.split("|").map((p) => p.trim());
    const path = parts[0]; // "nombre"
    const defaultPart = parts.find((p) => p.startsWith("default:"));
    const defaultValue = defaultPart
      ? defaultPart.replace("default:", "").trim()
      : null;

    const value = config[path];
    return value ?? defaultValue ?? match;
  });
}
```

---

## 5️⃣ Rutas anidadas (dot notation)

Los datos pueden estar dentro de objetos anidados:

```js
const config = {
  hotel: {
    nombre: "Hotel Azul",
    direccion: {
      ciudad: "Montevideo",
    },
  },
};
```

**Template:**

```txt
Bienvenido al [[hotel.nombre]] de [[hotel.direccion.ciudad]]
```

**Resultado:**

```
Bienvenido al Hotel Azul de Montevideo
```

**Función auxiliar:**

```js
function getByPath(obj, path) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}
```

Usar en el `hydrate`:

```js
const value = getByPath(config, path);
```

---

## 6️⃣ Listas simples con `join`

Cuando queremos listar varios valores de un array:

**Config:**

```js
const config = {
  tags: ["wifi", "pileta", "desayuno"],
};
```

**Template:**

```txt
Servicios: [[join: tags | sep: ", "]]
```

**Resultado:**

```
Servicios: wifi, pileta, desayuno
```

**Código:**

```js
function hydrateJoin(text, config) {
  return text.replace(/\[\[(.+?)\]\]/g, (match, inside) => {
    if (!inside.startsWith("join:")) return match;
    const parts = inside.split("|").map((p) => p.trim());
    const path = parts[0].replace("join:", "").trim();
    const sep =
      parts
        .find((p) => p.startsWith("sep:"))
        ?.replace("sep:", "")
        .trim() ?? ", ";
    const arr = getByPath(config, path);
    return Array.isArray(arr) && arr.length ? arr.join(sep) : "";
  });
}
```

**Combinación:**

```js
function hydrateTemplate(template, config) {
  let text = hydrateJoin(template, config);
  text = hydrate(text, config);
  return text;
}
```

---

## 7️⃣ Bloques repetidos con `each`

Podemos repetir partes del texto por cada elemento de un array.

**Config:**

```js
const config = {
  rooms: [
    { name: "Single", price: 40 },
    { name: "Double", price: 70 },
  ],
};
```

**Template:**

```txt
[[each: rooms | default: (No rooms) ->
- [[name]]: $[[price]]
]]
```

**Resultado:**

```
- Single: $40
- Double: $70
```

📘 Conceptos:

- `[[each: rooms -> ...]]` = repite el bloque por cada habitación.
- Dentro del bloque podés usar tokens simples (`[[name]]`, `[[price]]`).
- Si la lista está vacía → usa el texto del `default:`.

---

## 8️⃣ Imágenes y `join` visual

Podemos combinar `join` con imágenes en Markdown:

**Template:**

```txt
[[join: fotos | sep: "\n" | default: (sin imágenes) -> !img([[item]])]]
```

**Config:**

```js
{
  fotos: ["/hotel/1.jpg", "/hotel/2.jpg"];
}
```

**Resultado:**

```markdown
![image](/hotel/1.jpg)
![image](/hotel/2.jpg)
```

---

## 9️⃣ Orden de reemplazo

El orden correcto del proceso:

1. Expandir **iteradores** (`each`, `join`).
2. Reemplazar **tokens simples** (`[[algo]]`).

> Esto evita errores cuando hay tokens dentro de bloques iterables.

---

## 🔟 Resumen mental (cheat-sheet)

| Tipo de token | Ejemplo                           | Qué hace                     |
| ------------- | --------------------------------- | ---------------------------- |
| Simple        | `[[nombre]]`                      | Inserta valor directo        |
| Con default   | `[[nombre \| default: Invitado]]` | Usa fallback si no hay dato  |
| Ruta anidada  | `[[hotel.nombre]]`                | Lee dentro del objeto        |
| Join          | `[[join: tags \| sep: ", "]]`     | Une arrays de texto          |
| Each          | `[[each: rooms -> ...]]`          | Repite bloques por cada ítem |
| Imagen        | `!img([[item]])`                  | Crea imagen Markdown         |

---

## 🧠 Conclusión

La **hidratación de plantillas** combina texto y datos en tres pasos:

1. **Detectar tokens** (`[[...]]`).
2. **Buscar sus valores** en el objeto `config`.
3. **Reemplazarlos** en orden correcto.

Este mecanismo permite generar textos dinámicos (por ejemplo, descripciones automáticas de hoteles) de manera declarativa, clara y extensible.

---

✍️ **Autor:** Documentación base para `begasist`
📅 **Propósito:** Explicación didáctica del proceso de tokenización + hidratación
🧱 **Nivel:** Introductorio a intermedio

```

---

¿Querés que te genere además una segunda versión en `docs/tokenization_advanced.md` que continúe desde aquí y documente el motor balanceado (`each`, `join`, `!img`, metadatos, etc.) que describiste al principio?
```
