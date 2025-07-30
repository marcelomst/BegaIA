// Path: /root/begasist/lib/services/heartbeat.ts
// Módulo genérico para iniciar/detener heartbeat de cualquier canal y hotel.

import { redis } from "@/lib/services/redis";

const heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();

/**
 * Inicia el heartbeat para un canal y hotel.
 * @param channel Ej: "email", "whatsapp", "channelManager"
 * @param hotelId Ej: "hotel123"
 */
export function startChannelHeartbeat(channel: string, hotelId: string) {
  const key = `${channel}:${hotelId}`;
  if (heartbeatIntervals.has(key)) return; // Ya corriendo

  const redisKey = `heartbeat:${channel}-bot:${hotelId}`;
  const interval = setInterval(async () => {
    try {
      await redis.set(redisKey, "vivo", "EX", 60);

      console.log(`💓 Heartbeat enviado: ${redisKey}`);
    } catch (err) {
      console.error(`❌ Error al enviar heartbeat para ${channel} ${hotelId}:`, err);
    }
  }, 30_000);

  heartbeatIntervals.set(key, interval);
}

/**
 * Detiene el heartbeat para un canal y hotel.
 */
export function stopChannelHeartbeat(channel: string, hotelId: string) {
  const key = `${channel}:${hotelId}`;
  const interval = heartbeatIntervals.get(key);
  if (interval) {
    clearInterval(interval);
    heartbeatIntervals.delete(key);
    console.log(`💤 Heartbeat detenido para ${channel} ${hotelId}`);
  }
}
