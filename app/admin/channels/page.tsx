// Path: /root/begasist/app/admin/channels/page.tsx
"use client";

import { useEffect, useState } from "react";
import ChannelSidebar from "@/components/admin/ChannelSidebar";
import ChannelPanel from "@/components/admin/ChannelPanel";
import ChannelOverview from "@/components/admin/ChannelOverview";
import type { ChannelId } from "@/lib/config/channelsConfig";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/context/UserContext";
import { useCurrentHotel } from "@/lib/context/HotelContext";
import { getDictionary } from "@/lib/i18n/getDictionary";

export default function AdminChannelsPage() {
  const router = useRouter();
  const { user } = useCurrentUser();      // Destructuramos para evitar errores
  const { hotel } = useCurrentHotel();    // Usamos hotelContext para idioma
  const [selected, setSelected] = useState<ChannelId>("overview");
  const [t, setT] = useState<any>(null);

  // Cargar el diccionario cuando cambia el hotel (o idioma)
  useEffect(() => {
    if (hotel?.defaultLanguage) {
      getDictionary(hotel.defaultLanguage).then(setT);
    }
  }, [hotel]);

  if (!user) {
    return <div className="p-8">Cargando usuario...</div>;
  }
  if (!hotel?.hotelId) {
    return <div className="p-8 text-red-600">No se detectó el hotel asociado.</div>;
  }
  if (!t) {
    return <div className="p-8">Cargando diccionario...</div>;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <ChannelSidebar selected={selected} onSelect={setSelected} />
      <main className="flex-1 flex flex-col">
        <div className="flex-1">
          {selected === "overview" ? (
            <ChannelOverview hotelId={hotel.hotelId} t={t} />
          ) : (
            <ChannelPanel channel={selected} />
          )}
        </div>
      </main>
    </div>
  );
}
