// Path: /root/begasist/app/admin/hotels/page.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Hotel, Loader, PlusCircle, Pencil, Trash2 } from "lucide-react";
import type { HotelConfig, Channel } from "@/types/channel";
import { getChannelIcon } from "@/lib/utils/getChannelIcon";

export default function HotelsAdminPage() {
  const [hotels, setHotels] = useState<HotelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Cargar hoteles (puede ser llamado después de borrar)
  const fetchHotels = () => {
    setLoading(true);
    fetch("/api/hotels/list")
      .then((res) => {
        if (!res.ok) throw new Error("Error al obtener hoteles");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setHotels(data);
        } else if (Array.isArray(data.hotels)) {
          setHotels(data.hotels);
        } else {
          setHotels([]);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHotels();
  }, []);

  // Borrar hotel con confirmación
  async function handleDelete(hotelId: string) {
    if (!window.confirm("¿Seguro que deseas borrar este hotel?")) return;
    setDeletingId(hotelId);
    try {
      const res = await fetch(`/api/hotels/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId }),
      });
      if (!res.ok) throw new Error("Error al borrar hotel");
      fetchHotels(); // refresca la lista
    } catch (err) {
      alert("No se pudo borrar el hotel.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-10 px-4">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Hotel className="w-7 h-7" />
          Hoteles registrados
        </h1>

        <div className="flex items-center mb-4 gap-3">
          <Link href="/admin/hotels/new">
            <Button className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              Agregar hotel
            </Button>
          </Link>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader className="animate-spin w-5 h-5" />
            Cargando hoteles...
          </div>
        )}

        {error && (
          <div className="text-red-500 font-medium">{error}</div>
        )}

        {!loading && !error && hotels.length === 0 && (
          <div className="text-muted-foreground">No hay hoteles registrados aún.</div>
        )}

        {!loading && !error && hotels.length > 0 && (
          <div className="bg-muted border border-border rounded-lg shadow p-4">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2">ID</th>
                  <th className="text-left py-2">Nombre</th>
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Canales activos</th>
                  <th className="text-left py-2">País</th>
                  <th className="text-left py-2">Fecha alta</th>
                  <th className="text-left py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {hotels.map((hotel) => (
                  <tr key={hotel.hotelId} className="border-t border-border">
                    <td className="py-2 font-mono">{hotel.hotelId}</td>
                    <td className="py-2">{hotel.hotelName}</td>
                    <td className="py-2">{hotel.users?.[0]?.email ?? "-"}</td>
                    <td className="py-2 flex flex-wrap items-center gap-2">
                      {hotel.channelConfigs &&
                        Object.entries(hotel.channelConfigs)
                          .filter(([_, cfg]) => cfg?.enabled)
                          .map(([channel]) => (
                            <span title={channel} key={channel}>
                              {getChannelIcon(channel as Channel, 18)}
                            </span>
                          ))}
                    </td>
                    <td className="py-2">{hotel.country ?? "-"}</td>
                    <td className="py-2">
                      {hotel.lastUpdated ? new Date(hotel.lastUpdated).toLocaleDateString() : "-"}
                    </td>
                    <td className="py-2 flex gap-2">
                      <Link href={`/admin/hotels/${hotel.hotelId}/edit`}>
                        <Button size="sm" variant="outline">
                          <Pencil className="w-4 h-4 mr-1" /> Editar
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deletingId === hotel.hotelId}
                        onClick={() => handleDelete(hotel.hotelId)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        {deletingId === hotel.hotelId ? "Borrando..." : "Borrar"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
