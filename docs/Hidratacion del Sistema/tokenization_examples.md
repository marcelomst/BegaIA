// Path: /home/marcelo/begasist/docs/Hidratacion del Sistema/tokenization_examples.md

# 🧪 Ejemplos prácticos de tokenización e hidratación

Esta guía reúne **casos de ejemplo** para entender, probar y depurar el motor de plantillas de `begasist`.

---

## 1️⃣ Nivel básico — tokens simples

### 🧩 Template

```txt
Hola [[nombre]], bienvenido a [[ciudad]].
```

### ⚙️ Config

```js
const config = {
  nombre: "Ana",
  ciudad: "Montevideo",
};
```

### 🧾 Resultado

```
Hola Ana, bienvenido a Montevideo.
```

---

## 2️⃣ Con valor por defecto

### 🧩 Template

```txt
Hola [[nombre | default: Invitado]], tu ciudad es [[ciudad | default: (desconocida)]].
```

### ⚙️ Config

```js
const config = { nombre: "" };
```

### 🧾 Resultado

```
Hola Invitado, tu ciudad es (desconocida).
```

---

## 3️⃣ Con rutas anidadas (dot notation)

### 🧩 Template

```txt
Bienvenido al [[hotel.nombre]] ubicado en [[hotel.direccion.ciudad]].
```

### ⚙️ Config

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

### 🧾 Resultado

```
Bienvenido al Hotel Azul ubicado en Montevideo.
```

---

## 4️⃣ Join simple (lista de valores)

### 🧩 Template

```txt
Servicios disponibles: [[join: amenities | sep: ", " | default: (Sin amenities)]]
```

### ⚙️ Config

```js
const config = {
  amenities: ["wifi", "pileta", "desayuno incluido"],
};
```

### 🧾 Resultado

```
Servicios disponibles: wifi, pileta, desayuno incluido
```

---

## 5️⃣ Join vacío (usa default)

### 🧩 Template

```txt
Servicios disponibles: [[join: amenities | sep: ", " | default: (Sin amenities)]]
```

### ⚙️ Config

```js
const config = { amenities: [] };
```

### 🧾 Resultado

```
Servicios disponibles: (Sin amenities)
```

---

## 6️⃣ Each básico (lista de objetos)

### 🧩 Template

```txt
Habitaciones:
[[each: rooms | default: (No rooms) ->
- [[name | default: ?]] — $[[price]]
]]
```

### ⚙️ Config

```js
const config = {
  rooms: [
    { name: "Single", price: 40 },
    { name: "Double", price: 70 },
  ],
};
```

### 🧾 Resultado

```
Habitaciones:
- Single — $40
- Double — $70
```

---

## 7️⃣ Each vacío (usa default)

### 🧩 Template

```txt
Habitaciones:
[[each: rooms | default: (No rooms) ->
- [[name]] — $[[price]]
]]
```

### ⚙️ Config

```js
const config = { rooms: [] };
```

### 🧾 Resultado

```
Habitaciones:
(No rooms)
```

---

## 8️⃣ Each con join interno (imágenes)

### 🧩 Template

```markdown
[[each: rooms | default: (No rooms) ->

### [[name]]

[[join: images | sep: "\n" | default: (Sin imágenes) -> - !img([[item]])]]
]]
```

### ⚙️ Config

```js
const config = {
  rooms: [
    {
      name: "Single Standard",
      images: [
        "/hotel999/rooms/single/single.jpg",
        "/hotel999/rooms/single/2.jpg",
      ],
    },
    {
      name: "Double Deluxe",
      images: [],
    },
  ],
};
```

### 🧾 Resultado

```markdown
### Single Standard

- ![Single Standard](/hotel999/rooms/single/single.jpg)
- ![Single Standard](/hotel999/rooms/single/2.jpg)

### Double Deluxe

(Sin imágenes)
```

---

## 9️⃣ Each con tokens simples dentro

### 🧩 Template

```txt
[[each: staff | default: (Sin personal) ->
Empleado: [[nombre]] ([[rol | default: sin rol]])
]]
```

### ⚙️ Config

```js
const config = {
  staff: [{ nombre: "Lucía", rol: "Recepción" }, { nombre: "Marcos" }],
};
```

### 🧾 Resultado

```
Empleado: Lucía (Recepción)
Empleado: Marcos (sin rol)
```

---

## 🔟 Join de valores + imagen shorthand

### 🧩 Template

```markdown
Galería:
[[join: fotos | sep: "\n" | default: (Sin fotos) -> - !img([[item]])]]
```

### ⚙️ Config

```js
const config = {
  fotos: ["/gallery/1.jpg", "/gallery/2.jpg"],
};
```

### 🧾 Resultado

```markdown
Galería:

- ![image](/gallery/1.jpg)
- ![image](/gallery/2.jpg)
```

---

## 11️⃣ Join dentro de texto

### 🧩 Template

```txt
El hotel ofrece [[join: servicios | sep: ", " | default: (ningún servicio) -> [[item]]]].
```

### ⚙️ Config

```js
const config = {
  servicios: ["pileta", "wifi", "bar"],
};
```

### 🧾 Resultado

```
El hotel ofrece pileta, wifi, bar.
```

---

## 12️⃣ Token faltante (sin default)

### 🧩 Template

```txt
Bienvenido a [[hotel.nombre]] de [[hotel.ciudad]]
```

### ⚙️ Config

```js
const config = { hotel: { nombre: "Hotel Verde" } };
```

### 🧾 Resultado

```
Bienvenido a Hotel Verde de [[hotel.ciudad]]
```

> 🔎 El token sin valor y sin default se conserva, para que se note que falta data.

---

## 13️⃣ Default con espacios y símbolos

### 🧩 Template

```txt
[[nombre | default: "Sin nombre asignado"]]
[[descripcion | default: (Descripción pendiente...)]]
```

### ⚙️ Config

```js
const config = {};
```

### 🧾 Resultado

```
Sin nombre asignado
(Descripción pendiente...)
```

---

## 14️⃣ Casos mixtos (join + each + simples)

### 🧩 Template

```markdown
# [[hotel.nombre]]

Dirección: [[hotel.direccion.ciudad]], [[hotel.direccion.pais]]

Servicios: [[join: amenities | sep: ", " | default: (sin amenities)]]

[[each: rooms | default: (no rooms) ->

## [[name]]

Precio: $[[price]]

[[join: images | sep: "\n" | default: (Sin imágenes) -> - !img([[item]])]]

]]
```

### ⚙️ Config

```js
const config = {
  hotel: {
    nombre: "Hotel Mar Azul",
    direccion: { ciudad: "Punta del Este", pais: "Uruguay" },
  },
  amenities: ["wifi", "pileta", "spa"],
  rooms: [
    {
      name: "Single",
      price: 40,
      images: ["/rooms/single1.jpg", "/rooms/single2.jpg"],
    },
    {
      name: "Suite",
      price: 120,
      images: [],
    },
  ],
};
```

### 🧾 Resultado

```markdown
# Hotel Mar Azul

Dirección: Punta del Este, Uruguay

Servicios: wifi, pileta, spa

## Single

Precio: $40

- ![Single](/rooms/single1.jpg)
- ![Single](/rooms/single2.jpg)

## Suite

Precio: $120

(Sin imágenes)
```

---

## ✅ Sugerencias para pruebas unitarias

- Usar **templates cortos** para cada tipo de token.
- Probar **config vacíos** para verificar los `default`.
- Medir si el parser **no rompe delimitadores balanceados** (`[[` / `]]`).
- Confirmar que el **orden de reemplazo** (each → join → simples) se mantiene.
- Registrar `metadatos.used` y `missing` para validar cobertura de datos.

---

## 🧱 Conclusión

Estos ejemplos cubren:

- Casos básicos (`[[nombre]]`, `[[join: ...]]`)
- Casos estructurados (`[[each: ... -> ...]]`)
- Anidamientos (`join` dentro de `each`)
- Fallbacks y rutas anidadas
- Renderización Markdown con imágenes

📚 Junto con los archivos:

- [`tokenization_basics.md`](./tokenization_basics.md)
- [`tokenization_advanced.md`](./tokenization_advanced.md)

…este documento completa la **guía de referencia práctica** para el sistema de plantillas `begasist`.

---

✍️ **Autor:** Documentación de ejemplos prácticos de `begasist`
📅 **Propósito:** Demostraciones y pruebas de la hidratación de plantillas
🧱 **Nivel:** Ejemplos ejecutables / QA

```

---

¿Querés que te prepare también una **versión interactiva en JS/TS** (por ejemplo `scripts/test_hydration.ts`) que ejecute estos casos automáticamente y te muestre en consola cada entrada/salida?
```
