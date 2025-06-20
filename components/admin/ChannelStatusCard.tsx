// Path: /root/begasist/components/admin/ChannelStatusCard.tsx
import { CheckCircle, AlertCircle, Server, Smartphone, Mail, Globe } from "lucide-react";
import Link from "next/link";
import type { Channel, ChannelMode } from "../../types/channel";
import { useState } from "react";
import WhatsAppConfigForm from "../../components/admin/WhatsAppConfigForm";

const icons: Record<string, any> = {
  web: Globe,
  email: Mail,
  whatsapp: Smartphone,
  channelManager: Server,
};

type Props = {
  channel: Channel;
  config: any;
  hotelId: string;
};

export default function ChannelStatusCard({ channel, config, hotelId }: Props) {
  const [showWhatsAppConfig, setShowWhatsAppConfig] = useState(false);
  const Icon = icons[channel] || Server;
  const isMissing = !config;
  const needsConfig = channel === "whatsapp" && config && !config.celNumber;

  const getStatusIcon = () => {
    if (isMissing) return <AlertCircle className="w-5 h-5 text-yellow-400" />;
    return config.enabled
      ? <CheckCircle className="w-5 h-5 text-green-500" />
      : <AlertCircle className="w-5 h-5 text-red-500" />;
  };

  return (
    <div className="bg-muted border rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1 font-bold">
        {getStatusIcon()}
        <Icon className="w-5 h-5" />
        <span className="capitalize">{channel}</span>
      </div>
      <div className="text-xs">
        {isMissing
          ? "⚠️ Canal no configurado"
          : <>Modo actual: {config.mode === "automatic" ? "🧠 Automático" : "🧍 Supervisado"}</>
        }
      </div>
      {needsConfig && (
        <div className="bg-yellow-100 text-yellow-900 rounded px-2 py-1 mt-1 text-xs">
          WhatsApp sin configurar. <button
            className="text-blue-500 underline"
            onClick={() => setShowWhatsAppConfig(true)}
          >Configurar</button>
          {showWhatsAppConfig && (
            <WhatsAppConfigForm
              hotelId={hotelId}
              initial={{ celNumber: config.celNumber, apiKey: config.apiKey }}
              onClose={() => setShowWhatsAppConfig(false)}
              onSaved={() => window.location.reload()}
            />
          )}
        </div>
      )}
      <div className="flex gap-2 mt-2">
        <form action={`/api/config/mode?channel=${channel}&hotelId=${hotelId}`} method="POST">
          <button className="text-blue-500 underline text-xs" type="submit">
            Cambiar a modo {config.mode === "automatic" ? "🧍 Supervisado" : "🧠 Automático"}
          </button>
        </form>
        <form action={`/api/config/toggle?channel=${channel}&hotelId=${hotelId}`} method="POST">
          <button className="text-blue-500 underline text-xs" type="submit">
            {config.enabled ? "Desactivar" : "Activar"}
          </button>
        </form>
        <Link href="/admin/logs" className="text-blue-500 underline text-xs">Ver logs</Link>
      </div>
    </div>
  );
}
