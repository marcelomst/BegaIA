// Path: /root/begasist/app/admin/hotels/new/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function isValidInternationalPhone(phone: string): boolean {
  return /^\+\d{6,15}$/.test(phone.trim());
}

export default function NewHotelPage() {
  const router = useRouter();
  // Datos generales
  const [hotelName, setHotelName] = useState("");
  const [hotelId, setHotelId] = useState("");
  const [country, setCountry] = useState("");
  const [timezone, setTimezone] = useState("America/Argentina/Buenos_Aires");
  const [defaultLanguage, setDefaultLanguage] = useState("es");

  // Usuario admin (solo email)
  const [adminEmail, setAdminEmail] = useState("");
  const [adminRoleLevel, setAdminRoleLevel] = useState(10);

  // WhatsApp (REQUIRED)
  const [whatsappNumber, setWhatsappNumber] = useState("");

  // Email CANAL (del hotel, para el bot)
  const [emailChannelConfig, setEmailChannelConfig] = useState({
    dirEmail: "",
    password: "",
    imapHost: "imap.gmail.com",
    imapPort: 993,
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    secure: false,
  });

  // Opcionales
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [instagramToken, setInstagramToken] = useState("");
  const [instagramPageId, setInstagramPageId] = useState("");
  const [facebookToken, setFacebookToken] = useState("");
  const [facebookPageId, setFacebookPageId] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidInternationalPhone(whatsappNumber)) {
      setError("Ingresá un número de WhatsApp válido (ej: +59899912345)");
      return;
    }
    if (!emailChannelConfig.dirEmail || !emailChannelConfig.password) {
      setError("Ingresá el email y contraseña de aplicación del canal Email.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/hotels/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId: hotelId || undefined,
          hotelName,
          country,
          timezone,
          defaultLanguage,
          adminEmail,
          adminRoleLevel,
          whatsappNumber,
          emailChannelConfig,
          telegramToken,
          telegramChatId,
          instagramToken,
          instagramPageId,
          facebookToken,
          facebookPageId,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Error al crear hotel");
      }
      setSuccess(true);
      toast.success("Se envió el email de activación al admin.");
      setTimeout(() => router.push("/admin/hotels"), 3000);
    } catch (err: any) {
      setError(err.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 bg-muted p-6 rounded shadow">
      <h1 className="text-xl font-bold mb-4">Agregar hotel</h1>
      {success ? (
        <div className="text-green-600 font-semibold">
          ¡Hotel creado! El administrador recibirá un email para activar su cuenta y elegir una contraseña.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Datos generales */}
          <h2 className="font-semibold mb-1">Datos generales</h2>
          <input className="border p-2 rounded" type="text" placeholder="Nombre del hotel"
            value={hotelName} onChange={e => setHotelName(e.target.value)} required />
          <input className="border p-2 rounded" type="text" placeholder="ID único del hotel (opcional)"
            value={hotelId} onChange={e => setHotelId(e.target.value)} />
          <input className="border p-2 rounded" type="text" placeholder="País"
            value={country} onChange={e => setCountry(e.target.value)} />
          <input className="border p-2 rounded" type="text" placeholder="Zona horaria (ej: America/Argentina/Buenos_Aires)"
            value={timezone} onChange={e => setTimezone(e.target.value)} />
          <input className="border p-2 rounded" type="text" placeholder="Idioma por defecto (es, en, pt, etc)"
            value={defaultLanguage} onChange={e => setDefaultLanguage(e.target.value)} />

          {/* Usuario administrador */}
          <h2 className="font-semibold mt-4 mb-1">Usuario administrador</h2>
          <input className="border p-2 rounded" type="email" placeholder="Email del admin (login)"
            value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required />
          <input className="border p-2 rounded" type="number" min={0} max={20}
            placeholder="RoleLevel admin (default 10)" value={adminRoleLevel}
            onChange={e => setAdminRoleLevel(Number(e.target.value))} />

          {/* Canales */}
          <h2 className="font-semibold mt-4 mb-1">Canales</h2>
          {/* WhatsApp */}
          <div className="border rounded p-3 mb-2">
            <h3 className="font-medium mb-2">WhatsApp <span className="text-red-500">*</span></h3>
            <input className="border p-2 rounded w-full" type="tel" pattern="^\+\d{6,15}$"
              placeholder="Número WhatsApp (ej: +59899912345)" value={whatsappNumber}
              onChange={e => setWhatsappNumber(e.target.value)} required />
          </div>
          {/* Email */}
          <div className="border rounded p-3 mb-2">
            <h3 className="font-medium mb-2">Email <span className="text-red-500">*</span></h3>
            <input className="border p-2 rounded w-full" type="email" placeholder="Email del canal"
              value={emailChannelConfig.dirEmail}
              onChange={e => setEmailChannelConfig({ ...emailChannelConfig, dirEmail: e.target.value })}
              required />
            <input className="border p-2 rounded w-full" type="password" placeholder="Contraseña de aplicación del email"
              value={emailChannelConfig.password}
              onChange={e => setEmailChannelConfig({ ...emailChannelConfig, password: e.target.value })}
              required />
            <small className="text-xs text-muted-foreground block mt-1">
              <b>Importante:</b> Si usás Gmail, necesitás una{" "}
              <a
                href="https://support.google.com/mail/answer/185833?hl=es-419"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                contraseña de aplicación
              </a>
              .<br />
              <b>No es la contraseña habitual</b> de Gmail, sino un password especial generado en tu cuenta de Google para apps externas.
              Para Outlook, Yahoo, etc. también puede requerirse un password de aplicación.
            </small>
          </div>
          {/* Opcionales (Telegram, Instagram, Facebook) — igual que antes */}
          {/* ...Podés agregar el resto igual si los usás... */}

          {error && <div className="text-red-500">{error}</div>}
          <Button type="submit" disabled={loading}>
            {loading ? "Creando..." : "Crear hotel"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
        </form>
      )}
    </div>
  );
}
