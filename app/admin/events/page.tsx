"use client";

import { useCurrentUser } from "@/lib/context/UserContext";
import { HotelEventsPanel } from "@/components/admin/HotelEventsPanel";
import { PoiEventsPanel } from "@/components/admin/PoiEventsPanel";

export default function AdminEventsPage() {
  const { user, loading } = useCurrentUser();

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando sesión...</div>;
  }

  const isSystem = user?.hotelId === "system";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Eventos</h1>
        <div className="text-xs text-muted-foreground">
          {isSystem
            ? "Operación POI global (system)."
            : "Curaduría local de eventos del hotel sobre POI regional."}
        </div>
      </div>
      {isSystem ? <PoiEventsPanel /> : <HotelEventsPanel />}
    </div>
  );
}
