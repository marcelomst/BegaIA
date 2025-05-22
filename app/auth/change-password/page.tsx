// /root/begasist/app/auth/change-password/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/me/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },        
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Error desconocido");
      } else {
        setMessage("✅ Contraseña actualizada correctamente.");
        setCurrentPassword("");
        setNewPassword("");
        setTimeout(() => {
          router.push("/admin");
        }, 3000);
      }
    } catch (err) {
      setMessage("❌ Error al enviar la solicitud.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-4 border rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Cambiar contraseña</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Contraseña actual</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>
        <div>
          <label className="block mb-1">Nueva contraseña</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? "Actualizando..." : "Cambiar contraseña"}
        </button>
      </form>
      {message && <p className="mt-4 text-sm text-red-600">{message}</p>}
    </div>
  );
}
