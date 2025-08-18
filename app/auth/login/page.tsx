// Path: /app/auth/login/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hotelsData, setHotelsData] = useState<{ userId: string; hotelId: string; name: string }[]>([]);

  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState("");
  const [activationEmailSent, setActivationEmailSent] = useState(false);

  // Guarda último hotelId para reenviar invitación (si lo tiene)
  const [pendingHotelId, setPendingHotelId] = useState<string | null>(null);

  // Helper: intenta parsear JSON sin romper si el body está vacío o es inválido
  async function safeJson(res: Response): Promise<any> {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  }

  const handleSubmit = async () => {
    setStatus("loading");
    setMessage("");
    setHotelsData([]);
    setPendingHotelId(null);
    setActivationEmailSent(false);

    try {
      const res = await fetch("/api/users/hotels-for-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        const msg = data.message || `Error ${res.status}`;
        setStatus("error");
        setMessage(msg);
        toast.error(msg);
        return;
      }

      // Si solo hay un hotel, loguea directo
      if (data.autoLogin && data.hotels?.length === 1) {
        await loginWithHotel(data.hotels[0].userId, data.hotels[0].hotelId);
      } else if (Array.isArray(data.hotels) && data.hotels.length > 1) {
        setHotelsData(data.hotels);
        setStatus("idle");
      } else {
        setStatus("error");
        const msg = "No se encontraron hoteles para este usuario.";
        setMessage(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      setStatus("error");
      const msg = err?.message || "Fallo de red o del servidor";
      setMessage(msg);
      toast.error(msg);
    }
  };

  const loginWithHotel = async (userId: string, hotelId: string) => {
    setPendingHotelId(hotelId); // Guardar último hotel probado para reenvío
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, hotelId }),
      });

      const data = await safeJson(res);

      if (res.ok) {
        setStatus("success");
        toast.success("Bienvenido 👋");
        router.push("/admin");
      } else {
        setStatus("error");
        const msg = data.error || `Error ${res.status} al iniciar sesión`;
        setMessage(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      setStatus("error");
      const msg = err?.message || "Fallo de red o del servidor";
      setMessage(msg);
      toast.error(msg);
    }
  };

  // Handler para reenviar email de activación
  const handleResendActivation = async () => {
    // Usar hotelId si está disponible, si no pedirlo
    let hotelId = pendingHotelId;
    if (!hotelId && hotelsData.length === 1) {
      hotelId = hotelsData[0].hotelId;
    }
    if (!hotelId) {
      hotelId = prompt("ID del hotel al que pertenecés:") || "";
      if (!hotelId.trim()) return toast.error("Debés ingresar un hotel válido.");
    }
    setActivationEmailSent(false);

    try {
      const res = await fetch("/api/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId, email }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        setActivationEmailSent(true);
        toast.success("Email de activación reenviado, revisá tu correo.");
      } else {
        toast.error(data.error || `No se pudo reenviar el email (HTTP ${res.status}).`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Fallo de red o del servidor.");
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-20 p-4 border rounded-xl shadow bg-white text-black">
      <h1 className="text-xl font-semibold mb-4">Login de Hotel</h1>

      {hotelsData.length > 0 ? (
        <>
          <p className="mb-2">Seleccioná tu hotel:</p>
          {hotelsData.map((h) => (
            <button
              key={h.hotelId}
              className="w-full mb-2 p-2 border rounded hover:bg-gray-100 text-left"
              onClick={() => loginWithHotel(h.userId, h.hotelId)}
              disabled={status === "loading"}
            >
              {h.name}
            </button>
          ))}
        </>
      ) : (
        <>
          {/* Formulario de login */}
          <input
            type="email"
            placeholder="Email"
            className="w-full mb-3 p-2 border rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "loading"}
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="w-full mb-3 p-2 border rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={status === "loading"}
          />
          <button
            onClick={handleSubmit}
            disabled={status === "loading"}
            className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {status === "loading" ? "Ingresando..." : "Ingresar"}
          </button>
        </>
      )}

      {message && (
        <div className={`mt-4 text-sm ${status === "error" ? "text-red-600" : "text-green-600"}`}>
          {message}
          {/* Si el error es de activación, mostrar botón para reenviar */}
          {status === "error" &&
            message.toLowerCase().includes("no está activada") &&
            !activationEmailSent && (
              <button
                className="block mt-2 text-blue-600 underline"
                onClick={handleResendActivation}
                type="button"
              >
                Reenviar email de activación
              </button>
            )}
          {activationEmailSent && (
            <span className="block mt-2 text-green-600">📧 Email de activación reenviado, revisá tu correo.</span>
          )}
        </div>
      )}

      <p className="text-sm mt-4 text-center">
        <a href="/auth/forgot-password" className="text-blue-600 hover:underline">
          ¿Olvidaste tu contraseña?
        </a>
      </p>
    </div>
  );
}
