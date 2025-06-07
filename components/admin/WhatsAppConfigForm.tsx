// /components/admin/WhatsAppConfigForm.tsx
"use client";
import { useState } from "react";

type Props = {
  hotelId: string;
  initial?: { celNumber?: string; apiKey?: string };
  onClose: () => void;
  onSaved?: () => void;
};

export default function WhatsAppConfigForm({ hotelId, initial, onClose, onSaved }: Props) {
  const [celNumber, setCelNumber] = useState(initial?.celNumber || "");
  const [apiKey, setApiKey] = useState(initial?.apiKey || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/config/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId, celNumber, apiKey }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Error guardando configuración");
      } else {
        onSaved?.();
        onClose();
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-background rounded-lg p-6 max-w-md w-full relative">
        <button className="absolute top-2 right-2 text-lg" onClick={onClose}>×</button>
        <h2 className="text-xl font-bold mb-2">Configurar WhatsApp</h2>
        <form className="flex flex-col gap-3" onSubmit={handleSave}>
          <label>
            Número de WhatsApp
            <input
              className="block w-full mt-1 p-2 border rounded"
              value={celNumber}
              onChange={e => setCelNumber(e.target.value)}
              required
              placeholder="+598..."
            />
          </label>
          <label>
            API Key (opcional)
            <input
              className="block w-full mt-1 p-2 border rounded"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="API key del proveedor"
            />
          </label>
          {error && <div className="text-red-600">{error}</div>}
          <button type="submit" disabled={loading} className="bg-blue-600 text-white rounded px-4 py-2">
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </form>
      </div>
    </div>
  );
}
