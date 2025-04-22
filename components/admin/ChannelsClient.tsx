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

type ChannelConfig = {
  enabled: boolean;
  mode: "auto" | "supervised";
};

type Props = {
  initialConfig: Record<string, ChannelConfig>;
};

const expectedChannels = ["web", "email", "whatsapp", "channelManager"];

export default function ChannelsClient({ initialConfig }: Props) {
  const config = initialConfig;
  const userEmail = getCurrentUserEmail();

  const allChannels = Array.from(new Set([...expectedChannels, ...Object.keys(config)]));

  const getStatusIcon = (status?: "active" | "inactive" | "missing") => {
    const base = "w-5 h-5";
    if (status === "active") return <CheckCircle className={`${base} text-green-500`} />;
    if (status === "inactive") return <AlertCircle className={`${base} text-red-500`} />;
    return <AlertCircle className={`${base} text-yellow-400`} />;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {allChannels.map((key) => {
        const channelConfig = config[key];
        const isMissing = !channelConfig;
        const isDynamic = !expectedChannels.includes(key);

        return (
          <DarkCard
            key={key}
            title={
              <span className="flex items-center gap-2 capitalize">
                {getStatusIcon(
                  isMissing
                    ? "missing"
                    : channelConfig.enabled
                    ? "active"
                    : "inactive"
                )}
                {key}
                {isDynamic && <span className="ml-1 text-yellow-400 text-xs">✨</span>}
              </span>
            }
            description={
              isMissing
                ? "⚠️ Canal no configurado"
                : `Modo actual: ${channelConfig.mode === "auto" ? "🧠 Automático" : "🧍 Supervisado"}`
            }
          >
            {isMissing ? (
              <form action={`/api/config/add?channel=${key}`} method="POST">
                <button className="flex items-center gap-1 text-blue-500 hover:underline text-sm">
                  <PlusCircle className="w-4 h-4" />
                  Agregar configuración
                </button>
              </form>
            ) : (
              <>
                <div className="text-sm text-muted-foreground flex flex-col gap-2 mb-4">
                  <form action={`/api/config/mode?channel=${key}`} method="POST">
                    <button className="text-blue-500 hover:underline" type="submit">
                      Cambiar a modo {channelConfig.mode === "auto" ? "🧍 Supervisado" : "🧠 Automático"}
                    </button>
                  </form>
                  <form action={`/api/config/toggle?channel=${key}`} method="POST">
                    <button className="text-blue-500 hover:underline" type="submit">
                      {channelConfig.enabled ? "Desactivar canal" : "Activar canal"}
                    </button>
                  </form>
                  <Link className="text-blue-500 hover:underline" href="/admin/logs">
                    Ver logs
                  </Link>
                </div>

                {["web", "email", "whatsapp", "channelManager"].includes(key) && (
                  <ChannelMessages
                    channelId={key}
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
