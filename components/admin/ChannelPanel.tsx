// Path: /root/begasist/components/admin/ChannelPanel.tsx
"use client";
import { Server, Mail, Smartphone, Globe, RefreshCcw, Repeat } from "lucide-react";
import ChannelInbox from "@/components/admin/ChannelInbox";
import { useCurrentUser } from "@/lib/context/UserContext";
import { useEffect, useState } from "react";
import { fetchHotelConfig } from "@/lib/config/hotelConfig.client";

const icons: Record<string, any> = {
  web: Globe,
  email: Mail,
  whatsapp: Smartphone,
  channelManager: Server,
};

export default function ChannelPanel({ channel }: { channel: string }) {
  const { user } = useCurrentUser();
  const [mode, setMode] = useState<"automatic" | "supervised">("automatic");
  const [loading, setLoading] = useState(false);
  const [reloadFlag, setReloadFlag] = useState(0); // para forzar refresh de mensajes

  // Traer config real de canal
  useEffect(() => {
    if (user?.hotelId) {
      fetchHotelConfig(user.hotelId).then((cfg) => {
        if (cfg && cfg.channelConfigs && (channel in cfg.channelConfigs)) {
          setMode((cfg.channelConfigs as any)[channel]?.mode ?? "automatic");
        } else {
          setMode("automatic");
        }
      });
    }
  }, [channel, user?.hotelId]);

  // Alternar modo: POST a /api/config/mode
  async function handleToggleMode() {
    if (!user?.hotelId) return;
    setLoading(true);
    try {
      await fetch(
        `/api/config/mode?channel=${channel}&hotelId=${user.hotelId}`,
        { method: "POST" }
      );
      // Forzar refresco de config
      fetchHotelConfig(user.hotelId).then((cfg) => {
        if (cfg && cfg.channelConfigs && (channel in cfg.channelConfigs)) {
          setMode((cfg.channelConfigs as any)[channel]?.mode ?? "automatic");
        } else {
          setMode("automatic");
        }
      });
    } finally {
      setLoading(false);
    }
  }

  // Forzar recarga de mensajes (ChannelInbox acepta prop reloadFlag)
  function handleReloadMessages() {
    setReloadFlag((f) => f + 1);
  }

  const Icon = icons[channel] || Server;

  return (
    <section className="flex-1 flex flex-col p-6">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-6 h-6" />
        <h2 className="text-xl font-bold">{channel.charAt(0).toUpperCase() + channel.slice(1)}</h2>
        <span className="ml-2 text-xs bg-gray-200 dark:bg-zinc-800 px-2 py-1 rounded font-semibold">
          {mode === "automatic" ? "🧠 Automático" : "🧍 Supervisado"}
        </span>
        {/* Botón de cambio de modo */}
        <button
          className="ml-4 px-3 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-700 transition"
          onClick={handleToggleMode}
          disabled={loading}
          title={`Cambiar a modo ${mode === "automatic" ? "🧍 Supervisado" : "🧠 Automático"}`}
        >
          <Repeat className="w-4 h-4 inline -mt-1 mr-1" />
          Cambiar a {mode === "automatic" ? "Supervisado" : "Automático"}
        </button>
        {/* Botón de recargar mensajes */}
        <button
          className="ml-2 px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          onClick={handleReloadMessages}
          title="Recargar mensajes"
        >
          <RefreshCcw className="w-4 h-4 inline -mt-1 mr-1" />
          Recargar
        </button>
      </div>
      {/* Pasamos reloadFlag como prop para forzar recarga */}
      <ChannelInbox hotelId={user?.hotelId || ""} channel={channel} reloadFlag={reloadFlag} />
    </section>
  );
}
