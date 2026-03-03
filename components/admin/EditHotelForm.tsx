// Path: /root/begasist/components/admin/EditHotelForm.tsx
"use client";
import React, { useEffect, useState } from "react";
import { Country, City } from "country-state-city";
import TagSelect from "@/components/ui/TagSelect";
import { normalizeAmenityTags, amenityLabel } from "@/lib/taxonomy/amenities";
import { fetchHotelConfig } from "@/lib/config/hotelConfig.client";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { suggestRoomIcon } from "@/lib/rooms/roomIcons";
import type { HotelConfig, Channel, ChannelConfigMap, WhatsAppConfig } from "@/types/channel";
import { ALL_CHANNELS, LANGUAGE_OPTIONS } from "@/types/channel";

function Tabs({ tabs, current, onChange }: { tabs: string[]; current: string; onChange: (t: string) => void }) {
  return (
    <div className="flex gap-2 mb-4 border-b">
      {tabs.map(tb => (
        <button key={tb} type="button" onClick={() => onChange(tb)} className={`px-3 py-1 text-sm border-b-2 transition-colors ${current === tb ? "border-blue-600 text-blue-700 font-medium" : "border-transparent text-gray-600 hover:text-blue-700"}`}>{tb}</button>
      ))}
    </div>
  );
}

const TIMEZONES = [
  "UTC","America/Buenos_Aires","America/Sao_Paulo","America/Montevideo","America/Mexico_City","America/Bogota","America/Lima","America/Santiago","Europe/Madrid","Europe/Lisbon","Europe/London",
];

const EMPTY_CHANNEL_CONFIGS: Partial<ChannelConfigMap> = {};

function ChannelConfigCard({ channel, config, onChange, t }: { channel: Channel; config?: ChannelConfigMap[Channel]; onChange: (cfg: ChannelConfigMap[Channel]) => void; t: any; }) {
  const [showTwilioToken, setShowTwilioToken] = useState(false);
  const enabled = (config as any)?.enabled ?? false;
  const mode = (config as any)?.mode ?? "automatic";
  const forceCanonical = Boolean((config as any)?.reservations?.forceCanonicalQuestion);
  const waProvider = ((config as any)?.provider ?? "legacy") as "legacy" | "twilio";
  const twilioNumberValue = (config as any)?.twilioWhatsAppNumber ?? (config as any)?.twilioFrom ?? "";
  const twilioE164Valid = !twilioNumberValue || /^\+\d{8,15}$/.test(String(twilioNumberValue).trim());
  const patch = (delta: Record<string, any>) => onChange({ ...(config as any), ...delta } as any);
  const patchReservations = (delta: Record<string, any>) => {
    const prev = (config as any)?.reservations ?? {};
    patch({ reservations: { ...prev, ...delta } });
  };
  return (
    <div className="flex flex-col gap-2 border rounded p-3 bg-white dark:bg-zinc-900">
      <label className="font-medium">{t.hotelEdit.channelLabels?.[channel] ?? channel}</label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={e => patch({ enabled: e.target.checked })} />
        <span>{t.hotelEdit.enabled}</span>
      </label>
      <select className="border p-2 rounded text-sm" value={mode} onChange={e => patch({ mode: e.target.value as "automatic" | "supervised" })}>
        <option value="automatic">{t.hotelEdit.automatic}</option>
        <option value="supervised">{t.hotelEdit.supervised}</option>
      </select>
      {channel === "whatsapp" && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium">Proveedor</label>
          <select
            className="border p-2 rounded text-sm"
            value={waProvider}
            onChange={e => patch({ provider: e.target.value as "legacy" | "twilio" })}
          >
            <option value="legacy">legacy</option>
            <option value="twilio">twilio</option>
          </select>
          <p className="text-xs text-muted-foreground">
            legacy = integración antigua / twilio = WhatsApp Oficial (Twilio)
          </p>

          {waProvider === "twilio" && (
            <div className="flex flex-col gap-2 border rounded p-2 bg-slate-50 dark:bg-zinc-950">
              <label className="text-xs font-medium">Twilio WhatsApp Sender (FROM)</label>
              <input
                className={`border p-2 rounded text-sm ${twilioE164Valid ? "" : "border-red-500"}`}
                type="text"
                placeholder="+15558847361"
                value={twilioNumberValue}
                onChange={e => {
                  const next = e.target.value.trim();
                  patch({
                    twilioWhatsAppNumber: next,
                    twilioFrom: next,
                  });
                }}
              />
              <p className="text-xs text-muted-foreground">
                Número registrado como WhatsApp Sender en Twilio (formato E.164 con +).
              </p>
              <p className="text-xs text-amber-700">
                Este NO es tu número personal. Es el sender oficial.
              </p>
              <input
                className="border p-2 rounded text-sm"
                type="text"
                placeholder="Twilio Account SID (AC...)"
                value={(config as WhatsAppConfig)?.twilioAccountSid || ""}
                onChange={e => patch({ twilioAccountSid: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Credencial LIVE en Twilio → API keys & tokens → Auth tokens (Live credentials).
              </p>
              <div className="flex gap-2">
                <input
                  className="border p-2 rounded text-sm flex-1"
                  type={showTwilioToken ? "text" : "password"}
                  placeholder="Twilio Auth Token"
                  value={(config as WhatsAppConfig)?.twilioAuthToken || ""}
                  onChange={e => patch({ twilioAuthToken: e.target.value })}
                />
                <button
                  type="button"
                  className="px-2 py-1 text-xs rounded border"
                  onClick={() => setShowTwilioToken(v => !v)}
                >
                  {showTwilioToken ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Usar LIVE Auth Token (no Test).</p>
              <details>
                <summary className="cursor-pointer text-xs font-medium">Legacy (opcional)</summary>
                <div className="mt-2 flex flex-col gap-2 border rounded p-2 bg-white dark:bg-zinc-900">
                  <p className="text-xs text-muted-foreground">
                    No se usa para Twilio. Solo histórico/compatibilidad.
                  </p>
                  <input
                    className="border p-2 rounded text-sm"
                    type="text"
                    placeholder="Número (legacy)"
                    value={(config as WhatsAppConfig)?.celNumber || ""}
                    onChange={e => patch({ celNumber: e.target.value })}
                  />
                  <input
                    className="border p-2 rounded text-sm"
                    type="text"
                    placeholder="API key (legacy)"
                    value={(config as WhatsAppConfig)?.apiKey || ""}
                    onChange={e => patch({ apiKey: e.target.value })}
                  />
                </div>
              </details>
              <p className="text-xs text-muted-foreground">
                Para Twilio, el envío real usa el sender oficial.
              </p>
              {!twilioE164Valid && (
                <p className="text-xs text-red-600">Formato inválido: usar E.164 con prefijo +.</p>
              )}
            </div>
          )}
          {waProvider === "legacy" && (
            <>
              <input
                className="border p-2 rounded text-sm"
                type="text"
                placeholder="Número (legacy)"
                value={(config as WhatsAppConfig)?.celNumber || ""}
                onChange={e => patch({ celNumber: e.target.value })}
              />
              <input
                className="border p-2 rounded text-sm"
                type="text"
                placeholder="API key (legacy)"
                value={(config as WhatsAppConfig)?.apiKey || ""}
                onChange={e => patch({ apiKey: e.target.value })}
              />
            </>
          )}
        </div>
      )}
      {channel === "email" && (
        <div className="flex flex-col gap-2">
          <input className="border p-2 rounded" type="email" placeholder={t.hotelEdit.dirEmail} value={(config as any)?.dirEmail || ""} onChange={e => patch({ dirEmail: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="border p-2 rounded" type="text" placeholder="smtpHost" value={(config as any)?.smtpHost || ""} onChange={e => patch({ smtpHost: e.target.value })} />
            <input className="border p-2 rounded" type="number" placeholder="smtpPort" value={(config as any)?.smtpPort || ""} onChange={e => patch({ smtpPort: Number(e.target.value) })} />
            <input className="border p-2 rounded" type="text" placeholder="imapHost (opcional)" value={(config as any)?.imapHost || ""} onChange={e => patch({ imapHost: e.target.value })} />
            <input className="border p-2 rounded" type="number" placeholder="imapPort (opcional)" value={(config as any)?.imapPort || ""} onChange={e => patch({ imapPort: Number(e.target.value) })} />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={Boolean((config as any)?.secure)} onChange={e => patch({ secure: e.target.checked })} />
            <span>Secure (TLS/SSL)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input className="border p-2 rounded" type="text" placeholder="secretRef" value={(config as any)?.secretRef || ""} onChange={e => patch({ secretRef: e.target.value })} />
            <select className="border p-2 rounded" value={(config as any)?.credentialsStrategy || ((config as any)?.secretRef ? "ref" : ((config as any)?.password ? "inline" : "ref"))} onChange={e => patch({ credentialsStrategy: e.target.value })}>
              <option value="ref">ref (secretRef)</option>
              <option value="inline">inline (legacy)</option>
            </select>
          </div>
          <input className="border p-2 rounded" type="password" placeholder="Password SMTP (LEGACY)" value={(config as any)?.password || ""} onChange={e => patch({ password: e.target.value })} />
          <p className="text-xs text-amber-600">No guardes la contraseña aquí si usas secretRef.</p>
        </div>
      )}
      {channel === "channelManager" && (
        <div className="flex flex-col gap-2">
          <input className="border p-2 rounded" type="text" placeholder="WSDL Endpoint URL" value={(config as any)?.endpointUrl || ""} onChange={e => patch({ endpointUrl: e.target.value })} />
          <input className="border p-2 rounded" type="text" placeholder="Username" value={(config as any)?.username || ""} onChange={e => patch({ username: e.target.value })} />
          <input className="border p-2 rounded" type="password" placeholder="Password" value={(config as any)?.password || ""} onChange={e => patch({ password: e.target.value })} />
        </div>
      )}
      <div className="mt-2 pt-2 border-t">
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={forceCanonical} onChange={e => patchReservations({ forceCanonicalQuestion: e.target.checked })} />
          <span>Forzar pregunta canónica (reservas)</span>
        </label>
      </div>
    </div>
  );
}

export default function EditHotelForm({ hotelId, onSaved, showBackButton }: { hotelId: string; onSaved?: (hotel: HotelConfig) => void; showBackButton?: boolean }) {
  const [tab, setTab] = useState("General");
  const [hotel, setHotel] = useState<HotelConfig | null>(null);
  const [t, setT] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateWarnings, setUpdateWarnings] = useState<string[]>([]);
  const [iconManual, setIconManual] = useState<Record<number, boolean>>({});
  const [attractionsBusy, setAttractionsBusy] = useState(false);
  const [attractionsMsg, setAttractionsMsg] = useState<string | null>(null);
  const [attractionsPreview, setAttractionsPreview] = useState<Array<{ name?: string; notes?: string; distanceKm?: number; driveTime?: string; placeId?: string; photoName?: string }> | null>(null);
  const [attractionsStats, setAttractionsStats] = useState<any>(null);
  const [arrivalsBusy, setArrivalsBusy] = useState(false);
  const [arrivalsMsg, setArrivalsMsg] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState("");
  const isSystemHotel = hotelId === "system";

  const approxLabel = (lang?: string) => (lang || "").startsWith("pt") ? "aprox." : (lang || "").startsWith("en") ? "approx." : "aprox.";

  const isUrl = (v?: string) => !!v && /^(https?:\/\/)[^\s]+$/i.test(v.trim());
  const normalizeText = (v: string) =>
    String(v || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const sanitizeLegacyAmenitySlug = (slug?: string): string | undefined => {
    const s = String(slug || "").trim().toLowerCase();
    if (!s) return undefined;
    if (s === "custo" || s === "custom_custo") return undefined;
    if (
      s === "recep" ||
      s === "custom_recep" ||
      s.includes("reception_24") ||
      s.includes("recepcion_24") ||
      s.includes("recepcao_24")
    ) {
      return "reception_24h";
    }
    return s;
  };
  const airportHints = (hotel?.airports ?? []).flatMap((a, idx) => {
    const code = String(a?.code || "").trim().toUpperCase();
    const name = normalizeText(String(a?.name || ""));
    if (!code || !name) return [];
    if (/laguna del sauce|punta del este/.test(name) && code !== "PDP") return [`Fila ${idx + 1}: para "${a?.name}" suele usarse PDP.`];
    if (/carrasco/.test(name) && code !== "MVD") return [`Fila ${idx + 1}: para "${a?.name}" suele usarse MVD.`];
    if (/jaguel/.test(name) && code !== "MDO") return [`Fila ${idx + 1}: para "${a?.name}" suele usarse MDO.`];
    return [];
  });
  const countries = Country.getAllCountries();
  const cities = hotel?.country ? City.getCitiesOfCountry(hotel.country) || [] : [];

  const shiftIconManual = (removedIdx: number) => {
    setIconManual(prev => {
      const next: Record<number, boolean> = {};
      Object.keys(prev).forEach((k) => {
        const idx = Number(k);
        if (idx < removedIdx) next[idx] = prev[idx];
        else if (idx > removedIdx) next[idx - 1] = prev[idx];
      });
      return next;
    });
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { hotel: cfg } = await fetchHotelConfig(hotelId);
        const dict = await getDictionary(cfg.defaultLanguage || "en");
        const isPlainObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

        const raw: any = isPlainObject(cfg.amenities) ? { ...cfg.amenities } : {};
        // Normalize tags to slugs (legacy + other)
        let slugs: string[] = Array.isArray(raw.tags) ? normalizeAmenityTags(raw.tags as any) : [];
        if (raw.hasParking) slugs.push("parking");
        if (raw.hasPool) slugs.push("pool");
        if (raw.hasGym) slugs.push("gym");
        if (raw.hasSpa) slugs.push("spa");
        if (Array.isArray(raw.other)) slugs = slugs.concat(normalizeAmenityTags(raw.other as any));
        slugs = normalizeAmenityTags(
          slugs
            .map(sanitizeLegacyAmenitySlug)
            .filter((x): x is string => Boolean(x))
        );
        // Normalize schedules keys to slugs and merge legacy
        const sched: Record<string, string> = {};
        const rawSched: Record<string, string> = isPlainObject(raw.schedules) ? (raw.schedules as any) : {};
        for (const [k, v] of Object.entries(rawSched)) {
          const normK = sanitizeLegacyAmenitySlug(k as string);
          if (!normK) continue;
          const keySlug = normalizeAmenityTags([normK])[0] || normK;
          if (v) sched[keySlug] = v as string;
        }
        if (raw.poolSchedule && !sched["pool"]) sched["pool"] = raw.poolSchedule;
        if (raw.gymSchedule && !sched["gym"]) sched["gym"] = raw.gymSchedule;
        if (raw.spaSchedule && !sched["spa"]) sched["spa"] = raw.spaSchedule;
        for (const s of slugs) if (!(s in sched)) sched[s] = "";
        const amenities = Object.keys(raw).length ? { ...raw, tags: slugs, schedules: sched } : undefined;

        setHotel({
          ...cfg,
          amenities,
          reservations: isPlainObject(cfg.reservations) ? cfg.reservations : {},
          channelConfigs: isPlainObject(cfg.channelConfigs) ? cfg.channelConfigs : {},
          payments: isPlainObject(cfg.payments) ? cfg.payments : undefined,
          billing: isPlainObject(cfg.billing) ? cfg.billing : undefined,
          policies: isPlainObject(cfg.policies) ? cfg.policies : undefined,
          rooms: Array.isArray(cfg.rooms) ? cfg.rooms : undefined,
          contacts: isPlainObject(cfg.contacts) ? cfg.contacts : undefined,
          schedules: isPlainObject(cfg.schedules) ? cfg.schedules : undefined,
          hotelProfile: isPlainObject(cfg.hotelProfile) ? cfg.hotelProfile : undefined,
          attractionsInfo: typeof (cfg as any).attractionsInfo === "string" ? (cfg as any).attractionsInfo : undefined,
        });
        setAttractionsPreview(Array.isArray((cfg as any).attractions) ? (cfg as any).attractions : null);
        setT(dict);
      } catch (e) {
        setError("Error cargando datos del hotel");
      } finally {
        setLoading(false);
      }
    }
    if (hotelId) void load();
  }, [hotelId]);

  useEffect(() => {
    if (!isSystemHotel) return;
    try {
      const saved = localStorage.getItem("bg_admin_key");
      if (saved) setAdminKey(saved);
    } catch { }
  }, [isSystemHotel]);

  useEffect(() => {
    if (!isSystemHotel) return;
    try {
      localStorage.setItem("bg_admin_key", adminKey);
    } catch { }
  }, [adminKey, isSystemHotel]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!hotel) return;
    const waCfg: any = hotel.channelConfigs?.whatsapp;
    if (waCfg?.provider === "twilio") {
      const twilioNum = String(waCfg?.twilioWhatsAppNumber ?? waCfg?.twilioFrom ?? "").trim();
      if (!twilioNum) {
        setError("WhatsApp Twilio Sender (FROM) es obligatorio.");
        return;
      }
      if (!String(waCfg?.twilioAccountSid ?? "").trim()) {
        setError("Twilio Account SID es obligatorio.");
        return;
      }
      if (!String(waCfg?.twilioAuthToken ?? "").trim()) {
        setError("Twilio Auth Token es obligatorio.");
        return;
      }
      if (twilioNum && !/^\+\d{8,15}$/.test(twilioNum)) {
        setError("WhatsApp Twilio Number inválido. Debe estar en formato E.164 (ej: +15558847361).");
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/hotels/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hotelId, updates: hotel }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error");
      onSaved?.(hotel);
      setUpdateWarnings(Array.isArray(json.warnings) ? json.warnings : []);
    } catch (err: any) {
      setError(err.message || "Error guardando");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="mt-10 text-center">Cargando…</div>;
  if (error) return <div className="mt-10 text-center text-red-600">{error}</div>;
  if (!hotel || !t) return <div className="mt-10 text-center">Sin datos</div>;

  // Validación de horarios (HH:mm o HH:mm a HH:mm)
  const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
  const rangeRe = /^\s*([01]\d|2[0-3]):[0-5]\d\s+a\s+([01]\d|2[0-3]):[0-5]\d\s*$/i;
  const isValidTimeOrRange = (v?: string) => !v || timeRe.test(v.trim()) || rangeRe.test(v.trim());
  const scheduleErrors = {
    checkIn: !isValidTimeOrRange(hotel.schedules?.checkIn),
    checkOut: !isValidTimeOrRange(hotel.schedules?.checkOut),
    breakfast: !isValidTimeOrRange(hotel.schedules?.breakfast),
    quietHours: !isValidTimeOrRange(hotel.schedules?.quietHours),
  } as const;
  const amenScheduleErrors: Record<string, boolean> = Object.fromEntries(
    Object.entries(hotel.amenities?.schedules || {}).map(([k, v]) => [k, !isValidTimeOrRange(v)])
  );
  const hasScheduleErrors = Object.values(scheduleErrors).some(Boolean) || Object.values(amenScheduleErrors).some(Boolean);

  const channelConfigs = hotel.channelConfigs || EMPTY_CHANNEL_CONFIGS;

  return (
    <div className="max-w-3xl mx-auto mt-6 bg-muted/40 p-6 rounded shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold">{t.hotelEdit.title}</h1>
        {showBackButton && (<a href="/admin" className="text-sm text-blue-700 hover:underline">Volver</a>)}
      </div>
      <Tabs tabs={["General", "Canales", "Base de Conocimiento"]} current={tab} onChange={setTab} />
      <form id="hotel-edit-form" onSubmit={handleSave} className="flex flex-col gap-4">
        {tab === "General" && (
          <div className="grid gap-4">
            <label className="block">
              <span className="font-semibold text-sm">{t.hotelEdit.country || "País"}</span>
              <select className="border p-2 rounded w-full mt-1" value={hotel.country ?? ""} onChange={e => setHotel(h => h ? { ...h, country: e.target.value, city: "" } : h)}>
                <option value="">{t.hotelEdit.country || "País"}</option>
                {countries.map(c => (<option key={c.isoCode} value={c.isoCode}>{c.name}</option>))}
              </select>
            </label>
            <label className="block">
              <span className="font-semibold text-sm">{t.hotelEdit.city || "Ciudad"}</span>
              <select className="border p-2 rounded w-full mt-1" value={hotel.city ?? ""} disabled={!hotel.country} onChange={e => setHotel(h => h ? { ...h, city: e.target.value } : h)}>
                <option value="">{t.hotelEdit.city || "Ciudad"}</option>
                {cities.map((ct, i) => (<option key={i} value={ct.name}>{ct.name}</option>))}
              </select>
            </label>
            <label className="block">
              <span className="font-semibold text-sm">{t.hotelEdit.name || "Nombre"}</span>
              <input className="border p-2 rounded w-full mt-1" value={hotel.hotelName ?? ""} onChange={e => setHotel(h => h ? { ...h, hotelName: e.target.value } : h)} required />
            </label>
            <div className="p-3 border rounded bg-white/60 dark:bg-zinc-900/40">
              <h2 className="font-semibold mb-2 text-sm">Perfil del hotel</h2>
              <div className="grid gap-2">
                <label className="text-xs">
                  <span className="font-medium">Descripción breve</span>
                  <textarea className="border p-2 rounded w-full mt-1 text-sm" rows={3} value={hotel.hotelProfile?.shortDescription ?? ""} onChange={e => setHotel(h => h ? ({ ...h, hotelProfile: { ...(h.hotelProfile ?? {}), shortDescription: e.target.value } }) : h)} />
                </label>
                <label className="text-xs">
                  <span className="font-medium">Tipo de hotel</span>
                  <input className="border p-2 rounded w-full mt-1" placeholder="Boutique, Resort, Business, Hostel..." value={hotel.hotelProfile?.propertyType ?? ""} onChange={e => setHotel(h => h ? ({ ...h, hotelProfile: { ...(h.hotelProfile ?? {}), propertyType: e.target.value } }) : h)} />
                </label>
                <label className="text-xs">
                  <span className="font-medium">Estilo</span>
                  <input className="border p-2 rounded w-full mt-1" placeholder="Moderno, clásico, familiar..." value={hotel.hotelProfile?.style ?? ""} onChange={e => setHotel(h => h ? ({ ...h, hotelProfile: { ...(h.hotelProfile ?? {}), style: e.target.value } }) : h)} />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs">
                    <span className="font-medium">Estrellas</span>
                    <select className="border p-2 rounded w-full mt-1" value={hotel.hotelProfile?.starRating ?? ""} onChange={e => setHotel(h => h ? ({ ...h, hotelProfile: { ...(h.hotelProfile ?? {}), starRating: e.target.value ? Number(e.target.value) : undefined } }) : h)}>
                      <option value="">Sin definir</option>
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <label className="text-xs">
                    <span className="font-medium">Marca</span>
                    <input className="border p-2 rounded w-full mt-1" placeholder="(opcional)" value={hotel.hotelProfile?.brand ?? ""} onChange={e => setHotel(h => h ? ({ ...h, hotelProfile: { ...(h.hotelProfile ?? {}), brand: e.target.value } }) : h)} />
                  </label>
                </div>
                <div className="text-xs text-muted-foreground">
                  Atracciones del hotel (hotel_config.attractions)
                </div>
                <label className="text-xs">
                  <span className="font-medium">Puntos de interés y atracciones cercanas</span>
                  <select
                    className="border p-2 rounded w-full mt-1 text-sm"
                    value={(hotel as any).nearbyPointsMode ?? "auto"}
                    onChange={e => setHotel(h => h ? ({ ...h, nearbyPointsMode: e.target.value } as any) : h)}
                  >
                    <option value="auto">Auto (carrusel si hay fotos)</option>
                    <option value="always">Siempre carrusel</option>
                    <option value="text">Sin carrusel de imágenes</option>
                  </select>
                  <textarea className="border p-2 rounded w-full mt-1 text-sm" rows={3} placeholder="Ej.: Playa Mansa (500m), Puerto (10 min en taxi), Museo X" value={(hotel as any).attractionsInfo ?? ""} onChange={e => setHotel(h => h ? ({ ...h, attractionsInfo: e.target.value } as any) : h)} />
                </label>
                <div className="flex items-center gap-3">
                  {isSystemHotel && (
                    <input
                      className="border px-2 py-1 rounded text-xs"
                      placeholder="Admin key"
                      value={adminKey}
                      onChange={e => setAdminKey(e.target.value)}
                    />
                  )}
                  <button
                    type="button"
                    className="border px-3 py-1 rounded text-xs bg-white"
                    disabled={attractionsBusy}
                    onClick={async () => {
                      setAttractionsBusy(true);
                      setAttractionsMsg(null);
                      setAttractionsStats(null);
                      try {
                        const res = await fetch("/api/hotels/enrich-attractions", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ hotelId }),
                        });
                        const json = await res.json();
                        if (!res.ok) throw new Error(json.error || "Error");
                        setHotel(h => h ? ({ ...h, attractions: json.attractions || [] } as any) : h);
                        setAttractionsPreview(Array.isArray(json.attractions) ? json.attractions : null);
                        setAttractionsMsg(`Atracciones fijas generadas (${json.count || 0}).`);
                        const headers: Record<string, string> = { "Content-Type": "application/json" };
                        if (adminKey) headers["x-admin-key"] = adminKey;
                        if (!isSystemHotel) {
                          setAttractionsMsg(`Atracciones fijas generadas (${json.count || 0}). Enriquecimiento de imágenes solo en system.`);
                          return;
                        }
                        if (!adminKey) {
                          setAttractionsMsg("Admin key requerida para enriquecer imágenes.");
                          return;
                        }
                        headers["x-hotel-id"] = hotelId;
                        const enrichRes = await fetch("/api/admin/hotel-config/enrich-attractions", {
                          method: "POST",
                          headers,
                          body: JSON.stringify({ hotelId, maxItems: 12, maxImagesPerItem: 3, force: false }),
                        });
                        const enrichJson = await enrichRes.json();
                        if (!enrichRes.ok) throw new Error(enrichJson.error || "Error enriqueciendo imágenes");
                        setAttractionsStats(enrichJson);
                      } catch (e: any) {
                        setAttractionsMsg(e?.message || "Error generando atracciones");
                        setAttractionsPreview(null);
                      } finally {
                        setAttractionsBusy(false);
                      }
                    }}
                  >
                    {attractionsBusy ? "Generando…" : "Autogenerar atracciones fijas (LLM)"}
                  </button>
                  {!isSystemHotel && (
                    <span className="text-xs text-muted-foreground">Enriquecimiento de imágenes: solo system</span>
                  )}
                  {attractionsMsg && <span className="text-xs">{attractionsMsg}</span>}
                  {attractionsStats?.stats && (
                    <span className="text-xs text-gray-600">
                      Enrich: {attractionsStats.stats.enrichedImages ?? 0} img, {attractionsStats.stats.enrichedNotes ?? 0} notes, {attractionsStats.stats.skippedImages ?? 0} skip
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-3">
                  Eventos del hotel se gestionan en la sección Eventos del panel.{" "}
                  <a href="/admin/events" className="underline">Ir a Eventos</a>
                </div>
                {attractionsPreview && attractionsPreview.length > 0 && (
                  <div className="mt-2 border rounded bg-white/70 dark:bg-zinc-900/40 p-2">
                    <div className="text-xs font-medium mb-1">Vista previa (atracciones fijas)</div>
                    <ul className="text-xs list-disc list-inside space-y-1">
                      {attractionsPreview.map((a, i) => {
                        const rawNotes = a.notes || "";
                        const m = rawNotes.match(/(Distancia estimada|Estimated distance|Distância estimada):\s*([0-9.,–-]+\s*km)\.?/i);
                        const est = m ? m[2] : "";
                        const cleanNotes = m ? rawNotes.replace(m[0], "").trim() : rawNotes;
                        return (
                          <li key={i}>
                            {a.photoName ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`/api/places/photo?name=${encodeURIComponent(a.photoName)}&maxWidth=600`}
                                alt={a.name || "Atracción"}
                                className="my-1 h-20 w-32 object-cover rounded border"
                                loading="lazy"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                              />
                            ) : null}
                            <span className="font-medium">{a.name || "Atracción"}</span>
                            {typeof a.distanceKm === "number"
                              ? (a.distanceKm < 1
                                  ? ` — ${Math.round(a.distanceKm * 1000)} m`
                                  : ` — ${a.distanceKm.toFixed(1)} km`)
                              : ""}
                            {a.driveTime ? ` — ${a.driveTime} ${approxLabel(hotel.defaultLanguage)}` : ""}
                            {est ? ` — ${est}` : ""}
                            {cleanNotes ? ` — ${cleanNotes}` : ""}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <label className="block">
              <span className="font-semibold text-sm">{t.hotelEdit.address || "Dirección"}</span>
              <input className="border p-2 rounded w-full mt-1" value={hotel.address ?? ""} onChange={e => setHotel(h => h ? { ...h, address: e.target.value } : h)} />
            </label>
            <label className="block">
              <span className="font-semibold text-sm">{t.hotelEdit.phone || "Teléfono"}</span>
              <input className="border p-2 rounded w-full mt-1" value={hotel.phone ?? ""} onChange={e => setHotel(h => h ? { ...h, phone: e.target.value } : h)} />
            </label>
            <label className="block">
              <span className="font-semibold text-sm">{t.hotelEdit.postalCode || "Código Postal"}</span>
              <input className="border p-2 rounded w-full mt-1" value={hotel.postalCode ?? ""} onChange={e => setHotel(h => h ? { ...h, postalCode: e.target.value } : h)} />
            </label>
            <label className="block">
              <span className="font-semibold text-sm">{t.hotelEdit.defaultLanguage || "Idioma"}</span>
              <select className="border p-2 rounded w-full mt-1" value={hotel.defaultLanguage ?? ""} onChange={e => setHotel(h => h ? { ...h, defaultLanguage: e.target.value } : h)}>
                <option value="">{t.hotelEdit.defaultLanguage || "Idioma"}</option>
                {LANGUAGE_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="font-semibold text-sm">{t.hotelEdit.timezone || "Zona horaria"}</span>
              <select className="border p-2 rounded w-full mt-1" value={hotel.timezone ?? ""} onChange={e => setHotel(h => h ? { ...h, timezone: e.target.value } : h)}>
                <option value="">{t.hotelEdit.timezone || "Zona horaria"}</option>
                {TIMEZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </label>
            <div className="p-3 border rounded bg-white/60 dark:bg-zinc-900/40">
              <h2 className="font-semibold mb-2 text-sm">Contactos</h2>
              <div className="grid gap-2">
                <label className="text-xs"><span className="font-medium">Email</span><input className="border p-2 rounded w-full mt-1" type="email" value={hotel.contacts?.email ?? ''} onChange={e => setHotel(h => h ? ({ ...h, contacts: { ...(h.contacts ?? {}), email: e.target.value } }) : h)} /></label>
                <label className="text-xs"><span className="font-medium">WhatsApp</span><input className="border p-2 rounded w-full mt-1" value={hotel.contacts?.whatsapp ?? ''} onChange={e => setHotel(h => h ? ({ ...h, contacts: { ...(h.contacts ?? {}), whatsapp: e.target.value } }) : h)} /></label>
                <label className="text-xs"><span className="font-medium">Teléfono</span><input className="border p-2 rounded w-full mt-1" value={hotel.contacts?.phone ?? ''} onChange={e => setHotel(h => h ? ({ ...h, contacts: { ...(h.contacts ?? {}), phone: e.target.value } }) : h)} /></label>
                <label className="text-xs"><span className="font-medium">Sitio web</span><input className={`border p-2 rounded w-full mt-1 ${hotel.contacts?.website && !isUrl(hotel.contacts.website) ? 'border-red-500' : ''}`} value={hotel.contacts?.website ?? ''} onChange={e => setHotel(h => h ? ({ ...h, contacts: { ...(h.contacts ?? {}), website: e.target.value } }) : h)} /></label>
                <label className="text-xs"><span className="font-medium">Horario de atención (soporte)</span><input className="border p-2 rounded w-full mt-1" placeholder="Ej: 08:00 a 22:00" value={hotel.contacts?.supportHours ?? ''} onChange={e => setHotel(h => h ? ({ ...h, contacts: { ...(h.contacts ?? {}), supportHours: e.target.value } }) : h)} /></label>
                <label className="text-xs"><span className="font-medium">Escalamiento nocturno / guardia</span><textarea className="border p-2 rounded w-full mt-1" rows={2} placeholder="Ej: Guardia por WhatsApp +598... o recepcionista de turno" value={hotel.contacts?.supportEscalation ?? ''} onChange={e => setHotel(h => h ? ({ ...h, contacts: { ...(h.contacts ?? {}), supportEscalation: e.target.value } }) : h)} /></label>
                {hotel.contacts?.website && !isUrl(hotel.contacts.website) && <span className="text-xs text-red-600">URL inválida</span>}
              </div>
            </div>
            <div className="p-3 border rounded bg-white/60 dark:bg-zinc-900/40">
              <h2 className="font-semibold mb-2 text-sm">Transporte de llegada</h2>
              <div className="flex items-center gap-3 mb-3">
                <button
                  type="button"
                  className="border px-3 py-1 rounded text-xs bg-white"
                  disabled={arrivalsBusy}
                  onClick={async () => {
                    setArrivalsBusy(true);
                    setArrivalsMsg(null);
                    try {
                      const res = await fetch("/api/hotels/enrich-arrivals-transport", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ hotelId }),
                      });
                      const json = await res.json();
                      if (!res.ok) throw new Error(json.error || "Error");
                      setHotel(h => h ? ({ ...h, airports: json.airports || [], transport: json.transport || {} } as any) : h);
                      setArrivalsMsg(`Transporte de llegada autogenerado (${json.count || 0} aeropuertos).`);
                    } catch (e: any) {
                      setArrivalsMsg(e?.message || "Error autogenerando transporte");
                    } finally {
                      setArrivalsBusy(false);
                    }
                  }}
                >
                  {arrivalsBusy ? "Generando…" : "Autogenerar (IA)"}
                </button>
                {arrivalsMsg && <span className="text-xs">{arrivalsMsg}</span>}
              </div>
              <div className="space-y-2">
                {(hotel.airports ?? []).length > 0 && (
                  <div className="hidden md:grid md:grid-cols-5 gap-2 text-[11px] text-muted-foreground font-medium px-1">
                    <span>Código</span>
                    <span className="md:col-span-2">Aeropuerto</span>
                    <span>Distancia (km)</span>
                    <span>Tiempo en auto</span>
                  </div>
                )}
                {(hotel.airports ?? []).map((a, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                    <input className="border p-2 rounded text-xs" placeholder="IATA (ej. PDP)" value={a.code ?? ""} onChange={e => setHotel(h => h ? ({ ...h, airports: (h.airports ?? []).map((x, i) => i === idx ? { ...x, code: e.target.value } : x) }) : h)} />
                    <input className="border p-2 rounded text-xs md:col-span-2" placeholder="Nombre de aeropuerto" value={a.name ?? ""} onChange={e => setHotel(h => h ? ({ ...h, airports: (h.airports ?? []).map((x, i) => i === idx ? { ...x, name: e.target.value } : x) }) : h)} />
                    <input className="border p-2 rounded text-xs" placeholder="Distancia (km)" type="number" value={a.distanceKm ?? ""} onChange={e => setHotel(h => h ? ({ ...h, airports: (h.airports ?? []).map((x, i) => i === idx ? { ...x, distanceKm: e.target.value ? Number(e.target.value) : undefined } : x) }) : h)} />
                    <div className="flex items-center gap-2">
                      <input className="border p-2 rounded text-xs w-full" placeholder="Tiempo en auto (ej. 25 min)" value={a.driveTime ?? ""} onChange={e => setHotel(h => h ? ({ ...h, airports: (h.airports ?? []).map((x, i) => i === idx ? { ...x, driveTime: e.target.value } : x) }) : h)} />
                      <button type="button" className="text-xs text-red-600" onClick={() => setHotel(h => h ? ({ ...h, airports: (h.airports ?? []).filter((_, i) => i !== idx) }) : h)}>Quitar</button>
                    </div>
                  </div>
                ))}
                <button type="button" className="border px-2 py-1 rounded text-xs" onClick={() => setHotel(h => h ? ({ ...h, airports: [ ...(h.airports ?? []), { code: "", name: "", distanceKm: undefined, driveTime: "" } ] }) : h)}>+ Agregar aeropuerto</button>
              </div>
              {airportHints.length > 0 && (
                <div className="mt-2 p-2 border rounded bg-amber-50 text-[11px] text-amber-800">
                  <strong>Sugerencias IATA:</strong>
                  <ul className="list-disc ml-4 mt-1">
                    {airportHints.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
              <div className="grid gap-2 mt-3">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={Boolean(hotel.transport?.hasPrivateTransfer)} onChange={e => setHotel(h => h ? ({ ...h, transport: { ...(h.transport ?? {}), hasPrivateTransfer: e.target.checked } }) : h)} />
                  <span>Transfer privado disponible</span>
                </label>
                <textarea className="border p-2 rounded text-xs" rows={2} placeholder="Notas de transfer" value={hotel.transport?.transferNotes ?? ""} onChange={e => setHotel(h => h ? ({ ...h, transport: { ...(h.transport ?? {}), transferNotes: e.target.value } }) : h)} />
                <textarea className="border p-2 rounded text-xs" rows={2} placeholder="Notas de taxi/apps" value={hotel.transport?.taxiNotes ?? ""} onChange={e => setHotel(h => h ? ({ ...h, transport: { ...(h.transport ?? {}), taxiNotes: e.target.value } }) : h)} />
                <textarea className="border p-2 rounded text-xs" rows={2} placeholder="Notas de bus/ómnibus" value={hotel.transport?.busNotes ?? ""} onChange={e => setHotel(h => h ? ({ ...h, transport: { ...(h.transport ?? {}), busNotes: e.target.value } }) : h)} />
              </div>
            </div>
          </div>
        )}

        {tab === "Canales" && (
          <div className="grid gap-4">
            {ALL_CHANNELS.map(ch => (
              <ChannelConfigCard key={ch} channel={ch} config={channelConfigs[ch]} onChange={cfg => setHotel(h => h ? ({ ...h, channelConfigs: { ...channelConfigs, [ch]: cfg } }) : h)} t={t} />
            ))}
          </div>
        )}

        {tab === "Base de Conocimiento" && (
          <div className="flex flex-col gap-6">
            <div className="p-4 border rounded bg-white/60 dark:bg-zinc-900/40">
              <h3 className="font-semibold mb-2 text-sm">Amenities y Horarios</h3>
              <TagSelect
                label="Amenities"
                values={(hotel.amenities?.tags ?? []).map(slug => amenityLabel(slug, (hotel.defaultLanguage as any) || 'es'))}
                suggestions={["Estacionamiento","Piscina","Gimnasio","Spa","Recepción 24h","Room service","Restaurante","Bar","Cafetería","Lavandería","Wi‑Fi gratis","Co‑working","Guardaequipaje","Conserjería","Caja de seguridad","Transfers","Tours","Bicicletas","Sillas altas","Cunas","Sauna","Hidromasaje","Salas de reuniones","Business center","Terraza","Jardín","Pet‑friendly"]}
                placeholder="Escribe o selecciona"
                onChange={vals => setHotel(h => {
                  if (!h) return h;
                  const slugs = normalizeAmenityTags(vals as any);
                  const prevSched = h.amenities?.schedules || {};
                  const nextSched: Record<string,string> = {};
                  for (const s of slugs) nextSched[s] = prevSched[s] ?? '';
                  return { ...h, amenities: { ...(h.amenities ?? {}), tags: slugs, schedules: nextSched } } as any;
                })}
              />
              <textarea className="border p-2 rounded w-full mt-2 text-sm" placeholder="Notas generales de amenities (ej. 'Estacionamiento por orden de llegada')" value={hotel.amenities?.notes ?? ''} onChange={e => setHotel(h => h ? ({ ...h, amenities: { ...(h.amenities ?? {}), notes: e.target.value } }) : h)} />
              <input className="border p-2 rounded w-full mt-2 text-sm" placeholder="Notas de estacionamiento" value={hotel.amenities?.parkingNotes ?? ''} onChange={e => setHotel(h => h ? ({ ...h, amenities: { ...(h.amenities ?? {}), parkingNotes: e.target.value } }) : h)} />
              <h4 className="font-medium mt-4 mb-1 text-xs">Horarios por amenity</h4>
              {(() => {
                const lang = (hotel.defaultLanguage as any) || 'es';
                const selectedSlugs = (hotel.amenities?.tags ?? []);
                const existing = new Set(Object.keys(hotel.amenities?.schedules || {}));
                const options = selectedSlugs.filter(slug => !existing.has(slug));
                return (
                  <div className="flex items-center gap-2 mb-2">
                    <select className="border p-1 rounded text-xs" value="" onChange={e => {
                      const slug = e.target.value; if (!slug) return;
                      setHotel(h => h ? ({ ...h, amenities: { ...(h.amenities ?? {}), schedules: { ...(h.amenities?.schedules ?? {}), [slug]: '' } } }) : h);
                    }}>
                      <option value="">Agregar horario…</option>
                      {options.map(slug => <option key={slug} value={slug}>{amenityLabel(slug, lang)}</option>)}
                    </select>
                    <span className="text-[10px] text-muted-foreground">Formato HH:mm o HH:mm a HH:mm</span>
                  </div>
                );
              })()}
              <div className="space-y-2">
                {Object.entries(hotel.amenities?.schedules || {}).map(([slug, val]) => (
                  <div key={slug} className="flex items-center gap-2">
                    <span className="text-xs w-28 truncate" title={slug}>{amenityLabel(slug, (hotel.defaultLanguage as any) || 'es')}</span>
                    <input className={`border p-1 rounded text-xs flex-1 ${amenScheduleErrors[slug] ? 'border-red-500' : ''}`} value={val ?? ''} placeholder="08:00 a 20:00" onChange={e => setHotel(h => h ? ({ ...h, amenities: { ...(h.amenities ?? {}), schedules: { ...(h.amenities?.schedules ?? {}), [slug]: e.target.value } } }) : h)} />
                    <button type="button" className="text-[10px] text-red-600" onClick={() => setHotel(h => h ? ({ ...h, amenities: { ...(h.amenities ?? {}), schedules: Object.fromEntries(Object.entries(h.amenities?.schedules || {}).filter(([k]) => k !== slug)) } }) : h)}>
                      Quitar
                    </button>
                    {amenScheduleErrors[slug] && <span className="text-[10px] text-red-600">Formato inválido</span>}
                  </div>
                ))}
              </div>
              <div className="grid gap-2 mt-4 text-xs">
                <label className="flex flex-col"><span>Check-in</span><input className={`border p-2 rounded ${scheduleErrors.checkIn ? 'border-red-500' : ''}`} value={hotel.schedules?.checkIn ?? ''} placeholder="15:00" onChange={e => setHotel(h => h ? ({ ...h, schedules: { ...(h.schedules ?? {}), checkIn: e.target.value } }) : h)} />{scheduleErrors.checkIn && <span className="text-[10px] text-red-600">Formato inválido</span>}</label>
                <label className="flex flex-col"><span>Check-out</span><input className={`border p-2 rounded ${scheduleErrors.checkOut ? 'border-red-500' : ''}`} value={hotel.schedules?.checkOut ?? ''} placeholder="11:00" onChange={e => setHotel(h => h ? ({ ...h, schedules: { ...(h.schedules ?? {}), checkOut: e.target.value } }) : h)} />{scheduleErrors.checkOut && <span className="text-[10px] text-red-600">Formato inválido</span>}</label>
                <label className="flex flex-col"><span>Desayuno</span><input className={`border p-2 rounded ${scheduleErrors.breakfast ? 'border-red-500' : ''}`} value={hotel.schedules?.breakfast ?? ''} placeholder="07:30 a 10:30" onChange={e => setHotel(h => h ? ({ ...h, schedules: { ...(h.schedules ?? {}), breakfast: e.target.value } }) : h)} />{scheduleErrors.breakfast && <span className="text-[10px] text-red-600">Formato inválido</span>}</label>
                <label className="flex flex-col"><span>Horas de silencio</span><input className={`border p-2 rounded ${scheduleErrors.quietHours ? 'border-red-500' : ''}`} value={hotel.schedules?.quietHours ?? ''} placeholder="22:00 a 07:00" onChange={e => setHotel(h => h ? ({ ...h, schedules: { ...(h.schedules ?? {}), quietHours: e.target.value } }) : h)} />{scheduleErrors.quietHours && <span className="text-[10px] text-red-600">Formato inválido</span>}</label>
              </div>
              <div className="mt-3 p-2 border rounded bg-white/50 text-[11px]">
                <strong>Resumen:</strong>{' '}
                {(() => {
                  const list = (hotel.amenities?.tags ?? []).map(slug => amenityLabel(slug, (hotel.defaultLanguage as any) || 'es')).join(', ');
                  const svc = Object.entries(hotel.amenities?.schedules || {}).map(([slug,v]) => `${amenityLabel(slug, (hotel.defaultLanguage as any) || 'es')}:${v}`).join(' | ');
                  const parts: string[] = [];
                  if (list) parts.push(`Amenities: ${list}`);
                  if (svc) parts.push(`Servicios: ${svc}`);
                  if (hotel.schedules?.checkIn) parts.push(`Check-in: ${hotel.schedules.checkIn}`);
                  if (hotel.schedules?.checkOut) parts.push(`Check-out: ${hotel.schedules.checkOut}`);
                  if (hotel.schedules?.breakfast) parts.push(`Desayuno: ${hotel.schedules.breakfast}`);
                  if (hotel.schedules?.quietHours) parts.push(`Silencio: ${hotel.schedules.quietHours}`);
                  return parts.length ? parts.join(' | ') : 'Completa datos para ver el resumen.';
                })()}
              </div>
            </div>

            <div className="p-4 border rounded bg-white/60 dark:bg-zinc-900/40">
              <h3 className="font-semibold mb-2 text-sm">Facturación</h3>
              <TagSelect label="Notas de facturación" values={hotel.billing?.invoiceNotesTags ?? []} suggestions={["Factura A","Factura B","Factura C","Recibo","Ticket","IVA discriminado","Exportación","Cobro anticipado","Proforma","Datos fiscales","Sin datos fiscales"]} placeholder="Añade tags" onChange={vals => setHotel(h => h ? ({ ...h, billing: { ...(h.billing ?? {}), invoiceNotesTags: vals } }) : h)} />
              <input className="border p-2 rounded w-full mt-2 text-sm" placeholder="Notas libres" value={hotel.billing?.invoiceNotes ?? ''} onChange={e => setHotel(h => h ? ({ ...h, billing: { ...(h.billing ?? {}), invoiceNotes: e.target.value } }) : h)} />
              <label className="flex items-center gap-2 mt-2 text-xs"><input type="checkbox" checked={Boolean(hotel.billing?.issuesInvoices)} onChange={e => setHotel(h => h ? ({ ...h, billing: { ...(h.billing ?? {}), issuesInvoices: e.target.checked } }) : h)} /><span>Emitimos facturas</span></label>
            </div>

            <div className="p-4 border rounded bg-white/60 dark:bg-zinc-900/40">
              <h3 className="font-semibold mb-2 text-sm">Pagos</h3>
              <TagSelect label="Métodos" values={hotel.payments?.methods ?? []} suggestions={["Efectivo","Transferencia","Tarjeta de crédito","Tarjeta de débito","Crypto"]} placeholder="Añade método" onChange={vals => setHotel(h => h ? ({ ...h, payments: { ...(h.payments ?? {}), methods: vals } }) : h)} />
              <TagSelect label="Monedas" className="mt-2" values={hotel.payments?.currencies ?? (hotel.payments?.currency ? [hotel.payments.currency] : [])} suggestions={["USD","EUR","ARS","BRL","CLP","MXN","COP","PEN","UYU"]} placeholder="Código ISO" onChange={vals => setHotel(h => h ? ({ ...h, payments: { ...(h.payments ?? {}), currencies: vals, currency: vals[0] ?? h.payments?.currency } }) : h)} />
              <TagSelect label="Notas (tags)" className="mt-2" values={hotel.payments?.notesTags ?? []} suggestions={["Depósito","Prepago","Saldo check-in","Saldo check-out","Garantía tarjeta","Sin anticipo","Fraccionado","Reembolsable parcial","No reembolsable","Cargo servicio"]} placeholder="Añade nota" onChange={vals => setHotel(h => h ? ({ ...h, payments: { ...(h.payments ?? {}), notesTags: vals } }) : h)} />
              <input className="border p-2 rounded w-full mt-2 text-sm" placeholder="Notas libres" value={hotel.payments?.notes ?? ''} onChange={e => setHotel(h => h ? ({ ...h, payments: { ...(h.payments ?? {}), notes: e.target.value } }) : h)} />
              <label className="flex items-center gap-2 mt-2 text-xs"><input type="checkbox" checked={Boolean(hotel.payments?.requiresCardForBooking)} onChange={e => setHotel(h => h ? ({ ...h, payments: { ...(h.payments ?? {}), requiresCardForBooking: e.target.checked } }) : h)} /><span>Requiere tarjeta para reservar</span></label>
            </div>

            <div className="p-4 border rounded bg-white/60 dark:bg-zinc-900/40">
              <h3 className="font-semibold mb-2 text-sm">Políticas generales</h3>
              <TagSelect label="Políticas (tags)" values={hotel.policies?.generalTags ?? []} suggestions={["Niños gratis","Late check-out","Early check-in","No fiestas","No mascotas","Pet-friendly","Depósito reembolsable","Depósito no reembolsable","Silencio nocturno","Solo adultos","Prohibido fumar","Área fumadores","Mascotas bajo petición","Mascotas con cargo","Check-in express","Uso gorro piscina"]} placeholder="Añade política" onChange={vals => setHotel(h => h ? ({ ...h, policies: { ...(h.policies ?? {}), generalTags: vals } }) : h)} />
            </div>

            <div className="p-4 border rounded bg-white/60 dark:bg-zinc-900/40">
              <h3 className="font-semibold mb-2 text-sm">Políticas de reservas</h3>
              {(() => {
                const raw = hotel.policies?.cancellation as any;
                const isString = typeof raw === 'string';
                const can = (isString ? { flexible: raw } : (raw || {})) as { flexible?: string; nonRefundable?: string; channels?: string[]; noShow?: string };
                return (
                  <div className="p-3 border rounded bg-white/50">
                    <h4 className="font-medium text-xs mb-2">Cancelación</h4>
                    <textarea className="border p-2 rounded w-full text-xs mb-2" rows={2} placeholder="Flexible" value={can.flexible ?? ''} onChange={e => setHotel(h => h ? ({ ...h, policies: { ...(h.policies ?? {}), cancellation: { ...(isString ? {} : (h.policies?.cancellation as any) || {}), flexible: e.target.value } } }) : h)} />
                    <textarea className="border p-2 rounded w-full text-xs mb-2" rows={2} placeholder="No reembolsable" value={can.nonRefundable ?? ''} onChange={e => setHotel(h => h ? ({ ...h, policies: { ...(h.policies ?? {}), cancellation: { ...(isString ? { flexible: can.flexible } : (h.policies?.cancellation as any) || {}), nonRefundable: e.target.value } } }) : h)} />
                    <TagSelect label="Canales" values={Array.isArray(can.channels) ? can.channels : []} suggestions={["Email","Teléfono","Whatsapp","Portal OTA","Sitio web"]} placeholder="Añade canal" onChange={vals => setHotel(h => h ? ({ ...h, policies: { ...(h.policies ?? {}), cancellation: { ...(isString ? { flexible: can.flexible } : (h.policies?.cancellation as any) || {}), channels: vals } } }) : h)} />
                    <textarea className="border p-2 rounded w-full text-xs mt-2" rows={2} placeholder="No-show" value={can.noShow ?? ''} onChange={e => setHotel(h => h ? ({ ...h, policies: { ...(h.policies ?? {}), cancellation: { ...(isString ? { flexible: can.flexible } : (h.policies?.cancellation as any) || {}), noShow: e.target.value } } }) : h)} />
                  </div>
                );
              })()}
              <div className="mt-3"><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={Boolean(hotel.reservations?.forceCanonicalQuestion)} onChange={e => setHotel(h => h ? ({ ...h, reservations: { ...(h.reservations ?? {}), forceCanonicalQuestion: e.target.checked } }) : h)} /><span>Forzar pregunta canónica (reservas)</span></label></div>
            </div>

            <div className="p-4 border rounded bg-white/60 dark:bg-zinc-900/40">
              <h3 className="font-semibold mb-2 text-sm">Habitaciones</h3>
              {(hotel.rooms ?? []).map((r, idx) => (
                <div key={idx} className="border rounded p-3 mb-3 bg-white/70 dark:bg-zinc-800/50">
                  <div className="flex justify-between items-center mb-2 text-xs"><strong>Habitación #{idx + 1}</strong><button type="button" className="text-red-600" onClick={() => { shiftIconManual(idx); setHotel(h => h ? ({ ...h, rooms: (h.rooms ?? []).filter((_, i) => i !== idx) }) : h); }}>Eliminar</button></div>
                  <input className="border p-1 rounded w-full mb-1 text-xs" placeholder="Nombre" value={r.name ?? ''} onChange={e => {
                    const newName = e.target.value;
                    setHotel(h => h ? ({
                      ...h,
                      rooms: (h.rooms ?? []).map((rr,i) => i === idx ? {
                        ...rr,
                        name: newName,
                        icon: (!iconManual[idx] && !(rr.icon ?? "").trim()) ? suggestRoomIcon(newName) : rr.icon,
                      } : rr),
                    }) : h);
                  }} />
                  <input className="border p-1 rounded w-full mb-1 text-xs" placeholder="Tamaño m²" type="number" value={r.sizeM2 ?? ''} onChange={e => setHotel(h => h ? ({ ...h, rooms: (h.rooms ?? []).map((rr,i) => i === idx ? { ...rr, sizeM2: e.target.value ? Number(e.target.value) : undefined } : rr) }) : h)} />
                  <input className="border p-1 rounded w-full mb-1 text-xs" placeholder="Capacidad" type="number" value={r.capacity ?? ''} onChange={e => setHotel(h => h ? ({ ...h, rooms: (h.rooms ?? []).map((rr,i) => i === idx ? { ...rr, capacity: e.target.value ? Number(e.target.value) : undefined } : rr) }) : h)} />
                  <input className="border p-1 rounded w-full mb-1 text-xs" placeholder="Camas" value={r.beds ?? ''} onChange={e => setHotel(h => h ? ({ ...h, rooms: (h.rooms ?? []).map((rr,i) => i === idx ? { ...rr, beds: e.target.value } : rr) }) : h)} />
                  <textarea className="border p-1 rounded w-full mb-1 text-xs" rows={2} placeholder="Descripción" value={r.description ?? ''} onChange={e => setHotel(h => h ? ({ ...h, rooms: (h.rooms ?? []).map((rr,i) => i === idx ? { ...rr, description: e.target.value } : rr) }) : h)} />
                  <TagSelect label="Highlights" values={r.highlights ?? []} suggestions={["Vista al mar","Vista a la ciudad","Balcón","Terraza","A/C","Calefacción","TV Smart","Wi‑Fi alta velocidad","Caja fuerte","Escritorio","Minibar","Cafetera","Accesible","Ducha walk-in","Bañera","Cama King","Cama Queen","Sofá cama","Pet-friendly"]} placeholder="Añade highlight" onChange={vals => setHotel(h => h ? ({ ...h, rooms: (h.rooms ?? []).map((rr,i) => i === idx ? { ...rr, highlights: vals } : rr) }) : h)} />
                  <input className="border p-1 rounded w-full mb-1 text-xs" placeholder="Imágenes (coma)" value={(r.images ?? []).join(', ')} onChange={e => setHotel(h => h ? ({ ...h, rooms: (h.rooms ?? []).map((rr,i) => i === idx ? { ...rr, images: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } : rr) }) : h)} />
                  <input className="border p-1 rounded w-full mb-1 text-xs" placeholder="Icono" value={r.icon ?? ''} onChange={e => {
                    const nextIcon = e.target.value;
                    setIconManual(prev => ({ ...prev, [idx]: Boolean(nextIcon) }));
                    setHotel(h => h ? ({ ...h, rooms: (h.rooms ?? []).map((rr,i) => i === idx ? { ...rr, icon: nextIcon } : rr) }) : h);
                  }} />
                  <div className="flex flex-wrap gap-1 mb-1">
                    {["🛏️","👑","✨","👨‍👩‍👧‍👦","♿","🌊","🌿","🏙️","🏠"].map((emoji) => (
                      <button key={emoji} type="button" className="text-xs border rounded px-1" onClick={() => {
                        setIconManual(prev => ({ ...prev, [idx]: true }));
                        setHotel(h => h ? ({ ...h, rooms: (h.rooms ?? []).map((rr,i) => i === idx ? { ...rr, icon: emoji } : rr) }) : h);
                      }}>{emoji}</button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-[11px] mb-1"><input type="checkbox" checked={Boolean(r.accessible)} onChange={e => setHotel(h => h ? ({ ...h, rooms: (h.rooms ?? []).map((rr,i) => i === idx ? { ...rr, accessible: e.target.checked } : rr) }) : h)} /><span>Accesible</span></label>
                </div>
              ))}
              <button type="button" className="border px-3 py-1 rounded text-xs" onClick={() => setHotel(h => h ? ({ ...h, rooms: [ ...(h.rooms ?? []), { name: '' } ] }) : h)}>+ Agregar habitación</button>
            </div>

          </div>
        )}
      </form>

      <div className="mt-6 flex items-center justify-between">
        {hasScheduleErrors && (<div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">Corrige horarios inválidos antes de guardar.</div>)}
        <button type="submit" form="hotel-edit-form" disabled={loading || hasScheduleErrors} className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50">
          {loading ? 'Guardando…' : hasScheduleErrors ? 'Corrige horarios' : 'Guardar configuración'}
        </button>
      </div>

      {updateWarnings.length > 0 && (
        <div className="mt-4 p-3 border rounded bg-yellow-50 text-xs text-yellow-800">
          <strong>Advertencias:</strong>
          <ul className="list-disc ml-4 mt-1">{updateWarnings.map((w,i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
