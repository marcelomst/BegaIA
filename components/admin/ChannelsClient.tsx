// /root/begasist/components/admin/ChannelsClient.tsx

"use client";

import {
  CheckCircle,
  AlertCircle,
  PlusCircle,
} from "lucide-react";
import { DarkCard } from "@/components/ui/DarkCard";
import Link from "next/link";
import ChannelMessages from "@/components/admin/ChannelMessages";
import { getCurrentUserEmail } from "@/lib/auth/getCurrentUserEmail";
import { Channel, ALL_CHANNELS, ChannelMode } from "@/types/channel"; // 👈 importa los tipos correctos

type SingleChannelConfig = {
  enabled: boolean;
  mode: ChannelMode;
};

// Ahora el Props completo:
type Props = {
  initialConfig: Partial<Record<Channel, SingleChannelConfig>>;
};

export default function ChannelsClient({ initialConfig }: Props) {
  const config = initialConfig;
  const userEmail = getCurrentUserEmail();

  const allChannels = Array.from(new Set([...ALL_CHANNELS, ...Object.keys(config)]));

  const getStatusIcon = (status?: "active" | "inactive" | "missing") => {
    const base = "w-5 h-5";
    if (status === "active") return <CheckCircle className={`${base} text-green-500`} />;
    if (status === "inactive") return <AlertCircle className={`${base} text-red-500`} />;
    return <AlertCircle className={`${base} text-yellow-400`} />;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {allChannels.map((key) => {
        const channelKey = key as Channel; // 👈 casteo correcto
        const channelConfig = config[channelKey];
        const isMissing = !channelConfig;
        const isDynamic = !ALL_CHANNELS.includes(channelKey);

        return (
          <DarkCard
            key={channelKey}
            title={
              <span className="flex items-center gap-2 capitalize">
                {getStatusIcon(
                  isMissing
                    ? "missing"
                    : channelConfig.enabled
                    ? "active"
                    : "inactive"
                )}
                {channelKey}
                {isDynamic && <span className="ml-1 text-yellow-400 text-xs">✨</span>}
              </span>
            }
            description={
              isMissing
                ? "⚠️ Canal no configurado"
                : `Modo actual: ${channelConfig.mode === "automatic" ? "🧠 Automático" : "🧍 Supervisado"}`
            }
          >
            {isMissing ? (
              <form action={`/api/config/add?channelId=${channelKey}`} method="POST">
                <button className="flex items-center gap-1 text-blue-500 hover:underline text-sm">
                  <PlusCircle className="w-4 h-4" />
                  Agregar configuración
                </button>
              </form>
            ) : (
              <>
                <div className="text-sm text-muted-foreground flex flex-col gap-2 mb-4">
                  <form action={`/api/config/mode?channelId=${channelKey}`} method="POST">
                    <button className="text-blue-500 hover:underline" type="submit">
                      Cambiar a modo {channelConfig.mode === "automatic" ? "🧍 Supervisado" : "🧠 Automático"}
                    </button>
                  </form>
                  <form action={`/api/config/toggle?channelId=${channelKey}`} method="POST">
                    <button className="text-blue-500 hover:underline" type="submit">
                      {channelConfig.enabled ? "Desactivar canal" : "Activar canal"}
                    </button>
                  </form>
                  <Link className="text-blue-500 hover:underline" href="/admin/logs">
                    Ver logs
                  </Link>
                </div>

                {ALL_CHANNELS.includes(channelKey) && (
                  <ChannelMessages
                    channelId={channelKey}
                    userEmail={userEmail}
                    mode={channelConfig.mode}
                  />
                )}
              </>
            )}
          </DarkCard>
        );
      })}
    </div>
  );
}
