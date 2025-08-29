// Path: /root/begasist/lib/adapters/webAdapter.ts
import type { ChannelAdapter, ChannelAdapterContext } from "./types";
import { emitToConversation } from "@/lib/web/eventBus";

/**
 * Entrega en canal Web = emitir por SSE al widget.
 * El front escucha /api/web/events y recibe los eventos.
 */
export const webAdapter: ChannelAdapter = {
  channel: "web",
  async sendReply(ctx: ChannelAdapterContext, text: string) {
    if (!ctx?.conversationId) return;
    const ts = new Date().toISOString();
    emitToConversation(ctx.conversationId, {
      type: "message",
      sender: "assistant",
      text,
      timestamp: ts,
    });
  },
};
