// Path: /root/begasist/lib/services/redis.ts
import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Log amigable para saber si conecta
console.log("[Redis] Connecting to:", redisUrl);

export const redis = new Redis(redisUrl);

redis.on("error", (err) => {
  if (process.env.NODE_ENV !== "production") {
    // No explota, solo advierte
    console.warn("[Redis] Connection error:", err.message);
  }
});

// Helpers universales (async/await friendly)
export async function setQR(hotelId: string, qr: string) {
  await redis.set(`whatsapp:qr:${hotelId}`, qr, "EX", 60 * 10); // Expira en 10 min
}
export async function getQR(hotelId: string): Promise<string | null> {
  return redis.get(`whatsapp:qr:${hotelId}`);
}
export async function clearQR(hotelId: string) {
  await redis.del(`whatsapp:qr:${hotelId}`);
}

// --- NUEVO: Estado de conexión del bot WhatsApp ---
export async function setWhatsAppState(hotelId: string, state: string) {
  await redis.set(`whatsapp:state:${hotelId}`, state, "EX", 60 * 15);
}
export async function getWhatsAppState(hotelId: string): Promise<string | null> {
  return redis.get(`whatsapp:state:${hotelId}`);
}
export async function clearWhatsAppState(hotelId: string) {
  await redis.del(`whatsapp:state:${hotelId}`);
}
