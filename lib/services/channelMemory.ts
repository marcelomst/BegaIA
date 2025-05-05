// /lib/services/channelMemory.ts

import { Channel, ChannelMessage } from "@/types/channel";

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
    console.log("🧠🧠Mensage que llegab a ChannelMessage", msg)
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
