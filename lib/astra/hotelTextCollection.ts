// /root/begasist/lib/astra/hotelTextCollection.ts

import { getAstraDB } from "./connection";
import { v4 as uuidv4 } from "uuid";

/**
 * Divide un texto grande en partes de máximo 8000 caracteres.
 */
function splitTextToChunks(text: string, maxLen = 8000): string[] {
  const chunks = [];
  for (let i = 0; i < text.length; i += maxLen) {
    chunks.push(text.slice(i, i + maxLen));
  }
  return chunks;
}

/**
 * Elimina todos los chunks existentes de un documento (opcional, para evitar duplicados).
 * Solo se puede borrar por `id`, así que primero busca los ids.
 */
async function deleteChunksForDoc({ hotelId, originalName, version }: {
  hotelId: string;
  originalName: string;
  version: string;
}) {
  const client = await getAstraDB();
  const collection = client.collection("hotel_text_collection");
  // Buscar los ids de los chunks viejos
  const oldChunks = await collection.find({ hotelId, originalName, version }).toArray();
  if (oldChunks.length > 0) {
    // Borra por cada id
    for (const chunk of oldChunks) {
      if (chunk.id) {
        await collection.deleteOne({ id: chunk.id });
      }
    }
  }
}

/**
 * Guarda el texto original dividido en partes/chunks (campo textPart, uno por documento).
 * La colección es "hotel_text_collection".
 */
export async function saveOriginalTextChunksToAstra({
  hotelId,
  originalName,
  version,
  uploader,
  author,
  uploadedAt,
  textContent,
  category,
  promptKey,
  targetLang,
}: {
  hotelId: string;
  originalName: string;
  version: string;
  uploader: string;
  author?: string | null;
  uploadedAt: string;
  textContent: string;
  category?: string;
  promptKey?: string;
  targetLang?: string;
}) {
  const client = await getAstraDB();
  const collection = client.collection("hotel_text_collection");

  const chunks = splitTextToChunks(textContent, 8000);
  const totalChunks = chunks.length;

  // Borramos versiones previas si existen (opcional, evita duplicados)
  await deleteChunksForDoc({ hotelId, originalName, version });

  // Insertar todos los chunks (cada uno un documento)
  for (let i = 0; i < totalChunks; i++) {
    console.log(`Guardando chunk ${i + 1}/${totalChunks} para ${hotelId} - ${originalName}`);
    await collection.insertOne({
      id: uuidv4(),
      author: author ?? null,
      chunkIndex: i,
      hotelId: hotelId,
      originalName: originalName,
      textPart: chunks[i],
      uploadedAt: uploadedAt,
      uploader: uploader,
      version: version,
      category,
      promptKey,
      targetLang,
    });
  }

}

/**
 * Recupera y reconstruye el texto original de un documento, concatenando sus partes ordenadas.
 */
export async function getOriginalTextChunksFromAstra({ hotelId, originalName, version }: {
  hotelId: string,
  originalName: string,
  version: string
}) {
  const client = await getAstraDB();
  const collection = client.collection("hotel_text_collection");
  // Buscar todos los chunks de ese doc
  return await collection.find({ hotelId, originalName, version }).toArray();
}

export async function listOriginalTextChunksForHotel(hotelId: string) {
  const client = await getAstraDB();
  const collection = client.collection("hotel_text_collection");
  return await collection.find({ hotelId }).toArray();
}
