// Path: /root/begasist/lib/adapters/webAdapter.ts
import type { ChannelAdapter, ChannelCtx } from "./types";
import { emitToConversation } from "@/lib/web/eventBus";

/**
 * Entrega en canal Web = emitir por SSE al widget.
 * No envía nada “externo”: el front escucha /api/web/events.
 */
export const webAdapter: ChannelAdapter = {
  id: "web",
  async sendReply(ctx: ChannelCtx, text: string) {
    const ts = new Date().toISOString();
    emitToConversation(ctx.conversationId, {
      type: "message",
      sender: "assistant",
      text,
      timestamp: ts,
    });
  },
};
