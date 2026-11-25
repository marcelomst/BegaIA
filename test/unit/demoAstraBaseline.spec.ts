// Path: /test/unit/demoAstraBaseline.spec.ts

import { afterEach, describe, expect, it, vi } from "vitest";
import { DEMO_CHANNEL_MANAGER_RESERVATIONS_SCHEMA } from "@/lib/db/demoChannelManagerReservations";
import {
  applyBaseline,
  assertSyntheticSeedSafe,
  assertTargetIdentity,
  BaselineContractError,
  buildRecoveryPlan,
  computeTargetFingerprint,
  loadSeedDocuments,
  planBaseline,
  verifyBaseline,
} from "@/lib/demoAstraBaseline/contract";
import type {
  DemoAstraBaselineAdapter,
  NamespaceInventory,
  ObjectInspection,
  PhysicalSchemaStatus,
  SeedDocument,
} from "@/lib/demoAstraBaseline/contract";
import {
  canonicalJson,
  DEMO_ASTRA_APPLY_CONFIRMATION,
  DEMO_ASTRA_OBJECTS,
} from "@/lib/demoAstraBaseline/manifest";
import type { BaselineObjectContract } from "@/lib/demoAstraBaseline/manifest";
import {
  formatSanitizedCliFailure,
  parseDemoAstraBaselineArgs,
} from "../../scripts/demo-astra-baseline";

const endpoint = "https://demo-baseline.example.invalid";
const keyspace = "begaia_demo_commercial";
const expectedFingerprint = computeTargetFingerprint(endpoint, keyspace);
const target = { endpoint, keyspace, expectedFingerprint } as const;

class FakeBaselineAdapter implements DemoAstraBaselineAdapter {
  readonly objects = new Map<string, { exists: boolean; schemaStatus: PhysicalSchemaStatus; rows: Record<string, unknown>[] }>();
  readonly calls = { inventory: 0, inspect: 0, permission: 0, create: 0, upsert: 0, get: 0 };
  readonly extraCollections = new Set<string>();
  readonly extraTables = new Set<string>();
  permissionsVerified = true;
  inventoryCollectionsComplete = true;
  inventoryTablesComplete = true;
  inventoryPermissionsVerified = true;
  inventoryError = false;

  constructor(schemaFixtures: Readonly<Record<string, PhysicalSchemaStatus>>) {
    for (const object of DEMO_ASTRA_OBJECTS) {
      this.objects.set(object.name, {
        exists: true,
        schemaStatus: schemaFixtures[object.name] ?? "unverified",
        rows: [],
      });
    }
  }

  async inspectNamespace(): Promise<NamespaceInventory> {
    this.calls.inventory += 1;
    if (this.inventoryError) throw new Error("synthetic inventory failure");
    const collections = DEMO_ASTRA_OBJECTS
      .filter((object) => object.kind === "collection" && this.objects.get(object.name)?.exists)
      .map((object) => object.name);
    const tables = DEMO_ASTRA_OBJECTS
      .filter((object) => object.kind === "table" && this.objects.get(object.name)?.exists)
      .map((object) => object.name);
    return {
      collections: [...collections, ...this.extraCollections],
      tables: [...tables, ...this.extraTables],
      collectionsComplete: this.inventoryCollectionsComplete,
      tablesComplete: this.inventoryTablesComplete,
      permissionsVerified: this.inventoryPermissionsVerified,
    };
  }

  async inspectPermissions() {
    this.calls.permission += 1;
    return {
      metadataRead: true,
      dataRead: true,
      schemaWrite: this.permissionsVerified,
      dataWrite: this.permissionsVerified,
      verified: this.permissionsVerified,
      method: "synthetic-adapter",
    };
  }

  async inspectObject(object: BaselineObjectContract, limit: number): Promise<ObjectInspection> {
    this.calls.inspect += 1;
    const state = this.objects.get(object.name) ?? { exists: false, schemaStatus: "unverified" as const, rows: [] };
    return {
      exists: state.exists,
      rowCount: state.rows.slice(0, limit).length,
      truncated: state.rows.length >= limit,
      schemaStatus: state.schemaStatus,
    };
  }

  async getDocument(objectName: string, key: Readonly<Record<string, unknown>>) {
    this.calls.get += 1;
    const rows = this.objects.get(objectName)?.rows ?? [];
    return rows.find((row) => Object.entries(key).every(([field, value]) => row[field] === value)) ?? null;
  }

  async createObject(object: BaselineObjectContract) {
    this.calls.create += 1;
    this.objects.set(object.name, { exists: true, schemaStatus: "compatible", rows: [] });
  }

  async upsertDocument(document: SeedDocument) {
    this.calls.upsert += 1;
    const state = this.objects.get(document.objectName)!;
    const index = state.rows.findIndex((row) =>
      Object.entries(document.key).every(([field, value]) => row[field] === value),
    );
    const next = structuredClone(document.value) as Record<string, unknown>;
    if (index >= 0) state.rows[index] = next;
    else state.rows.push(next);
  }

  writeCalls(): number {
    return this.calls.create + this.calls.upsert;
  }
}

const COMPATIBLE_SCHEMA_FIXTURES = Object.fromEntries(
  DEMO_ASTRA_OBJECTS.map((object) => [object.name, "compatible"]),
) as Record<string, PhysicalSchemaStatus>;

function compatibleAdapter(): FakeBaselineAdapter {
  return new FakeBaselineAdapter(COMPATIBLE_SCHEMA_FIXTURES);
}

afterEach(() => vi.unstubAllGlobals());

describe("Demo Astra baseline contract", () => {
  it("planifica por defecto sin escrituras", async () => {
    const adapter = compatibleAdapter();
    expect(parseDemoAstraBaselineArgs([
      "node",
      "script",
      "--endpoint",
      endpoint,
      "--keyspace",
      keyspace,
      "--expected-target-fingerprint",
      expectedFingerprint,
    ]).command).toBe("plan");
    const plan = await planBaseline(target, adapter);
    expect(plan.mode).toBe("plan");
    expect(plan.writes).toBe(false);
    expect(adapter.writeCalls()).toBe(0);
  });

  it("verifica un baseline aplicado sin escrituras", async () => {
    const adapter = compatibleAdapter();
    await applyBaseline({ ...target, confirmation: DEMO_ASTRA_APPLY_CONFIRMATION }, adapter);
    const writesBeforeVerify = adapter.writeCalls();
    const result = await verifyBaseline(target, adapter);
    expect(result.ok).toBe(true);
    expect(adapter.writeCalls()).toBe(writesBeforeVerify);
  });

  it("rechaza endpoint inseguro y keyspace Developer conocido", () => {
    expect(() => assertTargetIdentity({
      endpoint: "http://demo.invalid",
      keyspace,
      expectedFingerprint,
    })).toThrowError(expect.objectContaining({ code: "TARGET_ENDPOINT_MUST_USE_HTTPS" }));
    const developerFingerprint = computeTargetFingerprint(endpoint, "hotel_data");
    expect(() => assertTargetIdentity({
      endpoint,
      keyspace: "hotel_data",
      expectedFingerprint: developerFingerprint,
    })).toThrowError(expect.objectContaining({ code: "DEVELOPER_KEYSPACE_REJECTED" }));
  });

  it("rechaza un destino cuyo fingerprint no fue autorizado", () => {
    expect(() => assertTargetIdentity({ ...target, expectedFingerprint: "0".repeat(64) }))
      .toThrowError(expect.objectContaining({ code: "TARGET_FINGERPRINT_MISMATCH" }));
  });

  it("rechaza un target no vacío sin marcador del baseline", async () => {
    const adapter = compatibleAdapter();
    adapter.objects.get("guests")!.rows.push({ hotelId: "hotel999", guestId: "real-person" });
    await expect(applyBaseline({ ...target, confirmation: DEMO_ASTRA_APPLY_CONFIRMATION }, adapter))
      .rejects.toMatchObject({ code: "TARGET_NOT_EMPTY" });
    expect(adapter.writeCalls()).toBe(0);
  });

  it("exige confirmación exacta y la colección vectorial preprovisionada", async () => {
    const withoutConfirmation = compatibleAdapter();
    await expect(applyBaseline({ ...target, confirmation: "" }, withoutConfirmation))
      .rejects.toMatchObject({ code: "APPLY_CONFIRMATION_REQUIRED" });
    expect(withoutConfirmation.writeCalls()).toBe(0);

    const withoutVectorCollection = compatibleAdapter();
    withoutVectorCollection.objects.get("hotel999_collection")!.exists = false;
    await expect(applyBaseline({ ...target, confirmation: DEMO_ASTRA_APPLY_CONFIRMATION }, withoutVectorCollection))
      .rejects.toMatchObject({ code: "REQUIRED_PREPROVISIONED_OBJECT_MISSING" });
    expect(withoutVectorCollection.writeCalls()).toBe(0);
  });

  it("rechaza usuarios, SecretRefs, credenciales y canales externos", async () => {
    const seed = await loadSeedDocuments(expectedFingerprint);
    const withUser = structuredClone(seed) as SeedDocument[];
    const configWithUser = withUser.find((document) => document.objectName === "hotel_config")!;
    (configWithUser.value.users as unknown[]).push({ email: "person@example.com" });
    expect(() => assertSyntheticSeedSafe(withUser))
      .toThrowError(expect.objectContaining({ code: "SYNTHETIC_SEED_USERS_NOT_EMPTY" }));

    const withSecret = structuredClone(seed) as SeedDocument[];
    const configWithSecret = withSecret.find((document) => document.objectName === "hotel_config")!;
    (configWithSecret.value as Record<string, unknown>).secretRef = "provider-real";
    expect(() => assertSyntheticSeedSafe(withSecret))
      .toThrowError(expect.objectContaining({ code: "SYNTHETIC_SEED_CONTAINS_CREDENTIAL_FIELD" }));

    const withEmail = structuredClone(seed) as SeedDocument[];
    const configWithEmail = withEmail.find((document) => document.objectName === "hotel_config")!;
    (configWithEmail.value.channelConfigs as Record<string, unknown>).email = { enabled: true };
    expect(() => assertSyntheticSeedSafe(withEmail))
      .toThrowError(expect.objectContaining({ code: "SYNTHETIC_SEED_NOT_WEB_ONLY" }));
  });

  it("habilita exclusivamente Web y mantiene estado operacional vacío", async () => {
    const seed = await loadSeedDocuments(expectedFingerprint);
    const hotel = seed.find((document) => document.objectName === "hotel_config")!.value;
    expect(hotel.channelConfigs).toEqual({ web: { enabled: true, mode: "automatic" } });
    expect(hotel.users).toEqual([]);
    expect(seed.some((document) => ["guests", "conversations", "messages", "conv_state"].includes(document.objectName)))
      .toBe(false);
  });

  it("mantiene el manifest ligado a los schemas físicos inspeccionados", () => {
    const names = new Set(DEMO_ASTRA_OBJECTS.map((object) => object.name));
    for (const object of DEMO_ASTRA_OBJECTS) {
      for (const dependency of object.dependsOn ?? []) expect(names.has(dependency)).toBe(true);
    }
    expect(DEMO_ASTRA_OBJECTS.find((object) => object.name === "hotel999_collection"))
      .toMatchObject({ creation: "preprovisioned", state: "empty" });
    expect(DEMO_ASTRA_OBJECTS.find((object) => object.name === "demo_cm_reservations")?.schemaRef)
      .toContain("DEMO_CHANNEL_MANAGER_RESERVATIONS_SCHEMA");
    expect(canonicalJson(DEMO_CHANNEL_MANAGER_RESERVATIONS_SCHEMA)).toContain("num_guests");
    expect(canonicalJson(DEMO_CHANNEL_MANAGER_RESERVATIONS_SCHEMA)).toContain("reservation_id");
  });

  it("rechaza schema vectorial unverified en verify aunque la colección exista y esté vacía", async () => {
    const adapter = compatibleAdapter();
    await applyBaseline({ ...target, confirmation: DEMO_ASTRA_APPLY_CONFIRMATION }, adapter);
    const writesBeforeVerify = adapter.writeCalls();
    const vector = adapter.objects.get("hotel999_collection")!;
    vector.schemaStatus = "unverified";
    expect(vector.exists).toBe(true);
    expect(vector.rows).toEqual([]);
    await expect(verifyBaseline(target, adapter))
      .rejects.toMatchObject({ code: "PHYSICAL_SCHEMA_UNVERIFIED" });
    expect(adapter.writeCalls()).toBe(writesBeforeVerify);
  });

  it("rechaza schema vectorial unverified en apply antes de escribir", async () => {
    const adapter = compatibleAdapter();
    adapter.objects.get("hotel999_collection")!.schemaStatus = "unverified";
    const plan = await planBaseline(target, adapter);
    expect(plan.actions).toContainEqual({
      object: "hotel999_collection",
      action: "blocked-schema-unverified",
    });
    await expect(applyBaseline({ ...target, confirmation: DEMO_ASTRA_APPLY_CONFIRMATION }, adapter))
      .rejects.toMatchObject({ code: "PHYSICAL_SCHEMA_UNVERIFIED" });
    expect(adapter.writeCalls()).toBe(0);
  });

  it("permite compatibilidad vectorial sólo cuando el fixture la declara explícitamente", async () => {
    const adapter = compatibleAdapter();
    expect(adapter.objects.get("hotel999_collection")!.schemaStatus).toBe("compatible");
    const result = await applyBaseline({ ...target, confirmation: DEMO_ASTRA_APPLY_CONFIRMATION }, adapter);
    expect(result.ok).toBe(true);
  });

  it("rechaza una Collection con schema físico incompatible antes de escribir", async () => {
    const adapter = compatibleAdapter();
    adapter.objects.get("hotel999_collection")!.schemaStatus = "incompatible";
    await expect(applyBaseline({ ...target, confirmation: DEMO_ASTRA_APPLY_CONFIRMATION }, adapter))
      .rejects.toMatchObject({ code: "PHYSICAL_SCHEMA_MISMATCH" });
    expect(adapter.writeCalls()).toBe(0);
  });

  it("rechaza una Collection Data API adicional fuera del manifest", async () => {
    const adapter = compatibleAdapter();
    adapter.extraCollections.add("unexpected_collection");
    await expect(applyBaseline({ ...target, confirmation: DEMO_ASTRA_APPLY_CONFIRMATION }, adapter))
      .rejects.toMatchObject({ code: "UNAUTHORIZED_NAMESPACE_COLLECTION" });
    expect(adapter.writeCalls()).toBe(0);
  });

  it("rechaza una tabla CQL adicional fuera del manifest", async () => {
    const adapter = compatibleAdapter();
    adapter.extraTables.add("unexpected_table");
    await expect(applyBaseline({ ...target, confirmation: DEMO_ASTRA_APPLY_CONFIRMATION }, adapter))
      .rejects.toMatchObject({ code: "UNAUTHORIZED_NAMESPACE_TABLE" });
    expect(adapter.writeCalls()).toBe(0);
  });

  it("rechaza errores, inventarios parciales y permisos insuficientes de enumeración", async () => {
    const failed = compatibleAdapter();
    failed.inventoryError = true;
    await expect(planBaseline(target, failed))
      .rejects.toMatchObject({ code: "NAMESPACE_INVENTORY_FAILED" });

    const partial = compatibleAdapter();
    partial.inventoryTablesComplete = false;
    await expect(planBaseline(target, partial))
      .rejects.toMatchObject({ code: "NAMESPACE_INVENTORY_INCOMPLETE" });

    const unauthorized = compatibleAdapter();
    unauthorized.inventoryPermissionsVerified = false;
    await expect(planBaseline(target, unauthorized))
      .rejects.toMatchObject({ code: "NAMESPACE_INVENTORY_PERMISSION_UNVERIFIED" });

    expect(failed.writeCalls() + partial.writeCalls() + unauthorized.writeCalls()).toBe(0);
  });

  it("aplica de forma idempotente sobre el adaptador simulado", async () => {
    const adapter = compatibleAdapter();
    const first = await applyBaseline({ ...target, confirmation: DEMO_ASTRA_APPLY_CONFIRMATION }, adapter);
    const writesAfterFirst = adapter.writeCalls();
    const second = await applyBaseline({ ...target, confirmation: DEMO_ASTRA_APPLY_CONFIRMATION }, adapter);
    expect(first.idempotent).toBe(false);
    expect(second.idempotent).toBe(true);
    expect(adapter.writeCalls()).toBe(writesAfterFirst);
  });

  it("define recovery sin operaciones destructivas ni escrituras", () => {
    const recovery = buildRecoveryPlan(target);
    expect(recovery.writes).toBe(false);
    expect(recovery.destructiveOperations).toEqual([]);
    expect(recovery.steps.join(" ")).not.toMatch(/drop|truncate|wipe/i);
    const sequence = recovery.steps.join(" ").toLowerCase();
    expect(sequence.indexOf("ejecutar plan")).toBeLessThan(sequence.indexOf("ejecutar apply"));
    expect(sequence.indexOf("ejecutar apply")).toBeLessThan(sequence.indexOf("ejecutar verify"));
  });

  it("sanitiza errores CLI sin incluir secretos ni mensajes crudos", () => {
    const secret = "AstraCS:never-print-this";
    const known = formatSanitizedCliFailure(new BaselineContractError("TARGET_NOT_EMPTY"));
    const unknown = formatSanitizedCliFailure(new Error(secret));
    expect(known).toBe('{"ok":false,"code":"TARGET_NOT_EMPTY"}');
    expect(unknown).toBe('{"ok":false,"code":"UNEXPECTED_FAILURE"}');
    expect(`${known}${unknown}`).not.toContain(secret);
  });

  it("no usa conexiones externas durante las pruebas del contrato", async () => {
    const external = vi.fn(() => { throw new Error("network forbidden"); });
    vi.stubGlobal("fetch", external);
    const adapter = compatibleAdapter();
    await planBaseline(target, adapter);
    await applyBaseline({ ...target, confirmation: DEMO_ASTRA_APPLY_CONFIRMATION }, adapter);
    await verifyBaseline(target, adapter);
    expect(external).not.toHaveBeenCalled();
  });

  it("bloquea apply cuando los permisos de escritura no están verificados", async () => {
    const adapter = compatibleAdapter();
    adapter.permissionsVerified = false;
    await expect(applyBaseline({ ...target, confirmation: DEMO_ASTRA_APPLY_CONFIRMATION }, adapter))
      .rejects.toMatchObject({ code: "WRITE_PERMISSIONS_NOT_VERIFIED" });
    expect(adapter.writeCalls()).toBe(0);
  });
});
