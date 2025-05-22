// /app/auth/verify-account/page.tsx
import { verifyUserAccount } from "@/lib/auth/verifyUserAccount";
import { redirect } from "next/navigation";

export default async function VerifyAccountPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams?.token ?? null; // ✅ acceder como propiedad

  if (!token) {
    return (
      <div className="text-red-600 p-4">Token de verificación faltante.</div>
    );
  }

  const result = await verifyUserAccount(token);

  if (!result.ok) {
    return (
      <div className="text-red-600 p-4">❌ Verificación fallida: {result.error}</div>
    );
  }

  // Si querés redirigir directamente según el rol, puedes hacerlo aquí:
  if (result.roleLevel < 20) {
    redirect("/admin");
  }

  // UI cliente sin hooks, 100% seguro SSR
  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white dark:bg-zinc-900 rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4 text-green-600">✅ Cuenta verificada correctamente.</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
        Ahora debés establecer tu contraseña usando la opción{" "}
        <strong>"¿Olvidaste tu contraseña?"</strong> en la pantalla de login.
      </p>
      <a
        href="/auth/login"
        className="text-blue-600 underline"
      >
        Ir al login
      </a>
    </div>
  );
}
