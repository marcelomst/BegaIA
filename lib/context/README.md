# 📦 `/lib/context/` — Contextos globales para Begasist

Esta carpeta agrupa **todos los contextos globales** (React Context API) usados en el sistema Begasist.  
Su objetivo es **centralizar el estado compartido** (tema, usuario, sidebar, etc.) y exponerlo de forma modular y reutilizable para toda la aplicación.

---

## 👨‍💻 Filosofía de uso

- **Cada contexto representa un "estado global" o "servicio" de la app** (ej: tema, usuario, menú lateral).
- **Los contextos deben ser lo más desacoplados posible**: un contexto no debe depender de la lógica de otro, salvo casos muy justificados (ej: sidebar que usa usuario).
- **Cada contexto exporta:**  
  - Un `Provider` para envolver parte (o toda) la app.
  - Un hook `useXxx()` para consumir el contexto de forma sencilla.
- **No incluyas lógica de negocio acá**: sólo estado de UI/global y helpers asociados.
- **Todos los contextos van en `/lib/context/`** (evitar `/context/` suelto o mezclar con `/components/`).

---

## 📁 Estructura recomendada

```txt
/lib/context/
├── SidebarContext.tsx       # Sidebar abierto/cerrado (panel canales, admin, etc)
├── ThemeContext.tsx         # Modo dark/light global, toggle y persistencia
├── UserContext.tsx          # Estado y datos del usuario logueado
├── ChannelContext.tsx       # (opcional) Canal activo, helpers omnicanal
├── NotificationsContext.tsx # (opcional) Toasts, alerts globales
└── index.ts                 # (opcional) Reexporta providers/hooks de todos los contextos
