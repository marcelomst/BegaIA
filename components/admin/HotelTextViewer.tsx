// /root/begasist/components/admin/HotelTextViewer.tsx

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function HotelTextViewer({ hotelId, originalName, version }: { hotelId: string, originalName: string, version: string }) {
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!show) return;
    setLoading(true);
    fetch(`/api/hotel-texts?hotelId=${encodeURIComponent(hotelId)}&originalName=${encodeURIComponent(originalName)}&version=${encodeURIComponent(version)}`)
      .then(res => res.json())
      .then(data => setText(data.doc?.textContent || ""))
      .finally(() => setLoading(false));
  }, [show, hotelId, originalName, version]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShow((v) => !v)}>
        {show ? "Ocultar texto original" : "Ver texto original"}
      </Button>
      {show && (
        <div className="mt-2 p-2 bg-gray-900 text-xs max-h-80 overflow-auto rounded border border-muted">
          {loading ? <span>Cargando…</span> : <pre className="whitespace-pre-wrap">{text}</pre>}
        </div>
      )}
    </>
  );
}
