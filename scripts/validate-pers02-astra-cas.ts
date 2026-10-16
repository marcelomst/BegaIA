// Path: scripts/validate-pers02-astra-cas.ts
import "dotenv/config";

import { createHash } from "node:crypto";

import { getAstraDB } from "../lib/astra/connection";
import {
  finalizeDeterministicCreateProposalIfCurrent,
  getConvState,
  publishDeterministicCreateProposalIfLatest,
  type ConversationFlowState,
  type DeterministicCreateProposalIdentity,
  type DeterministicCreateProposalPublishResult,
  type LastProposal,
  type ReservationSlots,
} from "../lib/db/convState";
import { isConfirmableReservationState } from "../lib/handlers/pipeline/reservationState";

type GateMode = "preflight" | "execute" | "cleanup-only";

type CliOptions = {
  mode: GateMode;
  runId: string;
  allowWrite: boolean;
  allowDelete: boolean;
  selfTest: boolean;
  help: boolean;
};

type SyntheticTarget = {
  label: string;
  hotelId: string;
  conversationId: string;
  id: string;
};

type GatePlan = {
  runId: string;
  marker: string;
  targets: SyntheticTarget[];
  byLabel: Record<string, SyntheticTarget>;
};

type TargetIdentity = {
  endpointFingerprint: string;
  keyspaceFingerprint: string;
  collection: "conv_state";
};

type ProposalArtifacts = {
  identity: DeterministicCreateProposalIdentity;
  proposal: LastProposal;
  finalText: string;
};

type FixtureCollection = {
  insertOne(document: ConversationFlowState): Promise<{ insertedId: unknown }>;
  deleteOne(filter: Record<string, unknown>): Promise<{ deletedCount: 0 | 1 }>;
};

type FixtureInfrastructure = {
  collection: FixtureCollection;
  read(target: SyntheticTarget, scenario: string): Promise<ConversationFlowState | null>;
};

type CleanupStatus =
  | "DELETED"
  | "ALREADY_ABSENT"
  | "IDENTITY_MISMATCH"
  | "DELETE_FAILED"
  | "NOT_DELETED_BY_GATE";

type CleanupOutcome = {
  label: string;
  id: string;
  status: CleanupStatus;
  errorCode?: string;
};

type SafeFailure = {
  code: string;
  operation: string;
  scenario: string;
  syntheticId?: string;
};

const COLLECTION = "conv_state" as const;
const PREFIX = "pers02-astra-gate";
const SYNTHETIC_GUEST_PREFIX = "PERS02 Synthetic Guest";
const SYNTHETIC_CHECK_IN = "2099-12-10";
const SYNTHETIC_CHECK_OUT = "2099-12-12";
const EXECUTE_GRANT = "AGPT_AUTHORIZED_PERS02_ASTRA_WRITE";
const CLEANUP_GRANT = "AGPT_AUTHORIZED_PERS02_ASTRA_CLEANUP";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class GateError extends Error {
  readonly code: string;
  readonly operation: string;
  readonly scenario: string;
  readonly syntheticId?: string;

  constructor(
    code: string,
    operation = "validation",
    scenario = "global",
    syntheticId?: string
  ) {
    super(code);
    this.name = "GateError";
    this.code = code;
    this.operation = operation;
    this.scenario = scenario;
    this.syntheticId = syntheticId;
  }
}

function fail(
  code: string,
  operation = "validation",
  scenario = "global",
  syntheticId?: string
): never {
  throw new GateError(code, operation, scenario, syntheticId);
}

function check(
  condition: unknown,
  code: string,
  operation = "validation",
  scenario = "global",
  syntheticId?: string
): asserts condition {
  if (!condition) fail(code, operation, scenario, syntheticId);
}

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function operationFailure(
  code: string,
  operation: string,
  scenario: string,
  syntheticId?: string
): GateError {
  return new GateError(code, operation, scenario, syntheticId);
}

function safeFailure(error: unknown): SafeFailure {
  if (error instanceof GateError) {
    return {
      code: error.code,
      operation: error.operation,
      scenario: error.scenario,
      ...(error.syntheticId ? { syntheticId: error.syntheticId } : {}),
    };
  }
  return {
    code: "UNEXPECTED_FAILURE",
    operation: "unknown",
    scenario: "global",
  };
}

function logFailure(error: unknown): void {
  console.error(JSON.stringify({ event: "GATE_FAILED", result: "FAIL", ...safeFailure(error) }));
}

function logEvent(event: string, details: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ event, ...details }));
}

function printHelp(): void {
  console.log([
    "PERS-02 Astra CAS validator",
    "",
    "Modes:",
    "  --mode=preflight     Read-only target and synthetic-ID validation (default).",
    "  --mode=execute       Real integration run; requires write and cleanup grants.",
    "  --mode=cleanup-only  Exact recovery cleanup; requires cleanup grant.",
    "  --self-test          Local infrastructure safety checks; never connects to Astra.",
    "",
    "Required:",
    "  --run-id=<uuid>",
    "  PERS02_EXPECTED_ENDPOINT_SHA256=<12 hex chars>",
    "  PERS02_EXPECTED_KEYSPACE_SHA256=<12 hex chars>",
    "",
    "Execute additionally requires:",
    "  --allow-write --allow-delete",
    `  PERS02_ASTRA_GATE_EXECUTE=${EXECUTE_GRANT}`,
    `  PERS02_ASTRA_GATE_CLEANUP=${CLEANUP_GRANT}`,
    "",
    "Cleanup-only additionally requires:",
    "  --allow-delete",
    `  PERS02_ASTRA_GATE_CLEANUP=${CLEANUP_GRANT}`,
  ].join("\n"));
}

function parseCli(argv: string[]): CliOptions {
  let mode: GateMode = "preflight";
  let runId = "";
  let allowWrite = false;
  let allowDelete = false;
  let selfTest = false;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }
    if (arg === "--allow-write") {
      allowWrite = true;
      continue;
    }
    if (arg === "--allow-delete") {
      allowDelete = true;
      continue;
    }
    if (arg === "--self-test") {
      selfTest = true;
      continue;
    }
    if (arg.startsWith("--mode=")) {
      mode = arg.slice("--mode=".length) as GateMode;
      continue;
    }
    if (arg === "--mode") {
      mode = String(argv[index + 1] || "") as GateMode;
      index += 1;
      continue;
    }
    if (arg.startsWith("--run-id=")) {
      runId = arg.slice("--run-id=".length);
      continue;
    }
    if (arg === "--run-id") {
      runId = String(argv[index + 1] || "");
      index += 1;
      continue;
    }
    fail("UNKNOWN_ARGUMENT");
  }

  check(
    mode === "preflight" || mode === "execute" || mode === "cleanup-only",
    "invalid_mode"
  );
  if (!help && !selfTest) {
    check(UUID_RE.test(runId), "run_id_must_be_uuid");
  }
  check(!(selfTest && (allowWrite || allowDelete)), "self_test_rejects_write_flags");
  check(!(selfTest && mode !== "preflight"), "self_test_requires_preflight_mode");
  return { mode, runId: runId.toLowerCase(), allowWrite, allowDelete, selfTest, help };
}

function requireExecutionGuards(cli: CliOptions): void {
  check(cli.allowWrite, "execute_requires_allow_write_flag");
  check(cli.allowDelete, "execute_requires_allow_delete_flag");
  check(
    process.env.PERS02_ASTRA_GATE_EXECUTE === EXECUTE_GRANT,
    "execute_write_grant_missing"
  );
  check(
    process.env.PERS02_ASTRA_GATE_CLEANUP === CLEANUP_GRANT,
    "execute_cleanup_grant_missing"
  );
}

function requireCleanupGuards(cli: CliOptions): void {
  check(cli.allowDelete, "cleanup_requires_allow_delete_flag");
  check(
    process.env.PERS02_ASTRA_GATE_CLEANUP === CLEANUP_GRANT,
    "cleanup_grant_missing"
  );
}

function verifyTargetValues(values: {
  rawUrl?: string;
  keyspace?: string;
  token?: string;
  expectedEndpoint?: string;
  expectedKeyspace?: string;
}): TargetIdentity {
  const rawUrl = values.rawUrl?.trim();
  const keyspace = values.keyspace?.trim();
  const token = values.token?.trim();
  const expectedEndpoint = values.expectedEndpoint?.trim().toLowerCase();
  const expectedKeyspace = values.expectedKeyspace?.trim().toLowerCase();

  check(rawUrl, "missing_ASTRA_DB_URL");
  check(keyspace, "missing_ASTRA_DB_KEYSPACE");
  check(token, "missing_ASTRA_DB_APPLICATION_TOKEN");
  check(/^[0-9a-f]{12}$/.test(expectedEndpoint || ""), "invalid_expected_endpoint_fingerprint");
  check(/^[0-9a-f]{12}$/.test(expectedKeyspace || ""), "invalid_expected_keyspace_fingerprint");

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    fail("invalid_ASTRA_DB_URL");
  }
  check(url.protocol === "https:", "astra_endpoint_must_use_https");
  check(url.hostname.endsWith(".apps.astra.datastax.com"), "unexpected_astra_endpoint_host");
  check(url.pathname === "/", "astra_endpoint_path_must_be_root");
  check(!url.username && !url.password && !url.search && !url.hash, "astra_endpoint_contains_forbidden_components");

  const endpointFingerprint = fingerprint(url.origin);
  const keyspaceFingerprint = fingerprint(keyspace);
  check(endpointFingerprint === expectedEndpoint, "endpoint_fingerprint_mismatch");
  check(keyspaceFingerprint === expectedKeyspace, "keyspace_fingerprint_mismatch");

  return { endpointFingerprint, keyspaceFingerprint, collection: COLLECTION };
}

function verifyTargetConfiguration(): TargetIdentity {
  return verifyTargetValues({
    rawUrl: process.env.ASTRA_DB_URL,
    keyspace: process.env.ASTRA_DB_KEYSPACE,
    token: process.env.ASTRA_DB_APPLICATION_TOKEN,
    expectedEndpoint: process.env.PERS02_EXPECTED_ENDPOINT_SHA256,
    expectedKeyspace: process.env.PERS02_EXPECTED_KEYSPACE_SHA256,
  });
}

function makeTarget(label: string, hotelId: string, conversationId: string): SyntheticTarget {
  return { label, hotelId, conversationId, id: `${hotelId}:${conversationId}` };
}

function buildPlan(runId: string): GatePlan {
  const hotelA = `${PREFIX}-h1-${runId}`;
  const hotelB = `${PREFIX}-h2-${runId}`;
  const targets = [
    makeTarget("main", hotelA, `${PREFIX}-main-${runId}`),
    makeTarget("negative", hotelA, `${PREFIX}-negative-${runId}`),
    makeTarget("error", hotelA, `${PREFIX}-error-${runId}`),
    makeTarget("race", hotelA, `${PREFIX}-race-${runId}`),
    makeTarget("isolation-target", hotelA, `${PREFIX}-isolation-${runId}`),
    makeTarget("isolation-hotel-control", hotelB, `${PREFIX}-isolation-${runId}`),
    makeTarget("isolation-conversation-control", hotelA, `${PREFIX}-isolation-control-${runId}`),
  ];
  const byLabel = Object.fromEntries(targets.map((target) => [target.label, target]));
  check(new Set(targets.map((target) => target.id)).size === targets.length, "synthetic_id_collision");
  check(targets.every((target) => !target.hotelId.includes("hotel999")), "forbidden_hotel999_target");
  return {
    runId,
    marker: `PERS02_ASTRA_GATE:${runId}`,
    targets,
    byLabel,
  };
}

function slotsFor(target: SyntheticTarget): ReservationSlots {
  return {
    guestName: `${SYNTHETIC_GUEST_PREFIX} ${target.label}`,
    roomType: "double",
    numGuests: 2,
    checkIn: SYNTHETIC_CHECK_IN,
    checkOut: SYNTHETIC_CHECK_OUT,
    locale: "es",
  };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableValue(nested)])
    );
  }
  return value;
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

function requireDocument(
  document: ConversationFlowState | null,
  target: SyntheticTarget,
  context: string
): ConversationFlowState {
  check(document, `${context}:document_missing:${target.label}`);
  check(document._id === target.id, `${context}:id_mismatch:${target.label}`);
  check(document.hotelId === target.hotelId, `${context}:hotel_mismatch:${target.label}`);
  check(document.conversationId === target.conversationId, `${context}:conversation_mismatch:${target.label}`);
  return document;
}

function requireOwnedDocument(
  document: ConversationFlowState,
  target: SyntheticTarget,
  plan: GatePlan
): void {
  requireDocument(document, target, "cleanup_identity");
  const ownership = fixtureOwnershipFilter(plan, target);
  for (const [path, expected] of Object.entries(ownership)) {
    check(
      sameValue(valueAtPath(document as unknown as Record<string, unknown>, path), expected),
      `cleanup_identity_field_mismatch:${target.label}:${path}`
    );
  }
}

function fixtureOwnershipFilter(plan: GatePlan, target: SyntheticTarget): Record<string, unknown> {
  const slots = slotsFor(target);
  return {
    _id: target.id,
    hotelId: target.hotelId,
    conversationId: target.conversationId,
    lastEventPromptKey: plan.marker,
    lastCategory: "reservation",
    activeFlow: "reservation",
    "reservationSlots.guestName": slots.guestName,
    "reservationSlots.checkIn": slots.checkIn,
    "reservationSlots.checkOut": slots.checkOut,
    "reservationSlots.roomType": slots.roomType,
    "reservationSlots.numGuests": slots.numGuests,
    "reservationSlots.locale": slots.locale,
  };
}

function fixtureCollection(): FixtureCollection {
  return getAstraDB().collection<ConversationFlowState>(COLLECTION) as unknown as FixtureCollection;
}

async function readTarget(target: SyntheticTarget, scenario: string): Promise<ConversationFlowState | null> {
  try {
    return await getConvState(target.hotelId, target.conversationId);
  } catch {
    throw operationFailure("READ_FAILED", "read", scenario, target.id);
  }
}

function realFixtureInfrastructure(): FixtureInfrastructure {
  return {
    collection: fixtureCollection(),
    read: readTarget,
  };
}

async function runReadOnlyPreflight(
  plan: GatePlan,
  target: TargetIdentity,
  read: FixtureInfrastructure["read"] = readTarget
): Promise<void> {
  const collisions: string[] = [];
  for (const syntheticTarget of plan.targets) {
    const existing = await read(syntheticTarget, `preflight:${syntheticTarget.label}`);
    if (existing) collisions.push(syntheticTarget.label);
  }
  check(collisions.length === 0, `synthetic_ids_already_exist:${collisions.join(",")}`);
  logEvent("PREFLIGHT_PASS", {
    runId: plan.runId,
    endpointFingerprint: target.endpointFingerprint,
    keyspaceFingerprint: target.keyspaceFingerprint,
    collection: target.collection,
    plannedDocuments: plan.targets.length,
    writes: 0,
    deletes: 0,
  });
}

function buildSeedDocument(plan: GatePlan, target: SyntheticTarget): ConversationFlowState {
  const now = new Date().toISOString();
  return {
    _id: target.id,
    hotelId: target.hotelId,
    conversationId: target.conversationId,
    reservationSlots: slotsFor(target),
    activeFlow: "reservation",
    desiredAction: "create",
    salesStage: "qualify",
    conversationStage: "reservation_collecting",
    activeReservationContext: {
      kind: "draft",
      phase: "collecting",
      updatedAt: now,
    },
    lastCategory: "reservation",
    lastEventPromptKey: plan.marker,
    updatedBy: "pers02-astra-gate",
    updatedAt: now,
  };
}

async function seedTarget(
  plan: GatePlan,
  target: SyntheticTarget,
  infrastructure: FixtureInfrastructure = realFixtureInfrastructure(),
  onCreated?: (target: SyntheticTarget) => void
): Promise<ConversationFlowState> {
  const seed = buildSeedDocument(plan, target);
  let insertedId: unknown;
  try {
    const result = await infrastructure.collection.insertOne(seed);
    insertedId = result.insertedId;
  } catch {
    throw operationFailure("CREATE_ONLY_INSERT_FAILED", "insertOne", `seed:${target.label}`, target.id);
  }
  check(insertedId === target.id, `seed_inserted_id_mismatch:${target.label}`, "insertOne", `seed:${target.label}`, target.id);
  onCreated?.(target);
  const seeded = requireDocument(
    await infrastructure.read(target, `seed_verify:${target.label}`),
    target,
    "seed"
  );
  requireOwnedDocument(seeded, target, plan);
  check(!seeded.lastProposal, `seed_unexpected_proposal:${target.label}`);
  return seeded;
}

function timestampAfter(document: ConversationFlowState, seconds: number): string {
  const base = Date.parse(document.updatedAt);
  check(Number.isFinite(base), "seed_updated_at_invalid");
  return new Date(base + seconds * 1_000).toISOString();
}

function makeProposalArtifacts(
  target: SyntheticTarget,
  tag: string,
  availabilityStatus: "available" | "unavailable" | "error",
  toolCallAt: string
): ProposalArtifacts {
  const snapshot = slotsFor(target) as Required<ReservationSlots>;
  const available = availabilityStatus === "available";
  const outputSummary = available
    ? "available:true"
    : availabilityStatus === "unavailable"
      ? "available:false"
      : "error";
  const sourceText = `PERS02 synthetic ${tag} ${availabilityStatus}`;
  const finalText = `PERS02 synthetic ${tag} ${availabilityStatus} finalized`;
  const input = {
    hotelId: target.hotelId,
    roomType: snapshot.roomType,
    numGuests: Number(snapshot.numGuests),
    checkIn: snapshot.checkIn,
    checkOut: snapshot.checkOut,
  };
  const options = availabilityStatus === "error"
    ? undefined
    : [{
        roomType: available ? "double" : "triple",
        pricePerNight: available ? (tag === "B" ? 140 : 120) : 95,
        currency: available ? "USD" : "EUR",
        policies: `synthetic-${tag.toLowerCase()}-policy`,
        availability: available ? 2 : 1,
      }];
  const identity: DeterministicCreateProposalIdentity = {
    sourceText,
    available,
    availabilityStatus,
    toolCallAt,
    outputSummary,
    input,
    snapshot: {
      guestName: snapshot.guestName,
      roomType: snapshot.roomType,
      numGuests: snapshot.numGuests,
      checkIn: snapshot.checkIn,
      checkOut: snapshot.checkOut,
      locale: snapshot.locale,
    },
  };
  const proposal: LastProposal = {
    text: sourceText,
    available,
    availabilityStatus,
    snapshot: identity.snapshot,
    options,
    suggestedRoomType: options?.[0]?.roomType,
    suggestedPricePerNight: options?.[0]?.pricePerNight,
    toolCall: {
      name: "checkAvailability",
      input,
      outputSummary,
      at: toolCallAt,
    },
  };
  return { identity, proposal, finalText };
}

function requireResult(
  result: DeterministicCreateProposalPublishResult,
  expected: { matched: boolean; modified: boolean },
  context: string
): void {
  check(result.matched === expected.matched, `${context}:matched`);
  check(result.modified === expected.modified, `${context}:modified`);
  check(result.matchedCount === (expected.matched ? 1 : 0), `${context}:matched_count`);
  check(result.modifiedCount === (expected.modified ? 1 : 0), `${context}:modified_count`);
}

function requireRichProposal(
  document: ConversationFlowState,
  expected: LastProposal,
  expectedText: string,
  context: string
): void {
  check(document.lastProposal, `${context}:proposal_missing`);
  check(
    sameValue(document.lastProposal, { ...expected, text: expectedText }),
    `${context}:proposal_metadata_changed`
  );
  check(sameValue(document.lastProposal.options, expected.options), `${context}:options_changed`);
  check(sameValue(document.lastProposal.snapshot, expected.snapshot), `${context}:snapshot_changed`);
  check(sameValue(document.lastProposal.toolCall, expected.toolCall), `${context}:tool_call_changed`);
}

async function publish(
  target: SyntheticTarget,
  artifacts: ProposalArtifacts
): Promise<DeterministicCreateProposalPublishResult> {
  try {
    return await publishDeterministicCreateProposalIfLatest(
      target.hotelId,
      target.conversationId,
      artifacts.identity,
      artifacts.proposal
    );
  } catch {
    throw operationFailure("PUBLICATION_FAILED", "publish", target.label, target.id);
  }
}

async function finalize(
  target: SyntheticTarget,
  artifacts: ProposalArtifacts
): Promise<DeterministicCreateProposalPublishResult> {
  try {
    return await finalizeDeterministicCreateProposalIfCurrent(
      target.hotelId,
      target.conversationId,
      artifacts.identity,
      artifacts.finalText
    );
  } catch {
    throw operationFailure("FINALIZATION_FAILED", "finalize", target.label, target.id);
  }
}

async function exerciseMainSequence(plan: GatePlan, matrix: string[]): Promise<void> {
  const target = plan.byLabel.main;
  const seed = requireDocument(await readTarget(target, "main_seed"), target, "main_seed");
  const proposalA = makeProposalArtifacts(target, "A", "available", timestampAfter(seed, 10));
  const proposalB = makeProposalArtifacts(target, "B", "available", timestampAfter(seed, 20));

  requireResult(await publish(target, proposalA), { matched: true, modified: true }, "publish_A");
  matrix.push("positive_rich_publication");
  requireResult(await publish(target, proposalA), { matched: true, modified: false }, "publish_A_idempotent");
  matrix.push("publication_idempotence");

  const beforeIdentityMismatch = requireDocument(
    await readTarget(target, "before_identity_mismatch"),
    target,
    "before_identity_mismatch"
  );
  const wrongIdentity: ProposalArtifacts = {
    ...proposalA,
    identity: {
      ...proposalA.identity,
      input: { ...proposalA.identity.input, hotelId: `${PREFIX}-wrong-${plan.runId}` },
    },
  };
  requireResult(await publish(target, wrongIdentity), { matched: false, modified: false }, "identity_mismatch");
  const afterIdentityMismatch = requireDocument(
    await readTarget(target, "after_identity_mismatch"),
    target,
    "after_identity_mismatch"
  );
  check(sameValue(beforeIdentityMismatch, afterIdentityMismatch), "identity_mismatch_modified_document");
  matrix.push("identity_mismatch_noop");

  const wrongSnapshot: ProposalArtifacts = {
    ...proposalA,
    identity: {
      ...proposalA.identity,
      snapshot: { ...proposalA.identity.snapshot, guestName: "PERS02 Synthetic Mismatch" },
    },
  };
  requireResult(await finalize(target, wrongSnapshot), { matched: false, modified: false }, "snapshot_mismatch");
  matrix.push("snapshot_mismatch_noop");

  requireResult(await finalize(target, proposalA), { matched: true, modified: true }, "finalize_A");
  let current = requireDocument(await readTarget(target, "finalized_A"), target, "finalized_A");
  requireRichProposal(current, proposalA.proposal, proposalA.finalText, "finalized_A");
  check(current.salesStage === "quote", "finalized_A_sales_stage");
  check(current.conversationStage === "reservation_quoted", "finalized_A_conversation_stage");
  matrix.push("conditional_finalization");

  requireResult(await finalize(target, proposalA), { matched: true, modified: false }, "finalize_A_idempotent");
  matrix.push("finalization_idempotence");

  requireResult(await publish(target, proposalB), { matched: true, modified: true }, "publish_B_after_A");
  matrix.push("A_then_B_precedence");
  requireResult(await publish(target, proposalA), { matched: false, modified: false }, "late_publish_A");
  matrix.push("late_A_publication_noop");
  requireResult(await finalize(target, proposalA), { matched: false, modified: false }, "late_finalize_A");
  matrix.push("late_A_finalization_noop");
  requireResult(await finalize(target, proposalB), { matched: true, modified: true }, "finalize_B");

  current = requireDocument(await readTarget(target, "final_B"), target, "final_B");
  requireRichProposal(current, proposalB.proposal, proposalB.finalText, "final_B");
  check(sameValue(current.reservationSlots, proposalB.identity.snapshot), "final_B_snapshot_not_canonical");
  matrix.push("rich_metadata_preserved");
  matrix.push("final_document_verified");
}

async function exerciseNonConfirmable(
  plan: GatePlan,
  label: "negative" | "error",
  status: "unavailable" | "error",
  matrix: string[]
): Promise<void> {
  const target = plan.byLabel[label];
  const seed = requireDocument(await readTarget(target, `${label}_seed`), target, `${label}_seed`);
  const positive = makeProposalArtifacts(target, "A", "available", timestampAfter(seed, 10));
  const replacement = makeProposalArtifacts(target, "B", status, timestampAfter(seed, 20));

  requireResult(await publish(target, positive), { matched: true, modified: true }, `${label}_positive_publish`);
  requireResult(await finalize(target, positive), { matched: true, modified: true }, `${label}_positive_finalize`);
  requireResult(await publish(target, replacement), { matched: true, modified: true }, `${label}_replacement_publish`);
  requireResult(await finalize(target, replacement), { matched: true, modified: true }, `${label}_replacement_finalize`);

  const current = requireDocument(await readTarget(target, `${label}_final`), target, `${label}_final`);
  requireRichProposal(current, replacement.proposal, replacement.finalText, `${label}_final`);
  check(current.lastProposal?.available === false, `${label}_became_available`);
  check(current.lastProposal?.availabilityStatus === status, `${label}_status_changed`);
  check(current.salesStage === "followup", `${label}_sales_stage`);
  check(current.conversationStage === "reservation_collecting", `${label}_conversation_stage`);
  check(current.desiredAction === "notify_reception", `${label}_desired_action`);
  const confirmation = isConfirmableReservationState(current);
  check(!confirmation.confirmable, `${label}_is_confirmable`);
  matrix.push(status === "unavailable" ? "negative_replaces_positive_nonconfirmable" : "error_replaces_positive_nonconfirmable");
}

async function exerciseIsolation(plan: GatePlan, matrix: string[]): Promise<void> {
  const target = plan.byLabel["isolation-target"];
  const hotelControl = plan.byLabel["isolation-hotel-control"];
  const conversationControl = plan.byLabel["isolation-conversation-control"];
  const targetSeed = requireDocument(await readTarget(target, "isolation_seed"), target, "isolation_seed");
  const hotelBefore = requireDocument(
    await readTarget(hotelControl, "hotel_control_before"),
    hotelControl,
    "hotel_control_before"
  );
  const conversationBefore = requireDocument(
    await readTarget(conversationControl, "conversation_control_before"),
    conversationControl,
    "conversation_control_before"
  );
  const proposal = makeProposalArtifacts(target, "ISO", "available", timestampAfter(targetSeed, 10));

  requireResult(await publish(target, proposal), { matched: true, modified: true }, "isolation_publish");
  requireResult(await finalize(target, proposal), { matched: true, modified: true }, "isolation_finalize");

  const hotelAfter = requireDocument(
    await readTarget(hotelControl, "hotel_control_after"),
    hotelControl,
    "hotel_control_after"
  );
  const conversationAfter = requireDocument(
    await readTarget(conversationControl, "conversation_control_after"),
    conversationControl,
    "conversation_control_after"
  );
  check(sameValue(hotelBefore, hotelAfter), "hotel_isolation_failed");
  check(sameValue(conversationBefore, conversationAfter), "conversation_isolation_failed");
  matrix.push("hotel_and_conversation_isolation");
}

async function exerciseConcurrentRace(plan: GatePlan, matrix: string[]): Promise<void> {
  const target = plan.byLabel.race;
  const seed = requireDocument(await readTarget(target, "race_seed"), target, "race_seed");
  const proposalA = makeProposalArtifacts(target, "A", "available", timestampAfter(seed, 10));
  const proposalB = makeProposalArtifacts(target, "B", "available", timestampAfter(seed, 20));

  const settled = await Promise.allSettled([publish(target, proposalA), publish(target, proposalB)]);
  check(settled.every((entry) => entry.status === "fulfilled"), "concurrent_publish_rejected");
  const bResult = settled[1];
  check(bResult.status === "fulfilled" && bResult.value.matched, "concurrent_B_did_not_match");

  let current = requireDocument(await readTarget(target, "race_after_publish"), target, "race_after_publish");
  requireRichProposal(current, proposalB.proposal, proposalB.proposal.text, "race_B_wins");
  requireResult(await publish(target, proposalA), { matched: false, modified: false }, "race_late_A_publish");
  requireResult(await finalize(target, proposalA), { matched: false, modified: false }, "race_late_A_finalize");
  requireResult(await finalize(target, proposalB), { matched: true, modified: true }, "race_finalize_B");
  current = requireDocument(await readTarget(target, "race_final"), target, "race_final");
  requireRichProposal(current, proposalB.proposal, proposalB.finalText, "race_final_B");
  matrix.push("concurrent_A_B_final_state_B");
}

async function cleanupPlan(
  plan: GatePlan,
  targets: readonly SyntheticTarget[],
  infrastructure: FixtureInfrastructure,
  expectedCreated: ReadonlySet<string> | null
): Promise<CleanupOutcome[]> {
  const outcomes: CleanupOutcome[] = [];
  for (const target of targets) {
    let current: ConversationFlowState | null;
    try {
      current = await infrastructure.read(target, `cleanup_precheck:${target.label}`);
    } catch {
      outcomes.push({ label: target.label, id: target.id, status: "DELETE_FAILED", errorCode: "CLEANUP_READ_FAILED" });
      continue;
    }
    if (!current) {
      outcomes.push({
        label: target.label,
        id: target.id,
        status: "ALREADY_ABSENT",
        ...(expectedCreated?.has(target.id) ? { errorCode: "CREATED_DOCUMENT_ALREADY_ABSENT" } : {}),
      });
      continue;
    }
    try {
      requireOwnedDocument(current, target, plan);
    } catch {
      outcomes.push({ label: target.label, id: target.id, status: "IDENTITY_MISMATCH", errorCode: "OWNERSHIP_FILTER_MISMATCH" });
      continue;
    }

    let deletedCount: 0 | 1;
    try {
      const result = await infrastructure.collection.deleteOne(fixtureOwnershipFilter(plan, target));
      deletedCount = result.deletedCount;
    } catch {
      outcomes.push({ label: target.label, id: target.id, status: "DELETE_FAILED", errorCode: "ATOMIC_DELETE_FAILED" });
      continue;
    }
    let remaining: ConversationFlowState | null;
    try {
      remaining = await infrastructure.read(target, `cleanup_verify:${target.label}`);
    } catch {
      outcomes.push({ label: target.label, id: target.id, status: "DELETE_FAILED", errorCode: "CLEANUP_VERIFY_READ_FAILED" });
      continue;
    }

    if (deletedCount === 1) {
      if (remaining) {
        outcomes.push({ label: target.label, id: target.id, status: "DELETE_FAILED", errorCode: "CLEANUP_RESIDUE" });
        continue;
      }
      outcomes.push({ label: target.label, id: target.id, status: "DELETED" });
      continue;
    }

    if (!remaining) {
      outcomes.push({
        label: target.label,
        id: target.id,
        status: "NOT_DELETED_BY_GATE",
        errorCode: "CONCURRENT_ABSENCE_AFTER_ZERO_DELETE",
      });
      continue;
    }
    try {
      requireOwnedDocument(remaining, target, plan);
      outcomes.push({
        label: target.label,
        id: target.id,
        status: "DELETE_FAILED",
        errorCode: "OWNED_DOCUMENT_NOT_DELETED",
      });
    } catch {
      outcomes.push({
        label: target.label,
        id: target.id,
        status: "IDENTITY_MISMATCH",
        errorCode: "POST_DELETE_IDENTITY_MISMATCH",
      });
    }
  }

  for (const outcome of outcomes) {
    logEvent("CLEANUP_RESULT", outcome);
  }
  const failed = outcomes.filter(
    (outcome) => outcome.errorCode || (outcome.status !== "DELETED" && outcome.status !== "ALREADY_ABSENT")
  );
  check(failed.length === 0, "CLEANUP_INCOMPLETE", "deleteOne", "cleanup");
  return outcomes;
}

async function executeGate(
  plan: GatePlan,
  infrastructure: FixtureInfrastructure = realFixtureInfrastructure(),
  exerciseScenarios: (matrix: string[]) => Promise<void> = async (matrix) => {
    await exerciseMainSequence(plan, matrix);
    await exerciseNonConfirmable(plan, "negative", "unavailable", matrix);
    await exerciseNonConfirmable(plan, "error", "error", matrix);
    await exerciseIsolation(plan, matrix);
    await exerciseConcurrentRace(plan, matrix);
  }
): Promise<void> {
  const matrix: string[] = [];
  const createdTargetIds = new Set<string>();
  let primaryFailure: unknown;
  let cleanupFailure: unknown;

  try {
    for (const target of plan.targets) {
      await seedTarget(plan, target, infrastructure, (created) => createdTargetIds.add(created.id));
    }
    await exerciseScenarios(matrix);
  } catch (error) {
    primaryFailure = error;
  } finally {
    try {
      const createdTargets = plan.targets.filter((target) => createdTargetIds.has(target.id));
      await cleanupPlan(plan, createdTargets, infrastructure, createdTargetIds);
      matrix.push("cleanup_and_absence_verified");
    } catch (error) {
      cleanupFailure = error;
    }
  }

  if (primaryFailure) {
    if (cleanupFailure) logEvent("CLEANUP_FAILURE", { result: "FAIL", ...safeFailure(cleanupFailure) });
    throw primaryFailure;
  }
  if (cleanupFailure) throw cleanupFailure;

  const requiredMatrix = [
    "positive_rich_publication",
    "publication_idempotence",
    "identity_mismatch_noop",
    "snapshot_mismatch_noop",
    "conditional_finalization",
    "finalization_idempotence",
    "A_then_B_precedence",
    "late_A_publication_noop",
    "late_A_finalization_noop",
    "rich_metadata_preserved",
    "negative_replaces_positive_nonconfirmable",
    "error_replaces_positive_nonconfirmable",
    "hotel_and_conversation_isolation",
    "concurrent_A_B_final_state_B",
    "final_document_verified",
    "cleanup_and_absence_verified",
  ];
  for (const scenario of requiredMatrix) {
    check(matrix.includes(scenario), `matrix_scenario_missing:${scenario}`);
  }
  logEvent("EXECUTION_PASS", { runId: plan.runId, scenarios: requiredMatrix.length, cleanup: "verified" });
}

async function runCleanupOnly(
  plan: GatePlan,
  infrastructure: FixtureInfrastructure = realFixtureInfrastructure()
): Promise<void> {
  const outcomes = await cleanupPlan(plan, plan.targets, infrastructure, null);
  logEvent("CLEANUP_ONLY_PASS", {
    runId: plan.runId,
    deleted: outcomes.filter((outcome) => outcome.status === "DELETED").length,
    alreadyAbsent: outcomes.filter((outcome) => outcome.status === "ALREADY_ABSENT").length,
    residues: 0,
  });
}

type LocalFakeInfrastructure = {
  infrastructure: FixtureInfrastructure;
  documents: Map<string, ConversationFlowState>;
  insertCalls: ConversationFlowState[];
  deleteFilters: Record<string, unknown>[];
  readCount: () => number;
};

function cloneDocument<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function valueAtPath(document: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, document);
}

function matchesExactFilter(document: ConversationFlowState, filter: Record<string, unknown>): boolean {
  return Object.entries(filter).every(([path, expected]) =>
    sameValue(valueAtPath(document as unknown as Record<string, unknown>, path), expected)
  );
}

function makeLocalFakeInfrastructure(options?: {
  initial?: ConversationFlowState[];
  failInsertIds?: ReadonlySet<string>;
  deleteMode?: "normal" | "zero-owned" | "zero-absent" | "zero-replaced";
}): LocalFakeInfrastructure {
  const documents = new Map(
    (options?.initial || []).map((document) => [document._id, cloneDocument(document)])
  );
  const insertCalls: ConversationFlowState[] = [];
  const deleteFilters: Record<string, unknown>[] = [];
  let reads = 0;
  const collection: FixtureCollection = {
    async insertOne(document) {
      insertCalls.push(cloneDocument(document));
      if (options?.failInsertIds?.has(document._id)) {
        throw new Error("sdk raw insert failure token=https://secret.invalid Authorization: Bearer secret");
      }
      if (documents.has(document._id)) {
        throw new Error("sdk raw collision token=https://secret.invalid Authorization: Bearer secret");
      }
      documents.set(document._id, cloneDocument(document));
      return { insertedId: document._id };
    },
    async deleteOne(filter) {
      deleteFilters.push(cloneDocument(filter));
      const id = String(filter._id || "");
      const current = documents.get(id);
      if (!current || !matchesExactFilter(current, filter)) {
        return { deletedCount: 0 };
      }
      if (options?.deleteMode === "zero-owned") return { deletedCount: 0 };
      if (options?.deleteMode === "zero-absent") {
        documents.delete(id);
        return { deletedCount: 0 };
      }
      if (options?.deleteMode === "zero-replaced") {
        documents.set(id, {
          ...cloneDocument(current),
          lastEventPromptKey: "foreign-concurrent-owner",
        });
        return { deletedCount: 0 };
      }
      documents.delete(id);
      return { deletedCount: 1 };
    },
  };
  return {
    infrastructure: {
      collection,
      async read(target) {
        reads += 1;
        const document = documents.get(target.id);
        return document ? cloneDocument(document) : null;
      },
    },
    documents,
    insertCalls,
    deleteFilters,
    readCount: () => reads,
  };
}

async function expectLocalFailure(
  action: () => unknown | Promise<unknown>,
  expectedCode: string,
  scenario: string
): Promise<void> {
  let caught: unknown;
  try {
    await action();
  } catch (error) {
    caught = error;
  }
  check(caught instanceof GateError, `${scenario}:expected_gate_error`);
  check(caught.code === expectedCode, `${scenario}:unexpected_error_code`);
}

async function captureCleanupFailure(
  action: () => Promise<unknown>,
  scenario: string
): Promise<string> {
  let output = "";
  const originalConsoleLog = console.log;
  try {
    console.log = (...args: unknown[]) => {
      output += `${args.map((arg) => String(arg)).join(" ")}\n`;
    };
    await expectLocalFailure(action, "CLEANUP_INCOMPLETE", scenario);
  } finally {
    console.log = originalConsoleLog;
  }
  return output;
}

async function runLocalSafetyTests(): Promise<void> {
  const results: string[] = [];
  const runId = "11111111-1111-4111-8111-111111111111";
  const plan = buildPlan(runId);
  const target = plan.byLabel.main;
  const seed = buildSeedDocument(plan, target);

  const collision = makeLocalFakeInfrastructure({
    initial: [{ ...seed, lastCategory: "foreign-sentinel" }],
  });
  const collisionBefore = cloneDocument(collision.documents.get(target.id));
  await expectLocalFailure(
    () => seedTarget(plan, target, collision.infrastructure),
    "CREATE_ONLY_INSERT_FAILED",
    "create_only_collision"
  );
  check(sameValue(collisionBefore, collision.documents.get(target.id)), "collision_overwrote_existing_document");
  check(collision.insertCalls.length === 1, "collision_insert_call_count");
  results.push("create_only_collision_rejected_document_intact");

  const successfulCleanup = makeLocalFakeInfrastructure();
  const created = new Set<string>();
  await seedTarget(plan, target, successfulCleanup.infrastructure, (inserted) => created.add(inserted.id));
  const readsBeforeCleanup = successfulCleanup.readCount();
  const outcomes = await cleanupPlan(plan, [target], successfulCleanup.infrastructure, created);
  const mainOutcome = outcomes.find((outcome) => outcome.id === target.id);
  check(mainOutcome?.status === "DELETED", "local_cleanup_not_deleted");
  check(successfulCleanup.deleteFilters.length === 1, "local_cleanup_delete_call_count");
  check(
    sameValue(successfulCleanup.deleteFilters[0], fixtureOwnershipFilter(plan, target)),
    "local_cleanup_filter_incomplete"
  );
  check(successfulCleanup.readCount() === readsBeforeCleanup + 2, "local_cleanup_missing_post_read");
  check(!successfulCleanup.documents.has(target.id), "local_cleanup_residue");
  results.push("conditional_delete_filter_and_post_read");

  const plannedButUncreated = makeLocalFakeInfrastructure({ initial: [seed] });
  const skippedOutcomes = await cleanupPlan(
    plan,
    [],
    plannedButUncreated.infrastructure,
    new Set<string>()
  );
  check(skippedOutcomes.length === 0, "normal_cleanup_reported_uncreated_target");
  check(plannedButUncreated.readCount() === 0, "normal_cleanup_read_uncreated_target");
  check(plannedButUncreated.deleteFilters.length === 0, "normal_cleanup_deleted_uncreated_target");
  check(plannedButUncreated.documents.has(target.id), "normal_cleanup_removed_uncreated_target");
  results.push("normal_cleanup_created_targets_only");

  const partialSeedFailureTarget = plan.targets[1];
  const partialSeed = makeLocalFakeInfrastructure({
    failInsertIds: new Set([partialSeedFailureTarget.id]),
  });
  await expectLocalFailure(
    () => executeGate(
      plan,
      partialSeed.infrastructure,
      async () => fail("LOCAL_SCENARIOS_MUST_NOT_RUN")
    ),
    "CREATE_ONLY_INSERT_FAILED",
    "partial_seed_cleanup"
  );
  check(partialSeed.insertCalls.length === 2, "partial_seed_unexpected_insert_count");
  check(partialSeed.deleteFilters.length === 1, "partial_seed_cleanup_scope");
  check(partialSeed.deleteFilters[0]._id === target.id, "partial_seed_cleanup_wrong_target");
  check(partialSeed.documents.size === 0, "partial_seed_cleanup_residue");
  results.push("partial_seed_cleans_confirmed_targets_only");

  const publicationFailure = makeLocalFakeInfrastructure();
  await expectLocalFailure(
    () => executeGate(
      plan,
      publicationFailure.infrastructure,
      async () => {
        throw operationFailure("PUBLICATION_FAILED", "publish", "local_publication_failure");
      }
    ),
    "PUBLICATION_FAILED",
    "publication_failure_cleanup"
  );
  check(publicationFailure.insertCalls.length === plan.targets.length, "publication_failure_seed_count");
  check(publicationFailure.deleteFilters.length === plan.targets.length, "publication_failure_cleanup_count");
  check(publicationFailure.documents.size === 0, "publication_failure_cleanup_residue");
  results.push("publication_failure_cleans_created_targets");

  const wrongIdentityDocument = {
    ...seed,
    reservationSlots: { ...seed.reservationSlots, guestName: "Unexpected Identity" },
  };
  const wrongIdentity = makeLocalFakeInfrastructure({ initial: [wrongIdentityDocument] });
  await expectLocalFailure(
    () => cleanupPlan(plan, [target], wrongIdentity.infrastructure, null),
    "CLEANUP_INCOMPLETE",
    "cleanup_identity_mismatch"
  );
  check(wrongIdentity.deleteFilters.length === 0, "identity_mismatch_reached_delete");
  check(wrongIdentity.documents.has(target.id), "identity_mismatch_deleted_document");
  results.push("identity_mismatch_not_deleted");

  const zeroDelete = makeLocalFakeInfrastructure({ initial: [seed], deleteMode: "zero-owned" });
  const zeroDeleteLog = await captureCleanupFailure(
    () => cleanupPlan(plan, [target], zeroDelete.infrastructure, new Set([target.id])),
    "deleted_count_zero_owned"
  );
  check(zeroDelete.deleteFilters.length === 1, "deleted_count_zero_delete_call_count");
  check(zeroDelete.readCount() === 2, "deleted_count_zero_missing_post_read");
  check(zeroDelete.documents.has(target.id), "deleted_count_zero_document_missing");
  check(zeroDeleteLog.includes('"status":"DELETE_FAILED"'), "deleted_count_zero_wrong_status");
  check(zeroDeleteLog.includes('"errorCode":"OWNED_DOCUMENT_NOT_DELETED"'), "deleted_count_zero_wrong_code");
  results.push("deleted_count_zero_is_failure");

  const replacedAfterPrecheck = makeLocalFakeInfrastructure({
    initial: [seed],
    deleteMode: "zero-replaced",
  });
  const replacedLog = await captureCleanupFailure(
    () => cleanupPlan(plan, [target], replacedAfterPrecheck.infrastructure, new Set([target.id])),
    "post_delete_identity_mismatch"
  );
  check(replacedAfterPrecheck.readCount() === 2, "replacement_missing_post_read");
  check(replacedAfterPrecheck.documents.has(target.id), "replacement_was_deleted");
  check(replacedLog.includes('"status":"IDENTITY_MISMATCH"'), "replacement_wrong_status");
  check(replacedLog.includes('"errorCode":"POST_DELETE_IDENTITY_MISMATCH"'), "replacement_wrong_code");
  results.push("post_delete_replacement_is_identity_mismatch");

  const absentAfterZero = makeLocalFakeInfrastructure({
    initial: [seed],
    deleteMode: "zero-absent",
  });
  const absentLog = await captureCleanupFailure(
    () => cleanupPlan(plan, [target], absentAfterZero.infrastructure, new Set([target.id])),
    "post_delete_concurrent_absence"
  );
  check(absentAfterZero.readCount() === 2, "concurrent_absence_missing_post_read");
  check(!absentAfterZero.documents.has(target.id), "concurrent_absence_has_residue");
  check(absentLog.includes('"status":"NOT_DELETED_BY_GATE"'), "concurrent_absence_wrong_status");
  check(!absentLog.includes('"status":"DELETED"'), "concurrent_absence_claimed_delete");
  results.push("zero_delete_absence_not_claimed");

  const localOrigin = "https://local-gate.apps.astra.datastax.com";
  await expectLocalFailure(
    () => verifyTargetValues({
      rawUrl: `${localOrigin}/non-canonical`,
      keyspace: "local_keyspace",
      token: "local-token",
      expectedEndpoint: fingerprint(localOrigin),
      expectedKeyspace: fingerprint("local_keyspace"),
    }),
    "astra_endpoint_path_must_be_root",
    "endpoint_path"
  );
  results.push("noncanonical_endpoint_rejected");

  const rawSecret = "sdk-secret Authorization: Bearer raw-token https://raw.invalid";
  let capturedFailureLog = "";
  const originalConsoleError = console.error;
  try {
    console.error = (...args: unknown[]) => {
      capturedFailureLog += args.map((arg) => String(arg)).join(" ");
    };
    logFailure(new Error(rawSecret));
  } finally {
    console.error = originalConsoleError;
  }
  check(!capturedFailureLog.includes(rawSecret), "raw_sdk_error_was_logged");
  check(!capturedFailureLog.includes("raw-token"), "raw_sdk_token_was_logged");
  check(capturedFailureLog.includes("UNEXPECTED_FAILURE"), "unexpected_error_not_classified");
  results.push("closed_error_sanitization");

  const sensitiveArgument = "--unknown=https://secret.invalid?token=raw-cli-secret";
  let capturedCliOutput = "";
  const originalConsoleLogForCli = console.log;
  const originalConsoleErrorForCli = console.error;
  try {
    const captureCliOutput = (...args: unknown[]) => {
      capturedCliOutput += args.map((arg) => String(arg)).join(" ");
    };
    console.log = captureCliOutput;
    console.error = captureCliOutput;
    let cliError: unknown;
    try {
      parseCli([sensitiveArgument]);
    } catch (error) {
      cliError = error;
    }
    logFailure(cliError);
  } finally {
    console.log = originalConsoleLogForCli;
    console.error = originalConsoleErrorForCli;
  }
  check(capturedCliOutput.includes("UNKNOWN_ARGUMENT"), "unknown_argument_not_classified");
  check(!capturedCliOutput.includes(sensitiveArgument), "unknown_argument_value_was_logged");
  check(!capturedCliOutput.includes("raw-cli-secret"), "unknown_argument_secret_was_logged");
  results.push("unknown_cli_argument_sanitized");

  const preflightFake = makeLocalFakeInfrastructure();
  await runReadOnlyPreflight(
    plan,
    { endpointFingerprint: "local", keyspaceFingerprint: "local", collection: COLLECTION },
    preflightFake.infrastructure.read
  );
  check(preflightFake.insertCalls.length === 0, "preflight_executed_insert");
  check(preflightFake.deleteFilters.length === 0, "preflight_executed_delete");
  results.push("preflight_read_only");

  const guardedCli: CliOptions = {
    mode: "execute",
    runId,
    allowWrite: false,
    allowDelete: false,
    selfTest: false,
    help: false,
  };
  await expectLocalFailure(
    () => requireExecutionGuards(guardedCli),
    "execute_requires_allow_write_flag",
    "execute_guard"
  );
  await expectLocalFailure(
    () => requireCleanupGuards({ ...guardedCli, mode: "cleanup-only" }),
    "cleanup_requires_allow_delete_flag",
    "cleanup_guard"
  );
  const previousExecuteGrant = process.env.PERS02_ASTRA_GATE_EXECUTE;
  const previousCleanupGrant = process.env.PERS02_ASTRA_GATE_CLEANUP;
  try {
    delete process.env.PERS02_ASTRA_GATE_EXECUTE;
    delete process.env.PERS02_ASTRA_GATE_CLEANUP;
    const flagsEnabled: CliOptions = {
      ...guardedCli,
      allowWrite: true,
      allowDelete: true,
    };
    await expectLocalFailure(
      () => requireExecutionGuards(flagsEnabled),
      "execute_write_grant_missing",
      "execute_grant"
    );
    process.env.PERS02_ASTRA_GATE_EXECUTE = EXECUTE_GRANT;
    await expectLocalFailure(
      () => requireExecutionGuards(flagsEnabled),
      "execute_cleanup_grant_missing",
      "execute_separate_cleanup_grant"
    );
    await expectLocalFailure(
      () => requireCleanupGuards({ ...flagsEnabled, mode: "cleanup-only" }),
      "cleanup_grant_missing",
      "cleanup_grant"
    );
    process.env.PERS02_ASTRA_GATE_CLEANUP = CLEANUP_GRANT;
    requireCleanupGuards({ ...flagsEnabled, mode: "cleanup-only" });
    await runCleanupOnly(plan, plannedButUncreated.infrastructure);
    check(plannedButUncreated.deleteFilters.length === 1, "cleanup_only_did_not_use_recovery_scope");
    check(!plannedButUncreated.documents.has(target.id), "cleanup_only_recovery_residue");
  } finally {
    if (previousExecuteGrant === undefined) delete process.env.PERS02_ASTRA_GATE_EXECUTE;
    else process.env.PERS02_ASTRA_GATE_EXECUTE = previousExecuteGrant;
    if (previousCleanupGrant === undefined) delete process.env.PERS02_ASTRA_GATE_CLEANUP;
    else process.env.PERS02_ASTRA_GATE_CLEANUP = previousCleanupGrant;
  }
  results.push("write_and_cleanup_guards");
  results.push("cleanup_only_explicit_recovery_scope");

  const required = [
    "create_only_collision_rejected_document_intact",
    "conditional_delete_filter_and_post_read",
    "normal_cleanup_created_targets_only",
    "partial_seed_cleans_confirmed_targets_only",
    "publication_failure_cleans_created_targets",
    "identity_mismatch_not_deleted",
    "deleted_count_zero_is_failure",
    "post_delete_replacement_is_identity_mismatch",
    "zero_delete_absence_not_claimed",
    "noncanonical_endpoint_rejected",
    "closed_error_sanitization",
    "unknown_cli_argument_sanitized",
    "preflight_read_only",
    "write_and_cleanup_guards",
    "cleanup_only_explicit_recovery_scope",
  ];
  check(required.every((result) => results.includes(result)), "local_safety_matrix_incomplete");
  logEvent("LOCAL_SAFETY_TESTS_PASS", { scenarios: required.length, writesToAstra: 0, deletesFromAstra: 0 });
}

async function main(): Promise<void> {
  const cli = parseCli(process.argv.slice(2));
  if (cli.help) {
    printHelp();
    return;
  }
  if (cli.selfTest) {
    await runLocalSafetyTests();
    return;
  }

  if (cli.mode === "execute") requireExecutionGuards(cli);
  if (cli.mode === "cleanup-only") requireCleanupGuards(cli);

  const target = verifyTargetConfiguration();
  const plan = buildPlan(cli.runId);
  logEvent("TARGET_VERIFIED", {
    mode: cli.mode,
    runId: plan.runId,
    endpointFingerprint: target.endpointFingerprint,
    keyspaceFingerprint: target.keyspaceFingerprint,
    collection: target.collection,
  });
  logEvent("SYNTHETIC_PLAN", {
    runId: plan.runId,
    documentIds: plan.targets.map((syntheticTarget) => syntheticTarget.id),
  });

  if (cli.mode === "cleanup-only") {
    await runCleanupOnly(plan);
    return;
  }

  await runReadOnlyPreflight(plan, target);
  if (cli.mode === "preflight") return;
  await executeGate(plan);
}

main().catch((error) => {
  logFailure(error);
  process.exitCode = 1;
});
