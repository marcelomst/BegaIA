"use client";

import { useState } from "react";

export default function SendVerificationPage() {
  const [email, setEmail] = useState("");
  const [hotelId, setHotelId] = useState("hotel999");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const handleSend = async () => {
    setStatus("loading");
    setError("");

    const res = await fetch("/api/send-verification-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, hotelId }),
    });

    if (res.ok) {
      setStatus("sent");
    } else {
      const data = await res.json();
      setError(data.error || "Error al enviar el email.");
      setStatus("error");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded-xl shadow text-center space-y-4">
      <h2 className="text-xl font-semibold">Enviar email de verificación</h2>

      <input
        className="w-full p-2 border rounded"
        type="email"
        placeholder="Email del usuario"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="w-full p-2 border rounded"
        type="text"
        placeholder="Hotel ID"
        value={hotelId}
        onChange={(e) => setHotelId(e.target.value)}
      />

      <button
        onClick={handleSend}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        disabled={status === "loading"}
      >
        Enviar email
      </button>

      {status === "sent" && <p className="text-green-600">📧 Email enviado correctamente.</p>}
      {status === "error" && <p className="text-red-600">❌ {error}</p>}
    </div>
  );
}
