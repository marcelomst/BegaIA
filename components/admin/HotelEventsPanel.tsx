"use client";

import { useEffect, useState } from "react";
import { fetchHotelConfig } from "@/lib/config/hotelConfig.client";
import { useCurrentUser } from "@/lib/context/UserContext";

type TouristEvent = {
  poiRefId?: string;
  name?: string;
  notes?: string;
  startsAt?: string;
  endsAt?: string;
  venue?: string;
  sourceUrl?: string;
  priority?: number;
  hidden?: boolean;
  images?: Array<{ url?: string; alt?: string }>;
};

export function HotelEventsPanel() {
  const { user, loading: userLoading } = useCurrentUser();
  const hotelId = user?.hotelId || "";
  const isSystemHotel = hotelId === "system";

  const [eventsBusy, setEventsBusy] = useState(false);
  const [eventsMsg, setEventsMsg] = useState<string | null>(null);
  const [eventsStats, setEventsStats] = useState<any>(null);
  const [eventsPreview, setEventsPreview] = useState<TouristEvent[] | null>(null);
  const [eventsDraft, setEventsDraft] = useState<TouristEvent[]>([]);
  const [eventsRegion, setEventsRegion] = useState("");
  const [adminKey, setAdminKey] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bg_admin_key");
      if (saved) setAdminKey(saved);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("bg_admin_key", adminKey);
    } catch {}
  }, [adminKey]);

  useEffect(() => {
    if (!hotelId) return;
    fetchHotelConfig(hotelId)
      .then((res) => {
        const list = Array.isArray(res?.hotel?.touristEvents) ? res.hotel.touristEvents : [];
        setEventsPreview(list);
        setEventsDraft(list);
        setEventsRegion(String((res?.hotel as any)?.eventsRegion || ""));
      })
      .catch(() => {
        setEventsPreview(null);
        setEventsDraft([]);
        setEventsRegion("");
      });
  }, [hotelId]);

  if (userLoading) {
    return <div className="text-sm text-muted-foreground">Cargando sesión...</div>;
  }

  if (!user) {
    return <div className="text-sm text-muted-foreground">Sin sesión</div>;
  }

  const runEnrich = async (regenerate: boolean) => {
    setEventsBusy(true);
    setEventsMsg(null);
    setEventsStats(null);
    try {
      if (isSystemHotel) {
        setEventsMsg("System opera POI global. Este flujo aplica solo a hoteles no-system.");
        return;
      }
      if (!adminKey) {
        setEventsMsg("Admin key requerida para continuar.");
        return;
      }
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      headers["x-admin-key"] = adminKey;
      headers["x-hotel-id"] = hotelId;
      const res = await fetch("/api/admin/hotel-config/enrich-events", {
        method: "POST",
        headers,
        body: JSON.stringify({ hotelId, maxItems: 12, maxImagesPerItem: 3, force: regenerate, regenerate }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error enriqueciendo eventos");
      setEventsStats(json);
      const mode = String(json?.mode || (regenerate ? "regenerate" : "enrich"));
      const source = String(json?.source || "unknown");
      const poiCount = Number(json?.poiCount || 0);
      const savedCount = Number(json?.savedCount || json?.count || 0);
      if (mode === "regenerate") {
        setEventsMsg(`Eventos regenerados: guardados=${savedCount}, fuente=${source}, poi=${poiCount}.`);
      } else {
        setEventsMsg(`Eventos enriquecidos: guardados=${savedCount}, fuente=${source}.`);
      }
      const refreshed = await fetchHotelConfig(hotelId).catch(() => null);
      if (refreshed?.hotel) {
        const list = Array.isArray((refreshed.hotel as any).touristEvents) ? (refreshed.hotel as any).touristEvents : [];
        setEventsPreview(list);
        setEventsDraft(list);
      } else if (savedCount === 0) {
        // Fallback visual: si no pudimos refrescar y el backend guardó 0, limpiamos vista local.
        setEventsPreview([]);
        setEventsDraft([]);
      }
    } catch (e: any) {
      setEventsMsg(e?.message || "Error enriqueciendo eventos");
    } finally {
      setEventsBusy(false);
    }
  };

  const updateDraftField = (idx: number, field: keyof TouristEvent, value: string) => {
    setEventsDraft((prev) =>
      prev.map((ev, i) => (i === idx ? { ...ev, [field]: value } : ev))
    );
  };
  const updateDraftBoolean = (idx: number, field: keyof TouristEvent, value: boolean) => {
    setEventsDraft((prev) =>
      prev.map((ev, i) => (i === idx ? { ...ev, [field]: value } : ev))
    );
  };

  const addDraftEvent = () => {
    setEventsDraft((prev) => [
      ...prev,
      { name: "", notes: "", startsAt: "", endsAt: "", venue: "", sourceUrl: "", images: [] },
    ]);
  };

  const removeDraftEvent = (idx: number) => {
    setEventsDraft((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveDraftEvents = async () => {
    if (!hotelId) return;
    setEventsBusy(true);
    setEventsMsg(null);
    setEventsStats(null);
    try {
      const cleaned = eventsDraft
        .map((ev) => ({
          poiRefId: String(ev.poiRefId || "").trim() || undefined,
          name: String(ev.name || "").trim(),
          notes: String(ev.notes || "").trim() || undefined,
          startsAt: String(ev.startsAt || "").trim() || undefined,
          endsAt: String(ev.endsAt || "").trim() || undefined,
          venue: String(ev.venue || "").trim() || undefined,
          sourceUrl: String(ev.sourceUrl || "").trim() || undefined,
          priority: Number.isFinite(Number(ev.priority)) ? Number(ev.priority) : undefined,
          hidden: Boolean(ev.hidden),
          images: Array.isArray(ev.images) ? ev.images : [],
        }))
        .filter((ev) => ev.name);
      const res = await fetch("/api/hotels/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId,
          updates: isSystemHotel
            ? { touristEvents: cleaned, eventsRegion: (eventsRegion || "").trim() || undefined }
            : { touristEvents: cleaned },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error guardando eventos locales");
      setEventsPreview(cleaned);
      setEventsDraft(cleaned);
      setEventsMsg(`Eventos locales guardados (${cleaned.length}).`);
    } catch (e: any) {
      setEventsMsg(e?.message || "Error guardando eventos locales");
    } finally {
      setEventsBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        {isSystemHotel
          ? "System opera POI global. Los eventos del hotel aplican a hoteles no-system."
          : "Eventos locales del hotel (`hotel_config.touristEvents`): ABM manual para cualquier hotel."}
      </div>
      {isSystemHotel && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">eventsRegion</label>
          <input
            className="border px-2 py-1 rounded text-xs"
            placeholder="maldonado_uy"
            value={eventsRegion}
            onChange={(e) => setEventsRegion(e.target.value)}
          />
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="border px-3 py-1 rounded text-xs bg-white"
          disabled={eventsBusy}
          onClick={addDraftEvent}
        >
          {isSystemHotel ? "Agregar evento global (system)" : "Agregar evento del hotel"}
        </button>
        <button
          type="button"
          className="border px-3 py-1 rounded text-xs bg-white"
          disabled={eventsBusy}
          onClick={saveDraftEvents}
        >
          {eventsBusy ? "Guardando…" : "Guardar eventos locales"}
        </button>
      </div>
      {eventsDraft.length > 0 ? (
        <div className="space-y-2 border rounded p-3">
          <div className="text-xs font-medium">
            {isSystemHotel ? "ABM eventos globales (system)" : "ABM eventos del hotel"}
          </div>
          {eventsDraft.map((ev, idx) => (
            <div key={idx} className="grid gap-2 border rounded p-2 md:grid-cols-6">
              <input
                className="border rounded px-2 py-1 text-xs md:col-span-2"
                placeholder="Nombre"
                value={ev.name || ""}
                onChange={(e) => updateDraftField(idx, "name", e.target.value)}
              />
              <input
                className="border rounded px-2 py-1 text-xs"
                placeholder="POI Ref ID (_id)"
                value={ev.poiRefId || ""}
                onChange={(e) => updateDraftField(idx, "poiRefId", e.target.value)}
              />
              <input
                className="border rounded px-2 py-1 text-xs"
                type="number"
                placeholder="Prioridad"
                value={ev.priority ?? ""}
                onChange={(e) => updateDraftField(idx, "priority", e.target.value)}
              />
              <input
                className="border rounded px-2 py-1 text-xs"
                placeholder="Inicio (YYYY-MM-DD)"
                value={ev.startsAt || ""}
                onChange={(e) => updateDraftField(idx, "startsAt", e.target.value)}
              />
              <input
                className="border rounded px-2 py-1 text-xs"
                placeholder="Fin (YYYY-MM-DD)"
                value={ev.endsAt || ""}
                onChange={(e) => updateDraftField(idx, "endsAt", e.target.value)}
              />
              <input
                className="border rounded px-2 py-1 text-xs"
                placeholder="Venue"
                value={ev.venue || ""}
                onChange={(e) => updateDraftField(idx, "venue", e.target.value)}
              />
              <button
                type="button"
                className="border rounded px-2 py-1 text-xs"
                onClick={() => removeDraftEvent(idx)}
                disabled={eventsBusy}
              >
                Eliminar
              </button>
              <label className="text-xs flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={Boolean(ev.hidden)}
                  onChange={(e) => updateDraftBoolean(idx, "hidden", e.target.checked)}
                />
                Oculto
              </label>
              <input
                className="border rounded px-2 py-1 text-xs md:col-span-2"
                placeholder="Source URL"
                value={ev.sourceUrl || ""}
                onChange={(e) => updateDraftField(idx, "sourceUrl", e.target.value)}
              />
              <input
                className="border rounded px-2 py-1 text-xs md:col-span-4"
                placeholder="Notas"
                value={ev.notes || ""}
                onChange={(e) => updateDraftField(idx, "notes", e.target.value)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">Sin eventos locales en borrador.</div>
      )}
      <div className="flex items-center gap-3">
        <input
          className="border px-2 py-1 rounded text-xs"
          placeholder="Admin key"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
        />
        <button
          type="button"
          className="border px-3 py-1 rounded text-xs bg-white"
          disabled={eventsBusy || isSystemHotel}
          onClick={() => runEnrich(false)}
        >
          {eventsBusy ? "Enriqueciendo…" : "Enriquecer eventos"}
        </button>
        {isSystemHotel && <span className="text-xs text-muted-foreground">Solo hoteles no-system</span>}
        {eventsMsg && <span className="text-xs">{eventsMsg}</span>}
        {eventsStats?.stats && (
          <span className="text-xs text-gray-600">
            Enrich: {eventsStats.stats.enrichedImages ?? 0} img, {eventsStats.stats.enrichedNotes ?? 0} notes, {eventsStats.stats.skippedImages ?? 0} skip
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="border px-3 py-1 rounded text-xs bg-white"
          disabled={eventsBusy || isSystemHotel}
          onClick={() => runEnrich(true)}
        >
          {eventsBusy ? "Regenerando…" : "Regenerar eventos (limpia y crea)"}
        </button>
        {isSystemHotel && <span className="text-xs text-muted-foreground">Solo hoteles no-system</span>}
      </div>
      {eventsPreview && eventsPreview.length > 0 ? (
        <div className="mt-2 border rounded bg-white/70 dark:bg-zinc-900/40 p-2">
          <div className="text-xs font-medium mb-1">Vista previa (eventos)</div>
          <ul className="text-xs list-disc list-inside space-y-1">
            {eventsPreview.map((ev, i) => {
              const name = ev.name || "Evento";
              const notes = ev.notes ? ` — ${ev.notes}` : "";
              const when = ev.startsAt ? ` — ${ev.startsAt}${ev.endsAt ? ` → ${ev.endsAt}` : ""}` : "";
              const where = ev.venue ? ` — ${ev.venue}` : "";
              const source = ev.sourceUrl ? ` — ${ev.sourceUrl}` : "";
              return (
                <li key={i}>
                  <span className="font-medium">{name}</span>
                  {when}{where}{notes}{source}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">Sin eventos cargados.</div>
      )}
    </div>
  );
}
