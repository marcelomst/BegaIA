// /app/admin/users/list/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrentUser } from "@/lib/context/UserContext";

export default function UsersListPage() {
  const { user } = useCurrentUser();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      if (!user?.hotelId) {
        setError("Hotel no identificado");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/users?hotelId=${user.hotelId}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Error al cargar usuarios");
        console.log("👤 Usuario actual:", user);
        console.log("📡 Fetch a: ", `/api/users?hotelId=${user?.hotelId}`);
        console.log("📦 Respuesta cruda:", data);

        setUsers(data.users);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [user?.hotelId]);

  return (
    <div className="max-w-5xl mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-6">Usuarios del Hotel</h1>
      {loading && <p className="text-sm text-muted-foreground">Cargando usuarios...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Verificado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u, idx) => (
              <TableRow key={idx}>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">Nivel {u.roleLevel}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={u.active ? "bg-green-600" : "bg-zinc-500"}>
                    {u.active ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {u.verificationToken ? (
                    <Badge className="bg-orange-500">Pendiente</Badge>
                  ) : (
                    <Badge className="bg-green-600">Verificado</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
