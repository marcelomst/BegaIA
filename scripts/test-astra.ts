import "dotenv/config";
import { loadDocuments, searchFromAstra, getCollectionName } from "../lib/retrieval/index";
import { DataAPIClient } from "@datastax/astra-db-ts";

// ⚙️ Configuración
const hotelId = "hotel999";
const query = "¿donde esta ubicado el hotel?";
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
let collection: any;

// 🧹 Borrar documentos del hotel
async function deleteHotelDocs(hotelId: string) {
  const result = await collection.deleteMany({ hotelId });
  console.log(`🧹 Eliminados ${result.deletedCount} documentos del hotel ${hotelId}`);
}

// 🔍 Ejecutar búsqueda de prueba
async function testSearch(hotelId: string, query: string) {
  console.log("🔍 Buscando información relevante por similitud...");
  // --- VistaTotal: obtener los _id de la última versión por grupo ---
  const allDocs = await collection.find({ hotelId }).toArray();
  if (!Array.isArray(allDocs) || allDocs.length === 0) {
    console.log("⚠️ No hay chunks en la colección.");
    return;
  }
  // Agrupar por category, promptKey, detectedLang
  const groups: Record<string, any[]> = {};
  for (const doc of allDocs) {
    const key = `${doc.category ?? ''}|${doc.promptKey ?? ''}|${doc.detectedLang ?? ''}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(doc);
  }
  // Para cada grupo, tomar el chunk con la versión más alta (alfabéticamente)
  const latestIds = Object.values(groups).map((group: any[]) => {
    return group.reduce((max, curr) => {
      if (curr.version && max.version) {
        return curr.version > max.version ? curr : max;
      }
      return curr;
    }, group[0])._id;
  });
  console.log(`🗂️ _id de última versión por grupo lógico:`);
  latestIds.forEach((id, i) => console.log(`  ${i + 1}. ${id}`));

  // Buscar solo sobre esos _id

  // Ejecutar búsqueda vectorial SOLO sobre esos chunks (allowedIds)
  const results = await searchFromAstra(query, hotelId, {}, undefined, { forceVectorSearch: true, allowedIds: latestIds });
  if (!Array.isArray(results) || results.length === 0) {
    console.log("⚠️ No se encontraron resultados relevantes en la VistaTotal.");
    return;
  }
  results.forEach((r, i) => {
    console.log(`🔹 Chunk ${i + 1} (similitud: ${typeof r.$similarity === 'number' ? r.$similarity.toFixed(3) : 'N/A'})`);
    console.log(`   _id: ${r._id}`);
    console.log(`   category: ${r.category}`);
    console.log(`   promptKey: ${r.promptKey}`);
    console.log(`   version: ${r.version}`);
    console.log(`   detectedLang: ${r.detectedLang}`);
    console.log(`   ---\n${r.text}\n---\n`);
  });
  // Elegir el registro con mayor similitud
  const elegido = results.reduce((max, curr) => (typeof curr.$similarity === 'number' && curr.$similarity > (max.$similarity ?? -Infinity) ? curr : max), results[0]);
  console.log(`\n✅ Registro elegido (mayor similitud):\nSimilitud: ${typeof elegido.$similarity === 'number' ? elegido.$similarity.toFixed(3) : 'N/A'}\nTexto:\n${elegido.text}\n`);
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

  // Inicializar cliente y colección dentro de la función principal
  const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
  const db = client.db(ASTRA_DB_URL, { keyspace: ASTRA_DB_KEYSPACE });
  collection = await db.collection(collectionName);

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




