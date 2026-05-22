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

function resolveBundlePath() {
  const bundle =
    process.env.ASTRA_DB_BUNDLE_PATH ||
    process.env.ASTRA_DB_SECURE_BUNDLE ||
    process.env.ASTRA_DB_SECURE_CONNECT_BUNDLE;

  if (!bundle) {
    throw new Error(
      "[Astra CQL] Falta env ASTRA_DB_BUNDLE_PATH o ASTRA_DB_SECURE_BUNDLE"
    );
  }

  return bundle;
}

export function getCqlClient(): Client {
  if (_client) return _client;

  const bundle = resolveBundlePath();
  const token  = required("ASTRA_DB_APPLICATION_TOKEN");
  const keyspace = required("ASTRA_DB_KEYSPACE");

  if (!fs.existsSync(bundle)) {
    throw new Error(`[Astra CQL] Secure bundle no existe: ${bundle}`);
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
