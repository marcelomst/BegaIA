// /app/admin/users/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { useCurrentUser } from "@/lib/context/UserContext";

export default function AdminUsersPage() {
  const { user } = useCurrentUser();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.hotelId) return;
    fetch(`/api/users?hotelId=${user.hotelId}`)
      .then(res => res.json())
      .then(data => setUsers(data.users || []));
  }, [user?.hotelId]);

  async function resendVerification(email: string) {
    if (!user?.hotelId) return;
    await fetch("/api/send-verification-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotelId: user.hotelId, email })
    });
    alert("📧 Verificación reenviada");
  }

  async function toggleActive(email: string, active: boolean) {
    if (!user?.hotelId) return;
    setLoading(true);
    await fetch("/api/users/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotelId: user.hotelId, email, active: !active })
    });
    const updated = users.map(u =>
      u.email === email ? { ...u, active: !active } : u
    );
    setUsers(updated);
    setLoading(false);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Usuarios</h1>
      <table className="w-full border">
        <thead>
          <tr className="bg-zinc-800 text-white">
            <th className="p-2 text-left">Email</th>
            <th className="p-2">Activo</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.email} className="border-t">
              <td className="p-2">{u.email}</td>
              <td className="p-2 text-center">{u.active ? "✅" : "❌"}</td>
              <td className="p-2 text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => resendVerification(u.email)}>
                      ✉️ Reenviar verificación
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toggleActive(u.email, u.active)}>
                      {u.active ? "🛑 Desactivar" : "✅ Activar"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
