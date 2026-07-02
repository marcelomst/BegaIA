// Path: /root/begasist/components/admin/ChannelOverview.tsx
"use client";

import React from "react";
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
      .then(cfg => {
        const hotelCfg = (cfg as any)?.hotel ?? cfg;
        setConfigs(hotelCfg?.channelConfigs ?? {});
      })
      .finally(() => setLoading(false));
  }, [hotelId]);

  // El catálogo completo evita ocultar canales no configurados y confundirlos con canales ausentes.
  const visibleChannels: ChannelId[] = useMemo(() => {
    return [...ALL_CHANNELS];
  }, [configs]);

  // Trae estado real de todos los canales listados
  useEffect(() => {
    let active = true;
    async function fetchAll() {
      const updates: Record<ChannelId, { state: string; qr?: string | null }> = {} as any;
      for (const channel of visibleChannels) {
        const cfg = configs?.[channel];
        if (!cfg || cfg.enabled === false || channel === "channelManager") continue;
        try {
          updates[channel] = await fetchChannelStatus(hotelId, channel);
        } catch {
          updates[channel] = { state: "unknown" };
        }
      }
      if (active) setChannelStates(updates);
    }
    if (configs && visibleChannels.length) {
      fetchAll();
      const intv = setInterval(fetchAll, 8000);
      return () => {
        active = false;
        clearInterval(intv);
      };
    }
  }, [configs, hotelId, visibleChannels]);

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
      case "connected":
        return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200";
      case "supervised":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
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

  function getStatusLabel(id: ChannelId, statusKey: ChannelStatusKey) {
    if (id === "channelManager") return "Integración transaccional";
    if (statusKey === "automatic") return `🧠 ${t.channelOverview.status[statusKey]}`;
    if (statusKey === "supervised") return `👤 ${t.channelOverview.status[statusKey]}`;
    return t.channelOverview.status[statusKey];
  }

  return (
    <section className="flex-1 flex flex-col p-6 md:p-8">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-zinc-100">{t.channelOverview.title}</h2>
      <p className="mb-5 mt-1 text-sm text-slate-600 dark:text-zinc-300">
        Configuración real del hotel. Los estados operativos solo se muestran cuando existe una señal verificable.
      </p>
      <div className="overflow-hidden rounded-xl border border-[#E8DDEA] bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        {loading ? (
          <div className="text-muted-foreground">{t.channelOverview.loading}</div>
        ) : (
          <ul className="divide-y divide-[#E8DDEA] dark:divide-zinc-700">
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

              if (!cfg) statusKey = "notConfigured";

              let badgeColor = getBadgeColor(statusKey);
              if (id === "channelManager") {
                badgeColor = "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
              }
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
                <li key={id} className="flex flex-wrap items-center gap-3 px-4 py-4">
                  {getChannelIcon(id)}
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-zinc-100">{t.sidebar[id] || id}</div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                      {id === "channelManager"
                        ? "Integración transaccional para reservas, modificaciones y cancelaciones; no es un canal de chat."
                        : cfg
                          ? "Canal conversacional configurado para este hotel."
                          : "Sin configuración para este hotel."}
                    </div>
                  </div>
                  <span className={`ml-auto text-xs px-2 py-1 rounded ${badgeColor}`}>
                    {getStatusLabel(id, statusKey)}
                  </span>
                  {extra}
                </li>
              );
            })}
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
