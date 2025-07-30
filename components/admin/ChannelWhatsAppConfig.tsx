// Path: /root/begasist/components/admin/ChannelWhatsAppConfig.tsx
"use client";
import { useEffect, useState } from "react";
import { useChannelConfig } from "../../lib/hooks/useChannelConfig";
import { Switch } from "../ui/switch";
import { Loader2, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

// Bloque visual con estado, icono y QR WhatsApp
function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // en segundos
  if (diff < 60) return `hace ${diff} seg`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  return date.toLocaleString();
}

// --- NUEVO: WhatsAppQRWithStatus
function WhatsAppQRWithStatus({ hotelId }: { hotelId: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [qrTime, setQrTime] = useState<string | null>(null); // Guarda timestamp del QR
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stop = false;
    async function fetchQR() {
      setLoading(true);
      const res = await fetch(`/api/whatsapp/qr?hotelId=${hotelId}`);
      if (!stop) {
        if (res.ok) {
          const data = await res.json();
          setQr(data.qr);
          setQrTime(data.ts || new Date().toISOString()); // si backend lo retorna
        } else {
          setQr(null);
          setQrTime(null);
        }
        setLoading(false);
      }
    }
    fetchQR();
    const interval = setInterval(fetchQR, 5000);
    return () => {
      stop = true;
      clearInterval(interval);
    };
  }, [hotelId]);

  // --- Selecciona icono/estado visual
  let icon = null;
  let status = "";
  let statusColor = "";
  if (loading) {
    icon = <Loader2 className="w-5 h-5 animate-spin text-gray-400" />;
    status = "Verificando conexión…";
    statusColor = "text-gray-400";
  } else if (qr) {
    icon = <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-200" />;
    status = "Bot esperando conexión (QR pendiente)";
    statusColor = "text-yellow-600 dark:text-yellow-200";
  } else {
    icon = <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-200" />;
    status = "Bot conectado ✅";
    statusColor = "text-green-600 dark:text-green-200";
  }

  return (
    <div className="flex flex-col items-center gap-3 mt-8">
      <div className="flex items-center gap-2">
        {icon}
        <span className={`font-bold text-base ${statusColor}`}>{status}</span>
      </div>
      {/* Si hay QR, mostrar bloque QR y hora */}
      {qr && (
        <div className="p-4 flex flex-col items-center gap-2">
          <span className="font-semibold mb-2 text-lg">Escaneá este QR con WhatsApp:</span>
          <pre className="bg-black text-green-400 text-xs rounded p-4">{qr}</pre>
          {qrTime && (
            <span className="text-xs text-gray-400">
              Código generado {formatRelativeTime(qrTime)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function ChannelWhatsAppConfig({ hotelId }: { hotelId: string }) {
  const { config, loading, error, fetchConfig, saveConfig } = useChannelConfig(hotelId, "whatsapp");
  const [celNumber, setCelNumber] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<"automatic" | "supervised">("supervised");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);
  useEffect(() => {
    if (config) {
      setCelNumber(config.celNumber ?? "");
      setEnabled(config.enabled ?? true);
      setMode(config.mode ?? "supervised");
    }
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    await saveConfig({ celNumber, enabled, mode });
    setSaving(false);
  };

  return (
    <div className="p-4 bg-muted rounded-lg border max-w-md space-y-4">
      <h2 className="font-bold text-xl mb-2">Configurar WhatsApp</h2>
      {error && <div className="text-red-600">{error}</div>}
      {loading && <div className="text-gray-500">Cargando...</div>}
      <div className="flex flex-col gap-3">
        <label>
          <span className="block text-sm">Celular (número internacional):</span>
          <input
            type="text"
            value={celNumber}
            onChange={e => setCelNumber(e.target.value)}
            className="border rounded p-2 w-full mt-1"
            disabled={saving}
            placeholder="+598xxxxxxxx"
          />
        </label>
        <label className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <span>Canal habilitado</span>
        </label>
        <label className="flex items-center gap-2">
          <Switch checked={mode === "supervised"} onCheckedChange={v => setMode(v ? "supervised" : "automatic")} />
          <span>Modo supervisado</span>
        </label>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-900 font-semibold mt-2"
          disabled={saving}
        >
          {saving ? "Guardando..." : "Guardar configuración"}
        </button>
      </div>
      {/* Estado de conexión + QR */}
      {enabled && celNumber && (
        <WhatsAppQRWithStatus hotelId={hotelId} />
      )}
    </div>
  );
}
