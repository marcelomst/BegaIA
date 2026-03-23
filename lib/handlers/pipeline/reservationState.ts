// Path: lib/handlers/pipeline/reservationState.ts
// Motor mínimo de estados conversacionales para reservas dentro del runtime vigente.
// Mantiene compatibilidad con `messageHandler` y evita confirmar fuera de contexto.

export type ReservationFlowKind =
  | "idle"
  | "collecting"
  | "quoted"
  | "confirmed"
  | "modifying"
  | "cancelling";

export type ReservationStateSnapshot = {
  reservationSlots?: Record<string, any>;
  lastProposal?: { available?: boolean } | null;
  salesStage?: string | null;
  conversationStage?: string | null;
  desiredAction?: string | null;
  activeFlow?: string | null;
  activeReservationContext?: {
    kind?: "draft" | "reservation" | null;
    phase?: "collecting" | "quoted" | "confirmed" | "cancelled" | null;
  } | null;
  pendingCancellation?: { awaitingConfirmation?: boolean } | null;
  pendingAvailabilityVerification?: { checkIn?: string; checkOut?: string } | null;
  lastReservation?: { status?: string | null } | null;
};

export function deriveReservationFlow(state?: ReservationStateSnapshot): ReservationFlowKind {
  const st = state || {};
  if (st.pendingCancellation?.awaitingConfirmation || st.activeFlow === "cancel_reservation") {
    return "cancelling";
  }
  if (st.desiredAction === "modify" || st.activeFlow === "modify_reservation") {
    return "modifying";
  }
  if (st.activeReservationContext?.kind === "draft") {
    return st.activeReservationContext.phase === "quoted" ? "quoted" : "collecting";
  }
  if (st.activeReservationContext?.kind === "reservation" && st.activeReservationContext.phase === "confirmed") {
    return "confirmed";
  }
  if (st.desiredAction === "create" || st.activeFlow === "reservation") {
    if (st.salesStage === "quote" || st.conversationStage === "reservation_quoted" || st.lastProposal) {
      return "quoted";
    }
    if (st.reservationSlots || st.salesStage === "qualify" || st.salesStage === "followup") {
      return "collecting";
    }
  }
  if (st.salesStage === "close" || st.lastReservation?.status === "created") {
    return "confirmed";
  }
  if (st.salesStage === "quote" || st.conversationStage === "reservation_quoted" || st.lastProposal) {
    return "quoted";
  }
  if (st.reservationSlots) {
    return "collecting";
  }
  return "idle";
}

export function hasConfirmableDraft(state?: ReservationStateSnapshot, nextSlots?: Record<string, any>): boolean {
  const st = state || {};
  const slots = { ...(st.reservationSlots || {}), ...(nextSlots || {}) };
  const hasDates = Boolean(slots.checkIn && slots.checkOut);
  const hasRoomType = Boolean(slots.roomType);
  const hasQuoteSignal = st.salesStage === "quote" || st.lastProposal?.available === true || st.conversationStage === "reservation_quoted";
  return hasQuoteSignal && hasDates && hasRoomType;
}

export function isConfirmableReservationState(state?: ReservationStateSnapshot, nextSlots?: Record<string, any>) {
  const flow = deriveReservationFlow(state);
  const confirmable = flow === "quoted" && hasConfirmableDraft(state, nextSlots);
  return { flow, confirmable } as const;
}
