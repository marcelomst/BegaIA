// Path: /root/begasist/lib/parsers/emailParser.md

# ℹ️ emailParser – Notas sobre formatos de correo y remitentes

## 🧠 ¿Por qué cambia el formato del correo aunque todos lleguen a Gmail?

Aunque todos los correos se están leyendo desde una cuenta Gmail (vía IMAP), **el formato del mensaje depende del cliente con el que fue enviado**, no de Gmail.

Gmail **preserva casi intacto** el cuerpo y los encabezados generados por el remitente original.

---

## 🗂️ Ejemplos típicos de remitentes y sus formatos

| Cliente / Servicio        | Tipo de formato recibido en Gmail                             | Observaciones |
|---------------------------|----------------------------------------------------------------|---------------|
| **ProtonMail**            | `multipart/alternative`, HTML con `<div class="protonmail_signature_block">` | Firma HTML automática, a veces en `text`, `html` y hasta en base64. |
| **Gmail Web / App**       | `text/plain` o `text/html`, limpio                             | Muy predecible. |
| **Outlook / Hotmail**     | HTML complejo, estilos embebidos (`<style>`)                   | A veces añade metadata oculta. |
| **iPhone / Apple Mail**   | Firma tipo “Sent from my iPhone”                               | Aparece en `text/plain`. |
| **Thunderbird / otros**   | Puede variar según configuración                               | Algunas veces incluye forward automático. |

---

## 🧼 ¿Cómo se maneja esto en el parser?

1. Se utiliza [`simpleParser`](https://nodemailer.com/extras/mailparser/) para descomponer el email en `text`, `html`, `attachments`, etc.
2. Se aplican reglas de limpieza específicas dentro de `cleanSignature(text)` para eliminar firmas automáticas y patrones típicos de clientes conocidos.
3. Se ordenan los candidatos por longitud, se normaliza espacio y se toma el más largo tras la limpieza.

---

## 📌 Nota importante

> **Gmail no estandariza el contenido de los correos recibidos**.  
> Esto es útil para preservar trazabilidad y compatibilidad con RFC 5322, pero implica que el sistema receptor (en este caso, el bot hotelero) debe adaptarse a múltiples variantes de formato.

---

## ✅ Recomendaciones

- Seguir extendiendo `cleanSignature()` para patrones observados en producción.
- Usar `logToFile(...)` para analizar nuevos casos.
- Evitar depender del orden o presencia exclusiva de `parsed.text`.

---

_Este documento es complementario a `/lib/parsers/emailParser.ts`_

### ⚠️ Notas clave para el parser de emails (`parseEmailToChannelMessage`)

- **Siempre priorizá el campo `parsed.text`** como cuerpo principal del email. La mayoría de los proveedores (Gmail, Vera, ProtonMail) lo incluyen correctamente.
- **Si el parser deja de funcionar con algún proveedor**, revisá primero los parámetros requeridos en la función y su tipo. Un error común es declarar argumentos no usados como obligatorios (ej: `imapMsg`), lo que puede bloquear la ejecución y hacer que el parser no procese ningún correo.
- Si usás TypeScript, asegurate de que los tipos de los argumentos coincidan exactamente con la llamada.
- Para debugging avanzado, agregá logs explícitos (ej: `console.log` o `logToFile`) para verificar que la función realmente se está ejecutando y qué valores está extrayendo.
- Si un proveedor cambia el formato del email, inspeccioná el objeto `parsed` completo y ajustá el extractor para priorizar siempre el texto "humano", evitando usar subject o headers como fallback salvo casos extremos.
