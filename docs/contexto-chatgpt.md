# 🧠 Contexto de Desarrollo: Asistente Hotelero Multicanal

## 🔧 Stack y arquitectura

* **Framework principal:** Next.js + LangChain (LangGraph)
* **Base de datos:** AstraDB (Document DB + búsqueda vectorial)
* **Backend conversacional:** LangChain Graph con nodos por intención
* **Frontend:** App admin con panel de control (`/admin`), canal web (`/`), login (`/login`)
* **Persistencia de mensajes:** colección `messages` en AstraDB
* **Autenticación:** JWT + refresh token (guardado en cookie HttpOnly)

## 🏨 Multihotel y configuración

* Cada hotel se identifica por un `hotelId` (`hotel123`, etc.)
* Configuración por hotel en la colección `hotel_config`, incluyendo:

  * `hotelName`, `timezone`, `defaultLanguage`
  * `channelConfigs`: modo `automatic` o `supervised` por canal
  * `users`: lista de usuarios locales con `userId`, `email`, `roleLevel`

## 🔐 Roles definidos

```ts
export type RoleLevel = 0 | 10 | 20; // Técnico, Gerencial, Estándar
```

Los roles se usan para controlar acceso al panel admin:

* `< 10`: acceso total
* `10 <= x < 20`: acceso gerencial
* `x >= 20`: acceso estándar

## 💬 Canales soportados

* Web, Email, WhatsApp, Channel Manager
* Cada canal tiene modo supervisado o automático
* Todos los mensajes se guardan en la colección global `messages`

## 🔄 Flujo de login

* POST `/api/login` → Verifica credenciales locales (bcrypt)
* Si OK, genera `access token` y `refresh token`

  * Access token: guardado en `localStorage`
  * Refresh token: cookie HttpOnly
* Middleware global `/middleware.ts` protege rutas `/admin/**`

  * Verifica token
  * Redirige a `/login` si no hay token o si el `roleLevel >= 20`

## 🔁 Refresh de token

* Endpoint `/api/refresh` lee el refresh token de la cookie y genera nuevo access token
* Frontend usa `fetchWithAuth()` que intenta renovar token automáticamente

## 📦 Colecciones clave en AstraDB

### hotel\_config

```ts
{
  hotelId: "hotel123",
  hotelName: "Hotel Demo",
  defaultLanguage: "spa",
  timezone: "America/Montevideo",
  channelConfigs: { web: { enabled: true, mode: "supervised" }, ... },
  users: [
    { email: "admin@hotel.com", roleLevel: 0, passwordHash: "...", ... }
  ]
}
```

### messages

```ts
{
  messageId: "uuid",
  hotelId: "hotel123",
  channel: "web",
  content: "¿Tienen desayuno?",
  status: "pending" | "sent" | "rejected",
  suggestion: "Sí, tenemos desayuno buffet incluido.",
  approvedResponse?: "...",
  respondedBy?: "recepcion@hotel.com",
  timestamp: "...",
}
```

## ✨ Objetivo actual

Tener un sistema funcional multihotel con:

* Login seguro (JWT)
* Control de roles
* Canales supervisados funcionando
* Panel administrativo operativo
