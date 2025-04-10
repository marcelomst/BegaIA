import "dotenv/config";
import { loadDocuments, searchFromAstra, getCollectionName } from "../lib/retrieval/index";
import { DataAPIClient } from "@datastax/astra-db-ts";

// ⚙️ Configuración
const hotelId = "hotel123";
const query = "¿Qué tipos de habitaciones hay?";
const collectionName = getCollectionName(hotelId);

// 🌍 Entorno
const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE!;
const ASTRA_DB_URL = process.env.ASTRA_DB_URL!;

if (!ASTRA_DB_APPLICATION_TOKEN || !ASTRA_DB_KEYSPACE || !ASTRA_DB_URL) {
  console.error("❌ Faltan variables de entorno para AstraDB");
  process.exit(1);
}

// 🔧 Cliente Astra
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_URL, { keyspace: ASTRA_DB_KEYSPACE });
const collection = await db.collection(collectionName);

// 🧹 Borrar documentos del hotel
async function deleteHotelDocs(hotelId: string) {
  const result = await collection.deleteMany({ hotelId });
  console.log(`🧹 Eliminados ${result.deletedCount} documentos del hotel ${hotelId}`);
}

// 🔍 Ejecutar búsqueda de prueba
async function testSearch(hotelId: string, query: string) {
  console.log("🔍 Buscando información relevante...");
  const results = await searchFromAstra(query, hotelId);

  if (results.length === 0) {
    console.log("⚠️ No se encontraron resultados relevantes.");
  } else {
    console.log(`✅ Se encontraron ${results.length} resultados:\n`);
    results.forEach((r, i) => {
      console.log(`🔹 Resultado ${i + 1}:\n${r}\n`);
    });
  }
}

// 📤 Volcar todos los documentos del hotel
async function dumpHotelDocs(hotelId: string) {
  console.log(`📦 Documentos actuales para ${hotelId}:\n`);

  const docs = await collection.find({ hotelId }).toArray(); // <- ✅ clave

  if (docs.length === 0) {
    console.log("⚠️ No hay documentos en la colección.");
    return;
  }


  docs.forEach((doc: any, i: number) => {
    const { text, category, promptKey } = doc;
    console.log(
      `📄 Doc ${i + 1}:\n🗂️ Categoría: ${category}\n🔑 PromptKey: ${promptKey ?? "null"}\n📜 Contenido:\n${text}\n---\n`
    );
  });
}


// 🧪 Ejecución principal
async function testAstra() {
  const args = process.argv.slice(2);
  const onlyDelete = args.includes("--only-delete");
  const onlyLoad = args.includes("--only-load");
  const onlySearch = args.includes("--only-search");
  const dump = args.includes("--dump");

  if (dump) {
    await dumpHotelDocs(hotelId);
    return;
  }

  if (!onlySearch) {
    await deleteHotelDocs(hotelId);
  }

  if (!onlyDelete && !onlySearch) {
    console.log("📥 Indexando documentos...");
    await loadDocuments(hotelId);
  }

  if (!onlyDelete) {
    await testSearch(hotelId, query);
  }
  const filtered = args.includes("--filtered");
  if (filtered) {
    const filteredResults = await searchFromAstra(query, hotelId, {
      category: "amenities",
      promptKey: "room_info"
    });
  
    console.log(`🔍 Resultados filtrados (category=amenities, promptKey=room_info):`);
    if (filteredResults.length === 0) {
      console.log("⚠️ No se encontraron resultados.");
    } else {
      filteredResults.forEach((r, i) => {
        console.log(`📎 Resultado ${i + 1}:\n${r}\n`);
      });
    }
  
    return;
  }
}

testAstra();




