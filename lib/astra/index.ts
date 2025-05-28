// /root/begasist/lib/astra/index.ts
import { DataAPIClient } from "@datastax/astra-db-ts";
import * as dotenv from "dotenv";
dotenv.config();

const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_URL = process.env.ASTRA_DB_URL!;
const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE!;
const ASTRA_DB_COLLECTION_NAME = "begaia";

  const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
  const db = client.db(ASTRA_DB_URL, { keyspace: ASTRA_DB_KEYSPACE });


export async function searchAstraDB(query: string) {
  try {
    // const collection = db.collection(ASTRA_DB_COLLECTION_NAME); // Esta línea va abajo
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

    // 🔥 Esta es la forma correcta: usá el keyspace y la URL desde variables de entorno
    const collection = db.collection(ASTRA_DB_COLLECTION_NAME);
    if (!collection) {
      throw new Error(`No se encontró la colección: ${ASTRA_DB_COLLECTION_NAME}`);
    }

    // Verificar la configuración de la colección en AstraDB
    const collectionInfo = await collection.options();
    console.log("📌 Configuración de la colección en AstraDB:", JSON.stringify(collectionInfo, null, 2));

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
