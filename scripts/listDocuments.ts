import { DataAPIClient } from "@datastax/astra-db-ts";
import dotenv from "dotenv";
dotenv.config();

const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_COLLECTION_NAME = "begaia";

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db("https://bd3a9cf5-660d-4c90-ad58-39a03af1fed2-us-east-2.apps.astra.datastax.com");
const collection = db.collection(ASTRA_DB_COLLECTION_NAME);

async function listDocuments() {
  try {
    // Convertir el cursor en un array usando .toArray()
    const documents = await collection.find({}, { projection: { $vector: 1, idea: 1, metadata: 1 } }).toArray();

    if (!documents || documents.length === 0) {
      console.warn("⚠ No se encontraron documentos en AstraDB.");
      return;
    }

    console.log("📄 Documentos en AstraDB:");
    documents.forEach((doc: any) => {
      console.log(`🆔 ID: ${doc._id}`);
      console.log(`💡 Idea (Texto): ${doc.idea?.substring(0, 100) || "No disponible"}...`); // Solo primeros 100 caracteres
      console.log(`📏 Dimensión del embedding: ${doc.$vector?.length || "No encontrado"}`);
      console.log(`📆 Metadata:`, doc.metadata);
      console.log("------------------------------------------------------");
    });

  } catch (error) {
    console.error("❌ Error al listar documentos en AstraDB:", error);
  }
}

listDocuments();
