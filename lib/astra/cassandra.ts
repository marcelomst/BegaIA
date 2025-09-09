// Path: /root/begasist/lib/astra/cassandra.ts
import { Client } from "cassandra-driver";
import * as dotenv from "dotenv";
dotenv.config();

let client: Client | null = null;

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[Cassandra] Falta env ${name}`);
  return v;
}

export async function getCassandraSession(): Promise<Client> {
  if (client) return client;

  const secureConnectBundle = requiredEnv("ASTRA_DB_BUNDLE_PATH"); // .zip
  const username = "token";
  const password = requiredEnv("ASTRA_DB_APPLICATION_TOKEN");
  const keyspace = requiredEnv("ASTRA_DB_KEYSPACE");

  client = new Client({
    cloud: { secureConnectBundle },
    credentials: { username, password },
    keyspace,
  });

  await client.connect();
  return client;
}
