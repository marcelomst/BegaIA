// /app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      
      if (res.ok) {
        setStatus("success");
        router.push("/admin");
      } else {
        setStatus("error");
        const errorData = await res.json();
        setMessage(errorData.error || "Error desconocido");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Error de conexión");
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-20 p-4 border rounded-xl shadow bg-white text-black">
      <h1 className="text-xl font-semibold mb-4">Login de Hotel</h1>
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
        onClick={handleLogin}
        disabled={status === "loading"}
        className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {status === "loading" ? "Ingresando..." : "Ingresar"}
      </button>
      {message && (
        <p className={`mt-4 text-sm ${status === "error" ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
