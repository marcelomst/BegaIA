// Path: lib/astra/cql.ts
import { Client } from "cassandra-driver";
import fs from "node:fs";
import * as dotenv from "dotenv";
dotenv.config();

let _client: Client | null = null;

function required(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`[Astra CQL] Falta env ${name}`);
  return v;
}

export function getCqlClient(): Client {
  if (_client) return _client;

  const bundle = required("ASTRA_DB_BUNDLE_PATH");
  const token  = required("ASTRA_DB_APPLICATION_TOKEN");
  const keyspace = required("ASTRA_DB_KEYSPACE");

  if (!fs.existsSync(bundle)) {
    throw new Error(`[Astra CQL] ASTRA_DB_BUNDLE_PATH no existe: ${bundle}`);
  }

  _client = new Client({
    cloud: { secureConnectBundle: bundle },
    credentials: { username: "token", password: token },
    keyspace,
    // optional: controlOptions, pooling, etc.
  });

  return _client;
}

export async function ensureCqlConnected() {
  const c = getCqlClient();
  if (!(c as any)._connected) {
    await c.connect();
  }
  return c;
}
