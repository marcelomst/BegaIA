// Path: /root/begasist/lib/db/convState.ts
import { getAstraDB } from "@/lib/astra/connection";
import { normalizeSlots } from "@/lib/agents/helpers";
import { log } from "node:console";
import { lookup } from "node:dns";
import type { SupervisionRecord } from "@/types/audit";

export const CONVSTATE_VERSION = "convstate-2025-09-04-02";
console.log("[convState] loaded", CONVSTATE_VERSION);

/* =========================
 *        Tipos
 * ========================= */

export type ReservationSlots = {
  guestName?: string;
  roomType?: string;
  checkIn?: string;   // YYYY-MM-DD
  checkOut?: string;  // YYYY-MM-DD
  numGuests?: number | string;
  locale?: string;    // ISO 639-3 (spa/eng/por) - opcional para snapshot
};

export type ProposalOption = {
  roomType: string;
  pricePerNight?: number;
  currency?: string;
  policies?: string;
  availability?: number;
};

export type LastProposal = {
  text: string;
  available: boolean;
  options?: ProposalOption[];
  // Sugerencias rápidas para siguiente turno
  suggestedRoomType?: string;
  suggestedPricePerNight?: number;
  toolCall?: {
    name: "checkAvailability";
    input: {
      hotelId: string;
      roomType?: string;
      numGuests?: number;
      checkIn?: string;
      checkOut?: string;
    };
    outputSummary?: string;
    at: string; // ISO timestamp
  };
};

export type LastReservation =
  | {
    reservationId: string;
    status: "created" | "updated" | "cancelled";
    createdAt: string; // ISO
    channel: "web" | "email" | "whatsapp" | "channelManager";
  }
  | {
    reservationId: string; // puede quedar vacío si hubo error
    status: "error";
    createdAt: string; // ISO
    channel: "web" | "email" | "whatsapp" | "channelManager";
  };

export type PendingCancellation = {
  reservationId?: string;
  awaitingConfirmation?: boolean;
};

export type PendingAvailabilityVerification = {
  checkIn: string;
  checkOut: string;
};

export type GuestState = "prospect" | "booked" | "in_house";

export type ConversationStage =
  | "intake"
  | "reservation_collecting"
  | "reservation_quoted"
  | "reservation_confirmed"
  | "reservation_modifying"
  | "reservation_cancelling";

export type ConversationFlowState = {
  _id: string;              // hotelId:conversationId
  hotelId: string;
  conversationId: string;

  // Flujo actual (compat)
  activeFlow?: "reservation" | "cancel_reservation" | null;

  // Slots vivos del borrador
  reservationSlots?: ReservationSlots;

  // Ultima propuesta mostrada al huésped
  lastProposal?: LastProposal;

  // Última reserva creada (si corresponde)
  lastReservation?: LastReservation;
  pendingCancellation?: PendingCancellation | null;
  pendingAvailabilityVerification?: PendingAvailabilityVerification | null;
  guestState?: GuestState | null;

  // Meta/negocio
  salesStage?: "qualify" | "quote" | "close" | "followup";
  conversationStage?: ConversationStage;
  desiredAction?: "create" | "modify" | "cancel" | undefined;

  // Compat vieja
  lastCategory?: string | null;

  // ⬇️ NUEVO
  supervised?: boolean;                  // flag de pendiente/revisión
  lastSupervision?: SupervisionRecord | null; // último registro de auditoría

  // Eventos (follow-ups)
  lastEventCity?: string | null;
  lastEventRange?: { from: string; to: string; tz: string } | null;
  lastEventPromptKey?: string | null;
  lastIntentGroup?: string | null;

  // Guardias conversacionales puntuales
  dateCoherencePending?: { checkIn: string; checkOut: string } | null;


  // Auditoría
  updatedAt: string;
  updatedBy?: "ai" | "agent" | "system" | "audit" | string;
};

function deriveConversationStage(
  patch: Partial<ConversationFlowState>
): ConversationStage | undefined {
  if ("conversationStage" in patch) {
    return patch.conversationStage ?? undefined;
  }

  if (patch.desiredAction === "cancel" || patch.activeFlow === "cancel_reservation") {
    return "reservation_cancelling";
  }
  if (patch.desiredAction === "modify") {
    return "reservation_modifying";
  }
  if (patch.lastReservation?.status === "created" || patch.salesStage === "close") {
    return "reservation_confirmed";
  }
  if (patch.salesStage === "quote") {
    return "reservation_quoted";
  }
  if (
    patch.salesStage === "qualify" ||
    patch.salesStage === "followup" ||
    patch.activeFlow === "reservation" ||
    patch.lastProposal ||
    patch.reservationSlots
  ) {
    return "reservation_collecting";
  }
  return undefined;
}

/* =========================
 *      DB helpers
 * ========================= */

const COLLECTION = "conv_state";

function col() {
  return getAstraDB().collection<ConversationFlowState>(COLLECTION);
}

function key(hotelId: string, conversationId: string) {
  return `${hotelId}:${conversationId}`;
}

/* =========================
 *         Reads
 * ========================= */

export async function getConvState(
  hotelId: string,
  conversationId: string
): Promise<ConversationFlowState | null> {
  const _id = key(hotelId, conversationId);
  console.log("[BP-CS1]", hotelId, conversationId, _id);
  const doc = await col().findOne({ _id });
  return doc ?? null;
}

/* =========================
 *         Upsert
 * ========================= */
/**
 * Upsert de estado conversacional.
 * - Usa $set para escribir campos
 * - Usa $unset para borrar subcampos si vienen undefined/null/""
 * - Mantiene compat con tu modelo actual (_id como clave primaria)
 *
 * Campos soportados en patch:
 *  - lastCategory, activeFlow, salesStage, updatedBy
 *  - reservationSlots (merge por campo con set/unset)
 *  - lastProposal (objeto entero: si viene null => unset completo; si viene objeto => set completo)
 *  - lastReservation (objeto entero: si viene null => unset completo; si viene objeto => set completo)
 */
// BP-R8: dentro del await upsertConvState(...) de este branch (verás BP-CS2/3).

export async function upsertConvState(
  hotelId: string,
  conversationId: string,
  patch: Partial<ConversationFlowState>
) {
  const _id = key(hotelId, conversationId);
  const now = new Date().toISOString();

  // Base $set (sin _id)
  const $set: Record<string, any> = {
    hotelId,
    conversationId,
    updatedAt: now,
    ...(patch.updatedBy ? { updatedBy: patch.updatedBy } : {}),
  };
  const $unset: Record<string, any> = {};

  // Campos de nivel superior (compat + nuevos)
  if ("lastCategory" in patch) $set.lastCategory = patch.lastCategory ?? null;
  if ("activeFlow" in patch) $set.activeFlow = patch.activeFlow ?? null;
  if ("salesStage" in patch) $set.salesStage = patch.salesStage ?? null;
  if ("desiredAction" in patch) {
    if (patch.desiredAction == null) {
      $unset["desiredAction"] = true;
    } else {
      $set.desiredAction = patch.desiredAction;
    }
  }
  const derivedConversationStage = deriveConversationStage(patch);
  if ("conversationStage" in patch) {
    if (patch.conversationStage == null) {
      $unset["conversationStage"] = true;
    } else {
      $set.conversationStage = patch.conversationStage;
    }
  } else if (derivedConversationStage) {
    $set.conversationStage = derivedConversationStage;
  }
  if ("lastEventCity" in patch) $set.lastEventCity = (patch as any).lastEventCity ?? null;
  if ("lastEventRange" in patch) $set.lastEventRange = (patch as any).lastEventRange ?? null;
  if ("lastEventPromptKey" in patch) $set.lastEventPromptKey = (patch as any).lastEventPromptKey ?? null;
  if ("lastIntentGroup" in patch) $set.lastIntentGroup = (patch as any).lastIntentGroup ?? null;
  if ("dateCoherencePending" in patch) $set.dateCoherencePending = (patch as any).dateCoherencePending ?? null;

  // ✅ NUEVO: flags de auditoría/supervisión
  if ("supervised" in patch) {
    const v = (patch as any).supervised;
    if (v === undefined || v === null) {
      $unset["supervised"] = true;
    } else {
      $set["supervised"] = !!v;
    }
  }

  if ("lastSupervision" in patch) {
    const v = (patch as any).lastSupervision;
    if (v == null) {
      $unset["lastSupervision"] = true;
    } else {
      $set["lastSupervision"] = v;
    }
  }
  // reservationSlots: set/unset por campo (merge superficial por clave)
  if ("reservationSlots" in patch) {
    // Normalización defensiva: guests -> numGuests
    const slots = normalizeSlots(patch.reservationSlots ?? {});
    const keys: (keyof ReservationSlots)[] = [
      "guestName",
      "roomType",
      "checkIn",
      "checkOut",
      "numGuests",
      "locale",
    ];
    for (const k of keys) {
      const v = (slots as any)[k];
      const path = `reservationSlots.${String(k)}`;
      if (v === undefined || v === null || v === "") {
        $unset[path] = true;
      } else {
        $set[path] = v;
      }
    }
  }

  // lastProposal: si viene explícitamente null => unset completo; si viene objeto => set completo
  if ("lastProposal" in patch) {
    if (patch.lastProposal == null) {
      $unset["lastProposal"] = true;
    } else {
      $set["lastProposal"] = patch.lastProposal;
    }
  }

  // lastReservation: si viene explícitamente null => unset completo; si viene objeto => set completo
  if ("lastReservation" in patch) {
    if (patch.lastReservation == null) {
      $unset["lastReservation"] = true;
    } else {
      $set["lastReservation"] = patch.lastReservation;
    }
  }

  if ("pendingCancellation" in patch) {
    if ((patch as any).pendingCancellation == null) {
      $unset["pendingCancellation"] = true;
    } else {
      $set["pendingCancellation"] = (patch as any).pendingCancellation;
    }
  }

  if ("pendingAvailabilityVerification" in patch) {
    if ((patch as any).pendingAvailabilityVerification == null) {
      $unset["pendingAvailabilityVerification"] = true;
    } else {
      $set["pendingAvailabilityVerification"] = (patch as any).pendingAvailabilityVerification;
    }
  }

  if ("guestState" in patch) {
    if ((patch as any).guestState == null) {
      $unset["guestState"] = true;
    } else {
      $set["guestState"] = (patch as any).guestState;
    }
  }

  const update: any = Object.keys($unset).length ? { $set, $unset } : { $set };

  console.log("[BP-CS2]", hotelId, conversationId, JSON.stringify(patch))

  const collection: any = col() as any;
  const res = await collection.updateOne({ _id }, update, { upsert: true });

  // Fallback para entornos de test donde updateOne no respeta upsert
  if (!res || res.matchedCount === 0) {
    try {
      // Construimos un documento base a partir del patch (solo campos "set")
      const doc: any = {
        _id,
        hotelId,
        conversationId,
        updatedAt: now,
      };
      if ("updatedBy" in patch) doc.updatedBy = patch.updatedBy;
      if ("lastCategory" in patch) doc.lastCategory = patch.lastCategory ?? null;
      if ("activeFlow" in patch) doc.activeFlow = patch.activeFlow ?? null;
      if ("salesStage" in patch) doc.salesStage = patch.salesStage ?? null;
      if ("desiredAction" in patch) doc.desiredAction = patch.desiredAction ?? null;
      if (derivedConversationStage) doc.conversationStage = derivedConversationStage;
      if ("supervised" in patch) doc.supervised = !!(patch as any).supervised;
      if ("lastSupervision" in patch && (patch as any).lastSupervision != null) doc.lastSupervision = (patch as any).lastSupervision;
      if ("reservationSlots" in patch) {
        const slots = normalizeSlots(patch.reservationSlots ?? {});
        const clean: Record<string, any> = {};
        for (const k of ["guestName", "roomType", "checkIn", "checkOut", "numGuests", "locale"]) {
          const v = (slots as any)[k];
          if (v !== undefined && v !== null && v !== "") clean[k] = v;
        }
        if (Object.keys(clean).length) doc.reservationSlots = clean;
      }
      if ("lastProposal" in patch && patch.lastProposal != null) doc.lastProposal = patch.lastProposal;
      if ("lastReservation" in patch && patch.lastReservation != null) doc.lastReservation = patch.lastReservation;
      if ("pendingCancellation" in patch && (patch as any).pendingCancellation != null) doc.pendingCancellation = (patch as any).pendingCancellation;
      if ("pendingAvailabilityVerification" in patch && (patch as any).pendingAvailabilityVerification != null) doc.pendingAvailabilityVerification = (patch as any).pendingAvailabilityVerification;
      if ("guestState" in patch && (patch as any).guestState != null) doc.guestState = (patch as any).guestState;
      if (typeof collection.insertOne === "function") {
        await collection.insertOne(doc);
        console.log("BP-CS3 (fallback-insert)", { acknowledged: true, insertedId: _id });
        return;
      }
    } catch (e) {
      console.warn("[convState] fallback insert warn:", (e as any)?.message || e);
    }
  }

  console.log("BP-CS3", res)
}

/* =========================
 *        Utilities
 * ========================= */

/** Limpia completamente el estado de una conversación */
export async function clearConvState(hotelId: string, conversationId: string) {
  const _id = key(hotelId, conversationId);
  const res: any = await col().deleteOne({ _id });
  console.log("[convState] clear:", {
    _id,
    deletedCount: res?.deletedCount,
    acknowledged: res?.acknowledged,
  });
}

/**
 * Parchea solo algunos slots sin tocar los demás.
 * Útil para reglas como “me llamo…”, “cambiemos fechas…”
 */
export async function patchSlots(
  hotelId: string,
  conversationId: string,
  patchSlots: ReservationSlots
) {
  // Normalización defensiva: guests -> numGuests
  return upsertConvState(hotelId, conversationId, { reservationSlots: normalizeSlots(patchSlots) });
}

export function resolveGuestState(
  st?: Partial<ConversationFlowState> | null
): GuestState | undefined {
  if (!st) return undefined;
  if (st.guestState === "prospect" || st.guestState === "booked" || st.guestState === "in_house") {
    return st.guestState;
  }
  if (st.lastReservation?.status === "created" || st.lastReservation?.status === "updated") {
    return "booked";
  }
  if (st.salesStage === "close" || st.conversationStage === "reservation_confirmed") {
    return "booked";
  }
  if (st.reservationSlots || st.salesStage || st.conversationStage) {
    return "prospect";
  }
  return undefined;
}
