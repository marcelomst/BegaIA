# 🧠 Resumen teórico-práctico: Autenticación segura con JWT y Refresh Tokens

Este sistema de asistencia hotelera SaaS implementa **autenticación moderna basada en JWT**, siguiendo buenas prácticas de seguridad. A continuación se resumen los conceptos clave y cómo fueron aplicados.

---

## 🔐 1. JWT (Access Token)

### ◾ Concepto

Un **JWT** (JSON Web Token) es un token firmado que contiene información sobre el usuario (`email`, `hotelId`, etc.). Se utiliza para autenticar al usuario en cada request sin mantener sesiones en servidor.

### ◾ Decisión

* Generamos el JWT en `/api/login` tras validar las credenciales.
* Tiene una duración **corta (1 hora)** por seguridad.
* Se guarda en una **cookie `HttpOnly`** para evitar accesos por JavaScript.

### ◾ Código relevante

```ts
const accessToken = await signJWT(payload);
response.cookies.set("token", accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
  maxAge: 60 * 60,
});
```

---

## 🔁 2. Refresh Token

### ◾ Concepto

Un **refresh token** sirve para obtener un nuevo `accessToken` cuando este expire. Tiene duración larga (por ejemplo, 7 días). Nunca se envía explícitamente por el frontend: el navegador lo manda automáticamente como cookie.

### ◾ Decisión

* Se genera junto con el JWT en el login.
* Se almacena también como cookie `HttpOnly`.
* Se utiliza en `/api/refresh` para emitir un nuevo token.

### ◾ Código relevante

```ts
const refreshToken = await signRefreshToken(payload);
response.cookies.set("refreshToken", refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
});
```

---

## 📡 3. Cookies `HttpOnly` y `Secure`

### ◾ Concepto

* `HttpOnly`: impide que JavaScript acceda a la cookie → evita ataques XSS.
* `Secure`: solo se envía sobre HTTPS → evita ataques MITM.
* `SameSite: "strict"`: evita que sitios externos puedan usar las cookies → protege contra CSRF.

### ◾ Decisión

* Se usó en ambas cookies (`token` y `refreshToken`).
* Se activan condicionalmente para permitir desarrollo en localhost (`secure: NODE_ENV === "production"`).

---

## 🚧 4. Middleware y protección de rutas

### ◾ Concepto

Next.js permite proteger rutas con `middleware.ts`. También usamos `requireAuth()` en endpoints protegidos.

### ◾ Decisión

* `middleware.ts` lee el token desde cookies y redirige a `/login` si falta o es inválido.
* `requireAuth.ts` hace lo mismo dentro de rutas API.

### ◾ Código relevante (middleware y auth):

```ts
// middleware.ts
const token = req.cookies.get("token")?.value;
const payload = await verifyJWT(token);
```

```ts
// requireAuth.ts
const token = req.cookies.get("token")?.value;
const payload = await verifyJWT(token);
```

---

## ⚠️ 5. Código 401: Unauthorized

### ◾ Concepto

El servidor responde con `401 Unauthorized` cuando el token está ausente o inválido.

### ◾ Decisión

* El frontend usa `fetchWithAuth()` y, si recibe `401`, intenta renovar el token automáticamente con `/api/refresh`.

---

## 🔄 6. Flujo completo del usuario autenticado

```
[LOGIN]
 ↓
Servidor devuelve accessToken + refreshToken → Cookies
 ↓
[USUARIO NAVEGA]
 ↓
AccessToken se usa para validar cada request → Si válido, ok
 ↓
AccessToken expira → servidor responde 401
 ↓
Frontend llama /api/refresh → refreshToken en cookie
 ↓
Servidor emite nuevo accessToken → Cookie "token"
 ↓
Frontend reintenta la request original
```

---

## ✅ Conclusiones para futuros desarrolladores

* Usar `JWT` permite autenticación stateless.
* Separar `accessToken` y `refreshToken` mejora seguridad y experiencia.
* Cookies `HttpOnly` + `SameSite` son fundamentales contra XSS y CSRF.
* Middleware y funciones `requireAuth()` deben usar el mismo método de lectura del token (`cookies.get("token")`).
* `/api/refresh` debe implementarse como endpoint seguro que renueva el token solo si el `refreshToken` es válido.
* Es recomendable rotar el `refreshToken` en cada uso para evitar reutilización maliciosa (*token rotation*).
