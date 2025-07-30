// Path: lib/hooks/useChannelConfig.ts
import { useState, useCallback } from "react";
import type { ChannelId } from "@/lib/config/channelsConfig";
import type { HotelConfig, ChannelConfigMap } from "@/types/channel";

type ChannelConfig<K extends ChannelId> = K extends keyof ChannelConfigMap ? ChannelConfigMap[K] : any;

export function useChannelConfig<K extends ChannelId>(
  hotelId: string | undefined,
  channelId: K
) {
  const [config, setConfig] = useState<ChannelConfig<K> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Leer la configuración del canal
  const fetchConfig = useCallback(async () => {
    if (!hotelId || !channelId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/config/channels/${channelId}?hotelId=${hotelId}`);
      const data = await res.json();
      setConfig(data.config ?? null);
    } catch (err: any) {
      setError(err.message ?? "Error al cargar la configuración.");
    }
    setLoading(false);
  }, [hotelId, channelId]);

  // Guardar la configuración
  const saveConfig = useCallback(
    async (newConfig: Partial<ChannelConfig<K>>) => {
      if (!hotelId || !channelId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/config/channels/${channelId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hotelId, ...newConfig }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al guardar.");
        // Actualizamos config local solo si OK:
        setConfig((prev) => ({ ...prev, ...newConfig } as ChannelConfig<K>));
        return true;
      } catch (err: any) {
        setError(err.message ?? "Error al guardar.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [hotelId, channelId]
  );

  return { config, setConfig, loading, error, fetchConfig, saveConfig };
}
