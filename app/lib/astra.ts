import { DataAPIClient } from "@datastax/astra-db-ts";

const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_COLLECTION_NAME = "begaia";
const ASTRA_DB_URL = "https://bd3a9cf5-660d-4c90-ad58-39a03af1fed2-us-east-2.apps.astra.datastax.com";

export async function searchAstraDB(query: string) {
  try {
    const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
    const db = client.db(ASTRA_DB_URL);
    const collection = db.collection(ASTRA_DB_COLLECTION_NAME);

    if (!collection) {
      throw new Error(`❌ No se encontró la colección: ${ASTRA_DB_COLLECTION_NAME}`);
    }

    // 🔹 Generar embedding con OpenAI
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: "text-embedding-ada-002", input: query }),
    });

    const { data } = await response.json();
    const queryVector = data[0].embedding; // 🔹 Ahora es `const`

    if (queryVector.length !== 1536) {
      console.warn("⚠ ADVERTENCIA: El embedding de la consulta no tiene 1536 dimensiones.");
    }

    // 🔍 Ejecutar búsqueda en AstraDB
    const cursor = await collection.find({}, {
      sort: { $vector: queryVector },
      limit: 10,
      includeSimilarity: true,
    });

    return await cursor.toArray();
  } catch (error) {
    console.error("❌ Error en searchAstraDB:", error);
    throw error;
  }
}
