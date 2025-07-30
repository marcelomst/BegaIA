"use client";
import React from "react";
import { Plus, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { ConversationSummary } from "@/types/channel";

const STATUS_ICON: Record<string, React.ReactNode> = {
  sent: <CheckCircle2 className="inline w-4 h-4 text-green-600" />,
  rejected: <XCircle className="inline w-4 h-4 text-red-500" />,
  pending: <Clock className="inline w-4 h-4 text-yellow-500" />,
  active: <Clock className="inline w-4 h-4 text-yellow-500" />,
  closed: <XCircle className="inline w-4 h-4 text-gray-400" />,
  archived: <XCircle className="inline w-4 h-4 text-gray-400" />,
};

function getChannelIconSrc(channel: string | undefined): string {
  const channelIconSrc: Record<string, string> = {
    web: "/icons/web.svg",
    whatsapp: "/icons/whatsapp.svg",
    email: "/icons/email.svg",
    channelManager: "/icons/channelManager.svg",
    unknown: "/icons/unknown.svg",
  };
  return channelIconSrc[channel as keyof typeof channelIconSrc] || channelIconSrc.unknown;
}

interface Props {
  conversations: ConversationSummary[];
  selectedConv: string | null;
  setSelectedConv: (id: string) => void;
  subject: string;
  setSubject: (s: string) => void;
  selectedGuest: string | null;
  channel: string;
  msgCounts: Record<string, number>;
  t: any;
  onNewConversation: () => void;
}

const ConversationsTabs: React.FC<Props> = ({
  conversations,
  selectedConv,
  setSelectedConv,
  subject,
  setSubject,
  selectedGuest,
  channel,
  msgCounts,
  t,
  onNewConversation,
}) => {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted">
      <span className="font-semibold">{t.channelInbox?.convsWithGuest || "Conversaciones con guest:"}</span>
      <div className="flex gap-1 ml-4 flex-wrap">
        {conversations
          .filter((c) => c.guestId === selectedGuest)
          .map((c) => (
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
              title={c.subject ?? (t.channelInbox?.noSubject || "Sin asunto")}
            >
              {(c.subject && c.subject !== "") ? c.subject : (t.channelInbox?.noSubject || "Sin asunto")}
              <span className="ml-2 flex items-center gap-1 text-xs rounded px-2 py-0.5 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700">
                <img
                  src={getChannelIconSrc(c.channel)}
                  alt={c.channel ?? "unknown"}
                  className="w-4 h-4 inline"
                />
                {t.sidebar?.[(c.channel ?? "unknown")] || t.sidebar?.unknown || c.channel || "unknown"}
              </span>
              <span className="ml-1">{STATUS_ICON[c.status || "active"]}</span>
              <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                {msgCounts[c.conversationId] ?? ""}
              </span>
            </button>
          ))}
        <button
          className="flex items-center gap-1 px-3 py-1 rounded-t bg-muted/70 border-b-2 border-transparent hover:bg-blue-50 dark:hover:bg-primary/10 text-xs text-gray-500"
          onClick={onNewConversation}
          title={t.channelInbox?.newConv || "Nueva conversación"}
        >
          <Plus className="w-4 h-4" /> {t.channelInbox?.newConv || "Nueva"}
        </button>
      </div>
    </div>
  );
};

export default ConversationsTabs;
