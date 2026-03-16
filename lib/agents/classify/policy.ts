import { detectCheckinCheckoutTimeQuery } from "@/lib/agents/classify/detect";
import { RE_TRANSPORT, RE_BILLING, RE_SUPPORT, RE_BREAKFAST, RE_AMENITIES, looksGeneralInfo } from "@/lib/agents/classify/keywords";
import { classifyQuery, isPureGreeting } from "@/lib/classifier";
import { debugLog } from "@/lib/utils/debugLog";
import type { IntentCategory, DesiredAction } from "@/types/audit";
import { heuristicClassify, looksLikeName, looksRoomInfo, pickNearbyPromptKey } from "../helpers";
import {
  hasEventFollowupCue,
  hasExplicitAgendaSignal,
  hasReservationAvailabilitySignal,
  hasStrongNonEventIntent,
  isSeasonalQuery,
  wantsChannelManager,
  wantsEvents,
  wantsImages,
  wantsThingsToDo,
} from "./routingText";

type PolicyInput = {
  state: any;
  persistedConvState: any;
  debugRouting: boolean;
  forceLlmClassifier: boolean;
};

export async function evaluateGraphRoutingPolicy({
  state,
  persistedConvState,
  debugRouting,
  forceLlmClassifier,
}: PolicyInput) {
  const conversationId = state.conversationId || "";
  const st = persistedConvState;
  const hasPhotoSignal = (text: string) => /\b(foto|fotos|imagen|imagenes|imágenes|photos|pics)\b/i.test(text || "");
  const startsWithFollowup = (text: string) => /^\s*(¿?\s*y\b|and\b|e\b)\b/i.test(text || "");
  const isShortFollowup = (text: string) => String(text || "").trim().length <= 40;
  const seasonal = isSeasonalQuery(state.normalizedMessage || "");
  const explicitAgenda = hasExplicitAgendaSignal(state.normalizedMessage || "");

  const withRoutingDebug = (
    payload: Record<string, any>,
    route_source: string,
    route_match: string,
    confidence: number
  ) => {
    if (!debugRouting) return payload;
    const metaBase = { ...(state.meta || {}), ...(payload.meta || {}) } as Record<string, any>;
    const debugBase = { ...(metaBase.debug || {}) } as Record<string, any>;
    return {
      ...payload,
      meta: {
        ...metaBase,
        debug: {
          ...debugBase,
          route_source,
          route_match,
          intentConfidence: confidence,
        },
      },
    };
  };

  const logForcedClassifier = (
    event: "attempt" | "result" | "fallback" | "guardrail_preempted",
    extra: Record<string, any> = {}
  ) => {
    if (!forceLlmClassifier) return;
    debugLog("[routing][forced_llm_classifier]", {
      conversationId,
      normalizedMessage: state.normalizedMessage,
      event,
      route_match: "FORCE_LLM_CLASSIFIER",
      route_source:
        event === "fallback"
          ? "forced_llm_classifier_fallback"
          : event === "guardrail_preempted"
            ? "forced_llm_classifier_guardrail"
            : "forced_llm_classifier",
      ...extra,
    });
  };

  const withForcedGuardrailLog = (
    payload: Record<string, any>,
    routeSource: string,
    routeMatch: string,
    confidence: number
  ) => {
    logForcedClassifier("guardrail_preempted", {
      route_guardrail_preempted: true,
      guardrail_route_source: routeSource,
      guardrail_route_match: routeMatch,
      category: payload.category,
      promptKey: payload.promptKey,
    });
    return withRoutingDebug(payload, routeSource, routeMatch, confidence);
  };

  if (
    st?.lastIntentGroup === "events" &&
    (
      startsWithFollowup(state.normalizedMessage || "") ||
      (isShortFollowup(state.normalizedMessage || "") && hasEventFollowupCue(state.normalizedMessage || ""))
    ) &&
    !hasStrongNonEventIntent(state.normalizedMessage || "", {
      support: RE_SUPPORT,
      billing: RE_BILLING,
      transport: RE_TRANSPORT,
      breakfast: RE_BREAKFAST,
      amenities: RE_AMENITIES,
    })
  ) {
    const pk = hasPhotoSignal(state.normalizedMessage || "") ? "tourist_events_img" : "tourist_events";
    if (debugRouting) {
      debugLog("[routing] followup-events decision", {
        conversationId,
        normalizedMessage: state.normalizedMessage,
        lastIntentGroup: st?.lastIntentGroup,
        hasPhotoSignal: hasPhotoSignal(state.normalizedMessage || ""),
        promptKey: pk,
      });
    }
    return withForcedGuardrailLog({
      category: "retrieval_based",
      desiredAction: undefined,
      intentConfidence: 0.92,
      intentSource: "heuristic",
      promptKey: pk,
      messages: [],
    }, "heuristic_events_followup", "followup_events", 0.92);
  }
  if (wantsEvents(state.normalizedMessage || "") && !(seasonal && !explicitAgenda)) {
    const pk = wantsImages(state.normalizedMessage || "") ? "tourist_events_img" : "tourist_events";
    return withForcedGuardrailLog({
      category: "retrieval_based",
      desiredAction: undefined,
      intentConfidence: 0.96,
      intentSource: "heuristic",
      promptKey: pk,
      messages: [],
    }, "heuristic_events", "wantsEvents", 0.96);
  }
  const nearbyPK = pickNearbyPromptKey(state.normalizedMessage || "");
  if (nearbyPK) {
    return withForcedGuardrailLog({
      category: "retrieval_based",
      desiredAction: undefined,
      intentConfidence: 0.96,
      intentSource: "heuristic",
      promptKey: nearbyPK,
      messages: [],
    }, "heuristic_nearby", "pickNearbyPromptKey", 0.96);
  }
  const isEventExplicit = wantsEvents(state.normalizedMessage || "") || state.promptKey === "tourist_events" || state.promptKey === "tourist_events_img";
  if (!isEventExplicit && wantsThingsToDo(state.normalizedMessage || "")) {
    const langRaw = String((state as any).originalLang || state.detectedLanguage || "").toLowerCase();
    const isEn = langRaw.startsWith("en") || langRaw === "eng";
    const isPt = langRaw.startsWith("pt") || langRaw === "por";
    const basePk = isEn ? "things_to_do_en" : isPt ? "things_to_do_pt" : "things_to_do";
    const pk = wantsImages(state.normalizedMessage || "") ? `${basePk}_img` : basePk;
    return withForcedGuardrailLog({
      category: "retrieval_based",
      desiredAction: undefined,
      intentConfidence: 0.95,
      intentSource: "heuristic",
      promptKey: pk,
      messages: [],
    }, "heuristic_things_to_do", "wantsThingsToDo", 0.95);
  }

  if (state.salesStage === "close") {
    const t = (state.normalizedMessage || "").toLowerCase();
    if (detectCheckinCheckoutTimeQuery(t)) {
      return withForcedGuardrailLog({
        category: "retrieval_based",
        desiredAction: undefined,
        intentConfidence: 0.98,
        intentSource: "heuristic",
        promptKey: undefined,
        messages: [],
      }, "heuristic_kb_general", "detectCheckinCheckoutTimeQuery", 0.98);
    }
    if (/\b(modificar|cambiar|cancelar|anular|cancela|cambio|modifico|modification|change|cancel)\b/.test(t)) {
      return {
        category: "reservation",
        desiredAction: "modify",
        intentConfidence: 0.95,
        intentSource: "heuristic",
        promptKey: "modify_reservation",
        messages: [],
      };
    }
    if (
      /(ver|mostrar|consultar|verificar|corroborar|comprobar|tengo|confirmar|confirmada|detalhes|detalhes|detalles|see|show|check|confirm|details|reservation|reserva|booking)/i.test(t) &&
      /(reserva|booking|reservation)/i.test(t)
    ) {
      return {
        category: "reservation_snapshot",
        desiredAction: undefined,
        intentConfidence: 0.99,
        intentSource: "heuristic",
        promptKey: "reservation_snapshot",
        messages: [],
      };
    }
    return {
      category: "retrieval_based",
      desiredAction: undefined,
      intentConfidence: 0.95,
      intentSource: "heuristic",
      promptKey: undefined,
      messages: [],
    };
  }

  try {
    const t = (state.normalizedMessage || "").toLowerCase();
    const whichTime = detectCheckinCheckoutTimeQuery(t);
    if (whichTime) {
      return {
        category: "retrieval_based",
        desiredAction: undefined,
        intentConfidence: 0.98,
        intentSource: "heuristic",
        promptKey: undefined,
        messages: [],
      };
    }
    const asksSnapshot =
      /(ver|mostrar|consultar|verificar|corroborar|comprobar|averiguar|confirmada|check|confirm|details)/i.test(t) &&
      /(reserva|booking|reservation)/i.test(t);
    if (asksSnapshot) {
      const hasConfirmed =
        !!(st as unknown as { lastReservation?: { reservationId?: string } })?.lastReservation?.reservationId ||
        ((st as any)?.salesStage === "close");

      if (hasConfirmed) {
        return {
          category: "reservation_snapshot",
          desiredAction: undefined,
          intentConfidence: 0.99,
          intentSource: "heuristic",
          promptKey: "reservation_snapshot",
          messages: [],
          meta: { ...(state.meta || {}), persistedConvState: st },
        };
      }
      const slots = (st as unknown as { reservationSlots?: Record<string, string> })?.reservationSlots || {};
      const hasProgress = !!(slots?.guestName || slots?.checkIn || slots?.checkOut || slots?.roomType || slots?.numGuests);
      if (hasProgress) {
        return {
          category: "reservation_snapshot",
          desiredAction: undefined,
          intentConfidence: 0.98,
          intentSource: "heuristic",
          promptKey: "reservation_snapshot",
          messages: [],
          meta: { ...(state.meta || {}), persistedConvState: st },
        };
      }
      return {
        category: "reservation_verify",
        desiredAction: undefined,
        intentConfidence: 0.95,
        intentSource: "heuristic",
        promptKey: "reservation_verify",
        messages: [],
        meta: { ...(state.meta || {}), persistedConvState: st },
      };
    }
  } catch {
  }

  const { normalizedMessage, reservationSlots, meta } = state;
  const mapClassifierCategoryToDesiredAction = (category: IntentCategory): DesiredAction =>
    category === "reservation" ? "create" : category === "cancel_reservation" ? "cancel" : undefined;

  try {
    const t = (normalizedMessage || "").toLowerCase();
    if (RE_TRANSPORT.test(t)) {
      return withForcedGuardrailLog({
        category: "retrieval_based",
        desiredAction: undefined,
        intentConfidence: 0.97,
        intentSource: "heuristic",
        promptKey: "arrivals_transport",
        messages: [],
      }, "heuristic_transport", "RE_TRANSPORT", 0.97);
    }
    if (RE_BILLING.test(t)) {
      return withForcedGuardrailLog({
        category: "billing",
        desiredAction: undefined,
        intentConfidence: 0.98,
        intentSource: "heuristic",
        promptKey: "payments_and_billing",
        messages: [],
      }, "heuristic_billing", "RE_BILLING", 0.98);
    }
    if (wantsChannelManager(t)) {
      return withForcedGuardrailLog({
        category: "support",
        desiredAction: undefined,
        intentConfidence: 0.98,
        intentSource: "heuristic",
        promptKey: "contact_channel_selector",
        messages: [],
      }, "heuristic_contact_channel_selector", "wantsChannelManager", 0.98);
    }
    if (RE_SUPPORT.test(t)) {
      return withForcedGuardrailLog({
        category: "support",
        desiredAction: undefined,
        intentConfidence: 0.98,
        intentSource: "heuristic",
        promptKey: "contact_support",
        messages: [],
      }, "heuristic_support", "RE_SUPPORT", 0.98);
    }
    if (RE_BREAKFAST.test(t)) {
      return withForcedGuardrailLog({
        category: "amenities",
        desiredAction: undefined,
        intentConfidence: 0.97,
        intentSource: "heuristic",
        promptKey: "breakfast_bar",
        messages: [],
      }, "heuristic_breakfast", "RE_BREAKFAST", 0.97);
    }
    if (RE_AMENITIES.test(t)) {
      return withForcedGuardrailLog({
        category: "amenities",
        desiredAction: undefined,
        intentConfidence: 0.97,
        intentSource: "heuristic",
        promptKey: "amenities_list",
        messages: [],
      }, "heuristic_amenities", "RE_AMENITIES", 0.97);
    }
  } catch {}

  try {
    const t = (normalizedMessage || "").toLowerCase();
    if (looksGeneralInfo(t)) {
      return withForcedGuardrailLog({
        category: "retrieval_based",
        desiredAction: undefined,
        intentConfidence: 0.97,
        intentSource: "heuristic",
        promptKey: "kb_general",
        messages: [],
      }, "heuristic_kb_general", "looksGeneralInfo", 0.97);
    }
  } catch {}

  const hasAnySlot = (
    ["guestName", "roomType", "checkIn", "checkOut", "numGuests"] as const
  ).some((k) => !!(reservationSlots as Record<string, unknown> | undefined)?.[k] || looksLikeName(normalizedMessage));
  const prev = (meta as Record<string, unknown>)?.prevCategory || state.category;
  if (prev === "reservation" || hasAnySlot) {
    const t = (normalizedMessage || "").toLowerCase();
    if (detectCheckinCheckoutTimeQuery(t)) {
      return {
        category: "retrieval_based",
        desiredAction: undefined,
        intentConfidence: 0.98,
        intentSource: "heuristic",
        promptKey: undefined,
        messages: [],
      };
    }
    if (/(aeropuerto|airport|traslados?|transfer|taxi|remis|bus|[óo]mnibus|colectivo|metro|subte)/i.test(t)) {
      return {
        category: "retrieval_based",
        desiredAction: undefined,
        intentConfidence: 0.97,
        intentSource: "heuristic",
        promptKey: "arrivals_transport",
        messages: [],
      };
    }
    if (/(pago|pagos|pagar|medio(?:s)? de pago|tarjeta|tarjetas|d[eé]bito|cr[eé]dito|facturaci[oó]n|factura|invoice|billing|cobro|cobrar|btc|bitcoin|crypto|cript(o|o)moneda|criptomoeda)/i.test(t)) {
      return {
        category: "billing",
        desiredAction: undefined,
        intentConfidence: 0.98,
        intentSource: "heuristic",
        promptKey: "payments_and_billing",
        messages: [],
      };
    }
    if (wantsChannelManager(t)) {
      return {
        category: "support",
        desiredAction: undefined,
        intentConfidence: 0.98,
        intentSource: "heuristic",
        promptKey: "contact_channel_selector",
        messages: [],
      };
    }
    if (/(whats?app|contacto|cont[aá]ctar|tel[eé]fono|telefono|llamar|email|correo|soporte|support)/i.test(t)) {
      return {
        category: "support",
        desiredAction: undefined,
        intentConfidence: 0.98,
        intentSource: "heuristic",
        promptKey: "contact_support",
        messages: [],
      };
    }
    if (/(\bdesayuno\b|breakfast|desayunar)/i.test(t)) {
      return {
        category: "amenities",
        desiredAction: undefined,
        intentConfidence: 0.97,
        intentSource: "heuristic",
        promptKey: "breakfast_bar",
        messages: [],
      };
    }
    const isGeneralInfoSwitch =
      /\b(piscina|desayuno|parking|estacionamiento|spa|gym|gimnasio|amenities|servicios(\sprincipales)?)\b/.test(t) ||
      /\b(mascotas?|pet(s)?|animal(es)?)\b/.test(t) ||
      /\b(ubicaci[oó]n|direccion|direcci[oó]n|address|ubicados?|location)\b/.test(t);
    const isOtherHardSwitch =
      /\b(cancel|cancelar|anular)\b/.test(t) ||
      /\b(factura|invoice|cobro|billing|btc|bitcoin|crypto)\b/.test(t) ||
      /\b(soporte|ayuda|problema|support)\b/.test(t);
    if (isGeneralInfoSwitch) {
      return {
        category: "retrieval_based",
        desiredAction: undefined,
        intentConfidence: 0.96,
        intentSource: "heuristic",
        promptKey: "kb_general",
        messages: [],
      };
    }
    if (!isOtherHardSwitch && !isPureGreeting(normalizedMessage || "")) {
      const result = withRoutingDebug({
        category: "reservation",
        desiredAction: "modify",
        intentConfidence: 0.95,
        intentSource: "heuristic",
        promptKey: "reservation_flow",
        messages: [],
      }, "heuristic_reservation_refuerzo", "hasAnySlot", 0.95);
      debugLog("[Graph] Exit classifyNode (reservation/hasAnySlot refuerzo)", { result });
      return result;
    }
  }

  if (forceLlmClassifier) {
    try {
      logForcedClassifier("attempt");
      const llmC = await classifyQuery(normalizedMessage, state.hotelId);
      const forcedCategory = llmC.category as IntentCategory;
      const forcedDesiredAction = mapClassifierCategoryToDesiredAction(forcedCategory);
      const forcedPromptKey = llmC.promptKey ?? (
        forcedCategory === "reservation"
          ? (forcedDesiredAction === "modify" ? "modify_reservation" : "reservation_flow")
          : forcedCategory === "cancel_reservation"
            ? "cancellation_policy"
            : looksRoomInfo(normalizedMessage)
              ? "room_info"
              : "ambiguity_policy"
      );
      logForcedClassifier("result", {
        category: forcedCategory,
        promptKey: forcedPromptKey,
        intentSource: "llm",
      });
      return withRoutingDebug({
        category: forcedCategory,
        desiredAction: forcedDesiredAction,
        intentConfidence: 0.9,
        intentSource: "llm",
        promptKey: forcedPromptKey,
        messages: [],
      }, "forced_llm_classifier", "FORCE_LLM_CLASSIFIER", 0.9);
    } catch (err) {
      logForcedClassifier("fallback", {
        error: (err as any)?.message || String(err),
      });
      console.warn("[classifyNode] FORCE_LLM_CLASSIFIER fallback to heuristic:", (err as any)?.message || err);
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
      const forcedPK = llmC.promptKey ?? (looksRoomInfo(normalizedMessage) ? "room_info" : undefined);
      if (forcedPK) {
        return withRoutingDebug({
          category: "retrieval_based",
          desiredAction: h.desiredAction,
          intentConfidence: h.intentConfidence,
          intentSource: "llm",
          promptKey: forcedPK,
          messages: [],
        }, "llm_classifier", "classifyQuery", h.intentConfidence);
      }
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
        ? "cancellation_policy"
        : looksRoomInfo(normalizedMessage)
          ? "room_info"
          : "ambiguity_policy";
  const promptKey = pickPK(h.category, h.desiredAction);
  return withRoutingDebug({
    category: h.category,
    desiredAction: h.desiredAction,
    intentConfidence: h.intentConfidence,
    intentSource: h.intentSource,
    promptKey,
    messages: [],
  }, h.intentSource === "llm" ? "llm_classifier" : "fallback_other", "heuristicClassify", h.intentConfidence);
}
