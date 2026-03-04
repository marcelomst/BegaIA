# 🛡️ Arquitectura de Roles y Permisos - Hotel Assistant

Este documento resume la lógica de control de acceso según el `roleLevel` de los usuarios, aplicable tanto en **middleware**, como en **UI (menús, botones, páginas)**.

---

## 🎚 Niveles de Roles

| Rol                           | `roleLevel` | Descripción                                  |
|-------------------------------|-------------|----------------------------------------------|
| **Técnico SaaS Global**       | `0`         | Acceso completo a toda la plataforma SaaS.   |
| **Técnico Hotel (Avanzado)**  | `1-9`       | Configura hotel específico                   |
| **Gerente Hotel**             | `10-19`     | Gestión completa de usuarios y canales.      |
| **Recepcionista / Operativo** | `20+`       | Acceso solo a canales y cambios propios.     |

---

## 🔐 Control de acceso a áreas críticas

| Área                        | `0`  | `1-9` | `10-19` | `20+` |
|-----------------------------|-----|--------|----------|-------|
| **Hoteles**                 | ✅  | ❌    | ❌      | ❌    |
| **Carga de Datos**          | ✅  | ✅    | ❌      | ❌    |
| **Prompts**                 | ✅  | ✅    | ❌      | ❌    |
| **Logs**                    | ✅  | ✅    | ❌      | ❌    |
| **Administración Usuarios** | ✅  | ✅    | ✅      | ❌    |
| **Canales**                 | ✅  | ✅    | ✅      | ✅    |
| **Cambiar Contraseña**      | ✅  | ✅    | ✅      | ✅    |

---

## 🚦 Middleware recomendado (pseudocódigo seguro)

```ts
if (pathname.startsWith("/admin")) {
  if (payload.roleLevel >= 20) {
    // Recepcionistas solo pueden acceder a canales y su cuenta
    if (!pathname.includes("/channels") && !pathname.includes("/change-password")) {
      redirect("/auth/login");
    }
  } else if (payload.roleLevel >= 10) {
    // Gerentes no acceden a hoteles, prompts ni logs
    if (pathname.includes("/hotels") || pathname.includes("/prompts") || pathname.includes("/logs")) {
      redirect("/auth/login");
    }
  } else if (payload.roleLevel >= 1) {
    // Técnicos hotel no acceden a hoteles
    if (pathname.includes("/hotels")) {
      redirect("/auth/login");
    }
  }
}
