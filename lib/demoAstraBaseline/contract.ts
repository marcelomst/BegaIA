// Path: /lib/demoAstraBaseline/contract.ts

import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildBaselineControlDocument,
  canonicalJson,
  DEMO_ASTRA_APPLY_CONFIRMATION,
  DEMO_ASTRA_BASELINE_VERSION,
  DEMO_ASTRA_HOTEL_ID,
  DEMO_ASTRA_OBJECTS,
  DEMO_ASTRA_SOURCE_CONTRACT,
  KNOWN_DEVELOPER_KEYSPACES,
  SYNTHETIC_HOTEL_CONFIG,
  SYNTHETIC_HOTEL_CONFIG_SHA256,
} from "@/lib/demoAstraBaseline/manifest";
import type { BaselineObjectContract } from "@/lib/demoAstraBaseline/manifest";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
const MAX_INSPECTED_ROWS = 1_001;

export type TargetIdentityInput = Readonly<{
  endpoint: string;
  keyspace: string;
  expectedFingerprint: string;
}>;

export type VerifiedTargetIdentity = Readonly<{
  endpoint: string;
  keyspace: string;
  fingerprint: string;
}>;

export type SeedDocument = Readonly<{
  objectName: "baseline_control" | "hotel_config" | "category_registry" | "system_playbook";
  key: Readonly<Record<string, unknown>>;
  value: Readonly<Record<string, unknown>>;
}>;

export type PhysicalSchemaStatus = "compatible" | "incompatible" | "unverified";

export type ObjectInspection = Readonly<{
  exists: boolean;
  rowCount: number;
  truncated?: boolean;
  schemaStatus: PhysicalSchemaStatus;
}>;

export type NamespaceInventory = Readonly<{
  collections: readonly string[];
  tables: readonly string[];
  collectionsComplete: boolean;
  tablesComplete: boolean;
  permissionsVerified: boolean;
}>;

export type PermissionInspection = Readonly<{
  metadataRead: boolean;
  dataRead: boolean;
  schemaWrite: boolean;
  dataWrite: boolean;
  verified: boolean;
  method: string;
}>;

export interface DemoAstraBaselineAdapter {
  inspectNamespace(): Promise<NamespaceInventory>;
  inspectPermissions(): Promise<PermissionInspection>;
  inspectObject(object: BaselineObjectContract, limit: number): Promise<ObjectInspection>;
  getDocument(objectName: string, key: Readonly<Record<string, unknown>>): Promise<Record<string, unknown> | null>;
  createObject(object: BaselineObjectContract): Promise<void>;
  upsertDocument(document: SeedDocument): Promise<void>;
}

export class BaselineContractError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "BaselineContractError";
  }
}

export type PlanAction = Readonly<{
  object: string;
  action:
    | "create"
    | "seed"
    | "verify-empty"
    | "verify-seed"
    | "blocked-preprovision"
    | "blocked-schema-unverified"
    | "blocked-schema-incompatible";
}>;

export type BaselinePlan = Readonly<{
  mode: "plan";
  writes: false;
  target: Readonly<{ keyspace: string; fingerprint: string }>;
  baselineVersion: string;
  actions: readonly PlanAction[];
}>;

export type BaselineVerification = Readonly<{
  mode: "verify";
  writes: false;
  ok: true;
  target: Readonly<{ keyspace: string; fingerprint: string }>;
  baselineVersion: string;
  objectsVerified: number;
  seedDocumentsVerified: number;
}>;

export type BaselineApplyResult = Readonly<{
  mode: "apply";
  ok: true;
  idempotent: boolean;
  target: Readonly<{ keyspace: string; fingerprint: string }>;
  baselineVersion: string;
  createdObjects: number;
  upsertedDocuments: number;
}>;

export type RecoveryPlan = Readonly<{
  mode: "recovery";
  writes: false;
  target: Readonly<{ keyspace: string; fingerprint: string }>;
  baselineVersion: string;
  destructiveOperations: readonly [];
  steps: readonly string[];
}>;

function normalizeEndpoint(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BaselineContractError("TARGET_ENDPOINT_INVALID");
  }
  if (url.protocol !== "https:") throw new BaselineContractError("TARGET_ENDPOINT_MUST_USE_HTTPS");
  if (url.username || url.password || url.search || url.hash) {
    throw new BaselineContractError("TARGET_ENDPOINT_AMBIGUOUS");
  }
  if (url.pathname !== "/" && url.pathname !== "") {
    throw new BaselineContractError("TARGET_ENDPOINT_AMBIGUOUS");
  }
  return url.origin.toLowerCase();
}

export function computeTargetFingerprint(endpoint: string, keyspace: string): string {
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const normalizedKeyspace = String(keyspace ?? "").trim();
  if (!normalizedKeyspace) throw new BaselineContractError("TARGET_KEYSPACE_REQUIRED");
  const material = [
    "begaia-demo-astra-target-v1",
    `endpoint=${normalizedEndpoint}`,
    `keyspace=${normalizedKeyspace}`,
  ].join("\n");
  return crypto.createHash("sha256").update(material).digest("hex");
}

export function assertTargetIdentity(input: TargetIdentityInput): VerifiedTargetIdentity {
  const endpoint = normalizeEndpoint(input.endpoint);
  const keyspace = String(input.keyspace ?? "").trim();
  if (!keyspace) throw new BaselineContractError("TARGET_KEYSPACE_REQUIRED");
  if (KNOWN_DEVELOPER_KEYSPACES.some((known) => known.toLowerCase() === keyspace.toLowerCase())) {
    throw new BaselineContractError("DEVELOPER_KEYSPACE_REJECTED");
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_]{1,47}$/.test(keyspace)) {
    throw new BaselineContractError("TARGET_KEYSPACE_AMBIGUOUS");
  }
  const fingerprint = computeTargetFingerprint(endpoint, keyspace);
  const expected = String(input.expectedFingerprint ?? "").trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expected)) {
    throw new BaselineContractError("EXPECTED_TARGET_FINGERPRINT_REQUIRED");
  }
  if (fingerprint !== expected) {
    throw new BaselineContractError("TARGET_FINGERPRINT_MISMATCH");
  }
  return { endpoint, keyspace, fingerprint };
}

async function sha256File(filePath: string): Promise<string> {
  return crypto.createHash("sha256").update(await fs.readFile(filePath)).digest("hex");
}

async function listFilesRecursive(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFilesRecursive(absolute));
    } else if (entry.isFile() && !entry.name.endsWith(":Zone.Identifier")) {
      files.push(absolute);
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

async function sha256DirectoryLikeSha256sum(directory: string): Promise<string> {
  const lines: string[] = [];
  for (const absolute of await listFilesRecursive(directory)) {
    const relative = path.relative(REPO_ROOT, absolute).split(path.sep).join("/");
    lines.push(`${await sha256File(absolute)}  ${relative}\n`);
  }
  return crypto.createHash("sha256").update(lines.join("")).digest("hex");
}

export async function verifyVersionedSources(): Promise<void> {
  for (const source of DEMO_ASTRA_SOURCE_CONTRACT) {
    const absolute = path.resolve(REPO_ROOT, source.path);
    if (!absolute.startsWith(`${REPO_ROOT}${path.sep}`)) {
      throw new BaselineContractError("SOURCE_PATH_ESCAPES_REPOSITORY");
    }
    let actual: string;
    try {
      const stat = await fs.stat(absolute);
      actual = stat.isDirectory()
        ? await sha256DirectoryLikeSha256sum(absolute)
        : await sha256File(absolute);
    } catch {
      throw new BaselineContractError("VERSIONED_SOURCE_MISSING");
    }
    if (actual !== source.sha256) throw new BaselineContractError("VERSIONED_SOURCE_HASH_MISMATCH");
  }
}

function assertNoForbiddenStructuredFields(value: unknown, pathParts: string[] = []): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenStructuredFields(entry, [...pathParts, String(index)]));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
    if (/password|secret|credential|apikey|token|username/.test(normalized)) {
      throw new BaselineContractError("SYNTHETIC_SEED_CONTAINS_CREDENTIAL_FIELD");
    }
    assertNoForbiddenStructuredFields(nested, [...pathParts, key]);
  }
}

export function assertSyntheticSeedSafe(documents: readonly SeedDocument[]): void {
  const hotelConfig = documents.find((document) => document.objectName === "hotel_config")?.value;
  if (!hotelConfig || hotelConfig.hotelId !== DEMO_ASTRA_HOTEL_ID) {
    throw new BaselineContractError("SYNTHETIC_HOTEL_ID_INVALID");
  }
  if (!Array.isArray(hotelConfig.users) || hotelConfig.users.length !== 0) {
    throw new BaselineContractError("SYNTHETIC_SEED_USERS_NOT_EMPTY");
  }
  const channels = hotelConfig.channelConfigs as Record<string, unknown> | undefined;
  if (!channels || Object.keys(channels).length !== 1 || !channels.web) {
    throw new BaselineContractError("SYNTHETIC_SEED_NOT_WEB_ONLY");
  }
  const web = channels.web as Record<string, unknown>;
  if (web.enabled !== true || web.mode !== "automatic") {
    throw new BaselineContractError("SYNTHETIC_WEB_CHANNEL_INVALID");
  }
  const contacts = hotelConfig.contacts as Record<string, unknown> | undefined;
  if (contacts && ["email", "phone", "whatsapp"].some((field) => contacts[field])) {
    throw new BaselineContractError("SYNTHETIC_SEED_CONTAINS_PERSONAL_CONTACT");
  }
  const forbiddenSeedTargets = new Set(["guests", "conversations", "messages", "conv_state", "demo_cm_reservations"]);
  if (documents.some((document) => forbiddenSeedTargets.has(document.objectName))) {
    throw new BaselineContractError("SYNTHETIC_OPERATIONAL_STATE_NOT_EMPTY");
  }
  documents.forEach((document) => assertNoForbiddenStructuredFields(document.value));
}

function parseJsonLines(raw: string): Record<string, unknown>[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//"))
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

export async function loadSeedDocuments(targetFingerprint: string): Promise<readonly SeedDocument[]> {
  await verifyVersionedSources();
  const hotelConfigHash = crypto.createHash("sha256").update(canonicalJson(SYNTHETIC_HOTEL_CONFIG)).digest("hex");
  if (hotelConfigHash !== SYNTHETIC_HOTEL_CONFIG_SHA256) {
    throw new BaselineContractError("SYNTHETIC_HOTEL_CONFIG_HASH_MISMATCH");
  }
  const categories = JSON.parse(
    await fs.readFile(path.join(REPO_ROOT, "seeds/category_registry.json"), "utf8"),
  ) as Record<string, unknown>[];
  const playbooks = parseJsonLines(
    await fs.readFile(path.join(REPO_ROOT, "seeds/system_playbook.seed.jsonl"), "utf8"),
  );
  if (!categories.length || categories.some((entry) => typeof entry.categoryId !== "string")) {
    throw new BaselineContractError("CATEGORY_REGISTRY_SOURCE_INVALID");
  }
  if (!playbooks.length || playbooks.some((entry) => typeof entry._id !== "string" || typeof entry.text !== "string")) {
    throw new BaselineContractError("SYSTEM_PLAYBOOK_SOURCE_INVALID");
  }
  const documents: SeedDocument[] = [
    {
      objectName: "baseline_control",
      key: { _id: `baseline:${DEMO_ASTRA_BASELINE_VERSION}` },
      value: buildBaselineControlDocument(targetFingerprint),
    },
    {
      objectName: "hotel_config",
      key: { hotelId: DEMO_ASTRA_HOTEL_ID },
      value: SYNTHETIC_HOTEL_CONFIG,
    },
    ...categories.map((entry) => ({
      objectName: "category_registry" as const,
      key: { categoryId: entry.categoryId },
      value: {
        _id: `category:${String(entry.categoryId)}`,
        ...entry,
      },
    })),
    ...playbooks.map((entry) => ({
      objectName: "system_playbook" as const,
      key: { _id: entry._id },
      value: entry,
    })),
  ];
  assertSyntheticSeedSafe(documents);
  return documents;
}

function assertUniqueInventoryNames(names: readonly string[]): void {
  if (names.some((name) => typeof name !== "string" || !name.trim())) {
    throw new BaselineContractError("NAMESPACE_INVENTORY_AMBIGUOUS");
  }
  if (new Set(names).size !== names.length) {
    throw new BaselineContractError("NAMESPACE_INVENTORY_AMBIGUOUS");
  }
}

async function inspectAll(adapter: DemoAstraBaselineAdapter): Promise<Map<string, ObjectInspection>> {
  let inventory: NamespaceInventory;
  try {
    inventory = await adapter.inspectNamespace();
  } catch (error) {
    if (error instanceof BaselineContractError) throw error;
    throw new BaselineContractError("NAMESPACE_INVENTORY_FAILED");
  }
  if (!inventory.permissionsVerified) {
    throw new BaselineContractError("NAMESPACE_INVENTORY_PERMISSION_UNVERIFIED");
  }
  if (!inventory.collectionsComplete || !inventory.tablesComplete) {
    throw new BaselineContractError("NAMESPACE_INVENTORY_INCOMPLETE");
  }
  assertUniqueInventoryNames(inventory.collections);
  assertUniqueInventoryNames(inventory.tables);
  const collectionNames = new Set(inventory.collections);
  const tableNames = new Set(inventory.tables);
  if (inventory.collections.some((name) => tableNames.has(name))) {
    throw new BaselineContractError("NAMESPACE_INVENTORY_AMBIGUOUS");
  }
  const authorizedCollections = new Set(
    DEMO_ASTRA_OBJECTS.filter((object) => object.kind === "collection").map((object) => object.name),
  );
  const authorizedTables = new Set(
    DEMO_ASTRA_OBJECTS.filter((object) => object.kind === "table").map((object) => object.name),
  );
  if (inventory.collections.some((name) => !authorizedCollections.has(name))) {
    throw new BaselineContractError("UNAUTHORIZED_NAMESPACE_COLLECTION");
  }
  if (inventory.tables.some((name) => !authorizedTables.has(name))) {
    throw new BaselineContractError("UNAUTHORIZED_NAMESPACE_TABLE");
  }

  const snapshots = new Map<string, ObjectInspection>();
  for (const object of DEMO_ASTRA_OBJECTS) {
    const snapshot = await adapter.inspectObject(object, MAX_INSPECTED_ROWS);
    const listed = object.kind === "collection"
      ? collectionNames.has(object.name)
      : tableNames.has(object.name);
    if (snapshot.exists !== listed) {
      throw new BaselineContractError("NAMESPACE_INVENTORY_OBJECT_MISMATCH");
    }
    snapshots.set(object.name, snapshot);
  }
  return snapshots;
}

function assertPhysicalSchemaVerified(snapshot: ObjectInspection): void {
  if (snapshot.schemaStatus === "unverified") {
    throw new BaselineContractError("PHYSICAL_SCHEMA_UNVERIFIED");
  }
  if (snapshot.schemaStatus === "incompatible") {
    throw new BaselineContractError("PHYSICAL_SCHEMA_MISMATCH");
  }
}

function safeTarget(target: VerifiedTargetIdentity) {
  return { keyspace: target.keyspace, fingerprint: target.fingerprint } as const;
}

function documentsByObject(documents: readonly SeedDocument[]): Map<string, readonly SeedDocument[]> {
  const grouped = new Map<string, SeedDocument[]>();
  for (const document of documents) {
    const existing = grouped.get(document.objectName) ?? [];
    existing.push(document);
    grouped.set(document.objectName, existing);
  }
  return grouped;
}

export async function planBaseline(
  input: TargetIdentityInput,
  adapter: DemoAstraBaselineAdapter,
): Promise<BaselinePlan> {
  const target = assertTargetIdentity(input);
  const documents = await loadSeedDocuments(target.fingerprint);
  const snapshots = await inspectAll(adapter);
  const grouped = documentsByObject(documents);
  const actions: PlanAction[] = [];
  for (const object of DEMO_ASTRA_OBJECTS) {
    const snapshot = snapshots.get(object.name)!;
    if (!snapshot.exists) {
      actions.push({
        object: object.name,
        action: object.creation === "preprovisioned" ? "blocked-preprovision" : "create",
      });
    }
    if (snapshot.exists && snapshot.schemaStatus === "unverified") {
      actions.push({ object: object.name, action: "blocked-schema-unverified" });
    }
    if (snapshot.exists && snapshot.schemaStatus === "incompatible") {
      actions.push({ object: object.name, action: "blocked-schema-incompatible" });
    }
    actions.push({
      object: object.name,
      action: object.state === "empty" ? "verify-empty" : "verify-seed",
    });
    if (object.state === "seeded" && (grouped.get(object.name)?.length ?? 0) === 0) {
      throw new BaselineContractError("MANIFEST_SEED_MAPPING_INCOMPLETE");
    }
  }
  return {
    mode: "plan",
    writes: false,
    target: safeTarget(target),
    baselineVersion: DEMO_ASTRA_BASELINE_VERSION,
    actions,
  };
}

function comparableDocument(value: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...value };
  delete copy.$vector;
  delete copy.$vectorize;
  return copy;
}

export async function verifyBaseline(
  input: TargetIdentityInput,
  adapter: DemoAstraBaselineAdapter,
): Promise<BaselineVerification> {
  const target = assertTargetIdentity(input);
  const documents = await loadSeedDocuments(target.fingerprint);
  const grouped = documentsByObject(documents);
  const snapshots = await inspectAll(adapter);

  for (const object of DEMO_ASTRA_OBJECTS) {
    const snapshot = snapshots.get(object.name)!;
    if (!snapshot.exists) throw new BaselineContractError("BASELINE_OBJECT_MISSING");
    assertPhysicalSchemaVerified(snapshot);
    if (snapshot.truncated) throw new BaselineContractError("TARGET_CONTENT_UNBOUNDED");
    const expectedDocuments = grouped.get(object.name) ?? [];
    if (object.state === "empty") {
      if (snapshot.rowCount !== 0) throw new BaselineContractError("OPERATIONAL_STATE_NOT_EMPTY");
      continue;
    }
    if (snapshot.rowCount !== expectedDocuments.length) {
      throw new BaselineContractError("SEEDED_OBJECT_CARDINALITY_MISMATCH");
    }
    for (const expected of expectedDocuments) {
      const actual = await adapter.getDocument(object.name, expected.key);
      if (!actual || canonicalJson(comparableDocument(actual)) !== canonicalJson(expected.value)) {
        throw new BaselineContractError("SEEDED_DOCUMENT_MISMATCH");
      }
    }
  }

  return {
    mode: "verify",
    writes: false,
    ok: true,
    target: safeTarget(target),
    baselineVersion: DEMO_ASTRA_BASELINE_VERSION,
    objectsVerified: DEMO_ASTRA_OBJECTS.length,
    seedDocumentsVerified: documents.length,
  };
}

export async function applyBaseline(
  input: TargetIdentityInput & Readonly<{ confirmation: string }>,
  adapter: DemoAstraBaselineAdapter,
): Promise<BaselineApplyResult> {
  const target = assertTargetIdentity(input);
  if (input.confirmation !== DEMO_ASTRA_APPLY_CONFIRMATION) {
    throw new BaselineContractError("APPLY_CONFIRMATION_REQUIRED");
  }
  const documents = await loadSeedDocuments(target.fingerprint);
  const initial = await inspectAll(adapter);
  for (const object of DEMO_ASTRA_OBJECTS) {
    const snapshot = initial.get(object.name)!;
    if (snapshot.exists) assertPhysicalSchemaVerified(snapshot);
  }
  const control = initial.get("baseline_control");
  const targetHasData = [...initial.values()].some((snapshot) => snapshot.exists && snapshot.rowCount > 0);

  if (control?.exists && control.rowCount > 0) {
    const verification = await verifyBaseline(input, adapter);
    return {
      mode: "apply",
      ok: true,
      idempotent: true,
      target: verification.target,
      baselineVersion: verification.baselineVersion,
      createdObjects: 0,
      upsertedDocuments: 0,
    };
  }
  if (targetHasData) throw new BaselineContractError("TARGET_NOT_EMPTY");

  for (const object of DEMO_ASTRA_OBJECTS) {
    const snapshot = initial.get(object.name)!;
    if (!snapshot.exists && object.creation === "preprovisioned") {
      throw new BaselineContractError("REQUIRED_PREPROVISIONED_OBJECT_MISSING");
    }
  }

  const permissions = await adapter.inspectPermissions();
  if (
    !permissions.verified ||
    !permissions.metadataRead ||
    !permissions.dataRead ||
    !permissions.schemaWrite ||
    !permissions.dataWrite
  ) {
    throw new BaselineContractError("WRITE_PERMISSIONS_NOT_VERIFIED");
  }

  let createdObjects = 0;
  for (const object of DEMO_ASTRA_OBJECTS) {
    if (!initial.get(object.name)!.exists) {
      await adapter.createObject(object);
      createdObjects += 1;
    }
  }
  for (const document of documents) await adapter.upsertDocument(document);
  await verifyBaseline(input, adapter);

  return {
    mode: "apply",
    ok: true,
    idempotent: false,
    target: safeTarget(target),
    baselineVersion: DEMO_ASTRA_BASELINE_VERSION,
    createdObjects,
    upsertedDocuments: documents.length,
  };
}

export function buildRecoveryPlan(input: TargetIdentityInput): RecoveryPlan {
  const target = assertTargetIdentity(input);
  return {
    mode: "recovery",
    writes: false,
    target: safeTarget(target),
    baselineVersion: DEMO_ASTRA_BASELINE_VERSION,
    destructiveOperations: [],
    steps: [
      "Mantener el destino afectado fuera de tráfico y conservarlo para análisis.",
      "Provisionar por autoridad humana un keyspace Demo vacío con credenciales específicas.",
      "Calcular y aprobar el fingerprint del nuevo endpoint y keyspace.",
      "Ejecutar plan para comprobar precondiciones sin escrituras.",
      "Ejecutar apply sólo mediante una autorización operacional independiente, confirmación explícita y permisos verificados.",
      "Ejecutar verify después del apply para comprobar el baseline resultante.",
      "Cambiar la configuración operacional únicamente en un hito de cutover separado.",
    ],
  };
}
