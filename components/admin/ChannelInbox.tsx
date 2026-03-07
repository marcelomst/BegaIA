// Path: /root/begasist/components/admin/ChannelInbox.tsx
"use client";
import { useState, useEffect } from "react";
import type { ConversationSummary, Guest, ChatTurnWithMeta, CurationModel } from "@/types/channel";
import { fetchAllConversationsByChannel } from "@/utils/fetchAndOrderConversations";
import { fetchAndMapMessagesWithSubject } from "@/utils/fetchAndMapMessagesWithSubject";
import { fetchGuest } from "@/utils/fetchGuest";
import { shortGuestId } from "@/lib/utils/shortGuestId";
import { useCurrentUser } from "@/lib/context/UserContext";
import GuestProfileModal from "./GuestProfileModal";
import MessageBubble from "./MessageBubble";
import ConversationsTabs from "./ConversationsTabs";
import { User2, Edit2 } from "lucide-react";

interface ChannelInboxProps {
  hotelId: string;
  channel: string;
  t: any;
  reloadFlag?: number;
  curationModel?: CurationModel;
}

type PendingItem = {
  messageId: string;
  conversationId?: string | null;
  guestId?: string | null;
  approvedResponse?: string | null;
  suggestion?: string | null;
  content?: string | null;
  ageMinutes: number;
  breach: boolean;
};

type AdminGuestProfile = {
  guestId: string;
  guest: Guest | null;
  aliases: string[];
  channels: string[];
  conversationCount: number;
  lastActivityAt: string | null;
};

export default function ChannelInbox({ hotelId, channel, t, reloadFlag = 0, curationModel }: ChannelInboxProps) {
  const { user } = useCurrentUser();
  if (!hotelId) {
    console.warn("⚠️ [ChannelInbox] hotelId no disponible aún. Esperando...");
    return null;
  }

  const [guests, setGuests] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Guest>>({});
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [selectedConvChannel, setSelectedConvChannel] = useState<string>(channel);
  const [subject, setSubject] = useState("");
  const [messages, setMessages] = useState<ChatTurnWithMeta[]>([]);
  const [snapshot, setSnapshot] = useState<{
    guestName?: string;
    roomType?: string;
    checkIn?: string;
    checkOut?: string;
    numGuests?: string | number;
    code?: string;
    channel?: string;
    createdAt?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [msgCounts, setMsgCounts] = useState<Record<string, number>>({});
  const [pendingList, setPendingList] = useState<PendingItem[]>([]);
  const [modalMsg, setModalMsg] = useState<{ original?: string; visible: boolean }>({ visible: false });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [guestProfile, setGuestProfile] = useState<AdminGuestProfile | null>(null);

  // Cargar conversaciones y perfiles al iniciar
  useEffect(() => {
    fetchAllConversationsByChannel(hotelId, channel).then((convs) => {
      setConversations(convs);
      const guestIds = [
        ...new Set(convs.map((c) => c.guestId).filter((g): g is string => typeof g === "string")),
      ];
      setGuests(guestIds);

      guestIds.forEach(gid => {
        if (!profiles[gid]) {
          fetchGuest(hotelId, gid).then(p => {
            if (p) setProfiles(prev => ({ ...prev, [p.guestId]: p }));
          });
        }
      });

      if (convs.length > 0) setSelectedGuest(convs[0].guestId ?? null);
    });
  }, [hotelId, channel, reloadFlag]);

  useEffect(() => {
    if (!selectedGuest) return;
    if (!profiles[selectedGuest]) {
      fetchGuest(hotelId, selectedGuest).then((g) => {
        if (g) setProfiles((prev) => ({ ...prev, [g.guestId]: g }));
      });
    }
    const convs = conversations.filter((c) => c.guestId === selectedGuest);
    setSelectedConv(convs[0]?.conversationId ?? null);
    setSelectedConvChannel(convs[0]?.channel ?? channel);
    setSubject(convs[0]?.subject ?? "");
  }, [selectedGuest, conversations, hotelId, profiles]);

  useEffect(() => {
    if (!selectedGuest) {
      setGuestProfile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/guest-profile?hotelId=${encodeURIComponent(hotelId)}&guestId=${encodeURIComponent(selectedGuest)}`,
          { credentials: "same-origin" },
        );
        if (!res.ok) {
          if (!cancelled) setGuestProfile(null);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setGuestProfile({
            guestId: String(data?.guestId ?? selectedGuest),
            guest: (data?.guest ?? null) as Guest | null,
            aliases: Array.isArray(data?.aliases) ? data.aliases : [],
            channels: Array.isArray(data?.channels) ? data.channels : [],
            conversationCount: Number.isFinite(data?.conversationCount) ? data.conversationCount : 0,
            lastActivityAt: typeof data?.lastActivityAt === "string" ? data.lastActivityAt : null,
          });
        }
      } catch {
        if (!cancelled) setGuestProfile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hotelId, selectedGuest, reloadFlag]);

  useEffect(() => {
    if (!selectedConv) return;
    const convChannel =
      conversations.find((c) => c.conversationId === selectedConv)?.channel ||
      selectedConvChannel ||
      channel;
    setLoading(true);
    fetchAndMapMessagesWithSubject(convChannel, selectedConv, hotelId)
      .then(({ messages, subject }) => {
        setMessages(messages);
        if (subject) setSubject(subject);
        setMsgCounts((prev) => ({ ...prev, [selectedConv]: messages.length }));
      })
      .finally(() => setLoading(false));
  }, [selectedConv, selectedConvChannel, hotelId, channel, conversations, reloadFlag]);

  useEffect(() => {
    if (channel !== "whatsapp") {
      setPendingList([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/messages/pending?hotelId=${encodeURIComponent(hotelId)}&channel=${encodeURIComponent(channel)}`,
          { credentials: "same-origin" },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setPendingList(Array.isArray(data?.pending) ? data.pending : []);
        }
      } catch {
        if (!cancelled) setPendingList([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hotelId, channel, reloadFlag, selectedConv, messages.length]);

  // Cargar snapshot de reserva (si existe) para mostrar encabezado
  useEffect(() => {
    if (!selectedConv) return;
    (async () => {
      try {
        const res = await fetch(`/api/conversations/state?hotelId=${encodeURIComponent(hotelId)}&conversationId=${encodeURIComponent(selectedConv)}`);
        if (!res.ok) {
          setSnapshot(null);
          return;
        }
        const data = await res.json();
        const slots = data?.reservationSlots || {};
        const code = data?.lastReservation?.reservationId;
        const channel = data?.lastReservation?.channel;
        const createdAt = data?.lastReservation?.createdAt;
        const hasConfirmed = Boolean(code);
        if (hasConfirmed) {
          setSnapshot({
            guestName: slots.guestName,
            roomType: slots.roomType,
            checkIn: slots.checkIn,
            checkOut: slots.checkOut,
            numGuests: slots.numGuests,
            code,
            channel,
            createdAt,
          });
        } else {
          setSnapshot(null);
        }
      } catch {
        setSnapshot(null);
      }
    })();
  }, [selectedConv, hotelId, reloadFlag]);

  useEffect(() => {
    conversations.forEach((conv) => {
      if (!msgCounts[conv.conversationId]) {
        fetchAndMapMessagesWithSubject(channel, conv.conversationId, hotelId).then(({ messages }) => {
          setMsgCounts((prev) => ({ ...prev, [conv.conversationId]: messages.length }));
        });
      }
    });
  }, [conversations, reloadFlag]);

  function handleProfileSaved(newProfile: Guest) {
    setProfiles(prev => ({ ...prev, [newProfile.guestId]: newProfile }));
  }

  async function handleNewConversation() {
    if (!selectedGuest) return;
    const res = await fetch("/api/conversations/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelId,
        guestId: selectedGuest,
        channel,
        subject: t.channelInbox?.newConv || "Nueva conversación",
        lang: t.lang || "es",
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

  async function handleSendEdit(msg: ChatTurnWithMeta, idx: number) {
    const payload = channel === "whatsapp"
      ? {
          action: "approve_and_send",
          messageId: msg.messageId,
          approvedResponse: editingText,
          channel,
          respondedBy: user?.email,
          to: msg.guestId,
        }
      : {
          messageId: msg.messageId,
          approvedResponse: editingText,
          status: "sent",
          channel,
          respondedBy: user?.email,
        };

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err?.error || "No se pudo enviar el mensaje");
      return;
    }
    fetchAndMapMessagesWithSubject(channel, selectedConv!, hotelId).then(({ messages }) => {
      setMessages(messages);
      setEditingIdx(null);
      setEditingText("");
    });
  }

  async function handleApproveSendPending(item: PendingItem) {
    const text = item.approvedResponse || item.suggestion || item.content || "";
    if (!text) return;
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "approve_and_send",
        messageId: item.messageId,
        approvedResponse: text,
        channel: "whatsapp",
        respondedBy: user?.email,
        to: item.guestId || undefined,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err?.error || "No se pudo enviar el pendiente");
      return;
    }
    if (selectedConv) {
      fetchAndMapMessagesWithSubject(channel, selectedConv, hotelId).then(({ messages }) => {
        setMessages(messages);
      });
    }
    const pendingRes = await fetch(
      `/api/messages/pending?hotelId=${encodeURIComponent(hotelId)}&channel=whatsapp`,
      { credentials: "same-origin" },
    );
    if (pendingRes.ok) {
      const data = await pendingRes.json().catch(() => ({}));
      setPendingList(Array.isArray(data?.pending) ? data.pending : []);
    }
  }

  return (
    <main className="flex-1 flex flex-col">
      <div className="flex h-[80vh] bg-background rounded-lg border border-border overflow-hidden">
        <aside className="w-56 bg-muted border-r p-2 flex flex-col">
          <div className="flex items-center mb-2 font-semibold text-base px-2">
            <span className="flex-1">{t.channelInbox?.guestsLabel || "Guests"}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {guests.map((guest) => {
              const isActive = guest === selectedGuest;
              const profile = profiles[guest];
              const displayName = profile?.name?.trim()?.length
                ? (profile.name.length > 16 ? profile.name.slice(0, 15) + "…" : profile.name)
                : shortGuestId(guest, channel);
              const mode = profile?.mode || "automatic";
              const modeIcon = mode === "supervised"
                ? <span title="Sup." className="text-yellow-700 dark:text-yellow-200 mr-1">🖍</span>
                : <span title="Aut." className="text-green-700 dark:text-green-200 mr-1">🧠</span>;

              return (
                <div
                  key={guest}
                  role="button"
                  tabIndex={0}
                  className={`w-full flex items-center gap-2 px-2 py-2 mb-1 rounded ${isActive
                    ? "bg-blue-200 dark:bg-primary/20 font-semibold"
                    : "hover:bg-blue-50 dark:hover:bg-primary/10"}`}
                  onClick={() => setSelectedGuest(guest)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setSelectedGuest(guest); }}
                >
                  {modeIcon}
                  <User2 className="w-4 h-4 shrink-0" />
                  <span className="font-semibold truncate max-w-[90px] block">{displayName}</span>
                  <button
                    className="ml-auto text-blue-500 hover:text-blue-700 p-1 rounded"
                    title={t.channelInbox?.editGuest || "Editar perfil del guest"}
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedGuest(guest);
                      setShowEditModal(true);
                    }}
                    tabIndex={0}
                    type="button"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
      <ConversationsTabs
        conversations={conversations}
        selectedConv={selectedConv}
        setSelectedConv={(id) => {
          setSelectedConv(id);
          const conv = conversations.find((c) => c.conversationId === id);
          setSelectedConvChannel(conv?.channel ?? channel);
        }}
        subject={subject}
        setSubject={setSubject}
        selectedGuest={selectedGuest}
            channel={channel}
            msgCounts={msgCounts}
            t={t}
            onNewConversation={handleNewConversation}
          />
          <div className="p-4 border-b">
            <span className="font-bold text-base">{t.channelInbox?.subjectLabel || "Asunto:"}</span>{" "}
            <span className="px-2 py-1 rounded-full bg-muted text-primary font-semibold shadow-sm border border-border">
              {subject || (t.channelInbox?.noSubject || "Sin asunto")}
            </span>
          </div>
          {selectedGuest && guestProfile && (
            <div className="mx-4 mt-4 border border-border rounded-md p-3 bg-muted/30 text-sm">
              <div><span className="font-semibold">Guest ID:</span> {guestProfile.guestId}</div>
              <div><span className="font-semibold">Aliases:</span> {guestProfile.aliases.length ? guestProfile.aliases.join(", ") : "-"}</div>
              <div><span className="font-semibold">Channels:</span> {guestProfile.channels.length ? guestProfile.channels.join(", ") : "-"}</div>
              <div><span className="font-semibold">Conversations:</span> {guestProfile.conversationCount}</div>
              <div><span className="font-semibold">Last activity:</span> {guestProfile.lastActivityAt ? new Date(guestProfile.lastActivityAt).toLocaleString() : "-"}</div>
              <div><span className="font-semibold">Mode:</span> {guestProfile.guest?.mode || "-"}</div>
              <div><span className="font-semibold">Created at:</span> {guestProfile.guest?.createdAt ? new Date(guestProfile.guest.createdAt).toLocaleString() : "-"}</div>
              <div><span className="font-semibold">Updated at:</span> {guestProfile.guest?.updatedAt ? new Date(guestProfile.guest.updatedAt).toLocaleString() : "-"}</div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
            {channel === "whatsapp" && pendingList.length > 0 && (
              <div className="border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 rounded p-3 text-sm">
                <div className="font-semibold mb-2">Pendientes WhatsApp: {pendingList.length}</div>
                <div className="space-y-2">
                  {pendingList.slice(0, 8).map((p) => (
                    <div key={p.messageId} className="flex items-center gap-2">
                      <span className="font-mono text-xs">#{p.messageId.slice(0, 8)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${p.breach ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>
                        {p.ageMinutes} min
                      </span>
                      {p.breach && <span className="text-xs text-red-600 font-semibold">SLA breach</span>}
                      <button
                        className="ml-auto px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 text-xs"
                        onClick={() => handleApproveSendPending(p)}
                      >
                        Aprobar y enviar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {snapshot && (
              <div className="border border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 text-blue-900 dark:text-blue-100 rounded p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold">Reserva confirmada</div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs"
                      title="Copiar código"
                      onClick={() => snapshot.code && navigator.clipboard.writeText(snapshot.code)}
                    >
                      Copiar código
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
                  <div><span className="text-muted-foreground">Nombre:</span> {snapshot.guestName || "-"}</div>
                  <div><span className="text-muted-foreground">Habitación:</span> {snapshot.roomType || "-"}</div>
                  <div><span className="text-muted-foreground">Código:</span> {snapshot.code || "-"}</div>
                  <div><span className="text-muted-foreground">Check-in:</span> {snapshot.checkIn || "-"}</div>
                  <div><span className="text-muted-foreground">Check-out:</span> {snapshot.checkOut || "-"}</div>
                  <div><span className="text-muted-foreground">Huéspedes:</span> {snapshot.numGuests || "-"}</div>
                  <div><span className="text-muted-foreground">Canal:</span> {snapshot.channel || "-"}</div>
                  <div><span className="text-muted-foreground">Creada:</span> {snapshot.createdAt ? new Date(snapshot.createdAt).toLocaleString() : "-"}</div>
                </div>
              </div>
            )}
            {loading && (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                Cargando...
              </div>
            )}
            {!loading && messages.map((msg, idx) => (
              <MessageBubble
                key={idx}
                msg={msg}
                idx={idx}
                isEmail={channel === "email"}
                subject={subject}
                editingIdx={editingIdx}
                editingText={editingText}
                onEdit={setEditingIdx}
                onChangeEdit={setEditingText}
                onSendEdit={handleSendEdit}
                onCancelEdit={() => {
                  setEditingIdx(null);
                  setEditingText("");
                }}
                onViewOriginal={(original: string) => setModalMsg({ original, visible: true })}
                t={t}
              />
            ))}
          </div>
          {modalMsg.visible && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 min-w-[340px] max-w-lg relative">
                <button
                  className="absolute top-2 right-2 text-gray-600 dark:text-gray-300"
                  onClick={() => setModalMsg({ visible: false })}
                >
                  ✖
                </button>
                <h3 className="font-bold mb-2 text-lg">{t.channelInbox?.originalMsgTitle || "Mensaje original sugerido"}</h3>
                <div className="p-2 rounded border bg-muted text-foreground">{modalMsg.original}</div>
              </div>
            </div>
          )}
          <GuestProfileModal
            open={showEditModal}
            hotelId={hotelId}
            guestId={selectedGuest || ""}
            profile={selectedGuest ? profiles[selectedGuest] || null : null}
            onClose={() => setShowEditModal(false)}
            onSaved={handleProfileSaved}
          />
        </main>
      </div>
    </main>
  );
}
