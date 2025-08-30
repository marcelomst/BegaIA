// /app/admin/users/manage/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BegAITable } from "@/components/ui/BegAITable";
import { MailCheck, Pencil, Trash2, UserMinus, UserPlus } from "lucide-react";
import { useCurrentUser } from "@/lib/context/UserContext";
import { useRouter } from "next/navigation";
import type { HotelUser } from "@/types/user";

export default function ManageUsersPage() {
  const { user } = useCurrentUser();
  const router = useRouter();
  const [users, setUsers] = useState<HotelUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      if (!user?.hotelId) return;
      setLoading(true);
      const res = await fetch("/api/users/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId: user.hotelId }),
      });
      const data = await res.json();
      setUsers(data.users || []);
      setLoading(false);
    }
    fetchUsers();
  }, [user?.hotelId]);

  async function handleDelete(userId: string) {
    if (!user?.hotelId) return;
    if (!window.confirm("¿Estás seguro de eliminar este usuario?")) return;

    const res = await fetch("/api/users/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotelId: user.hotelId, userId }),
    });

    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.userId !== userId));
    } else {
      const data = await res.json();
      alert(data.error || "Error al eliminar usuario");
    }
  }

  async function handleResendVerification(email: string) {
    if (!user?.hotelId) return;

    const res = await fetch("/api/users/send-verification-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotelId: user.hotelId, email }),
    });

    if (res.ok) {
      alert("📧 Invitación reenviada.");
    } else {
      const data = await res.json();
      alert(data.error || "Error al reenviar invitación");
    }
  }

  async function handleToggleActive(u: HotelUser) {
    if (!user?.hotelId) return;

    const res = await fetch("/api/users/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelId: user.hotelId,
        user: { ...u, active: !u.active },
      }),
    });

    if (res.ok) {
      setUsers((prev) =>
        prev.map((item) =>
          item.userId === u.userId ? { ...item, active: !u.active } : item
        )
      );
    } else {
      const data = await res.json();
      alert(data.error || "Error al actualizar estado");
    }
  }

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 bg-white dark:bg-zinc-900 rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-6">👥 Administración de usuarios</h1>
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={() => router.push("/admin/users/manage/new")}>
              ➕ Nuevo usuario
            </Button>
          </div>
          <BegAITable headers={["Email", "Nombre", "Cargo", "Rol", "Estado", "Creado", "Acciones"]}>
            {users.map((u) => (
              <tr key={u.userId} className="border-b hover:bg-zinc-50 dark:hover:bg-zinc-800">
                <td className="p-3">{u.email}</td>
                <td className="p-3">
                  {u.name || <span className="text-zinc-500 italic">Sin nombre</span>}
                </td>
                <td className="p-3">
                  {u.position || <span className="text-zinc-500 italic">Sin cargo</span>}
                </td>
                <td className="p-3">{u.roleLevel}</td>
                <td className="p-3">
                  {u.active ? "✅ Activo" : "❌ Inactivo"}
                  {u.verificationToken && (
                    <span className="text-yellow-500 ml-2">(no verificado)</span>
                  )}
                </td>
                <td className="p-3">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "–"}
                </td>
                <td className="p-3 flex justify-end gap-2">
                  {u.verificationToken && (
                    <Button
                      size="sm"
                      variant="outline"
                      title="Reenviar invitación"
                      onClick={() => handleResendVerification(u.email)}
                    >
                      <MailCheck className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    title={u.active ? "Desactivar" : "Activar"}
                    onClick={() => handleToggleActive(u)}
                  >
                    {u.active ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    title="Editar usuario"
                    onClick={() => router.push(`/admin/users/manage/${u.userId}`)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    title="Eliminar usuario"
                    onClick={() => handleDelete(u.userId)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </BegAITable>
        </>
      )}
    </div>
  );
}
