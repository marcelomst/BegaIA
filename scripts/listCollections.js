import { DataAPIClient } from "@datastax/astra-db-ts";

const client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN);
const db = client.db('https://bd3a9cf5-660d-4c90-ad58-39a03af1fed2-us-east-2.apps.astra.datastax.com');
try{
    (async () => {
    const collections = await db.listCollections();
    console.log('Connected to AstraDB:',collections);
    })();

  } catch (error) {
    console.error("Error al obtener colecciones:", error);
  }

