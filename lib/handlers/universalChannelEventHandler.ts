// Path: /root/begasist/lib/handlers/universalChannelEventHandler.ts
import crypto from "crypto";
import type { ChannelMessage } from "@/types/channel";
import type { UniversalEvent } from "@/types/events"
import { handleIncomingMessage } from "@/lib/handlers/messageHandler";
import { guardInboundOnce } from "@/lib/db/messageGuards";

type UniversalResult = { ok: boolean; deduped?: boolean; error?: string };

// 👇 NUEVO: incluye sendReply en opts
type HandlerOpts = {
  mode?: "automatic" | "supervised";
  sendReply?: (reply: string) => Promise<void>;
};

export async function universalChannelEventHandler(
  evt: UniversalEvent,
  opts?: HandlerOpts
): Promise<UniversalResult> {
  const { hotelId, conversationId, sourceMsgId } = evt;

  try {
    // 1) Idempotencia por sourceMsgId (solo para huésped entrante)
    if (evt.from === "guest" && sourceMsgId) {
      const { applied } = await guardInboundOnce({
        hotelId,
        conversationId,
        sourceMsgId,
        ttlSec: 7 * 24 * 60 * 60,
      });
      if (!applied) {
        return { ok: true, deduped: true };
      }
    }

    // 2) Normalización → ChannelMessage
    const timestampIso =
      typeof evt.timestamp === "number"
        ? new Date(evt.timestamp).toISOString()
        : new Date(evt.timestamp).toISOString();

    const msg: ChannelMessage = {
      hotelId,
      conversationId,
      channel: evt.channel,
      messageId:
        sourceMsgId ||
        `${evt.channel}:${conversationId}:${timestampIso}` ||
        crypto.randomUUID(),
      sourceMsgId,
      sender: evt.from === "guest" ? "guest" : "assistant",
      direction: evt.from === "guest" ? "in" : "out",
      role: evt.from === "guest" ? "user" : "ai",
      content: evt.content ?? "",
      timestamp: timestampIso,
      // subject/meta si quieres pasarlos:
      // subject: evt.subject,
      // meta: evt.meta,
    };

    // 3) Delegar (mapeando modo correctamente)
    const mhMode: "automatic" | "supervised" =
      opts?.mode === "supervised" ? "supervised" : "automatic";

    await handleIncomingMessage(msg, {
      mode: mhMode,
      sendReply: opts?.sendReply,
    });

    return { ok: true, deduped: false };
  } catch (err) {
    return { ok: false, error: (err as Error)?.message ?? String(err) };
  }
}
