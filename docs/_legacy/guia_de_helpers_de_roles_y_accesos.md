# 📚 Guía de Helpers de Roles y Acceso

Archivo: `/lib/auth/roles.ts`

## 🎭 Enum de Roles

```ts
export enum RoleLevel {
  SuperAdmin = 0,        // Acceso total solo para hotelId 'system'
  SysAdmin = 0.1,        // Admin global de hoteles
  SysSupport = 0.2,      // Soporte global
  HotelTechMin = 1,      // Técnicos hotel (sin acceso a hoteles globales)
  HotelTechMax = 9.99,
  HotelAdmin = 10,       // Admin de hotel (no global)
  Reception = 20,        // Recepcionista
  Guest = 30,            // Invitado (acceso restringido)
}
