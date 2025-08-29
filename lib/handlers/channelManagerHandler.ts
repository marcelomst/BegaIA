// Path: /root/begasist/lib/handlers/channelManagerHandler.ts
import type { ChannelManagerEventDTO } from "@/types/externalDTOs";

/**
 * Stub estable para Channel Manager.
 * - Firma definitiva: (evt, hotelId?) => Promise<string|null>
 * - No persiste, no emite SSE, no toca Astra ni ChannelMessage.
 * - Devuelve un resumen corto útil para logs / respuestas del webhook.
 *
 * Cuando volvamos a integrar al pipeline, reemplazamos el cuerpo manteniendo esta firma.
 */
export async function handleChannelManagerEvent(
  evt: ChannelManagerEventDTO,
  hotelId?: string
): Promise<string | null> {
  try {
    const rid =
      (evt as any)?.reservationId ??
      (evt as any)?.payload?.reservationId ??
      "unknown";
    const type = String((evt as any)?.eventType ?? "other");
    const hid =
      hotelId ??
      (evt as any)?.hotelId ??
      (evt as any)?.payload?.hotelId ??
      "unknown-hotel";

    return `CM event (${hid}) · ${type} · #${rid}`;
  } catch {
    return null;
  }
}
