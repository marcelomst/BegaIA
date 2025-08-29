// Path: /root/begasist/app/admin/users/manage/[userId]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/context/UserContext";
import type { HotelUser } from "@/types/user";

type Editable = Pick<HotelUser, "userId" | "name" | "position" | "roleLevel" | "active"> & {
  email?: string;
};

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const { user: actor } = useCurrentUser();

  const userId = useMemo(() => {
    if (!params) return null;
    const v = (Array.isArray(params.userId) ? params.userId[0] : params.userId) as string | undefined;
    return v ?? null;
  }, [params]);

  const [targetUser, setTargetUser] = useState<Editable | null>(null);
  const [initialUser, setInitialUser] = useState<Editable | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!actor?.hotelId || !userId) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/users/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hotelId: actor.hotelId, userId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al obtener usuario");
        const u: HotelUser = data.user;

        const edit: Editable = {
          userId: u.userId,
          name: u.name || "",
          position: u.position || "",
          roleLevel: Number.isFinite(u.roleLevel) ? u.roleLevel : 20,
          active: typeof u.active === "boolean" ? u.active : true,
          email: u.email,
        };
        if (!cancelled) {
          setTargetUser(edit);
          setInitialUser(edit);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Error al obtener usuario");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [actor?.hotelId, userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!actor?.hotelId || !targetUser) return;

    const name = (targetUser.name || "").trim();
    const position = (targetUser.position || "").trim();
    const roleLevel = Number(targetUser.roleLevel);

    if (!name) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!position) {
      setError("El cargo es obligatorio.");
      return;
    }
    if (!Number.isFinite(roleLevel)) {
      setError("Seleccioná un rol válido.");
      return;
    }
    if (roleLevel === 0) {
      setError("El rol 0 solo corresponde al sistema y no puede asignarse aquí.");
      return;
    }

    setSaving(true);
    try {
      // ⬇️ Solo los campos que el backend espera modificar
      const payload: Partial<HotelUser> & { userId: string } = {
        userId: targetUser.userId,
        name,
        position,
        roleLevel,
        active: targetUser.active,
      };

      const res = await fetch("/api/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId: actor.hotelId, user: payload }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al actualizar usuario");
      }

      router.push("/admin/users/manage");
    } catch (err: any) {
      setError(err?.message || "Error al actualizar usuario");
    } finally {
      setSaving(false);
    }
  }

  if (!userId) {
    return <p className="p-6">No se especificó el ID del usuario.</p>;
  }

  if (loading) return <p className="p-6">Cargando usuario...</p>;
  if (!targetUser) return <p className="p-6">No se encontró el usuario.</p>;

  const changed =
    JSON.stringify(
      (({ name, position, roleLevel, active }) => ({ name, position, roleLevel, active }))(targetUser)
    ) !==
    JSON.stringify(
      initialUser
        ? (({ name, position, roleLevel, active }) => ({ name, position, roleLevel, active }))(initialUser)
        : {}
    );

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white dark:bg-zinc-900 rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-6">✏️ Editar usuario</h1>

      <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">
        <div>
          <span className="font-semibold">Usuario ID:</span>{" "}
          <span className="font-mono">{targetUser.userId}</span>
        </div>
        <div>
          <span className="font-semibold">Email:</span>{" "}
          <span className="font-mono">{targetUser.email || "-"}</span>
        </div>
      </div>

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

        <label className="block">
          <span className="block text-sm mb-1">Rol</span>
          <select
            value={targetUser.roleLevel}
            onChange={(e) => setTargetUser({ ...targetUser, roleLevel: parseInt(e.target.value, 10) })}
            className="w-full border p-2 rounded"
          >
            <option value={1}>👨‍💻 Admin Técnico (1)</option>
            <option value={15}>🧑‍💼 Gerente (15)</option>
            <option value={20}>👩‍💼 Recepcionista (20)</option>
          </select>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!targetUser.active}
            onChange={(e) => setTargetUser({ ...targetUser, active: e.target.checked })}
          />
          <span>Usuario activo</span>
        </label>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex justify-between">
          <Button variant="secondary" type="button" onClick={() => router.back()}>
            ← Cancelar
          </Button>
          <Button type="submit" disabled={saving || !changed}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
