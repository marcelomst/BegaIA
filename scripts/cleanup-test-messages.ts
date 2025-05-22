// scripts/cleanup-test-messages.ts
// pnpm tsx scripts/cleanup-test-messages.ts

import { deleteTestMessagesFromAstra } from "../lib/db/messages";
import * as dotenv from "dotenv";
dotenv.config();

async function run() {
  try {
    const result = await deleteTestMessagesFromAstra();
    console.log(`\n🧹 Mensajes eliminados: ${result.deletedCount}`);
  } catch (err) {
    console.error("❌ Error al eliminar mensajes de prueba:", err);
  }
}

run();
