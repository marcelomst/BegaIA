// Path: /root/begasist/lib/astra/index.ts
import { getAstraDB } from "@/lib/astra/connection";

const ASTRA_DB_COLLECTION_NAME = "begaia";

/**
 * Realiza una búsqueda vectorial en la colección global de Astra DB usando el embedding de OpenAI.
 * @param query Consulta de texto
 */
export async function searchAstraDB(query: string) {
  try {
    // Generar embedding de la consulta con OpenAI
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-ada-002",
        input: query,
      }),
    });

    const { data } = await response.json();
    let queryVector = data[0].embedding;

    if (queryVector.length !== 1536) {
      console.warn("⚠ ADVERTENCIA: El embedding de la consulta no tiene 1536 dimensiones.");
    }

    // Usa el helper centralizado
    const db = getAstraDB();
    const collection = db.collection(ASTRA_DB_COLLECTION_NAME);
    if (!collection) {
      throw new Error(`No se encontró la colección: ${ASTRA_DB_COLLECTION_NAME}`);
    }

    // Realizar búsqueda vectorial
    console.log("🔍 Ejecutando búsqueda vectorial...");
    const cursor = await collection.find({}, {
      sort: { $vector: queryVector },
      limit: 10,
      includeSimilarity: true,
    });

    const results = await cursor.toArray();
    console.log("📄 Documentos obtenidos:", JSON.stringify(results, null, 2));

    return results;
  } catch (error) {
    console.error("❌ Error en searchAstraDB:", error);
    throw error;
  }
}
