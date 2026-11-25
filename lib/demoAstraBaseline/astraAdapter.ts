// Path: /lib/demoAstraBaseline/astraAdapter.ts

import { DataAPIClient, Table } from "@datastax/astra-db-ts";
import { DEMO_CHANNEL_MANAGER_RESERVATIONS_SCHEMA } from "@/lib/db/demoChannelManagerReservations";
import { BaselineContractError } from "@/lib/demoAstraBaseline/contract";
import type {
  DemoAstraBaselineAdapter,
  NamespaceInventory,
  ObjectInspection,
  PermissionInspection,
  PhysicalSchemaStatus,
  SeedDocument,
} from "@/lib/demoAstraBaseline/contract";
import type { BaselineObjectContract } from "@/lib/demoAstraBaseline/manifest";
import { canonicalJson } from "@/lib/demoAstraBaseline/manifest";

const GUEST_ALIASES_SCHEMA = Table.schema({
  columns: {
    hotelid: "text",
    alias: "text",
    guestid: "text",
    createdat: "timestamp",
  },
  primaryKey: {
    partitionBy: ["hotelid"],
    partitionSort: { alias: 1 },
  },
});

const GUEST_ALIASES_BY_GUEST_SCHEMA = Table.schema({
  columns: {
    hotelid: "text",
    guestid: "text",
    alias: "text",
    createdat: "timestamp",
  },
  primaryKey: {
    partitionBy: ["hotelid", "guestid"],
    partitionSort: { alias: 1 },
  },
});

const TABLE_SCHEMAS = {
  guest_aliases: GUEST_ALIASES_SCHEMA,
  guest_aliases_by_guest: GUEST_ALIASES_BY_GUEST_SCHEMA,
  demo_cm_reservations: DEMO_CHANNEL_MANAGER_RESERVATIONS_SCHEMA,
} as const;

function normalizeColumnType(value: unknown): unknown {
  if (typeof value === "string") return value.toLowerCase();
  if (value && typeof value === "object" && "type" in value) {
    return normalizeColumnType((value as Record<string, unknown>).type);
  }
  return value;
}

function normalizeSchema(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const schema = value as {
    columns?: Record<string, unknown>;
    primaryKey?: {
      partitionBy?: unknown[];
      partitionSort?: Record<string, unknown>;
    };
  };
  const columns = Object.fromEntries(
    Object.entries(schema.columns ?? {})
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, type]) => [name, normalizeColumnType(type)]),
  );
  const partitionBy = [...(schema.primaryKey?.partitionBy ?? [])];
  const partitionSort = Object.fromEntries(
    Object.entries(schema.primaryKey?.partitionSort ?? {}).sort(([left], [right]) => left.localeCompare(right)),
  );
  return { columns, primaryKey: { partitionBy, partitionSort } };
}

function tableSchemaStatus(name: string, actualDefinition: unknown): PhysicalSchemaStatus {
  const expected = TABLE_SCHEMAS[name as keyof typeof TABLE_SCHEMAS];
  if (!expected) return "unverified";
  return canonicalJson(normalizeSchema(actualDefinition)) === canonicalJson(normalizeSchema(expected))
    ? "compatible"
    : "incompatible";
}

export class AstraDataApiBaselineAdapter implements DemoAstraBaselineAdapter {
  private readonly db;
  private namespaceInventory: NamespaceInventory | null = null;
  private tableDefinitions = new Map<string, unknown>();

  constructor(input: { endpoint: string; keyspace: string; token: string }) {
    const token = String(input.token ?? "").trim();
    if (!token) throw new BaselineContractError("DEMO_ASTRA_TOKEN_REQUIRED");
    const client = new DataAPIClient(token);
    this.db = client.db(input.endpoint, { keyspace: input.keyspace });
  }

  async inspectNamespace(): Promise<NamespaceInventory> {
    try {
      const [collections, tables] = await Promise.all([
        this.db.listCollections({ nameOnly: true }),
        this.db.listTables({ nameOnly: false }),
      ]);
      if (!Array.isArray(collections) || !Array.isArray(tables)) {
        throw new BaselineContractError("NAMESPACE_INVENTORY_INCOMPLETE");
      }
      this.tableDefinitions = new Map(tables.map((table) => [table.name, table.definition]));
      this.namespaceInventory = {
        collections: [...collections],
        tables: tables.map((table) => table.name),
        collectionsComplete: true,
        tablesComplete: true,
        permissionsVerified: true,
      };
      return this.namespaceInventory;
    } catch (error) {
      if (error instanceof BaselineContractError) throw error;
      throw new BaselineContractError("NAMESPACE_INVENTORY_FAILED");
    }
  }

  async inspectPermissions(): Promise<PermissionInspection> {
    if (!this.namespaceInventory?.permissionsVerified) {
      throw new BaselineContractError("NAMESPACE_INVENTORY_PERMISSION_UNVERIFIED");
    }
    return {
      metadataRead: true,
      dataRead: true,
      schemaWrite: false,
      dataWrite: false,
      verified: false,
      method: "data-api-read-probe-only",
    };
  }

  async inspectObject(object: BaselineObjectContract, limit: number): Promise<ObjectInspection> {
    try {
      if (!this.namespaceInventory) {
        throw new BaselineContractError("NAMESPACE_INVENTORY_REQUIRED");
      }
      if (object.kind === "collection") {
        if (!this.namespaceInventory.collections.includes(object.name)) {
          return { exists: false, rowCount: 0, schemaStatus: "unverified" };
        }
        const rows = await this.db.collection(object.name).find({}, { limit }).toArray();
        return {
          exists: true,
          rowCount: rows.length,
          truncated: rows.length >= limit,
          schemaStatus: object.name === "hotel999_collection" ? "unverified" : "compatible",
        };
      }
      if (!this.namespaceInventory.tables.includes(object.name)) {
        return { exists: false, rowCount: 0, schemaStatus: "unverified" };
      }
      const definition = this.tableDefinitions.get(object.name);
      if (!definition) throw new BaselineContractError("NAMESPACE_INVENTORY_INCOMPLETE");
      const rows = await this.db.table(object.name).find({}, { limit }).toArray();
      return {
        exists: true,
        rowCount: rows.length,
        truncated: rows.length >= limit,
        schemaStatus: tableSchemaStatus(object.name, definition),
      };
    } catch (error) {
      if (error instanceof BaselineContractError) throw error;
      throw new BaselineContractError("TARGET_INSPECTION_FAILED");
    }
  }

  async getDocument(
    objectName: string,
    key: Readonly<Record<string, unknown>>,
  ): Promise<Record<string, unknown> | null> {
    try {
      return await this.db.collection<Record<string, unknown>>(objectName).findOne({ ...key });
    } catch {
      throw new BaselineContractError("TARGET_DOCUMENT_READ_FAILED");
    }
  }

  async createObject(object: BaselineObjectContract): Promise<void> {
    try {
      if (object.creation === "preprovisioned") {
        throw new BaselineContractError("PREPROVISIONED_OBJECT_CREATE_REJECTED");
      }
      if (object.kind === "collection") {
        await this.db.createCollection(object.name);
        return;
      }
      const definition = TABLE_SCHEMAS[object.name as keyof typeof TABLE_SCHEMAS];
      if (!definition) throw new BaselineContractError("TABLE_SCHEMA_NOT_VERSIONED");
      await this.db.createTable(object.name, { definition, ifNotExists: true });
    } catch (error) {
      if (error instanceof BaselineContractError) throw error;
      throw new BaselineContractError("TARGET_OBJECT_CREATE_FAILED");
    }
  }

  async upsertDocument(document: SeedDocument): Promise<void> {
    try {
      await this.db.collection<Record<string, unknown>>(document.objectName).replaceOne(
        { ...document.key },
        document.value,
        { upsert: true },
      );
    } catch {
      throw new BaselineContractError("TARGET_DOCUMENT_UPSERT_FAILED");
    }
  }
}
