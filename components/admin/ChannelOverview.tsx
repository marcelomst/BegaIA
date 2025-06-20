// Path: /root/begasist/components/admin/ChannelOverview.tsx
"use client";

import { useEffect, useState } from "react";
import { Server, Mail, Smartphone, Globe } from "lucide-react";
import { fetchHotelConfig } from "@/lib/config/hotelConfig.client"; // ✅ Helper client-side (vía API)
import { ALL_CHANNELS } from "@/types/channel";

type ChannelStatus = "Activo" | "Desactivado" | "Supervisado" | "Automático" | "Conectado" | "En desarrollo" | "No configurado";

const ICONS: Record<string, any> = {
  web: Globe,
  email: Mail,
  whatsapp: Smartphone,
  channelManager: Server,
};

interface Props {
  hotelId: string;
}

/**
 * Presenta el estado real de cada canal, leyendo la configuración desde AstraDB.
 */
export default function ChannelOverview({ hotelId }: Props) {
  const [configs, setConfigs] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchHotelConfig(hotelId)
      .then(cfg => setConfigs(cfg?.channelConfigs ?? {}))
      .finally(() => setLoading(false));
  }, [hotelId]);

  // Helper para mostrar estado legible
  function getChannelStatus(cfg: any): ChannelStatus {
    if (!cfg) return "No configurado";
    if (cfg.enabled === false) return "Desactivado";
    if (cfg.mode === "supervised") return "Supervisado";
    if (cfg.mode === "automatic") return "Automático";
    return "Activo";
  }

  return (
    <section className="flex-1 flex flex-col p-6">
      <h2 className="text-xl font-bold mb-2">Visión general de los canales</h2>
      <div className="border rounded-lg p-4 bg-muted/50">
        {loading ? (
          <div className="text-muted-foreground">Cargando estado de canales...</div>
        ) : (
          <ul className="divide-y divide-border">
            {ALL_CHANNELS.filter(id => ["web","email","whatsapp","channelManager"].includes(id)).map(id => {
              const Icon = ICONS[id] ?? Server;
              const cfg = configs?.[id];
              const status = getChannelStatus(cfg);
              const active =
                status === "Activo" ||
                status === "Automático" ||
                status === "Supervisado" ||
                status === "Conectado";
              return (
                <li key={id} className="flex items-center gap-2 py-2">
                  <Icon className="w-5 h-5 opacity-80" />
                  <span className="font-medium capitalize">{id}</span>
                  <span className={`ml-auto text-xs px-2 py-1 rounded
                    ${active
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200"}
                  `}>
                    {status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {/* Nota: El helper fetchHotelConfig NO puede usarse SSR ni en server components */}
      {/* Si necesitás agregar más datos, ajustá la UI y los helpers aquí */}
    </section>
  );
}
