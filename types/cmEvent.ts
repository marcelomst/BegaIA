// Path: /root/begasist/types/cmEvent.ts

import type { Channel } from "./channel";

/**
 * Tipos de eventos que el Channel Manager puede notificar a Begaia.
 * Se reducen a los casos de uso básicos que necesita el asistente
 * para contextualizar y responder correctamente a los usuarios.
 */
export type CmEventType =
  | "newReservation"   // Se creó una nueva reserva en el CM
  | "modification"     // Se modificó una reserva existente
  | "cancellation"     // Se canceló una reserva existente
  | "message";         // Se recibió un mensaje relacionado con una reserva

/**
 * Posibles estados del procesamiento de un evento dentro de Begaia.
 * Sirven para llevar un registro del ciclo de vida de cada evento.
 */
export type CmEventStatus =
  | "queued"      // El evento fue recibido y está pendiente de procesamiento
  | "processing"  // El evento está siendo procesado
  | "processed"   // El evento fue procesado correctamente
  | "error";      // Hubo un error al procesar el evento

/**
 * Representa un evento proveniente del Channel Manager que será
 * almacenado en la base de datos de Begaia para su trazabilidad.
 * Contiene el tipo de evento, el identificador del hotel y, de
 * existir, la reserva o el huésped afectados.  El campo `payload`
 * almacena la información original del evento (tal como la envía
 * el CM) para facilitar reintentos o auditoría.
 */
export interface CmEvent {
  /** Identificador único del evento */
  eventId: string;
  /** Hotel al que corresponde el evento */
  hotelId: string;
  /** Tipo de evento */
  type: CmEventType;
  /** Canal por el cual se originó el evento */
  channel: Channel;
  /** Identificador de la reserva asociada (opcional) */
  reservationId?: string;
  /** Identificador del huésped asociado (opcional) */
  guestId?: string;
  /** Datos originales del evento enviados por el Channel Manager */
  payload: any;
  /** Estado actual del evento dentro de Begaia */
  status: CmEventStatus;
  /** Momento en que se recibió el evento */
  receivedAt: string;
  /** Momento en que se terminó de procesar el evento (opcional) */
  processedAt?: string;
  /** Descripción del error (sólo si status = "error") */
  error?: string;
}
