"use client";

import { useMemo, useState, useEffect } from "react";
import { useCurrentUser } from "@/lib/context/UserContext";

type POIEvent = {
  _id: string;
  name: string;
  description?: string;
  startsAt?: string;
  location?: {
    locality?: string;
    name?: string;
    address?: string;
  };
  sourceUrl?: string;
};

type RowStatus = {
  loading: boolean;
  message?: string;
  ok?: boolean;
};

function todayIsoDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function plusDaysIsoDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function PoiEventsPanel() {
  const { user, loading: userLoading } = useCurrentUser();
  const [from, setFrom] = useState<string>(() => todayIsoDate());
  const [to, setTo] = useState<string>(() => plusDaysIsoDate(7));
  const [city, setCity] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [adminKey, setAdminKey] = useState<string>("");
  const [events, setEvents] = useState<POIEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rowStatus, setRowStatus] = useState<Record<string, RowStatus>>({});
  const [localityById, setLocalityById] = useState<Record<string, string>>({});

  const hotelId = user?.hotelId || "";
  const isSystemHotel = hotelId === "system";

  useEffect(() => {
    if (!isSystemHotel) return;
    try {
      const saved = localStorage.getItem("bg_admin_key");
      if (saved) setAdminKey(saved);
    } catch {}
  }, [isSystemHotel]);

  useEffect(() => {
    if (!isSystemHotel) return;
    try {
      localStorage.setItem("bg_admin_key", adminKey);
    } catch {}
  }, [adminKey, isSystemHotel]);

  const localityFor = useMemo(() => {
    const map: Record<string, string> = {};
    for (const e of events) {
      map[e._id] = localityById[e._id] ?? (e.location?.locality || "");
    }
    return map;
  }, [events, localityById]);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setEvents([]);
    try {
      if (!adminKey.trim()) {
        throw new Error("Admin key requerida");
      }
      const params = new URLSearchParams();
      params.set("from", from);
      params.set("to", to);
      if (city.trim()) params.set("city", city.trim());
      if (region.trim()) params.set("region", region.trim());
      const res = await fetch(`/api/poi/events?${params.toString()}`, {
        headers: {
          "x-hotel-id": hotelId,
          "x-admin-key": adminKey.trim(),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error al buscar eventos");
      const list = Array.isArray(data?.events) ? data.events : Array.isArray(data) ? data : [];
      setEvents(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshPoi = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!adminKey.trim()) {
        throw new Error("Admin key requerida");
      }
      const res = await fetch("/api/poi/refresh", {
        method: "POST",
        headers: {
          "x-hotel-id": hotelId,
          "x-admin-key": adminKey.trim(),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error refrescando POI");
      await handleSearch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setLoading(false);
    }
  };

  const updateLocality = async (id: string, locality: string, mode: "save" | "propagate") => {
    if (!adminKey) {
      setRowStatus((prev) => ({
        ...prev,
        [id]: { loading: false, ok: false, message: "Admin key requerida" },
      }));
      return;
    }
    setRowStatus((prev) => ({ ...prev, [id]: { loading: true } }));
    try {
      const url =
        mode === "save" ? "/api/admin/poi/event" : "/api/admin/poi/propagate-locality";
      const res = await fetch(url, {
        method: mode === "save" ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
          "x-hotel-id": hotelId,
        },
        body: JSON.stringify({ id, locality }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Error al actualizar");
      }
      setRowStatus((prev) => ({
        ...prev,
        [id]: { loading: false, ok: true, message: "OK" },
      }));
    } catch (err) {
      setRowStatus((prev) => ({
        ...prev,
        [id]: { loading: false, ok: false, message: err instanceof Error ? err.message : "Error" },
      }));
    }
  };

  if (userLoading) {
    return <div className="text-sm text-muted-foreground">Cargando sesión...</div>;
  }

  if (!user || !isSystemHotel) {
    return (
      <div className="text-sm text-muted-foreground">
        Solo disponible para el hotel `system`.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Eventos (POI – system)</h2>
        <div className="text-xs text-muted-foreground">
          POI global por región. Solo disponible para el hotel `system`.
        </div>
      </div>

      <div className="space-y-3 border rounded p-4">
        <div className="text-sm text-muted-foreground">hotelId: {hotelId}</div>
        <div className="grid gap-3 md:grid-cols-5">
          <label className="flex flex-col gap-1">
            <span className="text-sm">From</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">To</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">City (opcional)</span>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="border rounded px-2 py-1"
              placeholder="Punta del Este"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Region (opcional)</span>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="border rounded px-2 py-1"
              placeholder="maldonado_uy"
            />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-sm">Admin key</span>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              className="border rounded px-2 py-1"
              placeholder="ADMIN_API_KEY"
            />
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="border rounded px-3 py-1 text-sm"
          >
            {loading ? "Buscando..." : "Buscar"}
          </button>
          <button
            onClick={handleRefreshPoi}
            disabled={loading}
            className="border rounded px-3 py-1 text-sm"
          >
            {loading ? "Refrescando..." : "Refresh POI"}
          </button>
        </div>
        {error ? <div className="text-sm text-red-600">{error}</div> : null}
      </div>

      <div className="space-y-3">
        {events.length === 0 ? (
          <div className="text-sm text-muted-foreground">Sin resultados</div>
        ) : (
          events.map((e) => {
            const status = rowStatus[e._id];
            const busy = !!status?.loading;
            return (
              <div key={e._id} className="border rounded p-4 space-y-2">
                <div className="text-sm text-muted-foreground">_id: {e._id}</div>
                <div className="font-semibold">{e.name}</div>
                {e.description ? (
                  <div className="text-sm text-muted-foreground">{e.description}</div>
                ) : null}
                <div className="text-sm">startsAt: {e.startsAt || "-"}</div>
                <div className="text-sm">
                  lugar: {e.location?.name || e.location?.address || "-"}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-sm">locality:</label>
                  <input
                    type="text"
                    value={localityFor[e._id] || ""}
                    onChange={(ev) =>
                      setLocalityById((prev) => ({ ...prev, [e._id]: ev.target.value }))
                    }
                    className="border rounded px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => updateLocality(e._id, localityFor[e._id] || "", "save")}
                    disabled={busy}
                    className="border rounded px-3 py-1 text-sm"
                  >
                    {busy ? "Guardando..." : "Guardar locality"}
                  </button>
                  <button
                    onClick={() => updateLocality(e._id, localityFor[e._id] || "", "propagate")}
                    disabled={busy}
                    className="border rounded px-3 py-1 text-sm"
                  >
                    {busy ? "Propagando..." : "Propagar locality"}
                  </button>
                  {status?.message ? (
                    <span className={status.ok ? "text-green-600 text-sm" : "text-red-600 text-sm"}>
                      {status.message}
                    </span>
                  ) : null}
                </div>
                {e.sourceUrl ? (
                  <a
                    href={e.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm underline"
                  >
                    {e.sourceUrl}
                  </a>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
