// Path: /app/auth/verify-account/VerifyAccountClient.tsx

"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function VerifyAccountClient() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");

  const [status, setStatus] = useState<"loading" | "error" | "needPassword" | "done">("loading");
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Mensajes accesibilidad
  const [touched, setTouched] = useState({ password: false, confirm: false });

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Token de verificación faltante.");
      return;
    }

    fetch("/api/users/check-verification-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json())
      .then(data => {
        if (!data.ok) {
          setStatus("error");
          setError(data.error || "Token inválido.");
        } else if (data.hasPassword) {
          setStatus("done");
        } else {
          setStatus("needPassword");
        }
      })
      .catch(() => {
        setStatus("error");
        setError("Error verificando token.");
      });
  }, [token]);

  const minLength = 8;
  const passwordTooShort = password.length > 0 && password.length < minLength;
  const confirmTooShort = confirmPassword.length > 0 && confirmPassword.length < minLength;
  const passwordsDontMatch = password && confirmPassword && password !== confirmPassword;
  const canSubmit =
    password.length >= minLength &&
    confirmPassword.length >= minLength &&
    password === confirmPassword;

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!canSubmit) return;

    setSaving(true);

    const res = await fetch("/api/users/verify-account-set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: password }),
    });
    const data = await res.json();

    if (data.ok) {
      setStatus("done");
    } else {
      setError(data.error || "Error al guardar contraseña.");
    }
    setSaving(false);
  }

  if (status === "loading") {
    return <div className="p-4">Verificando...</div>;
  }
  if (status === "error") {
    return <div className="text-red-600 p-4">❌ {error}</div>;
  }
  if (status === "done") {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-white dark:bg-zinc-900 rounded-xl shadow">
        <h1 className="text-2xl font-bold mb-4 text-green-600">✅ Cuenta verificada correctamente.</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Ya podés iniciar sesión con tu nueva contraseña.
        </p>
        <a href="/auth/login" className="text-blue-600 underline">
          Ir al login
        </a>
      </div>
    );
  }
  // status === "needPassword"
  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white dark:bg-zinc-900 rounded-xl shadow">
      <h1 className="text-xl font-bold mb-4 text-green-600">¡Bienvenido! Solo falta tu contraseña</h1>
      <form onSubmit={handleSetPassword} className="flex flex-col gap-3">
        <label>
          Contraseña:
          <input
            type="password"
            className="border p-2 rounded w-full mt-1"
            value={password}
            onBlur={() => setTouched(t => ({ ...t, password: true }))}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={minLength}
            autoFocus
            placeholder={`Elegí tu contraseña (mín. ${minLength} caracteres)`}
          />
        </label>
        {touched.password && passwordTooShort && (
          <div className="text-red-500 text-xs">La contraseña debe tener al menos {minLength} caracteres.</div>
        )}
        <label>
          Repetir contraseña:
          <input
            type="password"
            className="border p-2 rounded w-full mt-1"
            value={confirmPassword}
            onBlur={() => setTouched(t => ({ ...t, confirm: true }))}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            minLength={minLength}
            placeholder="Repetí tu contraseña"
          />
        </label>
        {touched.confirm && confirmTooShort && (
          <div className="text-red-500 text-xs">La confirmación debe tener al menos {minLength} caracteres.</div>
        )}
        {password && confirmPassword && passwordsDontMatch && (
          <div className="text-red-500 text-xs">Las contraseñas no coinciden.</div>
        )}
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <button
          type="submit"
          className={`bg-blue-600 text-white rounded px-4 py-2 font-medium mt-2 ${!canSubmit ? "opacity-60 cursor-not-allowed" : ""}`}
          disabled={saving || !canSubmit}
        >
          {saving ? "Guardando..." : "Establecer contraseña"}
        </button>
        <div className="text-xs text-muted-foreground mt-1">
          La contraseña debe tener mínimo {minLength} caracteres y ambas deben coincidir.
        </div>
      </form>
    </div>
  );
}
