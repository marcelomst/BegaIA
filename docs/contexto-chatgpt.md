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
   hotelId: string;
  hotelName: string;
  defaultLanguage: string;
  timezone: string;
  channelConfigs: Partial<ChannelConfigMap>;
  users?: HotelUser[];
  verification?: {
    baseUrl?: string;
  };
  emailSettings?: {
    emailAddress: string;         // cuenta completa (ej: info@hotel.com)
    password: string;             // ⚠️ considerar encriptación si se almacena
    imapHost: string;
    imapPort: number;
    smtpHost: string;
    smtpPort: number;
    secure?: boolean;             // para SMTP
    checkInterval?: number;       // intervalo en ms (ej. 15000)
  };
  
  whatsappSettings?: {
    number: string;
    apiKey?: string;
  };
  retrievalSettings?: {
    useAstra: boolean;
    fallbackUrl?: string;
  };
  lastUpdated?: string;
}
```

### messages

```ts
{
  messageId: string;        // ID lógico único
  conversationId?: string;  // opcional, para agrupar hilos
  hotelId: string;
  channel: Channel;
  sender: string;
  content: string;
  timestamp: string;        // formato ISO
  time: string;             // hora legible
  suggestion: string;       // sugerencia original del asistente
  approvedResponse?: string; // respuesta aprobada por el recepcionista
  respondedBy?: string;     // email o identificador del recepcionista
  status: MessageStatus;    // pending, sent, rejected, expired
}
```

## ✨ Objetivo actual

Tener un sistema funcional multihotel con:

* Login seguro (JWT)
* Control de roles
* Canales supervisados funcionando
* Panel administrativo operativo
* Menu de registro de usuarios en proceso
* Flujo de Mantenimiento de Hotel
** Alta de Hotel
*** Alta de Usuario Administrador
