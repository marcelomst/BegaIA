// Path: /root/begasist/components/admin/ChatPage.tsx
// Integración de UI/UX de reservas en el chat existente.
// - Mantiene las mejoras previas de accesibilidad/seguridad.
// - No agrega dependencias nuevas.
// - Semilla UI local (quick actions, fechas, huéspedes, handoff) sin romper el backend.
// - Cuando tu backend devuelva "rich" oficialmente, ya hay render listo.

"use client";

import React, { useEffect, useState, useRef, useCallback, useId } from "react";
import ReactMarkdown from "react-markdown";
import { useSearchParams } from "next/navigation";
import { suggestRoomIcon } from "@/lib/rooms/roomIcons";
import type { RichPayload } from "@/types/richPayload";
import {
  clearGuestPendingTurn,
  clearGuestConversationBundle,
  confirmGuestPendingTurn,
  discoverGuestPendingTurn,
  getGuestConversationBundle,
  getGuestConversationBundleStatus,
  getLang,
  prepareGuestPendingTurn,
  setGuestPendingTurnStatus,
  setLang,
  setGuestConversationBundle,
  type GuestConversationSessionBundle,
  type GuestPendingTurn,
} from "@/utils/conversationSession";

const UNCERTAIN_TURN_NOTICE = "El envío anterior no pudo confirmarse. No lo reenvíes ni inicies otro turno; recargá el historial o contactá a recepción.";

// ===== Tipos de red (sin cambios de contrato) =====
type APIMessagesResponse = {
  messages?: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    messageId?: string;
    status?: "sent" | "pending";
    approvedResponse?: string;
    // opcional futuro: rich desde backend
    rich?: RichPayload;
  }>;
};

type APIChatResponse = {
  response?: string | unknown;
  status?: "sent" | "pending" | "reconciliation_required";
  code?: string;
  continuationAvailable?: boolean;
  messageId?: string;
  conversationId?: string;
  lang?: string;
  // opcional futuro: payload enriquecido
  rich?: RichPayload;
};

type BootstrapResponse = {
  ok?: boolean;
  capability?: string;
  conversationId: string;
  hotelId: string;
  expiresAt: string;
};

type ChatTurn = {
  role: "user" | "ai";
  text: string;
  timestamp: string;
  // UI enriquecida local o devuelta por backend
  rich?: RichPayload;
};

// ===== Componente principal =====
export default function ChatPage() {
  const searchParams = useSearchParams();
  const hotelId = searchParams?.get("hotelId") ?? "";

  // ===== Estado base del chat =====
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"sent" | "pending" | null>(null);
  const [lang, setLangState] = useState<string>("es");
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [pendingTurn, setPendingTurn] = useState<GuestPendingTurn | null>(null);

  // ===== Estado UX de reservas (local) =====
  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);

  // ===== Refs y a11y =====
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const bootstrapPromiseRef = useRef<Promise<GuestConversationSessionBundle> | null>(null);
  const pendingTurnRef = useRef<GuestPendingTurn | null>(null);
  const textareaId = useId();
  const selectLangId = useId();
  const liveRegionRef = useRef<HTMLDivElement>(null);

  // ===== Efectos =====
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  const bootstrapConversation = useCallback((): Promise<GuestConversationSessionBundle> => {
    if (bootstrapPromiseRef.current) return bootstrapPromiseRef.current;
    const pending = (async () => {
      if (!hotelId) throw new Error("hotelId is required");
      const res = await fetch("/api/guest/web/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId, lang: getLang() }),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as Partial<BootstrapResponse>;
      if (!res.ok || !data.capability || !data.conversationId || !data.expiresAt || data.hotelId !== hotelId) {
        throw new Error("Guest conversation bootstrap failed");
      }
      const bundle: GuestConversationSessionBundle = {
        version: 1,
        hotelId,
        conversationId: data.conversationId,
        capability: data.capability,
        expiresAt: data.expiresAt,
      };
      setGuestConversationBundle(bundle);
      setSessionNotice(null);
      return bundle;
    })();
    bootstrapPromiseRef.current = pending;
    void pending.then(
      () => { if (bootstrapPromiseRef.current === pending) bootstrapPromiseRef.current = null; },
      () => { if (bootstrapPromiseRef.current === pending) bootstrapPromiseRef.current = null; },
    );
    return pending;
  }, [hotelId]);

  const currentOrNewBundle = useCallback(async () => {
    const existing = getGuestConversationBundle(hotelId);
    if (existing) return existing;
    if (sessionNotice) throw new Error("Guest conversation must be restarted explicitly");
    return bootstrapConversation();
  }, [bootstrapConversation, hotelId, sessionNotice]);

  // Carga inicial
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    setLangState(getLang());
    (async () => {
      let recoveredPending: GuestPendingTurn | null = null;
      try {
        recoveredPending = discoverGuestPendingTurn(hotelId);
        if (recoveredPending) {
          pendingTurnRef.current = recoveredPending;
          setPendingTurn(recoveredPending);
          setSessionNotice(UNCERTAIN_TURN_NOTICE);
        }
        const bundleStatus = getGuestConversationBundleStatus(hotelId);
        if (recoveredPending && bundleStatus !== "valid") {
          if (bundleStatus === "expired" || bundleStatus === "invalid") {
            clearGuestConversationBundle();
          }
          setHistory(seedUXIfEmpty([{
            role: "user",
            text: recoveredPending.text,
            timestamp: recoveredPending.preparedAt,
          }]));
          return;
        }
        if (bundleStatus === "expired" || bundleStatus === "invalid") {
          clearGuestConversationBundle();
          setSessionNotice("La conversación anterior ya no puede recuperarse. Iniciá una nueva conversación.");
          setHistory(seedUXIfEmpty([]));
          return;
        }
        const existing = getGuestConversationBundle(hotelId);
        if (recoveredPending && existing?.conversationId !== recoveredPending.conversationId) {
          if (existing) clearGuestConversationBundle();
          setHistory(seedUXIfEmpty([{
            role: "user",
            text: recoveredPending.text,
            timestamp: recoveredPending.preparedAt,
          }]));
          return;
        }
        const bundle = existing ?? await bootstrapConversation();
        if (signal.aborted) return;
        if (!existing) {
          setHistory(seedUXIfEmpty([]));
          return;
        }
        const res = await fetch("/api/guest/web/history", {
          signal,
          credentials: "same-origin",
          headers: { Authorization: `Bearer ${bundle.capability}` },
        });
        if (res.status === 401 || res.status === 403) {
          clearGuestConversationBundle();
          if (recoveredPending) {
            setSessionNotice(UNCERTAIN_TURN_NOTICE);
            setHistory(seedUXIfEmpty([{
              role: "user",
              text: recoveredPending.text,
              timestamp: recoveredPending.preparedAt,
            }]));
          } else {
            setSessionNotice("La conversación anterior ya no puede recuperarse. Iniciá una nueva conversación.");
            setHistory(seedUXIfEmpty([]));
          }
          return;
        }
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = (await res.json()) as APIMessagesResponse;
        const mapped: ChatTurn[] = (data.messages ?? []).map((msg) => ({
          role: msg.role === "user" ? "user" : "ai",
          text: msg.content,
          timestamp: msg.timestamp,
          rich: msg.rich,
        }));
        if (
          recoveredPending &&
          !mapped.some((turn) => turn.role === "user" && turn.text === recoveredPending?.text)
        ) {
          mapped.push({
            role: "user",
            text: recoveredPending.text,
            timestamp: recoveredPending.preparedAt,
          });
        }
        setHistory(seedUXIfEmpty(mapped));
      } catch {
        if (!signal.aborted) {
          setSessionNotice(recoveredPending ? UNCERTAIN_TURN_NOTICE : "No fue posible iniciar o recuperar el chat en este momento.");
          setHistory(seedUXIfEmpty([]));
        }
      }
    })();

    return () => controller.abort();
  }, [bootstrapConversation, hotelId]);

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

  const handleNewConversation = useCallback(async () => {
    if (pendingTurn) return;
    clearGuestConversationBundle();
    setStatus(null);
    setQuery("");
    setSessionNotice(null);
    setHistory(seedUXIfEmpty([]));
    try {
      await bootstrapConversation();
    } catch {
      setSessionNotice("No fue posible iniciar una nueva conversación en este momento.");
    } finally {
      textareaRef.current?.focus();
    }
  }, [bootstrapConversation, pendingTurn]);

  // ===== Envío de mensaje =====
  const sendGuestText = useCallback(async (rawText: string) => {
    const text = rawText.trim();
    if (!text || loading || pendingTurnRef.current) return;
    setLoading(true);
    setStatus(null);

    let activeTurn: GuestPendingTurn | null = null;
    try {
      const bundle = await currentOrNewBundle();
      activeTurn = prepareGuestPendingTurn({
        hotelId: bundle.hotelId,
        conversationId: bundle.conversationId,
        text,
      });
      activeTurn = setGuestPendingTurnStatus(activeTurn, "sending");
      pendingTurnRef.current = activeTurn;
      setPendingTurn(activeTurn);
      const displayedTurn = activeTurn;
      setHistory((current) => [
        ...current,
        { role: "user", text: displayedTurn.text, timestamp: displayedTurn.preparedAt },
      ]);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bundle.capability}`,
        },
        body: JSON.stringify({
          query: activeTurn.text,
          channel: "web",
          hotelId,
          conversationId: bundle.conversationId,
          messageId: activeTurn.messageId,
          lang: getLang(),
        }),
        credentials: "same-origin",
      });

      const textResp = await res.text();
      let data: APIChatResponse | null = null;
      try {
        data = JSON.parse(textResp) as APIChatResponse;
      } catch {}

      if (res.status === 401 || res.status === 403) {
        clearGuestPendingTurn(activeTurn);
        activeTurn = null;
        pendingTurnRef.current = null;
        setPendingTurn(null);
        clearGuestConversationBundle();
        setSessionNotice("La conversación anterior ya no puede recuperarse. Iniciá una nueva conversación.");
        return;
      }

      const uncertain =
        res.status === 202 ||
        res.status >= 500 ||
        !data ||
        data.status === "reconciliation_required" ||
        data.code === "guest_turn_already_recorded" ||
        data.continuationAvailable === false;
      if (uncertain) {
        activeTurn = setGuestPendingTurnStatus(activeTurn, "uncertain");
        pendingTurnRef.current = activeTurn;
        setPendingTurn(activeTurn);
        setSessionNotice(UNCERTAIN_TURN_NOTICE);
        return;
      }
      if (!data) throw new Error("Guest turn response is unavailable");

      if (!res.ok) {
        clearGuestPendingTurn(activeTurn);
        activeTurn = null;
        pendingTurnRef.current = null;
        setPendingTurn(null);
        setHistory((current) => [
          ...current,
          { role: "ai", text: "La solicitud fue rechazada y no se enviará nuevamente.", timestamp: new Date().toISOString() },
        ]);
        return;
      }

      confirmGuestPendingTurn(activeTurn);
      activeTurn = null;
      pendingTurnRef.current = null;
      setPendingTurn(null);
      setSessionNotice(null);

      const responseText = typeof data.response === "string" ? data.response : "";
      if (data.status === "sent" || data.status === "pending") setStatus(data.status);
      const guestVisibleText = data.status === "pending"
        ? "🕓 Tu consulta fue enviada. Un recepcionista está revisando tu solicitud..."
        : responseText;
      if (guestVisibleText) {
        setHistory((current) => [
          ...current,
          {
            role: "ai",
            text: guestVisibleText,
            timestamp: new Date().toISOString(),
            rich: data.rich,
          },
        ]);
      }

      if (data.lang) {
        setLang(data.lang);
        setLangState(data.lang);
      }
    } catch {
      if (activeTurn) {
        try {
          activeTurn = setGuestPendingTurnStatus(activeTurn, "uncertain");
        } catch {}
        pendingTurnRef.current = activeTurn;
        setPendingTurn(activeTurn);
        setSessionNotice(UNCERTAIN_TURN_NOTICE);
      } else {
        setHistory((current) => [
          ...current,
          { role: "ai", text: "No fue posible iniciar el envío.", timestamp: new Date().toISOString() },
        ]);
      }
    } finally {
      setLoading(false);
      setQuery("");
    }
  }, [loading, hotelId, currentOrNewBundle]);

  const sendQuery = useCallback(async () => {
    await sendGuestText(query);
  }, [query, sendGuestText]);

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
    await sendGuestText(text);
  };

  const handleFindAvailability = async () => {
    const text = composeFindText();
    await sendTextAndAppend(text);
  };

  const handleSelectRoom = async (roomCode: string) => {
    const text = `Seleccionar habitación · ${roomCode} · ${fmtDate(checkIn)} → ${fmtDate(
      checkOut
    )} · ${adults} adultos${children ? `, ${children} niños` : ""}`;
    await sendTextAndAppend(text);
  };

  const handleUpsell = async (accepted: boolean) => {
    const text = accepted ? "Upsell: sí" : "Upsell: no";
    await sendTextAndAppend(text);
  };

  const handleQuick = async (label: string) => {
    if (label === "Buscar disponibilidad") {
      await handleFindAvailability();
      return;
    }
    await sendTextAndAppend(label);
  };

  // ===== Render =====
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6 transition-colors">
      <header className="mb-4 w-full max-w-lg">
        <h1 className="text-3xl font-bold">💬 Chat con IA</h1>
      </header>

      {sessionNotice && (
        <p className="mb-4 w-full max-w-lg rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="status">
          {sessionNotice}
        </p>
      )}

      {/* Bloque de chat */}
      <main className="w-full max-w-lg bg-muted p-4 shadow-md rounded-lg border border-border" aria-busy={loading || undefined}>
        <div ref={liveRegionRef} className="sr-only" aria-live="polite" aria-atomic="false">
          {status === "pending" ? "Mensaje enviado, en revisión." : loading ? "Enviando…" : "Listo."}
        </div>

        {/* Historial */}
        <section
          className={`mb-4 max-h-[340px] overflow-y-auto flex flex-col gap-2 ${pendingTurn ? "pointer-events-none opacity-80" : ""}`}
          style={{ minHeight: 120 }}
          aria-label="Historial del chat"
          aria-disabled={Boolean(pendingTurn) || undefined}
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

              {Array.isArray((msg.rich as any)?.carousel) && (msg.rich as any).carousel.length > 0 && (
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {(msg.rich as any).carousel.map((item: any, idx: number) => (
                    <div key={idx} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                      {item?.images?.[0]?.url && (
                        <img
                          src={item.images[0].url}
                          alt={item.images[0].alt || item.title || "imagen"}
                          className="h-32 w-full object-cover"
                        />
                      )}
                      <div className="p-2">
                        {item?.title && <div className="text-sm font-semibold">{item.title}</div>}
                        {item?.subtitle && <div className="text-xs text-slate-500">{item.subtitle}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

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

              {msg.rich?.type === "room-info-img" && (
                <RoomInfoGallery items={Array.isArray(msg.rich.data) ? msg.rich.data : []} />
              )}

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
              disabled={loading || Boolean(sessionNotice)}
              aria-disabled={loading || Boolean(sessionNotice) || undefined}
            />

            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition disabled:opacity-60"
              disabled={loading || Boolean(sessionNotice)}
              aria-label={loading ? "Enviando" : "Preguntar"}
            >
              {loading ? "Pensando..." : "Preguntar"}
            </button>

            <button
              type="button"
              className="w-full bg-gray-200 text-gray-900 p-2 rounded-md border border-gray-300 hover:bg-gray-300 transition"
              onClick={handleNewConversation}
              disabled={loading || Boolean(pendingTurn)}
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
    icon?: string;
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
            <div className="font-medium flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">{r.icon || suggestRoomIcon(r.name)}</span>
              <span>{r.name}</span>
            </div>
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

// Galería para promptKey "room_info_img": icono/emoji, highlights y carrusel de imágenes
function RoomInfoGallery({
  items,
}: {
  items: Array<{
    type?: string; // nombre del tipo de habitación
    icon?: string; // emoji o pequeño texto
    highlights?: string[]; // bullets
    images?: string[]; // urls
  }>;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-2 space-y-3">
      {items.map((it, idx) => (
        <div key={idx} className="border rounded-lg bg-white shadow-sm overflow-hidden">
          {/* Header con icono y nombre */}
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            {(it.icon || it.type) ? (
              <span className="text-xl" aria-hidden="true">{it.icon || suggestRoomIcon(it.type || "")}</span>
            ) : null}
            <div className="font-medium">
              {it.type || "Habitación"}
            </div>
          </div>

          {/* Carrusel simple con scroll-snap, sin dependencias */}
          {Array.isArray(it.images) && it.images.length > 0 ? (
            <div className="relative">
              <div className="flex gap-2 overflow-x-auto pb-2 px-2 scroll-smooth snap-x snap-mandatory">
                {it.images.map((src, i) => (
                  <div key={i} className="min-w-[240px] max-w-[320px] snap-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={(it.type || "Habitación") + ` ${i + 1}`}
                      className="w-full h-40 object-cover rounded-md border"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Highlights */}
          {Array.isArray(it.highlights) && it.highlights.length > 0 ? (
            <ul className="px-4 py-3 list-disc list-inside text-sm text-gray-700">
              {it.highlights.map((h, j) => (
                <li key={j}>{h}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}
