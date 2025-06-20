
// /components/admin/ChunkDetailsTable.tsx
"use client";
import * as React from "react";
import { useEffect, useState } from "react";

function truncate(text: string, max = 80) {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export function ChunkDetailsTable({ hotelId, originalName, version }: { hotelId: string, originalName: string, version: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/hotel-document-details?hotelId=${encodeURIComponent(hotelId)}&originalName=${encodeURIComponent(originalName)}&version=${encodeURIComponent(version)}`)
      .then(res => res.json())
      .then(data => setRows(data.details || []))
      .finally(() => setLoading(false));
  }, [hotelId, originalName, version]);

  if (loading) return <div className="text-xs text-muted-foreground">Cargando detalles…</div>;
  if (!rows.length) return <div className="text-xs text-muted-foreground">Sin chunks para este documento.</div>;

  return (
    <table className="table-auto w-full text-xs mt-2 border">
      <thead>
        <tr className="bg-muted">
          <th className="px-2 py-1 border">Categoría</th>
          <th className="px-2 py-1 border">PromptKey</th>
          <th className="px-2 py-1 border">Resumen</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b">
            <td className="px-2 py-1 border">{r.category || "-"}</td>
            <td className="px-2 py-1 border">{r.promptKey || "-"}</td>
            <td className="px-2 py-1 border">{truncate(r.text)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
