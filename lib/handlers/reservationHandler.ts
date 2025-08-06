// Path: /root/begasist/lib/handlers/reservationHandler.ts

import { v4 as uuidv4 } from "uuid";
import type { ReservationDTO } from "@/types/externalDTOs";
import type { ChannelMessage } from "@/types/channel";
import { getHotelAstraCollection } from "@/lib/astra/connection";
import { createConversation } from "@/lib/db/conversations";
import { saveMessageToAstra } from "@/lib/db/messages";

/**
 * Maneja notificaciones de nuevas/modificadas/canceladas reservas desde el Channel Manager.
 * El PMS persiste las reservas, pero notificamos via chat interno.
 */
export async function handleReservationNotification(
  reservation: ReservationDTO
): Promise<void> {
  const { hotelId, reservationId, guest, checkIn, checkOut, roomType } = reservation;

  // 1. Crear o reutilizar conversación asociada a la reserva
  const convo = await createConversation({
    hotelId,
    channel: "channelManager",
    lang: guest.language || "es",
    guestId: guest.guestId,
    metadata: { reservationId },
  });
  console.log(`💬 Conversación creada para reserva ${reservationId}: ${convo.conversationId}`);

  // 2. Generar mensaje inicial para el recepcionista
  const initialText =
    `🛎️ Nueva reserva (${reservationId}) de ${guest.firstName || guest.name || guest.guestId}\n` +
    `• Check-in: ${checkIn}, Check-out: ${checkOut}\n` +
    `• Habitación: ${roomType}`;

  const message: ChannelMessage = {
    messageId: uuidv4(),
    conversationId: convo.conversationId,
    hotelId,
    channel: "channelManager",
    sender: "system",
    content: initialText,
    timestamp: new Date().toISOString(),
    time: new Date().toLocaleTimeString(),
    suggestion: "",
    status: "sent",
  };

  // 3. Guardar mensaje en AstraDB para el chat
  await saveMessageToAstra(message);
  console.log(`📨 Notificación de reserva enviada en conversación ${convo.conversationId}`);
}
