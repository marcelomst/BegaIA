// Path: /root/begasist/scripts/clean-whatsapp-data.ts
import * as dotenv from "dotenv";
dotenv.config();

import { getAstraDB } from "../lib/astra/connection";

const hotelId = process.argv[2] || ""; // Podés pasar hotelId como argumento

async function main() {
  const db = getAstraDB();

  // Colecciones
  const conversations = db.collection("conversations");
  const messages = db.collection("messages");

  // Filtros
  const filter: any = { channel: "whatsapp" };
  if (hotelId) filter.hotelId = hotelId;

  // Borra messages
  const msgResult = await messages.deleteMany(filter);
  console.log(`🗑️  Mensajes eliminados: ${msgResult.deletedCount}`);

  // Borra conversations
  const convResult = await conversations.deleteMany(filter);
  console.log(`🗑️  Conversaciones eliminadas: ${convResult.deletedCount}`);
}

main().catch((err) => {
  console.error("⛔ Error al limpiar datos:", err);
  process.exit(1);
});
