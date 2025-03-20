import { DataAPIClient } from "@datastax/astra-db-ts";

const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db('https://bd3a9cf5-660d-4c90-ad58-39a03af1fed2-us-east-2.apps.astra.datastax.com');

async function testConnection() {
  try {
    const collections = await db.listCollections();
    console.log("✅ Conectado a AstraDB. Colecciones disponibles:", collections);
  } catch (error) {
    console.error("❌ Error al conectar con AstraDB:", error);
  }
}

testConnection();
