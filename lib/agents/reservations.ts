import { AIMessage } from "@langchain/core/messages";
import { createReservation, ReservationInput } from "../channelManager";
import { translateIfNeeded } from "@/lib/i18n/translateIfNeeded";
import { getHotelNativeLanguage } from "@/lib/config/hotelLanguage";
import { getDictionary } from "@/lib/i18n/getDictionary";

/** ====== Config ====== */
const USE_MCP = process.env.USE_MCP_RESERVATIONS === "true";
const MCP_ENDPOINT = process.env.MCP_ENDPOINT || "/api/mcp";
const MCP_API_KEY = process.env.MCP_API_KEY || "";
const MCP_TIMEOUT_MS = Number(process.env.MCP_TIMEOUT_MS || 10000);
const DEBUG_MCP = process.env.DEBUG_MCP === "true";

/** ====== Tipos locales MCP ====== */
type MCPAvailabilityItem = {
  roomType: string;
  description?: string;
  pricePerNight?: number;
  currency?: string;
  availability: number;
};
type MCPList = MCPAvailabilityItem[];

type MCPCallResponse<T> = { ok: boolean; data?: T; error?: string };

/** ====== Normalización roomType ====== */
const ROOM_SYNONYMS: Record<string, string> = {
  // es
  matrimonial: "doble",
  doble: "doble",
  individual: "single",
  triple: "triple",
  suite: "suite",
  // en
  single: "single",
  double: "doble",
  twin: "doble",
  queen: "doble",
  king: "doble",
  deluxe: "suite",
  standard: "doble",
};
function normalizeRoomType(raw?: string) {
  if (!raw) return raw;
  const key = raw.toLowerCase().trim();
  return ROOM_SYNONYMS[key] || key;
}

/** ====== MCP util ====== */
async function mcpCall<T>(name: string, params: Record<string, any>): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", "Accept": "application/json" };
  if (MCP_API_KEY) headers["x-mcp-key"] = MCP_API_KEY;

  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), MCP_TIMEOUT_MS);

  try {
    const res = await fetch(MCP_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({ action: "call", name, params }),
      signal: ac.signal,
    });
    if (!res.ok) throw new Error(`MCP HTTP ${res.status}`);
    const json = (await res.json()) as MCPCallResponse<T>;
    if (!json.ok) throw new Error(json.error || "MCP call failed");
    if (DEBUG_MCP) console.log(`[MCP ok] ${name}`, params);
    return json.data as T;
  } finally {
    clearTimeout(id);
  }
}

/** ====== Regex helpers ====== */
const DATE_ISO = /(\d{4}-\d{2}-\d{2})/g;
const ROOM_RE = /suite|matrimonial|doble|triple|individual|single|double|twin|queen|king|deluxe|standard/i;
const GUESTS_RE = /(\d+)\s*(personas|hu[eé]spedes|adultos|guests?)/i;
const NAME_RE = /a nombre de ([\w\sáéíóúüñÁÉÍÓÚÜÑ'.-]+)|under the name of ([\w\s'.-]+)/i;
const CONFIRM_RE = /\b(confirmo|confirmar|sí|si|dale|ok|perfecto|reserva ya|avanzar|quiero reservar|book|reserve|confirm)\b/i;

function fillReservationSlots(message: string, prevSlots: Record<string, any> = {}) {
  const slots = { ...prevSlots };
  const dates = message.match(DATE_ISO);
  if (dates && dates.length >= 2) {
    slots.checkIn = dates[0];
    slots.checkOut = dates[1];
  }
  const roomMatch = message.match(ROOM_RE);
  if (roomMatch) slots.roomType = normalizeRoomType(roomMatch[0]);
  const guestsMatch = message.match(GUESTS_RE);
  if (guestsMatch) slots.numGuests = guestsMatch[1];
  const nameMatch = message.match(NAME_RE);
  if (nameMatch) slots.guestName = (nameMatch[1] || nameMatch[2])?.trim();
  return slots;
}
const wantsToConfirm = (msg: string) => CONFIRM_RE.test(msg);

/** ====== Alternativas ====== */
function shiftISO(dateISO: string, days: number): string {
  const d = new Date(dateISO);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function summarizeOptions(list: MCPList, limit = 3): string {
  const safe = (n?: number) => (typeof n === "number" && !Number.isNaN(n) ? n : Number.POSITIVE_INFINITY);
  const top = (list ?? [])
    .filter((x) => x.availability > 0)
    .sort((a, b) => safe(a.pricePerNight) - safe(b.pricePerNight))
    .slice(0, limit);
  if (top.length === 0) return "—";
  return top
    .map((x) => {
      const ppn = typeof x.pricePerNight === "number" ? x.pricePerNight : "—";
      const cur = x.currency || "";
      return `• ${capitalize(x.roomType)} — ${ppn} ${cur}/night (stock: ${x.availability})`;
    })
    .join("\n");
}
function capitalize(s?: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s as any;
}

/** ====== Nodo principal ====== */
export async function handleReservation(state: typeof import("./index").GraphState.State) {
  const userMsg = state.normalizedMessage;
  const prevSlots = state.reservationSlots ?? {};
  const slots = fillReservationSlots(userMsg, prevSlots);

  // Idiomas
  const userLang = state.detectedLanguage ?? "en";
  const hotelLang = (await getHotelNativeLanguage(state.hotelId)) ?? "es";
  const dict = await getDictionary(hotelLang); // 👈 generamos SIEMPRE en idioma del hotel

  // Slots faltantes
  const missing: string[] = [];
  if (!slots.guestName) missing.push("nombre del huésped");
  if (!slots.roomType) missing.push("tipo de habitación");
  if (!slots.checkIn) missing.push("fecha de check-in");
  if (!slots.checkOut) missing.push("fecha de check-out");

  if (missing.length > 0) {
    const msgHotelLang = dict.reservation.slotFillingPrompt(missing);
    const toUser = await translateIfNeeded(msgHotelLang, hotelLang, userLang);
    return { ...state, reservationSlots: slots, messages: [...state.messages, new AIMessage(toUser)] };
  }

  // MCP: disponibilidad
  let availableForRequested = true;
  let availabilityList: MCPList | null = null;

  if (USE_MCP) {
    try {
      availabilityList = await mcpCall<MCPList>("searchAvailability", {
        hotelId: state.hotelId,
        startDate: slots.checkIn,
        endDate: slots.checkOut,
        roomType: slots.roomType,
      });
      const item = availabilityList.find(
        (x) => x.roomType.toLowerCase() === String(slots.roomType).toLowerCase()
      );
      availableForRequested = !!item && item.availability > 0;
    } catch {
      availableForRequested = true;
      availabilityList = null;
    }
  }

  // Nudge + soft close si aún no confirma
  if (availableForRequested && !wantsToConfirm(userMsg)) {
    const nudge = dict.reservation.valueNudge(slots);
    const soft = dict.reservation.softClose(slots);
    const msgHotelLang = `${nudge}\n\n${soft}`;
    const toUser = await translateIfNeeded(msgHotelLang, hotelLang, userLang);
    return { ...state, reservationSlots: slots, messages: [...state.messages, new AIMessage(toUser)] };
  }

  // Sin disponibilidad: alternativas
  if (!availableForRequested) {
    const parts: string[] = [];
    parts.push(dict.reservation.noAvailability(slots));

    if (availabilityList && availabilityList.length > 0) {
      const otherTypes = availabilityList.filter(
        (x) => x.roomType.toLowerCase() !== String(slots.roomType).toLowerCase()
      );
      const summary = summarizeOptions(otherTypes);
      parts.push(dict.reservation.alternativesSameDates(summary));
    }

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

        parts.push(
          dict.reservation.alternativesMoveOneDay(
            `${checkInMinus} → ${checkOutMinus}`,
            summarizeOptions(minusRes),
            `${checkInPlus} → ${checkOutPlus}`,
            summarizeOptions(plusRes)
          )
        );
      } catch {
        // omitimos si falla
      }
    }

    parts.push(dict.reservation.askChooseAlternative());
    const msgHotelLang = parts.join("\n\n");
    const toUser = await translateIfNeeded(msgHotelLang, hotelLang, userLang);
    return { ...state, reservationSlots: slots, messages: [...state.messages, new AIMessage(toUser)] };
  }

  // Confirmado → crear reserva (MCP si hay)
  const reservationInput: ReservationInput = {
    hotelId: state.hotelId,
    guestName: slots.guestName,
    roomType: slots.roomType,
    checkIn: slots.checkIn,
    checkOut: slots.checkOut,
    channel: state.meta?.channel,
    language: userLang ?? "es",
    numGuests: slots.numGuests,
  };

  let msgHotelLang = "";
  if (USE_MCP) {
    try {
      const created = await mcpCall<any>("createReservation", {
        hotelId: reservationInput.hotelId,
        guestName: reservationInput.guestName,
        roomType: reservationInput.roomType,
        checkInDate: reservationInput.checkIn,
        checkOutDate: reservationInput.checkOut,
      });
      msgHotelLang = dict.reservation.confirmSuccess(created, slots);
    } catch {
      const result = await createReservation(reservationInput);
      msgHotelLang = result.message; // si tu message viene en hotelLang, perfecto; si no, translateIfNeeded lo corrige
    }
  } else {
    const result = await createReservation(reservationInput);
    msgHotelLang = result.message;
  }

  const toUser = await translateIfNeeded(msgHotelLang, hotelLang, userLang);
  return { ...state, reservationSlots: {}, messages: [...state.messages, new AIMessage(toUser)] };
}
