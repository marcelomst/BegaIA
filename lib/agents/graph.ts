import { detectCheckinCheckoutTimeQuery } from "@/lib/agents/classify/detect";
import { RE_TRANSPORT, RE_BILLING, RE_SUPPORT, RE_BREAKFAST, looksGeneralInfo } from "@/lib/agents/classify/keywords";
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
import { classifyQuery } from "@/lib/classifier";
import { looksLikeName, heuristicClassify } from "./helpers";
import { looksRoomInfo } from "./helpers";
import { askModifyFieldNode, askNewValueNode, confirmModificationNode } from "./nodes/reservationModify";
import { handleReservationNode } from "./nodes";
import { handleCancelReservationNode } from "./nodes/cancelReservation";
import type { IntentCategory, DesiredAction } from "@/types/audit";

// Nodo de clasificación principal
export async function classifyNode(state: typeof GraphState.State) {
  debugLog('[Graph] Enter classifyNode', { state });
  // Si la reserva está cerrada, manejar casos especiales
  if (state.salesStage === "close") {
    const t = (state.normalizedMessage || "").toLowerCase();
    // Si pregunta por horario de check-in/out, derivar a RAG
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
    // Path: /root/begasist/lib/agents/graph.ts

    // ✅ En classifyNode, reemplazá SOLO este bloque "asksSnapshot" por este (mantén el resto igual):
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
  // Reglas tempranas: desvíos determinísticos por palabra clave
  try {
    const t = (normalizedMessage || "").toLowerCase();
    // Transporte / aeropuertos: ruta específica a arrivals_transport
    const looksTransport = RE_TRANSPORT.test(t);
    if (looksTransport) {
      return {
        category: "amenities",
        desiredAction: undefined,
        intentConfidence: 0.97,
        intentSource: "heuristic",
        promptKey: "arrivals_transport",
        messages: [],
      };
    }
    // Billing / pagos: ruta específica a payments_and_billing
    const looksBilling = RE_BILLING.test(t);
    if (looksBilling) {
      return {
        category: "billing",
        desiredAction: undefined,
        intentConfidence: 0.98,
        intentSource: "heuristic",
        promptKey: "payments_and_billing",
        messages: [],
      };
    }
    // Soporte / contacto: ruta específica a contact_support
    const looksSupport = RE_SUPPORT.test(t);
    if (looksSupport) {
      return {
        category: "support",
        desiredAction: undefined,
        intentConfidence: 0.98,
        intentSource: "heuristic",
        promptKey: "contact_support",
        messages: [],
      };
    }
    // Desayuno / breakfast: ruta específica a breakfast_bar
    const looksBreakfast = RE_BREAKFAST.test(t);
    if (looksBreakfast) {
      return {
        category: "amenities",
        desiredAction: undefined,
        intentConfidence: 0.97,
        intentSource: "heuristic",
        promptKey: "breakfast_bar",
        messages: [],
      };
    }
  } catch { }
  // Regla temprana: si el texto claramente es de info general (mascotas, ubicación, servicios), forzar retrieval kb_general
  try {
    const t = (normalizedMessage || "").toLowerCase();
    // Detección de keywords de info general
    if (looksGeneralInfo(t)) {
      return {
        category: "retrieval_based",
        desiredAction: undefined,
        intentConfidence: 0.97,
        intentSource: "heuristic",
        promptKey: "kb_general",
        messages: [],
      };
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
        category: "amenities",
        desiredAction: undefined,
        intentConfidence: 0.97,
        intentSource: "heuristic",
        promptKey: "arrivals_transport",
        messages: [],
      };
    }
    if (/(pago|pagos|pagar|medio(?:s)? de pago|tarjeta|tarjetas|d[eé]bito|cr[eé]dito|facturaci[oó]n|factura|invoice|billing|cobro|cobrar)/i.test(t)) {
      return {
        category: "billing",
        desiredAction: undefined,
        intentConfidence: 0.98,
        intentSource: "heuristic",
        promptKey: "payments_and_billing",
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
      /\b(factura|invoice|cobro|billing)\b/.test(t) ||
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
    if (!isOtherHardSwitch) {
      const result = {
        category: "reservation",
        desiredAction: "modify",
        intentConfidence: 0.95,
        intentSource: "heuristic",
        promptKey: "reservation_flow",
        messages: [],
      };
      debugLog('[Graph] Exit classifyNode (reservation/hasAnySlot refuerzo)', { result });
      return result;
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