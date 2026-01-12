"use client";
import React, { useState } from "react";

export default function KbGeneratorControls() {
  const [hotelId, setHotelId] = useState<string>("hotel999");
  const [autoEnrich, setAutoEnrich] = useState<boolean>(true);
  const [busy, setBusy] = useState<"preview" | "upload" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string,string> | null>(null);

  async function preview() {
    setMsg(null); setBusy("preview"); setFiles(null);
    try {
      const res = await fetch('/api/kb/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId, autoEnrich, upload: false })
      });
      const text = await res.text();
      let j: any = null;
      try { j = JSON.parse(text); } catch { throw new Error(text || 'Respuesta no JSON'); }
      if (!res.ok || j.error) throw new Error(j.error || 'Error en vista previa');
      setFiles(j.files || {});
      setMsg(`Vista previa generada (${j.count} archivos).`);
    } catch (e: any) {
      setMsg(e?.message || 'Error');
    } finally {
      setBusy(null);
    }
  }

  async function upload() {
    setMsg(null); setBusy("upload");
    try {
      const res = await fetch('/api/kb/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hotelId, autoEnrich, upload: true })
      });
      const j = await res.json();
      if (!res.ok || j.error) throw new Error(j.error || 'Error generando KB');
      setMsg(`KB generada y subida (${j.uploaded} documentos).`);
    } catch (e: any) {
      setMsg(e?.message || 'Error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Generar KB desde configuración</h2>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">Hotel ID</label>
        <input className="border rounded px-2 py-1 text-sm" value={hotelId} onChange={e => setHotelId(e.target.value)} placeholder="hotel999" />
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={autoEnrich} onChange={e => setAutoEnrich(e.target.checked)} />
          Auto-enriquecer con IA
        </label>
        <button type="button" className="px-3 py-1 rounded border bg-white text-sm disabled:opacity-50" disabled={busy === 'preview'} onClick={preview}>
          {busy === 'preview' ? 'Generando…' : 'Vista previa (sin subir)'}
        </button>
        <button type="button" className="px-3 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-50" disabled={busy === 'upload'} onClick={upload}>
          {busy === 'upload' ? 'Subiendo…' : 'Generar y subir KB'}
        </button>
        {msg && <span className="text-sm">{msg}</span>}
      </div>
      {files && (
        <div className="border rounded p-2 bg-white/70 dark:bg-zinc-900/40">
          <details open>
            <summary className="cursor-pointer select-none">Archivos generados ({Object.keys(files).length})</summary>
            <div className="mt-2 space-y-2">
              {Object.entries(files).map(([name, body]) => (
                <details key={name} className="border rounded p-2 bg-white/60 dark:bg-zinc-900/30">
                  <summary className="cursor-pointer select-none text-sm">{name}</summary>
                  <pre className="mt-2 text-xs whitespace-pre-wrap">{body as string}</pre>
                </details>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
