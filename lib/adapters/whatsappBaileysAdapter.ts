// Path: /root/begasist/lib/adapters/whatsappBaileysAdapter.ts
import type { ChannelAdapter, ChannelAdapterContext } from "@/types/channel-adapter";

let _sock: any;
export function bindBaileysSock(sock: any) {
  _sock = sock;
}

export const whatsappBaileysAdapter: ChannelAdapter = {
  channel: "whatsapp",

  async sendReply(ctx: ChannelAdapterContext, text: string) {
    if (!_sock) throw new Error("Baileys sock no inicializado");
    const jid = (ctx.meta as any)?.jid as string | undefined;
    if (!jid) throw new Error("Falta jid en meta para WhatsApp");
    await _sock.sendMessage(jid, { text });
  },
};
