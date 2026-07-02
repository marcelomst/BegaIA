// Path: /root/begasist/components/admin/ChannelPanel.tsx
"use client";

import React from "react";
import { RefreshCcw } from "lucide-react";
import ChannelInbox from "@/components/admin/ChannelInbox";
import { useCurrentUser } from "@/lib/context/UserContext";
import { useEffect, useState } from "react";
import { fetchHotelConfig } from "@/lib/config/hotelConfig.client";
import { CHANNELS } from "@/lib/config/channelsConfig";
import type { ChannelId, ChannelConfig } from "@/lib/config/channelsConfig";
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
  const [configLoading, setConfigLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [reloadFlag, setReloadFlag] = useState(0);
  const [t, setT] = useState<any>(null);

  // 🆕 flag por canal
  const [forceCanonical, setForceCanonical] = useState<boolean>(false);

  const channelConfig: ChannelConfig | undefined = CHANNELS.find((ch) => ch.id === channel);

  async function refreshFromServer(hotelId: string) {
    setConfigLoading(true);
    try {
      const cfg = await fetchHotelConfig(hotelId);
      const hotelCfg = (cfg as any)?.hotel ?? cfg;
      if (hotelCfg?.channelConfigs && channel in hotelCfg.channelConfigs) {
        const chCfg: any = (hotelCfg.channelConfigs as any)[channel];
        setConfigured(true);
        setMode(chCfg?.mode ?? "automatic");
        setForceCanonical(Boolean(chCfg?.reservations?.forceCanonicalQuestion));
        if (channel === "email") {
          setCurationModel(chCfg?.preferredCurationModel ?? "gpt-3.5-turbo");
        }
      } else {
        setConfigured(false);
        setMode("automatic");
        setForceCanonical(false);
      }
    } finally {
      setConfigLoading(false);
    }
  }

  useEffect(() => {
    if (user?.hotelId && channel) {
      refreshFromServer(user.hotelId);
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
      await refreshFromServer(user.hotelId);
    } finally {
      setLoading(false);
    }
  }

  // 🆕 Guardar flag por canal preservando el resto del objeto del canal
  async function handleToggleCanonical(newVal: boolean) {
    if (!user?.hotelId) return;
    setLoading(true);
    try {
      const full = await fetchHotelConfig(user.hotelId);
      const hotelCfg = (full as any)?.hotel ?? full;
      const prevCh: any = hotelCfg?.channelConfigs?.[channel] ?? {};
      const nextCh = {
        ...prevCh,
        reservations: { ...(prevCh.reservations ?? {}), forceCanonicalQuestion: newVal },
      };
      await fetch("/api/hotels/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId: user.hotelId,
          updates: { channelConfigs: { [channel]: nextCh } },
        }),
      });
      setForceCanonical(newVal);
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

  if (configLoading) {
    return <section className="flex-1 p-6 text-sm text-muted-foreground">Cargando configuración del canal...</section>;
  }

  if (!configured) {
    return (
      <section className="flex-1 p-6 md:p-8">
        <div className="max-w-2xl rounded-xl border border-[#E8DDEA] bg-[#FDF4FB] p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
            {t.sidebar[channelConfig?.id ?? channel] || channelConfig?.label || channel}
          </h2>
          <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">
            No configurado
          </span>
          <p className="mt-4 text-sm text-slate-600 dark:text-zinc-300">
            Este canal no tiene configuración para el hotel actual. No se muestran modos, mensajes ni estados heredados.
          </p>
        </div>
      </section>
    );
  }

  if (channel === "channelManager") {
    return (
      <section className="flex-1 p-6 md:p-8">
        <div className="max-w-3xl rounded-xl border border-[#E8DDEA] bg-[#FDF4FB] p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">Integración transaccional</div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-zinc-100">Channel Manager</h2>
          <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-zinc-300">
            Channel Manager no es un canal de chat. Es una integración transaccional para sincronizar reservas, modificaciones y cancelaciones provenientes de OTAs, PMS o gestores de canales.
          </p>
        </div>
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

        {/* Modo supervised/automatic */}
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
                <span className="mr-1">👤</span>
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

        {/* Presentación comercial de la secuencia controlada de reservas. */}
        <div className="flex items-center gap-2 ml-4">
          <Switch
            checked={forceCanonical}
            onCheckedChange={(checked) => handleToggleCanonical(checked)}
            disabled={loading}
          />
          <span
            className={
              "flex items-center gap-1 px-2 py-0.5 rounded text-xs " +
              (forceCanonical
                ? "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200"
                : "bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-200")
            }
            title="Cuando está activo, el asistente sigue una secuencia controlada para pedir los datos mínimos de una reserva."
          >
            🧭 Guía de reservas
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
