// /components/admin/ShowOriginalText.tsx
"use client";
import { useState } from "react";
import { Button } from "../../components/ui/button";

type Props = {
  hotelId: string;
  originalName: string;
  version: string;
};

export default function ShowOriginalText({ hotelId, originalName, version }: Props) {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    setOpen(true);
    setLoading(true);
    setTexto(null);
    try {
      const res = await fetch(
        `/api/hotel-texts-rebuild?hotelId=${encodeURIComponent(hotelId)}&originalName=${encodeURIComponent(originalName)}&version=${encodeURIComponent(version)}`
      );
      if (res.ok) {
        const txt = await res.text();
        setTexto(txt);
      } else {
        setTexto("❌ No se pudo recuperar el texto original.");
      }
    } catch {
      setTexto("❌ Error de red al recuperar el texto original.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" className="ml-2" onClick={handleOpen}>
        Ver texto original
      </Button>
      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-background text-foreground max-w-2xl w-full p-6 rounded shadow-lg relative">
            <button
              className="absolute top-2 right-3 text-lg"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
            >
              ×
            </button>
            <h3 className="text-lg font-semibold mb-4">Texto original reconstruido</h3>
            <div className="overflow-auto max-h-96 whitespace-pre-wrap border p-3 rounded bg-muted text-xs">
              {loading
                ? "Cargando…"
                : texto ?? "Sin datos."}
            </div>
            {texto && (
              <a
                href={`data:text/plain;charset=utf-8,${encodeURIComponent(texto)}`}
                download={`${originalName.replace(/\.[^/.]+$/, "")}-v${version}-original.txt`}
                className="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
              >
                Descargar TXT
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
