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
import { evaluateGraphRoutingPolicy } from "@/lib/agents/classify/policy";
import { askModifyFieldNode, askNewValueNode, confirmModificationNode } from "./nodes/reservationModify";
import { handleReservationNode } from "./nodes";
import { handleCancelReservationNode } from "./nodes/cancelReservation";

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
  return evaluateGraphRoutingPolicy({
    state,
    persistedConvState: st,
    debugRouting: process.env.DEBUG_ROUTING === "1",
    forceLlmClassifier:
      process.env.FORCE_LLM_CLASSIFIER === "1" ||
      process.env.FORCE_LLM_CLASSIFIER === "true",
  });
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
