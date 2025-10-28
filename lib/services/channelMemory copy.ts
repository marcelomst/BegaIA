// /lib/services/channelMemory.ts

import type { Channel, ChannelMessage } from "@/types/channel";

type InMemoryChannelStore = {
  [channel in Channel]?: ChannelMessage[];
};

const store: InMemoryChannelStore = {};

export const channelMemory = {
  getMessages(channel: Channel): ChannelMessage[] {
    console.log("🧠 store actual:", store);
    return store[channel] ?? [];
  },

  addMessage(msg: ChannelMessage) {
    console.log("🧠🧠Mensage que llega a ChannelMessage", msg)
    if (!store[msg.channel]) store[msg.channel] = [];
    store[msg.channel]!.unshift(msg);
  },

  updateMessage(
    channel: Channel,
    messageId: string,
    changes: Partial<ChannelMessage>
  ): boolean {
    const msgs = store[channel];
    if (!msgs) return false;
    const idx = msgs.findIndex((m) => m.messageId === messageId);
    if (idx >= 0) {
      msgs[idx] = { ...msgs[idx], ...changes };
      return true;
    }
    return false;
  },
};

const MAX = 100;

export class ChannelMemory {
  private store = new Map<string, any[]>();

  addMessage(channel: string, msg: any) {
    const arr = this.store.get(channel) ?? [];
    arr.push(msg);
    // ⬅️ NEW: enforce cap 100
    if (arr.length > MAX) {
      // conservamos los más recientes
      this.store.set(channel, arr.slice(-MAX));
    } else {
      this.store.set(channel, arr);
    }
  }

  getMessages(channel: string) {
    return this.store.get(channel) ?? [];
  }
}
