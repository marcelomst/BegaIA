// /root/begasist/components/admin/ChannelMessages.tsx

import React, { useState, useEffect } from "react";
import { RefreshCcw } from "lucide-react";
import type { ChannelMessage, ChannelMode } from "@/types/channel";
import { fetchWithAuth } from "@/lib/api/fetchWithAuth";

interface Props {
  channelId: string;
  userEmail: string;
  mode: ChannelMode;
}

const ChannelMessages: React.FC<Props> = ({ channelId, userEmail, mode }) => {
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  

  const signedEmail = mode === "automatic" ? "asistente@hotel.com" : userEmail;

  const loadMessages = async () => {
    try {
      console.log("🌐 [DEBUG] Llamando /api/messages para canal:", channelId);
      const res = await fetchWithAuth(`/api/messages?channelId=${channelId}`);
      if (!res.ok) throw new Error("❌ Error al obtener mensajes");

      const data = await res.json();
      console.log("📦 Mensajes recibidos (raw):", data.messages);

      interface ProcessedMessage extends ChannelMessage {
        response: string;
        edited: boolean;
      }

      const sorted: ProcessedMessage[] = (data.messages || [])
        .filter((msg: ChannelMessage): boolean => {
          const keep = msg.status !== "expired";
          if (!keep) {
        console.log("🧹 Mensaje filtrado por 'expired':", msg);
          }
          return keep;
        })
        .map((msg: ChannelMessage): ProcessedMessage => ({
          ...msg,
          response: msg.approvedResponse ?? msg.suggestion,
          edited: Boolean(msg.approvedResponse && msg.approvedResponse !== msg.suggestion),
        }))
        .sort((a: ProcessedMessage, b: ProcessedMessage): number => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

      console.log("✅ Mensajes procesados:", sorted);
      setMessages(sorted);
    } catch (err) {
      console.error("⛔ Error al cargar mensajes:", err);
      setError("Error al cargar los mensajes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (channelId) {
      setLoading(true);
      loadMessages();
    }
  }, [channelId]);

  const handleStartEditing = (msg: ChannelMessage) => {
    setEditingMessageId(msg.messageId);
    setEditingText(msg.approvedResponse ?? msg.suggestion);
  };

  const handleCancelEditing = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const handleSaveEditing = async (msg: ChannelMessage) => {
    const res = await fetchWithAuth("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageId: msg.messageId,
        approvedResponse: editingText,
        status: "pending",
        respondedBy: signedEmail,
        channel: channelId,
      }),
    });

    if (res.ok) {
      setMessages((prev) =>
        prev.map((m) =>
          m.messageId === msg.messageId
            ? {
                ...m,
                approvedResponse: editingText,
                status: "pending",
                respondedBy: signedEmail,
              }
            : m
        )
      );
      setEditingMessageId(null);
      setEditingText("");
    }
  };

  const handleSend = async (msg: ChannelMessage) => {
    const res = await fetchWithAuth("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageId: msg.messageId,
        approvedResponse: msg.approvedResponse ?? msg.suggestion,
        status: "sent",
        respondedBy: signedEmail,
        channel: channelId,
      }),
    });

    if (res.ok) {
      setMessages((prev) =>
        prev.map((m) =>
          m.messageId === msg.messageId
            ? { ...m, status: "sent", respondedBy: signedEmail }
            : m
        )
      );
    }
  };

  const handleReject = async (msg: ChannelMessage) => {
    const res = await fetchWithAuth("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageId: msg.messageId,
        status: "rejected",
        respondedBy: signedEmail,
        channel: channelId,
      }),
    });

    if (res.ok) {
      setMessages((prev) =>
        prev.map((m) =>
          m.messageId === msg.messageId
            ? { ...m, status: "rejected", respondedBy: signedEmail }
            : m
        )
      );
    }
  };

  const pageSize = 2;
  const totalPages = Math.ceil(messages.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentMessages = messages.slice(startIndex, startIndex + pageSize);

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button
          className="text-xs flex items-center gap-1 text-blue-500 hover:underline"
          onClick={loadMessages}
        >
          <RefreshCcw className="w-4 h-4" />
          Actualizar mensajes
        </button>
      </div>

      {loading && <p>Cargando mensajes...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {currentMessages.map((msg) => {
        const isEditing = msg.messageId === editingMessageId;
        const origin = msg.approvedResponse && msg.approvedResponse !== msg.suggestion
          ? "✍️ Editado por recepción"
          : "🤖 Sugerencia del asistente";
        const statusLabel =
          msg.status === "sent"
            ? "✅ Enviado"
            : msg.status === "rejected"
            ? "❌ Rechazado"
            : "🕓 Pendiente";
        const formattedTime = new Date(msg.timestamp).toLocaleString("es-ES");

        return (
          <div
            key={msg.messageId}
            className="border border-border p-4 mb-4 rounded-md bg-background text-foreground"
          >
            <div className="font-semibold mb-1">
              {msg.sender} —{" "}
              <span className="text-muted-foreground text-xs font-normal">
                {formattedTime}
              </span>
            </div>
            <div className="mb-2">{msg.content}</div>

            <textarea
              rows={4}
              value={isEditing ? editingText : msg.approvedResponse ?? msg.suggestion}
              readOnly={!isEditing}
              onChange={(e) => isEditing && setEditingText(e.target.value)}
              className={`w-full bg-background border border-border rounded-md p-2 text-sm ${
                !isEditing ? "cursor-default select-none" : ""
              }`}
            />

            <div className="text-xs text-muted-foreground mt-2">
              Respondido por: {msg.respondedBy ?? "—"}
            </div>

            <div className="text-xs text-muted-foreground mt-1 mb-1 flex justify-between">
              <span>{origin}</span>
              <span>{statusLabel}</span>
            </div>

            <div className="flex gap-2 text-xs">
              {isEditing ? (
                <>
                  <button
                    className="text-green-600 hover:underline"
                    onClick={() => handleSaveEditing(msg)}
                  >
                    ✅ Guardar
                  </button>
                  <button
                    className="text-red-500 hover:underline"
                    onClick={handleCancelEditing}
                  >
                    ❌ Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="text-blue-500 hover:underline"
                    onClick={() => handleStartEditing(msg)}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    className="text-green-600 hover:underline"
                    onClick={() => handleSend(msg)}
                  >
                    {msg.status === "sent" ? "🔁 Reenviar" : "✅ Enviar"}
                  </button>
                  <button
                    className="text-red-500 hover:underline"
                    onClick={() => handleReject(msg)}
                  >
                    ❌ Rechazar
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}

      <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground">
        <button
          onClick={() => setCurrentPage((p) => p - 1)}
          disabled={currentPage <= 1}
          className="hover:underline disabled:text-gray-400"
        >
          ← Anterior
        </button>
        <span>
          Página {currentPage} de {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((p) => p + 1)}
          disabled={currentPage >= totalPages}
          className="hover:underline disabled:text-gray-400"
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
};

export default ChannelMessages;
