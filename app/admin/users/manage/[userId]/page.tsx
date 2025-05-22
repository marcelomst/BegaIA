// /app/admin/users/manage/[userId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/context/UserContext";
import type { HotelUser } from "@/types/user";

export default function EditUserPage() {
  const { userId } = useParams();
  const router = useRouter();
  const { user } = useCurrentUser();
  const [targetUser, setTargetUser] = useState<HotelUser | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      if (!user?.hotelId || !userId) return;
      const res = await fetch("/api/users/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId: user.hotelId, userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al obtener usuario");
      } else {
        setTargetUser(data.user);
      }
    }
    fetchUser();
  }, [user?.hotelId, userId]);

  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError("");
  setSaving(true);

  if (!user?.hotelId || !targetUser) return;

  // Validación frontend
  if (!targetUser.name?.trim()) {
    setError("El nombre es obligatorio.");
    setSaving(false);
    return;
  }
  if (!targetUser.position?.trim()) {
    setError("El cargo es obligatorio.");
    setSaving(false);
    return;
  }
  if (isNaN(targetUser.roleLevel)) {
    setError("Seleccioná un rol válido.");
    setSaving(false);
    return;
  }

    const res = await fetch("/api/users/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotelId: user.hotelId, user: targetUser }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error al actualizar usuario");
    } else {
      router.push("/admin/users/manage");
    }
  }

  if (!targetUser) return <p className="p-6">Cargando usuario...</p>;

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white dark:bg-zinc-900 rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-6">✏️ Editar usuario</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Nombre"
          value={targetUser.name || ""}
          onChange={(e) => setTargetUser({ ...targetUser, name: e.target.value })}
          className="w-full border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Cargo"
          value={targetUser.position || ""}
          onChange={(e) => setTargetUser({ ...targetUser, position: e.target.value })}
          className="w-full border p-2 rounded"
        />
        <select
          value={targetUser.roleLevel}
          onChange={(e) => setTargetUser({ ...targetUser, roleLevel: parseInt(e.target.value) })}
          className="w-full border p-2 rounded"
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
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
