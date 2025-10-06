// Path: /root/begasist/components/admin/ChatPage.tsx
// Integración de UI/UX de reservas en el chat existente.
// - Mantiene las mejoras previas de accesibilidad/seguridad.
// - No agrega dependencias nuevas.
// - Semilla UI local (quick actions, fechas, huéspedes, handoff) sin romper el backend.
// - Cuando tu backend devuelva "rich" oficialmente, ya hay render listo.

"use client";

import { useEffect, useState, useRef, useCallback, useId } from "react";
import ReactMarkdown from "react-markdown";
import { useSearchParams } from "next/navigation";
import {
  getConversationId,
  setConversationId,
  getLang,
  setLang,
  resetConversationSession,
} from "@/utils/conversationSession";

// ===== Tipos de red (sin cambios de contrato) =====
type APIMessagesResponse = {
  messages?: Array<{
    sender: string;
    content?: string;
    suggestion?: string;
    timestamp: string;
    messageId?: string;
    status?: "sent" | "pending";
    approvedResponse?: string;
    // opcional futuro: rich desde backend
    rich?: {
      type: "quick-actions" | "dates" | "guests" | "room-cards" | "upsell" | "handoff";
      data?: any;
    };
  }>;
};

type APIChatResponse = {
  response?: string | unknown;
  status?: "sent" | "pending";
  messageId?: string;
  conversationId?: string;
  lang?: string;
  // opcional futuro: payload enriquecido
  rich?: {
    type: "quick-actions" | "dates" | "guests" | "room-cards" | "upsell" | "handoff";
    data?: any;
  };
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
  // UI enriquecida local o devuelta por backend
  rich?: {
    type: "quick-actions" | "dates" | "guests" | "room-cards" | "upsell" | "handoff";
    data?: any;
  };
};

// ===== Componente principal =====
export default function ChatPage() {
  const searchParams = useSearchParams();
  const hotelId = searchParams?.get("hotelId") ?? "";

  // ===== Estado base del chat =====
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"sent" | "pending" | null>(null);
  const [messageId, setMessageId] = useState<string | null>(null);
  const [conversationId, setConvId] = useState<string | null>(null);
  const [lang, setLangState] = useState<string>("es");
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [myConversations, setMyConversations] = useState<ConversationSummary[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);

  // ===== Estado UX de reservas (local) =====
  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);

  // ===== Refs y a11y =====
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const textareaId = useId();
  const selectLangId = useId();
  const liveRegionRef = useRef<HTMLDivElement>(null);

  // ===== Efectos =====
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Carga inicial
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const convId = getConversationId();
    setConvId(convId);
    setActiveConv(convId);
    setLangState(getLang());

    // Helper: mapear mensajes de API a ChatTurn (role literal "user" | "ai")
    const mapApiToChatTurns = (msgs: NonNullable<APIMessagesResponse["messages"]>): ChatTurn[] =>
      msgs.map((msg) => ({
        role:
          msg.sender === "Usuario Web" || msg.sender === "Usuario" || msg.sender === "user"
            ? ("user" as const)
            : ("ai" as const),
        text: msg.content ?? msg.suggestion ?? "",
        timestamp: msg.timestamp,
        rich: msg.rich,
      }));

    // Historial
    if (convId) {
      (async () => {
        try {
          const res = await fetch(
            `/api/messages/by-conversation?channelId=web&conversationId=${convId}`,
            { signal, credentials: "same-origin" }
          );
          if (!res.ok) throw new Error("HTTP " + res.status);
          const data = (await res.json()) as APIMessagesResponse;
          if (Array.isArray(data.messages)) {
            const mapped: ChatTurn[] = mapApiToChatTurns(data.messages);
            setHistory(seedUXIfEmpty(mapped));
          } else {
            setHistory(seedUXIfEmpty([]));
          }
        } catch {
          if (!signal.aborted) setHistory(seedUXIfEmpty([]));
        }
      })();
    } else {
      setHistory(seedUXIfEmpty([]));
    }

    // Lista de conversaciones
    (async () => {
      try {
        const res = await fetch("/api/conversations/list", { signal, credentials: "same-origin" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = (await res.json()) as { conversations?: ConversationSummary[] };
        setMyConversations(Array.isArray(data.conversations) ? data.conversations : []);
      } catch {
        if (!signal.aborted) setMyConversations([]);
      }
    })();

    return () => controller.abort();
  }, []);

  // Sembrar UI de reservas si el historial está vacío o sin mensajes del asistente
  const seedUXIfEmpty = (base: ChatTurn[]): ChatTurn[] => {
    const hasAssistant = base.some((m) => m.role === "ai");
    if (hasAssistant || base.length > 0) return base;
    return [
      {
        role: "ai",
        text: "¡Hola! 👋 Soy tu asistente de reservas. ¿Qué te gustaría hacer?",
        timestamp: new Date().toISOString(),
        rich: { type: "quick-actions" },
      },
      {
        role: "ai",
        text: "Elegí fechas y huéspedes para ver disponibilidad.",
        timestamp: new Date().toISOString(),
        rich: { type: "dates" },
      },
      {
        role: "ai",
        text: "",
        timestamp: new Date().toISOString(),
        rich: { type: "guests" },
      },
      {
        role: "ai",
        text: "",
        timestamp: new Date().toISOString(),
        rich: { type: "handoff" },
      },
    ];
  };

  const handleLangChange = useCallback((newLang: string) => {
    setLang(newLang);
    setLangState(newLang);
  }, []);

  const handleSelectConversation = useCallback(async (convId: string) => {
    setConvId(convId);
    setActiveConv(convId);
    setConversationId(convId);

    const controller = new AbortController();
    const signal = controller.signal;

    try {
      const res = await fetch(
        `/api/messages/by-conversation?channelId=web&conversationId=${convId}`,
        { signal, credentials: "same-origin" }
      );
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = (await res.json()) as APIMessagesResponse;
      if (Array.isArray(data.messages)) {
        const mapped: ChatTurn[] = (data.messages ?? []).map((msg) => ({
          role:
            msg.sender === "Usuario Web" || msg.sender === "Usuario" || msg.sender === "user"
              ? ("user" as const)
              : ("ai" as const),
          text: msg.content ?? msg.suggestion ?? "",
          timestamp: msg.timestamp,
          rich: msg.rich,
        }));
        setHistory(seedUXIfEmpty(mapped));
      } else {
        setHistory(seedUXIfEmpty([]));
      }
    } catch {
      if (!signal.aborted) setHistory(seedUXIfEmpty([]));
    } finally {
      setQuery("");
      textareaRef.current?.focus();
    }
  }, []);

  const handleNewConversation = useCallback(async () => {
    if (conversationId) {
      try {
        await fetch("/api/conversations/close", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId }),
          credentials: "same-origin",
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
    setHistory(seedUXIfEmpty([]));
    textareaRef.current?.focus();

    setTimeout(() => {
      fetch("/api/conversations/list", { credentials: "same-origin" })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data: { conversations?: ConversationSummary[] }) =>
          setMyConversations(data.conversations ?? [])
        )
        .catch(() => setMyConversations([]));
    }, 200);
  }, [conversationId]);

  // ===== Envío de mensaje =====
  const sendQuery = useCallback(async () => {
    if (!query.trim() || loading) return;
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
          query,
          channel: "web",
          hotelId,
          conversationId: currentConversationId,
          lang: currentLang,
        }),
        credentials: "same-origin",
      });

      const textResp = await res.text();
      if (!res.ok) throw new Error(textResp || `HTTP ${res.status}`);

      let data: APIChatResponse | null = null;
      try {
        data = JSON.parse(textResp) as APIChatResponse;
      } catch {
        setHistory((h) => [
          ...h,
          { role: "ai", text: "⚠️ Respuesta inesperada del servidor.", timestamp: new Date().toISOString() },
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
          rich: data.rich, // si el backend envía UI enriquecida
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

      // refrescar lista de chats
      fetch("/api/conversations/list", { credentials: "same-origin" })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data: { conversations?: ConversationSummary[] }) =>
          setMyConversations(data.conversations ?? [])
        )
        .catch(() => {});
    } catch {
      setHistory((h) => [
        ...h,
        { role: "ai", text: "Error al obtener respuesta.", timestamp: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
      setQuery("");
    }
  }, [query, loading, hotelId]);

  // ===== Polling de aprobaciones (modo supervisado) =====
  useEffect(() => {
    if (status === "pending" && messageId) {
      if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);

      pollIntervalRef.current = window.setInterval(async () => {
        try {
          const res = await fetch(`/api/messages?channelId=web`, { credentials: "same-origin" });
          if (!res.ok) return;
          const data = (await res.json()) as APIMessagesResponse & { messages?: any[] };
          const updated = data.messages?.find((m: any) => m.messageId === messageId);

          if (updated?.status === "sent") {
            setStatus("sent");
            setHistory((h) => {
              const lastIndex = [...h].reverse().findIndex((m) => m.role === "ai");
              if (lastIndex === -1) return h;
              const idx = h.length - 1 - lastIndex;
              const updatedTurn = {
                ...h[idx],
                text: updated.approvedResponse ?? updated.suggestion ?? h[idx].text,
              };
              const copy = [...h];
              copy[idx] = updatedTurn;
              return copy;
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

  // ===== Accesos directos de teclado =====
  const onTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void sendQuery();
      }
    },
    [sendQuery]
  );

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      void sendQuery();
    },
    [sendQuery]
  );

  // ===== Helpers UX de reservas (local, texto plano al backend) =====
  const fmtDate = (iso: string) => {
    try {
      const d = new Date(iso + "T00:00:00");
      return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return iso;
    }
  };

  const composeFindText = () => {
    const parts = [
      "Reservar habitación",
      checkIn && checkOut ? `· ${fmtDate(checkIn)} → ${fmtDate(checkOut)}` : "",
      `· ${adults} adulto${adults !== 1 ? "s" : ""}`,
      children ? `, ${children} niño${children !== 1 ? "s" : ""}` : "",
    ].filter(Boolean);
    return parts.join(" ");
  };

  const sendTextAndAppend = async (text: string) => {
    // Enviar como si lo hubiese escrito el usuario, para no tocar /api/chat
    setHistory((h) => [...h, { role: "user", text, timestamp: new Date().toISOString() }]);
    setQuery("");
    // No bloqueamos con loading global (flujo rápido); llamamos backend igualmente
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          channel: "web",
          hotelId,
          conversationId: getConversationId() ?? undefined,
          lang: getLang(),
        }),
        credentials: "same-origin",
      }).then(async (res) => {
        const raw = await res.text();
        if (!res.ok) throw new Error(raw || `HTTP ${res.status}`);
        let data: APIChatResponse | null = null;
        try {
          data = JSON.parse(raw) as APIChatResponse;
        } catch {}
        if (data?.conversationId) {
          setConversationId(data.conversationId);
          setConvId(data.conversationId);
          setActiveConv(data.conversationId);
        }
        if (data?.response) {
          setHistory((h) => [
            ...h,
            {
              role: "ai",
              text: typeof data.response === "string" ? data.response : JSON.stringify(data.response, null, 2),
              timestamp: new Date().toISOString(),
              rich: data.rich,
            },
          ]);
        }
      });
    } catch {
      setHistory((h) => [
        ...h,
        { role: "ai", text: "No pude enviar tu solicitud ahora mismo.", timestamp: new Date().toISOString() },
      ]);
    }
  };

  const handleFindAvailability = async () => {
    const text = composeFindText();
    await sendTextAndAppend(text);

    // Sembrar UI local de rooms (mock visual). Cuando el backend entregue rooms reales,
    // puede responder con { rich: { type: 'room-cards', data: [...] } } y no usamos el mock.
    setHistory((h) => [
      ...h,
      {
        role: "ai",
        text: "Estas son las opciones disponibles para tus fechas:",
        timestamp: new Date().toISOString(),
        rich: { type: "room-cards", data: mockRooms() },
      },
    ]);
  };

  const handleSelectRoom = async (roomCode: string) => {
    const text = `Seleccionar habitación · ${roomCode} · ${fmtDate(checkIn)} → ${fmtDate(
      checkOut
    )} · ${adults} adultos${children ? `, ${children} niños` : ""}`;
    await sendTextAndAppend(text);
    setHistory((h) => [
      ...h,
      {
        role: "ai",
        text: "¿Querés agregar desayuno y late check-out?",
        timestamp: new Date().toISOString(),
        rich: { type: "upsell", data: { options: ["Desayuno", "Late check-out"] } },
      },
    ]);
  };

  const handleUpsell = async (accepted: boolean) => {
    const text = accepted ? "Upsell: sí" : "Upsell: no";
    await sendTextAndAppend(text);
    setHistory((h) => [
      ...h,
      {
        role: "ai",
        text: "Perfecto. ¿Confirmo la reserva y avanzo con el pago?",
        timestamp: new Date().toISOString(),
        rich: { type: "quick-actions", data: { actions: ["Confirmar y pagar", "Editar fechas"] } },
      },
    ]);
  };

  const handleQuick = async (label: string) => {
    if (label === "Buscar disponibilidad") {
      await handleFindAvailability();
      return;
    }
    await sendTextAndAppend(label);
  };

  const mockRooms = () => [
    {
      code: "DBL-STD",
      name: "Doble Estándar",
      price: 120,
      currency: "USD",
      perks: ["Wi-Fi", "A/A", "TV"],
      img: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=800&auto=format&fit=crop",
      refundable: true,
    },
    {
      code: "DBL-SUP",
      name: "Doble Superior",
      price: 155,
      currency: "USD",
      perks: ["Vista ciudad", "Cafetera", "Wi-Fi"],
      img: "https://images.unsplash.com/photo-1622015663315-0f5d5c65512d?q=80&w=800&auto=format&fit=crop",
      refundable: false,
    },
  ];

  // ===== Render =====
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6 transition-colors">
      <header className="mb-4 w-full max-w-lg">
        <h1 className="text-3xl font-bold">💬 Chat con IA</h1>
      </header>

      {/* Mis conversaciones */}
      <nav aria-label="Mis conversaciones" className="w-full max-w-lg mb-4">
        <h2 className="text-lg font-semibold mb-2">Mis conversaciones</h2>
        {myConversations.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay chats previos.</p>
        )}
        <ul className="space-y-1" role="list">
          {myConversations.map((c) => (
            <li key={c.conversationId}>
              <button
                type="button"
                className={`text-left w-full px-2 py-1 rounded border transition ${
                  activeConv === c.conversationId
                    ? "bg-blue-200 font-bold border-blue-400"
                    : "hover:bg-blue-100 border"
                }`}
                onClick={() => handleSelectConversation(c.conversationId)}
                aria-current={activeConv === c.conversationId ? "true" : undefined}
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

      {/* Bloque de chat */}
      <main className="w-full max-w-lg bg-muted p-4 shadow-md rounded-lg border border-border" aria-busy={loading || undefined}>
        <div ref={liveRegionRef} className="sr-only" aria-live="polite" aria-atomic="false">
          {status === "pending" ? "Mensaje enviado, en revisión." : loading ? "Enviando…" : "Listo."}
        </div>

        {/* Historial */}
        <section
          className="mb-4 max-h-[340px] overflow-y-auto flex flex-col gap-2"
          style={{ minHeight: 120 }}
          aria-label="Historial del chat"
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
              {msg.text ? (
                <ReactMarkdown
                  components={{
                    a: (props) => <a {...props} target="_blank" rel="nofollow noopener noreferrer" />,
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
              ) : null}

              {/* Render de UI enriquecida */}
              {msg.rich?.type === "quick-actions" && (
                <QuickActions onClick={handleQuick} actions={msg.rich?.data?.actions} />
              )}

              {msg.rich?.type === "dates" && (
                <DatesInline
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onCheckIn={setCheckIn}
                  onCheckOut={setCheckOut}
                  onFind={handleFindAvailability}
                />
              )}

              {msg.rich?.type === "guests" && (
                <GuestsPicker
                  adults={adults}
                  children={children}
                  setAdults={setAdults}
                  setChildren={setChildren}
                />
              )}

              {msg.rich?.type === "room-cards" && (
                <RoomsCarousel rooms={msg.rich.data} onSelect={handleSelectRoom} />
              )}

              {msg.rich?.type === "upsell" && (
                <Upsell options={msg.rich.data?.options ?? []} onAnswer={handleUpsell} />
              )}

              {msg.rich?.type === "handoff" && <HandoffBar />}

              <time className="block mt-1 text-[10px] opacity-60" dateTime={new Date(msg.timestamp).toISOString()}>
                {new Date(msg.timestamp).toLocaleString()}
              </time>
            </article>
          ))}
          <div ref={chatEndRef} />
        </section>

        {/* Formulario */}
        <form onSubmit={onSubmit} noValidate aria-label="Enviar mensaje">
          <div className="flex flex-col gap-2">
            <label htmlFor={textareaId} className="text-sm font-medium">Mensaje</label>
            <textarea
              id={textareaId}
              ref={textareaRef}
              className="w-full border border-border bg-background text-foreground p-2 rounded-md focus:ring-2 focus:ring-blue-500 outline-none transition"
              rows={3}
              placeholder="Escribí tu pregunta..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onTextareaKeyDown}
              disabled={loading}
              aria-disabled={loading || undefined}
            />

            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition disabled:opacity-60"
              disabled={loading}
              aria-label={loading ? "Enviando" : "Preguntar"}
            >
              {loading ? "Pensando..." : "Preguntar"}
            </button>

            <button
              type="button"
              className="w-full bg-gray-200 text-gray-900 p-2 rounded-md border border-gray-300 hover:bg-gray-300 transition"
              onClick={handleNewConversation}
              disabled={loading}
            >
              Nueva conversación
            </button>

            <div className="mt-2">
              <label className="mr-2" htmlFor={selectLangId}>Idioma:</label>
              <select
                id={selectLangId}
                value={lang}
                onChange={(e) => handleLangChange(e.target.value)}
                className="border p-1 rounded"
                disabled={loading}
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

/* ================== Subcomponentes UI de reservas ================== */

function QuickActions({
  onClick,
  actions,
}: {
  onClick: (label: string) => void;
  actions?: string[];
}) {
  const base = actions && actions.length ? actions : ["Buscar disponibilidad", "Ver servicios", "Hablar con humano"];
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {base.map((a) => (
        <button
          key={a}
          onClick={() => onClick(a)}
          className="px-3 py-1 rounded-full text-sm border hover:bg-gray-50"
          type="button"
        >
          {a}
        </button>
      ))}
    </div>
  );
}

function DatesInline({
  checkIn,
  checkOut,
  onCheckIn,
  onCheckOut,
  onFind,
}: {
  checkIn: string;
  checkOut: string;
  onCheckIn: (v: string) => void;
  onCheckOut: (v: string) => void;
  onFind: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <div className="flex flex-col">
        <label className="text-xs text-gray-500">Check-in</label>
        <input
          type="date"
          min={today}
          className="border rounded p-1"
          value={checkIn}
          onChange={(e) => onCheckIn(e.target.value)}
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-gray-500">Check-out</label>
        <input
          type="date"
          min={checkIn || today}
          className="border rounded p-1"
          value={checkOut}
          onChange={(e) => onCheckOut(e.target.value)}
        />
      </div>
      <button onClick={onFind} className="ml-1 px-3 py-2 rounded bg-blue-600 text-white" type="button">
        Buscar disponibilidad
      </button>
    </div>
  );
}

function GuestsPicker({
  adults,
  children,
  setAdults,
  setChildren,
}: {
  adults: number;
  children: number;
  setAdults: (n: number) => void;
  setChildren: (n: number) => void;
}) {
  return (
    <div className="mt-2 flex items-center gap-4">
      <Counter label="Adultos" value={adults} setValue={setAdults} min={1} />
      <Counter label="Niños" value={children} setValue={setChildren} min={0} />
    </div>
  );
}

function Counter({
  label,
  value,
  setValue,
  min = 0,
}: {
  label: string;
  value: number;
  setValue: (n: number) => void;
  min?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">{label}</span>
      <button
        type="button"
        className="px-2 py-1 border rounded"
        onClick={() => setValue(Math.max(min, value - 1))}
        aria-label={`Quitar ${label}`}
      >
        −
      </button>
      <span className="w-6 text-center" aria-live="polite">{value}</span>
      <button
        type="button"
        className="px-2 py-1 border rounded"
        onClick={() => setValue(value + 1)}
        aria-label={`Agregar ${label}`}
      >
        +
      </button>
    </div>
  );
}

function RoomsCarousel({
  rooms,
  onSelect,
}: {
  rooms: Array<{
    code: string;
    name: string;
    price: number;
    currency: string;
    perks: string[];
    img?: string;
    refundable?: boolean;
  }>;
  onSelect: (code: string) => void;
}) {
  return (
    <div className="mt-2 flex gap-3 overflow-x-auto pb-2">
      {rooms.map((r) => (
        <div key={r.code} className="min-w-[260px] border rounded-lg overflow-hidden bg-white shadow-sm">
          {r.img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.img} alt={r.name} className="w-full h-36 object-cover" />
          ) : null}
          <div className="p-3 space-y-2">
            <div className="font-medium">{r.name}</div>
            <div className="text-sm text-gray-600">
              {r.perks.join(" · ")} {r.refundable ? "· Cancelación flexible" : ""}
            </div>
            <div className="text-lg">
              {r.currency} {r.price}
              <span className="text-xs text-gray-500"> / noche</span>
            </div>
            <button
              onClick={() => onSelect(r.code)}
              className="w-full mt-1 rounded bg-blue-600 text-white py-2"
              type="button"
            >
              Reservar esta
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Upsell({
  options,
  onAnswer,
}: {
  options: string[];
  onAnswer: (accepted: boolean) => void;
}) {
  return (
    <div className="mt-2">
      <div className="text-sm text-gray-700 mb-2">Te puedo agregar: {options.join(" / ")}</div>
      <div className="flex gap-2">
        <button onClick={() => onAnswer(true)} className="px-3 py-2 rounded bg-blue-600 text-white" type="button">
          Sí, agregar
        </button>
        <button onClick={() => onAnswer(false)} className="px-3 py-2 rounded border" type="button">
          No, gracias
        </button>
      </div>
    </div>
  );
}

function HandoffBar() {
  return (
    <div className="mt-2 flex items-center gap-2 text-sm">
      <span className="text-gray-500">¿Preferís hablar con alguien?</span>
      <a
        className="underline"
        href="https://wa.me/59800000000?text=Hola%20quiero%20ayuda%20con%20una%20reserva"
        target="_blank"
        rel="noreferrer"
      >
        WhatsApp
      </a>
      <span className="text-gray-400">·</span>
      <a className="underline" href="tel:+59800000000">
        Llamar
      </a>
    </div>
  );
}
