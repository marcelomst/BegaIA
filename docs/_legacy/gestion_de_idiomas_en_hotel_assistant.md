# 🌐 Gestión de Idiomas en Hotel Assistant

Este documento detalla las decisiones, convenciones y flujo técnico para el manejo de idiomas en el sistema Hotel Assistant (vectorización, frontend, APIs y almacenamiento).

---

## 🧩 1. **Principios generales**

- El **idioma base** de cada hotel (vectorización) se define en la configuración del hotel (`hotel_config.defaultLanguage`) y **usa ISO 639-1** (código de dos letras, ej: `es`, `en`, `pt`).
- Todo el sistema interno (APIs, almacenamiento, selección de idioma) usa **ISO 639-1** como estándar principal.
- **franc** se utiliza para **detección automática de idioma** en textos y devuelve códigos **ISO 639-3** (tres letras, ej: `spa`, `eng`, `por`).
- Se convierte **inmediatamente** el resultado de `franc` de ISO 639-3 a ISO 639-1 para mantener la coherencia.

---

## 🏨 2. **Vectorización y almacenamiento de documentos**

- Cada documento subido por el hotel se vectoriza **en el idioma base** configurado por el hotel.
- Antes de la vectorización:
  - Se detecta el idioma de origen con **franc**.
  - Si el idioma detectado (`detectedLang`, ISO 639-3) **no coincide** con el idioma base (`targetLang`, ISO 639-1), se traduce el texto al idioma base antes de vectorizar.
  - Se almacena el campo `detectedLang` (informativo) y `targetLang` (debe ser igual a `defaultLanguage` del hotel).
- **Nunca** se guardan varias versiones de un documento en distintos idiomas dentro de la misma colección, salvo que el sistema evolucione a soporte multilingüe explícito.

---

## 🖥️ 3. **Interfaz y panel de control**

- El **panel de control** (admin dashboard) soporta múltiples idiomas de UI para los usuarios, pero **esto es independiente del idioma de la base vectorizada**.
- El idioma de la UI se selecciona mediante configuración de usuario (preferencias) o detección del navegador.
- Se recomienda usar librerías como `next-i18next` o similar para la traducción del frontend.

---

## 💬 4. **Canales de atención al huésped**

- Los canales (web, WhatsApp, email, etc.) aceptan preguntas en cualquier idioma.
- El sistema detecta automáticamente el idioma de cada consulta con **franc**.
- Si la pregunta llega en un idioma diferente al idioma base del hotel:
  1. Se traduce la pregunta al idioma base para búsqueda en la base vectorizada.
  2. La respuesta generada por el asistente se traduce de vuelta al idioma original del huésped antes de responderle.
- Este flujo permite soporte multilingüe **sin necesidad de vectorizar en todos los idiomas posibles**.

---

## 🛠️ 5. **Conversión de códigos de idioma (ISO 639-3 → 639-1)**

- Apenas se detecta el idioma con `franc`, se convierte el resultado a ISO 639-1 usando una librería npm como [`langs`](https://www.npmjs.com/package/langs) para evitar mapeos manuales y garantizar compatibilidad universal.
- Ejemplo en TypeScript:

  ```ts
  import langs from "langs";

  function iso3ToIso1(iso3: string): string | null {
    const lang = langs.where("3", iso3);
    return lang?.["1"] || null;
  }

  // Ejemplo de uso:
  const detectedLang3 = "spa"; // franc output
  const iso1 = iso3ToIso1(detectedLang3); // "es"

### ⚠️ 6. Consideraciones y best practices
Nunca hardcodear grandes tablas de idiomas; siempre preferir librerías que sigan los estándares oficiales.

Definir claramente el idioma base al crear el hotel y mostrar advertencia al usuario si no está definido.

Guardar siempre el idioma original detectado como dato informativo (detectedLang), pero tomar decisiones lógicas solo en base a targetLang/defaultLanguage.

Si en el futuro se requiere soporte multilingüe real (varios embeddings por idioma), documentar y versionar cuidadosamente la arquitectura.

### 📄 7. Resumen de flujo de idioma

1. Usuario sube documento.
2. El backend detecta idioma con franc (ISO 639-3).
3. Convierte a ISO 639-1.
4. Compara con `hotel_config.defaultLanguage` (ISO 639-1):
    - Si son iguales → no traduce.
    - Si son distintos → traduce usando GPT, DeepL o el traductor definido.
5. Vectoriza el texto solo en el idioma base.
6. Guarda ambos códigos en la metadata (`detectedLang`, `targetLang`).

### ✅ 8. Checklist para desarrolladores
 Todos los métodos de API/DB aceptan/devuelven ISO 639-1, excepto la salida cruda de franc.

 El sistema convierte inmediatamente el output de franc a ISO 639-1.

 El campo defaultLanguage del hotel es obligatorio y documentado.

 El panel de control soporta traducción de UI, pero no la base vectorizada.

 El canal huésped traduce on-the-fly cuando corresponde.

