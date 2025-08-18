// Path: /root/begasist/components/admin/ChatPage.tsx
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
} from "../../utils/conversationSession";
import { getOrCreateGuestId } from "../../utils/guestSession";
import type { ChatTurn, ConversationSummary } from "../../types/channel";
import { fetchConversationsByChannelAndGuest } from "../../utils/fetchAndOrderConversations";
import { fetchAndMapMessagesWithSubject } from "../../utils/fetchAndMapMessagesWithSubject";
import { getDictionary } from "../../lib/i18n/getDictionary";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const hotelId = searchParams?.get("hotelId") ?? "";
  const channel = searchParams?.get("channel") ?? "web";

  // Usar getLang() como valor inicial, para sincronizar con storage.
  const [lang, setLangState] = useState<string>(() => getLang() || "es");
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"sent" | "pending" | null>(null);
  const [messageId, setMessageId] = useState<string | null>(null);
  const [conversationId, setConvId] = useState<string | null>(null);
  const [dictionary, setDictionary] = useState<any>({});
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [myConversations, setMyConversations] = useState<ConversationSummary[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [pendingNewConversation, setPendingNewConversation] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const guestId = typeof window !== "undefined" ? getOrCreateGuestId() : "";

  // Cargar diccionario al montar y cuando cambia lang
  useEffect(() => {
    getDictionary(lang).then((dict: Record<string, any>) => {
      setDictionary(dict);
      // Debug log opcional:
      console.log("Dictionary loaded for language:", lang, dict);
    });
  }, [lang]);

  // Scroll automático al final
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  // Al montar: cargar conversación actual, idioma y chats previos
  useEffect(() => {
    const convId = getConversationId();
    setConvId(convId);
    setActiveConv(convId);
    setLangState(getLang() || "es");

    fetchConversationsByChannelAndGuest(hotelId, guestId, channel)
      .then((ordered) => setMyConversations(ordered))
      .catch(() => setMyConversations([]));

    if (!convId) return;

    fetchConversationsByChannelAndGuest(hotelId, guestId, channel).then((ordered) => {
      const existe = ordered.some((c) => c.conversationId === convId);
      if (!existe) {
        resetConversationSession();
        setConvId(null);
        setActiveConv(null);
        setSubject("");
        setHistory([]);
        return;
      }
    });

    fetchAndMapMessagesWithSubject(channel, convId, hotelId)
      .then(({ messages, subject }) => {
        setHistory(messages);
        setSubject(subject ?? "");
      })
      .catch(() => setHistory([]));
  }, []);

  // Nuevo useEffect para actualizar subject cuando cargan las conversaciones
  useEffect(() => {
    if (!conversationId) return;
    const convData = myConversations.find((c) => c.conversationId === conversationId);
    setSubject(convData?.subject ?? "");
  }, [myConversations, conversationId]);

  function handleLangChange(newLang: string) {
    setLang(newLang);        // Guarda en storage (localStorage/cookie)
    setLangState(newLang);   // Actualiza React state y dispara el useEffect([lang])
  }

  async function handleSelectConversation(conversationId: string) {
    setConvId(conversationId);
    setActiveConv(conversationId);
    setConversationId(conversationId);
    setPendingNewConversation(false);

    const { messages, subject: newSubject } = await fetchAndMapMessagesWithSubject(
      channel,
      conversationId,
      hotelId
    );
    setHistory(messages);
    setSubject(newSubject ?? "");

    const convData = myConversations.find((c) => c.conversationId === conversationId);
    setSubject(convData?.subject ?? "");
    setQuery("");
    textareaRef.current?.focus();
  }

  const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubject(e.target.value);

    if (conversationId && e.target.value !== undefined) {
      setMyConversations((prev) =>
        prev.map((c) =>
          c.conversationId === conversationId
            ? { ...c, subject: e.target.value }
            : c
        )
      );
    }
  };

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
    setConvId(null);
    setActiveConv(null);
    setStatus(null);
    setMessageId(null);
    setQuery("");
    setSubject("");
    setLangState("es");
    setLang("es");
    setHistory([]);
    setPendingNewConversation(true);
    textareaRef.current?.focus();

    setTimeout(() => {
      fetchConversationsByChannelAndGuest(hotelId, guestId, channel)
        .then((ordered) => setMyConversations(ordered))
        .catch(() => setMyConversations([]));
    }, 200);
  }

  const sendQuery = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setStatus(null);
    setMessageId(null);

    setHistory((h) => [
      ...h,
      { role: "user", text: query, timestamp: new Date().toISOString() },
    ]);

    const useConversationId = pendingNewConversation ? undefined : getConversationId() || undefined;
    const currentLang = getLang();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query,
          channel: channel,
          hotelId: hotelId,
          conversationId: useConversationId,
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
            text: dictionary?.errors?.serverError || "⚠️ Error del servidor o la ruta no existe. Consulta el backend.",
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
              : dictionary?.chat?.pendingResponse ||
                "🕓 Tu consulta fue enviada. Un recepcionista está revisando tu solicitud...",
          timestamp: new Date().toISOString(),
        },
      ]);

      if (data.conversationId) {
        setConversationId(data.conversationId);
        setConvId(data.conversationId);
        setActiveConv(data.conversationId);
        setPendingNewConversation(false);
      }
      if (data.lang) {
        setLang(data.lang);
        setLangState(data.lang);
      }
      fetchConversationsByChannelAndGuest(hotelId, guestId, channel)
        .then((ordered) => setMyConversations(ordered))
        .catch(() => setMyConversations([]));
    } catch (error) {
      setHistory((h) => [
        ...h,
        {
          role: "ai",
          text: dictionary?.errors?.generic || "Error al obtener respuesta.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      setQuery("");
    }
  };

  useEffect(() => {
    if (status === "pending" && messageId) {
      const interval = setInterval(async () => {
        const res = await fetch(`/api/messages?channelId=${channel}`);
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
  }, [status, messageId, channel]);

  // Para evitar render antes de tener el diccionario cargado:
  if (!dictionary?.chat) return null;

  // -------- JSX Render --------
  return (
    <div className="flex flex-col items-center min-h-screen bg-background text-foreground p-0 transition-colors">

      {/* Cabecera Fija */}
      <div className="w-full max-w-lg sticky top-0 bg-background/95 z-20 pb-2 pt-6 px-6" style={{ backdropFilter: "blur(4px)" }}>
        <h1 className="text-3xl font-bold mb-0">{dictionary.chat.title}</h1>
      </div>

      {/* Contenedor principal */}
      <div className="w-full max-w-lg flex flex-col gap-4 px-6">

        {/* Mis conversaciones (cabecera fija + lista scrollable) */}
        <div className="relative">
          <div className="sticky top-[64px] bg-background/90 z-10 pb-2 pt-3">
            <h2 className="text-lg font-semibold mb-0">{dictionary.chat.myConversations}</h2>
          </div>
          <div
            className="overflow-y-auto max-h-[140px] border-b border-border"
            style={{ minHeight: 44 }}
          >
            {myConversations.length === 0 && (
              <div className="text-sm text-muted-foreground p-2">{dictionary.chat.noPreviousChats}</div>
            )}
            <ul className="space-y-1">
              {myConversations.map((c) => (
                <li key={c.conversationId}>
                  <button
                    className={`text-left w-full px-2 py-1 rounded border transition ${
                      activeConv === c.conversationId
                        ? "bg-blue-200 font-bold border-blue-400 dark:bg-primary/10 dark:border-primary"
                        : "hover:bg-blue-100 border dark:hover:bg-primary/10"
                    }`}
                    onClick={() => handleSelectConversation(c.conversationId)}
                  >
                    <span className="ml-2 text-sm font-semibold italic text-blue-700 dark:text-primary">
                      {c.subject?.trim() ? c.subject : dictionary.chat.noSubject}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">{c.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bloque de chat principal */}
        <div className="w-full bg-muted p-4 shadow-md rounded-lg border border-border flex flex-col gap-2">

          {/* Mostrar asunto editable */}
          <div className="mb-2 text-base font-bold flex items-center gap-2">
            <span className="text-muted-foreground">{dictionary.chat.subjectLabel}</span>
            <input
              type="text"
              className="px-2 py-1 rounded-full bg-muted text-primary font-semibold shadow-sm border border-border w-full max-w-xs"
              placeholder={dictionary.chat.noSubject}
              value={subject}
              onChange={handleSubjectChange}
              disabled={loading}
              maxLength={100}
              autoComplete="off"
            />
          </div>

          {/* Chat History (scrollable) */}
          <div
            className="mb-2 max-h-[340px] overflow-y-auto flex flex-col gap-2"
            style={{ minHeight: 120 }}
          >
            {history.map((msg, idx) => (
              <div
                key={idx}
                className={
                  msg.role === "user"
                    ? "self-end px-3 py-2 rounded-lg max-w-[70%] bg-blue-100 text-blue-900 dark:bg-blue-700 dark:text-white"
                    : "self-start px-3 py-2 rounded-lg max-w-[80%] bg-gray-100 text-gray-900 dark:bg-zinc-800 dark:text-white"
                }
                title={msg.timestamp}
              >
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <textarea
            ref={textareaRef}
            className="w-full border border-border p-2 rounded-md focus:ring-2 focus:ring-primary outline-none transition
              bg-white text-black dark:bg-zinc-900 dark:text-white
              placeholder:text-gray-500 dark:placeholder:text-gray-400"
            rows={3}
            placeholder={dictionary.chat.placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />

          <button
            className="w-full bg-blue-600 dark:bg-primary text-white dark:text-background p-2 mt-3 rounded-md hover:bg-blue-700 dark:hover:bg-primary/90 transition"
            onClick={sendQuery}
            disabled={loading}
          >
            {loading ? dictionary.chat.thinking : dictionary.chat.ask}
          </button>

          <button
            className="w-full bg-gray-200 dark:bg-muted text-gray-900 dark:text-foreground p-2 mt-2 rounded-md border border-gray-300 dark:border-border hover:bg-gray-300 dark:hover:bg-muted/80 transition"
            onClick={handleNewConversation}
            disabled={loading}
          >
            {dictionary.chat.newConversation}
          </button>

          <div className="mt-2">
            <label className="mr-2">{dictionary.chat.languageLabel}</label>
            <select
              value={lang}
              onChange={(e) => handleLangChange(e.target.value)}
              className="border p-1 rounded bg-background text-foreground"
            >
              <option value="es">{dictionary.chat.lang_es}</option>
              <option value="en">{dictionary.chat.lang_en}</option>
              <option value="pt">{dictionary.chat.lang_pt}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
