# Hotel Demo • Begasist Chat Widget

Esta carpeta contiene una página HTML mínima usada para validar la integración del **Widget de Chat Begasist** antes de instalarlo en el sitio del cliente.

## 1. Objetivo

Probar carga, apariencia, accesibilidad básica y conexión contra el backend Begasist (`apiBase`) para iniciar conversaciones y resetear el estado local sin usar cookies.

## 2. Requisitos

- Node.js >= 18
- Backend Begasist corriendo (por defecto en `http://localhost:3000`)
- Puerto libre para servir el demo (ej.: `8081`)

## 3. Servir el Demo

```bash
# Servir la carpeta (recomendado) con CORS habilitado
npx http-server ./examples/hotel-demo -p 8081 -a 127.0.0.1 --cors -c-1
# Abrir en el navegador
http://127.0.0.1:8081/index.html
```

Si usas directamente el archivo (`http-server index.html`), la ruta `/` devuelve 404; sirve siempre la **carpeta**.

## 4. Snippet de Integración (Producción)

Colocar antes del `</body>`:

```html
<script>
  window.BegAIChat = {
    hotelId: "<HOTEL_ID>",
    apiBase: "https://api.tu-dominio-begasist.com", // asegurar HTTPS
    lang: "es", // idioma principal inicial
    position: "bottom-right", // o "bottom-left"
    theme: { primary: "#0ea5e9" },
    languages: ["es", "en", "pt"], // lista soportada
  };
</script>
<script
  defer
  src="https://cdn.tu-dominio-begasist.com/widget/begai-chat.js"
></script>
```

## 5. Opciones de Configuración

| Opción          | Tipo       | Descripción                                        |
| --------------- | ---------- | -------------------------------------------------- |
| `hotelId`       | `string`   | Identificador único del hotel.                     |
| `apiBase`       | `string`   | Base URL del backend Begasist. Debe permitir CORS. |
| `lang`          | `string`   | Idioma inicial del widget.                         |
| `languages`     | `string[]` | Idiomas disponibles para cambio dinámico.          |
| `position`      | `string`   | `bottom-right` o `bottom-left`.                    |
| `theme.primary` | `string`   | Color principal (CSS var `--brand`).               |

## 6. Reset de Conversación

El widget persiste `conversationId` en `localStorage` con clave: `begai:conversationId:<hotelId>`.

```js
localStorage.removeItem("begai:conversationId:hotel999");
location.reload();
```

Puedes vincularlo a un botón "Nueva conversación".

## 7. CORS (Backend)

El backend debe responder con cabeceras:

```
Access-Control-Allow-Origin: https://www.tu-sitio.com
Access-Control-Allow-Methods: GET,POST,OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

En Nginx (ejemplo mínimo):

```nginx
location / {
  add_header Access-Control-Allow-Origin "https://www.tu-sitio.com" always;
  add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
  add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
  if ($request_method = OPTIONS) { return 204; }
  proxy_pass http://localhost:3000;
}
```

## 8. Seguridad

- **HTTPS** obligatorio en producción.
- Considera Subresource Integrity (SRI) si el script se sirve como archivo estático:
  ```bash
  # Generar hash sha256
  openssl dgst -sha256 -binary widget/begai-chat.js | openssl base64 -A
  # Resultado -> colocar en integrity="sha256-<HASH>"
  ```
  ```html
  <script
    defer
    src="/widget/begai-chat.js"
    integrity="sha256-<HASH>"
    crossorigin="anonymous"
  ></script>
  ```
- Revisa una política de CSP (Content-Security-Policy) acorde:
  `script-src 'self'; connect-src 'self' https://api.tu-dominio-begasist.com;` etc.
- No almacena datos sensibles en cookies; sólo usa `localStorage` para ID de conversación.

## 9. Accesibilidad

- Skip link implementado.
- Botones con `aria-label` cuando el texto no es autoexplicativo.
- `aria-live="polite"` para notificación de carga.
- Mantener contraste al personalizar `theme.primary` (WCAG AA). Verifica con herramientas como Lighthouse.

## 10. Performance

- Script marcado con `defer` para no bloquear el parseo.
- Preload opcional ya incluido para `begai-chat.js` en el demo.
- CSS crítico inline; si crece, migrar a archivo separado con caché largo y hash (`style.[hash].css`).

## 11. SEO

Esta página demo está marcada con `noindex,nofollow` (remover meta robots en producción real del hotel si se desea indexación).

## 12. Personalización Visual Rápida

Cambiar color primario:

```html
<script>
  window.BegAIChat = { theme: { primary: '#1d4ed8' }, ... };
</script>
```

El widget aplicará el valor a su esquema interno.

## 13. Checklist Antes de Producción

- [ ] `apiBase` apunta a entorno productivo HTTPS
- [ ] CORS configurado (ver sección 7)
- [ ] Opciones de idioma validadas
- [ ] Color primario cumple contraste mínimo
- [ ] SRI aplicado (opcional pero recomendado)
- [ ] CSP actualizada para permitir sólo orígenes necesarios
- [ ] Remover `robots noindex` (si se quiere indexar)

## 14. Troubleshooting

| Problema                              | Posible causa                                  | Solución                                       |
| ------------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| 404 al abrir `http://127.0.0.1:8081/` | Serviste el archivo en vez de la carpeta       | Servir la carpeta (ver sección 3)              |
| El widget no aparece                  | Script bloqueado por CSP o CORS                | Revisa consola y cabeceras CORS                |
| Conversación no persiste              | Limpieza de localStorage o cambio de `hotelId` | Verifica clave y evita borrar antes de recarga |

## 15. Próximos pasos

Para incluir documentación más formal del API del widget, crea un archivo adicional `WIDGET_API.md` describiendo eventos, métodos de control y hooks si el cliente lo requiere.

---

Para dudas técnicas adicionales: integrar logs del widget o modo debug (`?debugWidget=1`) si está soportado por la versión instalada.
