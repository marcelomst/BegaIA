
// Path: /root/begasist/lib/agents/graph.ts
import { Annotation, StateGraph } from "@langchain/langgraph";
import {
  BaseMessage,
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { getSystemPlaybooks } from "@/lib/astra/systemPlaybook";
import { getConvState, upsertConvState } from "@/lib/db/convState";
import { retrievalBased } from "@/lib/agents/retrieval_based";
import { classifyQuery } from "@/lib/classifier";
import {
  fillSlotsWithLLM,
  askAvailability,
  confirmAndCreate,
  // type FillSlotsResult, // opcional si tipás la respuesta
} from "@/lib/agents/reservations";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import type {
  IntentCategory,
  DesiredAction,
  RequiredSlot,
  SlotMap,
} from "@/types/audit";
import { looksLikeName, normalizeNameCase, heuristicClassify } from "./helpers";

/* =========================
 *        CONST / LABELS
 * ========================= */
const REQUIRED_SLOTS: RequiredSlot[] = [
  "guestName",
  "roomType",
  "checkIn",
  "checkOut",
  "numGuests",
];
const FORCE_CANONICAL_QUESTION =
  (process.env.FORCE_CANONICAL_QUESTION || "0") === "1";

const LABELS = {
  es: {
    guestName: "nombre completo",
    roomType: "tipo de habitación",
    checkIn: "fecha de check-in",
    checkOut: "fecha de check-out",
    numGuests: "número de huéspedes",
  },
  en: {
    guestName: "guest name",
    roomType: "room type",
    checkIn: "check-in date",
    checkOut: "check-out date",
    numGuests: "number of guests",
  },
  pt: {
    guestName: "nome do hóspede",
    roomType: "tipo de quarto",
    checkIn: "data de check-in",
    checkOut: "data de check-out",
    numGuests: "número de hóspedes",
  },
} as const;

/* =========================
 *        HELPERS
 * ========================= */

import {
  ddmmyyyyToISO,
  extractDateRangeFromText,
  extractGuests,
  isConfirmIntentLight,
  isGreeting,
  labelSlot,
  summarizeDraft,
  buildAggregatedQuestion,
  mentionsLocale,
  stripLocaleRequests,
  normalizeSlotsToStrings,
  isConfirmIntent,
  looksLikeDateOnly,
  looksLikeCorrection,
  maxGuestsFor,
  clampGuests,
  sanitizePartial,
  looksRoomInfo,
  normalizeSlots,
} from "./helpers";

/* =========================
 *        STATE
 * ========================= */
export const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  normalizedMessage: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => "",
  }),
  category: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => "other",
  }),
  detectedLanguage: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => "es",
  }),
  sentiment: Annotation<"positive" | "neutral" | "negative">({
    reducer: (_x, y) => y,
    default: () => "neutral",
  }),
  preferredLanguage: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => "es",
  }),
  promptKey: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  hotelId: Annotation<string>({
    reducer: (_x, y) => y,
    default: () => "hotel999",
  }),
  conversationId: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  meta: Annotation<Record<string, any>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  reservationSlots: Annotation<{
    guestName?: string;
    roomType?: string;
    checkIn?: string;
    checkOut?: string;
    numGuests?: string;
  }>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  intentConfidence: Annotation<number>({
    reducer: (_x, y) => y,
    default: () => 0.0,
  }),
  intentSource: Annotation<"heuristic" | "llm" | "embedding">({
    reducer: (_x, y) => y,
    default: () => "heuristic",
  }),
  desiredAction: Annotation<"create" | "modify" | "cancel" | undefined>({
    reducer: (_x, y) => y,
    default: () => undefined,
  }),
  salesStage: Annotation<"qualify" | "quote" | "close" | "followup">({
    reducer: (_x, y) => y,
    default: () => "qualify",
  }),
  lastOffer: Annotation<string | null>({
    reducer: (_x, y) => y,
    default: () => null,
  }),
  upsellCount: Annotation<number>({
    reducer: (x, y) => (typeof y === "number" ? y : x ?? 0),
    default: () => 0,
  }),
});

/* =========================
 *         NODES
 * ========================= */
// Nodo para mostrar snapshot de reserva confirmada
async function handleReservationSnapshotNode(state: typeof GraphState.State) {
  const lang = (state.detectedLanguage || "es").slice(0, 2);
  const slots = state.reservationSlots || {};
  const code = (state as any)?.lastReservation?.reservationId || "-";
  let msg = "";
  if (lang === "es") {
    msg = `Tienes una reserva confirmada:\n\n- Nombre: ${slots.guestName || "-"}\n- Habitación: ${slots.roomType || "-"}\n- Fechas: ${slots.checkIn || "-"} → ${slots.checkOut || "-"}\n- Huéspedes: ${slots.numGuests || "-"}\n- Código: ${code}`;
  } else if (lang === "pt") {
    msg = `Você tem uma reserva confirmada:\n\n- Nome: ${slots.guestName || "-"}\n- Quarto: ${slots.roomType || "-"}\n- Datas: ${slots.checkIn || "-"} → ${slots.checkOut || "-"}\n- Hóspedes: ${slots.numGuests || "-"}\n- Código: ${code}`;
  } else {
    msg = `You have a confirmed booking:\n\n- Name: ${slots.guestName || "-"}\n- Room: ${slots.roomType || "-"}\n- Dates: ${slots.checkIn || "-"} → ${slots.checkOut || "-"}\n- Guests: ${slots.numGuests || "-"}\n- Code: ${code}`;
  }
  // Si el mensaje original era de modificación, dejar desiredAction: 'modify' para que el siguiente turno avance
  const t = (state.normalizedMessage || "").toLowerCase();
  const isModify = /\b(modificar|cambiar|modification|change|alterar|alteração|alterar|change)\b/.test(t);
  return {
    messages: [new AIMessage(msg)],
    reservationSlots: slots,
    category: "reservation",
    salesStage: "close",
    desiredAction: isModify ? "modify" : undefined,
  };
}
async function classifyNode(state: typeof GraphState.State) {
  // Si la reserva está cerrada, manejar casos especiales
  if (state.salesStage === "close") {
    const t = (state.normalizedMessage || "").toLowerCase();
    // Si el usuario explícitamente quiere modificar/cancelar, seguir en reservation
    if (
      /\b(modificar|cambiar|cancelar|anular|cancela|cambio|modifico|modification|change|cancel)\b/.test(
        t
      )
    ) {
      return {
        category: "reservation",
        desiredAction: "modify",
        intentConfidence: 0.95,
        intentSource: "heuristic",
        promptKey: "modify_reservation",
        messages: [],
      };
    }
    // Si el usuario pide ver/consultar/confirmar su reserva (es, pt, en)
    if (
      /(ver|mostrar|consultar|verificar|tengo|confirmar|confirmada|detalhes|detalhes|detalles|see|show|check|confirm|details|reservation|reserva|booking)/i.test(t) &&
      /(reserva|booking|reservation)/i.test(t)
    ) {
      // category especial para snapshot
      return {
        category: "reservation_snapshot",
        desiredAction: undefined,
        intentConfidence: 0.99,
        intentSource: "heuristic",
        promptKey: "reservation_snapshot",
        messages: [],
      };
    }
    // Si no, derivar a retrieval_based
    return {
      category: "retrieval_based",
      desiredAction: undefined,
      intentConfidence: 0.95,
      intentSource: "heuristic",
      promptKey: undefined,
      messages: [],
    };
  }
  // Nodo para mostrar snapshot de reserva confirmada
  async function handleReservationSnapshotNode(state: typeof GraphState.State) {
    const lang = (state.detectedLanguage || "es").slice(0, 2);
    const slots = state.reservationSlots || {};
    const code = (state as any)?.lastReservation?.reservationId || "-";
    let msg = "";
    if (lang === "es") {
      msg = `Tienes una reserva confirmada:\n\n- Nombre: ${slots.guestName || "-"}\n- Habitación: ${slots.roomType || "-"}\n- Fechas: ${slots.checkIn || "-"} → ${slots.checkOut || "-"}\n- Huéspedes: ${slots.numGuests || "-"}\n- Código: ${code}`;
    } else if (lang === "pt") {
      msg = `Você tem uma reserva confirmada:\n\n- Nome: ${slots.guestName || "-"}\n- Quarto: ${slots.roomType || "-"}\n- Datas: ${slots.checkIn || "-"} → ${slots.checkOut || "-"}\n- Hóspedes: ${slots.numGuests || "-"}\n- Código: ${code}`;
    } else {
      msg = `You have a confirmed booking:\n\n- Name: ${slots.guestName || "-"}\n- Room: ${slots.roomType || "-"}\n- Dates: ${slots.checkIn || "-"} → ${slots.checkOut || "-"}\n- Guests: ${slots.numGuests || "-"}\n- Code: ${code}`;
    }
    return {
      messages: [new AIMessage(msg)],
      reservationSlots: slots,
      category: "reservation",
      salesStage: "close",
    };
  }
  const { normalizedMessage, reservationSlots, meta } = state;
  console.log("[DEBUG-confirm]", {
    normalizedMessage,
    test: isConfirmIntentLight(normalizedMessage),
  });
  if (isConfirmIntentLight(normalizedMessage)) {
    return {
      category: "reservation",
      desiredAction: "create",
      intentConfidence: 0.99,
      intentSource: "heuristic",
      promptKey: "reservation_flow",
      messages: [],
    };
  }
  const prev = (meta as any)?.prevCategory || state.category;
  if (isGreeting(normalizedMessage)) {
    return {
      category: "retrieval_based",
      desiredAction: undefined,
      intentConfidence: 0.95,
      intentSource: "heuristic",
      promptKey: looksRoomInfo(normalizedMessage)
        ? "room_info"
        : "ambiguity_policy",
      messages: [],
    };
  }
  const hasAnySlot = (
    ["guestName", "roomType", "checkIn", "checkOut", "numGuests"] as const
  ).some((k) => !!(reservationSlots as any)?.[k]);
  if (prev === "reservation" || hasAnySlot) {
    const t = (normalizedMessage || "").toLowerCase();
    const isHardSwitch =
      /\b(cancel|cancelar|anular)\b/.test(t) ||
      /\b(piscina|desayuno|parking|estacionamiento|spa|gym|gimnasio)\b/.test(
        t
      ) ||
      /\b(factura|invoice|cobro|billing)\b/.test(t) ||
      /\b(soporte|ayuda|problema|support)\b/.test(t);
    if (!isHardSwitch) {
      return {
        category: "reservation",
        desiredAction: "modify",
        intentConfidence: 0.95,
        intentSource: "heuristic",
        promptKey: "reservation_flow",
        messages: [],
      };
    }
  }
  let h = heuristicClassify(normalizedMessage);
  if (h.intentConfidence < 0.75) {
    try {
      const llmC = await classifyQuery(normalizedMessage, state.hotelId);
      h = {
        category: llmC.category as IntentCategory,
        desiredAction: h.desiredAction,
        intentConfidence: Math.max(h.intentConfidence, 0.9),
        intentSource: "llm",
      };
      const forcedPK =
        llmC.promptKey ??
        (looksRoomInfo(normalizedMessage) ? "room_info" : undefined);
      if (forcedPK)
        return {
          category: "retrieval_based",
          desiredAction: h.desiredAction,
          intentConfidence: h.intentConfidence,
          intentSource: "llm",
          promptKey: forcedPK,
          messages: [],
        };
    } catch {
      console.log("Error classifying with LLM, falling back to heuristic");
    }
  }

  const pickPK = (cat: IntentCategory, desired: DesiredAction) =>
    cat === "reservation"
      ? desired === "modify"
        ? "modify_reservation"
        : "reservation_flow"
      : cat === "cancel_reservation"
        ? "modify_reservation"
        : looksRoomInfo(normalizedMessage)
          ? "room_info"
          : "ambiguity_policy";
  const promptKey = pickPK(h.category, h.desiredAction);
  return {
    category: h.category,
    desiredAction: h.desiredAction,
    intentConfidence: h.intentConfidence,
    intentSource: h.intentSource,
    promptKey,
    messages: [],
  };
}

async function handleReservationNode(state: typeof GraphState.State) {
  console.log("handleReservationNode", state);
  const {
    detectedLanguage,
    reservationSlots,
    normalizedMessage,
    hotelId,
    conversationId,
    salesStage,
  } = state;
  const channel = (state.meta as any)?.channel || "web";
  const cfg = await getHotelConfig(hotelId).catch((err) => {
    console.error("[graph] Error en getHotelConfig:", err);
    return null;
  });
  const hotelTz =
    cfg?.timezone ||
    (
      await getHotelConfig(hotelId).catch((err) => {
        console.error("[graph] Error en getHotelConfig (timezone):", err);
        return null;
      })
    )?.timezone ||
    "UTC";
  const forceCanonicalQuestion: boolean =
    (cfg as any)?.channelConfigs?.[channel]?.reservations
      ?.forceCanonicalQuestion ??
    (cfg as any)?.reservations?.forceCanonicalQuestion ??
    false;

  const lang2 = (detectedLanguage || "es").slice(0, 2) as "es" | "en" | "pt";
  const locale = lang2;

  // 🚫 Si la reserva ya está cerrada, solo permitir volver si el usuario pide modificar/cancelar
  if (salesStage === "close") {
    const t = (normalizedMessage || "").toLowerCase();
    const da = state.desiredAction;
    // Si el usuario pide modificar/cancelar, preguntar qué desea modificar
    if (
      da === "modify" ||
      /\b(modificar|cambiar|cancelar|anular|cancela|cambio|modifico|modification|change|cancel)\b/.test(t)
    ) {
      const lang = (detectedLanguage || "es").slice(0, 2);
      let msg = "";
      if (lang === "es") {
        msg = "¿Qué dato de la reserva deseas modificar? (fechas, nombre, habitación, huéspedes, etc.)";
      } else if (lang === "pt") {
        msg = "Qual informação da reserva você deseja alterar? (datas, nome, quarto, hóspedes, etc.)";
      } else {
        msg = "What detail of the booking would you like to modify? (dates, name, room, guests, etc.)";
      }
      // Avanzar a qualify para que el siguiente mensaje sea interpretado como modificación
      return {
        messages: [new AIMessage(msg)],
        reservationSlots,
        category: "reservation",
        salesStage: "qualify",
        desiredAction: "modify",
      };
    }
    // Si no pide modificar/cancelar, derivar a retrieval directamente
    return await retrievalBased(state);
  }

  // Snapshot persistido + turn
  const st = await getConvState(hotelId, conversationId || "");
  // Normalización defensiva de slots legacy
  const persistedStr = normalizeSlotsToStrings(
    normalizeSlots(st?.reservationSlots || {})
  );
  const turnStr = normalizeSlotsToStrings(
    normalizeSlots(reservationSlots || {})
  );
  const merged: SlotMap = { ...persistedStr, ...turnStr };
  console.log("[DEBUG] Merged slots:", merged);
  // Normalizaciones locales (antes de MCP)
  if (looksLikeName(normalizedMessage) && !merged.guestName) {
    merged.guestName = normalizeNameCase(normalizedMessage);
  }
  const guessed = extractGuests(normalizedMessage);
  if (guessed && !merged.numGuests)
    merged.numGuests = String(clampGuests(Number(guessed), merged.roomType));
  const dr = extractDateRangeFromText(normalizedMessage);
  if (!merged.checkIn && dr.checkIn) merged.checkIn = dr.checkIn;
  if (!merged.checkOut && dr.checkOut) merged.checkOut = dr.checkOut;

  // Si la reserva ya está confirmada (salesStage === 'close'), derivar cualquier consulta general al retrieval (RAG)
  if (state.salesStage === "close") {
    return await retrievalBased(state);
  }
  // --- NUEVO: Si el usuario confirma y ya están todos los datos, crear la reserva aunque el salesStage no sea 'quote' ---
  if (isConfirmIntentLight(normalizedMessage)) {
    const haveAllNow = REQUIRED_SLOTS.every((k) => !!merged[k]);
    if (haveAllNow) {
      // Normalizar checkIn y checkOut a ISO datetime (YYYY-MM-DDT00:00:00Z)
      const toISODateTime = (d: string) =>
        d && d.length === 10 ? `${d}T00:00:00Z` : d;
      const completeSnapshot = {
        ...merged,
        checkIn: toISODateTime(merged.checkIn!),
        checkOut: toISODateTime(merged.checkOut!),
        locale,
      };
      await upsertConvState(hotelId, conversationId || "", {
        reservationSlots: completeSnapshot,
        updatedBy: "ai",
      });
      // Llamar a confirmAndCreate
      const result = await confirmAndCreate(
        hotelId,
        {
          guestName: completeSnapshot.guestName!,
          roomType: completeSnapshot.roomType!,
          numGuests: parseInt(completeSnapshot.numGuests!, 10) || 1,
          checkIn: completeSnapshot.checkIn!,
          checkOut: completeSnapshot.checkOut!,
          locale,
        },
        channel
      );
      let msg = result.ok
        ? lang2 === "es"
          ? `✅ ¡Reserva confirmada! Código **${result.reservationId ?? "pendiente"
          }**.\nHabitación **${completeSnapshot.roomType}**, Fechas **${completeSnapshot.checkIn
          } → ${completeSnapshot.checkOut}**${completeSnapshot.numGuests
            ? ` · **${completeSnapshot.numGuests}** huésped(es)`
            : ""
          }. ¡Gracias, ${completeSnapshot.guestName}!`
          : lang2 === "pt"
            ? `✅ Reserva confirmada! Código **${result.reservationId ?? "pendente"
            }**.\nQuarto **${completeSnapshot.roomType}**, Datas **${completeSnapshot.checkIn
            } → ${completeSnapshot.checkOut}**${completeSnapshot.numGuests
              ? ` · **${completeSnapshot.numGuests}** hóspede(s)`
              : ""
            }. Obrigado, ${completeSnapshot.guestName}!`
            : `✅ Booking confirmed! Code **${result.reservationId ?? "pending"
            }**.\nRoom **${completeSnapshot.roomType}**, Dates **${completeSnapshot.checkIn
            } → ${completeSnapshot.checkOut}**${completeSnapshot.numGuests
              ? ` · **${completeSnapshot.numGuests}** guest(s)`
              : ""
            }. Thank you, ${completeSnapshot.guestName}!`
        : result.message;
      return {
        messages: [new AIMessage(msg)],
        reservationSlots: {},
        category: "reservation",
        salesStage: "close",
      };
    }
    // Si no hay todos los datos, seguir el flujo normal (repreguntar)
  }

  // Si ya está todo, saltamos disponibilidad
  const haveAllNow = REQUIRED_SLOTS.every((k) => !!merged[k]);
  if (haveAllNow) {
    const ci = new Date(merged.checkIn!);
    const co = new Date(merged.checkOut!);
    if (
      !(ci instanceof Date && !isNaN(ci.valueOf())) ||
      !(co instanceof Date && !isNaN(co.valueOf())) ||
      ci >= co
    ) {
      const text =
        lang2 === "es"
          ? "Las fechas parecen inválidas. ¿Podés confirmar check-in (dd/mm/aaaa) y check-out (dd/mm/aaaa)?"
          : lang2 === "pt"
            ? "As datas parecem inválidas. Pode confirmar check-in (dd/mm/aaaa) e check-out (dd/mm/aaaa)?"
            : "Dates look invalid. Could you confirm check-in (dd/mm/yyyy) and check-out (dd/mm/yyyy)?";
      return {
        messages: [new AIMessage(text)],
        reservationSlots: { ...merged },
        category: "reservation",
        salesStage: "qualify",
      };
    }

    const completeSnapshot = { ...merged, locale };
    await upsertConvState(hotelId, conversationId || "", {
      reservationSlots: completeSnapshot,
      updatedBy: "ai",
    });
    console.log("[DEBUG] Complete snapshot:", completeSnapshot);
    let availability;
    try {
      availability = await askAvailability(hotelId, {
        guestName: completeSnapshot.guestName!,
        roomType: completeSnapshot.roomType!,
        numGuests: parseInt(completeSnapshot.numGuests!, 10) || 1,
        checkIn: completeSnapshot.checkIn!,
        checkOut: completeSnapshot.checkOut!,
        locale,
      });
    } catch (err) {
      console.error("Error en askAvailability:", err, (err as Error)?.stack);
      return {
        messages: [
          new AIMessage(
            lang2 === "es"
              ? "Perdón, vengo de linea 213 y tuve un problema al consultar la disponibilidad. ¿Podés intentar nuevamente?"
              : lang2 === "pt"
                ? "Desculpe, tive um problema ao verificar a disponibilidade. Pode tentar novamente?"
                : "Sorry, I had a problem checking availability. Could you try again?"
          ),
        ],
        reservationSlots: completeSnapshot,
        category: "reservation",
        salesStage: "followup",
      };
    }
    console.log("[DEBUG] Availability:", availability);
    await upsertConvState(hotelId, conversationId || "", {
      lastProposal: {
        text:
          availability.proposal ||
          (availability.available
            ? "Hay disponibilidad."
            : "Sin disponibilidad."),
        available: !!availability.available,
        options: availability.options,
        toolCall: {
          name: "checkAvailability",
          input: {
            hotelId,
            roomType: completeSnapshot.roomType,
            numGuests: parseInt(completeSnapshot.numGuests!, 10) || 1,
            checkIn: completeSnapshot.checkIn,
            checkOut: completeSnapshot.checkOut,
          },
          outputSummary: availability.available
            ? "available:true"
            : "available:false",
          at: new Date().toISOString(),
        },
      },
      salesStage: availability.available ? "quote" : "followup",
      updatedBy: "ai",
    });
    console.log("[DEBUG] Updated conv state after availability");
    if (!availability.ok) {
      console.error("[graph] askAvailability returned not ok:", availability);
      return {
        messages: [new AIMessage(availability.message)],
        reservationSlots: completeSnapshot,
        category: "reservation",
        salesStage: "followup",
      };
    }
    if (!availability.available) {
      const noAvailText =
        availability.proposal ||
        (lang2 === "es"
          ? `No tengo disponibilidad para ${completeSnapshot.roomType} en esas fechas.`
          : lang2 === "pt"
            ? `Não tenho disponibilidade para ${completeSnapshot.roomType} nessas datas.`
            : `No availability for ${completeSnapshot.roomType} on those dates.`);
      return {
        messages: [new AIMessage(noAvailText)],
        reservationSlots: completeSnapshot,
        category: "reservation",
        salesStage: "quote",
      };
    }

    const confirmLine =
      lang2 === "es"
        ? "\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”."
        : lang2 === "pt"
          ? "\n\nConfirma a reserva respondendo “CONFIRMAR”."
          : "\n\nDo you confirm the booking? Reply “CONFIRMAR” (confirm).";
    return {
      messages: [
        new AIMessage(
          (availability.proposal || "Tengo disponibilidad.") + confirmLine
        ),
      ],
      reservationSlots: completeSnapshot,
      category: "reservation",
      salesStage: "quote",
    };
  }

  // ===== MCP fill-slots =====
  const augmentedUserText =
    normalizedMessage +
    (Object.keys(merged).length
      ? `\n\nDatos previos conocidos: ${JSON.stringify(merged)}`
      : "") +
    `\n\nNota: Locale conocido: ${locale}. No lo pidas; usá este valor si fuera necesario.`;

  let filled: any;
  try {
    filled = await fillSlotsWithLLM(augmentedUserText, locale, { hotelTz });
  } catch {
    console.timeLog("fillSlotsWithLLM");
    const missing = REQUIRED_SLOTS.filter((k) => !merged[k]);
    const q = buildAggregatedQuestion(missing, lang2);
    await upsertConvState(hotelId, conversationId || "", {
      reservationSlots: merged,
      salesStage: "qualify",
      updatedBy: "ai",
    });
    return {
      messages: [new AIMessage(q)],
      reservationSlots: merged,
      category: "reservation",
      salesStage: "qualify",
    };
  }

  // ✅ NUEVO: manejar errores del MCP sin mostrar el error técnico
  if (filled?.need === "error") {
    const msg: string = String(filled?.message || "");
    const missingGuests =
      /"path"\s*:\s*\[\s*"guests"\s*\]/i.test(msg) ||
      (/guests/i.test(msg) && /expected/i.test(msg) && /number/i.test(msg));

    if (missingGuests) {
      // Intentar completar desde lo que ya tenemos o lo que dice el usuario
      const inferredRaw =
        (merged.numGuests
          ? parseInt(String(merged.numGuests), 10)
          : undefined) ?? extractGuests(normalizedMessage);
      const inferred =
        typeof inferredRaw === "string"
          ? parseInt(inferredRaw, 10)
          : inferredRaw;
      if (inferred) {
        merged.numGuests = String(clampGuests(inferred, merged.roomType));
        // con esto, re-evaluamos si ya tenemos todo
        const haveAll = REQUIRED_SLOTS.every((k) => !!merged[k]);
        if (haveAll) {
          // Igual que el fast-path de disponibilidad
          const ci = new Date(merged.checkIn!);
          const co = new Date(merged.checkOut!);
          if (
            !(ci instanceof Date && !isNaN(ci.valueOf())) ||
            !(co instanceof Date && !isNaN(co.valueOf())) ||
            ci >= co
          ) {
            const txt =
              lang2 === "es"
                ? "Las fechas parecen inválidas. ¿Podés confirmar check-in (dd/mm/aaaa) y check-out (dd/mm/aaaa)?"
                : lang2 === "pt"
                  ? "As datas parecem inválidas. Pode confirmar check-in (dd/mm/aaaa) e check-out (dd/mm/aaaa)?"
                  : "Dates look invalid. Could you confirm check-in (dd/mm/yyyy) and check-out (dd/mm/yyyy)?";
            return {
              messages: [new AIMessage(txt)],
              reservationSlots: { ...merged },
              category: "reservation",
              salesStage: "qualify",
            };
          }

          const completeSnapshot = { ...merged, locale };
          await upsertConvState(hotelId, conversationId || "", {
            reservationSlots: completeSnapshot,
            updatedBy: "ai",
          });

          const availability = await askAvailability(hotelId, {
            guestName: completeSnapshot.guestName!,
            roomType: completeSnapshot.roomType!,
            numGuests: parseInt(completeSnapshot.numGuests!, 10) || 1,
            checkIn: completeSnapshot.checkIn!,
            checkOut: completeSnapshot.checkOut!,
            locale,
          });

          await upsertConvState(hotelId, conversationId || "", {
            lastProposal: {
              text:
                availability.proposal ||
                (availability.available
                  ? "Hay disponibilidad."
                  : "Sin disponibilidad."),
              available: !!availability.available,
              options: availability.options,
              toolCall: {
                name: "checkAvailability",
                input: {
                  hotelId,
                  roomType: completeSnapshot.roomType,
                  numGuests: parseInt(completeSnapshot.numGuests!, 10) || 1,
                  checkIn: completeSnapshot.checkIn,
                  checkOut: completeSnapshot.checkOut,
                },
                outputSummary: availability.available
                  ? "available:true"
                  : "available:false",
                at: new Date().toISOString(),
              },
            },
            salesStage: availability.available ? "quote" : "followup",
            updatedBy: "ai",
          });

          if (!availability.ok) {
            return {
              messages: [new AIMessage(availability.message)],
              reservationSlots: completeSnapshot,
              category: "reservation",
              salesStage: "followup",
            };
          }
          if (!availability.available) {
            const noAvailText =
              availability.proposal ||
              (lang2 === "es"
                ? `No tengo disponibilidad para ${completeSnapshot.roomType} en esas fechas.`
                : lang2 === "pt"
                  ? `Não tenho disponibilidade para ${completeSnapshot.roomType} nessas datas.`
                  : `No availability for ${completeSnapshot.roomType} on those dates.`);
            return {
              messages: [new AIMessage(noAvailText)],
              reservationSlots: completeSnapshot,
              category: "reservation",
              salesStage: "quote",
            };
          }

          const confirmLine =
            lang2 === "es"
              ? "\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”."
              : lang2 === "pt"
                ? "\n\nConfirma a reserva respondendo “CONFIRMAR”."
                : "\n\nDo you confirm the booking? Reply “CONFIRMAR” (confirm).";
          return {
            messages: [
              new AIMessage(
                (availability.proposal || "Tengo disponibilidad.") + confirmLine
              ),
            ],
            reservationSlots: completeSnapshot,
            category: "reservation",
            salesStage: "quote",
          };
        }
      }

      // No se pudo inferir → pedirlo amable
      const ask =
        lang2 === "es"
          ? "¿Cuántos huéspedes se alojarán?"
          : lang2 === "pt"
            ? "Quantos hóspedes irão se hospedar?"
            : "How many guests will stay?";
      await upsertConvState(hotelId, conversationId || "", {
        reservationSlots: merged,
        salesStage: "qualify",
        updatedBy: "ai",
      });
      return {
        messages: [new AIMessage(ask)],
        reservationSlots: merged,
        category: "reservation",
        salesStage: "qualify",
      };
    }

    // Error genérico → preguntar faltantes sin Zod
    const missing = REQUIRED_SLOTS.filter((k) => !merged[k]);
    const q = buildAggregatedQuestion(missing, lang2);
    await upsertConvState(hotelId, conversationId || "", {
      reservationSlots: merged,
      salesStage: "qualify",
      updatedBy: "ai",
    });
    return {
      messages: [new AIMessage(q)],
      reservationSlots: merged,
      category: "reservation",
      salesStage: "qualify",
    };
  }

  if (filled.need === "question") {
    const partialRaw = filled.partial ?? {};
    const partial = sanitizePartial(
      normalizeSlots(partialRaw),
      merged,
      normalizedMessage
    );
    const nextSnapshot: Record<string, string> = {
      ...merged,
      ...(partial.guestName ? { guestName: partial.guestName } : {}),
      ...(partial.roomType ? { roomType: partial.roomType } : {}),
      ...(partial.numGuests ? { numGuests: String(partial.numGuests) } : {}),
      ...(partial.checkIn ? { checkIn: partial.checkIn } : {}),
      ...(partial.checkOut ? { checkOut: partial.checkOut } : {}),
      locale,
    };

    const missingOrder: RequiredSlot[] = [
      "guestName",
      "roomType",
      "checkIn",
      "checkOut",
      "numGuests",
    ];
    const missing = missingOrder.filter((k) => !nextSnapshot[k]);

    const rawQ = (filled.question || "").trim();
    let questionText = stripLocaleRequests(rawQ);
    if (mentionsLocale(rawQ) || questionText.length < 8) questionText = "";

    if (missing.length === 0) {
      const canonicalDone =
        lang2 === "es"
          ? "Tengo todos los datos. ¿Confirmo la solicitud?"
          : lang2 === "pt"
            ? "Tenho todos os dados. Posso confirmar a solicitação?"
            : "I have all details. Shall I confirm the request?";
      questionText = canonicalDone;
    } else if (missing.length === 1) {
      const k = missing[0];
      const L = labelSlot(k, lang2);
      const art =
        lang2 === "en"
          ? "the"
          : lang2 === "pt"
            ? k === "numGuests"
              ? "o"
              : "a"
            : k === "numGuests"
              ? "el"
              : "la";
      const single =
        lang2 === "en" ? `What is the ${L}?` : `¿Cuál es ${art} ${L}?`;
      if (FORCE_CANONICAL_QUESTION || !questionText) questionText = single;
    } else {
      questionText = buildAggregatedQuestion(missing, lang2);
    }

    await upsertConvState(hotelId, conversationId || "", {
      reservationSlots: nextSnapshot,
      salesStage: missing.length ? "qualify" : "quote",
      updatedBy: "ai",
    });

    return {
      messages: [new AIMessage(questionText)],
      reservationSlots: nextSnapshot,
      category: "reservation",
      salesStage: missing.length ? "qualify" : "quote",
    };
  }

  // LLM devolvió slots completos
  const completed = filled.slots;
  const ci = new Date(completed.checkIn);
  const co = new Date(completed.checkOut);
  if (
    !(ci instanceof Date && !isNaN(ci.valueOf())) ||
    !(co instanceof Date && !isNaN(co.valueOf())) ||
    ci >= co
  ) {
    const text =
      lang2 === "es"
        ? "Las fechas parecen inválidas. ¿Podés confirmar check-in (dd/mm/aaaa) y check-out (dd/mm/aaaa)?"
        : lang2 === "pt"
          ? "As datas parecem inválidas. Pode confirmar check-in (dd/mm/aaaa) e check-out (dd/mm/aaaa)?"
          : "Dates look invalid. Could you confirm check-in (dd/mm/yyyy) and check-out (dd/mm/yyyy)?";
    return {
      messages: [new AIMessage(text)],
      reservationSlots: { ...merged },
      category: "reservation",
      salesStage: "qualify",
    };
  }

  const completeSnapshot: Record<string, string> = {
    ...merged,
    guestName: completed.guestName,
    roomType: completed.roomType,
    checkIn: completed.checkIn,
    checkOut: completed.checkOut,
    numGuests: String(completed.numGuests ?? completed.guests ?? ""),
    locale: completed.locale || locale,
  };

  await upsertConvState(hotelId, conversationId || "", {
    reservationSlots: completeSnapshot,
    updatedBy: "ai",
  });

  const availability = await askAvailability(hotelId, {
    guestName: completeSnapshot.guestName!,
    roomType: completeSnapshot.roomType!,
    numGuests: parseInt(completeSnapshot.numGuests!, 10) || 1,
    checkIn: completeSnapshot.checkIn!,
    checkOut: completeSnapshot.checkOut!,
    locale,
  });

  await upsertConvState(hotelId, conversationId || "", {
    lastProposal: {
      text:
        availability.proposal ||
        (availability.available
          ? "Hay disponibilidad."
          : "Sin disponibilidad."),
      available: !!availability.available,
      options: availability.options,
      toolCall: {
        name: "checkAvailability",
        input: {
          hotelId,
          roomType: completeSnapshot.roomType,
          numGuests: parseInt(completeSnapshot.numGuests!, 10) || 1,
          checkIn: completeSnapshot.checkIn,
          checkOut: completeSnapshot.checkOut,
        },
        outputSummary: availability.available
          ? "available:true"
          : "available:false",
        at: new Date().toISOString(),
      },
    },
    salesStage: availability.available ? "quote" : "followup",
    updatedBy: "ai",
  });

  if (!availability.ok) {
    return {
      messages: [new AIMessage(availability.message)],
      reservationSlots: completeSnapshot,
      category: "reservation",
      salesStage: "followup",
    };
  }
  if (!availability.available) {
    const noAvailText =
      availability.proposal ||
      (lang2 === "es"
        ? `No tengo disponibilidad para ${completeSnapshot.roomType} en esas fechas.`
        : lang2 === "pt"
          ? `Não tenho disponibilidade para ${completeSnapshot.roomType} nessas datas.`
          : `No availability for ${completeSnapshot.roomType} on those dates.`);
    return {
      messages: [new AIMessage(noAvailText)],
      reservationSlots: completeSnapshot,
      category: "reservation",
      salesStage: "quote",
    };
  }

  const confirmLine =
    lang2 === "es"
      ? "\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”."
      : lang2 === "pt"
        ? "\n\nConfirma a reserva respondendo “CONFIRMAR”."
        : "\n\nDo you confirm the booking? Reply “CONFIRMAR” (confirm).";
  return {
    messages: [
      new AIMessage(
        (availability.proposal || "Tengo disponibilidad.") + confirmLine
      ),
    ],
    reservationSlots: completeSnapshot,
    category: "reservation",
    salesStage: "quote",
  };
}

/* ===== Otros handlers ===== */
async function handleCancelReservationNode(state: typeof GraphState.State) {
  const { normalizedMessage, detectedLanguage } = state;
  const lang = (detectedLanguage || "es").slice(0, 2);
  const map = await getSystemPlaybooks(
    ["modify_reservation", "ambiguity_policy"],
    lang
  );
  const sys = [
    "Eres un recepcionista de hotel. Política: nunca cancela sin confirmación explícita del huésped.",
    map["ambiguity_policy"]?.text
      ? `\n[ambiguity_policy]\n${map["ambiguity_policy"].text}\n`
      : "",
    map["modify_reservation"]?.text
      ? `\n[modify_reservation]\n${map["modify_reservation"].text}\n`
      : "",
    `Responde en ${lang}, breve y amable.`,
  ].join("\n");
  const out = await new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0,
  }).invoke([
    new SystemMessage(sys),
    new HumanMessage(`Usuario: """${normalizedMessage}"""`),
  ]);
  const text =
    typeof out.content === "string" ? out.content.trim() : String(out.content);
  return { messages: [new AIMessage(text)] };
}
async function handleAmenitiesNode(state: typeof GraphState.State) {
  const lang = (state.detectedLanguage || "es").slice(0, 2);
  const text =
    lang === "es"
      ? "¡Claro! Contame qué servicio querés consultar (piscina, desayuno, cocheras, etc.) y te paso la info."
      : "Sure! Tell me which amenity you need (pool, breakfast, parking, etc.) and I’ll share the details.";
  return { messages: [new AIMessage(text)] };
}
async function handleBillingNode(state: typeof GraphState.State) {
  const lang = (state.detectedLanguage || "es").slice(0, 2);
  const text =
    lang === "es"
      ? "Con gusto. ¿Tu consulta de facturación es por una reserva existente o por una futura?"
      : "Happy to help. Is your billing question about an existing booking or a future one?";
  return { messages: [new AIMessage(text)] };
}
async function handleSupportNode(state: typeof GraphState.State) {
  const lang = (state.detectedLanguage || "es").slice(0, 2);
  const text =
    lang === "es"
      ? "Estoy para ayudarte. ¿Podés contarme brevemente el problema?"
      : "I’m here to help. Could you briefly describe the issue?";
  return { messages: [new AIMessage(text)] };
}
async function retrievalBasedNode(state: typeof GraphState.State) {
  return await retrievalBased(state);
}

/* =========================
 *         GRAPH
 * ========================= */
const g = new StateGraph(GraphState)
  .addNode("classify", classifyNode)
  .addNode("handle_reservation", handleReservationNode)
  .addNode("handle_reservation_snapshot", handleReservationSnapshotNode)
  .addNode("handle_cancel_reservation", handleCancelReservationNode)
  .addNode("handle_amenities", handleAmenitiesNode)
  .addNode("handle_billing", handleBillingNode)
  .addNode("handle_support", handleSupportNode)
  .addNode("handle_retrieval_based", retrievalBasedNode)
  .addEdge("__start__", "classify")
  .addConditionalEdges("classify", (state) => state.category, {
    reservation: "handle_reservation",
    reservation_snapshot: "handle_reservation_snapshot",
    cancel_reservation: "handle_cancel_reservation",
    amenities: "handle_amenities",
    billing: "handle_billing",
    support: "handle_support",
    retrieval_based: "handle_retrieval_based",
    other: "handle_retrieval_based",
  })
  .addEdge("handle_reservation", "__end__")
  .addEdge("handle_cancel_reservation", "__end__")
  .addEdge("handle_amenities", "__end__")
  .addEdge("handle_billing", "__end__")
  .addEdge("handle_support", "__end__")
  .addEdge("handle_retrieval_based", "__end__");

export const agentGraph = g.compile();
