// /lib/audit/confidence.ts
import type { Interpretation, RequiredSlot, SlotMap } from "@/lib/types/audit";

export function intentConfidenceByRules(text: string, cat: Interpretation["category"]): number {
  const t = (text||"").toLowerCase();
  switch (cat) {
    case "reservation":
      return /\b(reserv|book|booking)\b/.test(t) ? 0.85 : 0.6;
    case "cancel_reservation":
      return /\b(cancel|anul|cancelar)\b/.test(t) ? 0.9 : 0.5;
    default:
      return 0.6;
  }
}

export function slotsConfidenceByRules(slots: SlotMap): Record<RequiredSlot, number|undefined> {
  const out: Record<RequiredSlot, number|undefined> = {
    guestName: slots.guestName ? 0.7 : undefined,
    roomType:  slots.roomType  ? 0.9 : undefined, // mapeo normalizado
    checkIn:   slots.checkIn   ? 0.85 : undefined,
    checkOut:  slots.checkOut  ? 0.85 : undefined,
    numGuests: slots.numGuests ? 0.7 : undefined,
  };
  return out;
}
