// Path: /root/begasist/lib/adapters/types.ts
import type { Channel } from "@/types/channel";

export type ChannelCtx = {
  hotelId: string;
  conversationId: string;
  channel: Channel;
  meta?: Record<string, any>; // datos específicos del canal (p.ej. jid)
};

export interface ChannelAdapter {
  /** Identificador único del canal (debe matchear con Channel) */
  id: Channel;
  /** Entrega un texto al destinatario en ese canal (mensaje saliente) */
  sendReply(ctx: ChannelCtx, text: string): Promise<void>;
}
