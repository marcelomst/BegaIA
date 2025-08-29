// Path: /root/begasist/lib/adapters/registry.ts
import type { Channel } from "@/types/channel";
import type { ChannelAdapter, ChannelAdapterContext } from "./types";
import { emitToConversation } from "@/lib/web/eventBus";

const registry = new Map<Channel, ChannelAdapter>();

export function registerAdapter(adapter: ChannelAdapter) {
  // clave por canal (web, whatsapp, email, etc.)
  registry.set(adapter.channel, adapter);
}

/**
 * Devuelve el adapter del canal. Asegura que el adapter "web" esté
 * disponible para streaming por SSE hacia /api/web/events.
 */
export function getAdapter(channel: Channel): ChannelAdapter | undefined {
  ensureCoreAdapters();
  return registry.get(channel);
}

export function listAdapters(): ChannelAdapter[] {
  ensureCoreAdapters();
  return Array.from(registry.values());
}

/* ---------------------------------- */
/* Core adapters                       */
/* ---------------------------------- */

let coreRegistered = false;

function ensureCoreAdapters() {
  if (coreRegistered) return;
  coreRegistered = true;

  // Adapter mínimo para canal "web": puentea sendReply -> EventBus (SSE)
  if (!registry.has("web" as Channel)) {
    const webAdapter: ChannelAdapter = {
      channel: "web" as Channel,

      async sendReply(ctx: ChannelAdapterContext, text: string): Promise<void> {
        const conv = ctx?.conversationId;
        if (!conv) return;
        console.log("[web-adapter] sendReply -> SSE", {
          hotelId: ctx.hotelId,
          conversationId: conv,
          len: text?.length ?? 0,
        });
        emitToConversation(conv, {
          type: "message",
          sender: "assistant",
          text,
          timestamp: new Date().toISOString(),
        });
      },
    };

    registry.set("web" as Channel, webAdapter);
  }
}
