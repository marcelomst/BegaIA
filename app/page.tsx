// Path: /root/begasist/app/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { useSearchParams } from "next/navigation";
import {
  getConversationId,
  setConversationId,
  getLang,
  setLang,
  resetConversationSession,
  hasConversationId,
} from "@/utils/conversationSession";
import { getOrCreateGuestId } from "@/utils/guestSession";

type ChatTurn = {
  role: "user" | "ai";
  text: string;
  timestamp: string;
};

type ConversationSummary = {
  conversationId: string;
  startedAt: string;
  lastUpdatedAt: string;
  lang: string;
  status: string;
  subject?: string;
};

export default function ChatPage() {
  const searchParams = useSearchParams();
  const hotelId = searchParams?.get("hotelId") ?? "";
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"sent" | "pending" | null>(null);
  const [messageId, setMessageId] = useState<string | null>(null);
  const [conversationId, setConvId] = useState<string | null>(null);
  const [lang, setLangState] = useState<string>("es");
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [myConversations, setMyConversations] = useState<ConversationSummary[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const guestId = typeof window !== "undefined" ? getOrCreateGuestId() : "";
  
  // Scroll automático al final
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  // Al montar: cargar conversación actual, idioma y chats previos
  useEffect(() => {
    const convId = getConversationId();
    setConvId(convId);
    setActiveConv(convId);
    setLangState(getLang());
    console.log("Conversación actual:", convId);
    // 👉 Cargar historial si hay conversationId
    if (convId) {
      (async () => {
        try {
          const res = await fetch(
            `/api/messages/by-conversation?channelId=web&conversationId=${convId}&hotelId=${hotelId}`
          );

          const data = await res.json();
          if (Array.isArray(data.messages)) {
          const mensajesOrdenados = [...data.messages].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          setHistory(
            mensajesOrdenados.map((msg: any) => {
              if (msg.sender === "assistant") {
                return {
                  role: "ai",
                  text: msg.approvedResponse ?? msg.suggestion ?? "",
                  timestamp: msg.timestamp,
                };
              } else {
                return {
                  role: "user",
                  text: msg.content ?? "",
                  timestamp: msg.timestamp,
                };
              }
            })
          );


          }
        } catch (e) {
          setHistory([]);
          console.error("Error al cargar historial de mensajes:", e);
        }
      })();
    }

    // 👉 Cargar lista de conversaciones previas
    (async () => {
      try {
        const res = await fetch(`/api/conversations/list?hotelId=${hotelId}&guestId=${guestId}`);
        const data = await res.json();
        if (Array.isArray(data.conversations)) {
          setMyConversations(data.conversations);
          console.log("Conversaciones previas cargadas:", data.conversations);  
        }
      } catch (e) {
        setMyConversations([]);
      }
    })();
  }, []);

  function handleLangChange(newLang: string) {
    setLang(newLang);
    setLangState(newLang);
  }

  // 👉 Cambiar a un chat anterior (recuperar historial y actualizar session)
  async function handleSelectConversation(conversationId: string) {
    setConvId(conversationId);
    setActiveConv(conversationId);
    setConversationId(conversationId);

    const res = await fetch(
      `/api/messages/by-conversation?channelId=web&conversationId=${conversationId}&hotelId=${hotelId}`
    );

    const data = await res.json();
    if (Array.isArray(data.messages)) {
      // Cuando traés el historial del backend
      const mensajesOrdenados = [...data.messages].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      setHistory(
        mensajesOrdenados.map((msg: any) => {
          if (msg.sender === "assistant") {
            return {
              role: "ai",
              text: msg.approvedResponse ?? msg.suggestion ?? "",
              timestamp: msg.timestamp,
            };
          } else {
            return {
              role: "user",
              text: msg.content ?? "",
              timestamp: msg.timestamp,
            };
          }
        })
      );

    }
    setQuery("");
    textareaRef.current?.focus();
  }

  // 👉 Nueva conversación
  async function handleNewConversation() {
    if (conversationId) {
      try {
        await fetch("/api/conversations/close", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId }),
        });
      } catch (err) {}
    }
    resetConversationSession();
    setConvId(null);
    setActiveConv(null);
    setStatus(null);
    setMessageId(null);
    setQuery("");
    setSubject("");
    setLangState("es");
    setLang("es");
    setHistory([]);
    textareaRef.current?.focus();

    // Ahora sí: recargá la lista de conversaciones previas (usá conversations/list)
    setTimeout(() => {
      fetch(`/api/conversations/list?hotelId=${hotelId}&guestId=${guestId}`)
        .then(res => res.json())
        .then(data => setMyConversations(data.conversations ?? []));
    }, 200);
  }


  // 👉 Enviar mensaje
const sendQuery = async () => {
  if (!query.trim()) return;
  setLoading(true);
  setStatus(null);
  setMessageId(null);

  setHistory((h) => [
    ...h,
    { role: "user", text: query, timestamp: new Date().toISOString() },
  ]);

  const currentConversationId = getConversationId() || undefined;
  console.log("⏩ conversationId usado para enviar:", currentConversationId);
  const currentLang = getLang();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: query,
        channel: "web",
        hotelId: hotelId,
        conversationId: null,
        lang: currentLang,
        subject: subject,
        guestId,
      }),
    });
    let data: any = null;
    const textResp = await res.text();
    try {
      data = JSON.parse(textResp);
    } catch {
      setHistory((h) => [
        ...h,
        {
          role: "ai",
          text: "⚠️ Error del servidor o la ruta no existe. Consulta el backend.",
          timestamp: new Date().toISOString(),
        },
      ]);
      setLoading(false);
      setQuery("");
      return;
    }
    const responseText =
      typeof data.response === "string"
        ? data.response
        : JSON.stringify(data.response, null, 2);

    setStatus(data.status ?? null);
    setMessageId(data.messageId ?? null);

    setHistory((h) => [
      ...h,
      {
        role: "ai",
        text:
          data.status === "sent"
            ? responseText
            : "🕓 Tu consulta fue enviada. Un recepcionista está revisando tu solicitud...",
        timestamp: new Date().toISOString(),
      },
    ]);

    // --- FIX CLAVE: actualizá siempre la session con el conversationId real ---
    if (data.conversationId) {
      setConversationId(data.conversationId);  // ← actualiza cookie y localStorage
      setConvId(data.conversationId);
      setActiveConv(data.conversationId);
    }
    if (data.lang) {
      setLang(data.lang);
      setLangState(data.lang);
    }
    // Recargá lista de conversaciones tras el envío
    fetch(`/api/conversations/list?hotelId=${hotelId}&guestId=${guestId}`)
      .then(res => res.json())
      .then(data => setMyConversations(data.conversations ?? []));
  } catch (error) {
    setHistory((h) => [
      ...h,
      {
        role: "ai",
        text: "Error al obtener respuesta.",
        timestamp: new Date().toISOString(),
      },
    ]);
  } finally {
    setLoading(false);
    setQuery("");
  }
};


  // Polling: actualizá respuesta de AI cuando se aprueba en modo supervisado
  useEffect(() => {
    if (status === "pending" && messageId) {
      const interval = setInterval(async () => {
        const res = await fetch(`/api/messages?channelId=web`);
        const data = await res.json();
        const updated = data.messages?.find((m: any) => m.messageId === messageId);

        if (updated?.status === "sent") {
          setStatus("sent");
          setHistory((h) => {
            const lastIndex = h.map(msg => msg.role).lastIndexOf("ai");
            if (lastIndex === -1) return h;
            return [
              ...h.slice(0, lastIndex),
              {
                ...h[lastIndex],
                text: updated.approvedResponse ?? updated.suggestion ?? "",
              },
              ...h.slice(lastIndex + 1),
            ];
          });
          clearInterval(interval);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [status, messageId]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6 transition-colors">
      <h1 className="text-3xl font-bold mb-4">💬 Chat con IA</h1>

      {/* Mis conversaciones */}
      <div className="w-full max-w-lg mb-4">
        <h2 className="text-lg font-semibold mb-2">Mis conversaciones</h2>
        {myConversations.length === 0 && (
          <div className="text-sm text-muted-foreground">No hay chats previos.</div>
        )}
        <ul className="space-y-1">
          {myConversations.map((c) => (
            <li key={c.conversationId}>
              <button
                className={`text-left w-full px-2 py-1 rounded border transition ${
                  activeConv === c.conversationId
                    ? "bg-blue-200 font-bold border-blue-400"
                    : "hover:bg-blue-100 border"
                }`}
                onClick={() => handleSelectConversation(c.conversationId)}
              >
                <span className="font-semibold">#{c.conversationId.slice(0, 8)}</span>
                <span className="ml-2 text-sm italic text-gray-600">{c.subject ?? "Sin asunto"}</span>
                <span className="ml-2 text-xs">{new Date(c.lastUpdatedAt).toLocaleString()}</span>
                <span className="ml-2 text-xs text-gray-500">({c.lang})</span>
                <span className="ml-2 text-xs">{c.status}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Bloque de chat principal */}
      <div className="w-full max-w-lg bg-muted p-4 shadow-md rounded-lg border border-border">
        {/* Mostrar asunto en cabecera */}
        {subject && (
          <div className="mb-2 text-base font-semibold text-blue-800">
            <span>Asunto: </span>
            <span className="italic">{subject}</span>
          </div>
        )}

        {/* Chat History */}
        <div
          className="mb-4 max-h-[340px] overflow-y-auto flex flex-col gap-2"
          style={{ minHeight: 120 }}
        >
          {history.map((msg, idx) => (
            <div
              key={idx}
              className={
                msg.role === "user"
                  ? "self-end bg-blue-200 text-blue-900 px-3 py-2 rounded-lg max-w-[70%]"
                  : "self-start bg-gray-200 text-gray-900 px-3 py-2 rounded-lg max-w-[80%]"
              }
              title={msg.timestamp}
            >
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input para asunto */}
        {!conversationId && (
          <input
            type="text"
            className="w-full border border-border bg-background text-foreground p-2 rounded-md mb-2"
            placeholder="Asunto de la consulta (opcional)"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            disabled={loading}
            maxLength={100}
          />
        )}

        <textarea
          ref={textareaRef}
          className="w-full border border-border bg-background text-foreground p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition"
          rows={3}
          placeholder="Escribí tu pregunta..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
        />

        <button
          className="w-full bg-blue-600 text-white p-2 mt-3 rounded-md hover:bg-blue-700 transition"
          onClick={sendQuery}
          disabled={loading}
        >
          {loading ? "Pensando..." : "Preguntar"}
        </button>

        {/* Botón para nueva conversación */}
        <button
          className="w-full bg-gray-200 text-gray-900 p-2 mt-2 rounded-md border border-gray-300 hover:bg-gray-300 transition"
          onClick={handleNewConversation}
          disabled={loading}
        >
          Nueva conversación
        </button>

        <div className="mt-2">
          <label className="mr-2">Idioma:</label>
          <select
            value={lang}
            onChange={(e) => handleLangChange(e.target.value)}
            className="border p-1 rounded"
          >
            <option value="es">Español</option>
            <option value="en">Inglés</option>
            <option value="pt">Portugués</option>
          </select>
        </div>
      </div>
    </div>
  );
}
