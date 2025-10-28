// Path: /root/begasist/components/admin/ChannelOverview.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchHotelConfig } from "@/lib/config/hotelConfig.client";
import { ALL_CHANNELS } from "@/types/channel";
import type { ChannelId, ChannelStatusKey, HotelConfig, ChannelConfigMap } from "@/types/channel";

// Helper general para traer estado real de canal
async function fetchChannelStatus(hotelId: string, channel: ChannelId) {
  const res = await fetch(`/api/channel-status?hotelId=${hotelId}&channel=${channel}`);
  if (!res.ok) return { state: "unknown", qr: null };
  return res.json();
}

// Usa tus SVG locales
const ICONS: Record<string, string> = {
  web: "/icons/web.svg",
  email: "/icons/email.svg",
  whatsapp: "/icons/whatsapp.svg",
  channelManager: "/icons/channelManager.svg",
  telegram: "/icons/telegram.svg",
  instagram: "/icons/instagram.svg",
  tiktok: "/icons/tiktok.svg",
  facebook: "/icons/facebook.svg",
  x: "/icons/x.svg",
  unknown: "/icons/unknown.svg",
};

interface Props {
  hotelId: string;
  t: any; // Diccionario de idioma recibido desde el admin/layout
}

export default function ChannelOverview({ hotelId, t }: Props) {
  const [configs, setConfigs] = useState<Partial<ChannelConfigMap> | null>(null);
  const [loading, setLoading] = useState(true);
  const [channelStates, setChannelStates] = useState<Record<ChannelId, { state: string; qr?: string | null }>>({} as any);

  // Trae configs de AstraDB una sola vez
  useEffect(() => {
    setLoading(true);
    fetchHotelConfig(hotelId)
      .then(cfg => setConfigs(cfg?.channelConfigs ?? {}))
      .finally(() => setLoading(false));
  }, [hotelId]);

  // Lista dinámica de canales configurados/habilitados
  const visibleChannels: ChannelId[] = useMemo(() => {
    if (!configs) return [];
    return [...ALL_CHANNELS].filter(
      (id) =>
        configs[id] !== undefined &&
        (configs[id]?.enabled === undefined || configs[id]?.enabled === true)
    );
  }, [configs]);

  // Trae estado real de todos los canales listados
  useEffect(() => {
    let active = true;
    async function fetchAll() {
      const updates: Record<ChannelId, { state: string; qr?: string | null }> = {} as any;
      for (const channel of visibleChannels) {
        try {
          updates[channel] = await fetchChannelStatus(hotelId, channel);
        } catch {
          updates[channel] = { state: "unknown" };
        }
      }
      if (active) setChannelStates(updates);
    }
    if (visibleChannels.length) {
      fetchAll();
      const intv = setInterval(fetchAll, 8000);
      return () => {
        active = false;
        clearInterval(intv);
      };
    }
  }, [hotelId, visibleChannels]);

  // Helper para mostrar estado legible según config
  function getChannelStatusKey(cfg: any): ChannelStatusKey {
    if (!cfg) return "notConfigured";
    if (cfg.enabled === false) return "disabled";
    if (cfg.mode === "supervised") return "supervised";
    if (cfg.mode === "automatic") return "automatic";
    return "active";
  }

  function getChannelIcon(id: ChannelId) {
    const src = ICONS[id] || ICONS.unknown;
    return (
      <img
        src={src}
        alt={id}
        className="w-5 h-5 opacity-80"
        style={{ minWidth: 20, minHeight: 20, display: "inline-block" }}
      />
    );
  }

  function getBadgeColor(statusKey: ChannelStatusKey) {
    switch (statusKey) {
      case "active":
      case "automatic":
      case "supervised":
      case "connected":
        return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200";
      case "waitingQr":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200";
      case "disabled":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200";
      case "disconnected":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200";
      case "notConfigured":
      case "unknown":
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-300";
    }
  }

  return (
    <section className="flex-1 flex flex-col p-6">
      <h2 className="text-xl font-bold mb-2">{t.channelOverview.title}</h2>
      <div className="border rounded-lg p-4 bg-muted/50">
        {loading ? (
          <div className="text-muted-foreground">{t.channelOverview.loading}</div>
        ) : (
          <ul className="divide-y divide-border">
            {visibleChannels.map(id => {
              const cfg = configs?.[id];
              const chanState = channelStates[id] || { state: "unknown" };
              let statusKey: ChannelStatusKey =
                id === "whatsapp"
                  ? (chanState.state === "waiting_qr"
                      ? "waitingQr"
                      : chanState.state === "connected"
                      ? "connected"
                      : chanState.state === "disconnected"
                      ? "disconnected"
                      : chanState.state === "developing"
                      ? "developing"
                      : getChannelStatusKey(cfg))
                  : getChannelStatusKey(cfg);

              let badgeColor = getBadgeColor(statusKey);
              let extra = null;

              // WhatsApp: QR si corresponde
              if (id === "whatsapp" && statusKey === "waitingQr" && chanState.qr) {
                extra = (
                  <span className="ml-3 text-xs font-mono select-all break-all">
                    {t.channelOverview.qrReady}
                  </span>
                );
              }

              return (
                <li key={id} className="flex items-center gap-2 py-2">
                  {getChannelIcon(id)}
                  <span className="font-medium capitalize">{t.sidebar[id] || id}</span>
                  <span className={`ml-auto text-xs px-2 py-1 rounded ${badgeColor}`}>
                    {t.channelOverview.status[statusKey]}
                  </span>
                  {extra}
                </li>
              );
            })}
            {visibleChannels.length === 0 && (
              <li className="text-muted-foreground text-sm py-6 text-center">
                {t.channelOverview.noneEnabled || "No hay canales configurados o habilitados para este hotel."}
              </li>
            )}
          </ul>
        )}
      </div>

      {/* QR de WhatsApp grande si corresponde */}
      {channelStates.whatsapp?.state === "waiting_qr" && channelStates.whatsapp?.qr && (
        <div className="my-6 mx-auto max-w-md p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded shadow flex flex-col items-center">
          <div className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
            {t.channelOverview.scanQr}
          </div>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
              channelStates.whatsapp.qr
            )}&size=220x220`}
            alt="Código QR de WhatsApp"
            className="w-44 h-44"
          />
          <div className="mt-2 text-xs text-muted-foreground break-all select-all">
            {channelStates.whatsapp.qr}
          </div>
        </div>
      )}
    </section>
  );
}
