// Path: /root/begasist/components/admin/EditHotelForm.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { fetchHotelConfig } from "@/lib/config/hotelConfig.client";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { HotelConfig, ChannelConfigMap, WhatsAppConfig } from "@/types/channel";
import { Country, City } from "country-state-city";

// Opciones de idiomas soportados (ISO 639-1)
const LANGUAGE_OPTIONS = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "pt", label: "Português" },
];

// Opciones de zonas horarias comunes (puedes expandir)
const TIMEZONES = [
  "America/Montevideo", "America/Argentina/Buenos_Aires", "America/Sao_Paulo",
  "America/Mexico_City", "Europe/Madrid", "Europe/Lisbon", "UTC"
];

const EMPTY_CHANNEL_CONFIGS: Partial<ChannelConfigMap> = {};

function safeWhatsappConfig(whats: any = {}): WhatsAppConfig {
  return {
    celNumber: whats.celNumber ?? "",
    enabled: typeof whats.enabled === "boolean" ? whats.enabled : true,
    mode: whats.mode ?? "automatic",
    apiKey: whats.apiKey ?? "",
  };
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

  // Países y ciudades dinámicos
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
      const channelConfigs = hotel?.channelConfigs ?? {};
      const whatsapp: WhatsAppConfig = safeWhatsappConfig(channelConfigs.whatsapp);

      const updates = {
        ...hotel,
        channelConfigs: { ...channelConfigs, whatsapp },
      };

      const res = await fetch("/api/hotels/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId, updates }),
      });
      if (!res.ok) throw new Error(t?.errors?.saveHotel || "Error saving hotel");
      if (onSaved) onSaved(updates as HotelConfig);
    } catch (err: any) {
      setError(err.message || t?.errors?.unknown || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  if (loading || !hotel || !t)
    return <div className="mt-10 text-center">Cargando...</div>;

  // Acceso seguro a channelConfigs
  const channelConfigs = hotel.channelConfigs || EMPTY_CHANNEL_CONFIGS;
  const whatsappConfig = safeWhatsappConfig(channelConfigs.whatsapp);

  return (
    <div className="max-w-lg mx-auto mt-10 bg-muted p-6 rounded shadow">
      <h1 className="text-xl font-bold mb-4">{t.hotelEdit.title || "Editar hotel"}</h1>
      <form onSubmit={handleSave} className="flex flex-col gap-3" aria-label="Editar datos del hotel">
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

        {/* WhatsApp */}
        <h2 className="font-semibold mt-4">{t.hotelEdit.channels || "Canales"}</h2>
        <div className="flex flex-col gap-2 border rounded p-3 bg-white dark:bg-zinc-900">
          <label className="font-medium">{t.hotelEdit.whatsapp || "WhatsApp"}:</label>
          <input
            className="border p-2 rounded"
            type="text"
            placeholder={t.hotelEdit.celNumber || "Celular"}
            value={whatsappConfig.celNumber}
            onChange={e =>
              setHotel(hotel => hotel
                ? {
                  ...hotel,
                  channelConfigs: {
                    ...channelConfigs,
                    whatsapp: {
                      ...whatsappConfig,
                      celNumber: e.target.value,
                    },
                  },
                }
                : hotel
              )
            }
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={whatsappConfig.enabled}
              onChange={e =>
                setHotel(hotel => hotel
                  ? {
                    ...hotel,
                    channelConfigs: {
                      ...channelConfigs,
                      whatsapp: {
                        ...whatsappConfig,
                        enabled: e.target.checked,
                      },
                    },
                  }
                  : hotel
                )
              }
            />
            {t.hotelEdit.enabled || "Habilitado"}
          </label>
          <select
            className="border p-2 rounded"
            value={whatsappConfig.mode}
            onChange={e =>
              setHotel(hotel => hotel
                ? {
                  ...hotel,
                  channelConfigs: {
                    ...channelConfigs,
                    whatsapp: {
                      ...whatsappConfig,
                      mode: e.target.value as "automatic" | "supervised",
                    },
                  },
                }
                : hotel
              )
            }
          >
            <option value="automatic">{t.hotelEdit.automatic || "Automático"}</option>
            <option value="supervised">{t.hotelEdit.supervised || "Supervisado"}</option>
          </select>
        </div>

        {error && <div className="text-red-500">{error}</div>}
        <Button type="submit" disabled={loading}>
          {loading ? (t.hotelEdit.saving || "Guardando...") : (t.hotelEdit.save || "Guardar cambios")}
        </Button>
        {showBackButton && (
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            {t.hotelEdit.cancel || "Cancelar"}
          </Button>
        )}
      </form>
    </div>
  );
}
