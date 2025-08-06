// Path: /root/begasist/components/admin/EditHotelForm.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { fetchHotelConfig } from "@/lib/config/hotelConfig.client";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { HotelConfig, ChannelConfigMap, WhatsAppConfig } from "@/types/channel";
import { Country, City } from "country-state-city";
import { ALL_CHANNELS, Channel, LANGUAGE_OPTIONS } from "@/types/channel";

// Opciones de zonas horarias comunes
const TIMEZONES = [
  "America/Montevideo", "America/Argentina/Buenos_Aires", "America/Sao_Paulo",
  "America/Mexico_City", "Europe/Madrid", "Europe/Lisbon", "UTC"
];

const EMPTY_CHANNEL_CONFIGS: Partial<ChannelConfigMap> = {};

/**
 * Componente genérico para configurar un canal
 */
function ChannelConfigCard({
  channel,
  config,
  onChange,
  t
}: {
  channel: Channel;
  config?: ChannelConfigMap[Channel];
  onChange: (cfg: ChannelConfigMap[Channel]) => void;
  t: any;
}) {
  const enabled = config?.enabled ?? false;
  const mode = config?.mode ?? "automatic";

  return (
    <div className="flex flex-col gap-2 border rounded p-3 bg-white dark:bg-zinc-900">
      <label className="font-medium">{t.hotelEdit.channelLabels?.[channel] ?? channel}:</label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => onChange({ ...config, enabled: e.target.checked, mode } as any)}
        />
        {t.hotelEdit.enabled}
      </label>
      <select
        className="border p-2 rounded"
        value={mode}
        onChange={e => onChange({ ...config, enabled, mode: e.target.value as "automatic" | "supervised" } as any)}
      >
        <option value="automatic">{t.hotelEdit.automatic}</option>
        <option value="supervised">{t.hotelEdit.supervised}</option>
      </select>
      {/* Campos específicos por canal */}
      {channel === "whatsapp" && (
        <input
          className="border p-2 rounded"
          type="text"
          placeholder={t.hotelEdit.celNumber}
          value={(config as WhatsAppConfig)?.celNumber || ""}
          onChange={e => onChange({ ...config, enabled, mode, celNumber: e.target.value } as any)}
        />
      )}
      {channel === "email" && (
        <input
          className="border p-2 rounded"
          type="email"
          placeholder={t.hotelEdit.dirEmail}
          value={(config as any)?.dirEmail || ""}
          onChange={e => onChange({ ...config, enabled, mode, dirEmail: e.target.value } as any)}
        />
      )}
      {channel === "channelManager" && (
        <>
          <input
            className="border p-2 rounded"
            type="text"
            placeholder="WSDL Endpoint URL"
            value={(config as any)?.endpointUrl || ""}
            onChange={e => onChange({ ...config, enabled, mode, endpointUrl: e.target.value } as any)}
          />
          <input
            className="border p-2 rounded"
            type="text"
            placeholder="Username"
            value={(config as any)?.username || ""}
            onChange={e => onChange({ ...config, enabled, mode, username: e.target.value } as any)}
          />
          <input
            className="border p-2 rounded"
            type="password"
            placeholder="Password"
            value={(config as any)?.password || ""}
            onChange={e => onChange({ ...config, enabled, mode, password: e.target.value } as any)}
          />
        </>
      )}
    </div>
  );
}

export default function EditHotelForm({
  hotelId,
  onSaved,
  showBackButton,
}: {
  hotelId: string;
  onSaved?: (hotel: HotelConfig) => void;
  showBackButton?: boolean;
}) {
  const [hotel, setHotel] = useState<HotelConfig | null>(null);
  const [t, setT] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const countries = Country.getAllCountries();
  const cities = hotel?.country
    ? City.getCitiesOfCountry(hotel.country) || []
    : [];

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const cfg = await fetchHotelConfig(hotelId);
        const dict = await getDictionary(cfg.defaultLanguage || "en");
        setHotel(cfg);
        setT(dict);
      } catch {
        setError("Error cargando datos del hotel");
      } finally {
        setLoading(false);
      }
    }
    if (hotelId) load();
  }, [hotelId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await fetch("/api/hotels/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId, updates: hotel }),
      });
      onSaved?.(hotel!);
    } catch (err: any) {
      setError(err.message || t?.errors?.unknown);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !hotel || !t)
    return <div className="mt-10 text-center">Cargando...</div>;

  const channelConfigs = hotel.channelConfigs || EMPTY_CHANNEL_CONFIGS;

  return (
    <div className="max-w-lg mx-auto mt-10 bg-muted p-6 rounded shadow">
      <h1 className="text-xl font-bold mb-4">{t.hotelEdit.title}</h1>
      <form onSubmit={handleSave} className="flex flex-col gap-3">
        {/* País */}
        <label>
          <span className="font-semibold">{t.hotelEdit.country || "País"}</span>
          <select
            className="border p-2 rounded w-full"
            value={hotel.country ?? ""}
            onChange={e => setHotel(hotel => hotel ? { ...hotel, country: e.target.value, city: "" } : hotel)}
            aria-label={t.hotelEdit.country}
          >
            <option value="">{t.hotelEdit.country || "País"}</option>
            {countries.map(c => (
              <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
            ))}
          </select>
        </label>
        {/* Ciudad */}
        <label>
          <span className="font-semibold">{t.hotelEdit.city || "Ciudad"}</span>
          <select
            className="border p-2 rounded w-full"
            value={hotel.city ?? ""}
            onChange={e => setHotel(hotel => hotel ? { ...hotel, city: e.target.value } : hotel)}
            aria-label={t.hotelEdit.city}
            disabled={!hotel.country}
          >
            <option value="">{t.hotelEdit.city || "Ciudad"}</option>
            {cities.map((city, idx) => (
              <option
                key={`${city.name}-${idx}`}
                value={city.name}
              >
                {city.name}
              </option>
            ))}
          </select>
        </label>
        {/* Nombre, Dirección, Código Postal, Teléfono, Zona horaria, Idioma, WhatsApp... */}
        <input
          className="border p-2 rounded"
          type="text"
          placeholder={t.hotelEdit.name || "Nombre"}
          value={hotel.hotelName}
          onChange={e => setHotel({ ...hotel!, hotelName: e.target.value })}
          required
        />
        <input
          className="border p-2 rounded"
          type="text"
          placeholder={t.hotelEdit.address || "Dirección"}
          value={hotel.address ?? ""}
          onChange={e => setHotel({ ...hotel!, address: e.target.value })}
        />
        <input
          className="border p-2 rounded"
          type="text"
          placeholder={t.hotelEdit.postalCode || "Código Postal"}
          value={hotel.postalCode ?? ""}
          onChange={e => setHotel({ ...hotel!, postalCode: e.target.value })}
        />
        <input
          className="border p-2 rounded"
          type="text"
          placeholder={t.hotelEdit.phone || "Teléfono"}
          value={hotel.phone ?? ""}
          onChange={e => setHotel({ ...hotel!, phone: e.target.value })}
        />
        {/* Timezone */}
        <label>
          <span className="font-semibold">{t.hotelEdit.timezone || "Zona horaria"}</span>
          <select
            className="border p-2 rounded w-full"
            value={hotel.timezone ?? ""}
            onChange={e => setHotel({ ...hotel!, timezone: e.target.value })}
            aria-label={t.hotelEdit.timezone}
          >
            <option value="">{t.hotelEdit.timezone || "Zona horaria"}</option>
            {TIMEZONES.map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </label>
        {/* Idioma */}
        <label>
          <span className="font-semibold">{t.hotelEdit.defaultLanguage || "Idioma"}</span>
          <select
            className="border p-2 rounded w-full"
            value={hotel.defaultLanguage ?? ""}
            onChange={e => setHotel({ ...hotel!, defaultLanguage: e.target.value })}
            aria-label={t.hotelEdit.defaultLanguage}
          >
            <option value="">{t.hotelEdit.defaultLanguage || "Idioma"}</option>
            {LANGUAGE_OPTIONS.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </label>
        <h2 className="font-semibold mt-4">{t.hotelEdit.channels}</h2>
        <div className="grid grid-cols-1 gap-4">
          {ALL_CHANNELS.map(ch => (
            <ChannelConfigCard
              key={ch}
              channel={ch}
              config={channelConfigs[ch]}
              onChange={cfg => setHotel(h => ({ ...h!, channelConfigs: { ...channelConfigs, [ch]: cfg } }))}
              t={t}
            />
          ))}
        </div>

        {error && <div className="text-red-500">{error}</div>}
        <Button type="submit" disabled={loading}>
          {loading ? t.hotelEdit.saving : t.hotelEdit.save}
        </Button>
        {showBackButton && (
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            {t.hotelEdit.cancel}
          </Button>
        )}
      </form>
    </div>
  );
}
