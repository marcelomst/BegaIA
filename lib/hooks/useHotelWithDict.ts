// Path: /lib/hooks/useHotelWithDict.ts
import { useEffect, useState } from "react";
import { fetchHotelConfig } from "@/lib/config/hotelConfig.client";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { useCurrentUser } from "@/lib/context/UserContext";
import type { HotelConfig } from "@/types/channel";

export function useHotelWithDict() {
  const { user, loading: userLoading } = useCurrentUser();
  const [hotel, setHotel] = useState<HotelConfig | null>(null);
  const [t, setT] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!user?.hotelId) return;
      setLoading(true);
      try {
        const [cfg, dict] = await Promise.all([
          fetchHotelConfig(user.hotelId),
          getDictionary(user.defaultLanguage || "en"),
        ]);
        setHotel(cfg);
        setT(dict);
      } catch {
        setError("Error cargando datos del hotel");
      } finally {
        setLoading(false);
      }
    }
    if (user) load();
  }, [user]);

  return { hotel, t, loading: userLoading || loading, error };
}
