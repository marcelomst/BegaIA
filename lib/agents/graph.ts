// Path: /root/begasist/lib/agents/graph.ts
import { Annotation, StateGraph } from "@langchain/langgraph";
import { BaseMessage, AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { getSystemPlaybooks } from "@/lib/astra/systemPlaybook";
import { getConvState, upsertConvState } from "@/lib/db/convState";
import { retrievalBased } from "@/lib/agents/retrieval_based";
import { classifyQuery } from "@/lib/classifier";
import {
  fillSlotsWithLLM,
  askAvailability,
  confirmAndCreate,
  type FillSlotsResult,
} from "@/lib/agents/reservations";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { auditedInterpret } from "@/lib/audit/router";
import type { IntentCategory, DesiredAction, RequiredSlot, SlotMap, IntentResult  } from "@/types/audit"; // ⬅️ nuevos imports
import { looksLikeName } from "./helpers"; // ⬅️ import función looksLikeName  
import { normalizeNameCase, heuristicClassify } from "./helpers"; // ⬅️ import función normalizeNameCase
 
/* =========================
 *        TYPES
 * ========================= */



const REQUIRED_SLOTS: RequiredSlot[] = ["guestName", "roomType", "checkIn", "checkOut", "numGuests"];
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

// máximo 4 huéspedes (para evitar locuras)
const WORD2NUM: Record<string, number> = { uno:1, una:1, dos:2, tres:3, cuatro:4 };
function extractGuests(msg: string): number | undefined {
  const mNum = msg.match(/\b(\d{1,2})\b/);
  if (mNum) return parseInt(mNum[1], 10);
  const mWord = msg.toLowerCase().match(/\b(uno|una|dos|tres|cuatro)\b/);
  return mWord ? WORD2NUM[mWord[1]] : undefined;
}


function isConfirmIntentLight(s: string) {
  const t = (s || "").toLowerCase().trim();
  return /\b(confirmar|confirmo|confirm|sí|si|ok|dale|de acuerdo|yes|okay|okey)\b/.test(t);
}

function looksRoomInfo(s: string) {
  return /\b(check[- ]?in|check[- ]?out|ingreso|salida|horario|hora(s)?)\b/i.test(s);
}

function isQuestionLike(s: string) {
  const t = (s || "").toLowerCase();
  if (t.includes("?")) return true;
  return /\b(que|qué|cuando|cuándo|a qué hora|a que hora|how|what|when|where|donde|dónde|hora|precio|cost|vale|tienen|hay|se puede|política|policy|check ?in|check ?out)\b/.test(t);
}
function labelSlot(slot: RequiredSlot, lang2: "es" | "en" | "pt") {
  return (LABELS[lang2] as any)[slot] ?? slot;
}
function articleFor(slot: RequiredSlot, lang2: "es" | "en" | "pt") {
  if (lang2 === "en") return "the";

  if (lang2 === "es") {
    // nombre (el), tipo (el), fecha (la), fecha (la), número (el)
    const map: Record<RequiredSlot, "el" | "la"> = {
      guestName: "el",
      roomType:  "el",   // "el tipo de habitación"
      checkIn:   "la",   // "la fecha de check-in"
      checkOut:  "la",   // "la fecha de check-out"
      numGuests: "el",   // "el número de huéspedes"
    };
    return map[slot];
  }

  // pt
  {
    // nome (o), tipo (o), data (a), data (a), número (o)
    const map: Record<RequiredSlot, "o" | "a"> = {
      guestName: "o",
      roomType:  "o",
      checkIn:   "a",
      checkOut:  "a",
      numGuests: "o",
    };
    return map[slot];
  }
}



function isStatusQuery(text: string) {
  const t = (text || "").toLowerCase();
  if (/(verific|cheque|revis|qué\sreserva|que\sreserva|qué\shice|que\shice|qué\squedó|que\squed[oó])/.test(t)) return true;
  if (/(what.*(reservation|booking).*(did|have)|show.*(reservation|booking)|status|review|check.*(reservation|booking))/.test(t)) return true;
  return false;
}
function summarizeDraft(lang2: "es" | "en" | "pt", s: Partial<Record<RequiredSlot, string>>) {
  const L = (k: RequiredSlot) => labelSlot(k, lang2);
  const line = (k: RequiredSlot) => `- ${L(k)}: ${s[k]?.toString().trim() || "—"}`;
  const pre =
    lang2 === "es" ? "Esto es lo que llevo de tu reserva:"
    : lang2 === "pt" ? "Aqui está o que tenho da sua reserva:"
    : "Here is what I have for your booking:";
  return [
    pre,
    line("guestName"),
    line("roomType"),
    line("checkIn"),
    line("checkOut"),
    line("numGuests"),
  ].join("\n");
}
function isGreeting(s: string) {
  const t = (s || "").trim().toLowerCase();
  return /^(hola|hello|hi|hey|buenas|buenos dias|buenos días|buenas tardes|buenas noches|olá|ola|oi)$/.test(t);
}

/* =========================
 *        STATE
 * ========================= */
export const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [] as BaseMessage[],
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
 *        HELPERS
 * ========================= */
const llmMini = new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 });



async function loadPlaybookBundle(langIso1: string | undefined) {
  const keys = ["reservation_flow", "modify_reservation", "ambiguity_policy"];
  const map = await getSystemPlaybooks(keys, langIso1 || "es");
  return {
    reservationFlow: map["reservation_flow"]?.text || "",
    modifyReservation: map["modify_reservation"]?.text || "",
    ambiguity: map["ambiguity_policy"]?.text || "",
  };
}

/* =========================
 *   Helpers slots / idioma
 * ========================= */

function normalizeSlotsToStrings(src: any): SlotMap {
  const out: SlotMap = {};
  if (src?.guestName != null) out.guestName = String(src.guestName);
  if (src?.roomType != null) out.roomType = String(src.roomType);
  if (src?.checkIn != null) out.checkIn = String(src.checkIn);
  if (src?.checkOut != null) out.checkOut = String(src.checkOut);
  if (src?.numGuests != null) out.numGuests = String(src.numGuests);
  return out;
}
// function iso2toIso3(iso2: string): string {
//   const t = (iso2 || "es").slice(0,2).toLowerCase();
//   if (t === "es") return "spa";
//   if (t === "en") return "eng";
//   if (t === "pt") return "por";
//   return "spa";
// }
function isConfirmIntent(s: string) {
  const t = (s || "").toLowerCase();
  return /\b(confirmar|confirmo|sí|si|ok|dale|de acuerdo|confirm|yes|okey|okay)\b/.test(t);
}

/** === Nuevo: sanitización de parciales para evitar "pisar" valores válidos y capear guests === */
function looksLikeDateOnly(msg: string) {
  const t = (msg || "").trim();
  // ejemplos: 12/9/2025, 10-09-2025, 2025-09-10
  return /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})$/.test(t);
}
function looksLikeCorrection(msg: string) {
  const t = (msg || "").toLowerCase();
  return /\b(no,?|perd[oó]n|me equivoqu[eé]|corrig|mejor|cambio|cambiar)\b/.test(t);
}
function maxGuestsFor(roomType?: string): number {
  const rt = (roomType || "").toLowerCase();
  if (/single|individual|simple/.test(rt)) return 1;
  if (/double|doble|matrimonial|twin|queen|king/.test(rt)) return 2;
  if (/triple/.test(rt)) return 3;
  if (/suite|familiar/.test(rt)) return 4;
  return 4; // default conservador
}
function clampGuests(n: number, roomType?: string) {
  const min = 1;
  const max = maxGuestsFor(roomType);
  if (!Number.isFinite(n)) return undefined;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}
function sanitizePartial(
  partial: Partial<{ guestName: string; roomType: string; guests: number; checkIn: string; checkOut: string; locale: string }>,
  merged: SlotMap,
  userMsg: string
) {
  const out = { ...partial };

  // Nunca adivinar guests si el mensaje parece sólo una fecha
  if (looksLikeDateOnly(userMsg)) delete (out as any).guests;

  // Si ya teníamos un slot, no lo pisamos salvo que el usuario parezca corregir
  const correcting = looksLikeCorrection(userMsg);

  if (merged.guestName && out.guestName && !correcting) delete (out as any).guestName;
  if (merged.roomType && out.roomType && !correcting) delete (out as any).roomType;
  if (merged.checkIn && out.checkIn && !correcting) delete (out as any).checkIn;
  if (merged.checkOut && out.checkOut && !correcting) delete (out as any).checkOut;

  // Guests: clamp según roomType conocido (parcial o ya guardado)
  const rt = out.roomType || merged.roomType;
  if (typeof out.guests === "number") {
    const clamped = clampGuests(out.guests, rt);
    if (typeof clamped === "number") (out as any).guests = clamped;
    else delete (out as any).guests;
  }

  return out;
}

/* =========================
 *         NODES
 * ========================= */

// 1) Classify node
async function classifyNode(state: typeof GraphState.State) {
  const { normalizedMessage, detectedLanguage, reservationSlots, meta, hotelId } = state;
  const lang = (detectedLanguage || "es").slice(0, 2);
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
      promptKey: looksRoomInfo(normalizedMessage) ? "room_info" : "ambiguity_policy",
      messages: [],
    };
  }
    const hasAnySlot = (["guestName","roomType","checkIn","checkOut","numGuests"] as const)
    .some(k => !!(reservationSlots as any)?.[k]);
   // 🔒 Si ya estamos en reserva o hay slots, nos quedamos en reserva
  if (prev === "reservation" || hasAnySlot) {
    // salvo que detectemos explícitamente cancel/amenities/billing/support
    const t = (normalizedMessage || "").toLowerCase();
    const isHardSwitch =
      /\b(cancel|cancelar|anular)\b/.test(t) ||
      /\b(piscina|desayuno|parking|estacionamiento|spa|gym|gimnasio)\b/.test(t) ||
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
  console.log("🧠 Heuristic classification:", h);
  if (h.intentConfidence < 0.75) {
    try {
      const llmC = await classifyQuery(normalizedMessage, hotelId);
      h = {
        category: llmC.category as IntentCategory,
        desiredAction: h.desiredAction,
        intentConfidence: Math.max(h.intentConfidence, 0.9),
        intentSource: "llm",
      };
      const forcedPK = llmC.promptKey ?? (looksRoomInfo(normalizedMessage) ? "room_info" : undefined);
      if (forcedPK) {
        return {
          category: "retrieval_based",
          desiredAction: h.desiredAction,
          intentConfidence: h.intentConfidence,
          intentSource: "llm",
          promptKey: forcedPK,
          messages: [],
        };
      }
    } catch (err) {
      console.warn("[classifyNode] classifyQuery fallback error:", err);
    }
  }

  if (
    (prev === "cancel_reservation" ) &&
    looksLikeName(normalizedMessage)
  ) {
    h = {
      category: prev === "cancel_reservation" ? "cancel_reservation" : "reservation",
      desiredAction: prev === "cancel_reservation" ? "cancel" : (h.desiredAction ?? "modify"),
      intentConfidence: Math.max(h.intentConfidence, 0.85),
      intentSource: h.intentSource === "llm" ? "llm" : "heuristic",
    };
  }

  const pickPromptKey = (cat: IntentCategory, desired: DesiredAction): string | null => {
    if (cat === "reservation") return desired === "modify" ? "modify_reservation" : "reservation_flow";
    if (cat === "cancel_reservation") return "modify_reservation";
    if (cat === "retrieval_based") return looksRoomInfo(normalizedMessage) ? "room_info" : "ambiguity_policy";
    return "ambiguity_policy";
  };
  let promptKey = pickPromptKey(h.category, h.desiredAction);
  if (promptKey) {
    return {
      category: h.category === "retrieval_based" ? "retrieval_based" : h.category,
      desiredAction: h.desiredAction,
      intentConfidence: h.intentConfidence,
      intentSource: h.intentSource,
      promptKey,
      messages: [],
    };
  }

  return {
    category: h.category,
    desiredAction: h.desiredAction,
    intentConfidence: h.intentConfidence,
    intentSource: h.intentSource,
    promptKey: null,
    messages: [],
  };
}

/* =========================
 *   Handler: reservation (MCP)
 * ========================= */
async function handleReservationNode(state: typeof GraphState.State) {
  const {
    detectedLanguage,
    reservationSlots,
    normalizedMessage,
    hotelId,
    conversationId,
  } = state;
  const channel = (state.meta as any)?.channel || "web";
    // 🔧 Carga de config de hotel y banderas
  const cfg = await getHotelConfig(hotelId).catch(() => null);
  const hotelTz =
    cfg?.timezone ||
    (await getHotelConfig(hotelId).catch(() => null))?.timezone ||
    "UTC";
    // bandera: forzar pregunta canónica vs. confiar en la del LLM
  const forceCanonicalQuestion: boolean =
    // 1) por canal (si existe)
    (cfg as any)?.channelConfigs?.[channel]?.reservations?.forceCanonicalQuestion ??
    // 2) general del hotel (si la definís ahí)
    (cfg as any)?.reservations?.forceCanonicalQuestion ??
    // 3) default
    false;
  const lang2 = (detectedLanguage || "es").slice(0, 2) as "es" | "en" | "pt";
  const locale = lang2; // 👈 mantenemos ISO-639-1 en todo el flujo
  // 🔴 BP-R1: estado previo
  console.debug("[reservation] IN", {
    normalizedMessage,
    lang2,
    conversationId,
  });
  // Snapshot persistido (si lo hay)
  const st = await getConvState(hotelId, conversationId || "");
  console.debug("[reservation] persistedStr", st?.reservationSlots);
  console.debug("[reservation] turnStr", reservationSlots);
  const isInsert = !st;

  const persistedStr = normalizeSlotsToStrings(st?.reservationSlots || {});
  const turnStr      = normalizeSlotsToStrings(reservationSlots || {});
  const mergedSlots: SlotMap = { ...persistedStr, ...turnStr };
  
  // Si solo escribió el nombre, normalizamos
  if (looksLikeName(normalizedMessage) && !mergedSlots.guestName) {
    mergedSlots.guestName = normalizeNameCase(normalizedMessage);
    console.debug("[BP-R2A] looksLikeName→guestName:", mergedSlots.guestName);
  }
  // 🔴 BP-R2: mergedSlots (antes de check de status/confirm)
  console.debug("[reservation] mergedSlots", mergedSlots);
  // “¿Qué quedó?” → resumen
  if (isStatusQuery(normalizedMessage)) {
    const missing = REQUIRED_SLOTS.filter((k) => !mergedSlots[k]);
    const summary = summarizeDraft(lang2, mergedSlots);
    const tail =
      missing.length === 0
        ? (lang2 === "es"
            ? "\n\nTengo todos los datos. ¿Confirmo la solicitud?"
            : lang2 === "pt"
            ? "\n\nTenho todos os dados. Posso confirmar a solicitação?"
            : "\n\nI have all details. Shall I confirm the request?")
        : (lang2 === "es"
            ? `\n\nPara avanzar me falta: ${missing.map((k) => labelSlot(k, lang2)).join(", ")}.`
            : lang2 === "pt"
            ? `\n\nPara avançar, falta: ${missing.map((k) => labelSlot(k, lang2)).join(", ")}.`
            : `\n\nTo proceed, I still need: ${missing.map((k) => labelSlot(k, lang2)).join(", ")}.`);
            // BP-R3: summary + tail
            console.log("[reservation] status query, missing:", missing, summary+tail);
    return {
      messages: [new AIMessage(summary + tail)],
      reservationSlots: mergedSlots,
      category: "reservation",
    };
  }

  // Si confirma y tenemos todo → crear reserva
  const haveAll = REQUIRED_SLOTS.every((k) => !!mergedSlots[k]);
  if (isConfirmIntent(normalizedMessage) && haveAll) {
    // BP-R4: crear reserva
    console.log("[reservation] confirm + haveAll, creating reservation with:", mergedSlots);
    const toInt = (s?: string) => (s ? parseInt(s, 10) : NaN);
    const slots = {
      guestName: mergedSlots.guestName!,
      roomType: mergedSlots.roomType!,
      guests: toInt(mergedSlots.numGuests) || 1,
      checkIn: mergedSlots.checkIn!,
      checkOut: mergedSlots.checkOut!,
      locale: locale,
    };

    const res = await confirmAndCreate(hotelId, slots, "web");

    await upsertConvState(hotelId, conversationId || "", {
      lastReservation: res.ok
        ? {
            reservationId: res.reservationId!,
            status: "created",
            createdAt: new Date().toISOString(),
            channel: "web",
          }
        : {
            reservationId: "",
            status: "error",
            createdAt: new Date().toISOString(),
            channel: "web",
          },
      salesStage: res.ok ? "close" : "followup",
      updatedBy: "ai",
    });

    return {
      messages: [new AIMessage(res.message)],
      reservationSlots: mergedSlots,
      category: "reservation",
      salesStage: res.ok ? "close" : "followup",
    };
  }

  // Si no tenemos guests,
  // pero el usuario escribió un número, lo usamos
  // (si ya teníamos guests, no lo pisamos)
  const guessed = extractGuests(normalizedMessage);
  if (guessed && !mergedSlots.numGuests) {
    mergedSlots.numGuests = String(clampGuests(guessed, mergedSlots.roomType));
  }

  // 👉 Structured Output MCP: completar slots con LLM
 const augmentedUserText =
   normalizedMessage +
   (Object.keys(mergedSlots).length
     ? `\n\nDatos previos conocidos: ${JSON.stringify(mergedSlots)}`
     : "");
  // 🔴 BP-R5: fillSlotsWithLLM input
  console.log("[reservation] fillSlotsWithLLM input:", { augmentedUserText, locale, hotelTz }); 
  const filled = await fillSlotsWithLLM(augmentedUserText, locale, { hotelTz });
  // 🔴 BP-R6: fillSlots output
  console.log("[reservation] fillSlotsWithLLM output:", filled);  
  // Falta info → el modelo devuelve UNA pregunta
  if (filled.need === "question") {
    const partialRaw = filled.partial ?? {};
    const partial = sanitizePartial(partialRaw, mergedSlots, normalizedMessage);

    const nextSnapshot: Record<string, string> = {
      ...mergedSlots,
      ...(partial.guestName ? { guestName: partial.guestName } : {}),
      ...(partial.roomType  ? { roomType:  partial.roomType  } : {}),
      ...(typeof partial.guests === "number" ? { numGuests: String(partial.guests) } : {}),
      ...(partial.checkIn   ? { checkIn:   partial.checkIn   } : {}),
      ...(partial.checkOut  ? { checkOut:  partial.checkOut  } : {}),
      locale: locale,
    };

    const missingOrder: RequiredSlot[] = ["guestName","roomType","checkIn","checkOut","numGuests"];
    const missing = missingOrder.filter(k => !nextSnapshot[k]);

    // --- preferencia LLM vs canónica
    const L = (k: RequiredSlot) => labelSlot(k, lang2);
    const llmQ = (filled.question || "").trim();

    // artículo correcto: "el nombre completo" y "el número de huéspedes"
    const articleFor = (k: RequiredSlot) =>
      (k === "numGuests" || k === "guestName") ? "el" : "la";

    let questionText = llmQ;

// Si faltan slots, construiremos la canónica; si no faltan, mensaje de confirmación.
    if (missing.length > 0) {
      const focus = missing[0];
      const canonical =
        lang2 === "es"
          ? `¿Cuál es ${focus === "numGuests" ? "el" : "la"} ${L(focus)}?`
          : lang2 === "pt"
          ? `Qual é ${focus === "numGuests" ? "o" : "a"} ${L(focus)}?`
          : `What is the ${L(focus)}?`;

      // Si venimos “forzando canónica” o la del LLM era mala/corta, usamos la canónica
      if (forceCanonicalQuestion || !questionText) questionText = canonical;
    } else {
      const canonicalDone =
        lang2 === "es"
          ? "Tengo todos los datos. ¿Confirmo la solicitud?"
          : lang2 === "pt"
          ? "Tenho todos os dados. Posso confirmar a solicitação?"
          : "I have all details. Shall I confirm the request?";

      if (forceCanonicalQuestion || !questionText) questionText = canonicalDone;
    }

    //🔴 BP-R7: question branch
    console.debug("[reservation] question->partial(raw)", filled.partial);
    console.debug("[reservation] question->partial(sanitized)", partial);
    console.debug("[reservation] nextSnapshot", nextSnapshot);

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


  // Tenemos slots completos → persistir y consultar disponibilidad
  const completed = filled.slots;

  // Persist slots completos (sin pisar lo ya bueno)
  const completeSnapshot: Record<string, string> = {
    ...mergedSlots,
    guestName: completed.guestName,
    roomType: completed.roomType,
    checkIn: completed.checkIn,
    checkOut: completed.checkOut,
    numGuests: String(completed.guests),
    locale: completed.locale,
  };
  //BP-R9 (branch slots completos, antes de upsert complete):
  console.log("[reservation] completeSnapshot", completeSnapshot);
  await upsertConvState(hotelId, conversationId || "", {
    reservationSlots: completeSnapshot,
    updatedBy: "ai",
  });
  //BP-R10: luego del upsertConvState de snapshot completo.
  console.log("[reservation] upserted complete snapshot" );
  // Tool: disponibilidad
  // 🔴 BP-R11: askAvailability input
  console.debug("[reservation] askAvailability", {
    hotelId,
    roomType: completed.roomType,
    guests: completed.guests,
    checkIn: completed.checkIn,
    checkOut: completed.checkOut,
  });
  const availability = await askAvailability(hotelId, completed);

  await upsertConvState(hotelId, conversationId || "", {
    lastProposal: {
      text: availability.proposal || (availability.available ? "Hay disponibilidad." : "Sin disponibilidad."),
      available: !!availability.available,
      options: availability.options,
      toolCall: {
        name: "checkAvailability",
        input: {
          hotelId,
          roomType: completed.roomType,
          guests: completed.guests,
          checkIn: completed.checkIn,
          checkOut: completed.checkOut,
        },
        outputSummary: availability.available ? "available:true" : "available:false",
        at: new Date().toISOString(),
      },
    },
    salesStage: availability.available ? "quote" : "followup",
    updatedBy: "ai",
  });
  // 🔴 BP-R12: askAvailability output
  console.debug("[reservation] askAvailability output:", availability);

  // Responder según disponibilidad
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
      `No tengo disponibilidad para ${completed.roomType} en esas fechas.`;
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
    messages: [new AIMessage((availability.proposal || "Tengo disponibilidad.") + confirmLine)],
    reservationSlots: completeSnapshot,
    category: "reservation",
    salesStage: "quote",
  };
}

/* ===== Otros handlers ===== */
async function handleCancelReservationNode(state: typeof GraphState.State) {
  const { normalizedMessage, detectedLanguage } = state;
  const lang = (detectedLanguage || "es").slice(0, 2);
  const pb = await loadPlaybookBundle(lang);

  const sys = [
    "Eres un recepcionista de hotel. Política: nunca cancela sin confirmación explícita del huésped.",
    pb.ambiguity ? `\n[ambiguity_policy]\n${pb.ambiguity}\n` : "",
    pb.modifyReservation ? `\n[modify_reservation]\n${pb.modifyReservation}\n` : "",
    "",
    `Instrucción:
- Si el usuario confirma cancelación de una reserva ya CONFIRMADA, solicita el CÓDIGO de reserva antes de proceder.
- Si es un borrador (no confirmada), ofrece cancelar o continuar.`,
    `Responde en ${lang}, breve y amable.`,
  ].join("\n");

  const out = await llmMini.invoke([new SystemMessage(sys), new HumanMessage(`Usuario: """${normalizedMessage}"""`)]);
  const text = typeof out.content === "string" ? out.content.trim() : String(out.content);
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
  .addNode("handle_cancel_reservation", handleCancelReservationNode)
  .addNode("handle_amenities", handleAmenitiesNode)
  .addNode("handle_billing", handleBillingNode)
  .addNode("handle_support", handleSupportNode)
  .addNode("handle_retrieval_based", retrievalBasedNode)
  .addEdge("__start__", "classify")
  .addConditionalEdges("classify", (state) => state.category, {
    reservation: "handle_reservation",
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
