// Path: /root/begasist/app/admin/hotels/[hotelId]/widget/page.tsx

"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy, Check, Eye, EyeOff } from "lucide-react";

type Position = "bottom-right" | "bottom-left";
type Lang = "es" | "en" | "pt";

export default function HotelWidgetSnippetPage() {
  const params = useParams();
  const hotelId = (params?.hotelId as string) || "hotel999";

  // Defaults
  const [apiBase, setApiBase] = useState<string>("");
  const [lang, setLang] = useState<Lang>("es");
  const [position, setPosition] = useState<Position>("bottom-right");
  const [primary, setPrimary] = useState<string>("#0ea5e9");
  const [requireName, setRequireName] = useState<boolean>(false);
  const [copied, setCopied] = useState<"snippet" | "html" | null>(null);
  const [preview, setPreview] = useState<boolean>(false);

  // apiBase por defecto = origen actual
  useEffect(() => {
    if (typeof window !== "undefined" && !apiBase) {
      setApiBase(window.location.origin);
    }
  }, [apiBase]);

  const snippet = useMemo(() => {
    const cfg = {
      hotelId,
      apiBase,
      lang,
      position,
      theme: { primary },
      requireName,
    };
    return [
      "<!-- Begasist Chat Widget -->",
      "<script>",
      `  window.BegasistChat = ${JSON.stringify(cfg, null, 2)};`,
      "</script>",
      // Ajustá el path si tu build sirve el widget en otra ruta
      `<script async src="${apiBase}/widget/begasist-chat.js"></script>`,
      "<!-- /Begasist Chat Widget -->",
    ].join("\n");
  }, [hotelId, apiBase, lang, position, primary, requireName]);

  const fullHtmlExample = useMemo(() => {
    return `<!DOCTYPE html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <title>Integración Begasist Chat</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <main>
      <h1>Mi sitio del hotel</h1>
      <p>Debajo está incluido el widget de Begasist.</p>
    </main>

    ${snippet}
  </body>
</html>`;
  }, [snippet, lang]);

  async function copy(text: string, kind: "snippet" | "html") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1200);
    }
  }

  // PREVIEW local: inyectar el widget real en esta página
  useEffect(() => {
    if (!preview) return;
    (window as any).BegasistChat = {
      hotelId,
      apiBase,
      lang,
      position,
      theme: { primary },
      requireName,
    };
    const id = "begasist-preview-script";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id;
      s.async = true;
      s.src = `${apiBase}/widget/begasist-chat.js`;
      document.body.appendChild(s);
    }
  }, [preview, hotelId, apiBase, lang, position, primary, requireName]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Widget del hotel</h1>
          <p className="text-sm text-muted-foreground">
            Generá el snippet para pegar en la web del hotel. Hotel ID:{" "}
            <span className="font-mono">{hotelId}</span>
          </p>
        </div>
        <Button
          variant={preview ? "secondary" : "default"}
          onClick={() => setPreview((p) => !p)}
          title={preview ? "Ocultar preview" : "Ver preview aquí"}
        >
          {preview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
          {preview ? "Ocultar preview" : "Ver preview"}
        </Button>
      </header>

      {/* Configurador */}
      <section className="grid gap-4 md:grid-cols-2 bg-muted/30 p-4 rounded-lg border border-border">
        <div className="space-y-2">
          <label className="text-sm font-medium">API Base</label>
          <input
            className="w-full px-3 py-2 rounded border bg-background"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            placeholder="https://portal.begai.example"
          />
          <p className="text-xs text-muted-foreground">
            Dominio que sirve <code>/widget/begasist-chat.js</code>. Por defecto, este mismo origen.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Idioma</label>
          <select
            className="w-full px-3 py-2 rounded border bg-background"
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
          >
            <option value="es">Español</option>
            <option value="en">Inglés</option>
            <option value="pt">Portugués</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Preferencia inicial (el widget luego la persiste en <code>localStorage</code>).
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Posición</label>
          <select
            className="w-full px-3 py-2 rounded border bg-background"
            value={position}
            onChange={(e) => setPosition(e.target.value as Position)}
          >
            <option value="bottom-right">Abajo a la derecha</option>
            <option value="bottom-left">Abajo a la izquierda</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Color primario</label>
          <div className="flex items-center gap-2">
            <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} />
            <input
              className="flex-1 px-3 py-2 rounded border bg-background"
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
            />
          </div>
        </div>

        <div className="col-span-full flex items-center gap-2">
          <input
            id="requireName"
            type="checkbox"
            checked={requireName}
            onChange={(e) => setRequireName(e.target.checked)}
          />
          <label htmlFor="requireName" className="text-sm">
            Solicitar nombre antes del primer mensaje
          </label>
        </div>
      </section>

      {/* Snippet para copiar */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Snippet para pegar</h2>
          <Button onClick={() => copy(snippet, "snippet")}>
            {copied === "snippet" ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied === "snippet" ? "Copiado" : "Copiar"}
          </Button>
        </div>
        <pre className="p-3 bg-muted/40 border border-border rounded overflow-auto text-xs">
{snippet}
        </pre>
      </section>

      {/* HTML completo de ejemplo */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">HTML completo (ejemplo)</h2>
          <Button variant="outline" onClick={() => copy(fullHtmlExample, "html")}>
            {copied === "html" ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied === "html" ? "Copiado" : "Copiar ejemplo"}
          </Button>
        </div>
        <pre className="p-3 bg-muted/40 border border-border rounded overflow-auto text-xs">
{fullHtmlExample}
        </pre>
      </section>
    </div>
  );
}
