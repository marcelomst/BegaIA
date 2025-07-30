// Path: /root/begasist/components/admin/WhatsAppQrPanel.tsx
"use client";
import { useEffect, useState } from "react";

export default function WhatsAppQrPanel({ hotelId }: { hotelId: string }) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let timer: any;
    const fetchQr = async () => {
      try {
        const res = await fetch(`/api/whatsapp/qr?hotelId=${hotelId}`);
        if (res.status === 200) {
          const { qr } = await res.json();
          setQr(qr);
        } else {
          setQr(null);
        }
      } catch {
        setQr(null);
      }
      timer = setTimeout(fetchQr, 3000); // Poll cada 3s
    };
    fetchQr();
    return () => clearTimeout(timer);
  }, [hotelId]);

  if (!qr) return null;

  return (
    <div className="p-4">
      <h3 className="font-bold mb-2">Escaneá el código QR para vincular WhatsApp</h3>
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qr)}`}
        alt="QR de WhatsApp"
        className="mx-auto"
      />
      <p className="mt-2 text-sm text-muted-foreground">Usá la app de WhatsApp para escanear este código. El QR desaparece cuando el bot está conectado.</p>
    </div>
  );
}
