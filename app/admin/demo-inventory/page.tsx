"use client";

import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/lib/context/UserContext";

type DemoInventorySnapshot = {
  provider: "inmemory";
  hotelId: string;
  hotelKey: string;
  sharedByHotelId: true;
  totals: {
    totalReservations: number;
    activeReservations: number;
    cancelledReservations: number;
  };
  roomTypes: Array<{
    roomType: string;
    description: string;
    stock: number;
    maxGuests: number;
    activeReservationsCount: number;
    activeReservationIds: string[];
    availableUnitsFromActiveReservations: number;
  }>;
  activeReservations: Array<{
    reservationId: string;
    roomType: string;
    guestName: string;
    checkInDate: string;
    checkOutDate: string;
    status: string;
    updatedAt: string;
  }>;
  cancelledReservations: Array<{
    reservationId: string;
    roomType: string;
    guestName: string;
    checkInDate: string;
    checkOutDate: string;
    status: string;
    updatedAt: string;
  }>;
  searchDebug?: {
    query: {
      startDate: string;
      endDate: string;
      roomType?: string;
      guests?: number;
    };
    returnedOptions: Array<{
      roomType: string;
      description?: string;
      pricePerNight: number;
      currency: string;
      availability: number;
    }>;
    rooms: Array<{
      roomType: string;
      description: string;
      stock: number;
      matchesRoomTypeFilter: boolean;
      matchesGuestCapacity: boolean;
      overlappingReservationsCount: number;
      overlappingReservationIds: string[];
      stayPressure: number;
      computedAvailability: number;
      returnedBySearch: boolean;
    }>;
  };
};

async function loadSnapshot(params: Record<string, string>) {
  const url = new URL("/api/admin/demo-inventory", window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  const res = await fetch(url.toString(), { cache: "no-store" });
  const raw = await res.text();
  let json: any;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`API no devolvió JSON. Status ${res.status}. Body: ${raw.slice(0, 200)}`);
  }
  if (!res.ok || json?.ok === false) {
    throw new Error(String(json?.error || "No se pudo cargar el inventario demo"));
  }
  return json.data as DemoInventorySnapshot;
}

export default function AdminDemoInventoryPage() {
  const { user, loading } = useCurrentUser();
  const [hotelId, setHotelId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [roomType, setRoomType] = useState("");
  const [guests, setGuests] = useState("");
  const [snapshot, setSnapshot] = useState<DemoInventorySnapshot | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.hotelId) return;
    setHotelId((current) => current || user.hotelId);
  }, [user?.hotelId]);

  useEffect(() => {
    if (!hotelId) return;
    setPending(true);
    setError(null);
    loadSnapshot({ hotelId })
      .then(setSnapshot)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setPending(false));
  }, [hotelId]);

  const activeRoomTypes = useMemo(
    () => Array.from(new Set(snapshot?.roomTypes.map((room) => room.roomType) ?? [])),
    [snapshot],
  );

  async function handleInspect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hotelId) return;
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      const data = await loadSnapshot({
        hotelId,
        startDate,
        endDate,
        roomType,
        guests,
      });
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  async function handleReset() {
    if (!hotelId) return;
    setPending(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/demo-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId, action: "reset" }),
      });
      const raw = await res.text();
      let json: any;
      try {
        json = JSON.parse(raw);
      } catch {
        throw new Error(`API no devolvió JSON. Status ${res.status}. Body: ${raw.slice(0, 200)}`);
      }
      if (!res.ok || json?.ok === false) {
        throw new Error(String(json?.error || "No se pudo resetear el inventario demo"));
      }
      setSnapshot(json.data as DemoInventorySnapshot);
      setStatus(`Store demo reseteado para ${hotelId}. Reservas removidas: ${json.result?.clearedReservations ?? 0}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Cargando usuario...</div>;
  }

  if (!user) {
    return <div className="p-8 text-sm text-muted-foreground">No autenticado.</div>;
  }

  return (
    <div className="min-h-screen bg-background px-6 py-8 text-foreground">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="space-y-2">
          <h1 className="text-2xl font-semibold">Demo Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Vista operativa del adapter demo en memoria. Lee y resetea el store real compartido por <code>hotelId</code>.
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Esto no toca Channel Manager real. Solo inspecciona el inventario simulado del entorno demo.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <form onSubmit={handleInspect} className="grid gap-3 border border-border p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <label className="grid min-w-0 gap-1 text-sm">
                <span>Hotel ID</span>
                <input className="h-10 w-full min-w-0 border border-border px-3" value={hotelId} onChange={(e) => setHotelId(e.target.value)} />
              </label>
              <label className="grid min-w-0 gap-1 text-sm">
                <span>Check-in debug</span>
                <input className="h-10 w-full min-w-0 border border-border px-3" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>
              <label className="grid min-w-0 gap-1 text-sm">
                <span>Check-out debug</span>
                <input className="h-10 w-full min-w-0 border border-border px-3" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </label>
              <label className="grid min-w-0 gap-1 text-sm">
                <span>Room type</span>
                <select className="h-10 w-full min-w-0 border border-border px-3" value={roomType} onChange={(e) => setRoomType(e.target.value)}>
                  <option value="">Todos</option>
                  {activeRoomTypes.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="grid min-w-0 gap-1 text-sm">
                <span>Guests</span>
                <input className="h-10 w-full min-w-0 border border-border px-3" inputMode="numeric" value={guests} onChange={(e) => setGuests(e.target.value)} />
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="h-10 border border-border px-4 text-sm" type="submit" disabled={pending || !hotelId}>
                {pending ? "Consultando..." : "Inspeccionar"}
              </button>
              <button className="h-10 border border-red-300 px-4 text-sm text-red-700 dark:border-red-700 dark:text-red-400" type="button" onClick={handleReset} disabled={pending || !hotelId}>
                Reset store demo
              </button>
            </div>
          </form>

          <div className="grid gap-3 border border-border p-4 text-sm">
            <div>Provider: <b>{snapshot?.provider ?? "inmemory"}</b></div>
            <div>Hotel key efectivo: <b>{snapshot?.hotelKey ?? "-"}</b></div>
            <div>Reservas totales en store: <b>{snapshot?.totals.totalReservations ?? 0}</b></div>
            <div>Reservas activas descontando stock: <b>{snapshot?.totals.activeReservations ?? 0}</b></div>
            <div>Reservas canceladas retenidas en memoria: <b>{snapshot?.totals.cancelledReservations ?? 0}</b></div>
          </div>
        </section>

        {error && <section className="border border-red-300 p-3 text-sm text-red-700 dark:border-red-800 dark:text-red-400">{error}</section>}
        {status && <section className="border border-emerald-300 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:text-emerald-400">{status}</section>}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Stock por room type</h2>
          <div className="overflow-x-auto border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2 text-left">Room type</th>
                  <th className="px-3 py-2 text-left">Stock</th>
                  <th className="px-3 py-2 text-left">Max guests</th>
                  <th className="px-3 py-2 text-left">Reservas activas</th>
                  <th className="px-3 py-2 text-left">Unidades libres</th>
                  <th className="px-3 py-2 text-left">Reservation IDs</th>
                </tr>
              </thead>
              <tbody>
                {(snapshot?.roomTypes ?? []).map((room) => (
                  <tr key={room.roomType} className="border-t border-border">
                    <td className="px-3 py-2">{room.roomType}</td>
                    <td className="px-3 py-2">{room.stock}</td>
                    <td className="px-3 py-2">{room.maxGuests}</td>
                    <td className="px-3 py-2">{room.activeReservationsCount}</td>
                    <td className="px-3 py-2">{room.availableUnitsFromActiveReservations}</td>
                    <td className="px-3 py-2">{room.activeReservationIds.join(", ") || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Reservas demo activas</h2>
          <div className="overflow-x-auto border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2 text-left">Reservation ID</th>
                  <th className="px-3 py-2 text-left">Guest</th>
                  <th className="px-3 py-2 text-left">Room type</th>
                  <th className="px-3 py-2 text-left">Check-in</th>
                  <th className="px-3 py-2 text-left">Check-out</th>
                  <th className="px-3 py-2 text-left">Updated</th>
                </tr>
              </thead>
              <tbody>
                {(snapshot?.activeReservations ?? []).map((reservation) => (
                  <tr key={reservation.reservationId} className="border-t border-border">
                    <td className="px-3 py-2">{reservation.reservationId}</td>
                    <td className="px-3 py-2">{reservation.guestName}</td>
                    <td className="px-3 py-2">{reservation.roomType}</td>
                    <td className="px-3 py-2">{reservation.checkInDate}</td>
                    <td className="px-3 py-2">{reservation.checkOutDate}</td>
                    <td className="px-3 py-2">{reservation.updatedAt}</td>
                  </tr>
                ))}
                {!snapshot?.activeReservations.length && (
                  <tr><td className="px-3 py-4 text-muted-foreground" colSpan={6}>No hay reservas demo activas para este hotel.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {snapshot?.searchDebug && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Debug de búsqueda</h2>
            <p className="text-sm text-muted-foreground">
              Query: {snapshot.searchDebug.query.startDate} → {snapshot.searchDebug.query.endDate}
              {snapshot.searchDebug.query.roomType ? ` · roomType=${snapshot.searchDebug.query.roomType}` : ""}
              {snapshot.searchDebug.query.guests ? ` · guests=${snapshot.searchDebug.query.guests}` : ""}
            </p>
            <div className="overflow-x-auto border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left">Room type</th>
                    <th className="px-3 py-2 text-left">Stock</th>
                    <th className="px-3 py-2 text-left">Overlap</th>
                    <th className="px-3 py-2 text-left">Stay pressure</th>
                    <th className="px-3 py-2 text-left">Availability</th>
                    <th className="px-3 py-2 text-left">Filtros</th>
                    <th className="px-3 py-2 text-left">Reservation IDs</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.searchDebug.rooms.map((room) => (
                    <tr key={room.roomType} className="border-t border-border">
                      <td className="px-3 py-2">{room.roomType}</td>
                      <td className="px-3 py-2">{room.stock}</td>
                      <td className="px-3 py-2">{room.overlappingReservationsCount}</td>
                      <td className="px-3 py-2">{room.stayPressure}</td>
                      <td className="px-3 py-2">{room.computedAvailability}</td>
                      <td className="px-3 py-2">
                        {room.matchesRoomTypeFilter ? "room OK" : "room out"} · {room.matchesGuestCapacity ? "capacity OK" : "capacity out"} · {room.returnedBySearch ? "returned" : "filtered"}
                      </td>
                      <td className="px-3 py-2">{room.overlappingReservationIds.join(", ") || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
