// /app/auth/login/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Cambiado: Un array que tiene userId y hotelId para cada hotel donde el user está activo
  const [hotelsData, setHotelsData] = useState<{ userId: string; hotelId: string; name: string }[]>([]);

  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    setStatus("loading");
    setMessage("");
    setHotelsData([]); // Limpia para cada submit

    const res = await fetch("/api/users/hotels-for-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus("error");
      setMessage(data.message || "Error desconocido");
      toast.error(data.message || "Error al validar usuario");
      return;
    }
    console.log("Autologin:",data.autoLogin);
    console.log("Hoteles:",data.hotels);
    // Si solo hay un hotel, loguea directo
    if (data.autoLogin && data.hotels.length === 1) {
      await loginWithHotel(data.hotels[0].userId, data.hotels[0].hotelId);
    } else if (data.hotels.length > 1) {
      // Si hay varios hoteles, arma la lista de opciones con userId y hotelId ya juntos
      setHotelsData(data.hotels); // ya viene la lista [{userId, hotelId, name}]
      setStatus("idle");
    }
  };
  const loginWithHotel = async (userId: string, hotelId: string) => {
    console.log("userId antes de fetch", userId);
    console.log("hotelId antes de fetch", hotelId);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, hotelId }),
    });
    const data = await res.json();

    if (res.ok) {
      setStatus("success");
      toast.success("Bienvenido 👋");
      router.push("/admin");
    } else {
      setStatus("error");
      setMessage(data.error || "Error al iniciar sesión");
      toast.error(data.error || "Error al iniciar sesión");
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-20 p-4 border rounded-xl shadow bg-white text-black">
      <h1 className="text-xl font-semibold mb-4">Login de Hotel</h1>

      {/* Si ya hay opciones de hoteles: mostrar selección */}
      {hotelsData.length > 0 ? (
        <>
          <p className="mb-2">Selecciona tu hotel:</p>
          {hotelsData.map((h) => (
            <button
              key={h.hotelId}
              className="w-full mb-2 p-2 border rounded hover:bg-gray-100 text-left"
              onClick={() => loginWithHotel(h.userId, h.hotelId)}
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
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="w-full mb-3 p-2 border rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
        <p className={`mt-4 text-sm ${status === "error" ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}

      <p className="text-sm mt-4 text-center">
        <a href="/auth/forgot-password" className="text-blue-600 hover:underline">
          ¿Olvidaste tu contraseña?
        </a>
      </p>
    </div>
  );
}
