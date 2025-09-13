// /lib/audit/policy.ts
export const AUDIT_POLICY = {
  reservation: {
    intentMinAgree: 0.75,         // ambos >= y misma categoría
    actionMustMatch: true,        // create/modify/cancel deben coincidir
    slots: {
      // pesos de importancia por slot (0..1)
      weights: { guestName: 0.4, roomType: 0.9, checkIn: 0.9, checkOut: 0.9, numGuests: 0.6 } as Record<RequiredSlot, number>,
      // umbral de “similaridad” para aceptar un slot
      minSlotConfidence: 0.7,
      // porcentaje de peso total que debe coincidir (p.ej., roomType+fechas pesan mucho)
      minWeightedAgreement: 0.7,
    },
  },
  billing: { intentMinAgree: 0.65, actionMustMatch: false, slots: { weights: {}, minSlotConfidence: 0.6, minWeightedAgreement: 0 } },
  amenities: { intentMinAgree: 0.65, actionMustMatch: false, slots: { weights: {}, minSlotConfidence: 0.6, minWeightedAgreement: 0 } },
  support: { intentMinAgree: 0.65, actionMustMatch: false, slots: { weights: {}, minSlotConfidence: 0.6, minWeightedAgreement: 0 } },
  retrieval_based: { intentMinAgree: 0.5, actionMustMatch: false, slots: { weights: {}, minSlotConfidence: 0.5, minWeightedAgreement: 0 } },
} as const;
