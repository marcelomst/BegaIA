// Path: /root/begasist/components/admin/ChannelInbox.tsx
"use client";
import { useState, useEffect } from "react";
import type { ConversationSummary, Guest, ChatTurnWithMeta, CurationModel } from "@/types/channel";
import { fetchAllConversationsByChannel } from "@/utils/fetchAndOrderConversations";
import { fetchAndMapMessagesWithSubject } from "@/utils/fetchAndMapMessagesWithSubject";
import { fetchGuest } from "@/utils/fetchGuest";
import { shortGuestId } from "@/lib/utils/shortGuestId";
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

export default function ChannelInbox({ hotelId, channel, t, reloadFlag = 0, curationModel }: ChannelInboxProps) {
  if (!hotelId) {
    console.warn("⚠️ [ChannelInbox] hotelId no disponible aún. Esperando...");
    return null;
  }

  const [guests, setGuests] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Guest>>({});
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [messages, setMessages] = useState<ChatTurnWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [msgCounts, setMsgCounts] = useState<Record<string, number>>({});
  const [modalMsg, setModalMsg] = useState<{ original?: string; visible: boolean }>({ visible: false });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>("");

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
    setSubject(convs[0]?.subject ?? "");
  }, [selectedGuest, conversations, hotelId, profiles]);

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
    fetchAndMapMessagesWithSubject(channel, selectedConv!, hotelId).then(({ messages }) => {
      setMessages(messages);
      setEditingIdx(null);
      setEditingText("");
    });
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
            setSelectedConv={setSelectedConv}
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
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
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
