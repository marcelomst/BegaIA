// /scripts/export-hotel-config.ts

import { getAstraDB } from "../lib/astra/connection";
import * as fs from "fs";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const db = getAstraDB();
  const collection = db.collection("hotel_config");

  const allDocs = await collection.find({}).toArray();

  const backupFile = "./hotel_config-backup.json";
  fs.writeFileSync(backupFile, JSON.stringify(allDocs, null, 2), "utf-8");
  console.log(`✅ Backup de hotel_config exportado a ${backupFile}`);
}

main().catch((err) => {
  console.error("⛔ Error exportando hotel_config:", err);
  process.exit(1);
});
