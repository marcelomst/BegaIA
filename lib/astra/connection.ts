import { Client } from "cassandra-driver";
/**
 * Devuelve una instancia de Cassandra Client para CQL.
 * Soporta 2 modos:
 * - Modo Astra (recomendado): usando Secure Connect Bundle
 *     Env: ASTRA_DB_SECURE_BUNDLE (ruta al .zip), ASTRA_DB_CLIENT_ID, ASTRA_DB_CLIENT_SECRET, ASTRA_DB_KEYSPACE
 * - Modo contacto directo: usando host/datacenter (clusters self-managed)
 *     Env: ASTRA_DB_HOST, ASTRA_DB_DATACENTER, ASTRA_DB_CLIENT_ID, ASTRA_DB_CLIENT_SECRET, ASTRA_DB_KEYSPACE
 */
export function getCassandraClient() {
  const keyspace = requiredEnv("ASTRA_DB_KEYSPACE");

  const secureBundle = process.env.ASTRA_DB_SECURE_BUNDLE || process.env.ASTRA_DB_SECURE_CONNECT_BUNDLE;
  const username = requiredEnv("ASTRA_DB_CLIENT_ID");
  const password = requiredEnv("ASTRA_DB_CLIENT_SECRET");

  if (secureBundle && secureBundle.trim() !== "") {
    return new Client({
      cloud: { secureConnectBundle: secureBundle.trim() },
      credentials: { username, password },
      keyspace,
    });
  }

  // Fallback: contacto directo (útil para clusters no-Astra)
  const host = requiredEnv("ASTRA_DB_HOST");
  const datacenter = requiredEnv("ASTRA_DB_DATACENTER");
  return new Client({
    contactPoints: [host],
    localDataCenter: datacenter,
    keyspace,
    credentials: { username, password },
    sslOptions: { rejectUnauthorized: false },
  });
}
// Path: /root/begasist/lib/astra/connection.ts

import { DataAPIClient } from "@datastax/astra-db-ts";
import * as dotenv from "dotenv";
dotenv.config();

/**
 * Lee una env obligatoria y tira un error descriptivo si falta.
 */
function requiredEnv(name: string): string {
  const val = process.env[name];
  if (!val || typeof val !== "string" || val.trim() === "") {
    throw new Error(`[AstraDB] Falta variable de entorno requerida: ${name}`);
  }
  return val.trim();
}

/**
 * Normaliza el URL de Astra:
 * - Quita trailing slash.
 * - Valida que comience con http(s).
 */
function normalizeAstraUrl(url: string): string {
  let u = url.trim();
  if (!/^https?:\/\//i.test(u)) {
    throw new Error(
      `[AstraDB] ASTRA_DB_URL debe incluir protocolo http/https. Valor recibido: "${url}"`
    );
  }
  // quitar slashes finales
  while (u.endsWith("/")) u = u.slice(0, -1);
  return u;
}

/**
 * Devuelve la instancia de db con el keyspace configurado (con checks).
 */
export function getAstraDB() {
  // Nota: en este proyecto se usa ASTRA_DB_URL (no ASTRA_DB_ENDPOINT)
  const token = requiredEnv("ASTRA_DB_APPLICATION_TOKEN");
  const keyspace = requiredEnv("ASTRA_DB_KEYSPACE");
  const rawUrl = requiredEnv("ASTRA_DB_URL");
  const url = normalizeAstraUrl(rawUrl);

  const client = new DataAPIClient(token);
  return client.db(url, { keyspace });
}

/**
 * Retorna una colección AstraDB para el hotel indicado.
 * @param hotelId - El ID lógico del hotel
 * @param suffix - (opcional) Sufijo para el nombre de la colección (por defecto: "_collection")
 */
export function getHotelAstraCollection<T extends Record<string, any> = any>(
  hotelId: string,
  suffix = "_collection"
) {
  const collectionName = `${hotelId}${suffix}`;
  return getAstraDB().collection<T>(collectionName);
}

/**
 * Retorna la colección global hotel_config como documento (NO vector).
 */
export function getHotelConfigCollection<T extends Record<string, any> = any>() {
  return getAstraDB().collection<T>("hotel_config");
}
