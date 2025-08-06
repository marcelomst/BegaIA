// Path: /root/begasist/lib/handlers/channelManagerHandler.ts

import type {
  ChannelManagerEventDTO,
  ChannelMessageDTO,
  ReservationDTO,
} from "@/types/externalDTOs";
import type { ChannelMessage } from "@/types/channel";
import type { Reservation, ReservationStatus } from "@/types/reservation";
import { handleIncomingMessage } from "./messageHandler";
import { saveReservation, updateReservation } from "@/lib/db/reservations";
import { updateCmEventStatus } from "@/lib/db/cmEvents";

/**
 * Mapeo simple de estados del DTO externo a nuestros estados internos.
 * Las claves corresponden a los valores de ReservationDTO.status y los valores
 * a nuestro tipo ReservationStatus. Ajusta según tus necesidades.
 */
const statusMap: Record<string, ReservationStatus> = {
  new: "pending",
  modified: "modified",
  cancelled: "cancelled",
};

/**
 * Enruta eventos del Channel Manager a los handlers adecuados.
 * Devuelve la respuesta de IA (si la hay) para simulaciones HTTP.
 * @param evt   El evento CM
 * @param hotelId Id del hotel (siempre requerido)
 */
export async function handleChannelManagerEvent(
  evt: ChannelManagerEventDTO,
  hotelId: string
): Promise<string | null> {
  switch (evt.eventType) {
    // --- ALTA / MODIFICACIÓN / CANCELACIÓN DE RESERVAS ---
    case "reservation_created":
    case "reservation_modified":
    case "reservation_cancelled": {
      const resDTO = evt.payload as ReservationDTO;

      const reservation: Reservation = {
        reservationId: resDTO.reservationId,
        hotelId,
        guestId: resDTO.guest?.guestId ?? resDTO.guest?.phone ?? "guest",
        channel: resDTO.channel,
        // Convertimos el estado externo a nuestro tipo ReservationStatus
        status: (statusMap[resDTO.status] || "pending") as ReservationStatus,
        checkInDate: resDTO.checkIn,
        checkOutDate: resDTO.checkOut,
        roomType: resDTO.roomType,
        meta: {
          ratePlan: resDTO.ratePlan,
          specialRequests: resDTO.specialRequests,
          guestComment: resDTO.guestComment,
          rawPayload: resDTO.rawPayload,
        },
        createdAt: resDTO.bookingTimestamp,
      };

      if (evt.eventType === "reservation_created") {
        await saveReservation(reservation);
      } else {
        // En modificaciones y cancelaciones actualizamos la reserva existente
        await updateReservation(hotelId, reservation.reservationId, reservation);
      }

      // Marca el evento como procesado en cm_events
      await updateCmEventStatus(hotelId, evt.eventId, "processed", new Date().toISOString());
      return null;
    }

    // --- MENSAJE DE HUÉSPED ---
    case "guest_message": {
      const dto = evt.payload as ChannelMessageDTO;
      const channelMsg: ChannelMessage = {
        messageId: dto.messageId,
        conversationId: dto.conversationId,
        hotelId,
        channel: dto.channel,
        sender: dto.guestId || "guest",
        content: dto.content,
        timestamp: dto.timestamp,
        time: new Date(dto.timestamp).toLocaleTimeString(),
        suggestion: dto.suggestionByHA ?? "",
        status: dto.status,
        guestId: dto.guestId,
      };

      let iaReply: string | null = null;
      await handleIncomingMessage(channelMsg, {
        autoReply: true,
        mode: "automatic",
        sendReply: async (reply: string) => {
          iaReply = reply;
        },
      });

      // Evento procesado: actualiza estado
      await updateCmEventStatus(
        hotelId,
        evt.eventId,
        "processed",
        new Date().toISOString()
      );
      return iaReply;
    }

    // Otros tipos de evento que aún no gestionamos
    default:
      return null;
  }
}
