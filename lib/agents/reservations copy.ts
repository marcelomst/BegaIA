// Path: /root/begasist/lib/agents/reservations.ts

import { AIMessage } from "@langchain/core/messages";
import { createReservation, ReservationInput } from "../channelManager";
import { translateIfNeeded } from "@/lib/i18n/translateIfNeeded";
import { getHotelNativeLanguage } from "@/lib/config/hotelLanguage";
import { getDictionary } from "@/lib/i18n/getDictionary";

/** ====== Config ====== */
const USE_MCP = process.env.USE_MCP_RESERVATIONS === "true";
const MCP_ENDPOINT = process.env.MCP_ENDPOINT || "/api/mcp";
const MCP_API_KEY = process.env.MCP_API_KEY || "";

/** ====== Tipos locales MCP mínimos (para parsear la respuesta) ====== */
type MCPAvailabilityItem = {
  roomType: string;
  description?: string;
  pricePerNight: number;
  currency: string;
  availability: number;
};
type MCPList = MCPAvailabilityItem[];

type MCPCallResponse<T> = { ok: boolean; data?: T; error?: string };

/** ====== Util MCP (no crea dependencias nuevas) ====== */
async function mcpCall<T>(
  name: string,
  params: Record<string, any>
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (MCP_API_KEY) headers["x-mcp-key"] = MCP_API_KEY;

  const res = await fetch(MCP_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "call", name, params }),
  });

  if (!res.ok) throw new Error(`MCP HTTP ${res.status}`);
  const json = (await res.json()) as MCPCallResponse<T>;
  if (!json.ok) throw new Error(json.error || "MCP call failed");
  return json.data as T;
}

/** ====== Regex helpers / ventas suaves ====== */
const DATE_ISO = /(\d{4}-\d{2}-\d{2})/g;
const ROOM_RE = /suite|matrimonial|doble|triple|individual|single|double|twin/i;
const GUESTS_RE = /(\d+)\s*(personas|hu[eé]spedes|adultos)/i;
const NAME_RE = /a nombre de ([\w\sáéíóúüñÁÉÍÓÚÜÑ'.-]+)/i;
const CONFIRM_RE = /\b(confirmo|confirmar|sí|si|dale|ok|perfecto|reserva ya|avanzar|quiero reservar)\b/i;

function fillReservationSlots(message: string, prevSlots: Record<string, any> = {}) {
  const slots = { ...prevSlots };

  const dates = message.match(DATE_ISO);
  if (dates && dates.length >= 2) {
    slots.checkIn = dates[0];
    slots.checkOut = dates[1];
  }

  const roomMatch = message.match(ROOM_RE);
  if (roomMatch) slots.roomType = roomMatch[0].toLowerCase();

  const guestsMatch = message.match(GUESTS_RE);
  if (guestsMatch) slots.numGuests = guestsMatch[1];

  const nameMatch = message.match(NAME_RE);
  if (nameMatch) slots.guestName = nameMatch[1].trim();

  return slots;
}

function wantsToConfirm(message: string) {
  return CONFIRM_RE.test(message);
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function buildSoftClose(slots: Record<string, any>) {
  const s = slots;
  return [
    `Perfecto, haré la reserva a nombre de **${s.guestName ?? "el huésped"}**.`,
    `Habitación: **${capitalize(s.roomType)}**.`,
    `Fechas: **${s.checkIn} → ${s.checkOut}**${s.numGuests ? ` · Huéspedes: **${s.numGuests}**` : ""}.`,
    `¿Te confirmo ahora mismo?`,
  ].join("\n");
}

function buildValueNudge(slots: Record<string, any>) {
  const parts: string[] = [];
  if (slots.roomType) parts.push(`**${capitalize(slots.roomType)}** con excelente relación precio/calidad`);
  if (slots.checkIn && slots.checkOut) parts.push(`fechas **${slots.checkIn} → ${slots.checkOut}**`);
  if (slots.numGuests) parts.push(`${slots.numGuests} huésped(es)`);
  const core = parts.length ? `Tengo disponibilidad para ${parts.join(", ")}.` : `Puedo ofrecerte muy buena disponibilidad ahora.`;
  return `${core} ¿Querés que la deje **confirmada ahora** y aseguramos la tarifa?`;
}

/** ====== Alternativas si no hay disponibilidad ====== */
function shiftISO(dateISO: string, days: number): string {
  const d = new Date(dateISO);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function summarizeOptions(list: MCPList, limit = 3): string {
  const top = list
    .filter((x) => x.availability > 0)
    .sort((a, b) => a.pricePerNight - b.pricePerNight)
    .slice(0, limit);
  if (top.length === 0) return "por ahora sin cupo en otras categorías para esas fechas.";
  return top
    .map(
      (x) =>
        `• ${capitalize(x.roomType)} — ${x.pricePerNight} ${x.currency}/noche (cupo: ${x.availability})`
    )
    .join("\n");
}

/** ====== Nodo con integración MCP y alternativas ====== */
export async function handleReservation(state: typeof import("./index").GraphState.State) {
  const userMsg = state.normalizedMessage;
  const prevSlots = state.reservationSlots ?? {};
  const slots = fillReservationSlots(userMsg, prevSlots);

  // Detectar qué falta
  const missing: string[] = [];
  if (!slots.guestName) missing.push("nombre del huésped");
  if (!slots.roomType) missing.push("tipo de habitación");
  if (!slots.checkIn) missing.push("fecha de check-in");
  if (!slots.checkOut) missing.push("fecha de check-out");

  const originalLang = state.detectedLanguage ?? "en";
  const hotelLang = (await getHotelNativeLanguage(state.hotelId)) ?? "es";
  const dict = await getDictionary(originalLang);

  // Paso 1: completar slots
  if (missing.length > 0) {
    const question = dict.reservation.slotFillingPrompt(missing);
    const toUser = await translateIfNeeded(question, hotelLang, originalLang);
    return {
      ...state,
      reservationSlots: slots,
      messages: [...state.messages, new AIMessage(toUser)],
    };
  }

  // Si está activado MCP, verificar disponibilidad real
  let availableForRequested = true;
  let availabilityList: MCPList | null = null;

  if (USE_MCP) {
    try {
      availabilityList = await mcpCall<MCPList>("searchAvailability", {
        hotelId: state.hotelId,
        startDate: slots.checkIn,
        endDate: slots.checkOut,
        roomType: slots.roomType, // pedimos específicamente la categoría solicitada
      });

      const item = availabilityList.find(
        (x) => x.roomType.toLowerCase() === String(slots.roomType).toLowerCase()
      );
      availableForRequested = !!item && item.availability > 0;
    } catch (e) {
      // Si MCP falla, seguimos como si no estuviera activo (fallback a createReservation local)
      availableForRequested = true;
      availabilityList = null;
    }
  }

  // Paso 2: Si hay cupo pero el usuario no confirmó aún → nudge + soft close
  if (availableForRequested && !wantsToConfirm(userMsg)) {
    const nudge = buildValueNudge(slots);
    const softClose = buildSoftClose(slots);
    const composed = `${nudge}\n\n${softClose}`;
    const toUser = await translateIfNeeded(composed, hotelLang, originalLang);
    return {
      ...state,
      reservationSlots: slots,
      messages: [...state.messages, new AIMessage(toUser)],
    };
  }

  // Paso 3: Si NO hay cupo → ofrecer alternativas (otras categorías y ±1 día)
  if (!availableForRequested) {
    let altMsgParts: string[] = [];
    altMsgParts.push(`No tengo disponibilidad en **${capitalize(slots.roomType)}** para **${slots.checkIn} → ${slots.checkOut}**.`);

    // Alternativas por categoría (mismo rango de fechas)
    if (availabilityList && availabilityList.length > 0) {
      const otherTypes = availabilityList.filter(
        (x) => x.roomType.toLowerCase() !== String(slots.roomType).toLowerCase()
      );
      const summary = summarizeOptions(otherTypes);
      altMsgParts.push(`Opciones en otras categorías esas fechas:\n${summary}`);
    }

    // Alternativas por fecha (±1 día) — hacemos 2 consultas MCP rápidas
    if (USE_MCP) {
      try {
        const checkInMinus = shiftISO(slots.checkIn, -1);
        const checkOutMinus = shiftISO(slots.checkOut, -1);
        const minusRes = await mcpCall<MCPList>("searchAvailability", {
          hotelId: state.hotelId,
          startDate: checkInMinus,
          endDate: checkOutMinus,
        });

        const checkInPlus = shiftISO(slots.checkIn, 1);
        const checkOutPlus = shiftISO(slots.checkOut, 1);
        const plusRes = await mcpCall<MCPList>("searchAvailability", {
          hotelId: state.hotelId,
          startDate: checkInPlus,
          endDate: checkOutPlus,
        });

        const minusSummary = summarizeOptions(minusRes);
        const plusSummary = summarizeOptions(plusRes);

        altMsgParts.push(
          `También puedo mover **un día**:\n` +
            `• **${checkInMinus} → ${checkOutMinus}**:\n${minusSummary}\n` +
            `• **${checkInPlus} → ${checkOutPlus}**:\n${plusSummary}`
        );
      } catch {
        // si fallan las alternativas por fecha, omitimos esa parte
      }
    }

    altMsgParts.push(`¿Querés que reserve alguna de estas opciones o preferís que busque otra combinación?`);
    const altMsg = altMsgParts.join("\n\n");
    const toUser = await translateIfNeeded(altMsg, hotelLang, originalLang);

    return {
      ...state,
      reservationSlots: slots, // mantenemos para el próximo turno
      messages: [...state.messages, new AIMessage(toUser)],
    };
  }

  // Paso 4: Confirmado → crear la reserva (MCP si está activo; si falla, fallback local)
  const reservationInput: ReservationInput = {
    hotelId: state.hotelId,
    guestName: slots.guestName,
    roomType: slots.roomType,
    checkIn: slots.checkIn,
    checkOut: slots.checkOut,
    channel: state.meta?.channel,
    language: originalLang ?? "es",
    numGuests: slots.numGuests,
  };

  let finalMessage = "";

  if (USE_MCP) {
    try {
      const created = await mcpCall<any>("createReservation", {
        hotelId: reservationInput.hotelId,
        guestName: reservationInput.guestName,
        guestEmail: undefined,
        guestPhone: undefined,
        roomType: reservationInput.roomType,
        checkInDate: reservationInput.checkIn,
        checkOutDate: reservationInput.checkOut,
        notes: undefined,
      });

      // Mensaje estándar (puedes ajustar al shape real de tu adapter MCP)
      finalMessage =
        `✅ ¡Reserva confirmada! Código **${created.reservationId}**.\n` +
        `Habitación **${capitalize(slots.roomType)}**, ` +
        `Fechas **${slots.checkIn} → ${slots.checkOut}**` +
        (slots.numGuests ? ` · **${slots.numGuests}** huésped(es)` : "") +
        `. ¡Gracias, ${slots.guestName}!`;
    } catch (e) {
      // fallback local
      const result = await createReservation(reservationInput);
      finalMessage = result.message;
    }
  } else {
    // Sin MCP → flujo actual
    const result = await createReservation(reservationInput);
    finalMessage = result.message;
  }

  const messageToUser = await translateIfNeeded(finalMessage, hotelLang, originalLang);

  return {
    ...state,
    reservationSlots: {}, // limpiar para próxima reserva
    messages: [...state.messages, new AIMessage(messageToUser)],
  };
}
