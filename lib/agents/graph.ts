import { classifyNode } from "@/lib/agents/classifyNode";
// Path: /root/begasist/lib/agents/graph.ts

import { Annotation, StateGraph } from "@langchain/langgraph";
import { AIMessage } from "@langchain/core/messages";
import { handleReservationNode } from "@/lib/agents/nodes/reservation";
import { handleCancelReservationNode } from "@/lib/agents/nodes/cancelReservation";
import { handleAmenitiesNode } from "@/lib/agents/nodes/amenities";
import { handleBillingNode } from "@/lib/agents/nodes/billing";
import { handleSupportNode } from "@/lib/agents/nodes/support";
import { retrievalBasedNode } from "@/lib/agents/nodes/retrieval";
import { askModifyFieldNode, askNewValueNode, confirmModificationNode } from "@/lib/agents/nodes/reservationModify";
import { handleReservationSnapshotNode } from "@/lib/agents/nodes/reservationSnapshot";
import { handleReservationVerifyNode } from "@/lib/agents/nodes/reservationVerify";
import { handleReservationConfirmNode } from "@/lib/agents/nodes/reservationConfirm";

/* ===== Otros handlers ===== */
export { handleCancelReservationNode } from "@/lib/agents/nodes/cancelReservation";
export { handleAmenitiesNode } from "@/lib/agents/nodes/amenities";
export { handleBillingNode } from "@/lib/agents/nodes/billing";
export { handleSupportNode } from "@/lib/agents/nodes/support";

/* =========================
 *         GRAPH
 * ========================= */

import { GraphState } from "./graphState";

function cleanMessages(messages: AIMessage[], lang: string): AIMessage[] {
  return (messages || []).map((m: AIMessage) => {
    const content = typeof m.content === 'string' ? m.content : '';
    if (content.trim().toLowerCase() === 'undefined') {
      return new AIMessage(
        lang === 'es'
          ? "¿Cuál es el tipo de habitación que preferís?"
          : lang === 'pt'
            ? "Qual o tipo de quarto que você prefere?"
            : "What room type do you prefer?"
      );
    }
    return m;
  });
}

const g = new StateGraph(GraphState)
  .addNode("classify", async (state: any) => {
    // Leer estado persistido antes de clasificar
    const { hotelId, conversationId } = state;
    let st: any = {};
    try {
      const { getConvState } = await import("@/lib/db/convState");
      st = (await getConvState(hotelId, conversationId || "")) || {};
    } catch { }
    const classified = await classifyNode({ ...state, st });
    // Propagar lastReservation explícitamente al estado plano
    if (st && typeof st.lastReservation !== "undefined") {
      (classified as any).lastReservation = st.lastReservation;
    }
    // Si hay estado persistido, retornar solo ese objeto para nodos de snapshot/confirmación
    if (st && Object.keys(st).length > 0 && (classified.category === 'reservation_snapshot' || classified.category === 'reservation_confirm')) {
      const result = { ...state, ...st, category: classified.category, messages: classified.messages };
      if (typeof st.lastReservation !== 'undefined') {
        result.lastReservation = st.lastReservation;
      }
      // LOG TEMPORAL PARA DEPURAR SHAPE DEL STATE
      // eslint-disable-next-line no-console
      console.log('[GRAPH classify->snapshot] state shape:', JSON.stringify(result));
      return result;
    }
    // Mergea los datos persistidos sobre el resultado de clasificación (persistido tiene prioridad)
    return Object.assign({}, st, classified);
  })
  .addNode("handle_reservation", async (state) => {
    const res = await handleReservationNode(state);
    if (res && Array.isArray(res.messages)) {
      res.messages = cleanMessages(res.messages, state.detectedLanguage || 'es');
    }
    return res;
  })
  .addNode("handle_reservation_confirm", handleReservationConfirmNode)
  .addNode("handle_cancel_reservation", handleCancelReservationNode)
  .addNode("handle_amenities", handleAmenitiesNode)
  .addNode("handle_billing", handleBillingNode)
  .addNode("handle_support", handleSupportNode)
  .addNode("handle_retrieval_based", retrievalBasedNode)
  .addNode("handle_reservation_snapshot", async (state) => {
    // Pasar el estado persistido (st) si existe
    const st = state.st || {};
    return await handleReservationSnapshotNode({ ...state, ...st });
  })
  .addNode("handle_reservation_verify", handleReservationVerifyNode)
  .addEdge("__start__", "classify")
  .addConditionalEdges("classify", (state) => state.category, {
    reservation: "handle_reservation",
    reservation_confirm: "handle_reservation_confirm",
    cancel_reservation: "handle_cancel_reservation",
    amenities: "handle_amenities",
    billing: "handle_billing",
    support: "handle_support",
    retrieval_based: "handle_retrieval_based",
    other: "handle_retrieval_based",
    reservation_snapshot: "handle_reservation_snapshot",
    reservation_verify: "handle_reservation_verify",
  })
  .addEdge("handle_reservation", "__end__")
  .addEdge("handle_reservation_confirm", "__end__")
  .addEdge("handle_cancel_reservation", "__end__")
  .addEdge("handle_amenities", "__end__")
  .addEdge("handle_billing", "__end__")
  .addEdge("handle_support", "__end__")
  .addEdge("handle_retrieval_based", "__end__")
  .addEdge("handle_reservation_snapshot", "__end__")
  .addEdge("handle_reservation_verify", "__end__");

export const agentGraph = g.compile();
