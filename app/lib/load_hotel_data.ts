import { DataAPIClient } from "@datastax/astra-db-ts";
import OpenAI from "openai";
import fs from "fs";
import pdf from "pdf-parse";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const ASTRA_DB_APPLICATION_TOKEN: string = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_COLLECTION_NAME: string = "begaia";
const OPENAI_API_KEY: string = process.env.OPENAI_API_KEY!;
const PDF_FILE_PATH = path.resolve("app/lib/hotel_demo.pdf");
const JSON_OUTPUT_PATH = path.resolve("hotel_data.json");

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db("https://bd3a9cf5-660d-4c90-ad58-39a03af1fed2-us-east-2.apps.astra.datastax.com");
const collection = db.collection(ASTRA_DB_COLLECTION_NAME);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Función para generar embeddings con OpenAI sin reducción
async function generateEmbeddings(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002", // Usa 1536 dimensiones
    input: text,
  });
  return response.data[0].embedding;
}

// Función para verificar la configuración de la colección en AstraDB
async function checkCollectionConfig() {
  const collectionInfo = await collection.options();
  console.log("📌 Configuración REAL de la colección en AstraDB:", JSON.stringify(collectionInfo, null, 2));

  if (collectionInfo.vector?.dimension !== 1536) {
    console.warn("⚠ ADVERTENCIA: La colección no está configurada para embeddings de 1536 dimensiones.");
  }
}

// Carga de datos en AstraDB y guardado en JSON
async function loadHotelData(): Promise<void> {
  try {
    // Verificar la configuración de la colección antes de cargar datos
    await checkCollectionConfig();

    const pdfBuffer: Buffer = fs.readFileSync(PDF_FILE_PATH);
    const pdfData = await pdf(pdfBuffer);
    const hotelData: string = pdfData.text;

    console.log("🔍 Generando embedding para el texto completo...");
    const embedding: number[] = await generateEmbeddings(hotelData);
    console.log("💪 Dimensión del embedding generado:", embedding.length);

    if (embedding.length !== 1536) {
      console.warn("⚠ ADVERTENCIA: El embedding generado no tiene 1536 dimensiones.");
    }

    const document = {
      idea: hotelData, // Se usa 'idea' como campo de texto
      $vector: embedding, // Usa el campo correcto para AstraDB
      metadata: {
        source: "Hotel Demo Punta del Este",
        createdAt: new Date().toISOString(),
      },
    };

    // Guardar en archivo JSON
    fs.writeFileSync(JSON_OUTPUT_PATH, JSON.stringify(document, null, 2));
    console.log("✅ Documento guardado en hotel_data.json");

    // Insertar en AstraDB
    await collection.insertOne(document);
    console.log("✅ Documento insertado en AstraDB con éxito.");

  } catch (error) {
    console.error("❌ Error cargando datos en AstraDB:", error);
  }
}

// Ejecutar la carga de datos
loadHotelData();
