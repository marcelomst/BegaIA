// Path: /root/begasist/lib/audit/policy.ts
import type { RequiredSlot, IntentCategory } from "@/types/audit";

type SlotPolicy = {
  weights: Partial<Record<RequiredSlot, number>>;
  minSlotConfidence: number;
  minWeightedAgreement: number;
};

type CategoryPolicy = {
  intentMinAgree: number;
  actionMustMatch: boolean;
  slots: SlotPolicy;
};

const RESERVATION_WEIGHTS: Record<RequiredSlot, number> = {
  guestName: 0.4,
  roomType: 0.9,
  checkIn: 0.9,
  checkOut: 0.9,
  numGuests: 0.6,
};

export const AUDIT_POLICY: Record<IntentCategory, CategoryPolicy> = {
  reservation: {
    intentMinAgree: 0.6,         // antes 0.75
    actionMustMatch: false,       // antes true (ver nota más abajo)
    slots: {
      weights: { guestName: 0.4, roomType: 0.9, checkIn: 0.9, checkOut: 0.9, numGuests: 0.6 } as Record<RequiredSlot, number>,
      minSlotConfidence: 0.6,     // antes 0.7
      minWeightedAgreement: 0.55, // antes 0.7
    },
  },
  cancel_reservation: { // ⬅️ nuevo
    intentMinAgree: 0.75,
    actionMustMatch: true,
    slots: { weights: {}, minSlotConfidence: 0.7, minWeightedAgreement: 0 },
  },
  billing:    { 
    intentMinAgree: 0.6, 
    actionMustMatch: false, 
    slots: { weights: {}, minSlotConfidence: 0.5, minWeightedAgreement: 0 } },

  amenities: {
    intentMinAgree: 0.65,
    actionMustMatch: false,
    slots: { weights: {}, minSlotConfidence: 0.6, minWeightedAgreement: 0 },
  },
  support:    { 
    intentMinAgree: 0.6, 
    actionMustMatch: false, 
    slots: { weights: {}, minSlotConfidence: 0.5, minWeightedAgreement: 0 } },

  retrieval_based: {
    intentMinAgree: 0.4,          // más permisivo
    actionMustMatch: false,
    slots: { weights: {}, minSlotConfidence: 0.5, minWeightedAgreement: 0 },
  },
} as const;
