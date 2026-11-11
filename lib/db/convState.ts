// Path: /root/begasist/lib/db/convState.ts
import { getAstraDB } from "@/lib/astra/connection";
import { normalizeSlots } from "@/lib/agents/helpers";
import { log } from "node:console";
import { lookup } from "node:dns";
import { randomBytes } from "node:crypto";
import type { SupervisionRecord } from "@/types/audit";
import { getConversationOwnershipContext } from "@/lib/ownership/conversationOwnershipContext";

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

export type CreateDraftRevision = {
  startedAt: string;
  messageId: string;
};

export type DeterministicCreateProposalIdentity = {
  createDraftRevision?: CreateDraftRevision;
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
  canonicalGuestId?: string;
  issuedForMessageId?: string;
  previewMessageId?: string | null;
  issuedAt?: string;
  awaitingConfirmation?: boolean;
  presentedFingerprint?: string;
};

export type PendingCancellationAuthorization = {
  reservationId: string;
  canonicalGuestId: string;
  presentedFingerprint: string;
  issuedForMessageId: string;
  previewMessageId: string | null;
  issuedAt: string;
  awaitingConfirmation: boolean;
};

export type PendingCancellationCasResult = {
  matched: boolean;
  modified: boolean;
  matchedCount: 0 | 1;
  modifiedCount: 0 | 1;
};

export const CONVERSATION_WRITER_GUARD_CONTRACT_VERSION = "conversation-writer-guard-v1" as const;
export const CANCELLATION_EXECUTION_CONTRACT_VERSION = "cancellation-execution-v1" as const;

/**
 * Preventive deployment gate. Enabling Cancel requires a reviewed source change;
 * no runtime flag or partially integrated writer can enable the provider effect.
 */
export function isCancellationProviderExecutionEnabled(): false {
  return false;
}

export type ConversationWriterGuard = {
  contractVersion: typeof CONVERSATION_WRITER_GUARD_CONTRACT_VERSION;
  token: string;
  operationId: string;
  writerKind: string;
  instanceId: string;
  buildId: string;
  acquiredAt: string;
  messageId?: string;
};

export type CancellationExecutionState =
  | "prepared"
  | "provider_inflight"
  | "provider_succeeded"
  | "provider_failed_verified"
  | "provider_result_unknown"
  | "result_persisted"
  | "aborted_before_provider";

export type CancellationExecution = {
  contractVersion: typeof CANCELLATION_EXECUTION_CONTRACT_VERSION;
  operationId: string;
  reservationId: string;
  authorizationFingerprint: string;
  state: CancellationExecutionState;
  updatedAt: string;
};

export type ConversationOwnershipSummary = Omit<ConversationWriterGuard, "token">;

export type ConversationOwnershipAcquireResult =
  | { status: "acquired"; guard: ConversationWriterGuard; idempotent: boolean }
  | { status: "occupied"; owner: ConversationOwnershipSummary }
  | { status: "uncertain"; reason: string }
  | { status: "error"; reason: string };

export type ConversationOwnershipAssertionResult =
  | { status: "owned"; guard: ConversationWriterGuard }
  | { status: "unowned" }
  | { status: "occupied"; owner: ConversationOwnershipSummary }
  | { status: "malformed"; reason: string }
  | { status: "uncertain"; reason: string }
  | { status: "error"; reason: string };

export type ConversationOwnershipReleaseResult =
  | { status: "released" }
  | { status: "not_owner"; owner?: ConversationOwnershipSummary }
  | { status: "uncertain"; reason: string }
  | { status: "error"; reason: string };

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
  createDraftRevision?: CreateDraftRevision;

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
  conversationWriterGuard?: ConversationWriterGuard;
  cancellationExecution?: CancellationExecution | null;
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

type ConversationOwnershipInspection =
  | { status: "missing" }
  | { status: "unowned"; document: ConversationFlowState }
  | { status: "owned"; document: ConversationFlowState; guard: ConversationWriterGuard }
  | { status: "malformed"; reason: string }
  | { status: "uncertain"; reason: string }
  | { status: "error"; reason: string };

function canonicalIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const millis = Date.parse(value);
  return Number.isFinite(millis) && new Date(millis).toISOString() === value;
}

function isCanonicalWriterGuard(value: unknown): value is ConversationWriterGuard {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const guard = value as Record<string, unknown>;
  const required = [
    guard.token,
    guard.operationId,
    guard.writerKind,
    guard.instanceId,
    guard.buildId,
  ];
  if (guard.contractVersion !== CONVERSATION_WRITER_GUARD_CONTRACT_VERSION) return false;
  if (required.some((item) => typeof item !== "string" || !item.trim() || item.trim() !== item)) return false;
  if (!canonicalIsoTimestamp(guard.acquiredAt)) return false;
  if (guard.messageId !== undefined && (
    typeof guard.messageId !== "string" || !guard.messageId.trim() || guard.messageId.trim() !== guard.messageId
  )) return false;
  return true;
}

function sameWriterGuard(left: ConversationWriterGuard, right: ConversationWriterGuard): boolean {
  return left.contractVersion === right.contractVersion &&
    left.token === right.token &&
    left.operationId === right.operationId &&
    left.writerKind === right.writerKind &&
    left.instanceId === right.instanceId &&
    left.buildId === right.buildId &&
    left.acquiredAt === right.acquiredAt &&
    left.messageId === right.messageId;
}

function writerGuardIdentityFilter(guard: ConversationWriterGuard): Record<string, unknown> {
  return {
    "conversationWriterGuard.contractVersion": guard.contractVersion,
    "conversationWriterGuard.token": guard.token,
    "conversationWriterGuard.operationId": guard.operationId,
    "conversationWriterGuard.writerKind": guard.writerKind,
    "conversationWriterGuard.instanceId": guard.instanceId,
    "conversationWriterGuard.buildId": guard.buildId,
    "conversationWriterGuard.acquiredAt": guard.acquiredAt,
    "conversationWriterGuard.messageId": guard.messageId === undefined
      ? { $exists: false }
      : guard.messageId,
  };
}

function conversationMutationOwnershipFilter(
  hotelId: string,
  conversationId: string,
): Record<string, unknown> {
  const context = getConversationOwnershipContext();
  if (!context) {
    return { conversationWriterGuard: { $exists: false } };
  }
  if (context.hotelId !== hotelId || context.conversationId !== conversationId) {
    throw new Error("owned mutation cannot target a second conversation");
  }
  if (!isCanonicalWriterGuard(context.guard)) {
    throw new Error("owned mutation requires a canonical writer guard");
  }
  return writerGuardIdentityFilter(context.guard as ConversationWriterGuard);
}

function ownershipSummary(guard: ConversationWriterGuard): ConversationOwnershipSummary {
  const { token: _token, ...summary } = guard;
  return summary;
}

function isUncertainStorageError(error: unknown): boolean {
  const candidate = error as { name?: unknown; code?: unknown; message?: unknown } | null;
  const text = [candidate?.name, candidate?.code, candidate?.message]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");
  return /timeout|timed out|abort|deadline|econnreset|socket hang up/.test(text);
}

async function inspectConversationOwnership(
  hotelId: string,
  conversationId: string,
): Promise<ConversationOwnershipInspection> {
  let document: ConversationFlowState | null;
  try {
    document = await (col() as any).findOne({ _id: key(hotelId, conversationId) });
  } catch (error) {
    return isUncertainStorageError(error)
      ? { status: "uncertain", reason: "read_timeout" }
      : { status: "error", reason: "read_error" };
  }
  if (!document) return { status: "missing" };
  if (document._id !== key(hotelId, conversationId) || document.hotelId !== hotelId || document.conversationId !== conversationId) {
    return { status: "malformed", reason: "conversation_identity_mismatch" };
  }
  const rawGuard = (document as any).conversationWriterGuard;
  if (rawGuard === undefined) return { status: "unowned", document };
  if (!isCanonicalWriterGuard(rawGuard)) return { status: "malformed", reason: "invalid_or_unknown_writer_guard" };
  return { status: "owned", document, guard: rawGuard };
}

export function createConversationWriterGuard(input: {
  operationId: string;
  writerKind: string;
  instanceId: string;
  buildId: string;
  messageId?: string;
  acquiredAt?: string;
}): ConversationWriterGuard {
  const guard: ConversationWriterGuard = {
    contractVersion: CONVERSATION_WRITER_GUARD_CONTRACT_VERSION,
    token: randomBytes(32).toString("base64url"),
    operationId: input.operationId,
    writerKind: input.writerKind,
    instanceId: input.instanceId,
    buildId: input.buildId,
    acquiredAt: input.acquiredAt ?? new Date().toISOString(),
    ...(input.messageId === undefined ? {} : { messageId: input.messageId }),
  };
  if (!isCanonicalWriterGuard(guard)) {
    throw new Error("invalid conversation writer guard input");
  }
  return guard;
}

export async function ensureConversationStateShell(
  hotelId: string,
  conversationId: string,
): Promise<{ status: "ready" } | { status: "uncertain"; reason: string } | { status: "error"; reason: string }> {
  const _id = key(hotelId, conversationId);
  let writeError: unknown;
  try {
    await (col() as any).updateOne(
      { _id },
      {
        $setOnInsert: {
          _id,
          hotelId,
          conversationId,
          updatedAt: new Date().toISOString(),
          updatedBy: "system",
        },
      },
      { upsert: true },
    );
  } catch (error) {
    writeError = error;
  }

  const inspection = await inspectConversationOwnership(hotelId, conversationId);
  if (inspection.status === "unowned" || inspection.status === "owned") return { status: "ready" };
  if (inspection.status === "malformed") return { status: "error", reason: inspection.reason };
  if (inspection.status === "uncertain") return inspection;
  if (inspection.status === "error") return inspection;
  if (writeError && isUncertainStorageError(writeError)) return { status: "uncertain", reason: "shell_write_timeout" };
  return { status: "error", reason: writeError ? "shell_write_error" : "shell_not_persisted" };
}

export async function assertConversationOwnership(
  hotelId: string,
  conversationId: string,
  expected: ConversationWriterGuard,
): Promise<ConversationOwnershipAssertionResult> {
  if (!isCanonicalWriterGuard(expected)) return { status: "error", reason: "invalid_expected_guard" };
  const inspection = await inspectConversationOwnership(hotelId, conversationId);
  if (inspection.status === "missing" || inspection.status === "unowned") return { status: "unowned" };
  if (inspection.status === "malformed") return inspection;
  if (inspection.status === "uncertain") return inspection;
  if (inspection.status === "error") return inspection;
  if (sameWriterGuard(inspection.guard, expected)) return { status: "owned", guard: expected };
  return { status: "occupied", owner: ownershipSummary(inspection.guard) };
}

export async function resolveConversationOwnershipAttempt(
  hotelId: string,
  conversationId: string,
  attempted: ConversationWriterGuard,
): Promise<ConversationOwnershipAcquireResult> {
  const assertion = await assertConversationOwnership(hotelId, conversationId, attempted);
  if (assertion.status === "owned") return { status: "acquired", guard: attempted, idempotent: true };
  if (assertion.status === "occupied") return assertion;
  if (assertion.status === "uncertain") return assertion;
  if (assertion.status === "malformed") return { status: "error", reason: assertion.reason };
  if (assertion.status === "unowned") return { status: "uncertain", reason: "attempt_not_observable" };
  return assertion;
}

export async function acquireConversationOwnership(
  hotelId: string,
  conversationId: string,
  attempted: ConversationWriterGuard,
): Promise<ConversationOwnershipAcquireResult> {
  if (!isCanonicalWriterGuard(attempted)) return { status: "error", reason: "invalid_attempted_guard" };
  const shell = await ensureConversationStateShell(hotelId, conversationId);
  if (shell.status !== "ready") return shell;

  const before = await assertConversationOwnership(hotelId, conversationId, attempted);
  if (before.status === "owned") return { status: "acquired", guard: attempted, idempotent: true };
  if (before.status === "occupied" || before.status === "uncertain") return before;
  if (before.status === "malformed") return { status: "error", reason: before.reason };
  if (before.status === "error") return before;

  let writeError: unknown;
  try {
    await (col() as any).updateOne(
      {
        _id: key(hotelId, conversationId),
        hotelId,
        conversationId,
        conversationWriterGuard: { $exists: false },
      },
      {
        $set: {
          conversationWriterGuard: attempted,
          updatedAt: new Date().toISOString(),
          updatedBy: "system",
        },
      },
    );
  } catch (error) {
    writeError = error;
  }

  const resolved = await resolveConversationOwnershipAttempt(hotelId, conversationId, attempted);
  if (resolved.status === "acquired") return { ...resolved, idempotent: false };
  if (resolved.status === "occupied") return resolved;
  if (writeError && !isUncertainStorageError(writeError)) return { status: "error", reason: "acquire_write_error" };
  return { status: "uncertain", reason: writeError ? "acquire_write_timeout" : "acquire_not_observable" };
}

export async function releaseConversationOwnership(
  hotelId: string,
  conversationId: string,
  owned: ConversationWriterGuard,
): Promise<ConversationOwnershipReleaseResult> {
  if (!isCanonicalWriterGuard(owned)) return { status: "error", reason: "invalid_owned_guard" };
  let writeError: unknown;
  try {
    await (col() as any).updateOne(
      {
        _id: key(hotelId, conversationId),
        hotelId,
        conversationId,
        ...writerGuardIdentityFilter(owned),
      },
      {
        $unset: { conversationWriterGuard: true },
        $set: { updatedAt: new Date().toISOString(), updatedBy: "system" },
      },
    );
  } catch (error) {
    writeError = error;
  }

  const inspection = await inspectConversationOwnership(hotelId, conversationId);
  if (inspection.status === "missing" || inspection.status === "unowned") return { status: "released" };
  if (inspection.status === "malformed") return { status: "error", reason: inspection.reason };
  if (inspection.status === "uncertain") return inspection;
  if (inspection.status === "error") return inspection;
  if (!sameWriterGuard(inspection.guard, owned)) {
    return { status: "not_owner", owner: ownershipSummary(inspection.guard) };
  }
  if (writeError && !isUncertainStorageError(writeError)) return { status: "error", reason: "release_write_error" };
  return { status: "uncertain", reason: writeError ? "release_write_timeout" : "release_not_observable" };
}

function pendingCancellationIdentityFilter(
  pending: PendingCancellationAuthorization
): Record<string, unknown> {
  return {
    "pendingCancellation.reservationId": pending.reservationId,
    "pendingCancellation.canonicalGuestId": pending.canonicalGuestId,
    "pendingCancellation.presentedFingerprint": pending.presentedFingerprint,
    "pendingCancellation.issuedForMessageId": pending.issuedForMessageId,
    "pendingCancellation.previewMessageId": pending.previewMessageId,
    "pendingCancellation.issuedAt": pending.issuedAt,
    "pendingCancellation.awaitingConfirmation": pending.awaitingConfirmation,
  };
}

function pendingCancellationCasResult(result: any): PendingCancellationCasResult {
  const matchedCount: 0 | 1 = result?.matchedCount === 1 ? 1 : 0;
  const modifiedCount: 0 | 1 = result?.modifiedCount === 1 ? 1 : 0;
  return {
    matched: matchedCount === 1,
    modified: modifiedCount === 1,
    matchedCount,
    modifiedCount,
  };
}

function assertPendingCancellationAuthorization(
  pending: PendingCancellationAuthorization
): void {
  const required = [
    pending.reservationId,
    pending.canonicalGuestId,
    pending.presentedFingerprint,
    pending.issuedForMessageId,
  ];
  if (required.some((value) => !value || value.trim() !== value)) {
    throw new Error("pendingCancellation authorization requires canonical non-empty identifiers");
  }
  const issuedAt = Date.parse(pending.issuedAt);
  if (!Number.isFinite(issuedAt) || new Date(issuedAt).toISOString() !== pending.issuedAt) {
    throw new Error("pendingCancellation.issuedAt must be a canonical ISO timestamp");
  }
}

export async function preparePendingCancellationAuthorization(
  hotelId: string,
  conversationId: string,
  authorization: Omit<PendingCancellationAuthorization, "previewMessageId" | "awaitingConfirmation">
): Promise<PendingCancellationCasResult> {
  const pending: PendingCancellationAuthorization = {
    ...authorization,
    previewMessageId: null,
    awaitingConfirmation: false,
  };
  assertPendingCancellationAuthorization(pending);
  const result = await (col() as any).updateOne(
    {
      _id: key(hotelId, conversationId),
      hotelId,
      conversationId,
      ...conversationMutationOwnershipFilter(hotelId, conversationId),
      $or: [
        { pendingCancellation: { $exists: false } },
        { pendingCancellation: null },
        { "pendingCancellation.issuedAt": { $exists: false } },
        { "pendingCancellation.issuedAt": { $lt: pending.issuedAt } },
        {
          ...pendingCancellationIdentityFilter(pending),
        },
      ],
    },
    {
      $set: {
        pendingCancellation: pending,
        updatedAt: new Date().toISOString(),
        updatedBy: "ai",
      },
    }
  );
  return pendingCancellationCasResult(result);
}

export async function activatePendingCancellationAuthorization(
  hotelId: string,
  conversationId: string,
  prepared: PendingCancellationAuthorization,
  previewMessageId: string
): Promise<PendingCancellationCasResult> {
  assertPendingCancellationAuthorization(prepared);
  if (prepared.awaitingConfirmation || prepared.previewMessageId !== null || !previewMessageId.trim()) {
    return { matched: false, modified: false, matchedCount: 0, modifiedCount: 0 };
  }
  const result = await (col() as any).updateOne(
    {
      _id: key(hotelId, conversationId),
      hotelId,
      conversationId,
      ...conversationMutationOwnershipFilter(hotelId, conversationId),
      ...pendingCancellationIdentityFilter(prepared),
    },
    {
      $set: {
        "pendingCancellation.previewMessageId": previewMessageId,
        "pendingCancellation.awaitingConfirmation": true,
        updatedAt: new Date().toISOString(),
        updatedBy: "ai",
      },
    }
  );
  return pendingCancellationCasResult(result);
}

export async function suspendPendingCancellationAuthorization(
  hotelId: string,
  conversationId: string,
  active: PendingCancellationAuthorization
): Promise<PendingCancellationCasResult> {
  assertPendingCancellationAuthorization(active);
  if (!active.awaitingConfirmation || !active.previewMessageId) {
    return { matched: false, modified: false, matchedCount: 0, modifiedCount: 0 };
  }
  const result = await (col() as any).updateOne(
    {
      _id: key(hotelId, conversationId),
      hotelId,
      conversationId,
      ...conversationMutationOwnershipFilter(hotelId, conversationId),
      ...pendingCancellationIdentityFilter(active),
    },
    {
      $set: {
        "pendingCancellation.awaitingConfirmation": false,
        updatedAt: new Date().toISOString(),
        updatedBy: "ai",
      },
    }
  );
  return pendingCancellationCasResult(result);
}

export async function revokePendingCancellationAuthorizationIfCurrent(
  hotelId: string,
  conversationId: string,
  current: PendingCancellationAuthorization
): Promise<PendingCancellationCasResult> {
  assertPendingCancellationAuthorization(current);
  const result = await (col() as any).updateOne(
    {
      _id: key(hotelId, conversationId),
      hotelId,
      conversationId,
      ...conversationMutationOwnershipFilter(hotelId, conversationId),
      ...pendingCancellationIdentityFilter(current),
    },
    {
      $unset: { pendingCancellation: true },
      $set: { updatedAt: new Date().toISOString(), updatedBy: "ai" },
    }
  );
  return pendingCancellationCasResult(result);
}

export async function consumePendingCancellationAuthorization(
  hotelId: string,
  conversationId: string,
  active: PendingCancellationAuthorization
): Promise<PendingCancellationCasResult> {
  assertPendingCancellationAuthorization(active);
  if (!active.awaitingConfirmation || !active.previewMessageId) {
    return { matched: false, modified: false, matchedCount: 0, modifiedCount: 0 };
  }
  const result = await (col() as any).updateOne(
    {
      _id: key(hotelId, conversationId),
      hotelId,
      conversationId,
      ...conversationMutationOwnershipFilter(hotelId, conversationId),
      ...pendingCancellationIdentityFilter(active),
    },
    {
      $unset: { pendingCancellation: true },
      $set: { updatedAt: new Date().toISOString(), updatedBy: "ai" },
    }
  );
  return pendingCancellationCasResult(result);
}

export type CreateDraftInitializationPatch = Pick<
  Partial<ConversationFlowState>,
  | "reservationSlots"
  | "pendingAvailabilityVerification"
  | "selectedReservationTarget"
  | "modifyState"
  | "conversationFocus"
  | "activeReservationContext"
  | "activeFlow"
  | "desiredAction"
  | "salesStage"
  | "conversationStage"
  | "lastCategory"
  | "updatedBy"
> & { reservationSlots: ReservationSlots };

export type CreateDraftInitializationResult = {
  accepted: boolean;
  idempotent: boolean;
  inserted: boolean;
  matchedCount: 0 | 1;
  modifiedCount: 0 | 1;
};

export function compareCreateDraftRevisions(
  left: CreateDraftRevision,
  right: CreateDraftRevision
): -1 | 0 | 1 {
  if (left.startedAt !== right.startedAt) {
    return left.startedAt < right.startedAt ? -1 : 1;
  }
  if (left.messageId === right.messageId) return 0;
  return left.messageId < right.messageId ? -1 : 1;
}

function assertCanonicalCreateDraftRevision(revision: CreateDraftRevision): void {
  const parsed = Date.parse(revision.startedAt);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== revision.startedAt) {
    throw new Error("createDraftRevision.startedAt must be a canonical ISO timestamp");
  }
  if (!revision.messageId || revision.messageId.trim() !== revision.messageId) {
    throw new Error("createDraftRevision.messageId must be a non-empty stable identifier");
  }
}

function createDraftRevisionExactFilter(
  revision?: CreateDraftRevision
): Record<string, unknown> {
  return revision
    ? {
      "createDraftRevision.startedAt": revision.startedAt,
      "createDraftRevision.messageId": revision.messageId,
    }
    : {};
}

function createDraftRevisionAcceptanceFilter(
  revision: CreateDraftRevision
): Record<string, unknown> {
  return {
    $or: [
      { "createDraftRevision.startedAt": { $lt: revision.startedAt } },
      {
        "createDraftRevision.startedAt": revision.startedAt,
        "createDraftRevision.messageId": { $lt: revision.messageId },
      },
      {
        createDraftRevision: { $exists: false },
        lastProposal: { $exists: false },
      },
    ],
  };
}

function isDuplicateDocumentError(error: unknown): boolean {
  const candidate = error as {
    code?: unknown;
    message?: unknown;
    errorDescriptors?: Array<{ errorCode?: unknown }>;
    rawResponse?: { errors?: Array<{ errorCode?: unknown }> };
  };
  const code = String(candidate?.code ?? "").toUpperCase();
  const message = String(candidate?.message ?? "").toUpperCase();
  const descriptors = candidate?.errorDescriptors ?? candidate?.rawResponse?.errors ?? [];
  return candidate?.code === 11000 ||
    descriptors.some((descriptor) => descriptor?.errorCode === "DOCUMENT_ALREADY_EXISTS") ||
    code.includes("DUPLICATE") ||
    code.includes("ALREADY_EXISTS") ||
    message.includes("DUPLICATE") ||
    message.includes("ALREADY EXISTS");
}

function createDraftInitializationUpdate(
  hotelId: string,
  conversationId: string,
  revision: CreateDraftRevision,
  patch: CreateDraftInitializationPatch
): { $set: Record<string, unknown>; $unset: Record<string, true> } {
  const $set: Record<string, unknown> = {
    hotelId,
    conversationId,
    createDraftRevision: revision,
    updatedAt: new Date().toISOString(),
  };
  const $unset: Record<string, true> = { lastProposal: true };
  const fields: Array<keyof CreateDraftInitializationPatch> = [
    "reservationSlots",
    "pendingAvailabilityVerification",
    "selectedReservationTarget",
    "modifyState",
    "conversationFocus",
    "activeReservationContext",
    "activeFlow",
    "desiredAction",
    "salesStage",
    "conversationStage",
    "lastCategory",
    "updatedBy",
  ];
  for (const field of fields) {
    if (!(field in patch)) continue;
    const value = patch[field];
    if (value === undefined || value === null) {
      $unset[field] = true;
    } else {
      $set[field] = value;
    }
  }
  return { $set, $unset };
}

export async function initializeCreateDraftIfLatest(
  hotelId: string,
  conversationId: string,
  revision: CreateDraftRevision,
  patch: CreateDraftInitializationPatch
): Promise<CreateDraftInitializationResult> {
  assertCanonicalCreateDraftRevision(revision);
  const _id = key(hotelId, conversationId);
  const collection: any = col() as any;
  const update = createDraftInitializationUpdate(hotelId, conversationId, revision, patch);
  const conditionalFilter = {
    _id,
    hotelId,
    conversationId,
    ...conversationMutationOwnershipFilter(hotelId, conversationId),
    ...createDraftRevisionAcceptanceFilter(revision),
  };

  const applyConditionalUpdate = async (): Promise<CreateDraftInitializationResult | null> => {
    const result = await collection.updateOne(conditionalFilter, update);
    if (result?.matchedCount !== 1) return null;
    const modifiedCount: 0 | 1 = result?.modifiedCount === 1 ? 1 : 0;
    return {
      accepted: true,
      idempotent: false,
      inserted: false,
      matchedCount: 1,
      modifiedCount,
    };
  };
  const findExactRevision = async (): Promise<boolean> => Boolean(await collection.findOne({
    _id,
    hotelId,
    conversationId,
    ...conversationMutationOwnershipFilter(hotelId, conversationId),
    ...createDraftRevisionExactFilter(revision),
  }));

  const updated = await applyConditionalUpdate();
  if (updated) return updated;
  if (await findExactRevision()) {
    return { accepted: true, idempotent: true, inserted: false, matchedCount: 1, modifiedCount: 0 };
  }

  if (getConversationOwnershipContext()) {
    return { accepted: false, idempotent: false, inserted: false, matchedCount: 0, modifiedCount: 0 };
  }

  const document = { _id, ...update.$set };
  try {
    await collection.insertOne(document);
    return { accepted: true, idempotent: false, inserted: true, matchedCount: 1, modifiedCount: 1 };
  } catch (error) {
    if (!isDuplicateDocumentError(error)) throw error;
  }

  const retried = await applyConditionalUpdate();
  if (retried) return retried;
  if (await findExactRevision()) {
    return { accepted: true, idempotent: true, inserted: false, matchedCount: 1, modifiedCount: 0 };
  }
  return { accepted: false, idempotent: false, inserted: false, matchedCount: 0, modifiedCount: 0 };
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
      ...conversationMutationOwnershipFilter(hotelId, conversationId),
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
    ...conversationMutationOwnershipFilter(hotelId, conversationId),
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
    ...createDraftRevisionExactFilter(identity.createDraftRevision),
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
  Object.assign(filter, createDraftRevisionExactFilter(identity.createDraftRevision));
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
      ...conversationMutationOwnershipFilter(hotelId, conversationId),
      ...createDraftRevisionExactFilter(identity.createDraftRevision),
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
    ...conversationMutationOwnershipFilter(hotelId, conversationId),
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

const RESERVED_CONVERSATION_PATCH_FIELDS = new Set([
  "_id",
  "hotelId",
  "conversationId",
  "conversationWriterGuard",
  "cancellationExecution",
]);

function assertGenericConversationPatchIsSafe(patch: Partial<ConversationFlowState>): void {
  for (const field of RESERVED_CONVERSATION_PATCH_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(patch, field)) {
      throw new Error(`upsertConvState cannot mutate reserved field: ${field}`);
    }
  }
}

export async function upsertConvState(
  hotelId: string,
  conversationId: string,
  patch: Partial<ConversationFlowState>
) {
  assertGenericConversationPatchIsSafe(patch);
  const _id = key(hotelId, conversationId);
  const now = new Date().toISOString();
  const ownershipContext = getConversationOwnershipContext();
  if (ownershipContext && (
    ownershipContext.hotelId !== hotelId || ownershipContext.conversationId !== conversationId
  )) {
    throw new Error("owned mutation cannot target a second conversation");
  }
  if (ownershipContext && !isCanonicalWriterGuard(ownershipContext.guard)) {
    throw new Error("owned mutation requires a canonical writer guard");
  }

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
  const filter = ownershipContext
    ? {
        _id,
        hotelId,
        conversationId,
        ...writerGuardIdentityFilter(ownershipContext.guard),
      }
    : {
        _id,
        conversationWriterGuard: { $exists: false },
      };
  let res: any;
  try {
    res = await collection.updateOne(filter, update, ownershipContext ? undefined : { upsert: true });
  } catch (error) {
    const inspection = await inspectConversationOwnership(hotelId, conversationId);
    if (inspection.status === "owned") {
      throw new Error("conversation state mutation blocked by active ownership");
    }
    if (inspection.status === "malformed") {
      throw new Error(`conversation state mutation blocked: ${inspection.reason}`);
    }
    if (inspection.status === "uncertain") {
      throw new Error("conversation state mutation result is uncertain");
    }
    if (inspection.status === "error") {
      throw new Error("conversation state mutation verification failed");
    }
    throw error;
  }

  if (ownershipContext) {
    if (res?.matchedCount !== 1) {
      throw new Error("owned conversation state mutation lost ownership CAS");
    }
    console.log("BP-CS3", res);
    return res;
  }
  if (res?.matchedCount !== 1 && res?.upsertedCount !== 1) {
    const inspection = await inspectConversationOwnership(hotelId, conversationId);
    if (inspection.status === "owned") {
      throw new Error("conversation state mutation blocked by active ownership");
    }
    if (inspection.status === "malformed") {
      throw new Error(`conversation state mutation blocked: ${inspection.reason}`);
    }
    if (inspection.status === "uncertain") {
      throw new Error("conversation state mutation result is uncertain");
    }
    if (inspection.status === "error") {
      throw new Error("conversation state mutation verification failed");
    }
    throw new Error("conversation state mutation was not durably applied");
  }
  console.log("BP-CS3", res)
  return res;
}

/* =========================
 *        Utilities
 * ========================= */

/** Limpia completamente el estado de una conversación */
export async function clearConvState(hotelId: string, conversationId: string) {
  const _id = key(hotelId, conversationId);
  const res: any = await col().deleteOne({
    _id,
    ...conversationMutationOwnershipFilter(hotelId, conversationId),
  });
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
