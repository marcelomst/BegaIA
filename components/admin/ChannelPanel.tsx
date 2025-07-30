// Path: /root/begasist/components/admin/ChannelPanel.tsx
"use client";

import { RefreshCcw } from "lucide-react";
import ChannelInbox from "@/components/admin/ChannelInbox";
import { useCurrentUser } from "@/lib/context/UserContext";
import { useEffect, useState } from "react";
import { fetchHotelConfig } from "@/lib/config/hotelConfig.client";
import { CHANNELS, ChannelId, ChannelConfig } from "@/lib/config/channelsConfig";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { getDictionary } from "@/lib/i18n/getDictionary";
import EmailPollingToggle from "@/components/admin/EmailPollingToggle";
import ModelSelector from "@/components/admin/ModelSelector";
import type { CurationModel } from "@/types/channel";

export default function ChannelPanel({ channel }: { channel: ChannelId }) {
  const { user } = useCurrentUser();
  const [mode, setMode] = useState<"automatic" | "supervised">("automatic");
  const [curationModel, setCurationModel] = useState<CurationModel>("gpt-3.5-turbo");
  const [loading, setLoading] = useState(false);
  const [reloadFlag, setReloadFlag] = useState(0);
  const [t, setT] = useState<any>(null);

  const channelConfig: ChannelConfig | undefined = CHANNELS.find((ch) => ch.id === channel);

  useEffect(() => {
    if (user?.hotelId && channel) {
      fetchHotelConfig(user.hotelId).then((cfg) => {
        if (cfg?.channelConfigs && channel in cfg.channelConfigs) {
          const ch = (cfg.channelConfigs as any)[channel];
          setMode(ch?.mode ?? "automatic");
          if (channel === "email") {
            setCurationModel(ch?.preferredCurationModel ?? "gpt-3.5-turbo");
          }
        }
      });
    }
  }, [channel, user?.hotelId]);

  useEffect(() => {
    if (!user?.defaultLanguage) return setT(null);
    getDictionary(user.defaultLanguage)
      .then(setT)
      .catch(() => setT(null));
  }, [user?.defaultLanguage]);

  async function handleToggleMode(newMode: "automatic" | "supervised") {
    if (!user?.hotelId) return;
    setLoading(true);
    try {
      await fetch(`/api/config/mode?channel=${channel}&hotelId=${user.hotelId}&mode=${newMode}`, {
        method: "POST",
      });
      fetchHotelConfig(user.hotelId).then((cfg) => {
        if (cfg?.channelConfigs && channel in cfg.channelConfigs) {
          setMode((cfg.channelConfigs as any)[channel]?.mode ?? "automatic");
        } else {
          setMode("automatic");
        }
      });
    } finally {
      setLoading(false);
    }
  }

  function handleReloadMessages() {
    setReloadFlag((f) => f + 1);
  }

  if (!t) {
    return (
      <section className="flex-1 flex flex-col p-6">
        <div className="text-muted-foreground">Cargando diccionario...</div>
      </section>
    );
  }

  return (
    <section className="flex-1 flex flex-col p-6">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {channelConfig?.icon ? (
          <Image
            src={channelConfig.icon}
            alt={channelConfig.label}
            width={28}
            height={28}
            className="w-7 h-7"
            priority
          />
        ) : (
          <span className="w-7 h-7 rounded bg-gray-200 flex items-center justify-center text-lg">❓</span>
        )}

        <h2 className="text-xl font-bold">
          {t.sidebar[channelConfig?.id ?? channel] || channelConfig?.label || channel}
        </h2>

        <div className="flex items-center gap-2 ml-4">
          <Switch
            checked={mode === "supervised"}
            onCheckedChange={(checked) => handleToggleMode(checked ? "supervised" : "automatic")}
            disabled={loading}
          />
          <span
            className={
              "flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold " +
              (mode === "supervised"
                ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200"
                : "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200")
            }
          >
            {mode === "supervised" ? (
              <>
                <span className="mr-1">🧍</span>
                {t.channelPanel?.supervised || "Supervisado"}
              </>
            ) : (
              <>
                <span className="mr-1">🧠</span>
                {t.channelPanel?.automatic || "Automático"}
              </>
            )}
          </span>
        </div>

        {channel === "email" && (
          <div className="flex items-center gap-3 ml-4">
            <ModelSelector
              hotelId={user?.hotelId || ""}
              current={curationModel}
              onChange={(newModel: CurationModel) => setCurationModel(newModel)}
            />
          </div>
        )}

        {channel === "email" && <EmailPollingToggle hotelId={user?.hotelId || ""} />}

        <button
          className="ml-2 px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          onClick={handleReloadMessages}
          title={t.channelPanel?.reload || "Recargar mensajes"}
        >
          <RefreshCcw className="w-4 h-4 inline -mt-1 mr-1" />
          {t.channelPanel?.reload || "Recargar"}
        </button>
      </div>

      <ChannelInbox
        hotelId={user?.hotelId || ""}
        channel={channel}
        reloadFlag={reloadFlag}
        t={t}
        curationModel={curationModel}
      />
    </section>
  );
}
