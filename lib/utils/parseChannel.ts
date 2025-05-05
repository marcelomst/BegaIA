// /lib/utils/parseChannel.ts
import { ALL_CHANNELS, type Channel } from "@/types/channel";

/**
 * Valida y convierte un string a tipo Channel si es válido.
 * @param channel Texto recibido
 * @returns Channel válido o null si no es permitido
 */
export function parseChannel(channel: string | null): Channel | null {
  if (channel && ALL_CHANNELS.includes(channel as Channel)) {
    return channel as Channel;
  }
  return null;
}
