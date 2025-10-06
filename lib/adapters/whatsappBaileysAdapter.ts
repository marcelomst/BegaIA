// Path: /root/begasist/lib/adapters/whatsappBaileysAdapter.ts
import type { ChannelAdapter, ChannelAdapterContext } from "@/types/channel-adapter";

let _sock: any;
export function bindBaileysSock(sock: any) {
  const wasReady = !!_sock;
  _sock = sock;
  if (!wasReady && _sock) {
    console.log('[wa-adapter] socket bound; isWhatsAppReady()=true');
  }
}

export function isWhatsAppReady(): boolean {
  return !!_sock;
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

// === Helper API (programático) ===
/** Envía texto a un JID remoto (whatsapp). Requiere que el socket esté enlazado. */
export async function sendWhatsAppText(jid: string, text: string) {
  if (!_sock) throw new Error("Baileys sock no inicializado");
  if (!jid) throw new Error("JID inválido");
  await _sock.sendMessage(jid, { text });
}

/** Envía un documento (PDF u otro) a un JID remoto. */
export async function sendWhatsAppDocument(jid: string, buffer: Buffer, filename: string, mimetype = "application/pdf") {
  if (!_sock) throw new Error("Baileys sock no inicializado");
  if (!jid) throw new Error("JID inválido");
  if (!buffer?.length) throw new Error("Buffer vacío");
  await _sock.sendMessage(jid, { document: buffer, mimetype, fileName: filename });
}
