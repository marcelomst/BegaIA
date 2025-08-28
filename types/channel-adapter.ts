// Path: /root/begasist/types/channel-adapter.ts
import type { Channel, ChannelMessage } from "@/types/channel";

export type SendReply = (reply: string) => Promise<void>;

export interface ChannelAdapterContext {
  hotelId: string;
  conversationId: string;
  channel: Channel;
  guestId?: string;
  /** Metadata específica del canal (jid, email, etc.) */
  meta?: Record<string, unknown>;
}

export interface ChannelAdapter {
  /** Debe coincidir con tu union Channel */
  channel: Channel;

  /** Entrega de mensajes por el canal (WA, Web/SSE, Email, etc.) */
  sendReply(ctx: ChannelAdapterContext, text: string): Promise<void>;

  /** (Opcional) Normalizador de entrada cruda → ChannelMessage */
  normalizeInbound?(raw: unknown, base: Partial<ChannelMessage>): ChannelMessage;

  /** (Opcional) Validación per-canal (size, rate, etc.) */
  validateInbound?(msg: ChannelMessage): void | never;
}
