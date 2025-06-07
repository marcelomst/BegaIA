// /scripts/init-hotel-text-collection.ts

import { getAstraDB } from "../lib/astra/connection";

async function run() {
  const client = await getAstraDB();

  try {
    await client.createCollection("hotel_text_collection", { vector: null });
    console.log("✅ Colección hotel_text_collection creada correctamente.");
  } catch (e: any) {
    if (e?.message?.includes("already exists")) {
      console.log("ℹ️ La colección ya existe, OK.");
    } else {
      console.error("⛔ Error al crear colección:", e);
    }
  }
}

run();
