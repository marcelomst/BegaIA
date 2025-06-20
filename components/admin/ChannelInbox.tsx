// Path: /root/begasist/components/admin/ChannelInbox.tsx
"use client";

import { useState, useEffect } from "react";
import { User2, LoaderCircle, Plus, CheckCircle2, XCircle, Clock, Eye, Edit2 } from "lucide-react";
import type { ConversationSummary, Guest, GuestMode } from "@/types/channel";
import { fetchAllConversationsByChannel } from "@/utils/fetchAndOrderConversations";
import { fetchAndMapMessagesWithSubject } from "@/utils/fetchAndMapMessagesWithSubject";
import type { ChatTurnWithMeta } from "@/types/channel";
import { fetchGuest, saveGuest } from "@/utils/fetchGuest";
import { Switch } from "@/components/ui/switch";
import Image from "next/image"; // Importá esto arriba si usás imágenes

interface ChannelInboxProps {
  hotelId: string;
  channel: string;
  reloadFlag?: number;
}
const channelIconSrc: Record<string, string> = {
  web: "/icons/web.svg",
  whatsapp: "/icons/whatsapp.svg",
  email: "/icons/email.svg",
  channelManager: "/icons/channelManager.svg",
  unknown: "/icons/unknown.svg",
};

const channelLabel: Record<string, string> = {
  web: "Web",
  whatsapp: "WhatsApp",
  email: "Email",
  channelManager: "ChMgr",
  unknown: "Desconocido",
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  sent: (
    <span title="Enviado">
      <CheckCircle2 className="inline w-4 h-4 text-green-600" />
    </span>
  ),
  rejected: (
    <span title="Rechazado">
      <XCircle className="inline w-4 h-4 text-red-500" />
    </span>
  ),
  pending: (
    <span title="Pendiente">
      <Clock className="inline w-4 h-4 text-yellow-500" />
    </span>
  ),
  active: (
    <span title="Activa">
      <Clock className="inline w-4 h-4 text-yellow-500" />
    </span>
  ),
  closed: (
    <span title="Cerrada">
      <XCircle className="inline w-4 h-4 text-gray-400" />
    </span>
  ),
  archived: (
    <span title="Archivada">
      <XCircle className="inline w-4 h-4 text-gray-400" />
    </span>
  ),
};

function getChannelIconSrc(channel: string | undefined): string {
  return channelIconSrc[channel as keyof typeof channelIconSrc] || channelIconSrc.unknown;
}
function getChannelLabel(channel: string | undefined): string {
  return channelLabel[channel as keyof typeof channelLabel] || channelLabel.unknown;
}


// --- Edición de perfil guest ---
function GuestEditor({
  hotelId,
  guestId,
  onSaved,
}: {
  hotelId: string;
  guestId: string;
  onSaved?: () => void;
}) {
  const [profile, setProfile] = useState<Guest | null>(null);
  const [editName, setEditName] = useState("");
  const [editing, setEditing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGuest(hotelId, guestId).then((g) => {
      if (!g) {
        setProfile(null);
        setNotFound(true);
      } else {
        setProfile(g);
        setEditName(g?.name || "");
        setNotFound(false);
      }
    });
  }, [hotelId, guestId]);

  // --- Render si no existe el perfil
  if (notFound)
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        Perfil no existe.
        <button
          className="text-xs text-blue-600 underline"
          onClick={async () => {
            await saveGuest(hotelId, guestId, { name: "", mode: "automatic" });
            setNotFound(false);
            // Recargamos el perfil recién creado
            const g = await fetchGuest(hotelId, guestId);
            setProfile(g);
            setEditName(g?.name || "");
            onSaved?.();
          }}
        >
          Crear perfil
        </button>
      </div>
    );

  if (!profile)
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="animate-spin w-4 h-4" />
        Cargando perfil...
      </div>
    );

  // --- Handler para cambiar el modo con Switch
  async function handleToggleMode(newMode: GuestMode) {
    setSaving(true);
    await saveGuest(hotelId, guestId, { mode: newMode });
    const g = await fetchGuest(hotelId, guestId);
    setProfile(g);
    setSaving(false);
    onSaved?.();
  }

  return editing ? (
    <div className="flex items-center gap-2">
      <input
        className="border p-1 rounded text-xs"
        value={editName}
        placeholder="Nombre del guest"
        onChange={(e) => setEditName(e.target.value)}
      />
      <button
        className="text-blue-600 text-xs"
        onClick={async () => {
          setSaving(true);
          await saveGuest(hotelId, guestId, {
            name: editName,
          });
          setEditing(false);
          setSaving(false);
          onSaved?.();
        }}
        disabled={saving}
      >
        Guardar
      </button>
      <button
        className="text-gray-500 text-xs"
        onClick={() => setEditing(false)}
      >
        Cancelar
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-semibold">
        {profile.name && profile.name.trim().length > 0
          ? profile.name
          : shortId(guestId)}
      </span>
      {/* Switch para el modo */}
      <div className="flex items-center gap-1">
        <Switch
          checked={profile.mode === "supervised"}
          onCheckedChange={(checked) =>
            handleToggleMode(checked ? "supervised" : "automatic")
          }
          disabled={saving}
        />
      <span
        className={
          "flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold " +
          (profile.mode === "supervised"
            ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200"
            : "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200")
        }
      >
        {profile.mode === "supervised" ? (
          <>
            <span className="mr-1">🧍</span>Sup.
          </>
        ) : (
          <>
            <span className="mr-1">🧠</span>Aut.
          </>
        )}
      </span>

      </div>
      <button
        className="text-xs text-blue-500 ml-2 flex items-center gap-1"
        onClick={() => setEditing(true)}
        title="Editar guest"
      >
        <Edit2 className="w-4 h-4" />
        Editar
      </button>
    </div>
  );
}


function shortId(id: string | null | undefined) {
  if (!id) return "";
  if (id.length <= 8) return id;
  return `${id.slice(0, 3)}...${id.slice(-3)}`;
}

export default function ChannelInbox({ hotelId, channel, reloadFlag = 0 }: ChannelInboxProps) {
  const [guests, setGuests] = useState<string[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [messages, setMessages] = useState<ChatTurnWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [msgCounts, setMsgCounts] = useState<Record<string, number>>({});
  const [modalMsg, setModalMsg] = useState<{ original?: string; visible: boolean }>({ visible: false });
  const [selectedGuestProfile, setSelectedGuestProfile] = useState<Guest | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Para edición rápida del mensaje pendiente
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const channelIconSrc = {
    web: "/icons/web.svg", // o el emoji si preferís
    whatsapp: "/icons/whatsapp.svg",
    email: "/icons/email.svg",
    channelManager: "/icons/channelManager.svg",
  };



  // Carga de conversaciones
  useEffect(() => {
    fetchAllConversationsByChannel(hotelId, channel).then((convs) => {
      setConversations(convs);
      setGuests([
        ...new Set(convs.map((c) => c.guestId).filter((g): g is string => typeof g === "string")),
      ]);
      if (convs.length > 0) setSelectedGuest(convs[0].guestId ?? null);
    });
  }, [hotelId, channel, reloadFlag]);

  // Al cambiar guest: selecciona primera conversación y asunto
  useEffect(() => {
    if (!selectedGuest) return;
    fetchGuest(hotelId, selectedGuest).then(setSelectedGuestProfile);
    const convs = conversations.filter((c) => c.guestId === selectedGuest);
    setSelectedConv(convs[0]?.conversationId ?? null);
    setSubject(convs[0]?.subject ?? "");
  }, [selectedGuest, conversations]);

  // Carga de mensajes y actualización de badges
  useEffect(() => {
    if (!selectedConv) return;
    setLoading(true);
    fetchAndMapMessagesWithSubject(channel, selectedConv, hotelId)
      .then(({ messages, subject }) => {
        setMessages(messages);
        if (subject) setSubject(subject);
        setMsgCounts((prev) => ({ ...prev, [selectedConv]: messages.length }));
      })
      .finally(() => setLoading(false));
  }, [selectedConv, hotelId, channel, reloadFlag]);

  // Refresca los conteos de mensajes
  useEffect(() => {
    conversations.forEach((conv) => {
      if (!msgCounts[conv.conversationId]) {
        fetchAndMapMessagesWithSubject(channel, conv.conversationId, hotelId).then(({ messages }) => {
          setMsgCounts((prev) => ({ ...prev, [conv.conversationId]: messages.length }));
        });
      }
    });
    // eslint-disable-next-line
  }, [conversations, reloadFlag]);

  // Crear nueva conversación vacía para el guest actual
  async function handleNewConversation() {
    if (!selectedGuest) return;
    const res = await fetch("/api/conversations/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelId,
        guestId: selectedGuest,
        channel,
        subject: "Nueva conversación",
        lang: "es",
      }),
    });
    if (res.ok) {
      fetchAllConversationsByChannel(hotelId, channel).then((convs) => {
        setConversations(convs);
        if (convs[0]?.guestId === selectedGuest) {
          setSelectedConv(convs[0].conversationId);
        }
      });
    }
  }

  // Enviar edición de mensaje pendiente
  async function handleSendEdit(msg: ChatTurnWithMeta, idx: number) {
    // Ejemplo mínimo: POST a /api/messages con mensaje actualizado
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageId: msg.messageId,
        approvedResponse: editingText,
        status: "sent",
        channel,
      }),
    });
    // Refrescar mensajes
    fetchAndMapMessagesWithSubject(channel, selectedConv!, hotelId).then(({ messages }) => {
      setMessages(messages);
      setEditingIdx(null);
      setEditingText("");
    });
  }

  // ----------------- JSX Render principal -----------------
  return (
    <div className="flex h-[80vh] bg-background rounded-lg border border-border overflow-hidden">
      {/* Sidebar de guests */}
      <aside className={`transition-all duration-200 ${sidebarOpen ? "w-56" : "w-0"} bg-muted border-r p-2 flex flex-col ${sidebarOpen ? "" : "overflow-hidden"}`}>
        <div className="flex items-center mb-2 font-semibold text-base px-2">
          <span className="flex-1">Guests</span>
          <button
            className="ml-2 p-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-600"
            title={sidebarOpen ? "Ocultar sidebar" : "Mostrar sidebar"}
            onClick={() => setSidebarOpen((o) => !o)}
          >
            {sidebarOpen ? "←" : "→"}
          </button>
        </div>
        {sidebarOpen && (
          <div className="flex-1 overflow-y-auto">
            {guests.map((guest) => (
              <div
                key={guest}
                role="button"
                tabIndex={0}
                className={`w-full flex items-center gap-2 px-2 py-2 mb-1 rounded ${guest === selectedGuest
                    ? "bg-blue-200 dark:bg-primary/20 font-semibold"
                    : "hover:bg-blue-50 dark:hover:bg-primary/10"
                  }`}
                onClick={() => setSelectedGuest(guest)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setSelectedGuest(guest); }}
              >
                <User2 className="w-4 h-4 shrink-0" />
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  {/* Nombre fijo y truncado */}
                  <span className="font-semibold truncate w-32 block">
                    <GuestEditor
                      hotelId={hotelId}
                      guestId={guest}
                      onSaved={() => {}}
                    />
                  </span>
                  {/* Switch y badge modo con width fija */}
                  {/* (GuestEditor ya tiene switch y badge, si querés separarlo, extraelo aquí) */}
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>
      {/* Panel de conversaciones del guest seleccionado */}
      <main className="flex-1 flex flex-col">
        {/* Solapas de conversaciones */}
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted">
          <span className="font-semibold">Conversaciones con guest:</span>
          <span className="italic text-blue-600 dark:text-primary">
            {selectedGuestProfile?.name && selectedGuestProfile.name.trim().length > 0
              ? selectedGuestProfile.name
              : shortId(selectedGuest)}
          </span>
          <div className="flex gap-1 ml-4 flex-wrap">
            {conversations
              .filter((c) => c.guestId === selectedGuest)
              .map((c) => { 
                
                return(
                <button
                  key={c.conversationId}
                  className={`relative px-3 py-1 rounded-t transition border-b-2 text-xs font-medium flex items-center gap-1
                    ${
                      selectedConv === c.conversationId
                        ? "border-blue-500 bg-white dark:bg-zinc-900 text-blue-800 dark:text-primary"
                        : "border-transparent bg-muted/70 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-primary/10"
                    }
                  `}
                  onClick={() => {
                    setSelectedConv(c.conversationId);
                    setSubject(c.subject ?? "");
                  }}
                  title={c.subject ?? "Sin asunto"}
                >
                  {(c.subject && c.subject !== "") ? c.subject : "Sin asunto"}
                  {/* Etiqueta del canal */}
                  <span className="ml-2 flex items-center gap-1 text-xs rounded px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700">
                    <img
                      src={getChannelIconSrc(c.channel)}
                      alt={c.channel ?? "unknown"}
                      className="w-4 h-4 inline"
                    />
                    {getChannelLabel(c.channel)}
                  </span>
                  <span className="ml-1">{STATUS_ICON[c.status || "active"]}</span>
                  <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                    {msgCounts[c.conversationId] ?? ""}
                  </span>
                </button>
              )})}

            {/* Solapa "Nueva" */}
            <button
              className="flex items-center gap-1 px-3 py-1 rounded-t bg-muted/70 border-b-2 border-transparent hover:bg-blue-50 dark:hover:bg-primary/10 text-xs text-gray-500"
              onClick={handleNewConversation}
              title="Nueva conversación"
            >
              <Plus className="w-4 h-4" /> Nueva
            </button>
          </div>
        </div>
        {/* Cabecera de asunto */}
        <div className="p-4 border-b">
          <span className="font-bold text-base">Asunto:</span>{" "}
          <span className="px-2 py-1 rounded-full bg-muted text-primary font-semibold shadow-sm border border-border">
            {subject || "Sin asunto"}
          </span>
        </div>
        {/* Historial de mensajes */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
          {loading && (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <LoaderCircle className="animate-spin mr-2" /> Cargando...
            </div>
          )}
          {!loading &&
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={
                  msg.role === "user"
                    ? "self-end px-3 py-2 rounded-lg max-w-[70%] bg-blue-100 text-blue-900 dark:bg-blue-700 dark:text-white"
                    : "self-start px-3 py-2 rounded-lg max-w-[80%] bg-gray-100 text-gray-900 dark:bg-zinc-800 dark:text-white"
                }
                title={msg.timestamp}
              >
                {/* USER */}
                {msg.role === "user" ? (
                  msg.text
                ) : (
                  // ASISTENTE/RECEPCIONISTA
                  <>
                    {/* Si está editando y es pendiente */}
                    {msg.status === "pending" && editingIdx === idx ? (
                      <>
                        <textarea
                          className="w-full rounded border p-1 text-sm mb-2"
                          rows={2}
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                        />
                        <div className="flex gap-2 text-xs">
                          <button
                            className="text-green-600 font-bold"
                            onClick={() => handleSendEdit(msg, idx)}
                          >
                            Enviar
                          </button>
                          <button
                            className="text-gray-500"
                            onClick={() => {
                              setEditingIdx(null);
                              setEditingText("");
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Mensaje aprobado o sugerido */}
                        <span>
                          {msg.approvedResponse ??
                            msg.suggestion ??
                            msg.text}
                        </span>
                        {/* Si el canal es supervisado y el sugerido difiere del aprobado, opción para ver original */}
                        {msg.suggestion &&
                          msg.approvedResponse &&
                          msg.suggestion !== msg.approvedResponse && (
                            <button
                              className="ml-2 text-xs text-blue-600 underline flex items-center gap-1"
                              onClick={() =>
                                setModalMsg({ original: msg.suggestion, visible: true })
                              }
                            >
                              <Eye className="w-4 h-4 inline" /> Ver original
                            </button>
                          )}
                        {/* Si está pendiente y no está editando, botón editar/enviar */}
                        {msg.status === "pending" && editingIdx !== idx && (
                          <button
                            className="ml-2 text-xs text-yellow-700 underline"
                            onClick={() => {
                              setEditingIdx(idx);
                              setEditingText(msg.approvedResponse ?? msg.suggestion ?? msg.text);
                            }}
                          >
                            Editar y enviar
                          </button>
                        )}
                      </>
                    )}
                    {/* Estado y respondedor */}
                    <div className="mt-2 flex flex-wrap gap-3 items-center text-xs text-muted-foreground">
                      {msg.status && (
                        <span
                          className={
                            msg.status === "sent"
                              ? "inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 font-semibold"
                              : msg.status === "pending"
                              ? "inline-flex items-center px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 font-semibold"
                              : msg.status === "rejected"
                              ? "inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 font-semibold"
                              : "inline-flex items-center px-2 py-0.5 rounded bg-gray-200 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300 font-semibold"
                          }
                        >
                          {msg.status === "sent"
                            ? "✅ Enviado"
                            : msg.status === "pending"
                            ? "🕓 Pendiente"
                            : msg.status === "rejected"
                            ? "❌ Rechazado"
                            : msg.status}
                        </span>
                      )}
                      {msg.respondedBy && (
                        <span className="inline-block ml-2">
                          <span className="text-muted-foreground">Respondido por:</span>{" "}
                          <b>{msg.respondedBy}</b>
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
        </div>

        {/* Modal "Ver original" */}
        {modalMsg.visible && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 min-w-[340px] max-w-lg relative">
              <button
                className="absolute top-2 right-2 text-gray-600 dark:text-gray-300"
                onClick={() => setModalMsg({ visible: false })}
              >
                ✖
              </button>
              <h3 className="font-bold mb-2 text-lg">Mensaje original sugerido</h3>
              <div className="p-2 rounded border bg-muted text-foreground">{modalMsg.original}</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
