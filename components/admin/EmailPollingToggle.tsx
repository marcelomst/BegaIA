"use client";

import { useState, useEffect } from "react";

interface EmailPollingToggleProps {
  hotelId: string;
}

export default function EmailPollingToggle({ hotelId }: EmailPollingToggleProps) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  console.log("🏨 hotelId en EmailPollingToggle:", hotelId);

  if (!hotelId) return null;
  useEffect(() => {
    fetch(`/api/email/polling?hotelId=${hotelId}`)
      .then((res) => res.json())
      .then((data) => {
        setEnabled(data.enabled);
        setLoading(false);
      })
      .catch((err) => {
        console.error("⛔ Error consultando polling de email:", err);
        setLoading(false);
      });
  }, [hotelId]);

  const togglePolling = async () => {
    if (enabled === null) return;
    const newState = !enabled;
    setEnabled(newState);

    try {
      const res = await fetch("/api/email/polling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId, enabled: newState }),
      });

      const json = await res.json();
      if (!json.success) {
        console.warn("⚠️ No se pudo actualizar el estado de polling", json);
        setEnabled(!newState); // revertir visualmente
      }
    } catch (err) {
      console.error("⛔ Error cambiando estado de polling", err);
      setEnabled(!newState); // revertir visualmente
    }
  };

  if (loading || enabled === null) {
    return (
      <button
        className="px-3 py-1 text-sm rounded font-medium bg-muted text-muted-foreground cursor-not-allowed"
        disabled
      >
        Cargando polling...
      </button>
    );
  }

  return (
    <button
      onClick={togglePolling}
      className={`px-3 py-1 text-sm rounded font-medium transition-colors ${
        enabled ? "bg-green-200 text-green-900 hover:bg-green-300" : "bg-red-200 text-red-900 hover:bg-red-300"
      }`}
    >
      Polling: {enabled ? "Activo" : "Inactivo"}
    </button>
  );
}
