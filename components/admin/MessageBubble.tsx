"use client";
import React from "react";
import { Eye } from "lucide-react";
import type { ChatTurnWithMeta } from "@/types/channel";

interface MessageBubbleProps {
  msg: ChatTurnWithMeta;
  idx: number;
  isEmail: boolean;
  subject: string;
  editingIdx: number | null;
  editingText: string;
  onEdit: (idx: number) => void;
  onChangeEdit: (val: string) => void;
  onSendEdit: (msg: ChatTurnWithMeta, idx: number) => void;
  onCancelEdit: () => void;
  onViewOriginal: (msg: string) => void;
  t: any;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  msg,
  idx,
  isEmail,
  subject,
  editingIdx,
  editingText,
  onEdit,
  onChangeEdit,
  onSendEdit,
  onCancelEdit,
  onViewOriginal,
  t
}) => {
  return (
    <div
      className={
        msg.role === "user"
          ? "self-end px-3 py-2 rounded-lg max-w-[70%] bg-blue-100 text-blue-900 dark:bg-blue-700 dark:text-white"
          : "self-start px-3 py-2 rounded-lg max-w-[80%] bg-gray-100 text-gray-900 dark:bg-zinc-800 dark:text-white"
      }
      title={msg.timestamp}
    >
      {msg.role === "user" ? (
        msg.text
      ) : (
        <>
          {msg.status === "pending" && editingIdx === idx ? (
            <>
              <textarea
                className="w-full rounded border p-1 text-sm mb-2"
                rows={2}
                value={editingText}
                onChange={e => onChangeEdit(e.target.value)}
              />
              <div className="flex gap-2 text-xs">
                <button className="text-green-600 font-bold" onClick={() => onSendEdit(msg, idx)}>
                  {t.channelInbox?.send || "Enviar"}
                </button>
                <button className="text-gray-500" onClick={onCancelEdit}>
                  {t.channelInbox?.cancel || "Cancelar"}
                </button>
              </div>
            </>
          ) : (
            <>
              <span>
                {msg.approvedResponse ?? msg.suggestion ?? msg.text}
              </span>
              {isEmail && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {msg.subject && msg.subject !== subject && (
                    <div>
                      <strong>Asunto:</strong> {msg.subject}
                    </div>
                  )}
                  {msg.recipient && (
                    <div>
                      <strong>Para:</strong> {msg.recipient}
                    </div>
                  )}
                  {msg.cc?.length ? (
                    <div>
                      <strong>CC:</strong> {msg.cc.join(", ")}
                    </div>
                  ) : null}
                  {msg.bcc?.length ? (
                    <div>
                      <strong>BCC:</strong> {msg.bcc.join(", ")}
                    </div>
                  ) : null}
                  {msg.attachments?.length ? (
                    <div>
                      <strong>Adjuntos:</strong>{" "}
                      {msg.attachments.map((a: any, i: number) => a.filename || "archivo").join(", ")}
                    </div>
                  ) : null}
                  {msg.originalMessageId && (
                    <div>
                      <a
                        href={`https://mail.google.com/mail/u/0/#inbox/${msg.originalMessageId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        Abrir en Gmail
                      </a>
                    </div>
                  )}
                </div>
              )}
              {msg.suggestion && msg.approvedResponse && msg.suggestion !== msg.approvedResponse && (
                <button
                  className="ml-2 text-xs text-blue-600 underline flex items-center gap-1"
                  onClick={() => onViewOriginal(msg.suggestion!)}
                >
                  <Eye className="w-4 h-4 inline" /> {t.channelInbox?.viewOriginal || "Ver original"}
                </button>
              )}
              {msg.status === "pending" && editingIdx !== idx && (
                <button
                  className="ml-2 text-xs text-yellow-700 underline"
                  onClick={() => onEdit(idx)}
                >
                  {t.channelInbox?.editAndSend || "Editar y enviar"}
                </button>
              )}
            </>
          )}
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
                  ? "✅ " + (t.channelInbox?.sent || "Enviado")
                  : msg.status === "pending"
                  ? "🕓 " + (t.channelInbox?.pending || "Pendiente")
                  : msg.status === "rejected"
                  ? "❌ " + (t.channelInbox?.rejected || "Rechazado")
                  : msg.status}
              </span>
            )}
            {msg.respondedBy && (
              <span className="inline-block ml-2">
                <span className="text-muted-foreground">{t.channelInbox?.respondedBy || "Respondido por:"}</span>{" "}
                <b>{msg.respondedBy}</b>
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MessageBubble;
