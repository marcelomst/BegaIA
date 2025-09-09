// Path: /root/begasist/lib/db/convState.ts
import { getAstraDB } from "@/lib/astra/connection";

export const CONVSTATE_VERSION = "convstate-2025-09-04-02";
console.log("[convState] loaded", CONVSTATE_VERSION, "at", __filename);

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
  toolCall?: {
    name: "checkAvailability";
    input: {
      hotelId: string;
      roomType?: string;
      guests?: number;
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
      status: "created";
      createdAt: string; // ISO
      channel: "web" | "email" | "whatsapp" | "channelManager";
    }
  | {
      reservationId: string; // puede quedar vacío si hubo error
      status: "error";
      createdAt: string; // ISO
      channel: "web" | "email" | "whatsapp" | "channelManager";
    };

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

  // Meta/negocio
  salesStage?: "qualify" | "quote" | "close" | "followup";

  // Compat vieja
  lastCategory?: string | null;

  // Auditoría
  updatedAt: string;
  updatedBy?: "ai" | "agent" | "system";
};

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

  // Campos de nivel superior (compat + nuevos)
  if ("lastCategory" in patch) $set.lastCategory = patch.lastCategory ?? null;
  if ("activeFlow"   in patch) $set.activeFlow   = patch.activeFlow ?? null;
  if ("salesStage"   in patch) $set.salesStage   = patch.salesStage ?? null;

  const $unset: Record<string, any> = {};

  // reservationSlots: set/unset por campo (merge superficial por clave)
  if ("reservationSlots" in patch) {
    const slots = patch.reservationSlots ?? {};
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

  const update: any = Object.keys($unset).length ? { $set, $unset } : { $set };

  console.log("[convState] upsert:about-to-write", { _id, update });

  const res = await col().updateOne({ _id }, update, { upsert: true });

  console.log("[convState] upsert:result", {
    _id,
    matchedCount: (res as any)?.matchedCount,
    modifiedCount: (res as any)?.modifiedCount,
    upsertedId:   (res as any)?.upsertedId,
    acknowledged: (res as any)?.acknowledged,
  });
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
  return upsertConvState(hotelId, conversationId, { reservationSlots: patchSlots });
}
