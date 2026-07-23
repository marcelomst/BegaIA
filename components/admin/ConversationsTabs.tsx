"use client";
import React from "react";
import { Plus, CheckCircle2, XCircle, Clock, MessageSquare, TriangleAlert } from "lucide-react";
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
  setSubject: (s: string) => void;
  selectedGuest: string | null;
  msgCounts: Record<string, number>;
  t: any;
  onNewConversation: () => void;
  pendingConversationIds?: Set<string>;
}

function fmtRelativeLabel(value?: string | null): string {
  if (!value) return "Sin actividad";
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return value;
  const diffMin = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `Hace ${diffHour} h`;
  const diffDay = Math.round(diffHour / 24);
  return `Hace ${diffDay} d`;
}

const ConversationsTabs: React.FC<Props> = ({
  conversations,
  selectedConv,
  setSelectedConv,
  setSubject,
  selectedGuest,
  msgCounts,
  t,
  onNewConversation,
  pendingConversationIds = new Set<string>(),
}) => {
  const guestConversations = conversations.filter((c) => c.guestId === selectedGuest);

  return (
    <div className="border-b bg-muted/40">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Conversaciones
          </div>
          <div className="text-xs text-muted-foreground">
            {guestConversations.length} para este huésped
          </div>
        </div>
        <button
          className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-gray-600 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-primary/10"
          onClick={onNewConversation}
          title={t.channelInbox?.newConv || "Nueva conversación"}
        >
          <Plus className="w-4 h-4" /> {t.channelInbox?.newConv || "Nueva conversación"}
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto px-3 pb-2">
        {guestConversations.map((c) => (
            <button
              key={c.conversationId}
              className={`relative flex min-w-[190px] max-w-[240px] shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-left text-xs font-medium transition
                ${
                  selectedConv === c.conversationId
                    ? "border-blue-500 bg-white dark:bg-zinc-900 text-blue-800 dark:text-primary shadow-sm ring-1 ring-blue-200 dark:ring-blue-900/40"
                    : "border-border bg-background/80 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-primary/10"
                }
              `}
              onClick={() => {
                setSelectedConv(c.conversationId);
                setSubject(c.subject ?? "");
              }}
              title={c.subject ?? (t.channelInbox?.noSubject || "Sin asunto")}
              aria-pressed={selectedConv === c.conversationId}
              aria-label={`Seleccionar conversación ${(c.subject && c.subject !== "") ? c.subject : (t.channelInbox?.noSubject || "Conversación actual")}`}
            >
              <img
                src={getChannelIconSrc(c.channel)}
                alt={c.channel ?? "unknown"}
                className="h-3.5 w-3.5 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {(c.subject && c.subject !== "") ? c.subject : (t.channelInbox?.noSubject || "Conversación actual")}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {fmtRelativeLabel(c.lastUpdatedAt)}
                </span>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                <MessageSquare className="h-3 w-3" />
                {msgCounts[c.conversationId] ?? 0}
              </span>
              <span className="inline-flex shrink-0 items-center">
                {STATUS_ICON[c.status || "active"]}
                <span className="sr-only">Estado {c.status || "active"}</span>
              </span>
              {pendingConversationIds.has(c.conversationId) && (
                <span className="inline-flex shrink-0 items-center">
                  <TriangleAlert className="h-4 w-4 text-amber-600" />
                  <span className="sr-only">pendiente</span>
                </span>
              )}
            </button>
          ))}
      </div>
    </div>
  );
};

export default ConversationsTabs;
