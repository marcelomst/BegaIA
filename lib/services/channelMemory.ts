import { Channel, ChannelMessage } from "@/types/channel";

type InMemoryChannelStore = {
  [channel in Channel]?: ChannelMessage[];
};

const store: InMemoryChannelStore = {};

export const channelMemory = {
  getMessages(channel: Channel): ChannelMessage[] {
    return store[channel] ?? [];
  },

  addMessage(msg: ChannelMessage) {
    if (!store[msg.channel]) store[msg.channel] = [];
    store[msg.channel]!.unshift(msg);
  },

  updateMessage(channel: Channel, id: string, changes: Partial<ChannelMessage>) {
    const msgs = store[channel];
    if (!msgs) return;
    const idx = msgs.findIndex((m) => m.id === id);
    if (idx >= 0) {
      msgs[idx] = { ...msgs[idx], ...changes };
    }
  },
};
