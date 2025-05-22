// /app/auth/forgot-password/page.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [hotelId, setHotelId] = useState(""); // 👈 ahora público y obligatorio
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    setMessage("");

    if (!hotelId.trim()) {
      setStatus("error");
      setMessage("Por favor, ingresá el Hotel ID.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      setStatus("error");
      setMessage("Por favor, ingresá un email válido.");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/users/send-recovery-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId, email }),
      });

      if (res.ok) {
        setStatus("success");
        setMessage("📧 Email de recuperación enviado correctamente.");
        setEmail("");
      } else {
        const data = await res.json();
        setStatus("error");
        setMessage(`Error: ${data.error || "No se pudo enviar el email."}`);
      }
    } catch (err) {
      setStatus("error");
      setMessage("Error de red al intentar enviar el email.");
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white dark:bg-zinc-900 rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">🔑 Recuperar contraseña</h1>
      <p className="text-sm mb-4 text-zinc-600 dark:text-zinc-400">
        Ingresá tu correo electrónico registrado y el ID de tu hotel.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          placeholder="hotel999"
          value={hotelId}
          onChange={(e) => setHotelId(e.target.value)}
          disabled={status === "loading"}
        />
        <Input
          type="email"
          placeholder="usuario@hotel.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading"}
        />
        <Button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Enviando..." : "Enviar"}
        </Button>
        {status !== "idle" && (
          <div
            className={`text-sm ${
              status === "success" ? "text-green-600" : "text-red-600"
            }`}
          >
            {message}
          </div>
        )}
      </form>
    </div>
  );
}
