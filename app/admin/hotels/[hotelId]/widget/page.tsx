// Path: /root/begasist/app/admin/hotels/[hotelId]/widget/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

export default function WidgetSnippetPage() {
  const params = useParams();
  const hotelId =
    (Array.isArray(params?.hotelId) ? params?.hotelId[0] : (params?.hotelId as string)) ||
    "hotel999";

  const [apiBase, setApiBase] = useState("");
  const [position, setPosition] = useState<"bottom-right" | "bottom-left">("bottom-right");
  const [primary, setPrimary] = useState("#0ea5e9");
  const [langs, setLangs] = useState<string>("es,en,pt");

  useEffect(() => {
    // Detectar base automáticamente (mismo origen por defecto)
    setApiBase(window.location.origin);
  }, []);

  const snippet = useMemo(() => {
    const safeLangs = langs
      .split(",")
      .map((l) => l.trim().toLowerCase().slice(0, 2))
      .filter(Boolean);
    const langList = safeLangs.length ? safeLangs : ["es", "en", "pt"];

    const base = apiBase.replace(/\/+$/, "");

    return [
      `<!-- BegAI Web Widget -->`,
      `<script>`,
      `  window.BegAIChat = {`,
      `    hotelId: "${hotelId}",`,
      `    apiBase: "${base}",`,
      `    lang: "${langList[0] || "es"}",`,
      `    position: "${position}",`,
      `    theme: { primary: "${primary}" },`,
      `    languages: ${JSON.stringify(langList)}`,
      `  };`,
      `</script>`,
      `<script defer src="${base}/widget/begai-chat.js"></script>`,
    ].join("\n");
  }, [apiBase, hotelId, position, primary, langs]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      alert("Snippet copiado.");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = snippet;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      alert("Snippet copiado.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">🔧 Generador de Snippet — BegAI</h1>

      <div className="grid md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-500">Hotel ID</span>
          <input className="border rounded p-2" value={hotelId} disabled />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-500">API Base</span>
          <input
            className="border rounded p-2"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value.replace(/\/+$/, ""))}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-500">Posición</span>
          <select
            className="border rounded p-2"
            value={position}
            onChange={(e) => setPosition(e.target.value as any)}
          >
            <option value="bottom-right">bottom-right</option>
            <option value="bottom-left">bottom-left</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-500">Color primario</span>
          <input
            className="border rounded p-1 h-10"
            type="color"
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
            aria-label="Seleccionar color primario del widget"
            title={primary}
          />
        </label>

        <label className="md:col-span-2 flex flex-col gap-1">
          <span className="text-sm text-gray-500">Idiomas (separados por coma)</span>
          <input
            className="border rounded p-2"
            placeholder="es,en,pt"
            value={langs}
            onChange={(e) => setLangs(e.target.value)}
          />
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Snippet</h2>
          <button
            onClick={copy}
            className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Copiar
          </button>
        </div>
        <pre className="bg-black text-green-200 p-3 rounded overflow-auto text-sm">
{snippet}
        </pre>
      </div>
    </div>
  );
}
