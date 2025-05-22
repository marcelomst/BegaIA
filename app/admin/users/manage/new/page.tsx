// /app/admin/users/manage/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/context/UserContext";

export default function CreateUserPage() {
  const { user } = useCurrentUser();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [roleLevel, setRoleLevel] = useState(20);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    if (!user?.hotelId) {
      setError("Hotel no identificado");
      setSaving(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("El email no tiene un formato válido.");
      setSaving(false);
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError("Email y contraseña son obligatorios");
      setSaving(false);
      return;
    }
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      setSaving(false);
      return;
    }
    if (!position.trim()) {
      setError("El cargo es obligatorio");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/users/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelId: user.hotelId,
        email,
        password,
        name,
        position,
        roleLevel,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error al crear usuario");
      return;
    }

    router.push("/admin/users/manage");
  }

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white dark:bg-zinc-900 rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-6">➕ Alta de nuevo usuario</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email del usuario"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="text"
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="text"
          placeholder="Cargo (ej: Recepcionista, Gerente)"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <select
          value={roleLevel}
          onChange={(e) => setRoleLevel(parseInt(e.target.value))}
          className="w-full border p-2 rounded"
          required
        >
          <option value={0}>👨‍💻 Admin Técnico (0)</option>
          <option value={15}>🧑‍💼 Gerente (15)</option>
          <option value={20}>👩‍💼 Recepcionista (20)</option>
        </select>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex justify-between">
          <Button variant="secondary" type="button" onClick={() => router.back()}>
            ← Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Creando..." : "Crear usuario"}
          </Button>
        </div>
      </form>
    </div>
  );
}
