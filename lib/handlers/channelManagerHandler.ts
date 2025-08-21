// Path: /root/begasist/lib/handlers/channelManagerHandler.ts
import { redis } from "@/lib/services/redis";
import { saveMessageIdempotent } from "@/lib/db/messages";
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
import { getLocalTime } from "@/lib/utils/time";

async function shouldIngestCmMessageOnce(hotelId: string, srcMsgId: string) {
  const key = `cm_msgdedup:${hotelId}:${srcMsgId}`;
  // 15 minutos; ajustá si querés
  const ok = await redis.set(key, "1", "EX", 900, "NX");
  return ok === "OK";
}

/**
 * Mapeo de estados externos → internos.
 * Siguiendo tu enfoque: reflejamos lo que viene del CM.
 */
const statusMap: Record<string, ReservationStatus> = {
  new: "confirmed",
  confirmed: "confirmed",
  modified: "modified",
  cancelled: "cancelled",
};

export async function handleChannelManagerEvent(
  evt: ChannelManagerEventDTO,
  hotelId: string
): Promise<string | null> {
  try {
    console.log(
      `[CM Handler] event=${evt.eventType} hotelId=${hotelId} eventId=${evt.eventId}`
    );

    switch (evt.eventType) {
      case "reservation_created":
      case "reservation_modified":
      case "reservation_cancelled": {
        const resDTO = evt.payload as ReservationDTO;

        const reservationId = String(resDTO.reservationId);
        const reservation: Reservation = {
          reservationId,
          hotelId,
          guestId:
            resDTO.guest?.guestId ??
            resDTO.guest?.phone ??
            resDTO.guest?.email ??
            "guest",
          channel: resDTO.channel,
          status:
            (statusMap[(resDTO.status || "confirmed").toLowerCase()] ||
              "confirmed") as ReservationStatus,
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
          console.log(
            `[CM Handler] saveReservation hotel=${hotelId} resId=${reservationId}`
          );
          await saveReservation(reservation);
        } else {
          console.log(
            `[CM Handler] updateReservation hotel=${hotelId} resId=${reservationId}`
          );
          await updateReservation(hotelId, reservationId, reservation);
        }

        await updateCmEventStatus(
          hotelId,
          evt.eventId,
          "processed",
          new Date().toISOString()
        );
        console.log(
          `[CM Handler] cm_event processed hotel=${hotelId} eventId=${evt.eventId}`
        );
        return null;
      }

      case "guest_message": {
        const dto = evt.payload as ChannelMessageDTO;

        // 🔐 Idempotencia rápida en Redis
        const srcMsgId =
          dto.messageId || evt.eventId || `${dto.conversationId}:${dto.timestamp}`;
        const firstTime = await shouldIngestCmMessageOnce(hotelId, srcMsgId);
        if (!firstTime) {
          console.log(
            `[CM Bot] 🔁 DEDUP mensaje repetido srcMsgId=${srcMsgId} (Redis)`
          );
          await updateCmEventStatus(
            hotelId,
            evt.eventId,
            "processed",
            new Date().toISOString()
          );
          return null;
        }

        // 🕒 Hora local (solo formateo de UI)
        const ts = dto.timestamp || new Date().toISOString();
        const localTime = await getLocalTime(hotelId, ts);

        // Construcción del ChannelMessage con el MISMO id que viene del CM
        const channelMsg: ChannelMessage = {
          messageId: srcMsgId,
          conversationId:
            dto.conversationId ??
            `${hotelId}-channelManager-${dto.guestId || "guest"}`,
          hotelId,
          channel: dto.channel ?? "channelManager",
          sender: dto.guestId || "guest",
          content: dto.content ?? "",
          timestamp: ts,
          time: localTime,
          suggestion: dto.suggestionByHA ?? "",
          status: dto.status ?? "received",
          guestId: dto.guestId,
          role: "user",
        };

        // 🛡️ Idempotencia en DB (segundo cinturón)
        const { inserted } = await saveMessageIdempotent(channelMsg, {
          idempotencyKey: `${hotelId}:${channelMsg.channel}:${channelMsg.messageId}`,
        });
        if (!inserted) {
          console.log(
            `[CM Bot] 🔁 DEDUP por DB (${hotelId}:${channelMsg.channel}:${channelMsg.messageId})`
          );
          await updateCmEventStatus(
            hotelId,
            evt.eventId,
            "processed",
            new Date().toISOString()
          );
          return null;
        }

        // Enviamos al handler pidiendo NO volver a persistir el entrante
        let iaReply: string | null = null;
        await handleIncomingMessage(channelMsg, {
          autoReply: true,
          mode: "automatic",
          skipPersistIncoming: true, // <- evita duplicar
          sendReply: async (reply: string) => {
            iaReply = reply;
          },
        });

        await updateCmEventStatus(
          hotelId,
          evt.eventId,
          "processed",
          new Date().toISOString()
        );
        console.log(
          `[CM Handler] message processed hotel=${hotelId} eventId=${evt.eventId}`
        );
        return iaReply;
      }

      // (opcional) Si más adelante tratás reviews como mensajes:
      // case "guest_review": { ... misma dedupe + construcción de message ... }

      default:
        console.log(`[CM Handler] event ignored type=${evt.eventType}`);
        return null;
    }
  } catch (e: any) {
    console.error(
      `[CM Handler] ERROR eventId=${evt.eventId} hotel=${hotelId}:`,
      e?.message || e
    );
    throw e;
  }
}
