// /root/begasist/app/auth/reset-password/ResetPasswordForm.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/button";

type Status = "idle" | "validating" | "validated" | "submitting" | "success" | "error";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get("token");

  const [status, setStatus] = useState<Status>("validating");
  const [message, setMessage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Falta el token de verificación.");
      return;
    }

    async function validateToken() {
      try {
        const res = await fetch("/api/users/validate-reset-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          setStatus("validated");
        } else {
          const data = await res.json();
          setStatus("error");
          setMessage(data.error || "Token inválido.");
        }
      } catch {
        setStatus("error");
        setMessage("Error de red al validar el token.");
      }
    }

    validateToken();
  }, [token]);

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  console.log("SUBMIT: quiero actualizar contraseña");
  setStatus("submitting");
  setMessage("");

  if (!newPassword || !confirmPassword) {
    setStatus("error");
    setMessage("Por favor, completá ambos campos.");
    return;
  }

  if (newPassword !== confirmPassword) {
    setStatus("error");
    setMessage("Las contraseñas no coinciden.");
    return;
  }

  try {
    console.log("Antes del fetch", { token, newPassword })
    const res = await fetch("/api/users/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    console.log("Después del fetch")
    if (res.ok) {
      setStatus("success");
      setMessage("✅ Contraseña actualizada. Ya podés iniciar sesión.");
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    } else {
      const data = await res.json();
      setStatus("error");
      setMessage(`Error: ${data.error || "No se pudo actualizar la contraseña."}`);
    }
  } catch (err) {
    setStatus("error");
    setMessage("Error de red al intentar actualizar la contraseña.");
  }
}


  return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-white dark:bg-zinc-900 rounded-xl shadow">
        <h1 className="text-2xl font-bold mb-4">🔐 Establecer nueva contraseña</h1>

        {status === "validating" && <p className="text-sm text-zinc-500">Validando token...</p>}

        {(status === "validated" || status === "submitting") && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Nueva contraseña"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={status === "submitting"}
            />
            <Input
              type="password"
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={status === "submitting"}
            />
            <Button type="submit" disabled={status === "submitting"}>
              {status === "submitting" ? "Guardando..." : "Restablecer"}
            </Button>
          </form>
        )}


        {status === "success" && (
          <p className="text-green-600 text-sm mt-4">{message}</p>
        )}

        {status === "error" && (
          <p className="text-red-600 text-sm mt-4">{message}</p>
        )}
      </div>
  );
}
