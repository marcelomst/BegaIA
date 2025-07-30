// Path: /root/begasist/lib/retrieval/rollbackVersionForHotel.ts

import { getAstraDB } from "@/lib/astra/connection";

/**
 * Restaura una versión anterior de chunks del hotel creando una nueva versión.
 * @param hotelId         - ID lógico del hotel
 * @param sourceVersion   - Versión original que quieres restaurar
 * @param targetVersion   - (opcional) Nombre custom para la nueva versión restaurada
 * @param restoredBy      - (opcional) Quién hizo el restore (default: "system")
 */
export async function rollbackVersionForHotel(
  hotelId: string,
  sourceVersion: string,
  targetVersion?: string,
  restoredBy: string = "system"
) {
  const db = getAstraDB();
  const collectionName = `${hotelId}_collection`;
  const collection = db.collection(collectionName);

  // 1. Traer los chunks originales de la versión fuente
  const docs = await collection.find({ hotelId, version: sourceVersion }).toArray();
  if (!docs.length) throw new Error(`No hay chunks para version: ${sourceVersion}`);

  // 2. Definir nueva versión
  const now = new Date().toISOString();
  const newVersion =
    targetVersion ||
    "rollback-" + sourceVersion + "-" + now.slice(0, 10) + "-" + now.slice(11, 19).replace(/:/g, "");

  // 3. Clonar los chunks con nueva versión y nueva marca de fecha
  let inserted = 0;
  for (const doc of docs) {
    const { _id, ...rest } = doc; // nunca copiar _id
    await collection.insertOne({
      ...rest,
      version: newVersion,
      uploadedAt: now,
      restoredFrom: sourceVersion,
      restoredBy,
    });
    inserted++;
  }

  return {
    ok: true,
    restoredChunks: inserted,
    newVersion,
  };
}
