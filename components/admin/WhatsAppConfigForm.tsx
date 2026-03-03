// /components/admin/WhatsAppConfigForm.tsx
"use client";
import React from "react";
import { useState } from "react";

type Props = {
  hotelId: string;
  initial?: {
    celNumber?: string;
    apiKey?: string;
    provider?: "legacy" | "twilio";
    twilioAccountSid?: string;
    twilioAuthToken?: string;
    twilioWhatsAppNumber?: string;
    twilioFrom?: string;
  };
  onClose: () => void;
  onSaved?: () => void;
};

export default function WhatsAppConfigForm({ hotelId, initial, onClose, onSaved }: Props) {
  const [celNumber, setCelNumber] = useState(initial?.celNumber || "");
  const [apiKey, setApiKey] = useState(initial?.apiKey || "");
  const [provider, setProvider] = useState<"legacy" | "twilio">(initial?.provider || "legacy");
  const [twilioAccountSid, setTwilioAccountSid] = useState(initial?.twilioAccountSid || "");
  const [twilioAuthToken, setTwilioAuthToken] = useState(initial?.twilioAuthToken || "");
  const [twilioWhatsAppNumber, setTwilioWhatsAppNumber] = useState(initial?.twilioWhatsAppNumber || initial?.twilioFrom || "");
  const [showTwilioToken, setShowTwilioToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (provider === "twilio" && twilioWhatsAppNumber && !/^\+\d{8,15}$/.test(twilioWhatsAppNumber.trim())) {
        setError("Twilio WhatsApp Number debe estar en formato E.164 (ej: +15558847361).");
        return;
      }
      if (provider === "twilio" && !twilioWhatsAppNumber.trim()) {
        setError("Twilio WhatsApp Sender (FROM) es obligatorio.");
        return;
      }
      if (provider === "twilio" && !twilioAccountSid.trim()) {
        setError("Twilio Account SID es obligatorio.");
        return;
      }
      if (provider === "twilio" && !twilioAuthToken.trim()) {
        setError("Twilio Auth Token es obligatorio.");
        return;
      }
      const res = await fetch("/api/config/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId,
          celNumber,
          apiKey,
          provider,
          twilioAccountSid,
          twilioAuthToken,
          twilioWhatsAppNumber,
        }),
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
            Proveedor
            <select
              className="block w-full mt-1 p-2 border rounded"
              value={provider}
              onChange={(e) => setProvider(e.target.value as "legacy" | "twilio")}
            >
              <option value="legacy">legacy</option>
              <option value="twilio">twilio</option>
            </select>
            <span className="text-xs text-muted-foreground">
              legacy = integración antigua / twilio = WhatsApp Oficial (Twilio)
            </span>
          </label>
          {provider === "twilio" && (
            <>
              <label>
                Twilio WhatsApp Sender (FROM)
                <input
                  className="block w-full mt-1 p-2 border rounded"
                  value={twilioWhatsAppNumber}
                  onChange={e => setTwilioWhatsAppNumber(e.target.value)}
                  placeholder="+15558847361"
                />
                <span className="text-xs text-muted-foreground block">
                  Número registrado como WhatsApp Sender en Twilio (formato E.164 con +).
                </span>
                <span className="text-xs text-amber-700 block">
                  Este NO es tu número personal. Es el sender oficial.
                </span>
              </label>
              <label>
                Twilio Account SID
                <input
                  className="block w-full mt-1 p-2 border rounded"
                  value={twilioAccountSid}
                  onChange={e => setTwilioAccountSid(e.target.value)}
                  placeholder="AC..."
                />
                <span className="text-xs text-muted-foreground block">
                  Credencial LIVE en Twilio → API keys & tokens → Auth tokens (Live credentials).
                </span>
              </label>
              <label>
                Twilio Auth Token
                <div className="flex gap-2">
                  <input
                    className="block w-full mt-1 p-2 border rounded"
                    type={showTwilioToken ? "text" : "password"}
                    value={twilioAuthToken}
                    onChange={e => setTwilioAuthToken(e.target.value)}
                    placeholder="Auth Token"
                  />
                  <button
                    type="button"
                    className="mt-1 px-3 py-2 border rounded text-sm"
                    onClick={() => setShowTwilioToken(v => !v)}
                  >
                    {showTwilioToken ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <span className="text-xs text-muted-foreground block">
                  Usar LIVE Auth Token (no Test).
                </span>
              </label>
              <details>
                <summary className="cursor-pointer text-sm font-medium">Legacy (opcional)</summary>
                <div className="mt-2 flex flex-col gap-3 border rounded p-2">
                  <p className="text-xs text-muted-foreground">
                    No se usa para Twilio. Solo histórico/compatibilidad.
                  </p>
                  <label>
                    Número (legacy)
                    <input
                      className="block w-full mt-1 p-2 border rounded"
                      value={celNumber}
                      onChange={e => setCelNumber(e.target.value)}
                      placeholder="+598..."
                    />
                  </label>
                  <label>
                    API key (legacy)
                    <input
                      className="block w-full mt-1 p-2 border rounded"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      placeholder="API key del proveedor"
                    />
                  </label>
                </div>
              </details>
            </>
          )}
          {provider === "legacy" && (
            <>
              <label>
                Número (legacy)
                <input
                  className="block w-full mt-1 p-2 border rounded"
                  value={celNumber}
                  onChange={e => setCelNumber(e.target.value)}
                  required
                  placeholder="+598..."
                />
              </label>
              <label>
                API key (legacy)
                <input
                  className="block w-full mt-1 p-2 border rounded"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="API key del proveedor"
                />
              </label>
            </>
          )}
          {error && <div className="text-red-600">{error}</div>}
          <button type="submit" disabled={loading} className="bg-blue-600 text-white rounded px-4 py-2">
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </form>
      </div>
    </div>
  );
}
