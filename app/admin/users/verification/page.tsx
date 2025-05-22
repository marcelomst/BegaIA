// /app/admin/users/verification/page.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/button";
import { MailCheck } from "lucide-react";
import { useCurrentUser } from "@/lib/context/UserContext";

export default function UserVerificationPage() {
  const { user } = useCurrentUser(); // ✅ dentro del componente
  const hotelId = user?.hotelId;

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error" | "loading">("idle");
  const [message, setMessage] = useState("");

  const sendVerification = async () => {
    if (!hotelId) {
      setMessage("Hotel no identificado.");
      setStatus("error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      setMessage("Ingresá un email válido.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId, email }),
      });

      if (res.ok) {
        setStatus("success");
        setMessage("📧 Email enviado correctamente.");
        setEmail("");
      } else {
        const data = await res.json();
        setStatus("error");
        setMessage(`Error: ${data.error || "No se pudo enviar el email."}`);
      }
    } catch (err) {
      setStatus("error");
      setMessage("Error de red al enviar el email.");
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <MailCheck size={24} /> Verificación de usuarios
      </h1>

      <p className="text-sm mb-4 text-zinc-600 dark:text-zinc-400">
        Ingresá el correo electrónico del usuario al que querés reenviar el email de verificación.
      </p>

      <div className="flex items-center gap-2">
        <Input
          placeholder="usuario@hotel.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button onClick={sendVerification} disabled={status === "loading"}>
          Enviar
        </Button>
      </div>

      {status !== "idle" && (
        <div
          className={`mt-4 text-sm ${
            status === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
