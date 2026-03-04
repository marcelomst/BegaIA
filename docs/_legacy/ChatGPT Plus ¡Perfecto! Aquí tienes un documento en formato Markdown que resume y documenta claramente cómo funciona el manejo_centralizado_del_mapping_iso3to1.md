¡Perfecto! Aquí tienes **un documento en formato Markdown** que resume y documenta claramente cómo funciona el manejo centralizado del mapping `iso3to1` en tu sistema, incluyendo los scripts y convenciones.

---

````markdown
# 🌍 Gestión Centralizada de Idiomas en el Sistema (ISO 639-3 → ISO 639-1)

## 📄 Resumen

El sistema utiliza **ISO 639-1** para todas las operaciones internas, excepto cuando se utiliza la librería `franc` para detección de idioma, que retorna códigos ISO 639-3.  
Para asegurar consistencia, mantenemos un mapping centralizado de `iso3to1` (por ejemplo: `spa` → `es`) en la configuración global del sistema, bajo el registro `hotelId: "system"` en la colección `hotel_config` de AstraDB.

---

## 📚 Estructura en hotel_config

```json
{
  "hotelId": "system",
  "iso3to1": {
    "spa": "es",
    "eng": "en",
    "fra": "fr",
    "por": "pt",
    "ita": "it",
    "deu": "de",
    "rus": "ru",
    "nld": "nl"
    // ...otros que necesites
  },
  ...
}
````

---

## 🚀 Scripts Utilizados

### 1️⃣ Actualizar el mapping

Utiliza el script `/scripts/update-system-iso3to1.ts` para agregar o actualizar el mapping.
Ejemplo de ejecución:

```bash
pnpm tsx scripts/update-system-iso3to1.ts
```

### 2️⃣ Verificar el mapping

Usa `/scripts/show-system-iso3to1.ts` para imprimir y validar el mapping actual en consola:

```bash
pnpm tsx scripts/show-system-iso3to1.ts
```

---

## 🧠 Convención en el Código

* **Al detectar idioma con `franc`:**

  * Se recibe el código ISO 639-3 (ejemplo: `spa`).
  * Se consulta el mapping `iso3to1` centralizado.
  * Se utiliza siempre el código ISO 639-1 correspondiente (ejemplo: `es`) para toda lógica posterior: traducción, persistencia, configuración, etc.

### Ejemplo en pseudocódigo:

```ts
const config = await getHotelConfig("system");
const iso3to1 = config?.iso3to1 || {};
const detectedIso3 = franc(text); // "spa"
const detectedIso1 = iso3to1[detectedIso3] || "es";
```

---

## 🔍 Ventajas del Enfoque

* **Flexibilidad:** Puedes actualizar el mapping sin necesidad de modificar código fuente.
* **Robustez:** Permite soportar fácilmente nuevos idiomas detectados por `franc`.
* **Centralización:** Toda la lógica de idioma es coherente en la plataforma, evitando hardcodeos dispersos.

---

## 🛠️ Tareas de Mantenimiento

* Si aparece un idioma nuevo detectado por `franc`, simplemente actualiza el campo `iso3to1` del registro `hotelId: "system"`.
* Revisar periódicamente si los idiomas que usan tus hoteles están correctamente mapeados.

---

## **Recomendación:**
Mantener este archivo actualizado y referencialo en las PR/commits relacionados con internacionalización, vectorización y procesamiento de texto.


