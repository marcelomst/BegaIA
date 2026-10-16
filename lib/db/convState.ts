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
  numGuests?: number | string | null;
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
  availabilityStatus?: "available" | "unavailable" | "error";
  snapshot?: ReservationSlots;
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

export type LastProposalTextIdentity = {
  sourceText: string;
  toolCallAt: string;
  input: {
    hotelId: string;
    roomType: string;
    numGuests: number;
    checkIn: string;
    checkOut: string;
  };
};

export type LastProposalTextUpdateResult = {
  matched: boolean;
  modified: boolean;
  matchedCount: 0 | 1;
  modifiedCount: 0 | 1;
};

export type DeterministicCreateProposalIdentity = {
  sourceText: string;
  available: boolean;
  availabilityStatus: "available" | "unavailable" | "error";
  toolCallAt: string;
  outputSummary: "available:true" | "available:false" | "error";
  input: {
    hotelId: string;
    roomType: string;
    numGuests: number;
    checkIn: string;
    checkOut: string;
  };
  snapshot: {
    guestName: string;
    roomType: string;
    numGuests: number | string;
    checkIn: string;
    checkOut: string;
    locale?: string;
  };
};

export type DeterministicCreateProposalFinalizeResult = {
  matched: boolean;
  modified: boolean;
  matchedCount: 0 | 1;
  modifiedCount: 0 | 1;
};

export type DeterministicCreateProposalPublishResult =
  DeterministicCreateProposalFinalizeResult;

export type DeterministicCreateProposalPublishIdentity = Omit<
  DeterministicCreateProposalIdentity,
  "input" | "snapshot"
> & {
  input: NonNullable<LastProposal["toolCall"]>["input"];
  snapshot: ReservationSlots;
};

export type LastReservation =
  | {
    reservationId: string;
    status: "created" | "updated" | "cancelled";
    createdAt: string; // ISO
    channel: "web" | "email" | "whatsapp" | "channelManager";
    guestName?: string;
    roomType?: string;
    checkIn?: string;
    checkOut?: string;
    numGuests?: number | string | null;
  }
  | {
    reservationId: string; // puede quedar vacío si hubo error
    status: "error";
    createdAt: string; // ISO
    channel: "web" | "email" | "whatsapp" | "channelManager";
    guestName?: string;
    roomType?: string;
    checkIn?: string;
    checkOut?: string;
    numGuests?: number | string | null;
  };

export type LastPresentedReservations = {
  guestId: string;
  presentedAt: string;
  reservations: LastReservation[];
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

export type ActiveReservationContext = {
  kind: "draft" | "reservation";
  reservationId?: string | null;
  phase?: "collecting" | "quoted" | "confirmed" | "cancelled";
  updatedAt: string;
};

export type SelectedReservationTarget = {
  reservationId?: string;
  kind: "confirmed" | "draft" | "unknown";
  source: "ordinal" | "anaphora" | "explicit_id" | "active_focus";
  resolutionMode: "strong" | "weak";
  resolvedAt: string;
};

export type ModifyState = {
  activeField?: "guests" | "dates" | "roomType";
  pendingFields?: Array<"guests" | "dates" | "roomType">;
  pendingPatch?: {
    reservationId: string;
    guestName?: string;
    roomType?: string;
    numGuests?: number | string;
    checkIn?: string;
    checkOut?: string;
    quoteId?: string;
    quoteVersion?: string;
    priceTotal?: number;
    pricePerNight?: number;
    currency?: string;
  } | null;
  awaitingConfirmation?: boolean;
  updatedAt: string;
};

export type ConversationFocus = {
  domain: "reservation";
  subFlow: "create" | "modify" | "cancel";
  active: boolean;
  updatedAt: string;
};

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
  activeFlow?: "reservation" | "modify_reservation" | "cancel_reservation" | null;

  // Slots vivos del borrador
  reservationSlots?: ReservationSlots;

  // Ultima propuesta mostrada al huésped
  lastProposal?: LastProposal;

  // Última reserva creada (si corresponde)
  lastReservation?: LastReservation;
  reservationHistory?: LastReservation[] | null;
  lastPresentedReservations?: LastPresentedReservations | null;
  activeReservationContext?: ActiveReservationContext | null;
  selectedReservationTarget?: SelectedReservationTarget | null;
  modifyState?: ModifyState | null;
  conversationFocus?: ConversationFocus | null;
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

function deriveConversationFocus(
  patch: Partial<ConversationFlowState>
): ConversationFocus | null | undefined {
  if ("conversationFocus" in patch) {
    return patch.conversationFocus ?? null;
  }
  if (patch.desiredAction === "cancel" || patch.activeFlow === "cancel_reservation") {
    return { domain: "reservation", subFlow: "cancel", active: true, updatedAt: new Date().toISOString() };
  }
  if (patch.desiredAction === "modify" || patch.activeFlow === "modify_reservation") {
    return { domain: "reservation", subFlow: "modify", active: true, updatedAt: new Date().toISOString() };
  }
  if (
    patch.desiredAction === "create" ||
    patch.activeFlow === "reservation" ||
    patch.salesStage === "qualify" ||
    patch.salesStage === "quote" ||
    patch.salesStage === "followup" ||
    patch.reservationSlots ||
    patch.activeReservationContext?.kind === "draft"
  ) {
    return { domain: "reservation", subFlow: "create", active: true, updatedAt: new Date().toISOString() };
  }
  if (
    "activeFlow" in patch ||
    "desiredAction" in patch ||
    "salesStage" in patch ||
    "reservationSlots" in patch ||
    "activeReservationContext" in patch
  ) {
    return null;
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

export async function updateLastProposalTextIfCurrent(
  hotelId: string,
  conversationId: string,
  identity: LastProposalTextIdentity,
  text: string
): Promise<LastProposalTextUpdateResult> {
  const _id = key(hotelId, conversationId);
  const collection: any = col() as any;
  const res = await collection.updateOne(
    {
      _id,
      "lastProposal.available": true,
      "lastProposal.text": { $in: [identity.sourceText, text] },
      "lastProposal.toolCall.name": "checkAvailability",
      "lastProposal.toolCall.outputSummary": "available:true",
      "lastProposal.toolCall.at": identity.toolCallAt,
      "lastProposal.toolCall.input.hotelId": identity.input.hotelId,
      "lastProposal.toolCall.input.roomType": identity.input.roomType,
      "lastProposal.toolCall.input.numGuests": identity.input.numGuests,
      "lastProposal.toolCall.input.checkIn": identity.input.checkIn,
      "lastProposal.toolCall.input.checkOut": identity.input.checkOut,
    },
    { $set: { "lastProposal.text": text } }
  );
  const matchedCount: 0 | 1 = res?.matchedCount === 1 ? 1 : 0;
  const modifiedCount: 0 | 1 = res?.modifiedCount === 1 ? 1 : 0;
  return {
    matched: matchedCount === 1,
    modified: modifiedCount === 1,
    matchedCount,
    modifiedCount,
  };
}

export async function finalizeDeterministicCreateProposalIfCurrent(
  hotelId: string,
  conversationId: string,
  identity: DeterministicCreateProposalIdentity,
  finalText: string,
  options?: { reservationHistory?: LastReservation[] | null }
): Promise<DeterministicCreateProposalFinalizeResult> {
  if (identity.input.hotelId !== hotelId) {
    return { matched: false, modified: false, matchedCount: 0, modifiedCount: 0 };
  }
  const _id = key(hotelId, conversationId);
  const collection: any = col() as any;
  const isAvailable = identity.availabilityStatus === "available";
  const now = identity.toolCallAt;
  const $set: Record<string, unknown> = {
    "lastProposal.text": finalText,
    conversationFocus: {
      domain: "reservation",
      subFlow: "create",
      active: true,
      updatedAt: now,
    },
    activeReservationContext: {
      kind: "draft",
      phase: isAvailable ? "quoted" : "collecting",
      updatedAt: now,
    },
    activeFlow: "reservation",
    desiredAction: isAvailable ? "create" : "notify_reception",
    salesStage: isAvailable ? "quote" : "followup",
    conversationStage: isAvailable ? "reservation_quoted" : "reservation_collecting",
    lastCategory: "reservation",
    updatedAt: now,
    updatedBy: "ai",
  };
  if (options && "reservationHistory" in options) {
    $set.reservationHistory = options.reservationHistory;
  }
  const filter: Record<string, unknown> = {
    _id,
    hotelId,
    conversationId,
    "lastProposal.available": identity.available,
    "lastProposal.availabilityStatus": identity.availabilityStatus,
    "lastProposal.text": { $in: [identity.sourceText, finalText] },
    "lastProposal.toolCall.name": "checkAvailability",
    "lastProposal.toolCall.outputSummary": identity.outputSummary,
    "lastProposal.toolCall.at": identity.toolCallAt,
    "lastProposal.toolCall.input.hotelId": identity.input.hotelId,
    "lastProposal.toolCall.input.roomType": identity.input.roomType,
    "lastProposal.toolCall.input.numGuests": identity.input.numGuests,
    "lastProposal.toolCall.input.checkIn": identity.input.checkIn,
    "lastProposal.toolCall.input.checkOut": identity.input.checkOut,
    "lastProposal.snapshot.guestName": identity.snapshot.guestName,
    "lastProposal.snapshot.roomType": identity.snapshot.roomType,
    "lastProposal.snapshot.numGuests": identity.snapshot.numGuests,
    "lastProposal.snapshot.checkIn": identity.snapshot.checkIn,
    "lastProposal.snapshot.checkOut": identity.snapshot.checkOut,
    "reservationSlots.guestName": identity.snapshot.guestName,
    "reservationSlots.roomType": identity.snapshot.roomType,
    "reservationSlots.numGuests": identity.snapshot.numGuests,
    "reservationSlots.checkIn": identity.snapshot.checkIn,
    "reservationSlots.checkOut": identity.snapshot.checkOut,
  };
  if (identity.snapshot.locale) {
    filter["lastProposal.snapshot.locale"] = identity.snapshot.locale;
    filter["reservationSlots.locale"] = identity.snapshot.locale;
  }
  const res = await collection.updateOne(
    filter,
    {
      $set,
      $unset: { pendingAvailabilityVerification: true },
    }
  );
  const matchedCount: 0 | 1 = res?.matchedCount === 1 ? 1 : 0;
  const modifiedCount: 0 | 1 = res?.modifiedCount === 1 ? 1 : 0;
  return {
    matched: matchedCount === 1,
    modified: modifiedCount === 1,
    matchedCount,
    modifiedCount,
  };
}

function deterministicCreateProposalIdentityFilter(
  identity: DeterministicCreateProposalPublishIdentity,
  texts: string | { $in: string[] } = identity.sourceText
): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    "lastProposal.available": identity.available,
    "lastProposal.availabilityStatus": identity.availabilityStatus,
    "lastProposal.text": texts,
    "lastProposal.toolCall.name": "checkAvailability",
    "lastProposal.toolCall.outputSummary": identity.outputSummary,
    "lastProposal.toolCall.at": identity.toolCallAt,
    "lastProposal.toolCall.input.hotelId": identity.input.hotelId,
  };
  const exactOptionalFields: Array<[string, unknown]> = [
    ["lastProposal.toolCall.input.roomType", identity.input.roomType],
    ["lastProposal.toolCall.input.numGuests", identity.input.numGuests],
    ["lastProposal.toolCall.input.checkIn", identity.input.checkIn],
    ["lastProposal.toolCall.input.checkOut", identity.input.checkOut],
    ["lastProposal.snapshot.guestName", identity.snapshot.guestName],
    ["lastProposal.snapshot.roomType", identity.snapshot.roomType],
    ["lastProposal.snapshot.numGuests", identity.snapshot.numGuests],
    ["lastProposal.snapshot.checkIn", identity.snapshot.checkIn],
    ["lastProposal.snapshot.checkOut", identity.snapshot.checkOut],
  ];
  for (const [path, value] of exactOptionalFields) {
    filter[path] = value === undefined || value === null || value === ""
      ? { $exists: false }
      : value;
  }
  if (identity.snapshot.locale) {
    filter["lastProposal.snapshot.locale"] = identity.snapshot.locale;
  }
  return filter;
}

export async function publishDeterministicCreateProposalIfLatest(
  hotelId: string,
  conversationId: string,
  identity: DeterministicCreateProposalPublishIdentity,
  proposal: LastProposal
): Promise<DeterministicCreateProposalPublishResult> {
  const proposalIdentity = proposal.toolCall;
  const proposalSnapshot = proposal.snapshot;
  const identityMatchesProposal = Boolean(
    identity.input.hotelId === hotelId &&
    proposal.text === identity.sourceText &&
    proposal.available === identity.available &&
    proposal.availabilityStatus === identity.availabilityStatus &&
    proposalIdentity?.name === "checkAvailability" &&
    proposalIdentity.outputSummary === identity.outputSummary &&
    proposalIdentity.at === identity.toolCallAt &&
    proposalIdentity.input.hotelId === identity.input.hotelId &&
    proposalIdentity.input.roomType === identity.input.roomType &&
    proposalIdentity.input.numGuests === identity.input.numGuests &&
    proposalIdentity.input.checkIn === identity.input.checkIn &&
    proposalIdentity.input.checkOut === identity.input.checkOut &&
    proposalSnapshot?.guestName === identity.snapshot.guestName &&
    proposalSnapshot?.roomType === identity.snapshot.roomType &&
    proposalSnapshot?.numGuests === identity.snapshot.numGuests &&
    proposalSnapshot?.checkIn === identity.snapshot.checkIn &&
    proposalSnapshot?.checkOut === identity.snapshot.checkOut &&
    (!identity.snapshot.locale || proposalSnapshot?.locale === identity.snapshot.locale)
  );
  if (!identityMatchesProposal) {
    return { matched: false, modified: false, matchedCount: 0, modifiedCount: 0 };
  }

  const _id = key(hotelId, conversationId);
  const collection: any = col() as any;
  const chronologicalEligibility = {
    $and: [
      {
        $or: [
          { "lastProposal.toolCall.at": { $lt: identity.toolCallAt } },
          { "lastProposal.toolCall.at": { $exists: false } },
        ],
      },
      {
        $or: [
          { updatedAt: { $lte: identity.toolCallAt } },
          { updatedAt: { $exists: false } },
        ],
      },
    ],
  };
  const reservationSlotSet: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(identity.snapshot)) {
    if (value !== undefined && value !== null && value !== "") {
      reservationSlotSet[`reservationSlots.${field}`] = value;
    }
  }
  const res = await collection.updateOne(
    {
      _id,
      hotelId,
      conversationId,
      ...chronologicalEligibility,
    },
    {
      $set: {
        lastProposal: proposal,
        ...reservationSlotSet,
        conversationFocus: {
          domain: "reservation",
          subFlow: "create",
          active: true,
          updatedAt: identity.toolCallAt,
        },
        activeReservationContext: {
          kind: "draft",
          phase: "collecting",
          updatedAt: identity.toolCallAt,
        },
        activeFlow: "reservation",
        desiredAction: identity.available ? "create" : "notify_reception",
        salesStage: identity.available ? "qualify" : "followup",
        conversationStage: "reservation_collecting",
        lastCategory: "reservation",
        updatedAt: identity.toolCallAt,
        updatedBy: "ai",
      },
      $unset: { pendingAvailabilityVerification: true },
    }
  );
  if (res?.matchedCount === 1) {
    const modifiedCount: 0 | 1 = res?.modifiedCount === 1 ? 1 : 0;
    return { matched: true, modified: modifiedCount === 1, matchedCount: 1, modifiedCount };
  }

  const current = await collection.findOne({
    _id,
    hotelId,
    conversationId,
    ...deterministicCreateProposalIdentityFilter(identity),
  });
  return current
    ? { matched: true, modified: false, matchedCount: 1, modifiedCount: 0 }
    : { matched: false, modified: false, matchedCount: 0, modifiedCount: 0 };
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
  const derivedConversationFocus = deriveConversationFocus(patch);
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

  if ("reservationHistory" in patch) {
    if ((patch as any).reservationHistory == null) {
      $unset["reservationHistory"] = true;
    } else {
      $set["reservationHistory"] = (patch as any).reservationHistory;
    }
  }

  if ("lastPresentedReservations" in patch) {
    if ((patch as any).lastPresentedReservations == null) {
      $unset["lastPresentedReservations"] = true;
    } else {
      $set["lastPresentedReservations"] = (patch as any).lastPresentedReservations;
    }
  }

  if ("activeReservationContext" in patch) {
    if ((patch as any).activeReservationContext == null) {
      $unset["activeReservationContext"] = true;
    } else {
      $set["activeReservationContext"] = (patch as any).activeReservationContext;
    }
  }

  if ("selectedReservationTarget" in patch) {
    if ((patch as any).selectedReservationTarget == null) {
      $unset["selectedReservationTarget"] = true;
    } else {
      $set["selectedReservationTarget"] = (patch as any).selectedReservationTarget;
    }
  }

  if ("modifyState" in patch) {
    if ((patch as any).modifyState == null) {
      $unset["modifyState"] = true;
    } else {
      $set["modifyState"] = (patch as any).modifyState;
    }
  }

  if ("conversationFocus" in patch || typeof derivedConversationFocus !== "undefined") {
    const nextFocus = "conversationFocus" in patch ? patch.conversationFocus ?? null : derivedConversationFocus;
    if (nextFocus == null) {
      $unset["conversationFocus"] = true;
    } else {
      $set["conversationFocus"] = nextFocus;
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
      if (derivedConversationFocus != null) doc.conversationFocus = derivedConversationFocus;
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
      if ("reservationHistory" in patch && (patch as any).reservationHistory != null) doc.reservationHistory = (patch as any).reservationHistory;
      if ("lastPresentedReservations" in patch && (patch as any).lastPresentedReservations != null) doc.lastPresentedReservations = (patch as any).lastPresentedReservations;
      if ("activeReservationContext" in patch && (patch as any).activeReservationContext != null) doc.activeReservationContext = (patch as any).activeReservationContext;
      if ("selectedReservationTarget" in patch && (patch as any).selectedReservationTarget != null) doc.selectedReservationTarget = (patch as any).selectedReservationTarget;
      if ("modifyState" in patch && (patch as any).modifyState != null) doc.modifyState = (patch as any).modifyState;
      if ("conversationFocus" in patch && (patch as any).conversationFocus != null) doc.conversationFocus = (patch as any).conversationFocus;
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

export function resolveActiveReservationContext(
  st?: Partial<ConversationFlowState> | null
): ActiveReservationContext | undefined {
  if (!st) return undefined;
  const explicit = st.activeReservationContext;
  if (
    explicit &&
    (explicit.kind === "draft" || explicit.kind === "reservation") &&
    typeof explicit.updatedAt === "string" &&
    explicit.updatedAt
  ) {
    return explicit;
  }

  if (st.desiredAction === "create" || st.activeFlow === "reservation") {
    return {
      kind: "draft",
      phase:
        st.salesStage === "quote" || st.conversationStage === "reservation_quoted" || st.lastProposal
          ? "quoted"
          : "collecting",
      updatedAt: st.updatedAt || new Date().toISOString(),
    };
  }

  if (st.salesStage === "quote" || st.conversationStage === "reservation_quoted" || st.lastProposal) {
    return {
      kind: "draft",
      phase: "quoted",
      updatedAt: st.updatedAt || new Date().toISOString(),
    };
  }

  if (st.reservationSlots && st.salesStage !== "close") {
    return {
      kind: "draft",
      phase: "collecting",
      updatedAt: st.updatedAt || new Date().toISOString(),
    };
  }

  if (st.lastReservation?.reservationId || st.salesStage === "close" || st.conversationStage === "reservation_confirmed") {
    return {
      kind: "reservation",
      reservationId: st.lastReservation?.reservationId,
      phase: st.lastReservation?.status === "cancelled" ? "cancelled" : "confirmed",
      updatedAt: st.updatedAt || new Date().toISOString(),
    };
  }

  return undefined;
}
