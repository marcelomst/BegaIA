// Path: /root/begasist/lib/utils/waIdempotency.ts
import { redis } from "@/lib/services/redis";

/**
 * Dedupe de ingesta para WhatsApp usando Redis NX+EX.
 * Key: wa_msgdedup:<hotelId>:<srcMsgId>
 * Devuelve true SOLO la primera vez dentro del TTL (default 900s).
 */
export async function shouldIngestWaMessageOnce(
  hotelId: string,
  srcMsgId: string,
  ttlSeconds = 900
): Promise<boolean> {
  if (!hotelId || !srcMsgId) return false;
  const key = `wa_msgdedup:${hotelId}:${srcMsgId}`;
  const ok = await (redis as any).set(key, "1", "EX", ttlSeconds, "NX");
  return ok === "OK";
}
