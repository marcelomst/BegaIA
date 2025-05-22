# 🧭 Navegación y APIs en Next.js (App Router)
## 📁 Estructura
## Carpeta	                Rol	            ¿Cómo se accede?
## 
/app/api/...	        Back-end	    Usá fetch() desde cliente o servidor
/app/... 	            Front-end UI	Renderizado por Next.js                 
(excepto /app/api)                      (SSR,    CSR o híbrido)

📡 Llamadas a API (fetch())
ts

// Cliente o servidor
await fetch("/api/forgot-password", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, hotelId }),
});
🔁 Navegación y Redirección
Método	Contexto	Uso típico
redirect("/ruta")	Servidor	Detiene el flujo y redirige (SSR, server components, API routes)
router.push("/ruta")	Cliente	Navegación fluida desde UI (client components)

Ejemplos:
✅ Desde el servidor:
ts
Copiar
Editar
// /app/auth/page.tsx
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  return <div>Contenido protegido</div>;
}
✅ Desde el cliente:
tsx
Copiar
Editar
// /app/auth/success/page.tsx
"use client";
import { useRouter } from "next/navigation";

export default function Success() {
  const router = useRouter();
  return <button onClick={() => router.push("/login")}>Ir al login</button>;
}