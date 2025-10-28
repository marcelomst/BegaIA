// Path: /root/begasist/components/admin/EditHotelForm.tsx
"use client";

import { useEffect, useState } from "react";
// Simple tabs component
function Tabs({ tabs, current, onChange }: { tabs: string[]; current: string; onChange: (tab: string) => void }) {
  return (
    <div className="flex gap-2 mb-6 border-b">
      {tabs.map(tab => (
        <button
          key={tab}
          className={`px-4 py-2 font-semibold border-b-2 transition-colors ${current === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-blue-600'}`}
          onClick={() => onChange(tab)}
          type="button"
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
import { Button } from "@/components/ui/button";
import { fetchHotelConfig } from "@/lib/config/hotelConfig.client";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { HotelConfig, ChannelConfigMap, WhatsAppConfig } from "@/types/channel";
import { Country, City } from "country-state-city";
import { ALL_CHANNELS, LANGUAGE_OPTIONS } from "@/types/channel";
import type { Channel } from "@/types/channel";

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
  const enabled = (config as any)?.enabled ?? false;
  const mode = (config as any)?.mode ?? "automatic";
  const forceCanonical = Boolean((config as any)?.reservations?.forceCanonicalQuestion);

  // helper seguro que preserva el resto del objeto
  const patch = (delta: Record<string, any>) =>
    onChange({ ...(config as any), ...delta } as any);

  const patchReservations = (delta: Record<string, any>) => {
    const prevRes = ((config as any)?.reservations ?? {});
    onChange({ ...(config as any), reservations: { ...prevRes, ...delta } } as any);
  };

  return (
    <div className="flex flex-col gap-2 border rounded p-3 bg-white dark:bg-zinc-900">
      <label className="font-medium">{t.hotelEdit.channelLabels?.[channel] ?? channel}:</label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => patch({ enabled: e.target.checked, mode })}
        />
        {t.hotelEdit.enabled}
      </label>

      <select
        className="border p-2 rounded"
        value={mode}
        onChange={e => patch({ mode: e.target.value as "automatic" | "supervised" })}
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
          onChange={e => patch({ celNumber: e.target.value })}
        />
      )}
      {channel === "email" && (
        <div className="flex flex-col gap-2">
          <input
            className="border p-2 rounded"
            type="email"
            placeholder={t.hotelEdit.dirEmail}
            value={(config as any)?.dirEmail || ""}
            onChange={e => patch({ dirEmail: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="border p-2 rounded"
              type="text"
              placeholder="smtpHost"
              value={(config as any)?.smtpHost || ""}
              onChange={e => patch({ smtpHost: e.target.value })}
            />
            <input
              className="border p-2 rounded"
              type="number"
              placeholder="smtpPort"
              value={(config as any)?.smtpPort || ""}
              onChange={e => patch({ smtpPort: Number(e.target.value) })}
            />
            <input
              className="border p-2 rounded"
              type="text"
              placeholder="imapHost (opcional)"
              value={(config as any)?.imapHost || ""}
              onChange={e => patch({ imapHost: e.target.value })}
            />
            <input
              className="border p-2 rounded"
              type="number"
              placeholder="imapPort (opcional)"
              value={(config as any)?.imapPort || ""}
              onChange={e => patch({ imapPort: Number(e.target.value) })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean((config as any)?.secure)}
              onChange={e => patch({ secure: e.target.checked })}
            />
            <span>Secure (TLS/SSL)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="border p-2 rounded"
              type="text"
              placeholder="secretRef (recomendado)"
              value={(config as any)?.secretRef || ""}
              onChange={e => patch({ secretRef: e.target.value })}
            />
            <select
              className="border p-2 rounded"
              value={(config as any)?.credentialsStrategy || ((config as any)?.secretRef ? "ref" : ((config as any)?.password ? "inline" : "ref"))}
              onChange={e => patch({ credentialsStrategy: e.target.value })}
            >
              <option value="ref">ref (secretRef)</option>
              <option value="inline">inline (legacy)</option>
            </select>
          </div>
          <input
            className="border p-2 rounded"
            type="password"
            placeholder="Password SMTP (LEGACY)"
            value={(config as any)?.password || ""}
            onChange={e => patch({ password: e.target.value })}
          />
          <p className="text-xs text-amber-600 dark:text-amber-400">
            No guardes aquí la contraseña si ya configuraste un secretRef. Prioridad: secretRef &gt; password inline.
          </p>
          {(config as any)?.secretRef && (config as any)?.password && (
            <p className="text-xs text-blue-600 dark:text-blue-400">Ambos presentes: en runtime se intentará variable de entorno EMAIL_PASS__{String((config as any)?.secretRef).replace(/[^A-Za-z0-9_]/g, '_').toUpperCase()} y si no existe se usa la inline.</p>
          )}
        </div>
      )}
      {channel === "channelManager" && (
        <>
          <input
            className="border p-2 rounded"
            type="text"
            placeholder="WSDL Endpoint URL"
            value={(config as any)?.endpointUrl || ""}
            onChange={e => patch({ endpointUrl: e.target.value })}
          />
          <input
            className="border p-2 rounded"
            type="text"
            placeholder="Username"
            value={(config as any)?.username || ""}
            onChange={e => patch({ username: e.target.value })}
          />
          <input
            className="border p-2 rounded"
            type="password"
            placeholder="Password"
            value={(config as any)?.password || ""}
            onChange={e => patch({ password: e.target.value })}
          />
        </>
      )}

      {/* 🆕 Bandera por canal: Forzar pregunta canónica (reservas) */}
      <div className="mt-2 pt-2 border-t border-border/50">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={forceCanonical}
            onChange={(e) =>
              patchReservations({ forceCanonicalQuestion: e.target.checked })
            }
          />
          <span className="text-sm">
            {t.hotelEdit.forceCanonicalQuestion ?? "Forzar pregunta canónica (reservas)"}
          </span>
        </label>
        <p className="text-xs text-muted-foreground">
          {t.hotelEdit.forceCanonicalHelp ??
            "Si está activo, el primer pedido de dato faltante será la pregunta canónica (no la inventada por el modelo)."}
        </p>
      </div>
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
  const [tab, setTab] = useState<string>("General");
  const [hotel, setHotel] = useState<HotelConfig | null>(null);
  const [t, setT] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateWarnings, setUpdateWarnings] = useState<string[]>([]);
  // Hooks for KB generation UI must be declared before any early returns to keep consistent order
  const [genLoading, setGenLoading] = useState(false);
  const [autoEnrich, setAutoEnrich] = useState(true);
  const [genMsg, setGenMsg] = useState<string | null>(null);
  // helpers: validación suave
  const isUrl = (v?: string) => !!v && /^(https?:\/\/)[^\s]+$/i.test(v.trim());
  const fillDefaultPolicies = () => {
    setHotel(h => h ? ({
      ...h,
      policies: {
        ...(h.policies ?? {}),
        pets: h.policies?.pets ?? 'Se admiten mascotas pequeñas bajo solicitud previa y con posible cargo adicional. Pueden aplicar restricciones por tipo o tamaño.',
        smoking: h.policies?.smoking ?? 'Está prohibido fumar en todas las áreas interiores. Se aplicará un cargo de limpieza en caso de incumplimiento.',
        cancellation: h.policies?.cancellation ?? 'Las reservas pueden cancelarse sin cargo hasta 48 horas antes del check‑in. Dentro de las 48 horas o en caso de no presentarse (no‑show), se cobra el equivalente a 1 noche. Tarifas no reembolsables no admiten cambios ni devoluciones.',
      }
    }) : h);
  };

  const countries = Country.getAllCountries();
  const cities = hotel?.country
    ? City.getCitiesOfCountry(hotel.country) || []
    : [];

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { hotel: cfg } = await fetchHotelConfig(hotelId);
        const dict = await getDictionary(cfg.defaultLanguage || "en");
        // asegurar estructuras opcionales
        // Helpers bien explícitos
        const isPlainObject = (v: unknown): v is Record<string, unknown> =>
          v !== null && typeof v === "object" && !Array.isArray(v);

        setHotel({
          ...cfg,
          reservations: isPlainObject(cfg.reservations) ? cfg.reservations : {},
          channelConfigs: isPlainObject(cfg.channelConfigs) ? cfg.channelConfigs : {},
          amenities: isPlainObject(cfg.amenities) ? cfg.amenities : undefined,
          payments: isPlainObject(cfg.payments) ? cfg.payments : undefined,
          billing: isPlainObject(cfg.billing) ? cfg.billing : undefined,
          policies: isPlainObject(cfg.policies) ? cfg.policies : undefined,
          rooms: Array.isArray(cfg.rooms) ? cfg.rooms : undefined,
          contacts: isPlainObject(cfg.contacts) ? cfg.contacts : undefined,
          schedules: isPlainObject(cfg.schedules) ? cfg.schedules : undefined,
        });

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
      const res = await fetch("/api/hotels/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId, updates: hotel }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      onSaved?.(hotel!);
      setUpdateWarnings(Array.isArray(json.warnings) ? json.warnings : []);
    } catch (err: any) {
      setError(err.message || t?.errors?.unknown);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !hotel || !t)
    return <div className="mt-10 text-center">Cargando...</div>;

  const channelConfigs = hotel.channelConfigs || EMPTY_CHANNEL_CONFIGS;
  const globalForceCanonical = Boolean(hotel.reservations?.forceCanonicalQuestion);

  return (
    <div className="max-w-lg mx-auto mt-10 bg-muted p-6 rounded shadow">
      <h1 className="text-xl font-bold mb-4">{t.hotelEdit.title}</h1>
      <Tabs tabs={["General", "Canales", "Base de Conocimiento"]} current={tab} onChange={setTab} />
      <form onSubmit={handleSave} className="flex flex-col gap-3">
        {/* --- TABS --- */}
        {tab === "General" && hotel && (
          <>
            {/* País */}
            <label>
              <span className="font-semibold">{t.hotelEdit.country || "País"}</span>
              <select
                className="border p-2 rounded w-full"
                value={hotel!.country ?? ""}
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
                value={hotel!.city ?? ""}
                onChange={e => setHotel(hotel => hotel ? { ...hotel, city: e.target.value } : hotel)}
                aria-label={t.hotelEdit.city}
                disabled={!hotel!.country}
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
            {/* Nombre */}
            <label>
              <span className="font-semibold">{t.hotelEdit.name || "Nombre"}</span>
              <input
                className="border p-2 rounded w-full"
                type="text"
                placeholder={t.hotelEdit.name || "Nombre"}
                value={hotel.hotelName ?? ""}
                onChange={e => setHotel(hotel => hotel ? { ...hotel, hotelName: e.target.value } : hotel)}
                required
              />
            </label>
            {/* Dirección */}
            <label>
              <span className="font-semibold">{t.hotelEdit.address || "Dirección"}</span>
              <input
                className="border p-2 rounded w-full"
                type="text"
                placeholder={t.hotelEdit.address || "Dirección"}
                value={hotel.address ?? ""}
                onChange={e => setHotel(hotel => hotel ? { ...hotel, address: e.target.value } : hotel)}
              />
            </label>
            {/* Teléfono */}
            <label>
              <span className="font-semibold">{t.hotelEdit.phone || "Teléfono"}</span>
              <input
                className="border p-2 rounded w-full"
                type="text"
                placeholder={t.hotelEdit.phone || "Teléfono"}
                value={hotel.phone ?? ""}
                onChange={e => setHotel(hotel => hotel ? { ...hotel, phone: e.target.value } : hotel)}
              />
            </label>
            {/* Código Postal */}
            <label>
              <span className="font-semibold">{t.hotelEdit.postalCode || "Código Postal"}</span>
              <input
                className="border p-2 rounded w-full"
                type="text"
                placeholder={t.hotelEdit.postalCode || "Código Postal"}
                value={hotel.postalCode ?? ""}
                onChange={e => setHotel(hotel => hotel ? { ...hotel, postalCode: e.target.value } : hotel)}
              />
            </label>
            {/* Idioma */}
            <label>
              <span className="font-semibold">{t.hotelEdit.defaultLanguage || "Idioma"}</span>
              <select
                className="border p-2 rounded w-full"
                value={hotel.defaultLanguage ?? ""}
                onChange={e => setHotel(hotel => hotel ? { ...hotel, defaultLanguage: e.target.value } : hotel)}
                aria-label={t.hotelEdit.defaultLanguage}
              >
                <option value="">{t.hotelEdit.defaultLanguage || "Idioma"}</option>
                {LANGUAGE_OPTIONS.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </label>
            {/* Timezone */}
            <label>
              <span className="font-semibold">{t.hotelEdit.timezone || "Zona horaria"}</span>
              <select
                className="border p-2 rounded w-full"
                value={hotel.timezone ?? ""}
                onChange={e => setHotel(hotel => hotel ? { ...hotel, timezone: e.target.value } : hotel)}
                aria-label={t.hotelEdit.timezone}
              >
                <option value="">{t.hotelEdit.timezone || "Zona horaria"}</option>
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </label>
            {/* Contactos */}
            <div className="mt-4 p-3 border rounded bg-white/50 dark:bg-zinc-900/50">
              <h2 className="font-semibold mb-2">Contactos</h2>
              <div className="grid grid-cols-1 gap-2">
                <label>
                  <span className="font-medium">Email</span>
                  <input className="border p-2 rounded w-full" type="email" placeholder="Email" value={hotel.contacts?.email ?? ''}
                    onChange={e => setHotel(h => h ? ({ ...h, contacts: { ...(h.contacts ?? {}), email: e.target.value } }) : h)} />
                </label>
                <label>
                  <span className="font-medium">WhatsApp</span>
                  <input className="border p-2 rounded w-full" type="text" placeholder={t?.placeholders?.whatsapp ?? "WhatsApp (+54 9...)"} value={hotel.contacts?.whatsapp ?? ''}
                    onChange={e => setHotel(h => h ? ({ ...h, contacts: { ...(h.contacts ?? {}), whatsapp: e.target.value } }) : h)} />
                </label>
                <label>
                  <span className="font-medium">Teléfono</span>
                  <input className="border p-2 rounded w-full" type="text" placeholder="Teléfono" value={hotel.contacts?.phone ?? ''}
                    onChange={e => setHotel(h => h ? ({ ...h, contacts: { ...(h.contacts ?? {}), phone: e.target.value } }) : h)} />
                </label>
                <label>
                  <span className="font-medium">Sitio web</span>
                  <input className={`border p-2 rounded w-full ${hotel.contacts?.website && !isUrl(hotel.contacts?.website) ? 'border-red-400' : ''}`} type="url" placeholder={t?.placeholders?.website ?? "https://tu-hotel.com"} value={hotel.contacts?.website ?? ''}
                    onChange={e => setHotel(h => h ? ({ ...h, contacts: { ...(h.contacts ?? {}), website: e.target.value } }) : h)} />
                </label>
                {hotel.contacts?.website && !isUrl(hotel.contacts.website) && (
                  <span className="text-xs text-red-500">URL inválida (debe empezar con http:// o https://)</span>
                )}
              </div>
            </div>
          </>
        )}
        {tab === "Canales" && <>
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
        </>}
        {tab === "Base de Conocimiento" && hotel && (
          <>
            <div className="mt-6 p-4 border rounded bg-white/50 dark:bg-zinc-900/30">
              <h3 className="font-semibold mb-2">Base de conocimiento</h3>
              <p className="text-sm text-muted-foreground mb-2">Genera y edita los datos canónicos del hotel para la base de conocimiento.</p>
              {/* Amenities */}
              <h4 className="font-semibold mt-4">Amenities</h4>
              <label className="flex gap-2 items-center">
                <input type="checkbox" checked={Boolean(hotel.amenities?.hasParking)} onChange={e => setHotel(h => h ? ({ ...h, amenities: { ...(h.amenities ?? {}), hasParking: e.target.checked } }) : h)} />
                <span>Estacionamiento</span>
              </label>
              <input className="border p-2 rounded w-full mb-2" type="text" placeholder="Notas de estacionamiento" value={hotel.amenities?.parkingNotes ?? ''} onChange={e => setHotel(h => h ? ({ ...h, amenities: { ...(h.amenities ?? {}), parkingNotes: e.target.value } }) : h)} />
              <label className="flex gap-2 items-center">
                <input type="checkbox" checked={Boolean(hotel.amenities?.hasPool)} onChange={e => setHotel(h => h ? ({ ...h, amenities: { ...(h.amenities ?? {}), hasPool: e.target.checked } }) : h)} />
                <span>Piscina</span>
              </label>
              <input className="border p-2 rounded w-full mb-2" type="text" placeholder="Horario de piscina" value={hotel.amenities?.poolSchedule ?? ''} onChange={e => setHotel(h => h ? ({ ...h, amenities: { ...(h.amenities ?? {}), poolSchedule: e.target.value } }) : h)} />
              <label className="flex gap-2 items-center">
                <input type="checkbox" checked={Boolean(hotel.amenities?.hasGym)} onChange={e => setHotel(h => h ? ({ ...h, amenities: { ...(h.amenities ?? {}), hasGym: e.target.checked } }) : h)} />
                <span>Gimnasio</span>
              </label>
              <input className="border p-2 rounded w-full mb-2" type="text" placeholder="Horario de gimnasio" value={hotel.amenities?.gymSchedule ?? ''} onChange={e => setHotel(h => h ? ({ ...h, amenities: { ...(h.amenities ?? {}), gymSchedule: e.target.value } }) : h)} />
              <label className="flex gap-2 items-center">
                <input type="checkbox" checked={Boolean(hotel.amenities?.hasSpa)} onChange={e => setHotel(h => h ? ({ ...h, amenities: { ...(h.amenities ?? {}), hasSpa: e.target.checked } }) : h)} />
                <span>Spa</span>
              </label>
              <input className="border p-2 rounded w-full mb-2" type="text" placeholder="Horario de spa" value={hotel.amenities?.spaSchedule ?? ''} onChange={e => setHotel(h => h ? ({ ...h, amenities: { ...(h.amenities ?? {}), spaSchedule: e.target.value } }) : h)} />
              <input className="border p-2 rounded w-full mb-2" type="text" placeholder="Otros amenities (separar por coma)" value={(hotel.amenities?.other ?? []).join(', ')} onChange={e => setHotel(h => h ? ({ ...h, amenities: { ...(h.amenities ?? {}), other: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } }) : h)} />

              {/* Billing */}
              <h4 className="font-semibold mt-4">Facturación</h4>
              <input className="border p-2 rounded w-full mb-2" type="text" placeholder="Notas de facturación" value={hotel.billing?.invoiceNotes ?? ''} onChange={e => setHotel(h => h ? ({ ...h, billing: { ...(h.billing ?? {}), invoiceNotes: e.target.value } }) : h)} />
              <label className="flex gap-2 items-center">
                <input type="checkbox" checked={Boolean(hotel.billing?.issuesInvoices)} onChange={e => setHotel(h => h ? ({ ...h, billing: { ...(h.billing ?? {}), issuesInvoices: e.target.checked } }) : h)} />
                <span>Emitimos factura</span>
              </label>

              {/* Payments */}
              <h4 className="font-semibold mt-4">Pagos</h4>
              <input className="border p-2 rounded w-full mb-2" type="text" placeholder="Métodos de pago (coma)" value={(hotel.payments?.methods ?? []).join(', ')} onChange={e => setHotel(h => h ? ({ ...h, payments: { ...(h.payments ?? {}), methods: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } }) : h)} />
              <input className="border p-2 rounded w-full mb-2" type="text" placeholder="Notas de pago" value={hotel.payments?.notes ?? ''} onChange={e => setHotel(h => h ? ({ ...h, payments: { ...(h.payments ?? {}), notes: e.target.value } }) : h)} />
              <label className="flex gap-2 items-center">
                <input type="checkbox" checked={Boolean(hotel.payments?.requiresCardForBooking)} onChange={e => setHotel(h => h ? ({ ...h, payments: { ...(h.payments ?? {}), requiresCardForBooking: e.target.checked } }) : h)} />
                <span>Solicitar tarjeta para garantizar</span>
              </label>

              {/* Policies */}
              <h4 className="font-semibold mt-4">Políticas</h4>
              <textarea className="border p-2 rounded w-full mb-2" rows={2} placeholder="Política de mascotas" value={hotel.policies?.pets ?? ''} onChange={e => setHotel(h => h ? ({ ...h, policies: { ...(h.policies ?? {}), pets: e.target.value } }) : h)} />
              <textarea className="border p-2 rounded w-full mb-2" rows={2} placeholder="Política de humo/tabaco" value={hotel.policies?.smoking ?? ''} onChange={e => setHotel(h => h ? ({ ...h, policies: { ...(h.policies ?? {}), smoking: e.target.value } }) : h)} />
              <textarea className="border p-2 rounded w-full mb-2" rows={3} placeholder="Política de cancelación" value={hotel.policies?.cancellation ?? ''} onChange={e => setHotel(h => h ? ({ ...h, policies: { ...(h.policies ?? {}), cancellation: e.target.value } }) : h)} />

              {/* Reservations */}
              <h4 className="font-semibold mt-4">Reservas</h4>
              <label className="flex gap-2 items-center mb-2">
                <input type="checkbox" checked={Boolean(hotel.reservations?.forceCanonicalQuestion)} onChange={e => setHotel(h => h ? ({ ...h, reservations: { ...(h.reservations ?? {}), forceCanonicalQuestion: e.target.checked } }) : h)} />
                <span>Forzar pregunta canónica (reservas) <strong>(Global)</strong></span>
              </label>

              {/* Rooms */}
              <h4 className="font-semibold mt-4">Habitaciones</h4>
              {(hotel.rooms ?? []).map((r, idx) => (
                <div key={idx} className="border rounded p-3 mb-2 bg-white/60 dark:bg-zinc-900/40">
                  <div className="flex justify-between items-center mb-2">
                    <strong>Habitación #{idx + 1}</strong>
                    <button type="button" className="text-red-600 text-sm" onClick={() => setHotel(h => h ? ({ ...h, rooms: (h.rooms ?? []).filter((_, i) => i !== idx) }) : h)}>Eliminar</button>
                  </div>
                  <input className="border p-2 rounded w-full mb-2" type="text" placeholder="Nombre" value={r.name ?? ''} onChange={e => setHotel(h => h ? ({ ...h, rooms: (h.rooms ?? []).map((rr, i) => i === idx ? { ...rr, name: e.target.value } : rr) }) : h)} />
                  <input className="border p-2 rounded w-full mb-2" type="number" placeholder="Tamaño m²" value={r.sizeM2 ?? ''} onChange={e => setHotel(h => h ? ({ ...h, rooms: (h.rooms ?? []).map((rr, i) => i === idx ? { ...rr, sizeM2: e.target.value ? Number(e.target.value) : undefined } : rr) }) : h)} />
                  <input className="border p-2 rounded w-full mb-2" type="number" placeholder="Capacidad" value={r.capacity ?? ''} onChange={e => setHotel(h => h ? ({ ...h, rooms: (h.rooms ?? []).map((rr, i) => i === idx ? { ...rr, capacity: e.target.value ? Number(e.target.value) : undefined } : rr) }) : h)} />
                  <input className="border p-2 rounded w-full mb-2" type="text" placeholder="Camas" value={r.beds ?? ''} onChange={e => setHotel(h => h ? ({ ...h, rooms: (h.rooms ?? []).map((rr, i) => i === idx ? { ...rr, beds: e.target.value } : rr) }) : h)} />
                  <textarea className="border p-2 rounded w-full mb-2" rows={2} placeholder="Descripción" value={r.description ?? ''} onChange={e => setHotel(h => h ? ({ ...h, rooms: (h.rooms ?? []).map((rr, i) => i === idx ? { ...rr, description: e.target.value } : rr) }) : h)} />
                  <input className="border p-2 rounded w-full mb-2" type="text" placeholder="Highlights (coma)" value={(r.highlights ?? []).join(', ')} onChange={e => setHotel(h => h ? ({ ...h, rooms: (h.rooms ?? []).map((rr, i) => i === idx ? { ...rr, highlights: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } : rr) }) : h)} />
                  <input className="border p-2 rounded w-full mb-2" type="text" placeholder="Imágenes (coma)" value={(r.images ?? []).join(', ')} onChange={e => setHotel(h => h ? ({ ...h, rooms: (h.rooms ?? []).map((rr, i) => i === idx ? { ...rr, images: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } : rr) }) : h)} />
                  <input className="border p-2 rounded w-full mb-2" type="text" placeholder="Icono" value={r.icon ?? ''} onChange={e => setHotel(h => h ? ({ ...h, rooms: (h.rooms ?? []).map((rr, i) => i === idx ? { ...rr, icon: e.target.value } : rr) }) : h)} />
                  <label className="flex gap-2 items-center mb-2">
                    <input type="checkbox" checked={Boolean(r.accessible)} onChange={e => setHotel(h => h ? ({ ...h, rooms: (h.rooms ?? []).map((rr, i) => i === idx ? { ...rr, accessible: e.target.checked } : rr) }) : h)} />
                    <span>Accesible</span>
                  </label>
                </div>
              ))}
              <button type="button" className="border px-3 py-1 rounded text-sm mb-2" onClick={() => setHotel(h => h ? ({ ...h, rooms: [ ...(h.rooms ?? []), { name: '' } ] }) : h)}>+ Agregar habitación</button>

              {/* Schedules */}
              <h4 className="font-semibold mt-4">Horarios</h4>
              <input className="border p-2 rounded w-full mb-2" type="text" placeholder="Check-in" value={hotel.schedules?.checkIn ?? ''} onChange={e => setHotel(h => h ? ({ ...h, schedules: { ...(h.schedules ?? {}), checkIn: e.target.value } }) : h)} />
              <input className="border p-2 rounded w-full mb-2" type="text" placeholder="Check-out" value={hotel.schedules?.checkOut ?? ''} onChange={e => setHotel(h => h ? ({ ...h, schedules: { ...(h.schedules ?? {}), checkOut: e.target.value } }) : h)} />
              <input className="border p-2 rounded w-full mb-2" type="text" placeholder="Desayuno" value={hotel.schedules?.breakfast ?? ''} onChange={e => setHotel(h => h ? ({ ...h, schedules: { ...(h.schedules ?? {}), breakfast: e.target.value } }) : h)} />
              <input className="border p-2 rounded w-full mb-2" type="text" placeholder="Horas de silencio" value={hotel.schedules?.quietHours ?? ''} onChange={e => setHotel(h => h ? ({ ...h, schedules: { ...(h.schedules ?? {}), quietHours: e.target.value } }) : h)} />

              <label className="flex items-center gap-2 mb-2 mt-4">
                <input type="checkbox" checked={autoEnrich} onChange={e => setAutoEnrich(e.target.checked)} />
                <span className="text-sm">Auto-enriquecer transporte y atracciones con IA</span>
              </label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" disabled={genLoading} onClick={async () => {
                  setGenMsg(null); setGenLoading(true);
                  try {
                    const res = await fetch('/api/kb/generate', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ hotelId, autoEnrich: autoEnrich, upload: false, overrides: hotel })
                    });
                    const text = await res.text();
                    let j: any = null;
                    try { j = JSON.parse(text); } catch { throw new Error(text || 'Respuesta no JSON'); }
                    if (!res.ok || j.error) throw new Error(j.error || 'Error en vista previa');
                    // Renderizar vista previa editable: lista de archivos + editor de texto por archivo
                    const container = document.getElementById('kb-preview');
                    if (container) {
                      container.innerHTML = '';
                      const count = document.createElement('div');
                      count.className = 'text-sm mb-2';
                      count.textContent = `Archivos generados: ${j.count}`;
                      container.appendChild(count);
                      const list = document.createElement('div');
                      list.className = 'flex flex-col gap-2';
                      // Estado local para los archivos editados
                      const editedFiles: Record<string, string> = {};
                      Object.entries(j.files as Record<string,string>).forEach(([name, content]) => {
                        const item = document.createElement('details');
                        item.className = 'border rounded p-2 bg-white/70 dark:bg-zinc-900/40';
                        const sum = document.createElement('summary');
                        sum.textContent = name;
                        sum.className = 'cursor-pointer select-none';
                        // Editor de texto
                        const textarea = document.createElement('textarea');
                        textarea.className = 'mt-2 w-full text-xs border rounded p-2 bg-zinc-50 dark:bg-zinc-900';
                        textarea.rows = 8;
                        textarea.value = content as string;
                        textarea.addEventListener('input', e => {
                          editedFiles[name] = textarea.value;
                        });
                        // Botón para guardar/cargar el archivo editado
                        const saveBtn = document.createElement('button');
                        saveBtn.type = 'button';
                        saveBtn.className = 'mt-2 px-3 py-1 rounded border bg-blue-50 text-blue-700 text-xs';
                        saveBtn.textContent = 'Guardar cambios';
                        saveBtn.onclick = () => {
                          j.files[name] = textarea.value;
                          textarea.value = j.files[name];
                          saveBtn.textContent = 'Guardado';
                          setTimeout(() => { saveBtn.textContent = 'Guardar cambios'; }, 1200);
                        };
                        item.appendChild(sum);
                        item.appendChild(textarea);
                        item.appendChild(saveBtn);
                        list.appendChild(item);
                      });
                      container.appendChild(list);
                    }
                    setGenMsg('Vista previa generada.');
                  } catch (e: any) {
                    const container = document.getElementById('kb-preview');
                    if (container) {
                      container.innerHTML = '';
                      const pre = document.createElement('pre');
                      pre.className = 'text-xs text-red-600 whitespace-pre-wrap';
                      // Mostrar el mensaje de error completo si es JSON
                      let msg = '';
                      try {
                        const errJson = JSON.parse(e?.message || '');
                        msg = errJson.error || e?.message || String(e);
                      } catch {
                        msg = e?.message || String(e);
                      }
                      pre.textContent = msg;
                      container.appendChild(pre);
                    }
                    setGenMsg('Error en vista previa');
                  } finally { setGenLoading(false); }
                }}>
                  {genLoading ? 'Generando…' : 'Vista previa (sin subir)'}
                </Button>
                <Button type="button" disabled={genLoading} onClick={async () => {
                  setGenMsg(null); setGenLoading(true);
                  try {
                    const res = await fetch('/api/kb/generate', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ hotelId, autoEnrich: autoEnrich, upload: true, overrides: hotel })
                    });
                    let j: any = null;
                    try { j = await res.json(); } catch {
                      const text = await res.text();
                      throw new Error(text || 'Respuesta no JSON');
                    }
                    if (!res.ok || j.error) throw new Error(j.error || 'Error generando KB');
                    setGenMsg(`KB generada y subida (${j.uploaded} documentos).`);
                  } catch (e: any) {
                    setGenMsg(e.message || 'Error');
                  } finally { setGenLoading(false); }
                }}>
                  {genLoading ? 'Generando…' : 'Generar y subir KB'}
                </Button>
                {genMsg && <span className="text-sm ml-2">{genMsg}</span>}
              </div>
              <div id="kb-preview" className="mt-3"></div>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
