# Test de integración para el componente UserStatus

Este documento describe el flujo de prueba automatizada del componente `UserStatus` en la aplicación `begasist`, que utiliza el contexto de usuario y la autenticación mediante JWT + refresh tokens.

---

## 🌐 Contexto

El componente `UserStatus` muestra información del usuario autenticado, como:

* Email
* Hotel ID
* Nivel de rol (`roleLevel`)

Utiliza el `UserContext` para obtener y actualizar estos datos.

La información se obtiene desde la API `/api/me`, usando `fetchWithAuth`, que incluye automáticamente el JWT actual (si está presente) y puede hacer fallback a `/api/refresh` si recibe un 401.

---

## 📚 Objetivo del test

Verificar los siguientes comportamientos:

1. El componente muestra correctamente los datos del usuario luego de cargarlos.
2. El botón "Refrescar usuario" actualiza los datos mostrados tras invocar la carga nuevamente.
3. Se muestra un mensaje de error si la API devuelve 401 (no autorizado).

---

## ⚖️ Herramientas utilizadas

* **Vitest** para la ejecución del test.
* **@testing-library/react** para renderizar el componente y simular interacciones.
* **Mock de `fetchWithAuth`** usando `vi.mock()`.

---

## ✅ Resultado esperado

Al correr el test con:

```bash
pnpm vitest run test/integration/UserStatus.test.tsx
```

Se espera que:

* Todos los tests pasen sin errores.
* Los `console.log` de depuración (si los hay) confirmen las fases del ciclo de vida del `UserContext`.

---

## 📚 Ubicación del test

Archivo:

```
test/integration/UserStatus.test.tsx
```

---

## 👌 Buenas prácticas aplicadas

* Uso de `UserProvider` real para testear en contexto.
* Mock aislado de `fetchWithAuth` para evitar llamadas reales.
* Verificación mediante `screen.getByText()` con contenido visible.
* Comprobación del estado inicial, intermedio y final del componente.

---

## 📅 Próximos pasos sugeridos

* Extraer el `UserProvider` a un helper reutilizable para otros tests.
* Testear `fetchWithAuth` con fallback real a `/api/refresh` en otro archivo.
* Validar comportamiento en entornos con y sin cookie `refreshToken`.

---

🌟 Este test mejora la robustez del sistema de autenticación y la confianza sobre el estado global del usuario en el frontend.
