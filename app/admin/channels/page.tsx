"use client";

import { useState } from "react";
import { DarkCard } from "@/components/ui/DarkCard";
import { useTheme } from "@/context/ThemeContext";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  BarChart3,
  Zap
} from "lucide-react";

type ChannelStatus = "active" | "inactive" | "loading";
type ChannelMode = "auto" | "manual";

interface Channel {
  name: string;
  status: ChannelStatus;
  mode: ChannelMode;
}

const initialChannels: Channel[] = [
  { name: "Canal Web", status: "active", mode: "auto" },
  { name: "Email", status: "active", mode: "manual" },
  { name: "WhatsApp", status: "inactive", mode: "manual" },
  { name: "Channel Manager", status: "loading", mode: "auto" },
];

export default function ChannelsPage() {
  const { theme } = useTheme();
  const [channels, setChannels] = useState<Channel[]>(initialChannels);

  const getStatusIcon = (status: ChannelStatus) => {
    const iconProps = { className: "w-5 h-5", strokeWidth: 2 };
    if (status === "active") return <CheckCircle {...iconProps} className="text-green-500" />;
    if (status === "inactive") return <AlertCircle {...iconProps} className="text-red-500" />;
    return <Loader2 {...iconProps} className="animate-spin text-yellow-500" />;
  };

  const toggleMode = (index: number) => {
    setChannels((prev) => {
      const updated = [...prev];
      updated[index].mode = updated[index].mode === "auto" ? "manual" : "auto";
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <BarChart3 className="w-6 h-6" />
        Estado de Canales
      </h1>

      <p className="text-sm mb-8 text-gray-500 dark:text-gray-400 max-w-2xl">
        Verificá el estado actual de cada canal conectado al asistente. Si alguno presenta fallas,
        considerá revisar su configuración o conexión.
        <br />
        <span className="font-semibold">
          ChatGPT puede cometer errores. Considerá verificar la información importante.
        </span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {channels.map((channel, index) => (
          <DarkCard
            key={channel.name}
            title={
              <span className="flex items-center gap-2">
                {getStatusIcon(channel.status)}
                {channel.name}
              </span>
            }
            description={`Estado: ${channel.status} • Modo: ${channel.mode === "auto" ? "Automático 🧠" : "Supervisado 🧍"}`}
          >
            <div className="text-sm text-muted-foreground mb-2">
              {channel.mode === "auto"
                ? "Las respuestas se envían automáticamente sin intervención."
                : "Este canal requiere aprobación manual para cada mensaje."}
            </div>
            <button
              className="text-sm text-blue-500 hover:text-blue-400 flex items-center gap-1"
              onClick={() => toggleMode(index)}
            >
              <Zap className="w-4 h-4" />
              Cambiar a modo {channel.mode === "auto" ? "supervisado" : "automático"}
            </button>
          </DarkCard>
        ))}
      </div>
    </div>
  );
}
