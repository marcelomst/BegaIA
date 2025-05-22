// /components/UserStatus.tsx
"use client";

import { useCurrentUser } from "@/lib/context/UserContext";
import React from "react";


export default function UserStatus() {
  const { user, loading, refreshUser } = useCurrentUser();

  if (loading) return <p>Cargando usuario...</p>;
  if (!user) return <p>No autorizado</p>;

  return (
    <div className="p-4 border rounded">
      <p>👤 Usuario: {user.email}</p>
      <p>🏨 Hotel: {user.hotelId}</p>
      <p>🔐 Rol: {user.roleLevel}</p>
      <button
        onClick={refreshUser}
        className="mt-2 px-3 py-1 bg-blue-600 text-white rounded"
      >
        🔄 Refrescar usuario
      </button>
    </div>
  );
}
