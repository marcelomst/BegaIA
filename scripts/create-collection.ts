// scripts/create-collection.ts
import { getAstraDB } from "../lib/astra/connection";

async function main() {
  const db = getAstraDB();
  const name = "message_guards";

  const existing = await db.listCollections();
  if (existing.some(c => c.name === name)) {
    console.log(`✔ Collection ya existe: ${name}`);
    return;
  }

  await db.createCollection(name);
  console.log(`✔ Collection creada: ${name}`);
}

main().catch((e) => {
  console.error("Error creando collection:", e?.message || e);
  process.exit(1);
});
