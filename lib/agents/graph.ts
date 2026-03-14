import { detectCheckinCheckoutTimeQuery } from "@/lib/agents/classify/detect";
import { RE_TRANSPORT, RE_BILLING, RE_SUPPORT, RE_BREAKFAST, RE_AMENITIES, looksGeneralInfo } from "@/lib/agents/classify/keywords";
import { debugLog } from "@/lib/utils/debugLog";
import { handleReservationSnapshotNode } from "@/lib/agents/nodes/reservationSnapshot";
import { handleReservationVerifyNode } from "@/lib/agents/nodes/reservationVerify";
import { handleAmenitiesNode } from "@/lib/agents/nodes/amenities";
import { handleBillingNode } from "@/lib/agents/nodes/billing";
import { handleSupportNode } from "@/lib/agents/nodes/support";
import { retrievalBasedNode } from "@/lib/agents/nodes/retrieval";
import { StateGraph } from "@langchain/langgraph";
import { GraphState } from "./graphState";
import { getConvState } from "@/lib/db/convState";
import { classifyQuery, isPureGreeting } from "@/lib/classifier";
import { looksLikeName, heuristicClassify, looksRoomInfo, pickNearbyPromptKey } from "./helpers";
import { askModifyFieldNode, askNewValueNode, confirmModificationNode } from "./nodes/reservationModify";
import { handleReservationNode } from "./nodes";
import { handleCancelReservationNode } from "./nodes/cancelReservation";
import type { IntentCategory, DesiredAction } from "@/types/audit";

function wantsEvents(s: string) {
  const t = (s || "").toLowerCase();
  if (/\b(reserv\w*|booking|book|disponibil\w*|availability|habitaci[oó]n|room|quarto|check[ -]?in|check[ -]?out|hu[eé]sped(?:es)?|guest(?:s)?|adulto(?:s)?|adult)\b/.test(t)) {
    return false;
  }
  const keys = [
    // ES
    "evento", "eventos", "agenda", "hoy", "mañana", "manana",
    "esta noche", "fin de semana", "este fin de semana",
    "evento turistico", "evento turístico", "eventos turisticos", "eventos turísticos",
    // EN
    "event", "events", "tourist event", "tourist events", "today", "tomorrow", "tonight",
    "weekend", "this weekend",
    // PT
    "evento", "eventos", "agenda", "hoje", "amanhã", "amanha", "esta noite",
    "fim de semana", "este fim de semana",
    "evento turistico", "eventos turisticos",
  ];
  return keys.some((k) => t.includes(k));
}

function hasEventFollowupCue(s: string) {
  const t = (s || "").toLowerCase();
  if (!t) return false;
  if (/\b(evento|eventos|agenda|concierto|recital|festival|feria|show|teatro|exposicion|exposición)\b/.test(t)) return true;
  if (/\b(foto|fotos|imagen|imagenes|imágenes|photos|pics)\b/.test(t)) return true;
  if (/\b(hoy|mañana|manana|esta noche|fin de semana|este fin de semana|proxima semana|próxima semana|weekend|this weekend|next week)\b/.test(t)) return true;
  return false;
}

function hasStrongNonEventIntent(s: string) {
  const t = (s || "").toLowerCase();
  if (!t) return false;
  if (RE_SUPPORT.test(t) || RE_BILLING.test(t) || RE_TRANSPORT.test(t) || RE_BREAKFAST.test(t) || RE_AMENITIES.test(t)) {
    return true;
  }
  // Refuerzo para consultas de contacto/soporte que no siempre matchean regex amplias
  if (/\b(contacto|contactar|telefono|teléfono|whatsapp|email|correo|soporte|ayuda|recepcion|recepción|guardia|guardia nocturna|horario|atencion|atención)\b/.test(t)) {
    return true;
  }
  return false;
}

function isSeasonalQuery(s: string) {
  const t = (s || "").toLowerCase();
  return /\b(este mes|temporada|verano|invierno|otoño|oton(o)?|primavera|this month|season|summer|winter|fall|spring|este mês|neste mês|estação|verao|verão|inverno|outono|primavera)\b/.test(t);
}

function hasExplicitAgendaSignal(s: string) {
  const t = (s || "").toLowerCase();
  return /\b(evento(s)?|agenda|calendario|calendar|event calendar|concierto(s)?|recital(es)?|festival(es)?|feria(s)?|show(s)?|teatro|exposici[oó]n(es)?|carnaval|muestra(s)?)\b/.test(t);
}

function wantsThingsToDo(s: string) {
  const t = (s || "").toLowerCase();
  const keys = [
    // ES
    "que hacer",
    "qué hacer",
    "que se puede hacer",
    "planes",
    "plan",
    "diversion",
    "diversión",
    "actividades",
    "recomendas",
    "recomendás",
    "lugares para ir",
    "salir de noche",
    "que hay",
    // EN
    "what to do",
    "things to do",
    "plans",
    "activities",
    "nightlife",
    // PT
    "o que fazer",
    "planos",
    "atividades",
    "vida noturna",
  ];
  return keys.some((k) => t.includes(k));
}

function wantsImages(s: string) {
  const t = (s || "").toLowerCase();
  return /\b(imagenes|imágenes|fotos|con\s+imagenes|con\s+imágenes|con\s+fotos|images|photos|pictures|pics|with\s+images|with\s+photos|with\s+pictures|with\s+pics|imagens|com\s+imagens|com\s+fotos)\b/.test(t);
}

function wantsChannelManager(s: string) {
  const t = (s || "").toLowerCase();
  if (!t) return false;
  return /\b(canal|canales|channel|channels|por que canal|por qué canal|v[ií]a de contacto|contactar por|escribir por|fuera de horario|out of hours|canal recomendado)\b/.test(t);
}

// Nodo de clasificación principal
export async function classifyNode(state: typeof GraphState.State) {
  debugLog('[Graph] Enter classifyNode', { state });

  if (process.env.DEBUG_ROUTING === "1") {
    debugLog("[routing] enter classifyNode", {
      conversationId: state.conversationId,
      normalizedMessage: state.normalizedMessage,
    });
  }
  const conversationId = state.conversationId || "";
  let st: any = null;
  if (conversationId) {
    try {
      st = await getConvState(state.hotelId, conversationId);
    } catch {
      st = null;
    }
  }
  if (process.env.DEBUG_ROUTING === "1") {
    debugLog("[routing] conv_state", { conversationId, lastIntentGroup: st?.lastIntentGroup });
  }
  const hasPhotoSignal = (text: string) => /\b(foto|fotos|imagen|imagenes|imágenes|photos|pics)\b/i.test(text || "");
  const startsWithFollowup = (text: string) => /^\s*(¿?\s*y\b|and\b|e\b)\b/i.test(text || "");
  const isShortFollowup = (text: string) => String(text || "").trim().length <= 40;
  const seasonal = isSeasonalQuery(state.normalizedMessage || "");
  const explicitAgenda = hasExplicitAgendaSignal(state.normalizedMessage || "");
  const debugRouting = process.env.DEBUG_ROUTING === "1";
  const forceLlmClassifier =
    process.env.FORCE_LLM_CLASSIFIER === "1" ||
    process.env.FORCE_LLM_CLASSIFIER === "true";
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
    !hasStrongNonEventIntent(state.normalizedMessage || "")
  ) {
    const pk = hasPhotoSignal(state.normalizedMessage || "") ? "tourist_events_img" : "tourist_events";
    if (process.env.DEBUG_ROUTING === "1") {
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
  // Si la reserva está cerrada, manejar casos especiales
  if (state.salesStage === "close") {
    const t = (state.normalizedMessage || "").toLowerCase();
    // Si pregunta por horario de check-in/out, derivar a RAG
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
    // Si el usuario explícitamente quiere modificar/cancelar, seguir en reservation
    if (
      /\b(modificar|cambiar|cancelar|anular|cancela|cambio|modifico|modification|change|cancel)\b/.test(t)
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
      /(ver|mostrar|consultar|verificar|corroborar|comprobar|tengo|confirmar|confirmada|detalhes|detalhes|detalles|see|show|check|confirm|details|reservation|reserva|booking)/i.test(t) &&
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
  // Si no está cerrada, pero pide ver/corroborar una reserva y existe una confirmada persistida, ir a snapshot
  try {
    const t = (state.normalizedMessage || "").toLowerCase();
    // Desvío temprano: preguntas de horario de check-in/out deben ir a RAG, no al flujo de reserva
    const whichTime = detectCheckinCheckoutTimeQuery(t);
    if (whichTime) {
      return {
        category: "retrieval_based",
        desiredAction: undefined,
        intentConfidence: 0.98,
        intentSource: "heuristic",
        // promptKey puede ser afinado si hay playbook específico; por ahora dejamos undefined
        promptKey: undefined,
        messages: [],
      };
    }
    // Si el usuario explícitamente quiere modificar/cancelar, seguir en reservation
    // ----------------------------------------------------------------
    const asksSnapshot =
      /(ver|mostrar|consultar|verificar|corroborar|comprobar|averiguar|confirmada|check|confirm|details)/i.test(t) &&
      /(reserva|booking|reservation)/i.test(t);
    if (asksSnapshot) {
      const st = await getConvState(state.hotelId, state.conversationId || "");
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
          // cache: lo lee el nodo siguiente y evitamos un 2º getConvState
          meta: { ...(state.meta || {}), persistedConvState: st },
        };
      } else {
        const slots = (st as unknown as { reservationSlots?: Record<string, string> })?.reservationSlots || {};
        const hasProgress = !!(
          slots?.guestName ||
          slots?.checkIn ||
          slots?.checkOut ||
          slots?.roomType ||
          slots?.numGuests
        );
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
    }
    // ----------------------------------------------------------------

  } catch {
    // ignorar errores de lectura
  }
  const { normalizedMessage, reservationSlots, meta } = state;
  const mapClassifierCategoryToDesiredAction = (category: IntentCategory): DesiredAction =>
    category === "reservation"
      ? "create"
      : category === "cancel_reservation"
        ? "cancel"
        : undefined;
  // Reglas tempranas: desvíos determinísticos por palabra clave
  try {
    const t = (normalizedMessage || "").toLowerCase();
    // Transporte / aeropuertos: ruta específica a arrivals_transport
    const looksTransport = RE_TRANSPORT.test(t);
    if (looksTransport) {
      return withForcedGuardrailLog({
        category: "retrieval_based",
        desiredAction: undefined,
        intentConfidence: 0.97,
        intentSource: "heuristic",
        promptKey: "arrivals_transport",
        messages: [],
      }, "heuristic_transport", "RE_TRANSPORT", 0.97);
    }
    // Billing / pagos: ruta específica a payments_and_billing
    const looksBilling = RE_BILLING.test(t);
    if (looksBilling) {
      return withForcedGuardrailLog({
        category: "billing",
        desiredAction: undefined,
        intentConfidence: 0.98,
        intentSource: "heuristic",
        promptKey: "payments_and_billing",
        messages: [],
      }, "heuristic_billing", "RE_BILLING", 0.98);
    }
    // Soporte / canales: ruta específica a contact_channel_selector
    const looksChannelManager = wantsChannelManager(t);
    if (looksChannelManager) {
      return withForcedGuardrailLog({
        category: "support",
        desiredAction: undefined,
        intentConfidence: 0.98,
        intentSource: "heuristic",
        promptKey: "contact_channel_selector",
        messages: [],
      }, "heuristic_contact_channel_selector", "wantsChannelManager", 0.98);
    }
    // Soporte / contacto: ruta específica a contact_support
    const looksSupport = RE_SUPPORT.test(t);
    if (looksSupport) {
      return withForcedGuardrailLog({
        category: "support",
        desiredAction: undefined,
        intentConfidence: 0.98,
        intentSource: "heuristic",
        promptKey: "contact_support",
        messages: [],
      }, "heuristic_support", "RE_SUPPORT", 0.98);
    }
    // Desayuno / breakfast: ruta específica a breakfast_bar
    const looksBreakfast = RE_BREAKFAST.test(t);
    if (looksBreakfast) {
      return withForcedGuardrailLog({
        category: "amenities",
        desiredAction: undefined,
        intentConfidence: 0.97,
        intentSource: "heuristic",
        promptKey: "breakfast_bar",
        messages: [],
      }, "heuristic_breakfast", "RE_BREAKFAST", 0.97);
    }
    // Amenities generales: ruta específica a amenities_list
    const looksAmenities = RE_AMENITIES.test(t);
    if (looksAmenities) {
      return withForcedGuardrailLog({
        category: "amenities",
        desiredAction: undefined,
        intentConfidence: 0.97,
        intentSource: "heuristic",
        promptKey: "amenities_list",
        messages: [],
      }, "heuristic_amenities", "RE_AMENITIES", 0.97);
    }
  } catch { }
  // Regla temprana: si el texto claramente es de info general (mascotas, ubicación, servicios), forzar retrieval kb_general
  try {
    const t = (normalizedMessage || "").toLowerCase();
    // Detección de keywords de info general
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
  } catch { }
  // Refuerzo: si el mensaje contiene un dato parcial de slot, forzar reservation
  const hasAnySlot = (
    ["guestName", "roomType", "checkIn", "checkOut", "numGuests"] as const
  ).some((k) => !!(reservationSlots as Record<string, unknown> | undefined)?.[k] || looksLikeName(normalizedMessage));
  const prev = (meta as Record<string, unknown>)?.prevCategory || state.category;
  if (prev === "reservation" || hasAnySlot) {
    const t = (normalizedMessage || "").toLowerCase();
    // Escape: si pregunta por horario de check-in/out, NO forzar flujo de reserva
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
    // Desvío específico con prioridad: transporte, billing, soporte, desayuno deben evitar kb_general aquí
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
    // Desvío fuerte solo para info general: mascotas/pets, ubicación/dirección/location, servicios/amenities
    const isGeneralInfoSwitch =
      /\b(piscina|desayuno|parking|estacionamiento|spa|gym|gimnasio|amenities|servicios(\sprincipales)?)\b/.test(t) ||
      /\b(mascotas?|pet(s)?|animal(es)?)\b/.test(t) ||
      /\b(ubicaci[oó]n|direccion|direcci[oó]n|address|ubicados?|location)\b/.test(t);
    // Otros desvíos (cancel, billing, soporte) no deben ir a kb_general; se dejan caer para recomputar categoría más abajo
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
      debugLog('[Graph] Exit classifyNode (reservation/hasAnySlot refuerzo)', { result });
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
      if (forcedPK)
        return withRoutingDebug({
          category: "retrieval_based",
          desiredAction: h.desiredAction,
          intentConfidence: h.intentConfidence,
          intentSource: "llm",
          promptKey: forcedPK,
          messages: [],
        }, "llm_classifier", "classifyQuery", h.intentConfidence);
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

/* ========================= * GRAPH * ========================= */
const g = new StateGraph(GraphState)
  .addNode("classify", classifyNode)
  .addNode("handle_reservation", handleReservationNode)
  .addNode("handle_reservation_snapshot", handleReservationSnapshotNode)
  .addNode("handle_reservation_verify", handleReservationVerifyNode)
  .addNode("handle_cancel_reservation", handleCancelReservationNode)
  .addNode("handle_amenities", handleAmenitiesNode)
  .addNode("handle_billing", handleBillingNode)
  .addNode("handle_support", handleSupportNode)
  .addNode("handle_retrieval_based", retrievalBasedNode)
  // Nodos para modificación de reserva
  .addNode("ask_modify_field", askModifyFieldNode)
  .addNode("ask_new_value", askNewValueNode)
  .addNode("confirm_modification", confirmModificationNode)
  .addEdge("__start__", "classify")
  .addConditionalEdges("classify", (state) => state.category, {
    reservation: "handle_reservation",
    reservation_snapshot: "handle_reservation_snapshot",
    reservation_verify: "handle_reservation_verify",
    cancel_reservation: "handle_cancel_reservation",
    amenities: "handle_amenities",
    billing: "handle_billing",
    support: "handle_support",
    retrieval_based: "handle_retrieval_based",
    other: "handle_retrieval_based",
    modify_reservation_field: "ask_modify_field",
    modify_reservation_value: "ask_new_value",
    modify_reservation_confirm: "confirm_modification",
  })
  // Flujo de modificación: campo → valor → confirmación → repetir o terminar
  .addEdge("ask_modify_field", "ask_new_value")
  .addEdge("ask_new_value", "confirm_modification")
  .addConditionalEdges(
    "confirm_modification",
    (state) => {
      // Si el usuario quiere modificar otro campo, volver a preguntar campo
      const t = (state.normalizedMessage || "").toLowerCase();
      if (/otro|otra|más|mas|cambiar|modificar|alter|another|more|change|modify/.test(t)) {
        return "modify_reservation_field";
      }
      // Si dice que no, terminar
      if (/no|finalizar|terminar|listo|gracias|thanks|finish|done/.test(t)) {
        return "handle_reservation_snapshot";
      }
      // Por defecto, terminar
      return "handle_reservation_snapshot";
    },
    {
      modify_reservation_field: "ask_modify_field",
      handle_reservation_snapshot: "handle_reservation_snapshot",
    }
  )
  .addEdge("handle_reservation", "__end__")
  .addEdge("handle_reservation_verify", "__end__")
  .addEdge("handle_cancel_reservation", "__end__")
  .addEdge("handle_amenities", "__end__")
  .addEdge("handle_billing", "__end__")
  .addEdge("handle_support", "__end__")
  .addEdge("handle_retrieval_based", "__end__");

export const agentGraph = g.compile();
