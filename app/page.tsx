// /root/begasist/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

export default function ChatPage() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"sent" | "pending" | null>(null);
  const [messageId, setMessageId] = useState<string | null>(null);

  const sendQuery = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setResponse("");
    setStatus(null);
    setMessageId(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query,
          channel: "web",
        }),
      });

      const data = await res.json();
      const responseText =
        typeof data.response === "string"
          ? data.response
          : JSON.stringify(data.response, null, 2);

      setResponse(responseText);
      setStatus(data.status ?? null);
      setMessageId(data.messageId ?? null); // ✅ Usar messageId correctamente
    } catch (error) {
      console.error("Error en la consulta:", error);
      setResponse("Error al obtener respuesta.");
    } finally {
      setLoading(false);
    }
  };

  // 🔁 Polling si está en modo supervisado
  useEffect(() => {
    if (status === "pending" && messageId) {
      const interval = setInterval(async () => {
        const res = await fetch(`/api/messages?channelId=web`);
        const data = await res.json();
        const updated = data.messages?.find((m: any) => m.messageId === messageId); // ✅ Buscar por messageId

        if (updated?.status === "sent") {
          setResponse(updated.approvedResponse ?? updated.suggestion ?? "");
          setStatus("sent");
          clearInterval(interval);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [status, messageId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6 transition-colors">
      <h1 className="text-3xl font-bold mb-4">💬 Chat con IA</h1>

      <div className="w-full max-w-lg bg-muted p-4 shadow-md rounded-lg border border-border">
        <textarea
          className="w-full border border-border bg-background text-foreground p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition"
          rows={3}
          placeholder="Escribí tu pregunta..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <button
          className="w-full bg-blue-600 text-white p-2 mt-3 rounded-md hover:bg-blue-700 transition"
          onClick={sendQuery}
          disabled={loading}
        >
          {loading ? "Pensando..." : "Preguntar"}
        </button>
      </div>

      {response && (
        <div className="w-full max-w-lg bg-muted p-4 mt-4 shadow-md rounded-lg border border-border text-foreground">
          <h2 className="text-lg font-semibold">🤖 Respuesta:</h2>
          <div className="mt-2 text-muted-foreground">
            <ReactMarkdown
              components={{
                a: ({ ...props }) => (
                  <a
                    className="text-blue-500 underline hover:text-blue-700"
                    {...props}
                  />
                ),
              }}
            >
              {status === "sent"
                ? response
                : "🕓 Tu consulta fue enviada. Un recepcionista está revisando tu solicitud..."}
            </ReactMarkdown>
          </div>
        </div>
      )}

      <p className="mt-2 text-sm text-yellow-600">{status}</p>
    </div>
  );
}
