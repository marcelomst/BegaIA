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
import { ALL_CHANNELS } from "@/types/channel";
import type { Channel, ChannelMode } from "@/types/channel";
import { useState } from "react";
import WhatsAppConfigForm from "@/components/admin/WhatsAppConfigForm";

type SingleChannelConfig = {
  enabled: boolean;
  mode: ChannelMode;
  celNumber?: string;
  apiKey?: string;
  provider?: "legacy" | "twilio";
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioWhatsAppNumber?: string;
  twilioFrom?: string;
};

type Props = {
  initialConfig: Partial<Record<Channel, SingleChannelConfig>>;
  hotelId: string; // multi-hotel
};

export default function ChannelsClient({ initialConfig, hotelId }: Props) {
  const config = initialConfig;
  const userEmail = getCurrentUserEmail();

  const [showWhatsAppConfig, setShowWhatsAppConfig] = useState(false);

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
        const channelKey = key as Channel;
        const channelConfig = config[channelKey];
        const isMissing = !channelConfig;
        const isWhatsApp = channelKey === "whatsapp";
        const needsConfig =
          isWhatsApp &&
          channelConfig &&
          (!("celNumber" in channelConfig) || !channelConfig.celNumber);

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
              </span>
            }
            description={
              isMissing
                ? "⚠️ Canal no configurado"
                : `Modo actual: ${channelConfig.mode === "automatic" ? "🧠 Automático" : "🧍 Supervisado"}`
            }
          >
            {isMissing ? (
              <form action={`/api/config/add?channel=${channelKey}&hotelId=${hotelId}`} method="POST">
                <button className="flex items-center gap-1 text-blue-500 hover:underline text-sm">
                  <PlusCircle className="w-4 h-4" />
                  Agregar configuración
                </button>
              </form>
            ) : (
              <>
                {/* Banner de advertencia si WhatsApp está activo pero sin configurar */}
                {needsConfig && (
                  <div className="mb-3 bg-yellow-100 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 rounded px-4 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        ⚠️ <strong>WhatsApp sin configurar</strong>
                        <div className="text-xs mt-1">
                          Por favor, ingresa el número de WhatsApp antes de activar el canal.
                        </div>
                      </div>
                      <button
                        className="ml-4 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                        onClick={() => setShowWhatsAppConfig(true)}
                      >
                        Configurar
                      </button>
                    </div>
                  </div>
                )}

                {/* Modal para configuración WhatsApp */}
                {showWhatsAppConfig && (
                  <WhatsAppConfigForm
                    hotelId={hotelId}
                    initial={{
                      celNumber: channelConfig?.celNumber,
                      apiKey: channelConfig?.apiKey,
                      provider: channelConfig?.provider,
                      twilioAccountSid: channelConfig?.twilioAccountSid,
                      twilioAuthToken: channelConfig?.twilioAuthToken,
                      twilioWhatsAppNumber: channelConfig?.twilioWhatsAppNumber,
                      twilioFrom: channelConfig?.twilioFrom,
                    }}
                    onClose={() => setShowWhatsAppConfig(false)}
                    onSaved={() => window.location.reload()}
                  />
                )}

                <div className="text-sm text-muted-foreground flex flex-col gap-2 mb-4">
                  <form action={`/api/config/mode?channel=${channelKey}&hotelId=${hotelId}`} method="POST">
                    <button className="text-blue-500 hover:underline" type="submit">
                      Cambiar a modo {channelConfig.mode === "automatic" ? "🧍 Supervisado" : "🧠 Automático"}
                    </button>
                  </form>
                  <form action={`/api/config/toggle?channel=${channelKey}&hotelId=${hotelId}`} method="POST">
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
