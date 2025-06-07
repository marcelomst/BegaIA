// /app/admin/channels/page.tsx

import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import ChannelsClient from "@/components/admin/ChannelsClient";
import { BarChart3 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/getCurrentUser"; // 👈 Ajustá el import si tu función está en otro lado

export default async function ChannelsPage() {
  // 🔐 Obtené el usuario logueado del contexto server-side
  const user = await getCurrentUser();
  const hotelId = user?.hotelId || "hotel999"; // Fallback razonable

  const config = await getHotelConfig(hotelId);

  if (!config) {
    return (
      <div className="min-h-screen bg-background text-foreground py-12 px-6">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Estado de Canales
        </h1>
        <p className="text-red-500">❌ Error: no se pudo cargar la configuración del hotel.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <BarChart3 className="w-6 h-6" />
        Estado de Canales
      </h1>
      <ChannelsClient initialConfig={config.channelConfigs} hotelId={hotelId} />
    </div>
  );
}
