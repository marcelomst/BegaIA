// Path: /root/begasist/lib/services/channelMemory.ts
import type { ChannelMessage, Channel } from "@/types/channel";

const MAX_PER_CHANNEL = 100;

// Implementación base con Map para consistencia y performance
type Store = Map<Channel, ChannelMessage[]>;
const store: Store = new Map();

function ensureChannelArray(channel: Channel): ChannelMessage[] {
  const arr = store.get(channel) ?? [];
  if (!store.has(channel)) store.set(channel, arr);
  return arr;
}

/**
 * API principal usada por el proyecto:
 * - addMessage: agrega al final (push) y recorta a los últimos 100 → orden cronológico ascendente.
 * - getMessages: devuelve una copia inmutable del array del canal.
 * - updateMessage: mergea cambios por messageId.
 * - clear: limpia un canal o todo.
 */
export const channelMemory = {
  addMessage(msg: ChannelMessage) {
    const chan = msg.channel as Channel;
    const arr = ensureChannelArray(chan);
    arr.push(msg);
    // Mantener sólo los últimos 100 por canal (conservar más recientes)
    if (arr.length > MAX_PER_CHANNEL) {
      store.set(chan, arr.slice(-MAX_PER_CHANNEL));
    } else {
      store.set(chan, arr);
    }
  },

  getMessages(channel: Channel): ChannelMessage[] {
    const arr = store.get(channel) ?? [];
    // devolver copia para evitar mutaciones externas
    return arr.slice();
  },

  updateMessage(channel: Channel, messageId: string, changes: Partial<ChannelMessage>): boolean {
    const arr = store.get(channel);
    if (!arr) return false;
    const idx = arr.findIndex((m) => m.messageId === messageId);
    if (idx < 0) return false;
    arr[idx] = { ...arr[idx], ...changes };
    return true;
  },

  clear(channel?: Channel) {
    if (channel) {
      store.delete(channel);
    } else {
      store.clear();
    }
  },

  // util mínima para asserts internos si alguna vez lo necesitás
  _size(channel: Channel) {
    return store.get(channel)?.length ?? 0;
  },
};

/**
 * Clase alternativa con el mismo comportamiento (por compatibilidad).
 * Útil si querés instancias aisladas en tests o en workers.
 */
export class ChannelMemory {
  private store = new Map<Channel, ChannelMessage[]>();

  addMessage(channel: Channel, msg: ChannelMessage) {
    const arr = this.store.get(channel) ?? [];
    arr.push(msg);
    if (arr.length > MAX_PER_CHANNEL) {
      this.store.set(channel, arr.slice(-MAX_PER_CHANNEL));
    } else {
      this.store.set(channel, arr);
    }
  }

  getMessages(channel: Channel): ChannelMessage[] {
    return (this.store.get(channel) ?? []).slice();
  }

  clear(channel?: Channel) {
    if (channel) this.store.delete(channel);
    else this.store.clear();
  }
}

export default channelMemory;
