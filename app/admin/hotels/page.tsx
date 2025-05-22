// /app/admin/hotels/page.tsx

"use client";
import useSWR, { mutate } from "swr";
import { useState, useEffect } from "react";
import type { HotelConfig } from "@/types/channel";

const MORADO = "#A020F0";

const TIMEZONES = [
  "America/Montevideo",
  "America/Buenos_Aires",
  "Europe/Madrid",
  "Europe/London",
  "UTC",
];

const LANGS_639_3 = [
  { code: "spa", label: "Español" },
  { code: "eng", label: "Inglés" },
  { code: "por", label: "Portugués" },
  { code: "fra", label: "Francés" },
  { code: "deu", label: "Alemán" },
  { code: "ita", label: "Italiano" },
];

const HARDCODED_EMAIL_SETTINGS = {
  emailAddress: "",
  password: "",
  imapHost: "imap.gmail.com",
  imapPort: 993,
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  secure: false,
};

// --- Hook para obtener los defaults del hotel system ---
function useSystemEmailDefaults() {
  const [defaults, setDefaults] = useState(HARDCODED_EMAIL_SETTINGS);

  useEffect(() => {
    fetch("/api/hotels/get?hotelId=system")
      .then(res => res.json())
      .then(data => {
        if (data.hotel?.emailSettings) {
          setDefaults({
            ...HARDCODED_EMAIL_SETTINGS,
            ...data.hotel.emailSettings,
          });
        }
      });
    // eslint-disable-next-line
  }, []);

  return defaults;
}

// --- Helper fetcher SWR
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function HotelsPage() {
  const { data, error, isLoading } = useSWR<{ hotels: HotelConfig[] }>("/api/hotels/list", fetcher);
  const [showModal, setShowModal] = useState(false);
  const [editingHotel, setEditingHotel] = useState<HotelConfig | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const openModal = (hotel?: HotelConfig) => {
    setEditingHotel(hotel || null);
    setErrorMsg("");
    setShowModal(true);
  };

  const closeModal = () => {
    setEditingHotel(null);
    setShowModal(false);
  };

  async function handleSave(hotel: Partial<HotelConfig>) {
    setErrorMsg("");
    if (editingHotel) {
      if (editingHotel.hotelId === "system") {
        setErrorMsg("No se puede editar el hotel system.");
        return;
      }
      const res = await fetch("/api/hotels/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId: editingHotel.hotelId, updates: hotel }),
      });
      if (!res.ok) {
        setErrorMsg((await res.json()).error || "Error al editar hotel");
        return;
      }
    } else {
      if (hotel.hotelId === "system") {
        setErrorMsg("El hotel system solo puede crearse por setup inicial.");
        return;
      }
      const res = await fetch("/api/hotels/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hotel),
      });
      if (!res.ok) {
        setErrorMsg((await res.json()).error || "Error al crear hotel");
        return;
      }
    }
    closeModal();
    mutate("/api/hotels/list");
  }

  async function handleDelete(hotelId: string) {
    if (hotelId === "system") {
      alert("No se puede eliminar el hotel system.");
      return;
    }
    if (!confirm("¿Seguro que querés eliminar este hotel?")) return;
    const res = await fetch("/api/hotels/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotelId }),
    });
    if (!res.ok) {
      alert((await res.json()).error || "Error al eliminar hotel");
      return;
    }
    mutate("/api/hotels/list");
  }

  if (isLoading) return <div>Cargando hoteles...</div>;
  if (error) return <div>Error cargando hoteles.</div>;

  return (
    <div className="max-w-3xl mx-auto mt-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold" style={{ color: MORADO }}>Hoteles</h1>
        <button
          onClick={() => openModal()}
          style={{ background: MORADO }}
          className="text-white px-4 py-2 rounded-lg shadow hover:brightness-110"
        >
          + Nuevo hotel
        </button>
      </div>
      <table className="w-full border rounded shadow">
        <thead>
          <tr style={{ background: "#F4E6FA" }}>
            <th className="py-2 px-4 text-left">ID</th>
            <th className="py-2 px-4 text-left">Nombre</th>
            <th className="py-2 px-4 text-left">Zona Horaria</th>
            <th className="py-2 px-4 text-left">Idioma</th>
            <th className="py-2 px-4 text-left">Email</th>
            <th className="py-2 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {data?.hotels.map((h) => (
            <tr key={h.hotelId} className="border-t">
              <td className="py-2 px-4">{h.hotelId}</td>
              <td className="py-2 px-4">{h.hotelName}</td>
              <td className="py-2 px-4">{h.timezone}</td>
              <td className="py-2 px-4">{h.defaultLanguage}</td>
              <td className="py-2 px-4">{h.emailSettings?.emailAddress ?? "-"}</td>
              <td className="py-2 px-4 space-x-2">
                <button
                  onClick={() => openModal(h)}
                  style={{ color: MORADO }}
                  className="hover:underline disabled:opacity-50"
                  disabled={h.hotelId === "system"}
                  title={h.hotelId === "system" ? "No editable" : ""}
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(h.hotelId)}
                  className="text-red-600 hover:underline disabled:opacity-50"
                  disabled={h.hotelId === "system"}
                  title={h.hotelId === "system" ? "No eliminable" : ""}
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <HotelModal
          hotel={editingHotel}
          onSave={handleSave}
          onClose={closeModal}
          errorMsg={errorMsg}
        />
      )}
    </div>
  );
}

// --- Modal reutilizable para alta/edición de hotel --- //
function HotelModal({
  hotel,
  onSave,
  onClose,
  errorMsg,
}: {
  hotel: Partial<HotelConfig> | null;
  onSave: (hotel: Partial<HotelConfig>) => void;
  onClose: () => void;
  errorMsg: string;
}) {
  // ---- Valores por defecto (puedes mejorar para traerlos del hotel 'system' si querés) ----
  const DEFAULTS = {
    emailAddress: "begamshop.ventas@gmail.com",
    password: "umammswkuzoakqqu",
    imapHost: "imap.gmail.com",
    imapPort: 993,
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    secure: false,
    timezone: "America/Montevideo",
    defaultLanguage: "spa",
  };

  // ---- States: datos del hotel ----
  const [hotelId, setHotelId] = useState(hotel?.hotelId ?? "");
  const [hotelName, setHotelName] = useState(hotel?.hotelName ?? "");
  const [timezone, setTimezone] = useState(hotel?.timezone ?? DEFAULTS.timezone);
  const [defaultLanguage, setDefaultLanguage] = useState(hotel?.defaultLanguage ?? DEFAULTS.defaultLanguage);

  // ---- States: usuario administrador (solo alta) ----
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // ---- States: emailSettings ----
  const [emailAddress, setEmailAddress] = useState(hotel?.emailSettings?.emailAddress ?? DEFAULTS.emailAddress);
  const [emailPassword, setEmailPassword] = useState(hotel?.emailSettings?.password ?? DEFAULTS.password);
  const [imapHost, setImapHost] = useState(hotel?.emailSettings?.imapHost ?? DEFAULTS.imapHost);
  const [imapPort, setImapPort] = useState(hotel?.emailSettings?.imapPort ?? DEFAULTS.imapPort);
  const [smtpHost, setSmtpHost] = useState(hotel?.emailSettings?.smtpHost ?? DEFAULTS.smtpHost);
  const [smtpPort, setSmtpPort] = useState(hotel?.emailSettings?.smtpPort ?? DEFAULTS.smtpPort);
  const [secure, setSecure] = useState(hotel?.emailSettings?.secure ?? DEFAULTS.secure);

  const MORADO = "#A020F0";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Partial<HotelConfig> = {
      hotelId,
      hotelName,
      timezone,
      defaultLanguage,
      emailSettings: {
        emailAddress,
        password: emailPassword,
        imapHost,
        imapPort: Number(imapPort),
        smtpHost,
        smtpPort: Number(smtpPort),
        secure,
      },
    };
    if (!hotel) {
      Object.assign(payload, {
        adminEmail,
        adminPassword,
        adminRoleLevel: 1,
      });
    }
    onSave(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md mx-auto border-2"
        style={{
          borderColor: MORADO,
          minWidth: 350,
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold" style={{ color: MORADO }}>
            {hotel ? "Editar hotel" : "Nuevo hotel"}
          </h2>
          <button
            onClick={onClose}
            style={{ color: MORADO }}
            className="hover:text-purple-900 text-xl font-bold focus:outline-none"
            title="Cerrar"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* --- Bloque: Datos del hotel --- */}
          <div>
            <div className="font-bold mb-1" style={{ color: MORADO }}>Datos del hotel</div>
            {/* ID solo en alta */}
            {!hotel && (
              <input
                value={hotelId}
                onChange={e => setHotelId(e.target.value)}
                placeholder="ID del hotel"
                className="w-full border rounded px-2 py-1 mb-2"
                required
              />
            )}
            <input
              value={hotelName}
              onChange={e => setHotelName(e.target.value)}
              placeholder="Nombre del hotel"
              className="w-full border rounded px-2 py-1 mb-2"
              required
            />
            {/* Select zona horaria */}
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full border rounded px-2 py-1 mb-2"
              required
            >
              <option value="">Seleccionar zona horaria</option>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
            {/* Select idioma */}
            <select
              value={defaultLanguage}
              onChange={e => setDefaultLanguage(e.target.value)}
              className="w-full border rounded px-2 py-1 mb-2"
              required
            >
              <option value="">Seleccionar idioma</option>
              {LANGS_639_3.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label} ({l.code})
                </option>
              ))}
            </select>
          </div>

          {/* --- Bloque: Usuario administrador (solo en alta) --- */}
          {!hotel && (
            <div>
              <div className="font-bold mb-1" style={{ color: MORADO }}>Usuario administrador</div>
              <input
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                placeholder="Email del usuario admin"
                type="email"
                className="w-full border rounded px-2 py-1 mb-2"
                required
              />
              <input
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                placeholder="Contraseña del admin"
                type="password"
                className="w-full border rounded px-2 py-1 mb-2"
                required
              />
            </div>
          )}

          {/* --- Bloque: Configuración de correo --- */}
          <div>
            <div className="font-bold mb-1" style={{ color: MORADO }}>Configuración de correo (SMTP/IMAP)</div>
            <input
              value={emailAddress}
              onChange={e => setEmailAddress(e.target.value)}
              placeholder="Email del hotel"
              className="w-full border rounded px-2 py-1 mb-2"
              required
            />
            <input
              value={emailPassword}
              onChange={e => setEmailPassword(e.target.value)}
              placeholder="Contraseña del correo"
              className="w-full border rounded px-2 py-1 mb-2"
              type="password"
              required
            />
            <input
              value={imapHost}
              onChange={e => setImapHost(e.target.value)}
              placeholder="IMAP Host"
              className="w-full border rounded px-2 py-1 mb-2"
              required
            />
            <input
              value={imapPort}
              onChange={e => setImapPort(Number(e.target.value))}
              placeholder="IMAP Puerto"
              className="w-full border rounded px-2 py-1 mb-2"
              type="number"
              required
            />
            <input
              value={smtpHost}
              onChange={e => setSmtpHost(e.target.value)}
              placeholder="SMTP Host"
              className="w-full border rounded px-2 py-1 mb-2"
              required
            />
            <input
              value={smtpPort}
              onChange={e => setSmtpPort(Number(e.target.value))}
              placeholder="SMTP Puerto"
              className="w-full border rounded px-2 py-1 mb-2"
              type="number"
              required
            />
            <label className="flex items-center mt-2">
              <input
                type="checkbox"
                checked={secure}
                onChange={e => setSecure(e.target.checked)}
                className="mr-2"
              />
              Usar conexión segura (SSL/TLS)
            </label>
          </div>

          <div className="flex gap-2 justify-end mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{ background: MORADO }}
              className="px-4 py-1 rounded text-white font-semibold hover:brightness-110"
            >
              Guardar
            </button>
          </div>
        </form>
        {errorMsg && <div className="text-red-600 mt-3">{errorMsg}</div>}
      </div>
    </div>
  );
}


