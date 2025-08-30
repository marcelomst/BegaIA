import type { ChannelAdapter, ChannelAdapterContext } from "./types";
import { emitToConversation } from "@/lib/web/eventBus";

export const webAdapter: ChannelAdapter = {
  channel: "web",
  async sendReply(ctx: ChannelAdapterContext, text: string) {
    if (!ctx?.conversationId) return;
    const ts = new Date().toISOString();
    console.log("[web-adapter] sendReply SSE", { conv: ctx.conversationId, len: text?.length ?? 0 });
    emitToConversation(ctx.conversationId, {
      type: "message",
      sender: "assistant",
      text,
      timestamp: ts,
    });
  },
};
