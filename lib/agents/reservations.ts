// Path: /root/begasist/lib/agents/reservations.ts

import { AIMessage } from "@langchain/core/messages";
import { createReservation, ReservationInput } from "../channelManager";
import { translateIfNeeded } from "@/lib/i18n/translateIfNeeded";
import { getHotelNativeLanguage } from "@/lib/config/hotelLanguage";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { GraphState } from "./index";

/**
 * Extrae slots de reserva del mensaje y los acumula.
 * Mejora: puedes hacer más robusto el slot-filling con IA.
 */
function fillReservationSlots(
  message: string,
  prevSlots: Record<string, any> = {}
) {
  let slots = { ...prevSlots };

  // Regex simple para fechas (YYYY-MM-DD)
  const dateRegex = /(\d{4}-\d{2}-\d{2})/g;
  const dates = message.match(dateRegex);
  if (dates && dates.length >= 2) {
    slots.checkIn = dates[0];
    slots.checkOut = dates[1];
  }

  // Tipo de habitación
  if (/doble|matrimonial|suite|individual|triple/i.test(message)) {
    slots.roomType = (message.match(/doble|matrimonial|suite|individual|triple/i) || [])[0];
  }

  // Número de huéspedes
  const guests = message.match(/(\d+) (personas|huéspedes|adultos)/i);
  if (guests) {
    slots.numGuests = guests[1];
  }

  // Nombre (muy simple, para demo)
  if (/a nombre de ([\w\s]+)/i.test(message)) {
    slots.guestName = (message.match(/a nombre de ([\w\s]+)/i) || [])[1].trim();
  }

  return slots;
}

/**
 * Nodo de reserva con slot-filling multilingüe y traducción final.
 */
export async function handleReservation(state: typeof import("./index").GraphState.State) {
  const userMsg = state.normalizedMessage;
  const prevSlots = state.reservationSlots ?? {};
  const filledSlots = fillReservationSlots(userMsg, prevSlots);

  // Detectar qué falta
  const missing: string[] = [];
  if (!filledSlots.guestName) missing.push("nombre del huésped");
  if (!filledSlots.roomType) missing.push("tipo de habitación");
  if (!filledSlots.checkIn) missing.push("fecha de check-in");
  if (!filledSlots.checkOut) missing.push("fecha de check-out");

  if (missing.length > 0) {
    const lang = state.detectedLanguage ?? "en";
    const dict = await getDictionary(lang);
    const question = dict.reservation.slotFillingPrompt(missing);
    return {
      ...state,
      reservationSlots: filledSlots,
      messages: [...state.messages, new AIMessage(question)],
    };
  }

  // Si todos los slots están, crear la reserva
  const reservationInput: ReservationInput = {
    hotelId: state.hotelId,
    guestName: filledSlots.guestName,
    roomType: filledSlots.roomType,
    checkIn: filledSlots.checkIn,
    checkOut: filledSlots.checkOut,
    channel: state.meta?.channel,
    language: state.detectedLanguage ?? "es",
    numGuests: filledSlots.numGuests,
  };
  const result = await createReservation(reservationInput);

  // Traducción al idioma original del usuario
  const originalLang = state.detectedLanguage ?? "en";
  const hotelLang = await getHotelNativeLanguage(state.hotelId);
  const messageToUser = await translateIfNeeded(result.message, hotelLang, originalLang);

  return {
    ...state,
    reservationSlots: {}, // Limpiar para próxima reserva
    messages: [...state.messages, new AIMessage(messageToUser)],
  };
}
