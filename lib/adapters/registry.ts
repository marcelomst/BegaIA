// /root/begasist/lib/adapters/registry.ts
import type { Channel } from "@/types/channel";
import type { ChannelAdapter, ChannelAdapterContext } from "./types";
import { webAdapter } from "@/lib/adapters/webAdapter"; // 👈 usa tu archivo existente

const registry = new Map<Channel, ChannelAdapter>();

export function registerAdapter(adapter: ChannelAdapter) {
  registry.set(adapter.channel, adapter);
}

export function getAdapter(channel: Channel): ChannelAdapter | undefined {
  ensureCoreAdapters();
  return registry.get(channel);
}

export function listAdapters(): ChannelAdapter[] {
  ensureCoreAdapters();
  return Array.from(registry.values());
}

let coreRegistered = false;
function ensureCoreAdapters() {
  if (coreRegistered) return;
  coreRegistered = true;

  // 👇 si nadie registró "web", registramos el tuyo
  if (!registry.has("web" as Channel)) {
    registry.set("web" as Channel, webAdapter);
  }
}
