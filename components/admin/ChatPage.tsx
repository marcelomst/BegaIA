// Path: /root/begasist/app/page.tsx
// Mejoras pedidas: comportamiento, accesibilidad y seguridad. Sin dependencias nuevas.
// Todas las líneas con cambios relevantes están marcadas con "// CHANGE:" (o bloque comentado al inicio de secciones).

"use client";

import { useEffect, useState, useRef, useCallback, useId } from "react"; // CHANGE: useCallback + useId
import ReactMarkdown from "react-markdown";
import { useSearchParams } from "next/navigation";
import {
  getConversationId,
  setConversationId,
  getLang,
  setLang,
  resetConversationSession,
} from "@/utils/conversationSession";

// ===== Tipos fuertes para las respuestas de API (seguridad de tipos) =====
// CHANGE: tipado explícito de los contratos de red

type APIMessagesResponse = {
  messages?: Array<{
    sender: string;
    content?: string;
    suggestion?: string;
    timestamp: string;
    messageId?: string;
    status?: "sent" | "pending";
    approvedResponse?: string;
  }>;
};

type APIChatResponse = {
  response?: string | unknown;
  status?: "sent" | "pending";
  messageId?: string;
  conversationId?: string;
  lang?: string;
};

type ConversationSummary = {
  conversationId: string;
  startedAt: string;
  lastUpdatedAt: string;
  lang: string;
  status: string;
};

type ChatTurn = {
  role: "user" | "ai";
  text: string;
  timestamp: string;
};

export default function ChatPage() {
  const searchParams = useSearchParams();
  const hotelId = searchParams?.get("hotelId") ?? "";

  // ===== Estado =====
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"sent" | "pending" | null>(null);
  const [messageId, setMessageId] = useState<string | null>(null);
  const [conversationId, setConvId] = useState<string | null>(null);
  const [lang, setLangState] = useState<string>("es");
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [myConversations, setMyConversations] = useState<ConversationSummary[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);

  // ===== Refs =====
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<number | null>(null); // CHANGE: poder limpiar el polling
  const isMountedRef = useRef(true); // CHANGE: evitar setState tras unmount

  // ===== Accesibilidad =====
  const textareaId = useId(); // CHANGE: asociar <label> con <textarea>
  const selectLangId = useId(); // CHANGE
  const liveRegionRef = useRef<HTMLDivElement>(null); // CHANGE: live region para SR

  // Scroll automático al final
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  // Limpieza de efectos al desmontar
  useEffect(() => {
    return () => {
      isMountedRef.current = false; // CHANGE
      if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Al montar: cargar conversación actual, idioma y chats previos
  useEffect(() => {
    // CHANGE: usar AbortController para evitar fugas en fetch
    const controller = new AbortController();
    const signal = controller.signal;

    const convId = getConversationId();
    setConvId(convId);
    setActiveConv(convId);
    setLangState(getLang());

    // 👉 Cargar historial si hay conversationId
    if (convId) {
      (async () => {
        try {
          const res = await fetch(
            `/api/messages/by-conversation?channelId=web&conversationId=${convId}`,
            { signal, credentials: "same-origin" } // CHANGE: creds same-origin
          );
          if (!res.ok) throw new Error("HTTP " + res.status);
          const data = (await res.json()) as APIMessagesResponse;
          if (Array.isArray(data.messages)) {
            setHistory(
              data.messages.map((msg) => ({
                role: msg.sender === "Usuario Web" ? "user" : "ai",
                text: msg.content ?? msg.suggestion ?? "",
                timestamp: msg.timestamp,
              }))
            );
          }
        } catch {
          if (!signal.aborted) setHistory([]);
        }
      })();
    }

    // 👉 Cargar lista de conversaciones previas del usuario
    (async () => {
      try {
        const res = await fetch("/api/conversations/list", { signal, credentials: "same-origin" }); // CHANGE
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = (await res.json()) as { conversations?: ConversationSummary[] };
        setMyConversations(Array.isArray(data.conversations) ? data.conversations : []);
      } catch {
        if (!signal.aborted) setMyConversations([]);
      }
    })();

    return () => controller.abort();
  }, []);

  const handleLangChange = useCallback((newLang: string) => {
    setLang(newLang);
    setLangState(newLang);
  }, []);

  // 👉 Cambiar a un chat anterior (recuperar historial y actualizar session)
  const handleSelectConversation = useCallback(async (convId: string) => {
    setConvId(convId);
    setActiveConv(convId);
    setConversationId(convId);

    const controller = new AbortController();
    const signal = controller.signal;

    try {
      const res = await fetch(
        `/api/messages/by-conversation?channelId=web&conversationId=${convId}`,
        { signal, credentials: "same-origin" } // CHANGE
      );
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = (await res.json()) as APIMessagesResponse;
      if (Array.isArray(data.messages)) {
        setHistory(
          data.messages.map((msg) => ({
            role: msg.sender === "Usuario Web" ? "user" : "ai",
            text: msg.content ?? msg.suggestion ?? "",
            timestamp: msg.timestamp,
          }))
        );
      }
    } catch {
      if (!signal.aborted) setHistory([]);
    } finally {
      setQuery("");
      textareaRef.current?.focus();
    }
  }, []);

  // 👉 Nueva conversación
  const handleNewConversation = useCallback(async () => {
    if (conversationId) {
      try {
        await fetch("/api/conversations/close", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId }),
          credentials: "same-origin", // CHANGE
        });
      } catch {}
    }

    resetConversationSession();
    setConvId(null);
    setActiveConv(null);
    setStatus(null);
    setMessageId(null);
    setQuery("");
    setLangState("es");
    setLang("es");
    setHistory([]);
    textareaRef.current?.focus();

    // Opcional: recargar lista de mis chats después de crear uno nuevo
    setTimeout(() => {
      fetch("/api/conversations/list", { credentials: "same-origin" })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data: { conversations?: ConversationSummary[] }) =>
          setMyConversations(data.conversations ?? [])
        )
        .catch(() => setMyConversations([]));
    }, 200);
  }, [conversationId]);

  // 👉 Enviar mensaje (como acción de formulario)
  const sendQuery = useCallback(async () => {
    if (!query.trim() || loading) return; // CHANGE: evitar doble submit
    setLoading(true);
    setStatus(null);
    setMessageId(null);

    const newTurn: ChatTurn = { role: "user", text: query, timestamp: new Date().toISOString() };
    setHistory((h) => [...h, newTurn]);

    const currentConversationId = getConversationId();
    const currentLang = getLang();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query,
          channel: "web",
          hotelId: hotelId,
          conversationId: currentConversationId,
          lang: currentLang,
        }),
        credentials: "same-origin", // CHANGE
      });

      // CHANGE: comprobar res.ok y manejar texto no JSON de forma segura
      const textResp = await res.text();
      if (!res.ok) throw new Error(textResp || `HTTP ${res.status}`);

      let data: APIChatResponse | null = null;
      try {
        data = JSON.parse(textResp) as APIChatResponse;
      } catch {
        // Si backend devuelve texto plano, no lo mostramos como HTML por seguridad
        setHistory((h) => [
          ...h,
          {
            role: "ai",
            text: "⚠️ Respuesta inesperada del servidor.",
            timestamp: new Date().toISOString(),
          },
        ]);
        setLoading(false);
        setQuery("");
        return;
      }

      const responseText =
        typeof data.response === "string" ? data.response : JSON.stringify(data.response, null, 2);

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

      if (data.conversationId) {
        setConversationId(data.conversationId);
        setConvId(data.conversationId);
        setActiveConv(data.conversationId);
      }
      if (data.lang) {
        setLang(data.lang);
        setLangState(data.lang);
      }

      // Actualizar la lista de mis chats al crear uno nuevo
      fetch("/api/conversations/list", { credentials: "same-origin" })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data: { conversations?: ConversationSummary[] }) =>
          setMyConversations(data.conversations ?? [])
        )
        .catch(() => {});
    } catch (error) {
      setHistory((h) => [
        ...h,
        { role: "ai", text: "Error al obtener respuesta.", timestamp: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
      setQuery("");
    }
  }, [query, loading, hotelId]);

  // Polling: actualizar respuesta de AI cuando se aprueba en modo supervisado
  useEffect(() => {
    if (status === "pending" && messageId) {
      // CHANGE: limpiar interval anterior si existe
      if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);

      pollIntervalRef.current = window.setInterval(async () => {
        try {
          const res = await fetch(`/api/messages?channelId=web`, { credentials: "same-origin" }); // CHANGE
          if (!res.ok) return;
          const data = (await res.json()) as APIMessagesResponse & { messages?: any[] };
          const updated = data.messages?.find((m: any) => m.messageId === messageId);

          if (updated?.status === "sent") {
            setStatus("sent");
            setHistory((h) => {
              const lastIndex = h.map((msg) => msg.role).lastIndexOf("ai");
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
            if (pollIntervalRef.current) {
              window.clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          }
        } catch {}
      }, 5000);

      return () => {
        if (pollIntervalRef.current) {
          window.clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    }
  }, [status, messageId]);

  // CHANGE: enviar con Ctrl/Cmd+Enter y mantener salto de línea con Enter
  const onTextareaKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void sendQuery();
    }
  }, [sendQuery]);

  // CHANGE: handler de submit de formulario para mejorar a11y (Enter en botón, etc.)
  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      void sendQuery();
    },
    [sendQuery]
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6 transition-colors">
      <header className="mb-4 w-full max-w-lg">
        <h1 className="text-3xl font-bold">💬 Chat con IA</h1>
      </header>

      {/* Mis conversaciones */}
      <nav aria-label="Mis conversaciones" className="w-full max-w-lg mb-4"> {/* CHANGE: nav + aria-label */}
        <h2 className="text-lg font-semibold mb-2">Mis conversaciones</h2>
        {myConversations.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay chats previos.</p>
        )}
        <ul className="space-y-1" role="list">
          {myConversations.map((c) => (
            <li key={c.conversationId}>
              <button
                type="button" // CHANGE: explicit type
                className={`text-left w-full px-2 py-1 rounded border transition ${
                  activeConv === c.conversationId
                    ? "bg-blue-200 font-bold border-blue-400"
                    : "hover:bg-blue-100 border"
                }`}
                onClick={() => handleSelectConversation(c.conversationId)}
                aria-current={activeConv === c.conversationId ? "true" : undefined} // CHANGE: a11y estado actual
              >
                <span className="font-semibold">#{c.conversationId.slice(0, 8)}</span>
                <time className="ml-2 text-xs" dateTime={new Date(c.lastUpdatedAt).toISOString()}>
                  {new Date(c.lastUpdatedAt).toLocaleString()}
                </time>
                <span className="ml-2 text-xs text-gray-500">({c.lang})</span>
                <span className="ml-2 text-xs">{c.status}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bloque de chat principal */}
      <main className="w-full max-w-lg bg-muted p-4 shadow-md rounded-lg border border-border" aria-busy={loading || undefined}> {/* CHANGE: aria-busy */}
        {/* Región viva para lectores de pantalla (estado) */}
        <div ref={liveRegionRef} className="sr-only" aria-live="polite" aria-atomic="false"> {/* CHANGE */}
          {status === "pending" ? "Mensaje enviado, en revisión." : loading ? "Enviando…" : "Listo."}
        </div>

        {/* Chat History */}
        <section
          className="mb-4 max-h-[340px] overflow-y-auto flex flex-col gap-2"
          style={{ minHeight: 120 }}
          aria-label="Historial del chat" // CHANGE
        >
          {history.map((msg, idx) => (
            <article
              key={idx}
              className={
                msg.role === "user"
                  ? "self-end bg-blue-200 text-blue-900 px-3 py-2 rounded-lg max-w-[70%]"
                  : "self-start bg-gray-200 text-gray-900 px-3 py-2 rounded-lg max-w-[80%]"
              }
            >
              {/* CHANGE: usar ReactMarkdown con componentes seguros para links */}
              <ReactMarkdown
                components={{
                  a: (props) => (
                    <a {...props} target="_blank" rel="nofollow noopener noreferrer" />
                  ),
                }}
              >
                {msg.text}
              </ReactMarkdown>
              <time className="block mt-1 text-[10px] opacity-60" dateTime={new Date(msg.timestamp).toISOString()}>
                {new Date(msg.timestamp).toLocaleString()}
              </time>
            </article>
          ))}
          <div ref={chatEndRef} />
        </section>

        {/* Formulario de entrada */}
        <form onSubmit={onSubmit} noValidate aria-label="Enviar mensaje"> {/* CHANGE: form + noValidate */}
          <div className="flex flex-col gap-2">
            <label htmlFor={textareaId} className="text-sm font-medium">Mensaje</label> {/* CHANGE */}
            <textarea
              id={textareaId}
              ref={textareaRef}
              className="w-full border border-border bg-background text-foreground p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition"
              rows={3}
              placeholder="Escribí tu pregunta..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onTextareaKeyDown} // CHANGE
              disabled={loading}
              aria-disabled={loading || undefined} // CHANGE
            />

            <button
              type="submit" // CHANGE: submit del form
              className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition disabled:opacity-60"
              disabled={loading}
              aria-label={loading ? "Enviando" : "Preguntar"} // CHANGE
            >
              {loading ? "Pensando..." : "Preguntar"}
            </button>

            {/* Botón para nueva conversación */}
            <button
              type="button" // CHANGE
              className="w-full bg-gray-200 text-gray-900 p-2 rounded-md border border-gray-300 hover:bg-gray-300 transition"
              onClick={handleNewConversation}
              disabled={loading}
            >
              Nueva conversación
            </button>

            <div className="mt-2">
              <label className="mr-2" htmlFor={selectLangId}>Idioma:</label> {/* CHANGE */}
              <select
                id={selectLangId}
                value={lang}
                onChange={(e) => handleLangChange(e.target.value)}
                className="border p-1 rounded"
                disabled={loading} // CHANGE: evita cambios durante envío
              >
                <option value="es">Español</option>
                <option value="en">Inglés</option>
                <option value="pt">Portugués</option>
              </select>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
