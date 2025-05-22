// /scripts/removeVerificationBaseUrl.ts
import { collection } from "../lib/config/hotelConfig.server";

async function removeVerificationBaseUrl(hotelId: string) {
  const doc = await collection.findOne({ hotelId });

  if (!doc) {
    console.error("❌ Hotel no encontrado");
    return;
  }

  if (!doc.verification?.baseUrl) {
    console.log("ℹ️ El campo baseUrl ya está ausente o vacío.");
    return;
  }

  // Eliminar el campo baseUrl sin eliminar todo verification
  await collection.updateOne(
    { hotelId },
    { $unset: { "verification.baseUrl": "" } }
  );

  console.log(`✅ baseUrl eliminado para hotelId: ${hotelId}`);
}

// Ejecutar si se llama directamente desde CLI
const args = process.argv.slice(2);
if (!args[0]) {
  console.error("⚠️ Debes pasar un hotelId");
  process.exit(1);
}

removeVerificationBaseUrl(args[0]);
