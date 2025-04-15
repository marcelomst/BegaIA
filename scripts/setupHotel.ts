import "dotenv/config";
import { loadDocuments } from "../lib/retrieval";

// Este script solo se ejecuta para cargar o recargar embeddings
const hotelId = process.argv[2] || "hotel123";

async function main() {
  console.log(`🔧 Cargando documentos para el hotel: ${hotelId}`);
  await loadDocuments(hotelId);
  console.log("✅ Embeddings generados y guardados en Astra DB");
}

main().catch((err) => {
  console.error("❌ Error durante la carga de documentos:", err);
});
// ▶️ Cómo lo usás
// bash
// pnpm tsx scripts/setupHotel.ts hotel???