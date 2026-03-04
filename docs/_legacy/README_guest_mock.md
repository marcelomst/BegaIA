# Mock de módulos Guest

## ¿Por qué existen estos mocks?

Durante el refactor y limpieza de errores de compilación, se detectó que los módulos `@/types/guest` y `@/lib/api/guests` son esenciales para el control de mensajes y perfiles de huéspedes (guest) en el sistema. Sin embargo, sus implementaciones reales no estaban presentes, probablemente por un refactor previo.

Para evitar bloquear el desarrollo y mantener la compilación limpia, se crearon archivos mock:

---

## Archivos mock creados

### 1. `types/guest.d.ts`

```ts
// MOCK: Tipos de guest para evitar errores de compilación
// ⚠️ Este archivo es un mock. Revisar y ajustar según la lógica real del proyecto.
export type Guest = {
  name?: string;
  email?: string;
  phone?: string;
  mode?: GuestMode;
};
export type GuestMode = "automatic" | "manual" | "supervised";
```

### 2. `lib/api/guests.ts`

```ts
// MOCK: API de guests para evitar errores de compilación
// ⚠️ Este archivo es un mock. Revisar y ajustar según la lógica real del proyecto.
export async function fetchGuest(
  hotelId: string,
  guestId: string
): Promise<any> {
  // Simulación: retorna un guest vacío
  return { name: "Invitado", email: "", phone: "", mode: "automatic" };
}
export async function saveGuest(
  hotelId: string,
  guestId: string,
  data: any
): Promise<void> {
  // Simulación: no hace nada
  return;
}
```

---

## ¿Qué hacer a futuro?

- **Revisar y adaptar** estos mocks para que reflejen la lógica real de gestión de huéspedes y sus mensajes.
- **Integrar** con la base de datos y lógica de negocio real.
- **Eliminar** los mocks cuando existan las implementaciones definitivas.

---

**Estado actual:** El proyecto compila sin errores y puedes seguir desarrollando sin bloqueos.
