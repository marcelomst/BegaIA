# ✅ Checklist de Verificación para Desarrollo Multihotel

Este archivo resume las validaciones clave que deben realizarse luego de cambios en la arquitectura del sistema.

---

## 🔐 Roles y control de acceso

- [ ] Usuario con `roleLevel = 0` (Admin) puede acceder a todas las rutas `/admin`.
- [ ] Usuario con `roleLevel = 10` (Gerente) **NO** puede acceder a:
  - `/admin/hotels`
  - `/admin/data`
  - `/admin/prompts`
  - `/admin/logs`
- [ ] Usuario con `roleLevel = 20` (Recepcionista) **solo accede a**:
  - `/admin/channels`
  - `/auth/change-password`

---

## 👥 Usuarios en múltiples hoteles

- [ ] Usuario que pertenece a más de un hotel ve el **selector de hotel** tras el login.
- [ ] Al elegir un hotel, se genera un JWT que incluye el `hotelId` correcto.
- [ ] El panel `Admin` muestra el hotel seleccionado (nombre e ID).
- [ ] El `hotelId` queda guardado en sesión correctamente y se propaga.

---

## 💬 Filtro de mensajes por hotel

- [ ] `/admin/channels` muestra solo los mensajes del `hotelId` actual.
- [ ] El endpoint `/api/messages/by-conversation` devuelve solo mensajes del hotel correspondiente.
- [ ] El test de integración `messagesByConversation.test.ts` filtra correctamente por `hotelId`.

---

## 🧪 Tests automáticos

- [ ] `pnpm vitest run` pasa sin errores.
- [ ] `insert-test-message.ts` funciona y genera mensajes válidos.
- [ ] El test `updateMessageInAstra.test.ts` actualiza mensajes correctamente con validación por `hotelId`.

---

## 🔐 Seguridad general

- [ ] Endpoints protegidos (`/api/...`) devuelven `401` si no hay sesión válida.
- [ ] El logout (`/api/logout`) limpia cookies correctamente.
- [ ] El middleware redirige a `/auth/login` si el token es inválido o falta.

---

## 🔄 Scripts de mantenimiento (manual)

- [ ] `scripts/insert-test-message.ts` genera mensajes de prueba aislados (`conversationId = test-convo-001`)
- [ ] (Opcional) `scripts/delete-test-messages.ts` limpia los mensajes de prueba de tests

---

## 🛠️ Recordatorios

- [ ] No hardcodear `hotelId` en producción (`"hotel123"`)
- [ ] Verificar que los `ChannelMessage` siempre incluyan `hotelId`
- [ ] Probar desde un navegador real el flujo de login/logout/cambio de hotel

---

