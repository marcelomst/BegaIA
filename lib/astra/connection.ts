// /root/begasist/lib/astra/connection.ts

import { DataAPIClient } from "@datastax/astra-db-ts";
import dotenv from "dotenv";
dotenv.config();

const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE!;
const ASTRA_DB_URL = process.env.ASTRA_DB_URL!;

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);

/**
 * Devuelve la instancia de db con el keyspace configurado.
 */
export function getAstraDB() {
  return client.db(ASTRA_DB_URL, { keyspace: ASTRA_DB_KEYSPACE });
}

/**
 * Retorna una colección AstraDB para el hotel indicado.
 * @param hotelId - El ID lógico del hotel
 * @param suffix - (opcional) Sufijo para el nombre de la colección (por defecto: "_collection")
 * @returns La colección tipada (o any si no se provee tipo)
 */
export function getHotelAstraCollection<T extends Record<string, any> = any>(
  hotelId: string,
  suffix = "_collection"
) {
  const collectionName = `${hotelId}${suffix}`;
  return getAstraDB().collection<T>(collectionName);
}
