// scripts/test-astra.ts
import "dotenv/config";
import { loadDocuments, searchFromAstra } from "../lib/retrieval/index";

const hotelId = "hotel123";
const query = "¿Qué tipos de habitaciones hay?";
const category = "room_info";

async function testAstra() {
  console.log("📥 Indexando documentos...");
  await loadDocuments(hotelId, category);

  console.log("🔍 Buscando información relevante...");
  const results = await searchFromAstra(query, hotelId, category);

  console.log("📄 Resultados:");
  console.log(results.join("\n\n"));
}

testAstra();
