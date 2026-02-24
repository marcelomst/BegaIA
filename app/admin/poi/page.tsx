"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/context/UserContext";
import { PoiEventsPanel } from "@/components/admin/PoiEventsPanel";

export default function AdminPoiPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();

  useEffect(() => {
    if (!userLoading && user && user.hotelId !== "system") {
      router.replace("/admin");
    }
  }, [userLoading, user, router]);

  if (userLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando sesión...</div>;
  }

  if (!user || user.hotelId !== "system") {
    return (
      <div className="p-6 space-y-2">
        <h1 className="text-lg font-semibold">Acceso restringido</h1>
        <p className="text-sm text-muted-foreground">
          Esta sección es solo para el hotel `system`.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PoiEventsPanel />
    </div>
  );
}
